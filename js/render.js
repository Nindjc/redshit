/* OSINT PLATFORM: HIGH-PERFORMANCE DOM RENDER ENGINE (render.js) */
/* Purpose: Primary DOM manipulator. Safely paints UI components (Cards, Timelines, Stylometry) without crashing the browser thread. */

// [19] executeChunkedRender()
// Purpose: Async UI loop to prevent Main Thread locking during massive DOM calculations.
// UI Area: Global rendering pipeline
window.executeChunkedRender = function(targetData, processItem, finalizeUI, statusText = "Processing") {
    const overlay = document.getElementById('tabLoadingOverlay');
    const pBar = document.getElementById('tabLoadingBar');
    const pStatus = document.getElementById('tabLoadingStatus');
    const titleEl = document.getElementById('tabLoadingTitle');

    if (overlay) overlay.style.display = 'flex';
    if (titleEl) titleEl.innerText = statusText;

    let i = 0;
    const total = targetData.length;

    if (total === 0) {
        try { finalizeUI(); } catch (e) {}
        if (overlay) overlay.style.display = 'none';
        return;
    }

    function nextChunk() {
        if (window.cancelReconstructFlag) {
            if (overlay) overlay.style.display = 'none';
            return;
        }

        const startTime = performance.now();
        
        try {
            while (i < total && (performance.now() - startTime) < 18) { 
                processItem(targetData[i]);
                i++; 
            }
        } catch (err) { i++; }

        if (pBar) pBar.style.width = `${Math.min(100, Math.round((i / total) * 100))}%`;
        if (pStatus) pStatus.innerText = `${statusText}... ${i.toLocaleString()} / ${total.toLocaleString()}`;

        if (i < total) setTimeout(nextChunk, 5);
        else {
            try { finalizeUI(); } catch (err) {}
            if (overlay) overlay.style.display = 'none';
        }
    }
    setTimeout(nextChunk, 5);
};

// [19B] escapeHTML() / sanitizeHTML()
// Purpose: Security sanitizers to prevent XSS payloads rendering from raw JSON imports.
window.escapeHTML = function(str) { 
    if (!str) return ""; 
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>'"\n]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '\n': '<br>' }[tag] || tag)); 
};

window.sanitizeHTML = function(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// [20] triggerSearch() / jumpToForensicTab()
// Purpose: Internal UI navigation routing and filter bridging.
window.triggerSearch = function(query) { 
    const sInput = document.getElementById('searchInput');
    const subInput = document.getElementById('subSearchInput');
    if(sInput) sInput.value = query; 
    if(subInput) subInput.value = ""; 
    const tab = document.querySelector('[data-target="commentsView"]');
    if(tab) tab.click(); 
    if(typeof window.executeSearch === 'function') window.executeSearch(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
};

window.triggerSubSearch = function(query) { 
    const subInput = document.getElementById('subSearchInput');
    if(subInput) subInput.value = query; 
    const tab = document.querySelector('[data-target="commentsView"]');
    if(tab) tab.click(); 
    if(typeof window.executeSearch === 'function') window.executeSearch(false); 
    if(typeof window.updateViewData === 'function') window.updateViewData(); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
};

window.jumpToForensicTab = function(tabId, author) {
    if(typeof triggerSearch === 'function') triggerSearch(author); 
    setTimeout(() => {
        const finalTabId = tabId === 'stylometryView' ? 'behavioralView' : tabId;
        const tabEl = document.querySelector(`[data-target="${finalTabId}"]`);
        if (tabEl) tabEl.click();
    }, 150); 
};

// [30B] Multi-Select Mass Locker Export Engine
// Purpose: Allows selection of multiple raw cards to export simultaneously to the Collection Tab.
window.selectedComments = window.selectedComments || new Set();

window.toggleCommentSelection = function(id) {
    if(window.selectedComments.has(id)) {
        window.selectedComments.delete(id);
    } else {
        window.selectedComments.add(id);
        const item = window.globalData.find(i => i.id === id);
        if(item) {
            window.selectedCommentData = window.selectedCommentData || new Map();
            window.selectedCommentData.set(id, item);
        }
    }
    window.updateMultiSelectBar();
};

window.updateMultiSelectBar = function() {
    let bar = document.getElementById('multiSelectBar');
    if(!bar) {
        bar = document.createElement('div');
        bar.id = 'multiSelectBar';
        bar.style.cssText = "display:none; position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:var(--primary); color:#000; padding:12px 24px; border-radius:30px; z-index:9999; font-weight:bold; box-shadow:0 10px 30px rgba(0,0,0,0.6); align-items:center; gap:12px; border: 2px solid rgba(255,255,255,0.2);";
        bar.innerHTML = `
            <span style="font-size: 1.1rem;"><span id="multiSelectCount">0</span> Selected</span> 
            <button onclick="window.exportSelectedComments()" class="btn btn-secondary btn-compact" style="background:#000; color:#fff; border:none; padding: 6px 12px; font-size:0.9rem;">💾 Save to Locker</button>
            <button onclick="window.clearSelectedComments()" class="btn btn-danger btn-compact" style="padding: 6px 12px; font-size:0.9rem;">Clear</button>
        `;
        document.body.appendChild(bar);
    }
    if(window.selectedComments.size > 0) {
        bar.style.display = 'flex';
        document.getElementById('multiSelectCount').innerText = window.selectedComments.size;
    } else {
        bar.style.display = 'none';
    }
};

window.exportSelectedComments = function() {
    if(!window.selectedComments || window.selectedComments.size === 0) return;
    let added = 0;
    window.selectedComments.forEach(id => {
        const item = window.selectedCommentData.get(id);
        if(item && typeof window.addToCollection === 'function') {
            window.addToCollection({ id: item.id, type: 'post', value: item.author, text: item.text, timestamp: item.timestamp });
            added++;
        }
    });
    alert(`Successfully exported ${added} tagged items to Persistent Locker.`);
    window.clearSelectedComments();
};

window.clearSelectedComments = function() {
    window.selectedComments.clear();
    if(window.selectedCommentData) window.selectedCommentData.clear();
    window.updateMultiSelectBar();
    document.querySelectorAll('.comment-select-cb').forEach(cb => cb.checked = false);
};

// [27] showMicroProfile() / showPreviewModal()
// Purpose: Generates contextual data overlays for quick pivoting without losing current view state.
window.showPreviewModal = function(title, items) {
    const overlay = document.getElementById('previewModalOverlay');
    const titleEl = document.getElementById('previewModalTitle');
    const bodyEl = document.getElementById('previewModalBody');
    if(!overlay) return;

    titleEl.innerText = title;
    let html = items.map(item => {
        const dateStr = new Date(item.timestamp * 1000).toLocaleString();
        return `<div class="comment-card" style="background: rgba(0,0,0,0.5); padding: 10px; margin-bottom: 8px; display:block; width:100%; box-sizing: border-box;">
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; font-size:0.8rem; color:var(--text-muted); margin-bottom:5px; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
                <span><strong class="clickable-author" style="color:var(--text-main); cursor:pointer;" onclick="document.getElementById('previewModalOverlay').style.display='none'; if(typeof triggerSearch === 'function') triggerSearch('${escapeHTML(item.author)}')">u/${escapeHTML(item.author)}</strong> | r/${escapeHTML(item.subreddit)}</span>
                <span>${dateStr}</span>
            </div>
            <div style="color:var(--text-main); font-size: 0.9rem; word-break: break-word; white-space: pre-wrap; display:block; width:100%;">${escapeHTML(item.text).replace(/<br>/g, '\n')}</div>
        </div>`;
    }).join('');

    bodyEl.innerHTML = html || "<p style='color:var(--text-muted);'>No data found.</p>";
    overlay.style.display = 'flex';
};

window.showMicroProfile = function(authorName) {
    const modal = document.getElementById('microProfileModal');
    if (!modal) return;
    modal.innerHTML = ""; 
    const dataRef = typeof globalData !== 'undefined' ? globalData : [];
    let targetItems = dataRef.filter(item => item.author === authorName).sort((a, b) => b.timestamp - a.timestamp);
    if (targetItems.length === 0) return;

    let htmlStr = `
        <div class="glass-panel" style="width: 100%; max-width: 800px; height: 100%; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; position: relative; margin: 0 auto; box-sizing: border-box;">
            <div style="padding: 15px; border-bottom: 1px solid var(--border); background: var(--bg-dark); display: flex; justify-content: space-between; align-items: center; z-index: 2; width: 100%; box-sizing: border-box;">
                <div style="flex: 1; min-width: 0;">
                    <h3 style="margin: 0; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">u/${escapeHTML(authorName)}</h3>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${targetItems.length} entries found.</span>
                </div>
                <button onclick="document.getElementById('microProfileModal').style.display='none'" class="btn btn-secondary btn-icon" style="min-width: 44px; min-height: 44px; margin-left: 10px;">&times;</button>
            </div>
            <div style="padding: 15px; overflow-y: auto; flex: 1; background: var(--bg-main); width: 100%; box-sizing: border-box; display: flex; flex-direction: column;" class="scroll-hide">
    `;

    targetItems.forEach(item => {
        const title = item.link_title || item.title || item.link_id;
        const dateStr = new Date(item.timestamp * 1000).toLocaleString();
        htmlStr += `
            <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; width: 100%; box-sizing: border-box;">
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; display: block; width: 100%;">
                    ${dateStr} | <b>${escapeHTML(item.subreddit || 'Unknown')}</b> | Thread: ${escapeHTML(title)}
                </div>
                <div style="font-size: 0.95rem; color: var(--text-main); line-height: 1.5; word-break: break-word; white-space: pre-wrap; display: block; width: 100%; max-width: 100%;">
                    ${escapeHTML(item.text).replace(/<br>/g, '\n')}
                </div>
            </div>
        `;
    });
    htmlStr += `</div></div>`;
    modal.innerHTML = htmlStr;
    modal.style.display = 'flex';
};

// [28] fetchApiContext()
// Purpose: Pulls surrounding thread context from Arctic Shift for an isolated comment hit.
window.fetchApiContext = async function(type, id) {
    const overlay = document.getElementById('apiPivotOverlay');
    const titleEl = document.getElementById('apiPivotTitle');
    const bodyEl = document.getElementById('apiPivotBody');
    if(!overlay || !titleEl || !bodyEl) return;
    
    const cleanId = id.replace('t3_', '').replace('t1_', '');
    titleEl.innerText = `Fetching ${type === 'posts' ? 'Thread' : 'Comment'} Context...`;
    bodyEl.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Establishing connection to Arctic Shift API...</div>`;
    overlay.style.display = 'flex';
    
    try {
        const url = `https://arctic-shift.photon-reddit.com/api/${type}/ids?ids=${cleanId}&md2html=true&meta-app=search-tool`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("API Connection Failed");
        const json = await res.json();
        const items = json.data || (Array.isArray(json) ? json : [json]);
        
        if (!items || items.length === 0) {
            bodyEl.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger);">No data found on the server for ID: ${cleanId}</div>`;
            return;
        }
        
        const item = items[0];
        titleEl.innerText = type === 'posts' ? (item.title || `Thread: ${cleanId}`) : `Comment: ${cleanId}`;
        const dateStr = item.created_utc ? new Date(item.created_utc * 1000).toLocaleString() : 'Unknown Date';
        const htmlContent = item.body_html || item.selftext_html || item.body || item.selftext || "No text content available.";
        
        bodyEl.innerHTML = `
            <div style="background: rgba(30, 30, 32, 0.6); padding: 15px; border-radius: 8px; border: 1px solid var(--border); width: 100%; box-sizing: border-box;">
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; margin-bottom: 10px; font-size: 0.85rem; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="margin-right: 10px; margin-bottom: 5px;"><b style="color:var(--text-main); cursor:pointer;" onclick="document.getElementById('apiPivotOverlay').style.display='none'; if(typeof triggerSearch === 'function') triggerSearch('${escapeHTML(item.author)}')">u/${escapeHTML(item.author)}</b> | r/${escapeHTML(item.subreddit)}</span>
                    <span>${dateStr}</span>
                </div>
                <div style="color:var(--text-main); font-size: 0.95rem; line-height: 1.5; word-break: break-word; white-space: pre-wrap; width: 100%; display: block;">
                    ${window.sanitizeHTML(htmlContent)}
                </div>
            </div>
        `;
    } catch (err) {
        bodyEl.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger);">Error fetching context. The server may be unreachable.</div>`;
    }
};

