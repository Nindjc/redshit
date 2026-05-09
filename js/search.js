/* OSINT PLATFORM: MEMORY & FILTER ENGINE (search.js) */
/* Purpose: The brain of the data table. Controls viewData, temporal/gap filters, API streams, and Thread structuring. */

// --- OSINT PLATFORM: DYNAMIC UI INJECTION & REORDERING ---
document.addEventListener("DOMContentLoaded", () => {
    const searchGroup = document.getElementById('searchGroup');
    if (searchGroup && !document.getElementById('userSearchCheckbox')) {
        const cbWrapper = document.createElement('div');
        cbWrapper.style.cssText = "display:flex; align-items:center; gap: 8px; margin-top: 8px; color: var(--text-muted); font-size: 0.85rem; width: 100%;";
        cbWrapper.innerHTML = `
            <input type="checkbox" id="userSearchCheckbox" style="accent-color: var(--primary); transform: scale(1.2); cursor: pointer;"> 
            <label for="userSearchCheckbox" style="cursor:pointer; font-weight: bold; color: var(--primary);">Fetch Live Arctic Shift Profile (100 Posts/Comments)</label>
        `;
        searchGroup.appendChild(cbWrapper);
    }

    // Forceful Tab Cleanup & Ordering
    const tabsEl = document.getElementById('tabs');
    const contentArea = document.querySelector('.content-area');
    
    if (tabsEl && contentArea) {
        const behTab = tabsEl.querySelector('[data-target="behavioralView"]');
        if (behTab) behTab.remove(); 
        const behContent = document.getElementById('behavioralView');
        if (behContent) behContent.remove();

        let usersTab = tabsEl.querySelector('[data-target="usersView"]');
        if (usersTab) {
            usersTab.style.display = ''; 
            usersTab.className = 'tab';
        }

        let servicesTab = tabsEl.querySelector('[data-target="servicesView"]');
        if (!servicesTab) {
            servicesTab = document.createElement('div');
            servicesTab.className = 'tab';
            servicesTab.dataset.target = 'servicesView';
            servicesTab.innerText = 'Services';
            
            const servicesView = document.createElement('div');
            servicesView.id = 'servicesView';
            servicesView.className = 'tab-content';
            servicesView.innerHTML = '<div id="servicesContainer"></div>';
            contentArea.appendChild(servicesView);
        }

        const commentsTab = tabsEl.querySelector('[data-target="commentsView"]');
        const threadsTab = tabsEl.querySelector('[data-target="threadsView"]');
        const groupsTab = tabsEl.querySelector('[data-target="groupsView"]');
        
        if (commentsTab && threadsTab && groupsTab && usersTab && servicesTab) {
            commentsTab.after(threadsTab);
            threadsTab.after(groupsTab);
            groupsTab.after(usersTab);
            usersTab.after(servicesTab);
        }
    }
});

