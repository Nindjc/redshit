/* OSINT PLATFORM: STATE MANAGEMENT (state.js) */
/* Purpose: Foundational persistence layer. Manages IndexedDB ('ForensicsCacheDB'), globalData payload, and temporal undo stack. */
/* UI Area: Global application state / Hidden Background */

const DB_NAME = 'ForensicsCacheDB';
const STORE_NAME = 'sessionMeta';
const CHUNK_STORE = 'sessionChunks';
const COLLECTION_STORE = 'persistentCollection'; 

// [7] initDB()
// Purpose: Initializes IndexedDB schema.
// Depends On: window.indexedDB
// Called By: All other storage functions
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); 
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
            if (!db.objectStoreNames.contains(CHUNK_STORE)) db.createObjectStore(CHUNK_STORE, { autoIncrement: true });
            if (!db.objectStoreNames.contains(COLLECTION_STORE)) db.createObjectStore(COLLECTION_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// [12] tsFromSlider()
// Purpose: Calculates UTC bounds from UI sliders.
// UI Area: Timeline Filtering
window.tsFromSlider = function(val) {
    const min = window.minGlobalTs || 0;
    const max = window.maxGlobalTs || Math.floor(Date.now() / 1000);
    return Math.floor(min + (val / 1000) * (max - min));
};

// [9] saveCollectionState() & restoreCollectionState()
// Purpose: Standalone persistence for the Target Profile Collection, insulated from full session wipes.
// UI Area: Collection Tab
window.saveCollectionState = async function() {
    try {
        const db = await initDB();
        const tx = db.transaction([COLLECTION_STORE], 'readwrite');
        tx.objectStore(COLLECTION_STORE).put({ data: Array.from(window.collectionDataMap.entries()) }, 'masterCollection');
    } catch (e) { console.error("Failed to save collection to cache", e); }
};

window.restoreCollectionState = async function() {
    try {
        const db = await initDB();
        const tx = db.transaction([COLLECTION_STORE], 'readonly');
        const req = tx.objectStore(COLLECTION_STORE).get('masterCollection');
        req.onsuccess = () => {
            if (req.result && req.result.data) {
                const savedMap = new Map(req.result.data);
                savedMap.forEach((val, key) => window.collectionDataMap.set(key, val));
                if(typeof window.updateCollectionUI === 'function') window.updateCollectionUI();
            }
        };
    } catch (e) { console.error("Failed to restore collection", e); }
};

// [8] appendSessionChunk(), saveSessionState(), restoreSessionState(), clearSessionState()
// Purpose: Memory-conscious background database cache injection and recovery to prevent browser RAM exhaustion.
window.appendSessionChunk = async function(chunk) {
    try {
        const db = await initDB();
        const tx = db.transaction([CHUNK_STORE], 'readwrite');
        tx.objectStore(CHUNK_STORE).add(chunk);
    } catch (e) { console.error("Failed to append stream chunk to cache", e); }
};

window.saveSessionState = async function() {
    try {
        const db = await initDB();
        await new Promise((resolve) => {
            const tx = db.transaction([STORE_NAME, CHUNK_STORE], 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.objectStore(CHUNK_STORE).clear();
            tx.oncomplete = resolve;
        });

        const tx = db.transaction([STORE_NAME, CHUNK_STORE], 'readwrite');
        tx.objectStore(STORE_NAME).put({ timestamp: Date.now() }, 'metaData'); 
        
        const chunkSize = 25000;
        for (let i = 0; i < window.globalData.length; i += chunkSize) {
            tx.objectStore(CHUNK_STORE).add(window.globalData.slice(i, i + chunkSize));
        }
        
        window.saveCollectionState(); 
    } catch (e) { console.error("Failed to save state to cache", e); }
};

window.restoreSessionState = async function() {
    try {
        const bootOverlay = document.getElementById('bootLoadingOverlay');
        const bootBar = document.getElementById('bootLoadingBar');
        const bootStatus = document.getElementById('bootLoadingStatus');
        
        if (bootOverlay) bootOverlay.style.display = 'flex';

        await window.restoreCollectionState(); 

        const db = await initDB();
        const tx = db.transaction([STORE_NAME, CHUNK_STORE], 'readonly');
        
        // CRITICAL FIX: Chain requests properly to avoid race conditions
        const metaRequest = tx.objectStore(STORE_NAME).get('metaData');
        
        metaRequest.onsuccess = () => {
            if (!metaRequest.result) {
                if (bootOverlay) bootOverlay.style.display = 'none';
                return; 
            }
            
            const countRequest = tx.objectStore(CHUNK_STORE).count();
            
            countRequest.onsuccess = () => {
                const totalChunks = countRequest.result;
                if (totalChunks === 0) {
                    if (bootOverlay) bootOverlay.style.display = 'none';
                    return;
                }

                let restoredData = [];
                let chunksLoaded = 0;
                
                // Open cursor ONLY after metadata and count are resolved
                const cursorRequest = tx.objectStore(CHUNK_STORE).openCursor();
                
                cursorRequest.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        restoredData = restoredData.concat(cursor.value);
                        chunksLoaded++;
                        
                        if (bootBar) bootBar.style.width = `${Math.min(100, Math.round((chunksLoaded / totalChunks) * 100))}%`;
                        if (bootStatus) bootStatus.innerText = `Reconstituting memory (${chunksLoaded} / ${totalChunks})...`;
                        
                        cursor.continue();
                    } else if (restoredData.length > 0) {
                        window.globalData = restoredData;
                        window.filteredData = [...window.globalData];
                        window.viewData = [...window.globalData];
                        
                        // Compute Global Bounds for Time Sliders
                        let tMin = Infinity;
                        let tMax = 0;
                        for (let i = 0; i < window.globalData.length; i++) {
                            const ts = window.globalData[i].timestamp;
                            if (ts < tMin) tMin = ts;
                            if (ts > tMax) tMax = ts;
                        }
                        if (tMin !== Infinity) window.minGlobalTs = tMin;
                        if (tMax !== 0) window.maxGlobalTs = tMax;

                        if(typeof window.updateCollectionUI === 'function') window.updateCollectionUI();
                        
                        const headerControls = document.getElementById('headerControls');
                        const searchGroup = document.getElementById('searchGroup');
                        const subSearchGroup = document.getElementById('subSearchGroup');
                        const tabsEl = document.getElementById('tabs');
                        const clearBtn = document.getElementById('clearBtn');
                        const globalIngestBtn = document.getElementById('globalIngestBtn');
                        const exportGroup = document.getElementById('exportGroup');
                        const fileLabel = document.getElementById('fileLabel');
                        const statusEl = document.getElementById('status');

                        if(headerControls) headerControls.style.display = "flex";
                        if(searchGroup) searchGroup.style.display = "flex";
                        if(subSearchGroup) subSearchGroup.style.display = "flex";
                        if(tabsEl) tabsEl.style.display = "flex";
                        if(clearBtn) clearBtn.style.display = "inline-block";
                        if(globalIngestBtn) globalIngestBtn.style.display = "inline-block";
                        if(exportGroup) exportGroup.style.display = "inline-block";
                        if(fileLabel) fileLabel.style.display = "none";
                        
                        if(statusEl) {
                            statusEl.innerText = `Previous case restored: ${window.globalData.length.toLocaleString()} items loaded.`;
                            statusEl.style.color = "var(--success)";
                        }
                        
                        const commentsTab = document.querySelector('[data-target="commentsView"]');
                        if (commentsTab) commentsTab.click();
                        
                        if (bootOverlay) bootOverlay.style.display = 'none';
                        
                        if(typeof window.executeSearch === 'function') window.executeSearch(false);
                    } else {
                        if (bootOverlay) bootOverlay.style.display = 'none';
                    }
                };
            };
        };
    } catch (e) { 
        console.error("Failed to restore cached state", e); 
        const bootOverlay = document.getElementById('bootLoadingOverlay');
        if (bootOverlay) bootOverlay.style.display = 'none';
    }
};