window.loadNavigationComment = function(currentId, direction) {
    const dataRef = typeof globalData !== 'undefined' ? globalData : [];
    const currentItem = dataRef.find(i => String(i.id) === String(currentId));
    if(!currentItem) return;
    
    const threadItems = dataRef.filter(i => String(i.link_id) === String(currentItem.link_id)).sort((a,b) => a.timestamp - b.timestamp);
    const currentIndex = threadItems.findIndex(i => String(i.id) === String(currentId));
    if(currentIndex === -1) return;
    
    let targetItem = null;
    if(direction === 'prev' && currentIndex > 0) targetItem = threadItems[currentIndex - 1];
    else if (direction === 'next' && currentIndex < threadItems.length - 1) targetItem = threadItems[currentIndex + 1];
    
    if(targetItem) {
        if(typeof triggerSearch === 'function') triggerSearch(`id:${targetItem.id}`);
    } else {
        alert(direction === 'prev' ? "This is the first captured item in this thread." : "No further comments captured in this thread.");
    }
};

// [21] createCommentCard() / renderNextChunk()
// Purpose: Paints evidence cards with forensic badges and manages table pagination.
window.createCommentCard = function(item, isThreadRoot = false) {
    const wrapper = document.createElement('div');
    wrapper.className = isThreadRoot ? '' : 'swipe-container'; 
    wrapper.style.cssText = "display: block; width: 100%; box-sizing: border-box;";

    const swipeBg = isThreadRoot ? '' : `
        <div class="swipe-background">
            <div class="swipe-bg-left">👤 Save Profile</div>
            <div class="swipe-bg-right">📂 Save Evidence</div>
        </div>
    `;

    const div = document.createElement('div');
    div.className = isThreadRoot ? 'thread-root-text' : 'comment-card';
    div.dataset.author = item.author;
    div.dataset.id = item.id;
    div.style.cssText = "display: block; width: 100%; box-sizing: border-box; word-wrap: break-word;";
    
    const dateStr = new Date(item.timestamp * 1000).toISOString().replace('T', ' ').substring(0, 19) + 'Z';
    const titleStr = item.link_title || item.title || "";
    const subStr = item.subreddit || 'Unknown';
    const cleanText = window.escapeHTML(item.text).replace(/<br>/g, '\n');
    
    let forensicsHtml = '';
    if (item.forensics && Object.keys(item.forensics).length > 0) {
        forensicsHtml = '<div class="forensics-row" style="white-space: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-top: 8px;">';
        if (item.forensics.urls?.length || item.forensics.emails?.length || item.forensics.crypto?.length) forensicsHtml += `<span class="forensic-badge ent" style="display:inline-block;" onclick="jumpToForensicTab('entitiesView', '${escapeHTML(item.author)}')">ENT</span>`;
        if (item.forensics.locations?.length) forensicsHtml += `<span class="forensic-badge loc" style="display:inline-block;" onclick="jumpToForensicTab('locationView', '${escapeHTML(item.author)}')">LOC</span>`;
        if (item.forensics.stylometry) forensicsHtml += `<span class="forensic-badge sty" style="display:inline-block;" onclick="jumpToForensicTab('stylometryView', '${escapeHTML(item.author)}')">STY</span>`;
        if (item.forensics.behavior) forensicsHtml += `<span class="forensic-badge beh" style="display:inline-block;" onclick="jumpToForensicTab('stylometryView', '${escapeHTML(item.author)}')">BEH</span>`;
        if (item.forensics.opsec_flags?.length || item.forensics.utcHour !== undefined) forensicsHtml += `<span class="forensic-badge ops" style="display:inline-block;" onclick="document.querySelector('[data-target=\\'timelineView\\']').click(); if(typeof triggerSearch==='function') triggerSearch('${escapeHTML(item.author)}')">OPS</span>`;
        forensicsHtml += '</div>';
    }

    const isChecked = window.selectedComments && window.selectedComments.has(item.id) ? 'checked' : '';
    const checkboxHtml = `<input type="checkbox" class="comment-select-cb" value="${item.id}" ${isChecked} onchange="window.toggleCommentSelection('${item.id}')" style="float:right; width:20px; height:20px; cursor:pointer;" title="Select for Mass Export">`;

    if (isThreadRoot) {
        div.innerHTML = `
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px; display:block; width:100%;">${dateStr} | <b>${escapeHTML(subStr)}</b> | Post ID: ${escapeHTML(item.id)}</div>
            <div style="font-weight:600; color:var(--primary); font-size:1.1rem; margin-bottom:8px; display:block; width:100%;">${escapeHTML(titleStr)}</div>
            <div style="color:var(--text-main); white-space:pre-wrap; display:block; width:100%;">${cleanText}</div>
            ${forensicsHtml}
        `;
        wrapper.appendChild(div);
    } else {
        let endTsTarget = typeof currentEndTs !== 'undefined' ? currentEndTs : Infinity;
        let startTsTarget = typeof currentStartTs !== 'undefined' ? currentStartTs : 0;
        let beforeStr = endTsTarget && endTsTarget !== Infinity ? `&before=${encodeURIComponent(new Date(endTsTarget * 1000).toISOString().slice(0, 16))}` : '';
        let afterStr = startTsTarget ? `&after=${encodeURIComponent(new Date(startTsTarget * 1000).toISOString().slice(0, 16))}` : '';
        
        let asWebUrl = `https://arctic-shift.photon-reddit.com/search?fun=comments_search&author=${escapeHTML(item.author)}${beforeStr}${afterStr}&limit=100&sort=desc`;
        let revUrl = `https://www.reveddit.com/y/${escapeHTML(item.author)}/`;

        div.innerHTML = `
            <div class="compact-inline-header">
                ${checkboxHtml}
                <span style="font-weight:bold; color:var(--primary);">
                    <span class="clickable-author" onclick="if(typeof triggerSearch === 'function') triggerSearch('${escapeHTML(item.author)}')">u/${escapeHTML(item.author)}</span>
                    <span style="cursor:pointer; color: var(--warning); margin-left: 6px; font-size: 1.1em;" title="Sync Full History" onclick="event.stopPropagation(); if(typeof fetchFullUserHistory==='function') fetchFullUserHistory('${escapeHTML(item.author)}');">⚡</span>
                </span>
                <span>${dateStr.substring(0, 10)}</span>
            </div>
            
            <div class="as-header">
                ${checkboxHtml}
                <span class="as-sub" onclick="if(typeof triggerSubSearch === 'function') triggerSubSearch('${escapeHTML(subStr)}')">r/${escapeHTML(subStr)}</span> 
                by <span class="author clickable-author" style="color:var(--text-main);" onclick="if(typeof triggerSearch === 'function') triggerSearch('${escapeHTML(item.author)}')">u/${escapeHTML(item.author)}</span>
                <span style="cursor:pointer; color: var(--warning); margin-left: 6px; font-size: 1.1em;" title="Sync Full Account History via API" onclick="if(typeof fetchFullUserHistory === 'function') fetchFullUserHistory('${escapeHTML(item.author)}');">⚡</span>
            </div>
            
            <div class="as-meta">
                at ${dateStr} | ID: ${escapeHTML(item.id)}
            </div>

            ${titleStr ? `<div style="font-weight:bold; color:var(--text-main); font-size:1.05rem; margin-bottom:8px; line-height:1.4;">${escapeHTML(titleStr)}</div>` : ''}
            
            <div class="comment-body" style="width: 100%; margin-top: 4px; display:block; color:var(--text-main);" onclick="if(document.body.classList.contains('compact-mode')) this.classList.toggle('expanded');">
                ${cleanText}
            </div>

            ${forensicsHtml}

            <div class="action-row" style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.85rem;">
                <a href="${asWebUrl}" target="_blank" style="color:var(--primary); text-decoration:none;">🧊 AS Web</a>
                <a href="${revUrl}" target="_blank" style="color:var(--danger); text-decoration:none;">🕵️ Reveddit</a>
                <span style="cursor:pointer; color:var(--text-muted);" title="Sync Local Thread" onclick="if(typeof triggerSearch === 'function') triggerSearch('thread:${escapeHTML(item.link_id)}')">⚗️ Thread Filter</span>
            </div>

            <div class="nav-row action-row" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
                <button class="btn btn-secondary btn-compact" onclick="loadNavigationComment('${item.id}', 'prev')">↑ Load parent</button>
                <button class="btn btn-secondary btn-compact" onclick="if(typeof window.loadRootPost==='function') window.loadRootPost('${item.link_id}')">↑ Load post</button>
                <button class="btn btn-secondary btn-compact" onclick="loadNavigationComment('${item.id}', 'next')">↓ Load replies</button>
            </div>
        `;
        wrapper.innerHTML = swipeBg;
        wrapper.appendChild(div);
    }
    return wrapper;
};

