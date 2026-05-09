/* OSINT PLATFORM: EXTENSIONS GRAPH & COMPUTE (v20.8 - ANALYST COMPARE UPGRADES) */
/* Purpose: Handles Groups, Network Graph, Topological Intelligence, Clone Checking, Compare */

// [32] renderGroups()
// Purpose: Subreddit Aggregation Engine for Phase A Macro Discovery.
window.renderGroups = function() {
    const container = document.getElementById('groupsContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="comment-card" style="text-align: center; padding: 30px; width:100%; box-sizing: border-box;">
            <p style="color: var(--text-muted);">Mapping community topology...</p>
        </div>`;

    const groupStats = new Map();
    const vData = typeof window.viewData !== 'undefined' ? window.viewData : [];
    
    const sInput = document.getElementById('searchInput');
    const isUserFocus = sInput && sInput.value && !sInput.value.includes(':') ? sInput.value.trim() : null;
    const tabTitle = isUserFocus ? `User Groups for u/${isUserFocus}` : "Associated Groups";

    window.executeChunkedRender(vData, (item) => {
        if (!item.subreddit || item.subreddit.trim() === "" || item.subreddit === "unknown") return;
        if (!groupStats.has(item.subreddit)) {
            groupStats.set(item.subreddit, { count: 0, firstSeen: item.timestamp, lastSeen: item.timestamp });
        }
        const stat = groupStats.get(item.subreddit);
        stat.count++;
        if (item.timestamp < stat.firstSeen) stat.firstSeen = item.timestamp;
        if (item.timestamp > stat.lastSeen) stat.lastSeen = item.timestamp;
    }, () => {
        const sortedGroups = Array.from(groupStats.entries()).sort((a, b) => b[1].count - a[1].count);

        let rows = sortedGroups.map((g) => {
            const subName = g[0];
            const stats = g[1];
            const firstDate = new Date(stats.firstSeen * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const lastDate = new Date(stats.lastSeen * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            
            return `
                <tr class="group-row" data-sub="${window.escapeHTML(subName)}">
                    <td class="clickable-author" style="font-weight: bold; color: var(--text-main); white-space:nowrap;" onclick="if(typeof triggerSubSearch === 'function') triggerSubSearch('${window.escapeHTML(subName)}')">r/${window.escapeHTML(subName)}</td>
                    <td style="white-space:nowrap;">${stats.count.toLocaleString()}</td>
                    <td style="font-size: 0.85rem; color: var(--text-muted); white-space:nowrap;">${firstDate}</td>
                    <td style="font-size: 0.85rem; color: var(--text-muted); white-space:nowrap;">${lastDate}</td>
                    <td style="white-space:nowrap;"><button class="btn btn-secondary btn-compact" onclick="if(typeof triggerSubSearch === 'function') triggerSubSearch('${window.escapeHTML(subName)}')">Filter</button></td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="comment-card" style="display:block; width:100%; box-sizing: border-box; overflow-x:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                    <h3 style="margin-top:0; color:var(--primary);">${window.escapeHTML(tabTitle)}</h3>
                    <span style="font-size:0.75rem; color:var(--text-muted); border: 1px dashed var(--border); padding: 4px 8px; border-radius: 4px;">Long-press to preview • Triple-tap to ingest via Cloud</span>
                </div>
                <div class="table-container" style="margin-top: 15px; width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch;">
                    <table style="width:100%; min-width: 500px; text-align: left; border-collapse: collapse;">
                        <thead><tr><th style="white-space:nowrap;">Group (Subreddit)</th><th style="white-space:nowrap;">Interactions</th><th style="white-space:nowrap;">First Seen</th><th style="white-space:nowrap;">Last Seen</th><th style="white-space:nowrap;">Actions</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="5" style="text-align:center; padding: 20px;">No group data available.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>`;

        const groupRows = container.querySelectorAll('.group-row');
        groupRows.forEach(row => {
            const subName = row.dataset.sub;
            let pressTimer;
            let tapCount = 0;
            let tapTimer;

            row.oncontextmenu = (e) => e.preventDefault();
            
            const startPress = (e) => {
                if (e.target.tagName.toLowerCase() === 'button') return;
                row.style.background = "rgba(255,255,255,0.05)";
                
                tapCount++;
                clearTimeout(tapTimer);
                if (tapCount >= 3) {
                    tapCount = 0;
                    if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
                    const cloudModal = document.getElementById('cloudArchiveModal');
                    const subInputEl = document.getElementById('archiveSubInput');
                    if (cloudModal && subInputEl) {
                        subInputEl.value = subName;
                        cloudModal.style.display = 'flex';
                    }
                    return;
                } else {
                    tapTimer = setTimeout(() => { tapCount = 0; }, 400);
                }

                pressTimer = setTimeout(() => {
                    if(navigator.vibrate) navigator.vibrate(50);
                    if(typeof window.showGroupPreview === 'function') window.showGroupPreview(subName);
                }, 600);
            };
            
            const cancelPress = () => { row.style.background = ""; clearTimeout(pressTimer); };
            
            row.addEventListener('touchstart', startPress, {passive:true});
            row.addEventListener('touchend', cancelPress);
            row.addEventListener('mousedown', startPress);
            row.addEventListener('mouseup', cancelPress);
            row.addEventListener('mouseleave', cancelPress);
        });
    }, "Mapping Groups");
};

// [33] Similarity & Clone Engine
// Purpose: Memory Hardened & Astroturf Aware Math execution for Sock Puppet Attribution.
window.similarityCurrentPage = 0;
window.similarityResults = [];
window.similarityTarget = "";
window.cloneSelection = new Set();

window.toggleCloneSelection = function(author) {
    if (!window.cloneSelection) window.cloneSelection = new Set();
    if (window.cloneSelection.has(author)) window.cloneSelection.delete(author);
    else window.cloneSelection.add(author);
    window.renderClonePage();
};

window.toggleAllClones = function() {
    if (!window.cloneSelection) window.cloneSelection = new Set();
    const currentPageAuthors = window.similarityResults
        .slice(window.similarityCurrentPage * 20, (window.similarityCurrentPage + 1) * 20)
        .map(s => s.author);
    
    const allSelected = currentPageAuthors.every(a => window.cloneSelection.has(a));
    
    currentPageAuthors.forEach(a => {
        if (allSelected) window.cloneSelection.delete(a);
        else window.cloneSelection.add(a);
    });
    window.renderClonePage();
};

window.exportSelectedClones = function() {
    if (!window.cloneSelection || window.cloneSelection.size === 0) return alert('No clones selected to export.');
    let added = 0;
    window.cloneSelection.forEach(author => {
        window.addToCollection({ id: `profile_${author}`, type: 'profile', value: author, timestamp: Date.now() / 1000 });
        added++;
    });
    alert(`Successfully exported ${added} target profiles to your locker Collection.`);
    window.cloneSelection.clear();
    window.renderClonePage();
};

window.renderSimilarity = function() {
    const tabOverlay = document.getElementById('tabLoadingOverlay');
    if (tabOverlay) tabOverlay.style.display = 'none';

    const c = document.getElementById('similarity-container');
    if(!c) return;

    const vData = typeof window.viewData !== 'undefined' ? window.viewData : [];
    
    if (!window.similarityTarget && vData.length > 0) {
        const authorCounts = new Map();
        for(let i=0; i<vData.length; i++) {
            const a = vData[i].author;
            if(a !== '[deleted]' && a !== 'AutoModerator') {
                authorCounts.set(a, (authorCounts.get(a) || 0) + 1);
            }
        }
        let maxC = 0; let topUser = "";
        authorCounts.forEach((c, a) => { if(c > maxC) { maxC = c; topUser = a; } });
        if (topUser) window.similarityTarget = topUser;
    }

    c.innerHTML = `
        <div class="comment-card" style="display:block; width:100%; box-sizing: border-box; overflow-x:hidden;">
            <h3 style="margin-top:0;">Sock Puppet & Clone Analysis</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">Multi-vector analysis including Linguistic Fingerprinting, Chronological Gaps, and Astroturfing (Thread Overlap) detection.</p>
            
            <div style="margin-top:15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border); width: 100%; box-sizing: border-box;">
                <label style="font-size: 0.85rem; color: var(--text-muted); display:flex; flex-wrap: wrap; align-items:center;">
                    <span style="flex:1; min-width: 200px;">N-Gram & Network Sample Size:</span>
                    <span id="cloneSampleSizeValue" style="color: var(--text-main); font-weight: bold; white-space: nowrap; margin-top: 4px;">Standard (2,500)</span>
                </label>
                <input type="range" id="cloneSampleSizeSlider" min="1000" max="10000" step="500" value="2500" style="width: 100%; margin-top: 10px;" oninput="document.getElementById('cloneSampleSizeValue').innerText = this.value >= 10000 ? 'Max (10,000)' : this.value.toLocaleString();">
            </div>

            <div class="input-with-btn" style="margin-top:15px; width: 100%; display: flex; flex-wrap: wrap; gap: 8px;">
                <input type="text" id="cloneSearchInput" placeholder="Enter target username..." value="${window.escapeHTML(window.similarityTarget)}" style="flex:1; min-width: 200px; box-sizing: border-box;">
                <button class="btn btn-primary" style="white-space: nowrap;" onclick="window.similarityResults = []; window.cloneSelection.clear(); window.runCloneAnalysis()">Analyze Clones</button>
            </div>
        </div>
        <div id="cloneResultsContainer" style="width: 100%; display: block; box-sizing: border-box;"></div>
    `;
    
    if (window.similarityResults.length === 0 && window.similarityTarget) window.runCloneAnalysis();
    else if (window.similarityResults.length > 0) window.renderClonePage();
};

window.runCloneAnalysis = function() {
    const searchInput = document.getElementById('cloneSearchInput');
    const sampleSlider = document.getElementById('cloneSampleSizeSlider');
    if(!searchInput) return;
    
    let targetAuthor = searchInput.value.trim().replace(/^u\//i, '');
    if (!targetAuthor) return;
    window.similarityTarget = targetAuthor;
    window.cancelReconstructFlag = false;

    const maxSampleSize = sampleSlider ? parseInt(sampleSlider.value) : 2500;
    const resultsContainer = document.getElementById('cloneResultsContainer');
    if(!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="comment-card" style="display:block; width:100%; box-sizing:border-box;">
            <p id="cloneProgressText" style="color:var(--text-main);">Phase 1/4: Pre-flight sizing (Counting target vectors)...</p>
            <div style="height:4px; background:var(--bg-dark); width:100%; border-radius:2px; margin-top:10px; overflow:hidden;">
                <div id="cloneProgressBar" style="height:100%; width:2%; background:var(--primary); transition: width 0.1s;"></div>
            </div>
            <button class="btn btn-danger btn-compact" style="margin-top:15px; width:100%; display:block;" onclick="window.cancelReconstructFlag = true; document.getElementById('cloneResultsContainer').innerHTML = '';">Stop / Cancel Scan</button>
        </div>
    `;

    const dataRef = typeof window.globalData !== 'undefined' ? window.globalData : [];
    const pBar = document.getElementById('cloneProgressBar');
    const pText = document.getElementById('cloneProgressText');

    const preflightCounts = new Map();
    let pIdx = 0;

    function preflightChunk() {
        if (window.cancelReconstructFlag) { preflightCounts.clear(); return; }
        const startTime = performance.now();
        
        while(pIdx < dataRef.length && (performance.now() - startTime) < 20) {
            const author = dataRef[pIdx].author;
            if(author !== '[deleted]' && author !== 'AutoModerator') {
                preflightCounts.set(author, (preflightCounts.get(author) || 0) + 1);
            }
            pIdx++;
        }

        if (pIdx % 1000 === 0 && pBar) pBar.style.width = ((pIdx / dataRef.length) * 10) + '%';

        if (pIdx < dataRef.length) {
            setTimeout(preflightChunk, 0);
        } else {
            startPhase1(preflightCounts);
        }
    }
    preflightChunk();

    function startPhase1(counts) {
        if (pText) pText.innerText = "Phase 2/4: Extracting high-value corpus parameters & astroturf topology...";
        const userDocs = new Map();

        counts.forEach((count, author) => {
            if (count >= 3 || author === targetAuthor) {
                userDocs.set(author, { count: count, actualCount: 0, grams: new Map(), timestamps: [], subs: new Set(), threads: new Set(), wordLen: 0, rich: 0, punct: 0, caps: 0, size: 0 });
            }
        });
        counts.clear(); 

        let dIdx = 0;
        function processCorpusChunk() {
            if (window.cancelReconstructFlag) { userDocs.clear(); return; }
            const startTime = performance.now();
            
            while(dIdx < dataRef.length && (performance.now() - startTime) < 20) {
                const item = dataRef[dIdx];
                const u = userDocs.get(item.author);
                
                if(u) {
                    u.actualCount++;
                    u.timestamps.push(item.timestamp);
                    if (item.subreddit) u.subs.add(item.subreddit);
                    if (item.link_id) u.threads.add(item.link_id);
                    
                    if (u.size < maxSampleSize && item.text) {
                        const text = item.text.toLowerCase();
                        let clean = "";
                        for(let k=0; k<text.length; k++) {
                            const code = text.charCodeAt(k);
                            if ((code > 96 && code < 123) || (code > 47 && code < 58)) clean += text[k];
                        }
                        for(let i = 0; i < clean.length - 2; i++) {
                            const g = clean.substring(i, i+3);
                            u.grams.set(g, (u.grams.get(g) || 0) + 1);
                        }
                        u.size += item.text.length;
                    }

                    if(item.forensics) {
                        u.wordLen += parseFloat(item.forensics.avgWordLength || 0);
                        u.rich += parseFloat(item.forensics.lexicalRichness || 0);
                        u.punct += parseFloat(item.forensics.punctuationRatio || 0);
                        u.caps += parseFloat(item.forensics.capsRatio || 0);
                    }
                }
                dIdx++;
            }

            if (dIdx % 500 === 0 && pBar) pBar.style.width = 10 + ((dIdx / dataRef.length) * 40) + '%';
            if (dIdx < dataRef.length) setTimeout(processCorpusChunk, 0);
            else finalizeCorpus(userDocs);
        }
        processCorpusChunk();
    }

    function finalizeCorpus(userDocs) {
        if (pText) pText.innerText = "Phase 3/4: Compressing Vector Tensors...";
        const authors = Array.from(userDocs.keys());
        let aIdx = 0;

        function compressChunk() {
            if (window.cancelReconstructFlag) { userDocs.clear(); return; }
            const startTime = performance.now();

            while(aIdx < authors.length && (performance.now() - startTime) < 20) {
                const a = authors[aIdx];
                const u = userDocs.get(a);

                if (u.grams) {
                    const sortedGrams = Array.from(u.grams.entries()).sort((x, y) => y[1] - x[1]).slice(0, 50).map(x => x[0]);
                    u.trigrams = new Set(sortedGrams);
                    u.grams.clear(); 
                    u.grams = null; 
                }

                if (u.timestamps) {
                    u.timestamps.sort((x, y) => x - y);
                    const gaps = [];
                    for(let i = 1; i < u.timestamps.length; i++) {
                        const diff = u.timestamps[i] - u.timestamps[i-1];
                        if (diff > 86400 * 3) gaps.push({ start: u.timestamps[i-1], end: u.timestamps[i], duration: diff });
                    }
                    u.gaps = gaps;
                    u.timestamps = null; 
                }
                
                aIdx++;
            }

            if (aIdx % 100 === 0 && pBar) pBar.style.width = 50 + ((aIdx / authors.length) * 20) + '%';
            if (aIdx < authors.length) setTimeout(compressChunk, 0);
            else computeScores(userDocs, targetAuthor);
        }
        compressChunk();
    }
};

window.computeScores = function(userDocs, targetAuthor) {
    const resultsContainer = document.getElementById('cloneResultsContainer');
    const pText = document.getElementById('cloneProgressText');
    const pBar = document.getElementById('cloneProgressBar');
    
    if (pText) pText.innerText = "Phase 4/4: Comparing neural distances & topological overlaps...";

    if (!userDocs.has(targetAuthor)) {
        if(resultsContainer) resultsContainer.innerHTML = `<div class="comment-card"><p style="color:var(--danger);">User u/${window.escapeHTML(targetAuthor)} not found in current database.</p></div>`;
        userDocs.clear();
        return;
    }

    const target = userDocs.get(targetAuthor);
    target.wordLen = target.actualCount ? target.wordLen / target.actualCount : 0;
    target.rich = target.actualCount ? target.rich / target.actualCount : 0; 
    target.punct = target.actualCount ? target.punct / target.actualCount : 0; 
    target.caps = target.actualCount ? target.caps / target.actualCount : 0;
    const targetTrigrams = target.trigrams;
    const targetGaps = target.gaps;
    const targetSubs = target.subs;
    const targetThreads = target.threads;

    let maxW = 0, maxR = 0, maxP = 0, maxC = 0;
    const validUsers = [];
    userDocs.forEach((u, author) => {
        if (u.count >= 3 && author !== targetAuthor) {
            u.wordLen = u.actualCount ? u.wordLen / u.actualCount : 0; 
            u.rich = u.actualCount ? u.rich / u.actualCount : 0; 
            u.punct = u.actualCount ? u.punct / u.actualCount : 0; 
            u.caps = u.actualCount ? u.caps / u.actualCount : 0;
            if(u.wordLen > maxW) maxW = u.wordLen;
            if(u.rich > maxR) maxR = u.rich;
            if(u.punct > maxP) maxP = u.punct;
            if(u.caps > maxC) maxC = u.caps;
            validUsers.push(author);
        }
    });

    const similarities = [];
    let sIdx = 0;

    function processScoreChunk() {
        if (window.cancelReconstructFlag) { userDocs.clear(); return; }
        const startTime = performance.now();
        
        while (sIdx < validUsers.length && (performance.now() - startTime) < 20) {
            const author = validUsers[sIdx];
            const u2 = userDocs.get(author);
            
            // STRICT Stylometry Distance Penalization
            const dw = maxW ? ((target.wordLen - u2.wordLen) / maxW) ** 2 : 0;
            const dr = maxR ? ((target.rich - u2.rich) / maxR) ** 2 : 0;
            const dp = maxP ? ((target.punct - u2.punct) / maxP) ** 2 : 0;
            const dc = maxC ? ((target.caps - u2.caps) / maxC) ** 2 : 0;
            const dist = Math.sqrt(dw + dr + dp + dc);
            // Severe drop-off ensures 100% only on near-perfect matches
            const baseSim = Math.max(0, 100 - (dist * 150)); 
            
            // N-Gram Distance
            const u2Trigrams = u2.trigrams;
            let intersection = 0;
            u2Trigrams.forEach(g => { if(targetTrigrams.has(g)) intersection++; });
            const union = targetTrigrams.size + u2Trigrams.size - intersection;
            const ngramSim = union === 0 ? 0 : (intersection / union) * 100;

            // Gap Overlap (Sock Puppet Strict Gap Analysis)
            const u2Gaps = u2.gaps;
            let gapOverlapScore = 0;
            if (targetGaps.length > 0 && u2Gaps.length > 0) {
                let overlapTime = 0, i = 0, j = 0;
                while (i < targetGaps.length && j < u2Gaps.length) {
                    const tg = targetGaps[i], ug = u2Gaps[j];
                    const startMax = Math.max(tg.start, ug.start);
                    const endMin = Math.min(tg.end, ug.end);
                    if (startMax < endMin) overlapTime += (endMin - startMax);
                    if (tg.end < ug.end) i++; else j++;
                }
                const totalTargetGapTime = targetGaps.reduce((acc, g) => acc + g.duration, 0);
                gapOverlapScore = totalTargetGapTime > 0 ? Math.min(100, (overlapTime / totalTargetGapTime) * 100) : 0;
            } else if (targetGaps.length === 0 && u2Gaps.length === 0) {
                gapOverlapScore = 100; // Both operators maintain zero deployment gaps
            }

            // ASTROTURF UPGRADE: Subreddit and Thread overlap
            let sharedSubs = 0;
            u2.subs.forEach(s => { if(targetSubs.has(s)) sharedSubs++; });
            const subSim = targetSubs.size > 0 ? (sharedSubs / targetSubs.size) * 100 : 0;

            let sharedThreads = 0;
            u2.threads.forEach(t => { if(targetThreads.has(t)) sharedThreads++; });
            const astroturfMultiplier = sharedThreads > 0 ? (sharedThreads * 10) : 0; 

            // Composite Score Mapping
            let finalScore = (baseSim * 0.3) + (ngramSim * 0.3) + (gapOverlapScore * 0.2) + (subSim * 0.2) + astroturfMultiplier;
            
            // Artificial 100% Blocker
            if (finalScore > 99.9 && (baseSim < 99 || ngramSim < 99 || gapOverlapScore < 99)) {
                finalScore = 99.9; // Requires near-perfect overlap in every category to hit true 100
            }
            finalScore = Math.min(100, finalScore); // Cap at 100%

            similarities.push({ 
                author, 
                score: finalScore, 
                baseSim, 
                ngramSim, 
                gapOverlapScore, 
                subSim, 
                sharedThreads,
                count: u2.actualCount 
            });
            
            sIdx++;
        }

        if (sIdx % 50 === 0 && pBar) pBar.style.width = 70 + ((sIdx / validUsers.length) * 30) + '%';
        if (sIdx < validUsers.length) setTimeout(processScoreChunk, 0);
        else {
            // STRICT TOP 20 LIMIT APPLIED HERE
            window.similarityResults = similarities.sort((a,b) => b.score - a.score).slice(0, 20);
            window.similarityCurrentPage = 0;
            userDocs.clear(); 
            window.renderClonePage();
        }
    }
    processScoreChunk();
};

window.renderClonePage = function() {
    const resultsContainer = document.getElementById('cloneResultsContainer');
    if(!resultsContainer) return;

    window.cloneSelection = window.cloneSelection || new Set();
    const pageSize = 20; // Bound to Top 20 array length
    const startIndex = window.similarityCurrentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, window.similarityResults.length);
    const currentSlice = window.similarityResults.slice(startIndex, endIndex);

    let rows = currentSlice.map((s, idx) => {
        let riskColor = s.score >= 60 ? "var(--danger)" : (s.score >= 45 ? "var(--warning)" : "inherit");
        let isSelected = window.cloneSelection.has(s.author);
        let selectStyle = isSelected ? "background:var(--primary); color:#000; cursor:pointer;" : "cursor:pointer;";
        
        let astroturfWarning = s.sharedThreads > 0 ? `<br><span style="color:var(--danger); font-weight:bold;">⚠️ Shared Threads: ${s.sharedThreads}</span>` : '';

        return `
        <tr>
            <td onclick="window.toggleCloneSelection('${window.escapeHTML(s.author)}')" style="${selectStyle} font-weight:bold; border-radius:4px; text-align:center;">${startIndex + idx + 1}</td>
            <td class="clickable-author" style="white-space:nowrap;" onclick="if(typeof triggerSearch === 'function') triggerSearch('${window.escapeHTML(s.author)}')">u/${window.escapeHTML(s.author)}</td>
            <td style="color:${riskColor}; font-weight:bold; white-space:nowrap;">${s.score.toFixed(1)}%</td>
            <td style="font-size:0.8rem; color:var(--text-muted); line-height: 1.2; white-space:nowrap;">N-Gram: ${s.ngramSim.toFixed(1)}%<br>Gaps: ${s.gapOverlapScore.toFixed(1)}%<br>Subs: ${s.subSim.toFixed(1)}%${astroturfWarning}</td>
            <td style="color:var(--text-muted); white-space:nowrap;">${s.count} items</td>
            <td style="white-space:nowrap;"><button class="btn btn-secondary btn-compact" onclick="document.querySelector('[data-target=\\'compareView\\']').click(); document.getElementById('compareUserInput1').value = '${window.escapeHTML(window.similarityTarget)}'; document.getElementById('compareUserInput2').value = '${window.escapeHTML(s.author)}'; window.renderCompare();">Compare Matrix</button></td>
        </tr>`
    }).join('');

    let nextBtn = endIndex < window.similarityResults.length ? `<div style="text-align:center; margin-top:15px; width:100%;"><button class="btn btn-secondary" onclick="window.similarityCurrentPage++; window.renderClonePage();">Load Next 20 &darr;</button></div>` : "";

    resultsContainer.innerHTML = `
        <div class="comment-card" style="display:block; width:100%; box-sizing:border-box;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h3 style="margin-top:0;">Top 20 Suspected Sock Puppets for u/${window.escapeHTML(window.similarityTarget)}</h3>
                <button class="btn btn-primary btn-compact" onclick="window.exportSelectedClones()">💾 Export Selected to Locker</button>
            </div>
            <div class="table-container" style="margin-top: 15px; width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; display:block;">
                <table style="width:100%; min-width: 800px; border-collapse:collapse;">
                    <thead><tr><th onclick="window.toggleAllClones()" style="cursor:pointer;" title="Select/Deselect All on Page">Rank (✓)</th><th>Username</th><th>Total Confidence</th><th>Factor Breakdown</th><th>Sample Size</th><th>Actions</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan=\"6\" style=\"text-align:center; padding: 20px;\">Not enough data.</td></tr>'}</tbody>
                </table>
            </div>
            ${nextBtn}
        </div>`;
};