// [17] applyGapTest() / clearGapTest()
window.applyGapTest = function() {
    if (typeof window.tsFromSlider !== 'function') return alert("Core time functions not loaded.");
    
    const startVal = document.getElementById('gapStartSlider').value;
    const endVal = document.getElementById('gapEndSlider').value;
    const mode = document.getElementById('gapFilterSelect').value;

    const startTs = window.tsFromSlider(startVal);
    const endTs = window.tsFromSlider(endVal);

    if (startTs >= endTs) return alert("Gap Start cannot be after Gap End.");

    const activeUsersDuringGap = new Set();
    
    // BUG FIX: Uses filtered scope to prevent global database false positives
    const targetDataPool = (window.filteredData && window.filteredData.length > 0) ? window.filteredData : window.globalData;

    targetDataPool.forEach(item => {
        if (item.timestamp >= startTs && item.timestamp <= endTs) {
            activeUsersDuringGap.add(item.author);
        }
    });

    window.gapStatusMap = new Map();
    const allUsers = new Set(targetDataPool.map(i => i.author));
    
    allUsers.forEach(u => {
        window.gapStatusMap.set(u, !activeUsersDuringGap.has(u));
    });

    window.gapFilterMode = mode;
    window.updateViewData();
    
    const dropdown = document.getElementById('gapDropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    alert(`Gap filter applied. Found ${activeUsersDuringGap.size} users active during gap. Found ${allUsers.size - activeUsersDuringGap.size} users who remained silent.`);
};

window.clearGapTest = function() {
    window.gapFilterMode = 'all';
    const sSlider = document.getElementById('gapStartSlider');
    const eSlider = document.getElementById('gapEndSlider');
    if (sSlider) sSlider.value = 0;
    if (eSlider) eSlider.value = 1000;
    if (typeof window.updateGapLabels === 'function') window.updateGapLabels();
    
    window.updateViewData();
    
    const dropdown = document.getElementById('gapDropdown');
    if (dropdown) dropdown.classList.remove('show');
};

// [18] startCloudArchiveStream()
// BUG FIX: Rewritten as a 5-Thread Asynchronous Chunking Engine to match the 1,000 items/sec Python pipeline
window.streamState = {
    active: false,
    paused: false,
    stopRequested: false
};

window.startCloudArchiveStream = async function() {
    const sub = document.getElementById('archiveSubInput').value.trim();
    const startStr = document.getElementById('archiveStartInput').value;
    const endStr = document.getElementById('archiveEndInput').value;

    if (!sub) return alert("Target Subreddit is required.");

    document.getElementById('cloudArchiveModal').style.display = 'none';

    let startTs = startStr ? Math.floor(new Date(startStr).getTime() / 1000) : 0;
    let endTs = endStr ? Math.floor(new Date(endStr).getTime() / 1000) + 86399 : Math.floor(Date.now() / 1000);

    const streamControls = document.getElementById('stream-controls');
    if (streamControls) streamControls.style.display = 'flex';

    const statusEl = document.getElementById('status');
    const headerControls = document.getElementById('headerControls');
    if (headerControls) headerControls.style.display = 'grid';
    
    const tabsEl = document.getElementById('tabs');
    if (tabsEl) tabsEl.style.display = 'flex';

    window.streamState.active = true;
    window.streamState.paused = false;
    window.streamState.stopRequested = false;

    let addedCount = 0;
    const existingIds = new Set((typeof globalData !== 'undefined' ? globalData : []).map(item => item.id));

    // Calculate time bounds for 5 separate asynchronous worker threads
    const WORKER_COUNT = 5;
    let effectiveStartTs = startTs > 0 ? startTs : 1104537600; // Default bounds starting 2005
    let timeRange = endTs - effectiveStartTs;
    let chunkDuration = Math.floor(timeRange / WORKER_COUNT);

    if (statusEl) {
        statusEl.innerText = `Booting ${WORKER_COUNT} Async Threads for /r/${sub}...`;
        statusEl.style.color = "var(--success)";
        statusEl.classList.add('stream-active');
    }

    async function fetchWorker(workerId, chunkStart, chunkEnd) {
        let currentBefore = chunkEnd;
        while (window.streamState.active && !window.streamState.stopRequested) {
            if (window.streamState.paused) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            try {
                // Fetch from isolated time chunk bounds
                const [commentsRes, postsRes] = await Promise.all([
                    fetch(`https://arctic-shift.photon-reddit.com/api/comments/search?subreddit=${encodeURIComponent(sub)}&limit=100&sort=desc&before=${currentBefore}&after=${chunkStart}`),
                    fetch(`https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(sub)}&limit=100&sort=desc&before=${currentBefore}&after=${chunkStart}`)
                ]);

                const commentsData = await commentsRes.json();
                const postsData = await postsRes.json();

                const combined = [...(commentsData.data || []), ...(postsData.data || [])];
                if (combined.length === 0) break; // Exhausted time chunk

                let oldestTsInBatch = currentBefore;
                let batchAdded = 0;
                let chunkToCache = [];

                combined.forEach(obj => {
                    if (typeof extractSingleField === 'function') {
                        const processedObj = extractSingleField(obj);
                        if (processedObj) {
                            if (processedObj.timestamp < oldestTsInBatch) oldestTsInBatch = processedObj.timestamp;
                            if (!existingIds.has(processedObj.id) && processedObj.timestamp >= chunkStart) {
                                globalData.push(processedObj);
                                chunkToCache.push(processedObj);
                                existingIds.add(processedObj.id);
                                addedCount++;
                                batchAdded++;
                            }
                        }
                    }
                });

                if (chunkToCache.length > 0 && typeof window.appendSessionChunk === 'function') {
                    window.appendSessionChunk(chunkToCache);
                }

                if (statusEl) {
                    statusEl.innerText = `Streaming /r/${sub} (5 Threads) | ${addedCount.toLocaleString()} secured`;
                }

                // Only Thread 0 initiates the UI update loop to prevent DOM thrashing collisions
                if (batchAdded > 0 && workerId === 0) {
                    if(typeof window.executeSearch === 'function') window.executeSearch(false);
                }

                if (oldestTsInBatch >= currentBefore || oldestTsInBatch <= chunkStart) {
                    break;
                } else {
                    currentBefore = oldestTsInBatch;
                }

                // Optimal pacing limit for Arctic Shift via 5 threads
                await new Promise(r => setTimeout(r, 600)); 
            } catch (err) {
                console.error(`Worker ${workerId} error`, err);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    try {
        let workers = [];
        for (let i = 0; i < WORKER_COUNT; i++) {
            let wStart = effectiveStartTs + (i * chunkDuration);
            let wEnd = (i === WORKER_COUNT - 1) ? endTs : wStart + chunkDuration;
            workers.push(fetchWorker(i, wStart, wEnd));
        }
        await Promise.all(workers);

        if (statusEl) {
            statusEl.classList.remove('stream-active');
            statusEl.innerText = window.streamState.stopRequested ? `Stream Stopped. Total: ${addedCount.toLocaleString()} items.` : `Stream Complete. Total: ${addedCount.toLocaleString()} items.`;
            statusEl.style.color = "var(--text-main)";
        }

        if(typeof window.executeSearch === 'function') window.executeSearch(false);

    } catch (err) {
        console.error("Stream error", err);
        if (statusEl) {
            statusEl.classList.remove('stream-active');
            statusEl.innerText = "Stream interrupted due to network error.";
            statusEl.style.color = "var(--danger)";
        }
    } finally {
        window.streamState.active = false;
        if (streamControls) streamControls.style.display = 'none';
        if(typeof window.saveSessionState === 'function') window.saveSessionState();
    }
};

window.toggleStreamPause = function() {
    window.streamState.paused = !window.streamState.paused;
    const btn = document.getElementById('pauseStreamBtn');
    if (btn) btn.innerText = window.streamState.paused ? "Resume" : "Pause";
};

window.stopStreamProcessing = function() {
    window.streamState.stopRequested = true;
};

// --- LIVE CLOUD INGESTION FOR TARGET PROFILES ---
window.fetchLiveUserFootprint = async function(author) {
    const statusEl = document.getElementById('status');
    if(statusEl) {
        statusEl.innerText = `Establishing API Pipeline... Downloading up to 100 latest comments and posts for u/${author}.`;
        statusEl.style.color = "var(--warning)";
    }
    
    try {
        const [commentsRes, postsRes] = await Promise.all([
            fetch(`https://arctic-shift.photon-reddit.com/api/comments/search?author=${encodeURIComponent(author)}&limit=100&sort=desc`),
            fetch(`https://arctic-shift.photon-reddit.com/api/posts/search?author=${encodeURIComponent(author)}&limit=100&sort=desc`)
        ]);
        
        const commentsData = await commentsRes.json();
        const postsData = await postsRes.json();
        
        const combinedPayload = [...(commentsData.data || []), ...(postsData.data || [])];
        
        let addedCount = 0;
        const existingIds = new Set((typeof globalData !== 'undefined' ? globalData : []).map(item => item.id));
        
        combinedPayload.forEach(obj => {
            if (typeof extractSingleField === 'function') {
                const processedObj = extractSingleField(obj);
                if (processedObj && !existingIds.has(processedObj.id)) {
                    globalData.push(processedObj);
                    existingIds.add(processedObj.id);
                    addedCount++;
                }
            }
        });
        
        if (addedCount > 0) {
            globalData.sort((a, b) => b.timestamp - a.timestamp);
            if(statusEl) statusEl.innerText = `API Sync Complete: ${addedCount} new items injected for u/${author}. Rendering analysis...`;
        } else {
            if(statusEl) statusEl.innerText = `API Sync Complete: No new data found for u/${author} outside local cache.`;
        }
        
        await new Promise(r => setTimeout(r, 600));
        return addedCount;

    } catch(e) {
        console.error("API Pipeline Failure", e);
        if(statusEl) {
            statusEl.innerText = `API Connection Failed. Reverting to local cache filtering.`;
            statusEl.style.color = "var(--danger)";
        }
        await new Promise(r => setTimeout(r, 1000));
    }
};

// --- PCAP ALIGNED: FULL ACCOUNT HISTORY SYNC ENGINE ---
window.fetchFullUserHistory = async function(author) {
    if (!author) return;
    const statusEl = document.getElementById('status');
    const prevStatus = statusEl ? statusEl.innerText : "";
    if (statusEl) {
        statusEl.innerText = `Connecting to API... Analyzing metadata for u/${author}...`;
        statusEl.style.color = "var(--warning)";
    }
    
    try {
        const metaRes = await fetch(`https://arctic-shift.photon-reddit.com/api/users/search?author=${encodeURIComponent(author)}`);
        const metaJson = await metaRes.json();
        
        let earliestActivityTs = 0;
        let totalExpected = 0;
        if (metaJson && metaJson.data && metaJson.data.length > 0) {
            const uData = metaJson.data[0];
            const eComm = uData.earliest_comment_at || Infinity;
            const ePost = uData.earliest_post_at || Infinity;
            earliestActivityTs = Math.min(eComm, ePost);
            if (earliestActivityTs === Infinity) earliestActivityTs = 0;
            totalExpected = (uData.num_comments || 0) + (uData.num_posts || 0);
        }

        let addedCount = 0;
        const existingIds = new Set((typeof globalData !== 'undefined' ? globalData : []).map(item => item.id));
        let keepFetching = true;
        let currentBefore = Math.floor(Date.now() / 1000); 
        
        while (keepFetching) {
            if(statusEl) statusEl.innerText = `Downloading full footprint for u/${author}... (${addedCount.toLocaleString()} / ${totalExpected > 0 ? totalExpected.toLocaleString() : '?'} items secured)`;
            
            const [commentsRes, postsRes] = await Promise.all([
                fetch(`https://arctic-shift.photon-reddit.com/api/comments/search?author=${encodeURIComponent(author)}&limit=100&sort=desc&before=${currentBefore}`),
                fetch(`https://arctic-shift.photon-reddit.com/api/posts/search?author=${encodeURIComponent(author)}&limit=100&sort=desc&before=${currentBefore}`)
            ]);
            
            const commentsData = await commentsRes.json();
            const postsData = await postsRes.json();
            
            const combined = [...(commentsData.data || []), ...(postsData.data || [])];
            
            if (combined.length === 0) {
                keepFetching = false;
                break;
            }
            
            let oldestTsInBatch = currentBefore;
            let batchAdded = 0;
            let chunkToCache = [];
            
            combined.forEach(obj => {
                if (typeof extractSingleField === 'function') {
                    const processedObj = extractSingleField(obj);
                    if (processedObj) {
                        if (processedObj.timestamp < oldestTsInBatch) {
                            oldestTsInBatch = processedObj.timestamp;
                        }
                        if (!existingIds.has(processedObj.id)) {
                            globalData.push(processedObj);
                            chunkToCache.push(processedObj);
                            existingIds.add(processedObj.id);
                            addedCount++;
                            batchAdded++;
                        }
                    }
                }
            });
            
            if (chunkToCache.length > 0 && typeof window.appendSessionChunk === 'function') {
                await window.appendSessionChunk(chunkToCache);
            }
            
            if (batchAdded === 0 || oldestTsInBatch >= currentBefore || (earliestActivityTs > 0 && oldestTsInBatch <= earliestActivityTs)) {
                keepFetching = false;
            } else {
                currentBefore = oldestTsInBatch;
            }
            
            await new Promise(r => setTimeout(r, 250)); 
        }

        if (addedCount > 0) {
            const msg = `Successfully ingested ${addedCount.toLocaleString()} total historical items for u/${author}.`;
            if(statusEl) {
                statusEl.innerText = msg + " Re-sorting database...";
                statusEl.style.color = "var(--success)";
            }
            alert(msg); 
            if (typeof triggerSearch === 'function') triggerSearch(author); 
        } else {
            if(statusEl) {
                statusEl.innerText = `Sync complete: No new historical data found for u/${author}.`;
                statusEl.style.color = "var(--text-muted)";
                setTimeout(() => { statusEl.innerText = prevStatus; }, 4000);
            }
        }
    } catch (err) {
        console.error(err);
        if(statusEl) {
            statusEl.innerText = `Connection to Arctic Shift failed. Check console.`;
            statusEl.style.color = "var(--danger)"; 
        }
        alert("Failed to fetch full user history.");
    }
};

window.fetchArcticData = window.fetchFullUserHistory;

// --- HIGH-PERFORMANCE SEARCH & FILTER ENGINE ---
window.executeSearch = async function(pushHistory = true) {
    const searchInput = document.getElementById('searchInput');
    const rawLocalQuery = searchInput ? searchInput.value.trim() : ""; 
    const lowerQuery = rawLocalQuery.toLowerCase();
    
    const isLiveUserSync = document.getElementById('userSearchCheckbox') && document.getElementById('userSearchCheckbox').checked;

    if (pushHistory) {
        const urlParams = new URLSearchParams(window.location.search);
        if (rawLocalQuery) urlParams.set('q', rawLocalQuery);
        else urlParams.delete('q');
        const newUrl = window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");
        history.pushState({ query: rawLocalQuery }, "", newUrl);
    }

    const statusEl = document.getElementById('status');

    if (isLiveUserSync && rawLocalQuery && !lowerQuery.startsWith("id:") && !lowerQuery.startsWith("thread:")) {
        await fetchLiveUserFootprint(rawLocalQuery);
    } else {
        if(statusEl) {
            statusEl.innerText = rawLocalQuery ? `Filtering massive database for: "${rawLocalQuery}"...` : "Resetting view...";
            statusEl.style.color = "var(--text-main)";
        }
    }

    // STRICT LITERAL SEARCH UPGRADE
    if (rawLocalQuery.startsWith('"') && rawLocalQuery.endsWith('"') && rawLocalQuery.length >= 2) {
        const literalTarget = rawLocalQuery.slice(1, -1);
        filteredData = globalData.filter(item => item.text.includes(literalTarget) || item.author.includes(literalTarget));
    } 
    // EXISTING PARAMETERIZED SEARCHES
    else if (lowerQuery.startsWith("id:")) {
        const targetId = lowerQuery.substring(3).trim();
        filteredData = globalData.filter(item => String(item.id) === targetId);
        if(filteredData.length === 0 && typeof window.fetchApiContext === 'function') {
            const inferredType = (targetId.length === 7 && targetId.startsWith('1')) ? 'posts' : 'comments';
            window.fetchApiContext(inferredType, targetId);
        }
    } else if (lowerQuery.startsWith("thread:")) {
        const targetThread = lowerQuery.substring(7).trim().replace('t3_', '');
        filteredData = globalData.filter(item => String(item.link_id).replace('t3_', '') === targetThread);
        if(filteredData.length < 2 && typeof window.deepReconstructThread === 'function') {
            setTimeout(() => {
                if(confirm("This thread has very few items in your local cache. Would you like to use the API to deep-reconstruct the full thread and its participants?")) {
                    window.deepReconstructThread(targetThread);
                }
            }, 500);
        }
    } else if (lowerQuery.startsWith("hash:")) {
        const targetHash = lowerQuery.substring(5).trim();
        filteredData = globalData.filter(item => item.forensics && String(item.forensics.contentHash) === targetHash);
    } else if (lowerQuery.startsWith("sub:")) {
        const targetSub = lowerQuery.substring(4).trim().toLowerCase();
        filteredData = globalData.filter(item => (item.subreddit || "").toLowerCase() === targetSub);
    } else if (isLiveUserSync) {
        filteredData = globalData.filter(item => item.author.toLowerCase() === lowerQuery);
    } else if (lowerQuery) {
        filteredData = globalData.filter(item => {
            return item.text.toLowerCase().includes(lowerQuery) || 
                   item.author.toLowerCase().includes(lowerQuery) || 
                   (item.subreddit && item.subreddit.toLowerCase().includes(lowerQuery));
        });
    } else {
        filteredData = [...globalData];
    }

    updateViewData();
    
    if (isLiveUserSync) {
        const groupsTab = document.querySelector('[data-target="groupsView"]');
        if (groupsTab) groupsTab.click();
    }
};

window.updateViewData = function() {
    const subInput = document.getElementById('subSearchInput');
    const subQuery = subInput ? subInput.value.toLowerCase().trim() : "";
    
    let targetData = filteredData;

    if (subQuery) {
        if (subQuery === 'bot') {
            targetData = targetData.filter(item => item.forensics && item.forensics.isAdmittedBot);
        } else {
            targetData = targetData.filter(item => {
                if (item.author.toLowerCase().includes(subQuery)) return true;
                if (item.text.toLowerCase().includes(subQuery)) return true;
                if ((item.subreddit||"").toLowerCase().includes(subQuery)) return true;
                return false;
            });
        }
    }

    // GAP TOOL INJECTION
    if (typeof window.gapFilterMode !== 'undefined' && window.gapFilterMode !== 'all' && window.gapStatusMap) {
        if (window.gapFilterMode === 'pass') {
            targetData = targetData.filter(i => window.gapStatusMap.get(i.author) === true);
        } else if (window.gapFilterMode === 'fail') {
            targetData = targetData.filter(i => window.gapStatusMap.get(i.author) === false);
        }
    }

    let endTsTarget = typeof currentEndTs !== 'undefined' ? currentEndTs : Infinity;
    let startTsTarget = typeof currentStartTs !== 'undefined' ? currentStartTs : 0;
    
    let rawViewData = targetData.filter(item => item.timestamp >= startTsTarget && item.timestamp <= endTsTarget);

    const seenMap = new Set();
    viewData = [];
    for (let i = 0; i < rawViewData.length; i++) {
        const item = rawViewData[i];
        
        const isRandomId = String(item.id).includes('.');
        const hashFallback = item.forensics && item.forensics.contentHash ? item.forensics.contentHash : item.text.substring(0, 50);
        
        const dupKey = isRandomId ? `${item.author}_${hashFallback}` : String(item.id);
        
        if (!seenMap.has(dupKey)) {
            seenMap.add(dupKey);
            viewData.push(item);
        }
    }

    if (typeof buildThreadViewData === 'function') buildThreadViewData();
    
    if (typeof currentDisplayCount !== 'undefined') currentDisplayCount = 0;
    if (typeof currentThreadDisplayCount !== 'undefined') currentThreadDisplayCount = 0;
    
    const resultsContainer = document.getElementById('resultsContainer');
    const threadsContainer = document.getElementById('threadsContainer');
    if (resultsContainer) resultsContainer.innerHTML = "";
    if (threadsContainer) threadsContainer.innerHTML = "";

    if (typeof renderNextChunk === 'function') renderNextChunk();
    if (typeof renderNextThreadChunk === 'function') renderNextThreadChunk();

    // Trigger Active Tab Render
    if (document.getElementById('groupsView') && document.getElementById('groupsView').classList.contains('active')) if(typeof renderGroups === 'function') renderGroups();
    if (document.getElementById('usersView') && document.getElementById('usersView').classList.contains('active')) if(typeof renderUsersTab === 'function') renderUsersTab();
    if (document.getElementById('servicesView') && document.getElementById('servicesView').classList.contains('active')) if(typeof renderServicesTab === 'function') renderServicesTab();
    if (document.getElementById('timelineView') && document.getElementById('timelineView').classList.contains('active')) if(typeof window.renderTimeline === 'function') window.renderTimeline();
    if (document.getElementById('compareView') && document.getElementById('compareView').classList.contains('active')) if(typeof window.renderCompare === 'function') window.renderCompare();
    if (document.getElementById('stylometryView') && document.getElementById('stylometryView').classList.contains('active')) if(typeof renderStylometry === 'function') renderStylometry();
    if (document.getElementById('wordCloudView') && document.getElementById('wordCloudView').classList.contains('active')) if(typeof renderWordCloud === 'function') renderWordCloud();
    if (document.getElementById('graphView') && document.getElementById('graphView').classList.contains('active')) if(typeof window.initGraphView === 'function') window.initGraphView();
    if (document.getElementById('recentUsersView') && document.getElementById('recentUsersView').classList.contains('active')) if(typeof renderRecentUsers === 'function') renderRecentUsers();
    if (document.getElementById('similarityView') && document.getElementById('similarityView').classList.contains('active')) if(typeof renderSimilarity === 'function') renderSimilarity();
    if (document.getElementById('locationView') && document.getElementById('locationView').classList.contains('active')) if(typeof renderLocation === 'function') renderLocation();
    if (document.getElementById('entitiesView') && document.getElementById('entitiesView').classList.contains('active')) if(typeof renderEntities === 'function') renderEntities();

    const statusEl = document.getElementById('status');
    if (statusEl) {
        const threadCount = typeof threadViewData !== 'undefined' ? threadViewData.length : 0;
        const itemCount = typeof viewData !== 'undefined' ? viewData.length : 0;
        statusEl.innerText = `Showing ${itemCount.toLocaleString()} items (${threadCount.toLocaleString()} threads).`;
        statusEl.style.color = "var(--success)";
    }
};

window.buildThreadViewData = function() {
    const threadMap = new Map();
    viewData.forEach(item => {
        const linkId = item.link_id || "unknown";
        if (!threadMap.has(linkId)) {
            threadMap.set(linkId, {
                link_id: linkId,
                link_title: item.link_title || "",
                timestamp: item.timestamp,
                count: 0,
                authors: new Set(),
                comments: [],
                sampleText: item.text,
                rootText: null,
                isTrueRoot: false,
                rootAuthor: item.author // Fallback
            });
        }
        
        const thread = threadMap.get(linkId);
        thread.count++;
        thread.authors.add(item.author);
        if (item.timestamp > thread.timestamp) thread.timestamp = item.timestamp; 
        if (item.subreddit && item.subreddit !== "unknown") thread.subreddit = item.subreddit;
        
        if (item.id === linkId.replace('t3_', '')) {
            thread.rootText = item.text;
            thread.link_title = item.link_title || item.title || thread.link_title;
            thread.isTrueRoot = true;
            thread.rootAuthor = item.author; 
        } else {
            if (thread.comments.length < 5) thread.comments.push({ author: item.author, text: item.text, id: item.id });
        }
    });

    threadViewData = Array.from(threadMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    threadMap.clear();

    window.enrichMissingThreadData(threadViewData);
};

window.enrichMissingThreadData = async function(threads) {
    const missingIds = threads.filter(t => !t.isTrueRoot && (!t.link_title || t.link_title.trim() === '')).map(t => t.link_id.replace('t3_', ''));
    if (missingIds.length === 0) return;

    const chunkSize = 40;
    for (let i = 0; i < missingIds.length; i += chunkSize) {
        const chunk = missingIds.slice(i, i + chunkSize);
        try {
            const res = await fetch(`https://arctic-shift.photon-reddit.com/api/posts/ids?ids=${chunk.join(',')}`);
            if (res.ok) {
                const json = await res.json();
                const items = json.data || (Array.isArray(json) ? json : [json]);
                let updated = false;
                
                items.forEach(post => {
                    const targetThread = threads.find(t => t.link_id === `t3_${post.id}` || t.link_id === post.id);
                    if (targetThread) {
                        targetThread.link_title = post.title;
                        targetThread.rootText = post.selftext || post.body || post.selftext_html || "";
                        if (post.subreddit) targetThread.subreddit = post.subreddit;
                        if (post.author) targetThread.rootAuthor = post.author; 
                        updated = true;
                    }
                });
                
                if (updated && document.getElementById('threadsView') && document.getElementById('threadsView').classList.contains('active')) {
                    const container = document.getElementById('threadsContainer');
                    if(container) {
                        const cards = container.querySelectorAll('.thread-compact-card');
                        cards.forEach(card => {
                            const tId = card.dataset.threadId;
                            const matchingData = threads.find(t => t.link_id === tId);
                            if (matchingData) {
                                // Find Title node
                                const titleNode = card.querySelector('.thread-title-node');
                                if (titleNode && matchingData.link_title && titleNode.innerText.startsWith('Thread:')) {
                                    titleNode.innerText = typeof window.escapeHTML === 'function' ? window.escapeHTML(matchingData.link_title) : matchingData.link_title;
                                }
                                // Find Author node
                                const authorNode = card.querySelector('.thread-author-node');
                                if (authorNode && matchingData.rootAuthor) {
                                    authorNode.innerHTML = `u/${typeof window.escapeHTML === 'function' ? window.escapeHTML(matchingData.rootAuthor) : matchingData.rootAuthor}`;
                                    authorNode.setAttribute('onclick', `event.stopPropagation(); if(typeof triggerSearch==='function') triggerSearch('${matchingData.rootAuthor}')`);
                                }
                            }
                        });
                    }
                }
            }
        } catch (err) { console.error("Batch title enrichment failed", err); }
        await new Promise(r => setTimeout(r, 1000)); 
    }
};