// [22] renderNextThreadChunk() / toggleThreadAccordion()
// Purpose: Paints collapsible multi-actor thread matrices.
window.renderNextThreadChunk = function(customLimit = null) {
    const sourceData = typeof threadViewData !== 'undefined' ? threadViewData : [];
    const container = document.getElementById('threadsContainer');
    const pagination = document.getElementById('threadPaginationCtrl');
    if (!container || sourceData.length === 0) return;

    if (typeof currentThreadDisplayCount === 'undefined') window.currentThreadDisplayCount = 0;
    if (currentThreadDisplayCount === 0) container.innerHTML = "";

    const fragment = document.createDocumentFragment();
    let startIdx = currentThreadDisplayCount;
    const threadDisplayLimit = customLimit || 20; 
    const endIndex = Math.min(startIdx + threadDisplayLimit, sourceData.length);
    
    for (let i = startIdx; i < endIndex; i++) {
        const t = sourceData[i];
        if (!t) continue;
        
        const dateStr = new Date(t.timestamp ? t.timestamp * 1000 : Date.now()).toLocaleDateString();
        const threadTitle = t.link_title || `Thread: ${t.link_id}`;
        const sub = t.subreddit ? `r/${t.subreddit}` : 'Unknown Group';
        const uniqueAuthors = (t.authors instanceof Set) ? t.authors.size : (t.uniqueCount || 1);
        
        const card = document.createElement('div'); 
        card.className = 'thread-compact-card';
        card.dataset.threadId = t.link_id;
        
        const authorDisplay = t.rootAuthor && t.rootAuthor !== '[deleted]' 
            ? `<b class="thread-author-node clickable-author" style="color:var(--primary);" onclick="event.stopPropagation(); if(typeof triggerSearch==='function') triggerSearch('${escapeHTML(t.rootAuthor)}')">u/${escapeHTML(t.rootAuthor)}</b>`
            : `<b class="thread-author-node" style="color:var(--text-muted);">u/Unknown</b>`;

        card.innerHTML = `
            <div class="thread-compact-header" onclick="window.toggleThreadAccordion(this.parentElement, '${t.link_id}')">
                <div style="display:flex; align-items:center; gap: 8px;">
                    ${authorDisplay}
                    <span class="thread-title-node" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:normal; color:var(--text-main);">${escapeHTML(threadTitle)}</span>
                    <span style="color:var(--text-muted); font-size:0.75rem;">▼</span>
                </div>
                <div class="thread-compact-meta" style="margin-top:4px;">
                    <span>${escapeHTML(sub)} | ${dateStr}</span>
                    <span>${t.count} items / ${uniqueAuthors} users</span>
                </div>
            </div>
            <div class="thread-compact-body">
                <div class="thread-content-target" style="text-align:center; padding: 20px; color:var(--text-muted);">
                    Loading full context...
                </div>
            </div>
        `;
        fragment.appendChild(card);
    }
    container.appendChild(fragment);
    
    window.currentThreadDisplayCount = endIndex;
    if (pagination) pagination.style.display = currentThreadDisplayCount >= sourceData.length ? "none" : "flex"; 
};