// [34] renderCompare()
// Purpose: Dedicated Sock Puppet Compare Engine (Astroturf Expanded) for Phase D Attribution.
window.renderCompare = function() {
    const tabOverlay = document.getElementById('tabLoadingOverlay');
    if (tabOverlay) tabOverlay.style.display = 'none';

    const container = document.getElementById('compare-container');
    if (!container) return;

    // Build Initial Input UI + Collapsible Analyst Instructions
    if (!document.getElementById('compareUserInput1')) {
        container.innerHTML = `
            <div class="comment-card" style="display:block; width:100%; box-sizing:border-box;">
                <h3 style="margin-top:0; display:flex; justify-content:space-between; align-items:center;">
                    Sock Puppet Comparison Matrix
                    <button class="btn btn-secondary btn-compact" style="font-size: 0.75rem;" onclick="const inst = document.getElementById('compareInstructions'); inst.style.display = inst.style.display === 'none' ? 'block' : 'none';">Toggle Analyst Guide</button>
                </h3>
                
                <div id="compareInstructions" style="display:none; background: rgba(30,30,32,0.8); padding: 12px; border-radius: 8px; margin-top: 10px; border: 1px solid var(--primary);">
                    <h4 style="color:var(--primary); margin:0 0 5px 0; font-size:0.9rem;">Analyst Detection Guide</h4>
                    <ul style="padding-left: 20px; font-size:0.85rem; color:var(--text-main); margin-bottom:0; line-height: 1.4;">
                        <li style="margin-bottom: 6px;"><b>Temporal Zoom Slider:</b> Use the zoom slider below the heatmaps to scale the lockstep timeline. Zoom OUT to spot macro-trends (e.g. multi-month deployment gaps). Zoom IN to see granular daily hand-offs between operators.</li>
                        <li style="margin-bottom: 6px;"><b>Astroturf Topology (Subreddits & Threads):</b> If two accounts share >3 obscure subreddits, or interact in the <b>exact same threads</b>, they are highly likely to be operated by the same actor (vote manipulation).</li>
                        <li style="margin-bottom: 6px;"><b>Sleep Cycle Alignment:</b> Look at the UTC Activity Histogram. If two accounts share the same daily 6-8 hour 'dead zone', they operate in the same timezone.</li>
                        <li style="margin-bottom: 6px;"><b>Stylometric Baseline:</b> Compare the Metric benchmarks. It is very difficult for a human to constantly fake their 'Lexical Richness' (vocabulary size) or default punctuation habits across different aliases.</li>
                    </ul>
                </div>

                <div style="display:flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                    <input type="text" id="compareUserInput1" placeholder="Primary User..." style="flex:1; min-width: 150px; background: rgba(0,0,0,0.5);">
                    <input type="text" id="compareUserInput2" placeholder="Suspect User..." style="flex:1; min-width: 150px; background: rgba(0,0,0,0.5);">
                    <button class="btn btn-primary" onclick="window.renderCompare()">Compare Targets</button>
                </div>
            </div>
            
            <div id="compareGraphOutput" style="width:100%; display:block; box-sizing:border-box; --cell-size: 14px;"></div>
        `;
        return;
    }

    const u1 = document.getElementById('compareUserInput1').value.trim().replace(/^u\//i, '');
    const u2 = document.getElementById('compareUserInput2').value.trim().replace(/^u\//i, '');
    const out = document.getElementById('compareGraphOutput');

    if (!u1 || !u2) { out.innerHTML = `<p style="color:var(--warning); text-align:center;">Please enter two usernames to compare.</p>`; return; }
    
    out.innerHTML = `
        <div class="comment-card" style="text-align:center; padding: 20px;">
            <p id="compareProgressText" style="color:var(--text-muted);">Extracting and aligning user footprints...</p>
            <div style="height:4px; background:var(--bg-dark); width:100%; border-radius:2px; margin-top:10px; overflow:hidden;">
                <div id="compareProgressBar" style="height:100%; width:5%; background:var(--primary); transition: width 0.1s;"></div>
            </div>
        </div>`;

    const dataRef = typeof window.globalData !== 'undefined' ? window.globalData : [];
    let u1Items = [];
    let u2Items = [];

    // Memory-safe extraction
    window.executeChunkedRender(dataRef, (i) => {
        if (i.author === u1) u1Items.push(i);
        else if (i.author === u2) u2Items.push(i);
    }, () => {
        if (u1Items.length === 0 && u2Items.length === 0) { out.innerHTML = `<p style="color:var(--danger); text-align:center;">Neither user found in database.</p>`; return; }

        let minTs = Infinity, maxTs = 0;
        [...u1Items, ...u2Items].forEach(i => {
            if (i.timestamp < minTs) minTs = i.timestamp;
            if (i.timestamp > maxTs) maxTs = i.timestamp;
        });

        const totalDays = Math.max(1, Math.ceil((maxTs - minTs) / 86400));
        const columns = Math.ceil(totalDays / 7);

        const u1DaySet = new Set();
        const u2DaySet = new Set();
        u1Items.forEach(i => u1DaySet.add(new Date(i.timestamp * 1000).setHours(0,0,0,0)));
        u2Items.forEach(i => u2DaySet.add(new Date(i.timestamp * 1000).setHours(0,0,0,0)));

        // Helper: Temporal Lockstep Map (Now leverages CSS Variables for zooming)
        function generateMiniHeatmap(items, name, thisUserSet, otherUserSet, scrollIndex) {
            const dayMap = new Map();
            items.forEach(i => {
                let ts = new Date(i.timestamp * 1000).setHours(0,0,0,0);
                dayMap.set(ts, (dayMap.get(ts) || 0) + 1);
            });

            let html = `<div style="margin-bottom: 10px; width:100%;"><h4 style="margin-bottom:8px; font-size: 0.95rem; color: var(--primary);">u/${window.escapeHTML(name)} <span style="color:var(--text-muted); font-weight:normal; font-size:0.8rem;">(${items.length} items)</span></h4>
                        <div class="heatmap-layout-wrapper sync-scroll-target" id="compare-scroll-${scrollIndex}" style="width:100%; overflow-x:auto;">
                            <div class="heatmap-grid" style="grid-template-columns: repeat(${columns}, var(--cell-size, 14px)); gap: 2px; min-width: max-content;">`;
            
            let tempTs = new Date(minTs * 1000).setHours(0,0,0,0);
            for (let i = 0; i < new Date(tempTs).getDay(); i++) html += `<div class="heatmap-cell" style="background:transparent; width:var(--cell-size); height:var(--cell-size);"></div>`;

            for (let i = 0; i < totalDays; i++) {
                const count = dayMap.get(tempTs) || 0;
                let cellClass = count > 0 ? "heatmap-cell compare-cell" : "heatmap-cell compare-cell";
                if (count === 0 && !otherUserSet.has(tempTs)) cellClass += " gap-alert"; 
                
                const dateStr = `${new Date(tempTs).getFullYear()}-${String(new Date(tempTs).getMonth()+1).padStart(2,'0')}-${String(new Date(tempTs).getDate()).padStart(2,'0')}`;
                html += `<div class="${cellClass}" style="width:var(--cell-size); height:var(--cell-size);" data-date="${dateStr}" data-user="${window.escapeHTML(name)}" data-level="${count>0?4:0}"></div>`;
                tempTs += 86400000;
            }
            html += `</div></div></div>`;
            return html; 
        }

        // Helper: Calculate Analytics (Stylometry + Sleep Cycles)
        function getAdvancedMetrics(items) {
            let m = { lex:0, wordLen:0, punct:0, caps:0, hrs: Array(24).fill(0) };
            if(items.length === 0) return m;
            items.forEach(i => {
                if(i.forensics) {
                    m.lex += parseFloat(i.forensics.lexicalRichness || 0);
                    m.wordLen += parseFloat(i.forensics.avgWordLength || 0);
                    m.punct += parseFloat(i.forensics.punctuationRatio || 0);
                    m.caps += parseFloat(i.forensics.capsRatio || 0);
                    const hr = i.forensics.utcHour !== undefined ? i.forensics.utcHour : new Date(i.timestamp * 1000).getUTCHours();
                    m.hrs[hr] = (m.hrs[hr] || 0) + 1;
                } else {
                    const hr = new Date(i.timestamp * 1000).getUTCHours();
                    m.hrs[hr] = (m.hrs[hr] || 0) + 1;
                }
            });
            m.lex = (m.lex / items.length).toFixed(3);
            m.wordLen = (m.wordLen / items.length).toFixed(2);
            m.punct = (m.punct / items.length).toFixed(3);
            m.caps = (m.caps / items.length).toFixed(3);
            return m;
        }

        setTimeout(() => {
            const m1 = getAdvancedMetrics(u1Items);
            const m2 = getAdvancedMetrics(u2Items);

            // [ASTROTURF & SOCK PUPPET CALCULATIONS]
            const u1Subs = new Set(), u2Subs = new Set();
            const u1Threads = new Set(), u2Threads = new Set();
            const u1Devices = new Set(), u2Devices = new Set();
            
            u1Items.forEach(i => { 
                if(i.subreddit && i.subreddit !== "unknown") u1Subs.add(i.subreddit); 
                if(i.link_id) u1Threads.add(i.link_id); 
                if(i.forensics?.deviceLeaks) i.forensics.deviceLeaks.forEach(d=>u1Devices.add(d)); 
            });
            
            u2Items.forEach(i => { 
                if(i.subreddit && i.subreddit !== "unknown") u2Subs.add(i.subreddit); 
                if(i.link_id) u2Threads.add(i.link_id); 
                if(i.forensics?.deviceLeaks) i.forensics.deviceLeaks.forEach(d=>u2Devices.add(d)); 
            });

            const sharedSubs = [...u1Subs].filter(x => u2Subs.has(x));
            const sharedThreads = [...u1Threads].filter(x => u2Threads.has(x));
            const sharedDevices = [...u1Devices].filter(x => u2Devices.has(x));

            // Generate Astroturf UI Block
            let astroturfHtml = `<div style="margin-top: 15px; padding: 15px; background: rgba(255, 214, 10, 0.05); border: 1px solid rgba(255, 214, 10, 0.3); border-radius: 8px;">
                <h4 style="margin:0 0 10px 0; font-size:0.95rem; color:var(--warning);">Astroturfing & Network Overlap</h4>`;
            
            if (sharedThreads.length > 0) {
                astroturfHtml += `<div style="margin-bottom: 10px;">
                    <b style="color:var(--danger); display:block; font-size:0.9rem;">⚠️ Thread Co-Inhabitation Detected (${sharedThreads.length} shared)</b>
                    <span style="font-size:0.8rem; color:var(--text-muted);">Accounts posting in the exact same threads indicates high likelihood of artificial narrative control.</span>
                    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:5px;">
                        ${sharedThreads.slice(0, 5).map(t => `<span class="btn-nav" style="border-color:var(--danger); color:var(--danger);" onclick="if(typeof triggerSearch==='function') triggerSearch('thread:${t}')">Isolate: ${t}</span>`).join('')}
                        ${sharedThreads.length > 5 ? `<span style="font-size:0.8rem; color:var(--text-muted); align-self:center;">+${sharedThreads.length - 5} more</span>` : ''}
                    </div>
                </div>`;
            } else {
                astroturfHtml += `<div style="margin-bottom: 10px; font-size:0.85rem; color:var(--success);">No shared threads detected.</div>`;
            }

            if (sharedSubs.length > 0) {
                astroturfHtml += `<div style="margin-bottom: 10px;">
                    <b style="color:var(--text-main); display:block; font-size:0.85rem;">Shared Subreddits (${sharedSubs.length}):</b>
                    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:5px;">
                        ${sharedSubs.map(s => `<span class="btn-nav" onclick="if(typeof triggerSubSearch==='function') triggerSubSearch('${s}')">r/${s}</span>`).join('')}
                    </div>
                </div>`;
            }

            if (sharedDevices.length > 0) {
                astroturfHtml += `<div style="font-size:0.85rem; color:var(--primary);"><b>Shared Hardware Signature:</b> ${sharedDevices.join(', ')}</div>`;
            }
            
            astroturfHtml += `</div>`;


            // Build Mobile-Friendly Sleep Cycle Histograms
            const maxHr1 = Math.max(...m1.hrs, 1);
            const maxHr2 = Math.max(...m2.hrs, 1);
            
            let sleepCycleHtml = `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
                <h4 style="margin:0; font-size:0.95rem; color:var(--text-main);">UTC Activity Distribution (Sleep Cycles)</h4>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom: 5px;">Synchronized dead zones generally imply the same timezone or human operator.</p>
                
                <div style="display:flex; height: 40px; align-items:flex-end; gap:2px; width:100%; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:2px; position:relative;">
                    <div style="position:absolute; top:-15px; left:0; font-size:0.7rem; color:var(--primary); font-weight:bold;">u/${window.escapeHTML(u1)}</div>
                    ${m1.hrs.map((h, idx) => `<div style="flex:1; background:var(--primary); height:${(h/maxHr1)*100}%; border-radius:2px 2px 0 0;" title="Hour ${idx} UTC: ${h} items"></div>`).join('')}
                </div>
                
                <div style="display:flex; height: 40px; align-items:flex-end; gap:2px; width:100%; position:relative;">
                    <div style="position:absolute; top:-15px; left:0; font-size:0.7rem; color:var(--warning); font-weight:bold;">u/${window.escapeHTML(u2)}</div>
                    ${m2.hrs.map((h, idx) => `<div style="flex:1; background:var(--warning); height:${(h/maxHr2)*100}%; border-radius:2px 2px 0 0;" title="Hour ${idx} UTC: ${h} items"></div>`).join('')}
                </div>
                
                <div style="display:flex; width:100%; justify-content:space-between; font-size:0.6rem; color:var(--text-muted); margin-top:2px;">
                    <span>0:00 UTC</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                </div>
            </div>`;

            // Build Stylometric Benchmark Table w/ Math Thresholds
            const diffLex = Math.abs(m1.lex - m2.lex);
            const diffWord = Math.abs(m1.wordLen - m2.wordLen);
            const diffPunct = Math.abs(m1.punct - m2.punct);
            const diffCaps = Math.abs(m1.caps - m2.caps);

            const analyzeMatch = (diff, tightThreshold, looseThreshold) => {
                if (diff <= tightThreshold) return '<span style="color:var(--success); font-weight:bold;">✅ Match</span>';
                if (diff <= looseThreshold) return '<span style="color:var(--warning); font-weight:bold;">🟡 Plausible</span>';
                return '<span style="color:var(--danger); font-weight:bold;">❌ Unlikely</span>';
            };

            let stylometryHtml = `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border);">
                <h4 style="margin:0 0 10px 0; font-size:0.95rem; color:var(--text-main);">Stylometric Fingerprint Baseline</h4>
                <div class="table-container" style="overflow-x:auto;">
                    <table style="width:100%; font-size:0.85rem; text-align:left;">
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th style="color:var(--primary);">u/${window.escapeHTML(u1)}</th>
                                <th style="color:var(--warning);">u/${window.escapeHTML(u2)}</th>
                                <th>Intel Assessment</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Lexical Richness</td><td>${m1.lex}</td><td>${m2.lex}</td><td>${analyzeMatch(diffLex, 0.08, 0.15)}</td></tr>
                            <tr><td>Avg Word Length</td><td>${m1.wordLen}</td><td>${m2.wordLen}</td><td>${analyzeMatch(diffWord, 0.3, 0.6)}</td></tr>
                            <tr><td>Punctuation Ratio</td><td>${m1.punct}</td><td>${m2.punct}</td><td>${analyzeMatch(diffPunct, 0.04, 0.08)}</td></tr>
                            <tr><td>Caps Ratio</td><td>${m1.caps}</td><td>${m2.caps}</td><td>${analyzeMatch(diffCaps, 0.05, 0.10)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>`;

            // Build Range Slider for CSS Variable Inject
            const zoomSliderHtml = `
                <div style="margin: 15px 0 5px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border); display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <label style="font-size:0.85rem; color:var(--text-muted); font-weight:bold; white-space:nowrap;">🔍 Heatmap Zoom:</label>
                    <input type="range" min="4" max="30" value="14" style="flex:1; min-width: 150px;" oninput="document.getElementById('compareGraphOutput').style.setProperty('--cell-size', this.value + 'px');">
                </div>
            `;

            out.innerHTML = `
                <div class="comment-card" style="margin-top:15px; display:block; width:100%;">
                    
                    <div style="width: 100%; overflow-x: hidden; display: block; padding-bottom: 10px;">
                        <h4 style="margin:0 0 10px 0; font-size:0.95rem; color:var(--text-main);">Temporal Lockstep Comparison</h4>
                        ${generateMiniHeatmap(u1Items, u1, u1DaySet, u2DaySet, 1)}
                        
                        <div style="display:flex; align-items:center; justify-content:center; position:relative; margin: -5px 0;">
                            <hr style="border-color:var(--border); width:100%; position:absolute; z-index:0;">
                            <button id="syncScrollBtn" class="sync-link-btn" title="Toggle Lockstep Sync">🔗</button>
                        </div>
                        
                        ${generateMiniHeatmap(u2Items, u2, u2DaySet, u1DaySet, 2)}
                        ${zoomSliderHtml}
                    </div>

                    ${astroturfHtml}
                    ${sleepCycleHtml}
                    ${stylometryHtml}

                </div>`;
                
            // Bind the Lockstep Sync Scroll and Interactive Tooltips
            setTimeout(() => {
                const s1 = document.getElementById('compare-scroll-1');
                const s2 = document.getElementById('compare-scroll-2');
                const syncBtn = document.getElementById('syncScrollBtn');
                let isSynced = false;
                let isHovering1 = false;
                let isHovering2 = false;
    
                if (syncBtn && s1 && s2) {
                    syncBtn.onclick = () => {
                        isSynced = !isSynced;
                        syncBtn.classList.toggle('active', isSynced);
                        if (isSynced) s2.scrollLeft = s1.scrollLeft;
                    };
    
                    s1.onmouseenter = () => isHovering1 = true;
                    s1.onmouseleave = () => isHovering1 = false;
                    s2.onmouseenter = () => isHovering2 = true;
                    s2.onmouseleave = () => isHovering2 = false;
                    
                    s1.ontouchstart = () => isHovering1 = true;
                    s2.ontouchstart = () => isHovering2 = true;
    
                    s1.onscroll = () => { if (isSynced && isHovering1) s2.scrollLeft = s1.scrollLeft; };
                    s2.onscroll = () => { if (isSynced && isHovering2) s1.scrollLeft = s2.scrollLeft; };
                }
    
                // Implement Long-Press capabilities for timeline extraction
                const cells = out.querySelectorAll('.compare-cell[data-date]');
                cells.forEach(cell => {
                    let pressTimer;
                    cell.oncontextmenu = (e) => e.preventDefault();
                    
                    const startPress = () => {
                        cell.classList.add('active-touch');
                        pressTimer = setTimeout(() => {
                            if(cell.dataset.level !== "0" && cell.dataset.date) {
                                if(navigator.vibrate) navigator.vibrate(50);
                                
                                const targetDate = cell.dataset.date;
                                const targetUser = cell.dataset.user;
                                const vData = typeof viewData !== 'undefined' ? viewData : [];
                                
                                const items = vData.filter(i => {
                                    const d = new Date(i.timestamp * 1000);
                                    const itemDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                    return i.author === targetUser && itemDate === targetDate;
                                }).slice(0, 75);
                                
                                if (typeof window.showPreviewModal === 'function') {
                                    window.showPreviewModal(`Footprint: u/${targetUser} on ${targetDate}`, items);
                                }
                            }
                        }, 500);
                    };
                    
                    const cancelPress = () => { cell.classList.remove('active-touch'); clearTimeout(pressTimer); };
                    
                    cell.addEventListener('touchstart', startPress, {passive: true});
                    cell.addEventListener('touchend', cancelPress);
                    cell.addEventListener('mousedown', startPress);
                    cell.addEventListener('mouseup', cancelPress);
                    cell.addEventListener('mouseleave', cancelPress);
                    
                    // Simple tap shows a quick hover tooltip with the exact date/user
                    cell.addEventListener('click', (e) => {
                        let tooltip = document.getElementById('temporalTooltip');
                        if (!tooltip) {
                            tooltip = document.createElement('div');
                            tooltip.id = 'temporalTooltip';
                            tooltip.className = 'temporal-tooltip';
                            document.body.appendChild(tooltip);
                        }
                        tooltip.innerHTML = `<span class="tt-date">${cell.dataset.date}</span><span class="tt-sub">u/${cell.dataset.user}</span>`;
                        tooltip.style.left = e.pageX + 'px';
                        tooltip.style.top = (e.pageY - 40) + 'px';
                        tooltip.classList.add('visible');
                        setTimeout(() => tooltip.classList.remove('visible'), 2000);
                    });
                });
            }, 100);
        }, 50);

    }, "Extracting Comparison Matrices");
};

// [36B] viewInteractions()
// Purpose: Network Graph helper to map 1:1 interactions.
window.viewInteractions = function(targetUser) {
    if (typeof window.currentInteractionTarget !== 'undefined') window.currentInteractionTarget = targetUser; 
    const tbody = document.getElementById('interactionsTableBody');
    if(tbody) tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Calculating co-participants...</td></tr>"; 
    
    if(document.getElementById('usersListContainer')) document.getElementById('usersListContainer').style.display = "none"; 
    if(document.getElementById('interactionsContainer')) document.getElementById('interactionsContainer').style.display = "block"; 
    if(document.getElementById('interactionsTitle')) document.getElementById('interactionsTitle').innerText = `Network for u/${targetUser}`;
    
    const dataRef = typeof window.globalData !== 'undefined' ? window.globalData : [];
    const targetThreads = new Set(); 
    
    window.executeChunkedRender(dataRef, (item) => {
        if (item.author === targetUser) targetThreads.add(item.link_id); 
    }, () => {
        const coParticipants = {}; 
        window.executeChunkedRender(dataRef, (item) => {
            if (item.author !== targetUser && targetThreads.has(item.link_id)) coParticipants[item.author] = (coParticipants[item.author] || 0) + 1; 
        }, () => {
            delete coParticipants['[deleted]']; delete coParticipants['AutoModerator'];
            const sortedCoParticipants = Object.entries(coParticipants).sort((a, b) => b[1] - a[1]).slice(0, 500);
            const fragment = document.createDocumentFragment();
            sortedCoParticipants.forEach(([author, count]) => { 
                const tr = document.createElement('tr'); 
                tr.innerHTML = `<td style="white-space:nowrap;">u/${window.escapeHTML(author)}</td><td style="white-space:nowrap;">${count.toLocaleString()}</td><td style="white-space:nowrap;"><button class="btn btn-secondary btn-compact" onclick="if(typeof triggerSearch === 'function') triggerSearch('${window.escapeHTML(author)}')">View Posts</button></td>`; 
                fragment.appendChild(tr); 
            });
            if(tbody) { tbody.innerHTML = ""; tbody.appendChild(fragment); }
        }, "Mapping Intersecting Edges");
    }, "Mapping Target Nodes");
};

// [35] runForensicInference()
// Purpose: Topological Intelligence Routing. Calculates shared vectors and geographic overlaps across isolated graph lobes.
window.runForensicInference = function() {
    if (!window.networkNodes || window.networkNodes.length === 0) return alert("Graph is empty. Please render topology first.");
    
    const btn = document.getElementById('forensicInferenceBtn');
    const ogText = btn ? btn.innerText : "Analyze";
    if(btn) btn.innerText = "⚙ Processing...";
    
    setTimeout(() => {
        const dataRef = typeof window.globalData !== 'undefined' ? window.globalData : [];
        const nodes = window.networkNodes.get();
        const analysisGroups = [];

        if (window.osintSystem.multiSelect.size > 0) {
            analysisGroups.push({
                name: "Manual User Selection",
                authors: new Set(window.osintSystem.multiSelect)
            });
        } else {
            const clusters = new Map();
            nodes.forEach(n => {
                const parts = n.label.split('\n');
                const sub = parts.length > 1 ? parts[1].replace('r/', '') : 'unknown';
                if (!clusters.has(sub)) clusters.set(sub, new Set());
                clusters.get(sub).add(n.id);
            });
            
            Array.from(clusters.entries())
                .filter(c => c[0] !== 'unknown')
                .sort((a,b) => b[1].size - a[1].size)
                .slice(0, 3) 
                .forEach(c => {
                    analysisGroups.push({ name: `Lobe: r/${c[0]}`, authors: c[1] });
                });
        }

        if (analysisGroups.length === 0) {
            if(btn) btn.innerText = ogText;
            return alert("No coherent clusters found to analyze.");
        }

        const results = [];
        
        analysisGroups.forEach(group => {
            const stats = { subreddits: new Map(), locations: new Map(), keywords: new Map(), count: 0 };
            let sampleLimit = 2000;
            let itemsSampled = 0;

            for (let i = 0; i < dataRef.length; i++) {
                const item = dataRef[i];
                if (group.authors.has(item.author)) {
                    stats.count++;
                    const definingSub = group.name.replace('Lobe: r/', '');
                    if (item.subreddit && item.subreddit !== 'unknown' && item.subreddit !== definingSub) {
                        stats.subreddits.set(item.subreddit, (stats.subreddits.get(item.subreddit) || 0) + 1);
                    }
                    if (item.forensics) {
                        (item.forensics.locations || []).forEach(loc => stats.locations.set(loc, (stats.locations.get(loc) || 0) + 1));
                        (item.forensics.threatKeywords || []).forEach(k => stats.keywords.set(k, (stats.keywords.get(k) || 0) + 1));
                        (item.forensics.personaClaims || []).forEach(k => stats.keywords.set(k, (stats.keywords.get(k) || 0) + 1));
                    }
                    itemsSampled++;
                    if (itemsSampled >= sampleLimit) break;
                }
            }

            const getTop = (map, limit=3) => Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0, limit);
            
            const topSubs = getTop(stats.subreddits, 4);
            const topLocs = getTop(stats.locations, 3);
            const topKeys = getTop(stats.keywords, 4);

            let persona = "General Interest Audience";
            const subStr = topSubs.map(s=>s[0]).join(' ').toLowerCase();
            const keyStr = topKeys.map(k=>k[0]).join(' ').toLowerCase();
            
            if (subStr.includes('onlyfans') || subStr.includes('creator') || subStr.includes('camgirl') || keyStr.includes('my job')) persona = "Peer / Content Creator Network";
            else if (subStr.includes('sugar') || subStr.includes('meet') || subStr.includes('r4r') || subStr.includes('hookup') || subStr.includes('client')) persona = "Client / Buyer Network";
            else if (topLocs.length > 0) persona = "Geographic / Localized Hub";

            results.push({ name: group.name, size: group.authors.size, persona, topSubs, topLocs, topKeys });
        });

        let html = `<div style="padding:10px;">
            <h3 style="margin-top:0; color:var(--primary); font-size:1.1rem;">Topological Intelligence</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">Calculated shared vectors and geographic overlaps across isolated graph lobes.</p>
        `;

        results.forEach((r, idx) => {
            const subStr = r.topSubs.length ? r.topSubs.map(s => `r/${window.escapeHTML(s[0])} <span style="opacity:0.5">(${s[1]})</span>`).join(', ') : 'No shared subs outside target';
            const locStr = r.topLocs.length ? r.topLocs.map(l => `${window.escapeHTML(l[0])}`).join(', ') : 'No shared locations';
            const keyStr = r.topKeys.length ? r.topKeys.map(k => `${window.escapeHTML(k[0])}`).join(', ') : 'No shared behavioral markers';

            html += `
                <div style="background:rgba(255,255,255,0.05); border-left:4px solid ${idx===0?'var(--primary)':'var(--warning)'}; padding:10px; margin-bottom:12px; border-radius:4px;">
                    <b style="color:var(--text-main); font-size:1rem;">${window.escapeHTML(r.name)}</b> <span style="font-size:0.8rem; color:var(--text-muted);">(${r.size} nodes mapped)</span><br>
                    <span style="font-size:0.85rem; color:var(--success); font-weight:bold; margin-top:4px; display:block;">Inferred Persona: ${r.persona}</span>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:8px; line-height:1.5;">
                        <b>Co-occurring Subs:</b><br> ${subStr}<br>
                        <b style="margin-top:4px; display:inline-block;">Geographic Overlaps:</b><br> ${locStr}<br>
                        <b style="margin-top:4px; display:inline-block;">Shared Lexicon:</b><br> ${keyStr}
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        let analModal = document.getElementById('analModalOverlay');
        if (!analModal) {
            analModal = document.createElement('div');
            analModal.id = 'analModalOverlay';
            analModal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999; background:rgba(0,0,0,0.7); justify-content:center; align-items:center;";
            analModal.innerHTML = `
                <div class="glass-panel" style="width: 90%; max-width: 500px; max-height: 80vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; background:var(--bg-main); border:1px solid var(--border);">
                    <div style="padding: 15px; border-bottom: 1px solid var(--border); background: var(--bg-dark); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: var(--primary);">Cluster Analysis</h3>
                        <button onclick="document.getElementById('analModalOverlay').style.display='none'" class="btn btn-secondary btn-icon" style="min-width: 44px; min-height: 44px;">&times;</button>
                    </div>
                    <div id="analModalBody" style="padding: 15px; overflow-y: auto; flex: 1;"></div>
                </div>
            `;
            document.body.appendChild(analModal);
            analModal.addEventListener('click', (e) => {
                if (e.target === analModal) analModal.style.display = 'none';
            });
        }
        document.getElementById('analModalBody').innerHTML = html;
        analModal.style.display = 'flex';

        if(btn) btn.innerText = ogText;
    }, 50);
};

// [36] renderNetworkGraph() / refreshGraphNodes() / initGraphView()
// Purpose: Vis.js Topology initialization and rendering.
window.renderNetworkGraph = function(autoCluster = false) {
    if(document.getElementById('graphLoadingContainer')) document.getElementById('graphLoadingContainer').style.display = 'block'; 
    const vData = typeof window.viewData !== 'undefined' ? window.viewData : [];
    const dataRef = typeof window.globalData !== 'undefined' ? window.globalData : [];
    
    const relevantThreads = new Set(); 
    vData.forEach(item => relevantThreads.add(item.link_id));
    
    let authorCounts = {}; const threadParticipants = {}; const authorPrimarySub = new Map();
    
    window.executeChunkedRender(dataRef, (item) => {
        if (relevantThreads.has(item.link_id)) { 
            if (item.author === '[deleted]' || item.author === 'AutoModerator') return; 
            authorCounts[item.author] = (authorCounts[item.author] || 0) + 1; 
            if (!threadParticipants[item.link_id]) threadParticipants[item.link_id] = new Set(); 
            threadParticipants[item.link_id].add(item.author); 
            
            if (item.subreddit) {
                if (!authorPrimarySub.has(item.author)) authorPrimarySub.set(item.author, new Map());
                const subMap = authorPrimarySub.get(item.author);
                subMap.set(item.subreddit, (subMap.get(item.subreddit) || 0) + 1);
            }
        } 
    }, () => {
        const nodeLimit = 60; 
        let sortedAuthors = Object.entries(authorCounts).sort((a,b) => b[1] - a[1]).slice(0, nodeLimit); 
        const topAuthorsList = sortedAuthors.map(e => e[0]); 
        const topAuthorsSet = new Set(topAuthorsList); 
        const nodesMap = new Map();
        
        const subColors = ['#32d74b', '#0a84ff', '#ff453a', '#ffd60a', '#ff9f0a', '#bf5af2', '#ff375f'];
        const subColorMap = new Map(); let colorIdx = 0;

        topAuthorsList.forEach((author) => { 
            let primarySub = "unknown";
            let borderColor = "#111"; 
            let borderWidth = 1;
            let nodeColor = null;

            if (authorPrimarySub.has(author)) {
                const subs = Array.from(authorPrimarySub.get(author).entries()).sort((a,b) => b[1] - a[1]);
                if (subs.length > 0) {
                    primarySub = subs[0][0];
                    if (!subColorMap.has(primarySub)) {
                        subColorMap.set(primarySub, subColors[colorIdx % subColors.length]);
                        colorIdx++;
                    }
                    if (window.graphSubredditOverlay) {
                        borderColor = subColorMap.get(primarySub);
                        nodeColor = { background: borderColor, border: borderColor };
                        borderWidth = 1;
                        
                        if(window.osintSystem.multiSelect.has(author)) {
                            borderWidth = 4;
                            nodeColor.border = '#fff';
                        }
                    } else if (window.osintSystem.multiSelect.has(author)) {
                        borderWidth = 4;
                        borderColor = '#fff';
                    }
                }
            }

            let finalColor = nodeColor ? nodeColor : { border: borderColor };
            nodesMap.set(author, { 
                id: author, 
                label: `u/${author}\nr/${primarySub}`, 
                value: authorCounts[author], 
                title: `u/${author}<br>Primary Group: r/${primarySub}`, 
                color: finalColor, 
                borderWidth: borderWidth,
                originalBorderWidth: 1,
                originalBorderColor: window.graphSubredditOverlay ? subColorMap.get(primarySub) : '#111'
            }); 
        });

        const container = document.getElementById('networkMap');
        let existingLegend = document.getElementById('graphSubredditLegend');
        if (existingLegend) existingLegend.remove();
        
        if (window.graphSubredditOverlay && subColorMap.size > 0) {
            let legendHtml = '<div id="graphSubredditLegend" style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.85); padding:12px; border-radius:8px; border:1px solid var(--border); z-index:10; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5); pointer-events: none;">';
            legendHtml += '<b style="color:var(--text-main); font-size:0.85rem; display:block; margin-bottom:8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">Subreddit Key</b>';
            subColorMap.forEach((color, sub) => {
                legendHtml += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);"><div style="width:14px; height:14px; border-radius:50%; background:${color};"></div> r/${window.escapeHTML(sub)}</div>`;
            });
            legendHtml += '</div>';
            
            if(container && container.parentElement) {
                container.parentElement.style.position = 'relative';
                container.parentElement.insertAdjacentHTML('beforeend', legendHtml);
            }
        }

        const participantsArray = Object.values(threadParticipants);
        const edgesMap = new Map();
        const edgeThreshold = window.graphSubredditOverlay ? 1 : 1;
        
        let pIdx = 0;
        function processEdgesChunk() {
            if (window.cancelReconstructFlag) {
                if(document.getElementById('graphLoadingContainer')) document.getElementById('graphLoadingContainer').style.display = 'none';
                return;
            }
            const startTime = performance.now();
            while (pIdx < participantsArray.length && (performance.now() - startTime) < 20) {
                const validParticipants = Array.from(participantsArray[pIdx]).filter(p => topAuthorsSet.has(p));
                for(let i = 0; i < validParticipants.length; i++) { 
                    for(let j = i + 1; j < validParticipants.length; j++) { 
                        const id1 = validParticipants[i], id2 = validParticipants[j]; 
                        const edgeKey = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`; 
                        edgesMap.set(edgeKey, (edgesMap.get(edgeKey) || 0) + 1); 
                    } 
                }
                pIdx++;
            }
            if (pIdx < participantsArray.length) setTimeout(processEdgesChunk, 5); 
            else finalizeGraphNetwork();
        }

        function finalizeGraphNetwork() {
            const filteredEdges = Array.from(edgesMap.entries()).filter(([key, weight]) => weight >= edgeThreshold).map(([key, weight]) => { 
                const [from, to] = key.split('-'); return { id: key, from: from, to: to, value: weight, title: `${weight} shared threads` }; 
            });

            const connectedNodes = new Set();
            filteredEdges.forEach(e => { connectedNodes.add(e.from); connectedNodes.add(e.to); });
            
            let finalNodes = Array.from(nodesMap.values());
            if (autoCluster) {
                finalNodes = finalNodes.filter(n => connectedNodes.has(n.id) || n.id === window.similarityTarget);
            }

            window.networkNodes = new vis.DataSet(finalNodes); 
            window.networkEdges = new vis.DataSet(filteredEdges);
            
            const options = { 
                nodes: { shape: 'dot', scaling: { min: 5, max: 30 }, font: { color: '#f8fafc', size: 12, multi: 'html' } }, 
                edges: { color: { color: '#334155', highlight: '#d1d1d6' }, scaling: { min: 1, max: 8 }, smooth: false }, 
                physics: { 
                    barnesHut: { 
                        gravitationalConstant: autoCluster ? -5000 : -3000, 
                        centralGravity: autoCluster ? 0.6 : 0.3, 
                        springLength: autoCluster ? 100 : 150, 
                        springConstant: 0.04 
                    }, 
                    stabilization: { iterations: 150 } 
                }, 
                interaction: { hover: true, tooltipDelay: 200 } 
            };

            if (window.networkGraph) window.networkGraph.destroy();
            window.networkGraph = new vis.Network(container, { nodes: window.networkNodes, edges: window.networkEdges }, options);
            
            window.networkGraph.on("stabilizationIterationsDone", function () { 
                window.networkGraph.setOptions({ physics: false }); 
                if(document.getElementById('graphLoadingContainer')) document.getElementById('graphLoadingContainer').style.display = 'none'; 
            });

            window.networkGraph.on("doubleClick", function (params) { 
                if (params.nodes.length > 0) { 
                    const clickedAuthor = params.nodes[0]; 
                    if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
                    
                    let nodeInfo = window.networkNodes.get(clickedAuthor);
                    
                    if (window.osintSystem.multiSelect.has(clickedAuthor)) {
                        window.osintSystem.multiSelect.delete(clickedAuthor);
                        window.networkNodes.update({ 
                            id: clickedAuthor, 
                            borderWidth: nodeInfo.originalBorderWidth || 1, 
                            color: { border: nodeInfo.originalBorderColor || '#111' } 
                        });
                    } else {
                        window.osintSystem.multiSelect.add(clickedAuthor);
                        window.networkNodes.update({ 
                            id: clickedAuthor, 
                            borderWidth: 4, 
                            color: { border: '#fff' } 
                        });
                        window.addToCollection({ id: `profile_${clickedAuthor}`, type: 'profile', value: clickedAuthor, timestamp: Date.now() / 1000 });
                    }
                } 
            });

            window.networkGraph.on("hold", function(params) {
                if (params.nodes.length > 0) { 
                    const clickedAuthor = params.nodes[0]; 
                    if(navigator.vibrate) navigator.vibrate(50);
                    if(typeof window.showMicroProfile === 'function') window.showMicroProfile(clickedAuthor);
                }
            });
        }
        setTimeout(processEdgesChunk, 5);
    }, "Parsing Raw Node Topology");
};

window.refreshGraphNodes = function() {
    if (window.networkGraph && document.getElementById('graphView').classList.contains('active')) window.renderNetworkGraph(false);
};

window.initGraphView = function() {
    const tabOverlay = document.getElementById('tabLoadingOverlay');
    if (tabOverlay) tabOverlay.style.display = 'none';

    const graphTab = document.getElementById('graphView');
    if (graphTab && !document.getElementById('graphControlsToggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'graphControlsToggle';
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.style.cssText = "width: 100%; margin-bottom: 10px; background: rgba(0,0,0,0.5); border: 1px solid var(--border);";
        toggleBtn.innerText = "🛠 Collapse Graph Tools";
        
        const mapContainer = document.getElementById('networkMap');
        const loadingContainer = document.getElementById('graphLoadingContainer');
        const legendContainer = document.getElementById('graphSubredditLegend');
        
        const controlsWrapper = document.createElement('div');
        controlsWrapper.id = 'graphControlsWrapper';
        controlsWrapper.style.cssText = "width: 100%; display: block; overflow: hidden;";
        
        Array.from(graphTab.children).forEach(child => {
            if (child !== mapContainer && child !== toggleBtn && child !== loadingContainer && child !== legendContainer) {
                controlsWrapper.appendChild(child);
            }
        });
        
        graphTab.insertBefore(toggleBtn, graphTab.firstChild);
        graphTab.insertBefore(controlsWrapper, mapContainer);
        
        toggleBtn.onclick = () => {
            if (controlsWrapper.style.display === 'none') {
                controlsWrapper.style.display = 'block';
                toggleBtn.innerText = "🛠 Collapse Graph Tools";
            } else {
                controlsWrapper.style.display = 'none';
                toggleBtn.innerText = "🛠 Expand Graph Tools";
            }
        };
    }

    if (!window.networkGraph || !window.networkNodes) window.renderNetworkGraph(false);
};