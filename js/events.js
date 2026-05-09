/* OSINT PLATFORM: EVENT MATRIX (events.js) */
/* Purpose: The global listener matrix. Binds UI triggers, hotkeys, modal handling, and reading-mode toggles. */
/* UI Area: Global Interface Controls */

// [DOM_EVENTS] Global Event Matrix
// Purpose: Bootstraps all dynamic DOM listeners upon initial structural load.
document.addEventListener("DOMContentLoaded", () => {

    // [DOM_EVENTS.1] Inject Expand-All Styles & Checkbox for Reading Mode
    const expandStyle = document.createElement('style');
    expandStyle.innerHTML = `
        body.compact-mode.expand-all-compact .comment-body {
            white-space: pre-wrap !important;
            overflow: visible !important;
            max-height: none !important;
        }
        #expandAllWrapper {
            display: none;
            background: rgba(30, 30, 32, 0.95);
            padding: 12px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 1000;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        body.compact-mode #expandAllWrapper {
            display: block;
        }
    `;
    document.head.appendChild(expandStyle);

    const commentsView = document.getElementById('commentsView');
    if (commentsView && !document.getElementById('expandAllWrapper')) {
        const expandWrapper = document.createElement('div');
        expandWrapper.id = 'expandAllWrapper';
        expandWrapper.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <input type="checkbox" id="expandAllCheckbox" style="accent-color: var(--primary); transform: scale(1.3); cursor: pointer;">
                <label for="expandAllCheckbox" style="cursor:pointer; font-weight: bold; color: var(--text-main); font-size: 0.95rem;">Expand All Comments (Screen Reader / Copy Mode)</label>
            </div>
        `;
        commentsView.insertBefore(expandWrapper, commentsView.firstChild);

        document.getElementById('expandAllCheckbox').addEventListener('change', function() {
            document.body.classList.toggle('expand-all-compact', this.checked);
        });
    }

    const headerControls = document.getElementById('headerControls');
    if (headerControls && !headerControls.style.display) {
        headerControls.style.display = 'none';
    }

    // [DOM_EVENTS.2] Global Button Interceptor for UI Hotkeys ('M' and 'R')
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.innerText.trim() === 'M' || btn.id === 'toggleHeaderBtn' || btn.innerText.trim().includes('Menus')) {
            e.preventDefault();
            const hc = document.getElementById('headerControls');
            if (hc) {
                if (hc.style.display === 'none' || hc.style.display === '') {
                    hc.style.display = 'grid'; // FIX: Enforce Grid layout instead of Flex
                    if (btn.innerText.includes('Expand Menus')) btn.innerHTML = 'Collapse Menus &#9650;';
                } else {
                    hc.style.display = 'none';
                    if (btn.innerText.includes('Collapse Menus')) btn.innerHTML = 'Expand Menus &#9660;';
                }
            }
            return;
        }

        // 'R' Button - Reading Mode Toggle
        if (btn.innerText.trim() === 'R' || btn.id === 'compactToggleBtn') {
            e.preventDefault();
            
            setTimeout(() => {
                if (!document.body.classList.contains('compact-mode')) {
                    document.body.classList.remove('expand-all-compact');
                    const cb = document.getElementById('expandAllCheckbox');
                    if (cb) cb.checked = false;
                }
    
                const statusEl = document.getElementById('status');
                if (statusEl) {
                    const isCompact = document.body.classList.contains('compact-mode');
                    statusEl.innerText = isCompact ? "Compact Reading Mode Enabled." : "Standard UI Mode Restored.";
                    statusEl.style.color = "var(--success)";
                    setTimeout(() => { statusEl.style.color = "var(--text-main)"; }, 2000);
                }
            }, 20);
            return;
        }
    });

    // [DOM_EVENTS.3] Form Inputs and Standard API Actions
    const fileInput = document.getElementById('fileInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const subSearchBtn = document.getElementById('subSearchBtn');
    const subSearchInput = document.getElementById('subSearchInput');
    const clearBtn = document.getElementById('clearBtn');
    
    // NEW HOTFIX: Global Ingest "S" Button routed securely to Cloud Archive Modal
    const globalIngestBtn = document.getElementById('globalIngestBtn');
    if (globalIngestBtn) {
        globalIngestBtn.addEventListener('click', () => { 
            document.getElementById('cloudArchiveModal').style.display = 'flex';
        });
    }

    if (fileInput) fileInput.addEventListener('change', window.handleAddFiles);
    if (searchBtn) searchBtn.addEventListener('click', () => executeSearch(true));
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') executeSearch(true); });
    if (subSearchBtn) subSearchBtn.addEventListener('click', () => { if(typeof updateViewData === 'function') updateViewData(); });
    if (subSearchInput) subSearchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') { if(typeof updateViewData === 'function') updateViewData(); }});
    if (clearBtn) clearBtn.addEventListener('click', () => { if(typeof resetApp === 'function') resetApp(); });

    // Stream Controls
    const startArchiveBtn = document.getElementById('startArchiveBtn');
    if (startArchiveBtn) startArchiveBtn.addEventListener('click', () => { if (typeof window.startCloudArchiveStream === 'function') window.startCloudArchiveStream(); });

    const pauseStreamBtn = document.getElementById('pauseStreamBtn');
    if (pauseStreamBtn) pauseStreamBtn.addEventListener('click', () => { if (typeof window.toggleStreamPause === 'function') window.toggleStreamPause(); });

    const stopStreamBtn = document.getElementById('stopStreamBtn');
    if (stopStreamBtn) stopStreamBtn.addEventListener('click', () => { if (typeof window.stopStreamProcessing === 'function') window.stopStreamProcessing(); });

    const cancelProcessingBtn = document.getElementById('cancelProcessingBtn');
    if (cancelProcessingBtn) cancelProcessingBtn.addEventListener('click', () => {
        if (window.streamState) window.streamState.stopRequested = true;
        window.cancelReconstructFlag = true;
        const pStatus = document.getElementById('tabLoadingStatus');
        if (pStatus) pStatus.innerText = "Interrupting task... stabilizing current database memory...";
        setTimeout(() => {
            const overlay = document.getElementById('tabLoadingOverlay');
            if (overlay) overlay.style.display = 'none';
        }, 1200);
    });

    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', window.performUndo);

    const loadMoreLocationBtn = document.getElementById('loadMoreLocationBtn');
    if (loadMoreLocationBtn) loadMoreLocationBtn.addEventListener('click', () => { if (typeof window.renderNextLocationChunk === 'function') window.renderNextLocationChunk(); });

    // [DOM_EVENTS.4] Mobile Pinch-to-Zoom Context Injection
    let initialDistance = null;
    let currentZoom = 1;
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        contentArea.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            }
        }, { passive: true });

        contentArea.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialDistance) {
                const currentDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                const scale = currentDistance / initialDistance;
                let newZoom = currentZoom * scale;
                newZoom = Math.min(Math.max(0.6, newZoom), 2.5); 
                document.documentElement.style.setProperty('--reading-zoom', newZoom);
                initialDistance = currentDistance; 
                currentZoom = newZoom;
            }
        }, { passive: true });
    }

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const loadMoreThreadsBtn = document.getElementById('loadMoreThreadsBtn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => { if(typeof renderNextChunk === 'function') renderNextChunk(); });
    if (loadMoreThreadsBtn) loadMoreThreadsBtn.addEventListener('click', () => { if(typeof window.renderNextThreadChunk === 'function') window.renderNextThreadChunk(); });

    // [DOM_EVENTS.5] Graph UI Triggers
    const renderGraphBtn = document.getElementById('renderGraphBtn');
    if (renderGraphBtn) renderGraphBtn.addEventListener('click', () => { if(typeof renderNetworkGraph==='function') renderNetworkGraph(false); });

    const clusterGraphBtn = document.getElementById('clusterGraphBtn');
    if (clusterGraphBtn) clusterGraphBtn.addEventListener('click', () => { if(typeof renderNetworkGraph==='function') renderNetworkGraph(true); });

    const forensicInferenceBtn = document.getElementById('forensicInferenceBtn');
    if (forensicInferenceBtn) forensicInferenceBtn.addEventListener('click', () => { if (typeof window.runForensicInference === 'function') window.runForensicInference(); });

    const edgeThresholdSlider = document.getElementById('edgeThresholdSlider');
    const edgeThresholdValue = document.getElementById('edgeThresholdValue');
    if (edgeThresholdSlider && edgeThresholdValue) {
        edgeThresholdSlider.addEventListener('input', () => { edgeThresholdValue.innerText = edgeThresholdSlider.value; });
    }

    const infSlider = document.getElementById('inferenceSensitivitySlider');
    const infValue = document.getElementById('inferenceSensitivityValue');
    if (infSlider && infValue) {
        infSlider.addEventListener('input', () => {
            const labels = ['Low', 'Med', 'High'];
            infValue.innerText = labels[parseInt(infSlider.value) - 1];
            window.inferenceSensitivity = parseInt(infSlider.value);
        });
    }

    const subOverlayToggle = document.getElementById('subredditOverlayToggle');
    if (subOverlayToggle) {
        subOverlayToggle.addEventListener('change', () => {
            window.graphSubredditOverlay = subOverlayToggle.checked;
            if (typeof window.refreshGraphNodes === 'function') window.refreshGraphNodes();
        });
    }

    const backToUsersBtn = document.getElementById('backToUsersBtn');
    if (backToUsersBtn) {
        backToUsersBtn.addEventListener('click', () => { 
            if (typeof currentInteractionTarget !== 'undefined') currentInteractionTarget = ""; 
            document.getElementById('interactionsContainer').style.display = "none"; 
            document.getElementById('usersListContainer').style.display = "block"; 
        });
    }

    window.addEventListener('popstate', (e) => { 
        if (e.state && typeof e.state.query !== 'undefined') { if(searchInput) searchInput.value = e.state.query; } else { if(searchInput) searchInput.value = ""; } 
        const tab = document.querySelector('[data-target="commentsView"]');
        if(tab) tab.click(); 
        if(typeof executeSearch === 'function') executeSearch(false); 
    });

    // [DOM_EVENTS.6] Tab Routing and Dependency Injection
    const tabLoadingOverlay = document.getElementById('tabLoadingOverlay');
    const tabLoadingTitle = document.getElementById('tabLoadingTitle');
    const tabLoadingBar = document.getElementById('tabLoadingBar');
    const tabLoadingStatus = document.getElementById('tabLoadingStatus');

    document.querySelectorAll('.tab').forEach(tab => { 
        tab.addEventListener('click', (e) => { 
            e.preventDefault();

            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); 
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); 
            document.querySelectorAll('.view-section').forEach(c => c.classList.remove('active')); 
            document.querySelectorAll('.view-container').forEach(c => c.classList.remove('active')); 
            
            tab.classList.add('active'); 
            const targetId = tab.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active'); 

            const chunkedTabs = ['entitiesView', 'locationView', 'stylometryView', 'behavioralView', 'similarityView', 'compareView', 'graphView'];
            if (chunkedTabs.includes(targetId)) {
                if (tabLoadingOverlay) {
                    if(tabLoadingTitle) tabLoadingTitle.innerText = `Parsing ${tab.innerText}...`;
                    if(tabLoadingBar) tabLoadingBar.style.width = '5%';
                    if(tabLoadingStatus) tabLoadingStatus.innerText = 'Calculating chunks...';
                    if (cancelProcessingBtn) cancelProcessingBtn.style.display = 'inline-flex';
                    window.cancelReconstructFlag = false; 
                    tabLoadingOverlay.style.display = 'flex';
                }
            } else if (targetId !== 'commentsView' && targetId !== 'threadsView' && targetId !== 'usersView') {
                if (tabLoadingOverlay) {
                    if(tabLoadingTitle) tabLoadingTitle.innerText = `Loading ${tab.innerText}...`;
                    if(tabLoadingBar) tabLoadingBar.style.width = '100%';
                    if(tabLoadingStatus) tabLoadingStatus.innerText = '';
                    if (cancelProcessingBtn) cancelProcessingBtn.style.display = 'none';
                    tabLoadingOverlay.style.display = 'flex';
                }
            }

            setTimeout(() => {
                try {
                    if (targetId === 'wordCloudView' && typeof renderWordCloud === 'function') renderWordCloud();
                    if (targetId === 'entitiesView' && typeof renderEntities === 'function') renderEntities();
                    if (targetId === 'locationView' && typeof renderLocation === 'function') renderLocation();
                    if (targetId === 'stylometryView' && typeof renderStylometry === 'function') renderStylometry();
                    if (targetId === 'similarityView' && typeof renderSimilarity === 'function') renderSimilarity();
                    if (targetId === 'behavioralView' && typeof renderBehavioral === 'function') renderBehavioral();
                    if (targetId === 'compareView' && typeof window.renderCompare === 'function') window.renderCompare();
                    if (targetId === 'recentUsersView' && typeof renderRecentUsers === 'function') renderRecentUsers();
                    if (targetId === 'profilerView' && typeof renderProfiler === 'function') renderProfiler();
                    if (targetId === 'groupsView' && typeof renderGroups === 'function') renderGroups();
                    if (targetId === 'timelineView' && typeof window.renderTimeline === 'function') window.renderTimeline();
                    if (targetId === 'graphView' && typeof window.initGraphView === 'function') window.initGraphView();
                } catch (err) {
                    console.error("Tab Initialization Error:", err);
                    if (tabLoadingOverlay) tabLoadingOverlay.style.display = 'none';
                }
                
                if (!chunkedTabs.includes(targetId)) {
                    if (tabLoadingOverlay) tabLoadingOverlay.style.display = 'none';
                }
            }, 50); 
        }); 
    });

    // [DOM_EVENTS.7] Dropdown and Modal Click-Off Logic
    const gapDropdown = document.getElementById('gapDropdown');
    const gapMenuBtn = document.getElementById('gapMenuBtn');
    const dateMenuBtn = document.getElementById('dateMenuBtn');
    const exportMenuBtn = document.getElementById('exportMenuBtn');
    const exportDropdown = document.getElementById('exportDropdown');

    if (exportMenuBtn) exportMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); if(exportDropdown) exportDropdown.classList.toggle('show'); if(dateDropdown) dateDropdown.classList.remove('show'); if(gapDropdown) gapDropdown.classList.remove('show'); });
    if (dateMenuBtn) dateMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); if(dateDropdown) dateDropdown.classList.toggle('show'); if(exportDropdown) exportDropdown.classList.remove('show'); if(gapDropdown) gapDropdown.classList.remove('show'); });
    if (dateDropdown) dateDropdown.addEventListener('click', (e) => e.stopPropagation()); 
    if (gapDropdown) gapDropdown.addEventListener('click', (e) => e.stopPropagation());

    if (gapMenuBtn) {
        gapMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(gapDropdown) gapDropdown.classList.toggle('show');
            if(exportDropdown) exportDropdown.classList.remove('show');
            if(dateDropdown) dateDropdown.classList.remove('show');
        });
    }

    window.addEventListener('click', (e) => { 
        if (exportDropdown) exportDropdown.classList.remove('show'); 
        if (dateDropdown) dateDropdown.classList.remove('show'); 
        if (gapDropdown) gapDropdown.classList.remove('show');
        
        const overlays = ['profilerModalOverlay', 'previewModalOverlay', 'cloudArchiveModal', 'addDataModal'];
        overlays.forEach(id => {
            const el = document.getElementById(id);
            if (el && e.target === el) el.style.display = 'none';
        });
    });

    // [DOM_EVENTS.8] Slider Normalization
    const startSlider = document.getElementById('startSlider');
    const endSlider = document.getElementById('endSlider');
    if (startSlider && endSlider) {
        startSlider.addEventListener('input', () => { if(parseInt(startSlider.value) > parseInt(endSlider.value)) endSlider.value = startSlider.value; if(typeof updateDateLabels==='function') updateDateLabels(); });
        endSlider.addEventListener('input', () => { if(parseInt(endSlider.value) < parseInt(startSlider.value)) startSlider.value = endSlider.value; if(typeof updateDateLabels==='function') updateDateLabels(); });
    }

    // NEW HOTFIX: Gap Filter Sliders bound dynamically
    const gapStartSlider = document.getElementById('gapStartSlider');
    const gapEndSlider = document.getElementById('gapEndSlider');
    if (gapStartSlider && gapEndSlider) {
        gapStartSlider.addEventListener('input', () => { if(parseInt(gapStartSlider.value) > parseInt(gapEndSlider.value)) gapEndSlider.value = gapStartSlider.value; if(typeof window.updateGapLabels==='function') window.updateGapLabels(); });
        gapEndSlider.addEventListener('input', () => { if(parseInt(gapEndSlider.value) < parseInt(gapStartSlider.value)) gapStartSlider.value = gapEndSlider.value; if(typeof window.updateGapLabels==='function') window.updateGapLabels(); });
    }

    const applyDateBtn = document.getElementById('applyDateBtn');
    const clearDateBtn = document.getElementById('clearDateBtn');
    if (applyDateBtn) applyDateBtn.addEventListener('click', () => { if(typeof tsFromSlider==='function'){ currentStartTs = tsFromSlider(startSlider.value); currentEndTs = tsFromSlider(endSlider.value); } if(dateDropdown) dateDropdown.classList.remove('show'); if(typeof updateViewData==='function') updateViewData(); });
    if (clearDateBtn) clearDateBtn.addEventListener('click', () => { if(startSlider) startSlider.value = 0; if(endSlider) endSlider.value = 1000; currentStartTs = minGlobalTs; currentEndTs = maxGlobalTs; if(typeof updateDateLabels==='function') updateDateLabels(); if(dateDropdown) dateDropdown.classList.remove('show'); if(typeof updateViewData==='function') updateViewData(); });

    // [DOM_EVENTS.9] Export Systems
    const exportToFileBtn = document.getElementById('exportToFileBtn');
    if (exportToFileBtn) {
        exportToFileBtn.addEventListener('click', () => {
            if (viewData.length === 0) return alert("Live view is empty.");
            let finalName = prompt("Enter filename:", getContextualFilename("reddit_live_view"));
            if (finalName === null) return; 
            if(typeof downloadJSON==='function') downloadJSON(viewData, finalName.endsWith('.json') ? finalName : finalName + '.json');
        });
    }

    const exportFullDBBtn = document.getElementById('exportFullDBBtn');
    if (exportFullDBBtn) {
        exportFullDBBtn.addEventListener('click', () => {
            if (globalData.length === 0) return alert("Database is empty.");
            let format = prompt("Export Format:\nType 'json' for standard backup or 'sql' for DB Browser dump:", "json");
            if (format === null) return;
            
            format = format.toLowerCase().trim();
            if (format === 'sql') {
                let finalName = prompt("Enter filename for your SQL dump:", "reddit_master_database.sql");
                if (finalName && typeof window.exportToSQLDump==='function') window.exportToSQLDump(globalData, finalName.endsWith('.sql') ? finalName : finalName + '.sql');
            } else {
                let finalName = prompt("Enter filename for crash backup JSON:", "reddit_master_database.json");
                if (finalName && typeof downloadJSON==='function') downloadJSON(globalData, finalName.endsWith('.json') ? finalName : finalName + '.json');
            }
        });
    }

    const exportTableBtn = document.getElementById('exportTableBtn');
    if (exportTableBtn) {
        exportTableBtn.addEventListener('click', () => {
            let tableToExport; let defaultName = "export";
            if (document.getElementById('usersView') && document.getElementById('usersView').classList.contains('active')) {
                if (document.getElementById('interactionsContainer') && document.getElementById('interactionsContainer').style.display === 'block') { tableToExport = document.getElementById('interactionsTable'); defaultName = `network_interactions_${currentInteractionTarget}`; } 
                else { tableToExport = document.getElementById('userTable'); defaultName = getContextualFilename("top_users"); }
            } else { return alert("Navigate to 'Top Users' tab to export."); }
            let finalName = prompt("Enter filename:", defaultName);
            if (finalName === null) return;
            let csv = []; const rows = tableToExport.querySelectorAll("tr");
            for (let i = 0; i < rows.length; i++) { let row = [], cols = rows[i].querySelectorAll("td, th"); for (let j = 0; j < cols.length - 1; j++) { let data = cols[j].innerText.replace(/"/g, '""'); row.push('"' + data + '"'); } csv.push(row.join(",")); }
            if(typeof downloadCSV==='function') downloadCSV(csv.join("\n"), finalName.endsWith('.csv') ? finalName : finalName + '.csv');
        });
    }

    // [DOM_EVENTS.10] Locker/Collection Operations
    const addToCollectionBtn = document.getElementById('addToCollectionBtn');
    if (addToCollectionBtn) {
        addToCollectionBtn.addEventListener('click', () => {
            if(typeof window.saveUndoState==='function') window.saveUndoState();
            let addedCount = 0;
            viewData.forEach(item => { if (!collectionDataMap.has(item.id)) { collectionDataMap.set(item.id, item); addedCount++; } });
            if(typeof updateCollectionUI==='function') updateCollectionUI(); 
            if(typeof window.saveCollectionState === 'function') window.saveCollectionState();
            alert(`Added ${addedCount} new items. (Undo available)`);
        });
    }

    const exportCollectionBtn = document.getElementById('exportCollectionBtn');
    if (exportCollectionBtn) {
        exportCollectionBtn.addEventListener('click', () => {
            if (collectionDataMap.size === 0) return alert("Collection is empty.");
            let finalName = prompt("Enter filename:", "my_collection.json");
            if (finalName === null) return;
            if(typeof downloadJSON==='function') downloadJSON(Array.from(collectionDataMap.values()), finalName.endsWith('.json') ? finalName : finalName + '.json');
        });
    }

    const clearCollectionBtn = document.getElementById('clearCollectionBtn');
    if (clearCollectionBtn) {
        clearCollectionBtn.addEventListener('click', () => { 
            if (confirm("Clear collection?")) { 
                collectionDataMap.clear(); 
                if(typeof updateCollectionUI==='function') updateCollectionUI(); 
                if(typeof window.saveCollectionState === 'function') window.saveCollectionState();
            } 
        });
    }

    if(typeof restoreSessionState==='function') restoreSessionState();

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && document.querySelectorAll('.post-card, .comment-card').length === 0) {
            if (typeof window.loadFromIndexedDB === 'function') { window.loadFromIndexedDB(); } 
        }
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('entity-link')) {
            const text = e.target.innerText.trim();
            if(typeof window.triggerSearch==='function') window.triggerSearch(`entity:${text}`);
        }
    });
    
    // [DOM_EVENTS.11] Draggable / Sortable Navigation Tabs
    const tabsContainer = document.getElementById('tabs');
    if (tabsContainer) {
        let touchTimer;
        let draggingTab = null;
        let isTouchDragging = false;

        const handleDragStart = (tab) => {
            draggingTab = tab;
            tab.style.opacity = '0.5';
            tab.style.transform = 'scale(0.95)';
            if(navigator.vibrate) navigator.vibrate(50);
        };

        const handleDragEnd = () => {
            if(draggingTab) {
                draggingTab.style.opacity = '1';
                draggingTab.style.transform = 'none';
                draggingTab = null;
            }
            isTouchDragging = false;
            clearTimeout(touchTimer);
        };

        tabsContainer.querySelectorAll('.tab').forEach(tab => {
            tab.draggable = true; // Desktop support
            
            // Desktop Drag Events
            tab.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                handleDragStart(tab);
            });
            tab.addEventListener('dragend', handleDragEnd);
            
            // Mobile Touch Events (Long Press to drag)
            tab.addEventListener('touchstart', (e) => {
                touchTimer = setTimeout(() => {
                    isTouchDragging = true;
                    handleDragStart(tab);
                }, 500);
            }, {passive: true});
            
            tab.addEventListener('touchmove', (e) => {
                if(!isTouchDragging) {
                    clearTimeout(touchTimer);
                    return;
                }
                e.preventDefault(); // Prevent scrolling while dragging
                const touch = e.touches[0];
                const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetTab = targetEl ? targetEl.closest('.tab') : null;
                
                if(targetTab && targetTab !== draggingTab) {
                    const box = targetTab.getBoundingClientRect();
                    const mid = box.x + box.width / 2;
                    if(touch.clientX > mid) targetTab.after(draggingTab);
                    else targetTab.before(draggingTab);
                }
            });
            
            tab.addEventListener('touchend', handleDragEnd);
            tab.addEventListener('touchcancel', handleDragEnd);
        });

        // Desktop Drop Zones
        tabsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetTab = e.target.closest('.tab');
            if(targetTab && targetTab !== draggingTab && draggingTab) {
                const box = targetTab.getBoundingClientRect();
                const mid = box.x + box.width / 2;
                if(e.clientX > mid) targetTab.after(draggingTab);
                else targetTab.before(draggingTab);
            }
        });
    }

}); 

// [13-B] executeSearch Interceptor
// Purpose: Overrides the core search logic to catch 'entity:' pivots.
// Depends On: search.js (originalExecuteSearch)
if (typeof window.executeSearch !== 'undefined') {
    const originalExecuteSearch = window.executeSearch;
    window.executeSearch = function(pushHistory = true) {
        const sInput = document.getElementById('searchInput');
        if(!sInput) return;
        const query = sInput.value.toLowerCase().trim();
        if (query.startsWith('entity:')) {
            const targetEntity = query.substring(7).trim();
            filteredData = globalData.filter(item => {
                if (!item.forensics) return false;
                const entities = [
                    ...(item.forensics.urls || []),
                    ...(item.forensics.emails || []),
                    ...(item.forensics.crypto || [])
                ];
                return entities.some(e => e.toLowerCase() === targetEntity) || item.text.toLowerCase().includes(targetEntity);
            });
            const statusEl = document.getElementById('status');
            if(statusEl) statusEl.innerText = `Isolating Entity Pivot: ${targetEntity}`;
            if (pushHistory) history.pushState({ query }, "", "?q=" + encodeURIComponent(query));
            const subInput = document.getElementById('subSearchInput');
            if(subInput) subInput.value = "";
            if(typeof updateViewData==='function') updateViewData();
        } else {
            originalExecuteSearch(pushHistory);
        }
    };
}

// [17-B] updateGapLabels()
// Purpose: Global UI Handler for Gap Labels Bound to DB Topology
// Notes: Transforms internal 0-1000 slider variables into visual Date outputs.
window.updateGapLabels = function() {
    if(typeof window.tsFromSlider !== 'function') return;
    const sVal = document.getElementById('gapStartSlider') ? document.getElementById('gapStartSlider').value : 0;
    const eVal = document.getElementById('gapEndSlider') ? document.getElementById('gapEndSlider').value : 1000;
    
    const sTs = window.tsFromSlider(sVal);
    const eTs = window.tsFromSlider(eVal);
    
    const sdLabel = document.getElementById('gapStartLabel');
    const edLabel = document.getElementById('gapEndLabel');
    
    if(sdLabel) sdLabel.innerText = new Date(sTs * 1000).toLocaleDateString();
    if(edLabel) edLabel.innerText = new Date(eTs * 1000).toLocaleDateString();
};

// [18-B] prepSubredditIngest()
// Purpose: Global helper for Subreddit Lightning Bolt icon contextual API cloud fetch
window.prepSubredditIngest = function(subreddit, timestampSecs) {
    const modal = document.getElementById('cloudArchiveModal');
    const subInput = document.getElementById('archiveSubInput');
    const startInput = document.getElementById('archiveStartInput');
    const endInput = document.getElementById('archiveEndInput');

    if (modal && subInput && startInput && endInput) {
        subInput.value = subreddit.replace(/^r\//i, ''); 
        
        const startDate = new Date(timestampSecs * 1000);
        startInput.value = startDate.toISOString().split('T')[0];
        
        const today = new Date();
        endInput.value = today.toISOString().split('T')[0];
        
        modal.style.display = 'flex';
    }
};