window.toggleThreadAccordion = async function(cardElement, threadId) {
    const isExpanded = cardElement.classList.toggle('expanded');
    if (!isExpanded) return; 
    
    const bodyTarget = cardElement.querySelector('.thread-content-target');
    if (cardElement.dataset.loaded === 'true') return;

    bodyTarget.innerHTML = `<div style="animation: pulse 1.5s infinite;">📡 Fetching complete thread context from Arctic Shift API...</div>`;
    
    try {
        const cleanId = threadId.replace('t3_', '');
        
        const [postRes, commentsRes] = await Promise.all([
            fetch(`https://arctic-shift.photon-reddit.com/api/posts/ids?ids=${cleanId}`),
            fetch(`https://arctic-shift.photon-reddit.com/api/comments/search?link_id=t3_${cleanId}&limit=100&sort=asc`)
        ]);
        
        let rootHtml = "";
        if (postRes.ok) {
            const postJson = await postRes.json();
            const post = postJson.data && postJson.data.length > 0 ? postJson.data[0] : (Array.isArray(postJson) ? postJson[0] : postJson);
            if (post) {
                const postText = post.selftext || post.body || "No text body.";
                rootHtml = `<div class="thread-root-text" style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 12px;">
                    <b style="color:var(--primary);">${escapeHTML(post.title || threadId)}</b> <span class="thread-api-badge">API Sync</span><br><br>
                    <span style="color:var(--text-main); white-space:pre-wrap; font-size:0.9rem;">${escapeHTML(postText)}</span>
                </div>`;
                
                const titleNode = cardElement.querySelector('.thread-title-node');
                if (titleNode && titleNode.innerText.startsWith('Thread:')) titleNode.innerText = post.title;
            }
        }

        let commentsHtml = "";
        if (commentsRes.ok) {
            const commJson = await commentsRes.json();
            let comments = commJson.data || (Array.isArray(commJson) ? commJson : []);
            
            const localComments = typeof globalData !== 'undefined' ? globalData.filter(i => i.link_id === threadId || i.link_id === `t3_${cleanId}`) : [];
            const allCommentsMap = new Map();
            localComments.forEach(c => allCommentsMap.set(c.id, c));
            comments.forEach(c => allCommentsMap.set(c.id, {
                id: c.id,
                author: c.author,
                text: c.body || c.selftext || "",
                timestamp: c.created_utc || Date.now()/1000,
                isApi: true
            }));

            const mergedComments = Array.from(allCommentsMap.values()).sort((a,b) => a.timestamp - b.timestamp);

            if (mergedComments.length > 0) {
                commentsHtml = `<div class="thread-replies-container">` + 
                    mergedComments.map(c => {
                        const isChecked = window.selectedComments && window.selectedComments.has(c.id) ? 'checked' : '';
                        const cb = c.isApi ? '' : `<input type="checkbox" class="comment-select-cb" value="${c.id}" ${isChecked} onchange="window.toggleCommentSelection('${c.id}')" style="margin-right:8px; transform:scale(1.2); cursor:pointer;">`;
                        return `<div class="thread-comment-line" onclick="this.classList.toggle('expanded')" style="border-left: 2px solid ${c.isApi ? 'var(--warning)' : 'var(--primary)'}; padding-left: 8px; margin-bottom: 4px;">
                            ${cb}
                            <span class="author" style="cursor:pointer;" onclick="event.stopPropagation(); if(typeof triggerSearch === 'function') triggerSearch('${escapeHTML(c.author)}')">u/${escapeHTML(c.author)}</span>: 
                            <span style="color:var(--text-main);">${escapeHTML(c.text)}</span>
                        </div>`;
                    }).join('') + `</div>`;
            } else {
                commentsHtml = `<div style="color:var(--text-muted); font-size:0.85rem;">No comments found for this thread.</div>`;
            }
        }

        bodyTarget.innerHTML = rootHtml + commentsHtml + `<div style="text-align:right; margin-top:10px;"><button class="btn btn-primary btn-compact" onclick="if(typeof triggerSearch === 'function') { document.querySelector('[data-target=\\'commentsView\\']').click(); triggerSearch('thread:t3_${cleanId}'); }">Isolate Thread Locally</button></div>`;
        cardElement.dataset.loaded = 'true';

    } catch (err) {
        console.error("Thread expansion API error", err);
        bodyTarget.innerHTML = `<div style="color:var(--danger);">Failed to connect to API. Showing local fallback.</div>`;
        const localThread = threadViewData.find(t => t.link_id === threadId);
        if (localThread) {
            bodyTarget.innerHTML += `<div class="thread-replies-container" style="margin-top:10px;">` + 
            localThread.comments.map(c => {
                const isChecked = window.selectedComments && window.selectedComments.has(c.id) ? 'checked' : '';
                const cb = `<input type="checkbox" class="comment-select-cb" value="${c.id}" ${isChecked} onchange="window.toggleCommentSelection('${c.id}')" style="margin-right:8px; transform:scale(1.2); cursor:pointer;">`;
                return `<div class="thread-comment-line" onclick="this.classList.toggle('expanded')">${cb}<span class="author">u/${escapeHTML(c.author)}</span>: ${escapeHTML(c.text)}</div>`
            }).join('') + `</div>`;
        }
    }
};

window.renderNextChunk = function() {
    const container = document.getElementById('resultsContainer');
    const paginationCtrl = document.getElementById('paginationCtrl');
    if (!container) return;

    if (typeof currentDisplayCount === 'undefined') window.currentDisplayCount = 0;
    if (currentDisplayCount === 0) container.innerHTML = "";
    
    const vData = typeof viewData !== 'undefined' ? viewData : [];
    const fragment = document.createDocumentFragment();
    const displayLimit = typeof displayChunkSize !== 'undefined' ? displayChunkSize : 100;
    const endIdx = Math.min(currentDisplayCount + displayLimit, vData.length);
    
    for (let i = currentDisplayCount; i < endIdx; i++) {
        fragment.appendChild(window.createCommentCard(vData[i]));
    }
    container.appendChild(fragment);
    
    window.currentDisplayCount = endIdx;
    if (paginationCtrl) paginationCtrl.style.display = currentDisplayCount < vData.length ? "flex" : "none";
};

// [23] renderUsersTab()
// Purpose: Generates target extraction tables with inferred demographic statistics.
window.renderUsersTab = function() {
    const c = document.getElementById('usersContainer');
    if(!c) return;
    const vData = typeof window.viewData !== 'undefined' ? window.viewData : [];
    const userStats = new Map();
    
    // O(1) Memory Yielding Profiler Engine
    window.executeChunkedRender(vData, (item) => {
        if(!item.author || item.author === '[deleted]' || item.author === 'AutoModerator') return;
        
        if(!userStats.has(item.author)) {
            userStats.set(item.author, { 
                count: 0, latest: 0, words: 0, fScore: 0, mScore: 0,
                hasEnt: false, hasLoc: false, primarySub: ''
            });
        }
        
        const stat = userStats.get(item.author);
        stat.count++;
        if(item.timestamp > stat.latest) {
            stat.latest = item.timestamp;
            if (item.subreddit) stat.primarySub = item.subreddit;
        }

        // Lightweight Stream-Calculated Linguistics
        if (item.text) {
            const lower = item.text.toLowerCase();
            const wordsMatch = lower.match(/\b\w+\b/g);
            if (wordsMatch) {
                stat.words += wordsMatch.length;
                
                const fMatches = lower.match(/\b(i|me|my|mine|so|very|really|love|feel|cute|omg)\b/g);
                if (fMatches) stat.fScore += fMatches.length;
                const exclamations = item.text.match(/!{2,}/g);
                if (exclamations) stat.fScore += (exclamations.length * 2);

                const mMatches = lower.match(/\b(the|a|an|those|fuck|shit|damn|bro|dude|man)\b/g);
                if (mMatches) stat.mScore += mMatches.length;
                const urls = item.text.match(/http/g);
                if (urls) stat.mScore += (urls.length * 2);
            }
        }

        if (item.forensics) {
            if (item.forensics.urls?.length || item.forensics.emails?.length || item.forensics.crypto?.length) stat.hasEnt = true;
            if (item.forensics.locations?.length) stat.hasLoc = true;
        }

    }, () => {
        const sortedUsers = Array.from(userStats.entries()).sort((a,b)=>b[1].count - a[1].count);

        let html = `
            <div class="comment-card" style="display:block; width:100%; box-sizing:border-box;">
                <h3 style="margin-top:0; color:var(--primary); display:flex; justify-content:space-between; align-items:center;">
                    Matched Users
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${sortedUsers.length} subjects</span>
                </h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">Calculated gender prediction based on proportional lexical density. Long-press any user row to view recent comments.</p>
                <div class="table-container" style="margin-top:15px; width:100%; overflow-x:auto;">
                    <table style="width:100%; text-align:left; border-collapse:collapse; min-width:800px;">
                        <thead><tr><th>Username</th><th>Occurrences</th><th>Subreddit</th><th>Forensics</th><th>Stylometric Gender Vector</th><th>Action</th></tr></thead>
                        <tbody>
        `;
        
        sortedUsers.forEach(([author, stat]) => {
            let badgesHtml = '';
            if (stat.hasEnt) badgesHtml += '<span class="forensic-badge ent">ENT</span> ';
            if (stat.hasLoc) badgesHtml += '<span class="forensic-badge loc">LOC</span>';

            let genderHtml = '<span style="color:var(--text-muted); font-size:0.8rem;">Not enough data</span>';
            if (stat.words > 30) {
                const fRatio = stat.fScore / stat.words;
                const mRatio = stat.mScore / stat.words;
                const totalDensity = fRatio + mRatio;
                
                if (totalDensity > 0) {
                    const fPercent = Math.round((fRatio / totalDensity) * 100);
                    const mPercent = 100 - fPercent;
                    
                    let predLabel = 'Ambiguous';
                    let barColor = 'var(--text-muted)';
                    
                    if (fPercent > 60) { predLabel = 'Likely Female'; barColor = '#ff69b4'; }
                    else if (mPercent > 60) { predLabel = 'Likely Male'; barColor = '#0a84ff'; }

                    genderHtml = `
                        <div style="display:flex; flex-direction:column; gap:4px; width:100%; max-width:150px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                                <span style="color:${barColor}; font-weight:bold;">${predLabel}</span>
                                <span style="color:var(--text-muted);">${stat.words} wds</span>
                            </div>
                            <div style="width:100%; height:6px; background:rgba(0,0,0,0.5); border-radius:3px; display:flex; overflow:hidden;">
                                <div style="width:${fPercent}%; height:100%; background:#ff69b4;"></div>
                                <div style="width:${mPercent}%; height:100%; background:#0a84ff;"></div>
                            </div>
                        </div>
                    `;
                }
            }

            html += `<tr class="user-row-interact" data-author="${escapeHTML(author)}">
                <td class="clickable-author" style="color:var(--text-main); font-weight:bold;" onclick="if(typeof triggerSearch==='function') triggerSearch('${escapeHTML(author)}')">u/${escapeHTML(author)}</td>
                <td style="color:var(--primary); font-weight:bold;">${stat.count.toLocaleString()}</td>
                <td style="font-size:0.85rem; color:var(--text-muted);">${escapeHTML(stat.primarySub)}</td>
                <td style="white-space:nowrap;">${badgesHtml}</td>
                <td style="min-width:150px;">${genderHtml}</td>
                <td><button class="btn btn-secondary btn-compact" onclick="if(typeof triggerSearch==='function') triggerSearch('${escapeHTML(author)}')">Isolate</button></td>
            </tr>`;
        });
        html += `</tbody></table></div></div>`;
        c.innerHTML = html;

        // Bind Long Press to User Rows
        const rows = c.querySelectorAll('.user-row-interact');
        rows.forEach(row => {
            let pressTimer;
            row.oncontextmenu = (e) => e.preventDefault();
            const startPress = () => {
                pressTimer = setTimeout(() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    window.showMicroProfile(row.dataset.author);
                }, 500);
            };
            const cancelPress = () => clearTimeout(pressTimer);
            row.addEventListener('touchstart', startPress, {passive: true});
            row.addEventListener('touchend', cancelPress);
            row.addEventListener('mousedown', startPress);
            row.addEventListener('mouseup', cancelPress);
            row.addEventListener('mouseleave', cancelPress);
        });

    }, "Evaluating Forensic User Matrices");
};

