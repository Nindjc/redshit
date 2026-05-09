/* OSINT PLATFORM: ANCILLARY UTILITIES (utils.js) */
/* Purpose: Yield-based memory safe SQLite exports, formatting downloads, and UI math overrides. */

// [11] exportToSQLDump()
// Purpose: Memory safe, yield-based chunked SQLite generation. Prevents RAM crash on massive exports.
window.exportToSQLDump = function(dataArray, filename) {
    const statusEl = document.getElementById('status');
    if(statusEl) {
        statusEl.innerText = "Generating SQL Dump in memory chunks...";
        statusEl.style.color = "var(--warning)";
    }

    const blobParts = [];
    blobParts.push("BEGIN TRANSACTION;\n");
    blobParts.push("CREATE TABLE IF NOT EXISTS reddit_data (id TEXT PRIMARY KEY, author TEXT, subreddit TEXT, timestamp INTEGER, text TEXT, link_id TEXT, link_title TEXT, forensics JSON);\n");

    const chunkSize = 2500;
    let offset = 0;

    function processChunk() {
        const chunk = dataArray.slice(offset, offset + chunkSize);
        if (chunk.length === 0) {
            finalizeSQL();
            return;
        }

        let sqlStr = "";
        chunk.forEach(item => {
            const safeId = item.id.replace(/'/g, "''");
            const safeAuthor = item.author.replace(/'/g, "''");
            const safeSub = (item.subreddit || "").replace(/'/g, "''");
            const safeText = (item.text || "").replace(/'/g, "''");
            const safeLinkId = (item.link_id || "").replace(/'/g, "''");
            const safeTitle = (item.link_title || "").replace(/'/g, "''");
            const safeForensics = item.forensics ? JSON.stringify(item.forensics).replace(/'/g, "''") : "{}";
            
            sqlStr += `INSERT OR REPLACE INTO reddit_data (id, author, subreddit, timestamp, text, link_id, link_title, forensics) VALUES ('${safeId}', '${safeAuthor}', '${safeSub}', ${item.timestamp}, '${safeText}', '${safeLinkId}', '${safeTitle}', '${safeForensics}');\n`;
        });
        
        blobParts.push(sqlStr);
        offset += chunkSize;

        if (statusEl) statusEl.innerText = `Buffering SQL: ${Math.min(100, Math.round((offset / dataArray.length) * 100))}% complete...`;

        setTimeout(processChunk, 20); // Yield main thread to prevent ANR
    }

    function finalizeSQL() {
        blobParts.push("COMMIT;\n");
        const blob = new Blob(blobParts, { type: 'application/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if(statusEl) {
            statusEl.innerText = "SQL Dump exported successfully.";
            statusEl.style.color = "var(--success)";
        }
    }

    setTimeout(processChunk, 20);
};

// [11B] downloadJSON() / downloadCSV() / getContextualFilename()
// Purpose: Standard data serialization functions for locker and current table view exports.
window.downloadJSON = function(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

window.downloadCSV = function(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

window.getContextualFilename = function(base) {
    const startStr = window.currentStartTs && window.currentStartTs !== window.minGlobalTs ? "_" + new Date(window.currentStartTs * 1000).toISOString().split('T')[0] : "";
    const endStr = window.currentEndTs && window.currentEndTs !== window.maxGlobalTs ? "_" + new Date(window.currentEndTs * 1000).toISOString().split('T')[0] : "";
    const searchInput = document.getElementById('searchInput');
    const subSearchInput = document.getElementById('subSearchInput');
    const queryStr = searchInput && searchInput.value ? "_Q-" + searchInput.value.replace(/[^a-z0-9]/gi, '') : "";
    const subStr = subSearchInput && subSearchInput.value ? "_Sub-" + subSearchInput.value.replace(/[^a-z0-9]/gi, '') : "";
    return `${base}${queryStr}${subStr}${startStr}${endStr}.json`;
};

// [12] tsFromSlider() / updateDateLabels()
// Purpose: Overrides basic state.js slider boundaries, mapping 0-1000 integer range into exact Unix boundaries.
window.tsFromSlider = function(val) {
    let minTs = window.minGlobalTs;
    let maxTs = window.maxGlobalTs;
    
    // Guard against Infinity/NaN crashes during empty states or active streams
    if (minTs === Infinity || !minTs) minTs = (Date.now() / 1000) - (86400 * 30); // Default to last 30 days
    if (maxTs === 0 || !maxTs || maxTs === Infinity) maxTs = Date.now() / 1000;
    
    return minTs + ((val / 1000) * (maxTs - minTs));
};

window.updateDateLabels = function() {
    let minTs = window.minGlobalTs;
    let maxTs = window.maxGlobalTs;
    
    if (minTs === Infinity || !minTs) minTs = (Date.now() / 1000) - (86400 * 30); 
    if (maxTs === 0 || !maxTs || maxTs === Infinity) maxTs = Date.now() / 1000;
    
    const startSlider = document.getElementById('startSlider');
    const endSlider = document.getElementById('endSlider');
    const sVal = startSlider ? startSlider.value : 0;
    const eVal = endSlider ? endSlider.value : 1000;
    
    const sTs = minTs + ((sVal / 1000) * (maxTs - minTs));
    const eTs = minTs + ((eVal / 1000) * (maxTs - minTs));
    
    const sdLabel = document.getElementById('startDateLabel');
    const edLabel = document.getElementById('endDateLabel');
    
    if(sdLabel) sdLabel.innerText = new Date(sTs * 1000).toLocaleDateString();
    if(edLabel) edLabel.innerText = new Date(eTs * 1000).toLocaleDateString();
};


// [18B] Surgical Hotfix Injection Routine (Arctic Shift PCAP Alignment)
// Purpose: Ensures the UI/CSS fixes and API routing bypasses apply securely in memory post DOM-load.
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Forceful CSS Override for 'R' Compact Mode (Edge-to-Edge Single Line Density)
    const fixStyle = document.createElement('style');
    fixStyle.innerHTML = `
        body.compact-mode .comment-card {
            display: block !important;
            padding: 8px 12px !important;
            margin-bottom: 0 !important;
            border-radius: 0 !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
            width: 100%;
            min-height: auto !important;
            background: transparent !important;
        }
        /* Completely obliterate standard elements when in reading mode */
        body.compact-mode .comment-card > *:not(.compact-inline-header):not(.comment-body) {
            display: none !important;
        }
        body.compact-mode .compact-inline-header {
            display: flex !important;
            justify-content: space-between;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 4px;
        }
        body.compact-mode .comment-body {
            display: block !important;
            font-size: 0.9rem !important;
            line-height: 1.3 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            margin-top: 0 !important;
            cursor: pointer;
            color: var(--text-main) !important;
        }
        /* Tap to drop down */
        body.compact-mode .comment-body.expanded {
            white-space: pre-wrap !important;
            overflow: visible !important;
        }

        /* NEW HOTFIXES FOR UI BUGS */
        .sync-chain-link {
            position: absolute;
            width: 2px;
            background: rgba(255, 255, 255, 0.2);
            z-index: 10;
            left: 50%;
            transform: translateX(-50%);
        }
    `;
    document.head.appendChild(fixStyle);

    // 2. Fix the "Get Thread" / Load Post API routing trap
    if (typeof window.loadRootPost !== 'undefined') {
        window.loadRootPost = function(linkId) {
            const rootId = String(linkId).replace('t3_', '');
            // DIRECT ROUTING: Bypass the local memory search trap and fetch directly from Posts
            if (typeof window.fetchApiContext === 'function') {
                window.fetchApiContext('posts', rootId);
            }
        };
    }

    // 3. Patch the id: search parameter to properly infer Posts vs Comments
    if (typeof window.executeSearch !== 'undefined') {
        const ogSearch = window.executeSearch;
        window.executeSearch = function(pushHistory = true) {
            const searchInput = document.getElementById('searchInput');
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            
            if (query.startsWith("id:")) {
                const targetId = query.substring(3).trim();
                filteredData = globalData.filter(item => String(item.id) === targetId);
                
                if(filteredData.length === 0 && typeof window.fetchApiContext === 'function') {
                    // Intelligent routing: If it's exactly 7 base36 characters and starts with '1', it is mathematically 99.9% a Post ID on Reddit.
                    const inferredType = (targetId.length === 7 && targetId.startsWith('1')) ? 'posts' : 'comments';
                    window.fetchApiContext(inferredType, targetId);
                }
                
                if(typeof updateViewData === 'function') updateViewData();
                return; // Stop execution to prevent fallback routing bugs
            }
            
            // Allow all other normal searches to proceed unharmed
            ogSearch(pushHistory);
        };
    }

    // 4. Physical Array Chronological Sort Logic (Memory Friendly)
    const compactBtn = document.getElementById('compactToggleBtn');
    const sortBtn = document.getElementById('sortToggleBtn');
    
    if (compactBtn && sortBtn) {
        compactBtn.addEventListener('click', () => {
            // Slight delay ensures the body class was added by its primary listener first
            setTimeout(() => {
                if (document.body.classList.contains('compact-mode')) {
                    sortBtn.style.display = 'inline-flex';
                } else {
                    sortBtn.style.display = 'none';
                    window.isChronological = false;
                    sortBtn.style.background = 'var(--secondary)';
                    sortBtn.style.color = 'var(--text-main)';
                    // Revert to original temporal descending sort
                    window.globalData.sort((a, b) => b.timestamp - a.timestamp);
                    if (typeof executeSearch === 'function') executeSearch(false);
                }
            }, 50);
        });
        
        sortBtn.addEventListener('click', () => {
            window.isChronological = !window.isChronological;
            sortBtn.style.background = window.isChronological ? 'var(--primary)' : 'var(--secondary)';
            sortBtn.style.color = window.isChronological ? '#000' : 'var(--text-main)';
            
            // Physically sort global data payload to ensure true top-to-bottom pagination loading
            window.globalData.sort((a, b) => window.isChronological ? (a.timestamp - b.timestamp) : (b.timestamp - a.timestamp));
            
            if (typeof executeSearch === 'function') executeSearch(false);

            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.innerText = window.isChronological ? "Chronological Sort Enabled: Oldest -> Newest." : "Standard Sort Restored: Newest -> Oldest.";
                statusEl.style.color = "var(--success)";
                setTimeout(() => { statusEl.style.color = "var(--text-main)"; }, 3000);
            }
        });
    }

    // 5. Chronological Text Export Binding
    const exportTextBtn = document.getElementById('exportToTextBtn');
    if (exportTextBtn) {
        exportTextBtn.addEventListener('click', () => {
            if (typeof window.globalData === 'undefined') return;
            const dataToExport = (typeof window.filteredData !== 'undefined' && window.filteredData.length > 0) 
                                 ? window.filteredData : window.globalData;
            
            // Sort Chronologically (Oldest -> Newest) as required for screen reader accessibility
            const sortedData = [...dataToExport].sort((a, b) => a.timestamp - b.timestamp);
            let textContent = "--- CHRONOLOGICAL EXPORT REPORT ---\n\n";
            
            sortedData.forEach(item => {
                const date = new Date(item.timestamp * 1000).toLocaleString();
                const text = item.text ? item.text.replace(/\n/g, '\n  ') : (item.link_title || "[No Text]");
                textContent += `[${date}] ${item.author}:\n  ${text}\n\n`;
            });
            
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = typeof window.getContextualFilename === 'function' 
                             ? window.getContextualFilename('export') : 'export.json';
            a.download = baseName.replace('.json', '.txt');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
});