window.clearSessionState = async function() {
    try {
        const db = await initDB();
        const tx = db.transaction([STORE_NAME, CHUNK_STORE], 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.objectStore(CHUNK_STORE).clear();
    } catch (e) {}
};

// ============================================================================
// CRITICAL FIX: Changed 'let' to 'var' to enforce global window scoping
// This allows the multi-threaded API parser to successfully push data here
// ============================================================================
var globalData = [];
var filteredData = []; 
var viewData = [];  
var threadViewData = []; 
var currentDisplayCount = 0;
var currentThreadDisplayCount = 0;
var displayChunkSize = 100; 
var collectionDataMap = new Map();
var minGlobalTs = 0, maxGlobalTs = 0, currentStartTs = 0, currentEndTs = Infinity;
var currentInteractionTarget = "";
var undoStack = [];
window.cancelReconstructFlag = false;

// [10] saveUndoState() & performUndo()
// Purpose: Snapshot memory for destructive actions (filtering/deleting)
window.saveUndoState = function() {
    if (window.undoStack.length >= 3) window.undoStack.shift();
    window.undoStack.push({
        globalData: [...window.globalData],
        collectionDataMap: new Map(window.collectionDataMap)
    });
    
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.style.display = 'inline-block';
};

window.performUndo = function() {
    if (window.undoStack.length === 0) return;
    const previousState = window.undoStack.pop();
    
    window.globalData = previousState.globalData;
    window.collectionDataMap = previousState.collectionDataMap;
    window.filteredData = [...window.globalData];
    window.viewData = [...window.globalData];
    
    if (typeof window.updateCollectionUI === 'function') window.updateCollectionUI();
    if (typeof window.executeSearch === 'function') window.executeSearch(true);
    
    window.saveCollectionState(); 
    
    const undoBtn = document.getElementById('undoBtn');
    if (window.undoStack.length === 0 && undoBtn) undoBtn.style.display = 'none';
    
    alert("Last action successfully undone.");
    if (typeof window.saveSessionState === 'function') window.saveSessionState();
};