// [24] renderServicesTab() / showDictionaryModal() / addCustomService() / removeCustomService()
// Purpose: Escort and Acronym dictionary scanning for illicit indicators.
window.showDictionaryModal = function() {
    let customServices = JSON.parse(localStorage.getItem('osint_custom_services') || '[]');
    let defaultServices = ['VFE','PSE','BB','RAW','CIM','COF','PIV','GREEK','HH','QV','FMTY','BEAR','BBBJ','DATY','DFK','GFE','OWO','OYO','CAR','MS','CFS','CBS','LIPS','ATM','A-LEVEL','BDSM','CBT','CGG','CIMWS','COB','DT','DUO','FBS','FFM','FK','FRENCH','FS','GS','ROSE','MFF','MMF','NURU','PEGGING','POW','RIMMING','SPIN','SQUIRT','SWALLOW','WATERSPORTS'];
    
    const overlay = document.getElementById('previewModalOverlay');
    const titleEl = document.getElementById('previewModalTitle');
    const bodyEl = document.getElementById('previewModalBody');
    if(!overlay) return;

    titleEl.innerText = "Manage Services Dictionary";
    
    let html = `<div style="margin-bottom:15px; color:var(--text-muted); font-size:0.85rem;">Tap any red custom term to remove it. Default terms cannot be deleted.</div>`;
    
    html += `<h4 style="color:var(--text-main); margin-bottom:8px;">Custom Acronyms</h4>`;
    if (customServices.length > 0) {
        html += `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 20px;">`;
        customServices.forEach(s => {
            html += `<span class="btn-nav" style="border-color:var(--danger); color:var(--danger);" onclick="window.removeCustomService('${escapeHTML(s)}'); window.showDictionaryModal();">${escapeHTML(s)} ✖</span>`;
        });
        html += `</div>`;
    } else {
        html += `<p style="font-size:0.85rem; color:var(--text-muted); margin-bottom: 20px;">No custom acronyms added.</p>`;
    }

    html += `<h4 style="color:var(--text-main); margin-bottom:8px;">Default Dictionary</h4>
             <div style="display:flex; flex-wrap:wrap; gap:6px;">`;
    defaultServices.forEach(s => {
        html += `<span style="background:rgba(255,255,255,0.05); border:1px solid var(--border); padding:4px 8px; border-radius:4px; font-size:0.75rem; color:var(--text-muted);">${escapeHTML(s)}</span>`;
    });
    html += `</div>`;

    bodyEl.innerHTML = html;
    overlay.style.display = 'flex';
};

window.addCustomService = function() {
    const input = document.getElementById('customServiceInput');
    if(!input || !input.value.trim()) return;
    
    const terms = input.value.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
    let custom = JSON.parse(localStorage.getItem('osint_custom_services') || '[]');
    
    terms.forEach(term => {
        if(!custom.includes(term)) custom.push(term);
    });
    
    localStorage.setItem('osint_custom_services', JSON.stringify(custom));
    input.value = '';
    window.renderServicesTab();
};

window.removeCustomService = function(term) {
    let custom = JSON.parse(localStorage.getItem('osint_custom_services') || '[]');
    custom = custom.filter(c => c !== term);
    localStorage.setItem('osint_custom_services', JSON.stringify(custom));
    window.renderServicesTab();
};

