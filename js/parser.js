/* OSINT PLATFORM: INGESTION ENGINE (parser.js) */
/* Purpose: Handles chunked file streaming, cyrb53 hashing, and raw text extraction into forensic fingerprints. */
/* UI Area: Data Ingestion (Add Data Modal) */

// [1] cyrb53Hash()
// Purpose: Fast 32-bit string hashing for exact copy-pasta clone detection.
// Depends On: raw text payload
window.cyrb53Hash = function(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// [2] generateForensicFingerprint()
// Purpose: OSINT Enrichment Engine. Runs regex to extract IOCs (crypto, emails, locations) and stylometric stats.
// Called By: extractSingleField()
window.generateForensicFingerprint = function(text, timestamp) {
    const forensics = {};
    const lowerText = text.toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];
    const textLength = text.length || 1;

    forensics.urls = text.match(/https?:\/\/[^\s]+/g) || [];
    forensics.crypto = text.match(/\b(1[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59}|0x[a-fA-F0-9]{40}|4[0-9AB][1-9A-HJ-NP-Za-km-z]{93})\b/g) || [];
    forensics.emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    forensics.mentions = text.match(/(?:^|\s)(\/?u\/[A-Za-z0-9_-]+)/g) || [];
    forensics.subreddits = text.match(/(?:^|\s)(\/?r\/[A-Za-z0-9_]+)/g) || [];
    forensics.hashtags = text.match(/#[a-zA-Z0-9_]+/g) || [];

    const extractedLocs = [];
    const coordRegex = /\b[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)\b/g;
    let match;
    while ((match = coordRegex.exec(text)) !== null) { extractedLocs.push(match[0]); }
    
    const geoPrefixes = ["live in", "living in", "moved to", "visiting", "traveling to", "born in", "hometown is", "weather in", "downtown", "from", "located in", "address is", "near", "outside", "area of", "flights to", "driven to"];
    const geoRegexLower = new RegExp(`\\b(?:${geoPrefixes.join('|')})\\s+([a-z]{3,15}(?:\\s+[a-z]{3,15}){0,2})\\b`, 'gi');
    const stopWords = new Set(['the','and','this','that','a','an','my','your','his','her','our','their','some','any','all','very','really','just','lot','few','couple','for','with','about']);
    
    while ((match = geoRegexLower.exec(text)) !== null) { 
        const loc = match[1].trim();
        const firstWord = loc.toLowerCase().split(' ')[0];
        if (!stopWords.has(firstWord)) {
            const cleanLoc = loc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            extractedLocs.push(cleanLoc); 
        }
    }
    forensics.locations = [...new Set(extractedLocs)];

    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    forensics.lexicalRichness = words.length > 0 ? (uniqueWords.size / words.length).toFixed(3) : 0;
    forensics.avgWordLength = words.length > 0 ? (words.reduce((acc, w) => acc + w.length, 0) / words.length).toFixed(1) : 0;
    
    const punctMatch = text.match(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g);
    forensics.punctuationRatio = punctMatch ? (punctMatch.length / textLength).toFixed(3) : 0;
    
    const capsMatch = text.match(/[A-Z]/g);
    forensics.capsRatio = capsMatch ? (capsMatch.length / textLength).toFixed(3) : 0;
    
    forensics.whitespaceAnomalies = /\s{3,}/.test(text);
    forensics.contentHash = window.cyrb53Hash(text);

    forensics.personaClaims = text.match(/\b(I am a|as a|my husband|my wife|my job)\b/gi) || [];
    forensics.threatKeywords = text.match(/\b(kill|dox|address|shoot|bomb|attack|murder)\b/gi) || [];
    forensics.emotionalUrgency = (text.match(/[!?]{2,}/g) || []).length;
    forensics.quotationCount = text.split('\n').filter(l => l.trim().startsWith('>')).length;
    forensics.foreignScript = /[\u0400-\u04FF]/.test(text); 

    const dateObj = new Date(timestamp * 1000);
    forensics.utcHour = dateObj.getUTCHours(); 
    forensics.deviceLeaks = text.match(/Sent from my (iPhone|Android|BlackBerry)/i) || [];
    forensics.isAdmittedBot = /I am a bot|action was performed automatically/i.test(text);

    // [CIRCADIAN INJECTION] Timezone Extraction & Alignment
    const tzMatch = text.match(/\b(EST|EDT|CST|CDT|MST|MDT|PST|PDT|GMT[+-]\d{1,2}|UTC[+-]\d{1,2})\b/i);
    let circShift = 0; 
    let tzLabel = null;
    if (tzMatch) {
        tzLabel = tzMatch[1].toUpperCase();
        const tzMap = { 'EST': -5, 'EDT': -4, 'CST': -6, 'CDT': -5, 'MST': -7, 'MDT': -6, 'PST': -8, 'PDT': -7 };
        if (tzMap[tzLabel] !== undefined) {
            circShift = tzMap[tzLabel];
        } else if (tzLabel.startsWith('GMT') || tzLabel.startsWith('UTC')) {
            const parsed = parseInt(tzLabel.replace(/[A-Z+]/g, ''));
            if (!isNaN(parsed)) circShift = tzLabel.includes('-') ? -Math.abs(parsed) : parsed;
        }
    }
    forensics.tzMention = tzLabel;
    forensics.circadianShift = circShift;
    // [/CIRCADIAN INJECTION]

    return forensics;
};

// [3] extractSingleField()
// Purpose: Normalizes raw JSON input files into the standardized internal database schema.
window.extractSingleField = function(obj) {
    if (typeof obj !== 'object' || obj === null) return null;
    
    if (obj.author && obj.created_utc) {
        let contentText = obj.body || obj.selftext || obj.title;
        
        if (contentText) {
            const timestamp = parseInt(obj.created_utc);
            return {
                id: obj.id || String(Math.random()),
                text: contentText,
                author: obj.author,
                subreddit: obj.subreddit || "", 
                timestamp: timestamp,
                link_id: obj.link_id || obj.parent_id || obj.id || "unknown_thread",
                link_title: obj.link_title || obj.title || "",
                forensics: window.generateForensicFingerprint(contentText, timestamp)
            };
        }
    }
    return null;
};

// [4] getDupKey()
// Purpose: Aggressive Ingestion Deduplication. Prevents database cloning on double-uploads.
window.getDupKey = function(processed) {
    const isRandom = String(processed.id).includes('.');
    const hash = processed.forensics ? processed.forensics.contentHash : 0;
    return isRandom ? `${processed.author}_${hash}` : String(processed.id);
};

// --- FILE READING & PARSING ---
window.handleFileUpload = function(e) { processFiles(e.target.files, false); };
window.handleAddFiles = function(e) { processFiles(e.target.files, true); };

// [5] processFiles() / processNextFile() / readNextChunk()
// Purpose: Asynchronous chunked file reader to handle multi-gigabyte JSONL datasets without locking the UI.
function processFiles(files, isAdding) {
    if (!files.length) return;
    if (!isAdding && typeof resetData === 'function') resetData();
    
    const statusEl = document.getElementById('status');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const fileLabel = document.getElementById('fileLabel');
    const progressBar = document.getElementById('progress-bar');
    
    if(statusEl) {
        statusEl.innerText = isAdding ? "Appending files... This may take a minute." : "Parsing files... This may take a minute.";
        statusEl.style.color = "var(--text-main)";
    }
    if(progressBarContainer) progressBarContainer.style.display = "block";
    if (!isAdding && fileLabel) fileLabel.style.display = "none";
    
    let currentFileIndex = 0;
    let parsedCount = 0;
    
    if (typeof globalData === 'undefined') window.globalData = [];
    const existingIds = isAdding ? new Set(globalData.map(i => window.getDupKey(i))) : new Set();

    function processNextFile() {
        if (currentFileIndex >= files.length) { finalizeParsing(isAdding); return; }
        const file = files[currentFileIndex];
        const reader = new FileReader();
        const CHUNK_SIZE = 1024 * 1024 * 5; 
        let offset = 0;
        let leftover = "";

        function readNextChunk() {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.onload = function(e) {
                const content = e.target.result;
                const data = leftover + content;
                const lines = data.split('\n');
                leftover = lines.pop();

                for (let line of lines) {
                    line = line.trim();
                    if (!line || line === '[' || line === ']') continue;
                    if (line.endsWith(',')) line = line.slice(0, -1);
                    try {
                        const obj = JSON.parse(line);
                        const items = obj.data && Array.isArray(obj.data) ? obj.data : (Array.isArray(obj) ? obj : [obj]);
                        items.forEach(item => {
                            const processedObj = window.extractSingleField(item);
                            if (processedObj) {
                                const dupKey = window.getDupKey(processedObj);
                                if (!existingIds.has(dupKey)) { 
                                    globalData.push(processedObj); 
                                    existingIds.add(dupKey);
                                    parsedCount++; 
                                }
                            }
                        });
                    } catch (err) {}
                }

                offset += CHUNK_SIZE;
                const percent = Math.min(100, Math.round((offset / file.size) * 100));
                if(progressBar) progressBar.style.width = `${percent}%`;
                if(statusEl) statusEl.innerText = `File ${currentFileIndex + 1}/${files.length}: ${percent}% (${parsedCount.toLocaleString()} new items)...`;

                if (offset < file.size) { setTimeout(readNextChunk, 0); } 
                else {
                    if (leftover.trim()) {
                        let line = leftover.trim();
                        if (line.endsWith(',')) line = line.slice(0, -1);
                        try {
                            const obj = JSON.parse(line);
                            const items = obj.data && Array.isArray(obj.data) ? obj.data : (Array.isArray(obj) ? obj : [obj]);
                            items.forEach(item => {
                                const processedObj = window.extractSingleField(item);
                                if (processedObj) {
                                    const dupKey = window.getDupKey(processedObj);
                                    if (!existingIds.has(dupKey)) { 
                                        globalData.push(processedObj); 
                                        existingIds.add(dupKey);
                                        parsedCount++; 
                                    }
                                }
                            });
                        } catch(e) {}
                    }
                    currentFileIndex++;
                    setTimeout(processNextFile, 0);
                }
            };
            reader.onerror = function() { console.error("Error reading file", file.name); currentFileIndex++; setTimeout(processNextFile, 0); };
            reader.readAsText(slice);
        }
        readNextChunk();
    }
    processNextFile();
}

// [6] finalizeParsing()
// Purpose: Triggers UI updates once the file stream ingestion completes. Bootstraps temporal ranges.
function finalizeParsing(wasAdding = false) {
    const progressBarContainer = document.getElementById('progress-bar-container');
    const statusEl = document.getElementById('status');
    const fileLabel = document.getElementById('fileLabel');
    const headerControls = document.getElementById('headerControls');
    const searchGroup = document.getElementById('searchGroup');
    const subSearchGroup = document.getElementById('subSearchGroup');
    const tabsEl = document.getElementById('tabs');
    const clearBtn = document.getElementById('clearBtn');
    const exportGroup = document.getElementById('exportGroup');
    const globalIngestBtn = document.getElementById('globalIngestBtn');
    
    if(progressBarContainer) progressBarContainer.style.display = "none";
    if (typeof globalData === 'undefined' || globalData.length === 0) {
        if(statusEl) {
            statusEl.innerText = "No valid Reddit text found in dataset.";
            statusEl.style.color = "var(--danger)";
        }
        if(fileLabel) fileLabel.style.display = "inline-block";
        return;
    }
    
    setTimeout(() => {
        globalData.sort((a, b) => b.timestamp - a.timestamp);
        
        let pCount = 0; let cCount = 0;
        let min = Infinity, max = 0;
        
        for(let i=0; i<globalData.length; i++){
            const item = globalData[i];
            if(item.timestamp < min) min = item.timestamp;
            if(item.timestamp > max) max = item.timestamp;
            
            // Deduce whether it is a root post or comment
            if (String(item.id) === String(item.link_id).replace('t3_', '')) pCount++;
            else cCount++;
        }
        
        window.minGlobalTs = min; window.maxGlobalTs = max; 
        window.currentStartTs = min; window.currentEndTs = max;
        
        const startSlider = document.getElementById('startSlider');
        const endSlider = document.getElementById('endSlider');
        if(startSlider) startSlider.value = 0; 
        if(endSlider) endSlider.value = 1000;
        
        if(typeof updateDateLabels === 'function') updateDateLabels();
        
        window.filteredData = [...globalData]; 
        window.viewData = [...globalData];

        if(statusEl) {
            statusEl.innerText = `Successfully loaded ${globalData.length.toLocaleString()} items (${pCount.toLocaleString()} posts, ${cCount.toLocaleString()} comments).`;
            statusEl.style.color = "var(--success)";
        }
        
        if(headerControls) headerControls.style.display = "grid"; 
        if(searchGroup) searchGroup.style.display = "flex"; 
        if(subSearchGroup) subSearchGroup.style.display = "flex"; 
        if(tabsEl) tabsEl.style.display = "flex";
        if(clearBtn) clearBtn.style.display = "inline-block"; 
        if(exportGroup) exportGroup.style.display = "inline-block";
        if(globalIngestBtn) globalIngestBtn.style.display = "inline-block"; 
        
        const addBtnElement = document.getElementById('addFilesBtn');
        if(addBtnElement) addBtnElement.style.display = 'inline-block';

        if(typeof updateCollectionUI === 'function') updateCollectionUI();
        
        const commTab = document.querySelector('[data-target="commentsView"]');
        if(commTab) commTab.click();
        
        if(typeof executeSearch === 'function') executeSearch(false);
        if (typeof window.saveSessionState === 'function') window.saveSessionState();
    }, 50);
}