window.renderServicesTab = function() {
    const c = document.getElementById('servicesContainer');
    if(!c) return;
    
    let customServices = JSON.parse(localStorage.getItem('osint_custom_services') || '[]');
    let defaultServices = ['VFE','PSE','BB','RAW','CIM','COF','PIV','GREEK','HH','QV','FMTY','BEAR','BBBJ','DATY','DFK','GFE','OWO','OYO','CAR','MS','CFS','CBS','LIPS','ATM','A-LEVEL','BDSM','CBT','CGG','CIMWS','COB','DT','DUO','FBS','FFM','FK','FRENCH','FS','GS','ROSE','MFF','MMF','NURU','PEGGING','POW','RIMMING','SPIN','SQUIRT','SWALLOW','WATERSPORTS'];
    
    let allServices = [...new Set([...defaultServices, ...customServices].map(s=>s.toUpperCase()))];
    // Regex matches the acronym strictly at word boundaries
    const escapedTerms = allServices.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
    
    const vData = typeof window.viewData !== 'undefined' ? window.viewData : [];
    let hits = [];
    
    window.executeChunkedRender(vData, (item) => {
        if(!item.text) return;
        const matches = item.text.match(regex);
        if(matches && matches.length > 0) {
            const uniqueMatches = [...new Set(matches.map(m=>m.toUpperCase()))];
            
            // Sentence Boundary Extractor
            const sentences = item.text.match(/[^.!?]+[.!?]+/g) || [item.text];
            let matchingSentences = sentences.filter(s => regex.test(s)).map(s => s.trim());
            if(matchingSentences.length === 0) matchingSentences = [item.text.substring(0, 150) + "..."];
            
            hits.push({ item, terms: uniqueMatches, snippet: matchingSentences.join(' ... ') });
        }
    }, () => {
        
        let html = `
            <div class="comment-card" style="display:block; width:100%; box-sizing:border-box;">
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center;">
                    <div>
                        <h3 style="margin:0; color:var(--primary);">Escort Services Scanner</h3>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 10px 0;">Long-press 'Add' to manage dictionary.</p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="customServiceInput" placeholder="Add acronym(s)..." style="width:150px; padding:4px; border-radius:4px; border:1px solid var(--border); background:rgba(0,0,0,0.5); color:#fff;">
                        <button id="addServiceBtn" class="btn btn-primary btn-compact" onclick="window.addCustomService()">Add</button>
                    </div>
                </div>
                
                <div style="margin-top:20px;">
                    <h4 style="color:var(--text-main);">Flagged Hits: ${hits.length}</h4>
                    <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
        `;
        
        hits.forEach(h => {
            const dateStr = new Date(h.item.timestamp * 1000).toLocaleDateString();
            const termsHtml = h.terms.map(t=>`<span style="background:var(--danger); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:bold; margin-right:4px;">${escapeHTML(t)}</span>`).join('');
            
            let highlightedText = escapeHTML(h.snippet);
            h.terms.forEach(t => {
                const tReg = new RegExp(`\\b(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
                highlightedText = highlightedText.replace(tReg, `<strong style="color:var(--danger); text-decoration:underline;">$1</strong>`);
            });

            html += `
                <div class="thread-compact-card">
                    <div class="thread-compact-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>
                                <b class="clickable-author" style="color:var(--primary);" onclick="event.stopPropagation(); if(typeof triggerSearch==='function') triggerSearch('${escapeHTML(h.item.author)}')">u/${escapeHTML(h.item.author)}</b>
                                <span style="color:var(--text-muted); font-size:0.8rem; margin-left:8px;">| ${dateStr}</span>
                            </span>
                            <div>${termsHtml} <span style="color:var(--text-muted); font-size:0.75rem; margin-left:6px;">▼</span></div>
                        </div>
                        <div style="font-size:0.85rem; color:var(--text-main); margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${highlightedText}
                        </div>
                    </div>
                    <div class="thread-compact-body">
                        <div style="font-size:0.9rem; color:var(--text-main); white-space:pre-wrap; word-break:break-word;">
                            ${highlightedText}
                        </div>
                        <div style="margin-top:10px; text-align:right;">
                            <button class="btn btn-secondary btn-compact" onclick="if(typeof triggerSearch==='function') triggerSearch('id:${escapeHTML(h.item.id)}')">View Full Comment</button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div></div></div>`;
        c.innerHTML = html;

        // Bind Long Press for Dictionary Management
        const addBtn = document.getElementById('addServiceBtn');
        if (addBtn) {
            let pressTimer;
            addBtn.oncontextmenu = (e) => e.preventDefault();
            const startPress = () => {
                pressTimer = setTimeout(() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    window.showDictionaryModal();
                }, 500);
            };
            const cancelPress = () => clearTimeout(pressTimer);
            addBtn.addEventListener('touchstart', startPress, {passive: true});
            addBtn.addEventListener('touchend', cancelPress);
            addBtn.addEventListener('mousedown', startPress);
            addBtn.addEventListener('mouseup', cancelPress);
            addBtn.addEventListener('mouseleave', cancelPress);
        }

    }, "Scanning for Services");
};

// [25] renderTimeline()
// Purpose: Multi-scale heatmap generation (Yearly/Monthly/Weekly Pattern of Life).
window.currentTimelineYear = window.currentTimelineYear || new Date().getFullYear();
window.timelineZoomLevel = window.timelineZoomLevel || 'year'; 
window.currentTimelineMonth = window.currentTimelineMonth !== undefined ? window.currentTimelineMonth : new Date().getMonth();
window.currentTimelineWeekOffset = window.currentTimelineWeekOffset || 0; 

window.renderTimeline = function() {
    const container = document.getElementById('timeline-container');
    if(!container) return;

    const vData = typeof viewData !== 'undefined' ? viewData : [];
    if (vData.length === 0) {
        container.innerHTML = `<div class="comment-card" style="width:100%;"><p>No data available to map.</p></div>`;
        return;
    }

    const dateMap = new Map();
    let minTime = Infinity; let maxTime = 0;

    window.executeChunkedRender(vData, (item) => {
        if (item.timestamp < minTime) minTime = item.timestamp;
        if (item.timestamp > maxTime) maxTime = item.timestamp;
        
        const d = new Date(item.timestamp * 1000);
        
        if (window.timelineZoomLevel === 'year' || window.timelineZoomLevel === 'month') {
            if (d.getFullYear() === window.currentTimelineYear) {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
            }
        } else if (window.timelineZoomLevel === 'week') {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const hour = d.getHours();
            const key = `${dateStr}_${hour}`;
            dateMap.set(key, (dateMap.get(key) || 0) + 1);
        }
        
    }, () => {
        if (dateMap.size === 0 && maxTime > 0 && !window.timelineManuallyNavigated) {
            const latestDate = new Date(maxTime * 1000);
            window.currentTimelineYear = latestDate.getFullYear();
            window.currentTimelineMonth = latestDate.getMonth();
            window.timelineManuallyNavigated = true;
            return window.renderTimeline();
        }

        let maxCount = 0;
        dateMap.forEach(count => { if(count > maxCount) maxCount = count; });

        let zoomControls = `
            <div style="display:flex; justify-content:center; gap:10px; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                <button class="btn ${window.timelineZoomLevel === 'week' ? 'btn-primary' : 'btn-secondary'} btn-compact" onclick="window.timelineZoomLevel='week'; window.renderTimeline()">Weekly (PoL)</button>
                <button class="btn ${window.timelineZoomLevel === 'month' ? 'btn-primary' : 'btn-secondary'} btn-compact" onclick="window.timelineZoomLevel='month'; window.renderTimeline()">Monthly</button>
                <button class="btn ${window.timelineZoomLevel === 'year' ? 'btn-primary' : 'btn-secondary'} btn-compact" onclick="window.timelineZoomLevel='year'; window.renderTimeline()">Yearly</button>
            </div>
        `;

        let yAxisLabels = []; let xAxisLabelsHtml = ''; let gridHtml = '';
        let headerTitle = "";
        let prevAction = ""; let nextAction = "";

        if (window.timelineZoomLevel === 'year') {
            headerTitle = `${window.currentTimelineYear} Footprint`;
            prevAction = "window.timelineManuallyNavigated = true; window.currentTimelineYear--; window.renderTimeline();";
            nextAction = "window.timelineManuallyNavigated = true; window.currentTimelineYear++; window.renderTimeline();";
            
            yAxisLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const yearStart = new Date(window.currentTimelineYear, 0, 1);
            const startDate = new Date(window.currentTimelineYear, 0, 1 - yearStart.getDay());
            
            let monthLabels = ""; let currentMonth = -1;
            for (let w = 0; w < 54; w++) {
                const cellDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (w * 7));
                if (cellDate.getFullYear() === window.currentTimelineYear && cellDate.getMonth() !== currentMonth) {
                    currentMonth = cellDate.getMonth();
                    monthLabels += `<span style="position:absolute; left:${w * 18}px;">${months[currentMonth]}</span>`;
                }
            }
            xAxisLabelsHtml = `<div style="position:relative; margin-left:22px; height:15px; width:100%; font-size:0.75rem; color:var(--text-muted);">` + monthLabels + `</div>`;

            gridHtml = `<div class="heatmap-grid" style="grid-template-rows: repeat(7, 1fr); gap: 4px;">`;
            for (let w = 0; w < 54; w++) {
                for (let d = 0; d < 7; d++) {
                    const cellDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (w * 7) + d);
                    if (cellDate.getFullYear() !== window.currentTimelineYear) {
                        gridHtml += `<div class="heatmap-cell" style="opacity: 0; pointer-events: none;"></div>`;
                        continue;
                    }
                    const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
                    const count = dateMap.get(dateStr) || 0;
                    let level = count > 0 ? Math.ceil((count/maxCount)*4) : 0;
                    if(level > 4) level = 4;
                    const cellClass = (window.gapFilterMode !== 'all' && window.gapStatusMap && level > 0) ? "heatmap-cell gap-alert" : "heatmap-cell";
                    gridHtml += `<div class="${cellClass} tooltip-trigger" data-date="${dateStr}" data-level="${level}"></div>`;
                }
            }
            gridHtml += `</div>`;
        } 
        else if (window.timelineZoomLevel === 'month') {
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            headerTitle = `${months[window.currentTimelineMonth]} ${window.currentTimelineYear}`;
            prevAction = "window.timelineManuallyNavigated = true; window.currentTimelineMonth--; if(window.currentTimelineMonth < 0){ window.currentTimelineMonth = 11; window.currentTimelineYear--; } window.renderTimeline();";
            nextAction = "window.timelineManuallyNavigated = true; window.currentTimelineMonth++; if(window.currentTimelineMonth > 11){ window.currentTimelineMonth = 0; window.currentTimelineYear++; } window.renderTimeline();";

            yAxisLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            
            xAxisLabelsHtml = `<div style="position:relative; margin-left:22px; height:15px; width:100%; font-size:0.75rem; color:var(--text-muted);">
                <span style="position:absolute; left:0px;">W1</span>
                <span style="position:absolute; left:22px;">W2</span>
                <span style="position:absolute; left:44px;">W3</span>
                <span style="position:absolute; left:66px;">W4</span>
                <span style="position:absolute; left:88px;">W5</span>
                <span style="position:absolute; left:110px;">W6</span>
            </div>`;

            const monthStart = new Date(window.currentTimelineYear, window.currentTimelineMonth, 1);
            const startDate = new Date(window.currentTimelineYear, window.currentTimelineMonth, 1 - monthStart.getDay());

            gridHtml = `<div class="heatmap-grid" style="grid-template-rows: repeat(7, 1fr); gap: 4px;">`;
            for (let w = 0; w < 6; w++) { 
                for (let d = 0; d < 7; d++) {
                    const cellDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (w * 7) + d);
                    if (cellDate.getMonth() !== window.currentTimelineMonth) {
                        gridHtml += `<div class="heatmap-cell" style="opacity: 0.2; pointer-events: none;"></div>`;
                        continue;
                    }
                    const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
                    const count = dateMap.get(dateStr) || 0;
                    let level = count > 0 ? Math.ceil((count/maxCount)*4) : 0;
                    if(level > 4) level = 4;
                    gridHtml += `<div class="heatmap-cell tooltip-trigger" data-date="${dateStr}" data-level="${level}"></div>`;
                }
            }
            gridHtml += `</div>`;
        }
        else if (window.timelineZoomLevel === 'week') {
            const baseDate = new Date(maxTime * 1000); 
            baseDate.setDate(baseDate.getDate() + (window.currentTimelineWeekOffset * 7));
            const startOfWeek = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - baseDate.getDay());
            const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6);
            
            const startStr = `${startOfWeek.getMonth()+1}/${startOfWeek.getDate()}`;
            const endStr = `${endOfWeek.getMonth()+1}/${endOfWeek.getDate()}`;
            headerTitle = `Week of ${startStr} - ${endStr}`;
            
            prevAction = "window.timelineManuallyNavigated = true; window.currentTimelineWeekOffset--; window.renderTimeline();";
            nextAction = "window.timelineManuallyNavigated = true; window.currentTimelineWeekOffset++; window.renderTimeline();";

            for(let h = 0; h < 24; h++) yAxisLabels.push(`${h}:00`);
            
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let dayLabelsHtml = "";
            for (let d = 0; d < 7; d++) {
                dayLabelsHtml += `<span style="position:absolute; left:${d * 18}px; font-size:0.65rem;">${dayNames[d]}</span>`;
            }
            xAxisLabelsHtml = `<div style="position:relative; margin-left:45px; height:15px; width:100%; font-size:0.75rem; color:var(--text-muted);">${dayLabelsHtml}</div>`;

            gridHtml = `<div class="heatmap-grid" style="grid-template-rows: repeat(24, 1fr); gap: 4px;">`;
            
            for (let d = 0; d < 7; d++) {
                const cellDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + d);
                const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
                
                for (let h = 0; h < 24; h++) {
                    const key = `${dateStr}_${h}`;
                    const count = dateMap.get(key) || 0;
                    let level = count > 0 ? Math.ceil((count/maxCount)*4) : 0;
                    if(level > 4) level = 4;
                    gridHtml += `<div class="heatmap-cell tooltip-trigger" data-date="${dateStr}" data-hour="${h}" data-level="${level}"></div>`;
                }
            }
            gridHtml += `</div>`;
        }

        let yAxisHtml = `<div class="heatmap-y-axis" style="grid-template-rows: repeat(${yAxisLabels.length}, 1fr); width: ${window.timelineZoomLevel === 'week' ? '40px' : 'auto'};">`;
        yAxisLabels.forEach(m => yAxisHtml += `<div class="heatmap-y-label">${m}</div>`);
        yAxisHtml += `</div>`;

        let navButtons = `
            <button class="btn btn-secondary btn-compact" style="position: absolute; left: 0;" onclick="${prevAction}">◀ Prev</button>
            <h3 style="margin:0; font-size: 1.1rem; text-align:center;">${headerTitle}</h3>
            <button class="btn btn-secondary btn-compact" style="position: absolute; right: 0;" onclick="${nextAction}">Next ▶</button>
        `;

        container.innerHTML = `
            <div class="heatmap-container" style="display:block; width:100%; box-sizing:border-box;">
                <div class="heatmap-header" style="justify-content: center; position: relative;">${navButtons}</div>
                ${zoomControls}
                <div style="display:flex; flex-direction:column; width:100%;">
                    ${xAxisLabelsHtml}
                    <div class="heatmap-layout-wrapper">${yAxisHtml}${gridHtml}</div>
                </div>
                <div class="heatmap-legend" style="margin-top: 15px;">
                    Less <div class="heatmap-cell" style="background-color: var(--secondary);"></div>
                    <div class="heatmap-cell" data-level="1"></div><div class="heatmap-cell" data-level="2"></div>
                    <div class="heatmap-cell" data-level="3"></div><div class="heatmap-cell" data-level="4"></div> More
                </div>
            </div>`;

        const cells = container.querySelectorAll('.heatmap-cell.tooltip-trigger');
        cells.forEach(cell => {
            let pressTimer;
            cell.oncontextmenu = (e) => e.preventDefault();
            
            cell.addEventListener('mouseenter', (e) => {
                if(cell.dataset.level === "0") return;
                let tooltip = document.getElementById('temporalTooltip');
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.id = 'temporalTooltip';
                    tooltip.className = 'temporal-tooltip';
                    document.body.appendChild(tooltip);
                }
                const hrStr = cell.dataset.hour ? ` @ ${cell.dataset.hour}:00` : '';
                tooltip.innerHTML = `<span class="tt-date">${cell.dataset.date}${hrStr}</span><span class="tt-sub">Tap & Hold to isolate data</span>`;
                tooltip.style.left = e.pageX + 'px';
                tooltip.style.top = (e.pageY - 40) + 'px';
                tooltip.classList.add('visible');
            });
            cell.addEventListener('mouseleave', () => {
                let tooltip = document.getElementById('temporalTooltip');
                if(tooltip) tooltip.classList.remove('visible');
            });

            const startPress = () => {
                cell.classList.add('active-touch');
                pressTimer = setTimeout(() => {
                    if(cell.dataset.level !== "0" && cell.dataset.date) {
                        if(navigator.vibrate) navigator.vibrate(50);
                        if (window.timelineZoomLevel === 'week' && cell.dataset.hour) {
                            const vData = typeof viewData !== 'undefined' ? viewData : [];
                            const items = vData.filter(i => {
                                const d = new Date(i.timestamp * 1000);
                                const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                return dStr === cell.dataset.date && d.getHours() === parseInt(cell.dataset.hour);
                            }).slice(0, 75);
                            window.showPreviewModal(`Footprint: ${cell.dataset.date} @ ${cell.dataset.hour}:00`, items);
                        } else {
                            if(typeof window.showTimelinePreview === 'function') window.showTimelinePreview(cell.dataset.date);
                        }
                    }
                }, 500);
            };
            const cancelPress = () => { cell.classList.remove('active-touch'); clearTimeout(pressTimer); };
            cell.addEventListener('touchstart', startPress, {passive: true});
            cell.addEventListener('touchend', cancelPress);
            cell.addEventListener('mousedown', startPress);
            cell.addEventListener('mouseup', cancelPress);
        });

    }, "Mapping Temporality");
};

// [26] renderBehavioral() / renderStylometry()
// Purpose: Displays lexical constraints, word lengths, and threat logs for baseline construction.
window.renderStylometry = function() { window.renderBehavioral(); };

window.renderEntities = function() {
    const c = document.getElementById('entities-container');
    if(!c) return;
    
    const entities = { urls: {}, emails: {}, crypto: {}, mentions: {}, hashtags: {} };
    const vData = typeof viewData !== 'undefined' ? viewData : [];
    
    window.executeChunkedRender(vData, (item) => {
        if(!item.forensics) return;
        ['urls', 'emails', 'crypto', 'mentions', 'hashtags'].forEach(type => {
            (item.forensics[type] || []).forEach(val => {
                const cleanVal = val.toLowerCase();
                entities[type][cleanVal] = (entities[type][cleanVal] || 0) + 1;
            });
        });
    }, () => {
        let html = `<div class="comment-card" style="display:block; width:100%; box-sizing: border-box; overflow-x:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin-top:0;">Database Entities</h3>
                <span style="font-size:0.75rem; color:var(--text-muted);">Save directly to Collection for Transforms</span>
            </div>`;
        
        ['emails', 'crypto', 'mentions', 'urls'].forEach(type => {
            const sorted = Object.entries(entities[type]).sort((a,b)=>b[1]-a[1]).slice(0, 50);
            if(sorted.length > 0) {
                html += `<div style="display:block; width:100%; margin-bottom: 15px;">
                            <b style="color:var(--primary); text-transform:uppercase;">${type}</b>
                            <div style="margin-top: 8px; font-size: 0.85rem; display: flex; flex-direction:column; gap: 8px; padding-bottom: 8px; width: 100%;">`;
                sorted.forEach(([val, count]) => {
                    let eType = type === 'emails' ? 'email' : (type === 'crypto' ? 'crypto' : 'url');
                    html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; margin-bottom: 4px; border:1px solid var(--border);">
                                <span class="entity-link btn-nav" style="border:none; padding:0; flex:1; overflow:hidden; text-overflow:ellipsis;" onclick="if(typeof triggerSearch==='function') triggerSearch('${escapeHTML(val)}')">${escapeHTML(val)} <span style="color:var(--text-muted); font-size:0.75rem;">(${count})</span></span>
                                <button class="btn btn-secondary btn-compact" style="border-color:var(--success); color:var(--success); margin-left: 10px;" onclick="if(typeof window.addToCollection==='function') window.addToCollection({id: 'entity_${escapeHTML(val)}', type: 'entity', entityType: '${eType}', value: '${escapeHTML(val)}', timestamp: Date.now()/1000})">💾 Save</button>
                             </div>`;
                });
                html += `   </div></div>`;
            }
        });
        html += `</div>`;
        c.innerHTML = html;
    }, "Extracting Entities");
};

window.renderLocation = function() {
    const c = document.getElementById('location-container');
    if(!c) return;
    const locs = {};
    const vData = typeof viewData !== 'undefined' ? viewData : [];
    
    window.executeChunkedRender(vData, (item) => {
        if(!item.forensics || !item.forensics.locations) return;
        item.forensics.locations.forEach(val => {
            locs[val] = (locs[val] || 0) + 1;
        });
    }, () => {
        const sorted = Object.entries(locs).sort((a,b)=>b[1]-a[1]).slice(0, 100);
        let html = `<div class="comment-card" style="display:block; width:100%; box-sizing: border-box; overflow-x:hidden;">
            <h3 style="margin-top:0;">Geographic & Location Intel</h3>`;
            
        if (sorted.length === 0) {
            html += `<p style="color:var(--text-muted)">No distinct locations extracted.</p>`;
        } else {
            html += `<div style="margin-top: 15px; font-size: 0.85rem; display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 8px; width: 100%;">`;
            sorted.forEach(([val, count]) => {
                html += `<span class="btn-nav" style="flex: 0 0 auto; display: inline-block; white-space: nowrap; border-color: var(--danger); color: var(--text-main);" onclick="if(typeof triggerSearch==='function') triggerSearch('${escapeHTML(val)}')">📍 ${escapeHTML(val)} <span style="opacity:0.5;margin-left:4px;">${count}</span></span>`;
            });
            html += `</div>`;
        }
        html += `</div>`;
        c.innerHTML = html;
    }, "Mapping Coordinates");
};

window.renderBehavioral = function() {
    const c = document.getElementById('behavioral-container');
    if(!c) return;
    
    let stats = { lex: 0, wordLen: 0, punct: 0, caps: 0, count: 0 };
    let threats = [], claims = [], bots = 0, scripts = 0;
    const vData = typeof viewData !== 'undefined' ? viewData : [];
    
    window.executeChunkedRender(vData, (item) => {
        if(!item.forensics) return;
        stats.lex += parseFloat(item.forensics.lexicalRichness || 0);
        stats.wordLen += parseFloat(item.forensics.avgWordLength || 0);
        stats.punct += parseFloat(item.forensics.punctuationRatio || 0);
        stats.caps += parseFloat(item.forensics.capsRatio || 0);
        stats.count++;

        if(item.forensics.threatKeywords) threats.push(...item.forensics.threatKeywords);
        if(item.forensics.personaClaims) claims.push(...item.forensics.personaClaims);
        if(item.forensics.isAdmittedBot) bots++;
        if(item.forensics.foreignScript) scripts++;
    }, () => {
        const sortedClaims = [...new Set(claims)].slice(0, 50);
        const sortedThreats = [...new Set(threats)].slice(0, 50);

        const l = stats.count > 0 ? (stats.lex / stats.count).toFixed(3) : 0;
        const w = stats.count > 0 ? (stats.wordLen / stats.count).toFixed(2) : 0;
        const p = stats.count > 0 ? (stats.punct / stats.count).toFixed(3) : 0;
        const ca = stats.count > 0 ? (stats.caps / stats.count).toFixed(3) : 0;

        c.innerHTML = `
            <div class="comment-card" style="display:block; width:100%; box-sizing:border-box;">
                <h3 style="margin-top:0; color:var(--primary);">Stylometric Profile</h3>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; margin-bottom: 20px;">
                    <div style="background: var(--bg-dark); padding: 10px; border-radius: 8px; cursor:pointer;" onclick="alert('Lexical Richness indicates vocabulary breadth. Higher = more diverse words.')">
                        <div style="font-size:0.75rem; color:var(--text-muted)">Lexical Richness</div>
                        <div style="font-size:1.2rem; font-weight:bold; color:var(--text-main)">${l}</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 10px; border-radius: 8px; cursor:pointer;" onclick="alert('Average Word Length. >5.0 often indicates formal/academic writing.')">
                        <div style="font-size:0.75rem; color:var(--text-muted)">Avg Word Length</div>
                        <div style="font-size:1.2rem; font-weight:bold; color:var(--text-main)">${w}</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 10px; border-radius: 8px; cursor:pointer;" onclick="alert('Punctuation Ratio. High density may indicate erratic typing or heavy URL/code usage.')">
                        <div style="font-size:0.75rem; color:var(--text-muted)">Punctuation Ratio</div>
                        <div style="font-size:1.2rem; font-weight:bold; color:var(--text-main)">${p}</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 10px; border-radius: 8px; cursor:pointer;" onclick="alert('Capitalization Ratio. Abnormal spikes suggest shouting, acronyms, or bot-generated keys.')">
                        <div style="font-size:0.75rem; color:var(--text-muted)">Capitalization Ratio</div>
                        <div style="font-size:1.2rem; font-weight:bold; color:var(--text-main)">${ca}</div>
                    </div>
                </div>

                <div style="display:block; width:100%; word-break:break-word; margin-bottom: 8px;">
                    <b style="color:var(--danger)">Threat / Action Keywords Detected:</b> <span style="color:var(--text-muted);">${threats.length}</span><br>
                    <b>Persona Claims:</b> <span style="color:var(--text-muted);">${claims.length}</span><br>
                    <b>Admitted Bots:</b> <span class="clickable-author" onclick="if(typeof triggerSubSearch === 'function') triggerSubSearch('bot')">${bots}</span><br>
                </div>

                <hr style="border-color:var(--border); margin: 15px 0; width:100%;">
                
                <div style="display:block; width:100%; margin-bottom: 15px;">
                    <b style="color:var(--danger);">Threat Log:</b> <span style="font-size: 0.75rem; color:var(--text-muted);">(Long-press to preview)</span><br>
                    <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
                        ${sortedThreats.map(cl => `<span class="btn-nav popup-preview-trigger" style="border-color:var(--danger); color:var(--danger);" onclick="if(typeof triggerSubSearch === 'function') triggerSubSearch('${escapeHTML(cl)}')">${escapeHTML(cl)}</span>`).join('') || '<span style="color:var(--text-muted);">None</span>'}
                    </div>
                </div>

                <div style="display:block; width:100%;">
                    <b>Claims Log:</b> <span style="font-size: 0.75rem; color:var(--text-muted);">(Long-press to preview)</span><br>
                    <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
                        ${sortedClaims.map(cl => `<span class="btn-nav popup-preview-trigger" onclick="if(typeof triggerSubSearch === 'function') triggerSubSearch('${escapeHTML(cl)}')">${escapeHTML(cl)}</span>`).join('') || '<span style="color:var(--text-muted);">None</span>'}
                    </div>
                </div>
            </div>`;

        const previewBtns = c.querySelectorAll('.popup-preview-trigger');
        previewBtns.forEach(btn => {
            let pressTimer;
            btn.oncontextmenu = (e) => e.preventDefault();
            const startPress = () => {
                pressTimer = setTimeout(() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    const term = btn.innerText.trim();
                    const previewItems = vData.filter(i => i.text.toLowerCase().includes(term.toLowerCase())).slice(0, 50);
                    if (typeof window.showPreviewModal === 'function') window.showPreviewModal(`Occurrences of: ${term}`, previewItems);
                }, 500);
            };
            const cancelPress = () => clearTimeout(pressTimer);
            btn.addEventListener('touchstart', startPress, {passive: true});
            btn.addEventListener('touchend', cancelPress);
            btn.addEventListener('mousedown', startPress);
            btn.addEventListener('mouseup', cancelPress);
            btn.addEventListener('mouseleave', cancelPress);
        });

    }, "Analyzing Behaviors & Stylometry");
};

// [26B] renderWordCloud()
// Purpose: Extracts high-frequency terminology and narrative themes.
window.renderWordCloud = function() {
    const container = document.getElementById('wordcloud-container');
    if(!container) return;
    
    const vData = typeof viewData !== 'undefined' ? viewData : [];
    const sample = vData.slice(0, 50000); 
    const words = {};
    const stopWords = new Set(['the','and','a','to','of','in','i','is','that','it','on','you','this','for','but','with','are','have','be','was','as','they','not','or','at','my','from','if','we','your','all','an','can','so','just','about','has','what','me','will','would','like','there','their', 'out', 'up', 'do', 'don', 'get']);
    
    window.executeChunkedRender(sample, (item) => {
        if(!item || !item.text) return;
        const tokens = item.text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        for(let j=0; j<tokens.length; j++) {
            const t = tokens[j];
            if(!stopWords.has(t)) words[t] = (words[t] || 0) + 1;
        }
    }, () => {
        const sorted = Object.entries(words).sort((a,b) => b[1] - a[1]).slice(0, 150);
        const max = sorted.length ? sorted[0][1] : 1;
        container.innerHTML = "";
        
        container.style.cssText = "display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; overflow-x: hidden;";

        sorted.forEach(([w, c]) => {
            const span = document.createElement('span'); 
            span.className = 'cloud-word';
            const size = 12 + (c / max) * 45; 
            span.style.cssText = `font-size: ${size}px; display: inline-block; white-space: nowrap; line-height: 1; cursor: pointer; color: var(--text-main);`;
            span.innerText = w; 
            span.title = `Used ${c} times`;
            span.onclick = () => { if(typeof triggerSubSearch === 'function') triggerSubSearch(w); };
            container.appendChild(span);
        });
    }, "Extracting terminology");
};