/* OSINT PLATFORM: EXTENSIONS CORE (v22.4 - DYNAMIC WORKSPACE TOPOLOGY) */
/* Purpose: Handles persistent Collections, Maltego-style Transforms, and base UX for mobile Context Menus. */

window.osintSystem = {
    trail: [],
    locker: new Set(),
    multiSelect: new Set(),
    authorProfiles: new Map(),
    entityGraphMode: false
};

// [29B] isolateThreadFocus()
// Purpose: Thread Extractor and Filter Override Injection
window.isolateThreadFocus = function(threadId, targetAuthorsJson, exclusive) {
    const authors = JSON.parse(targetAuthorsJson);
    const threadItems = window.globalData.filter(i => String(i.link_id).replace('t3_','') === String(threadId).replace('t3_',''));
    
    if (exclusive) {
        window.filteredData = threadItems.filter(i => authors.includes(i.author) || i.id === String(threadId).replace('t3_',''));
    } else {
        window.filteredData = threadItems;
    }
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.value = "thread:" + threadId;
    
    if(typeof window.updateViewData === 'function') window.updateViewData();
    const targetTab = document.querySelector('[data-target="commentsView"]');
    if(targetTab) targetTab.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// [10B] resetData() / resetApp()
// Purpose: Aggressive Garbage Collection overrides. Clears memory to prevent browser crash during massive view resets.
window.resetData = function() { 
    // Truncate arrays to 0 instead of reassigning to trigger immediate GC
    if (typeof window.globalData !== 'undefined') window.globalData.length = 0; 
    if (typeof window.filteredData !== 'undefined') window.filteredData.length = 0; 
    if (typeof window.viewData !== 'undefined') window.viewData.length = 0; 
    if (typeof window.threadViewData !== 'undefined') window.threadViewData.length = 0; 
    
    if (typeof window.currentInteractionTarget !== 'undefined') window.currentInteractionTarget = ""; 
    
    // Rigorous DOM clearing
    const idsToClear = ['resultsContainer', 'threadsContainer', 'wordcloud-container', 'userTableBody', 'recentUserTableBody', 'interactionsTableBody', 'compare-container', 'cloneResultsContainer', 'behavioral-container', 'networkMap'];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });
    
    const sInput = document.getElementById('searchInput');
    if(sInput) sInput.value = ""; 
    const subInput = document.getElementById('subSearchInput');
    if(subInput) subInput.value = ""; 
    
    if(document.getElementById('interactionsContainer')) document.getElementById('interactionsContainer').style.display = "none"; 
    if(document.getElementById('usersListContainer')) document.getElementById('usersListContainer').style.display = "block"; 
    
    // Purge newly introduced Maps & Physics Engines
    if (typeof window.profilerEvidenceMap !== 'undefined') window.profilerEvidenceMap.clear();
    if(window.networkGraph) { window.networkGraph.destroy(); window.networkGraph = null; }
    if(window.networkNodes) { window.networkNodes.clear(); window.networkNodes = null; }
    if(window.networkEdges) { window.networkEdges.clear(); window.networkEdges = null; }
    window.osintSystem.multiSelect.clear();
};

window.resetApp = function() { 
    window.resetData(); 
    if(typeof clearSessionState === 'function') clearSessionState(); 
    if(document.getElementById('headerControls')) document.getElementById('headerControls').style.display = "none"; 
    if(document.getElementById('tabs')) document.getElementById('tabs').style.display = "none"; 
    if(document.getElementById('clearBtn')) document.getElementById('clearBtn').style.display = "none"; 
    if(document.getElementById('globalIngestBtn')) document.getElementById('globalIngestBtn').style.display = "none"; 
    if(document.getElementById('progress-bar-container')) document.getElementById('progress-bar-container').style.display = "none"; 
    
    // Reset reversed state if active
    document.body.classList.remove('reversed-order', 'compact-mode');
    const sortBtn = document.getElementById('sortToggleBtn');
    if (sortBtn) {
        sortBtn.style.display = 'none';
        sortBtn.style.background = 'var(--secondary)';
        sortBtn.style.color = 'var(--text-main)';
    }

    const statusEl = document.getElementById('status');
    if(statusEl) {
        statusEl.innerText = "Memory completely flushed. Ready for new ingest."; 
        statusEl.style.color = "var(--text-muted)"; 
    }
    history.pushState({ query: "" }, "", window.location.pathname); 
    const commentsTab = document.querySelector('[data-target="commentsView"]');
    if(commentsTab) commentsTab.click(); 
    
    if(typeof window.updateCollectionUI === 'function') window.updateCollectionUI();
};

document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to clear the main dataset feed? (Your Persistent Collection items will remain safely saved.)")) {
                window.resetApp();
            }
        };
    }
});

// [30] addToCollection() / updateCollectionUI()
// Purpose: Universal persistent locker injector. Saves Evidence directly to IndexedDB.
window.addToCollection = function(itemObj) {
    if (!window.collectionDataMap) window.collectionDataMap = new Map();
    if (!window.collectionDataMap.has(itemObj.id)) {
        window.collectionDataMap.set(itemObj.id, itemObj);
        if (typeof window.saveCollectionState === 'function') window.saveCollectionState();
        if (typeof window.updateCollectionUI === 'function') window.updateCollectionUI();
        
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = `Saved ${itemObj.type} to Persistent Collection.`;
            statusEl.style.color = "var(--success)";
            setTimeout(() => { statusEl.style.color = "var(--text-main)"; }, 3000);
        }
    }
};

// [29] attachLongPress() / openContextMenu()
// Purpose: Global Long Press & Mobile UX Context Matrix.
(function initLongPressSystem() {
    let pressTimer;
    let isDragging = false;
    let targetElement = null;

    window.attachLongPress = function() {
        document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.body.addEventListener('touchend', handleTouchEnd);
        document.body.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.body.addEventListener('mousedown', handleTouchStart);
        document.body.addEventListener('mouseup', handleTouchEnd);
        document.body.addEventListener('mousemove', handleTouchMove);
    };

    function handleTouchStart(e) {
        if (e.target.closest('.btn') || e.target.closest('.vis-network')) return;
        isDragging = false;
        targetElement = e.target;
        
        const touch = e.touches ? e.touches[0] : e;
        targetElement.dataset.startX = touch.clientX;
        targetElement.dataset.startY = touch.clientY;

        pressTimer = setTimeout(() => {
            if (!isDragging && targetElement) {
                if (navigator.vibrate) navigator.vibrate(50);
                window.openContextMenu(targetElement, e);
            }
        }, 600);
    }

    function handleTouchMove(e) {
        if (!targetElement) return;
        const touch = e.touches ? e.touches[0] : e;
        const startX = parseFloat(targetElement.dataset.startX || 0);
        const startY = parseFloat(targetElement.dataset.startY || 0);
        if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
            isDragging = true;
            clearTimeout(pressTimer);
        }
    }

    function handleTouchEnd() {
        clearTimeout(pressTimer);
        targetElement = null;
    }
})();

// DYNAMIC CONTEXT MENU
window.openContextMenu = function(target, event) {
    let menu = document.getElementById('osintContextMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'osintContextMenu';
        menu.className = 'osint-context-menu';
        document.body.appendChild(menu);
        
        const overlay = document.createElement('div');
        overlay.id = 'osintOverlay';
        overlay.style.cssText = "display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9998; background:rgba(0,0,0,0.5);";
        overlay.onclick = window.closeContextMenu;
        document.body.appendChild(overlay);
    }

    menu.innerHTML = '<div class="menu-drag-handle" style="width: 40px; height: 5px; background: #555; border-radius: 3px; margin: 5px auto 15px auto;"></div>';
    let options = [];

    if (target.classList.contains('clickable-author') || target.innerText.startsWith('u/')) {
        const user = target.innerText.replace('u/', '').trim();
        window.osintSystem.trail.push(`User: ${user}`);
        options = [
            { label: '📊 Micro Profile', action: () => window.showMicroProfile(user) },
            { label: '💾 Save Profile to Collection', action: () => { window.addToCollection({ id: `profile_${user}`, type: 'profile', value: user, timestamp: Date.now() / 1000 }); window.closeContextMenu(); } },
            { label: '🗂️ Pivot to Entities', action: () => { window.jumpToForensicTab('entitiesView', user); window.closeContextMenu(); } },
            { label: '🌐 Build Interaction Graph', action: () => { window.viewInteractions(user); window.closeContextMenu(); } }
        ];
    } else if (target.closest('.comment-body')) {
        const textNode = target.closest('.comment-body');
        const card = target.closest('.comment-card');
        const header = card ? card.querySelector('.comment-header, .compact-inline-header') : null;
        const author = header ? (header.innerText.match(/u\/([A-Za-z0-9_-]+)/) || [])[1] : "unknown";
        
        options = [
            { label: '💾 Save Evidence to Collection', action: () => { 
                const hash = window.cyrb53Hash ? window.cyrb53Hash(textNode.innerText) : Date.now();
                window.addToCollection({ id: `ev_${hash}`, type: 'evidence', text: textNode.innerText, author: author, timestamp: Date.now() / 1000 });
                window.closeContextMenu(); 
            } },
            { label: '🖨️ Detect Copy-Paste', action: () => { const hash = window.cyrb53Hash ? window.cyrb53Hash(textNode.innerText) : ""; window.triggerSearch(`hash:${hash}`); window.closeContextMenu(); } }
        ];
    } else if (target.classList.contains('entity-link')) {
        const entity = target.innerText.trim();
        window.osintSystem.trail.push(`Entity: ${entity}`);
        let entityType = entity.includes('@') ? 'email' : (entity.startsWith('0x') || entity.length > 25 ? 'crypto' : 'url');
        options = [
            { label: '💾 Save Entity to Collection', action: () => { window.addToCollection({ id: `entity_${entity}`, type: 'entity', entityType: entityType, value: entity, timestamp: Date.now() / 1000 }); window.closeContextMenu(); } },
            { label: '🔗 Pivot to All Mentions', action: () => { window.triggerSearch(`entity:${entity}`); window.closeContextMenu(); } }
        ];
    }

    if (options.length === 0) return;

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.cssText = "display: block; width: 100%; text-align: left; margin-bottom: 8px;";
        btn.innerText = opt.label;
        btn.onclick = (e) => { e.stopPropagation(); opt.action(); };
        menu.appendChild(btn);
    });

    menu.style.cssText = "position: fixed; bottom: 0; left: 0; width: 100%; background: var(--bg-dark); padding: 15px; border-top-left-radius: 16px; border-top-right-radius: 16px; z-index: 9999; box-shadow: 0 -5px 20px rgba(0,0,0,0.8); transform: translateY(0); transition: transform 0.3s ease;";
    document.getElementById('osintOverlay').style.display = 'block';
};

window.closeContextMenu = function() {
    const menu = document.getElementById('osintContextMenu');
    const overlay = document.getElementById('osintOverlay');
    if(menu) menu.style.transform = 'translateY(100%)';
    if(overlay) overlay.style.display = 'none';
};

// [31B] renderCollectionTopology()
// Purpose: Dedicated Collection Graph Topology Engine.
window.renderCollectionTopology = function() {
    const ws = document.getElementById('transformWorkspace');
    if (!ws) return;

    const profiles = Array.from(window.collectionDataMap.values()).filter(v => v.type === 'profile').map(v => v.value);
    if (profiles.length < 2) return;

    const subMap = new Map();
    window.globalData.forEach(item => {
        if (profiles.includes(item.author) && item.subreddit && item.subreddit !== "unknown") {
            if (!subMap.has(item.subreddit)) subMap.set(item.subreddit, new Set());
            subMap.get(item.subreddit).add(item.author);
        }
    });

    const overlappingSubs = Array.from(subMap.entries()).filter(([sub, authors]) => authors.size > 1);

    const nodesMap = new Map();
    const edges = [];

    // Map out the network (Subreddits are hubs, Users connect to them)
    overlappingSubs.forEach(([sub, authors]) => {
        const subId = `sub_${sub}`;
        nodesMap.set(subId, {
            id: subId,
            label: `r/${sub}\n(${authors.size} users)`,
            shape: 'dot',
            size: 15 + (authors.size * 3),
            color: { background: '#ff453a', border: '#ff453a' },
            font: { color: '#f8fafc', size: 12, multi: 'html' },
            borderWidth: 2
        });
        
        authors.forEach(author => {
            const authorId = `user_${author}`;
            if (!nodesMap.has(authorId)) {
                nodesMap.set(authorId, {
                    id: authorId,
                    label: `u/${author}`,
                    shape: 'dot',
                    size: 8,
                    color: { background: '#0a84ff', border: '#fff' },
                    font: { color: '#f8fafc', size: 10 },
                    borderWidth: 1
                });
            }
            edges.push({
                from: authorId,
                to: subId,
                color: { color: 'rgba(255,255,255,0.1)', highlight: '#d1d1d6' },
                smooth: false
            });
        });
    });

    const nodes = Array.from(nodesMap.values());

    ws.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="color:var(--primary); margin:0;">Topological Network: Overlapping Groups</h4>
            <button class="btn btn-secondary btn-compact" onclick="window.runTransform('network-overlap')">Back to Matrix View</button>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">Displaying ${nodes.length} entities and ${edges.length} connections. Blue = Users, Red = Shared Subreddits. Double-tap any node to isolate their data in the main feed.</div>
        <div id="collectionGraphMap" class="glass-panel" style="width: 100%; height: 500px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid var(--border); overflow: hidden;"></div>
    `;

    const container = document.getElementById('collectionGraphMap');
    const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
    const options = {
        nodes: { scaling: { min: 5, max: 30 } },
        physics: {
            barnesHut: { gravitationalConstant: -3000, centralGravity: 0.3, springLength: 100 },
            stabilization: { iterations: 150 }
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };

    const network = new vis.Network(container, data, options);
    network.on("stabilizationIterationsDone", function () { network.setOptions({ physics: false }); });
    
    // Wire up Double-Click Pivot Routing
    network.on("doubleClick", function (params) { 
        if (params.nodes.length > 0) { 
            const clickedNode = params.nodes[0];
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
            
            if (clickedNode.startsWith('sub_')) {
                if (typeof triggerSubSearch === 'function') triggerSubSearch(clickedNode.replace('sub_', ''));
            } else if (clickedNode.startsWith('user_')) {
                if (typeof triggerSearch === 'function') triggerSearch(clickedNode.replace('user_', ''));
            }
        } 
    });
};

// [31] runTransform()
// Purpose: Maltego-style Transform Engine and Collection Dashboard. Analyzes subsets in the locker.
window.runTransform = function(transformType, payloadValue = null, payloadType = null) {
    const ws = document.getElementById('transformWorkspace');
    if (!ws) return;
    
    ws.innerHTML = `<div style="text-align:center; padding: 40px;"><div class="heatmap-cell" style="background:var(--primary); animation: loadingPulse 1s infinite alternate; width:50px; height:5px; margin: 0 auto 15px auto;"></div>Running Analysis Protocol...</div>`;
    
    setTimeout(() => {
        if (transformType === 'user-scanner' && payloadValue) {
            const flag = payloadType === 'email' ? '-e' : '-u';
            const cmd = `user-scanner ${flag} "${payloadValue}"`;
            ws.innerHTML = `
                <h4 style="color:var(--primary); margin-top:0;">Terminal Protocol Generated</h4>
                <p style="color:var(--text-muted); font-size:0.85rem;">Browser sandboxing prevents direct execution of local binaries. Tap the command below to copy it, then paste it into your Termux terminal.</p>
                <div style="background:#000; padding:15px; border-radius:5px; border:1px solid #333; font-family:monospace; color:#0f0; margin-bottom:15px; overflow-x:auto;">${cmd}</div>
                <button class="btn btn-primary" style="width:100%;" onclick="navigator.clipboard.writeText('${cmd.replace(/'/g, "\\'")}').then(()=>alert('Copied to clipboard!'));">📋 Copy Command</button>
            `;
        } else if (transformType === 'network-overlap') {
            const profiles = Array.from(window.collectionDataMap.values()).filter(v => v.type === 'profile').map(v => v.value);
            if (profiles.length < 2) { ws.innerHTML = `<p style="color:var(--warning);">Please save at least 2 profiles to the collection to run an overlap analysis.</p>`; return; }
            
            const subMap = new Map();
            const threadMap = new Map();
            const userMetrics = new Map();
            
            profiles.forEach(p => userMetrics.set(p, { subs: new Set(), threads: new Set(), count: 0 }));

            window.globalData.forEach(item => {
                if (profiles.includes(item.author)) {
                    const um = userMetrics.get(item.author);
                    if (um) {
                        um.count++;
                        if (item.subreddit && item.subreddit !== "unknown") {
                            if (!subMap.has(item.subreddit)) subMap.set(item.subreddit, new Set());
                            subMap.get(item.subreddit).add(item.author);
                            um.subs.add(item.subreddit);
                        }
                        if (item.link_id) {
                            if (!threadMap.has(item.link_id)) threadMap.set(item.link_id, { title: item.link_title || item.link_id, authors: new Set() });
                            threadMap.get(item.link_id).authors.add(item.author);
                            um.threads.add(item.link_id);
                        }
                    }
                }
            });

            const overlappingSubs = Array.from(subMap.entries()).filter(([sub, authors]) => authors.size > 1).sort((a,b) => b[1].size - a[1].size);
            const overlappingThreads = Array.from(threadMap.entries()).filter(([tid, data]) => data.authors.size > 1).sort((a,b) => b[1].authors.size - a[1].authors.size);
            
            let html = `<div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="color:var(--primary); margin:0;">Network & Thread Overlap Analysis</h4>
                            <div style="display:flex; gap: 8px;">
                                <button class="btn btn-primary btn-compact" onclick="window.renderCollectionTopology()">🕸️ View Topology</button>
                                <button class="btn btn-secondary btn-compact" onclick="window.updateCollectionUI()">Back</button>
                            </div>
                        </div>`;
            html += `<p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Comparing ${profiles.length} mapped subjects.</p><hr style="border-color:var(--border);">`;
            
            html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px;">`;
            Array.from(userMetrics.entries()).sort((a, b) => b[1].count - a[1].count).forEach(([author, data]) => {
                html += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:3px solid var(--primary);">
                    <b style="color:var(--text-main);">u/${window.escapeHTML(author)}</b><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">Items: ${data.count} | Subs: ${data.subs.size} | Threads: ${data.threads.size}</span>
                </div>`;
            });
            html += `</div>`;

            html += `<h5 style="color:var(--text-main); margin-bottom: 8px;">Shared Threads / Operations (${overlappingThreads.length})</h5>`;
            if (overlappingThreads.length === 0) {
                html += `<p style="color:var(--text-muted); font-size:0.85rem;">No specific threads shared between these users.</p>`;
            } else {
                html += `<div style="max-height: 200px; overflow-y:auto; padding-right:5px; margin-bottom:20px;">`;
                overlappingThreads.forEach(([tid, data]) => {
                    const authorJson = JSON.stringify(Array.from(data.authors)).replace(/'/g, "\\'");
                    html += `<div style="margin-bottom:10px; background:rgba(0,0,0,0.4); padding:10px; border-radius:6px; border: 1px solid var(--border);">
                                <div style="margin-bottom:8px;"><b style="color:var(--text-main); font-size:0.9rem;">${window.escapeHTML(data.title)}</b></div>
                                <div style="font-size:0.8rem; color:var(--warning); margin-bottom:8px;">Participants: ${Array.from(data.authors).join(', ')}</div>
                                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                                    <button class="btn btn-primary btn-compact" onclick="window.isolateThreadFocus('${tid}', '${authorJson}', true)">Isolate Targets Only</button>
                                    <button class="btn btn-secondary btn-compact" onclick="window.isolateThreadFocus('${tid}', '${authorJson}', false)">View Full Context</button>
                                </div>
                             </div>`;
                });
                html += `</div>`;
            }

            html += `<h5 style="color:var(--text-main); margin-bottom: 8px;">Shared Groups (${overlappingSubs.length})</h5>`;
            if (overlappingSubs.length === 0) { html += `<p style="color:var(--danger); font-size:0.85rem;">No shared subreddits found.</p>`; } 
            else {
                html += `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
                overlappingSubs.forEach(([sub, authors]) => {
                    html += `<div style="background:rgba(255,255,255,0.05); padding:6px 10px; border-radius:6px; font-size:0.85rem; border:1px solid var(--border);">
                                <b style="color:var(--text-main);">r/${window.escapeHTML(sub)}</b> <span style="color:var(--text-muted);">(${authors.size} users)</span>
                             </div>`;
                });
                html += `</div>`;
            }
            ws.innerHTML = html;
        } else if (transformType === 'clone-check') {
            const profiles = Array.from(window.collectionDataMap.values()).filter(v => v.type === 'profile').map(v => v.value);
            if (profiles.length < 2) { ws.innerHTML = `<p style="color:var(--warning);">Please save at least 2 profiles to run a clone check.</p>`; return; }
            
            document.querySelector('[data-target="similarityView"]').click();
            document.getElementById('cloneSearchInput').value = profiles[0];
            if(typeof window.runCloneAnalysis === 'function') window.runCloneAnalysis();
            ws.innerHTML = `<p style="color:var(--success);">Analysis diverted to Clone Engine...</p>`;
        } else if (transformType === 'gap-check') {
            const profiles = Array.from(window.collectionDataMap.values()).filter(v => v.type === 'profile').map(v => v.value);
            if (profiles.length < 2) { ws.innerHTML = `<p style="color:var(--warning);">Please save at least 2 profiles to run a gap check.</p>`; return; }
            
            document.querySelector('[data-target="compareView"]').click();
            document.getElementById('compareUserInput1').value = profiles[0];
            document.getElementById('compareUserInput2').value = profiles[1];
            if(typeof window.renderCompare === 'function') window.renderCompare();
            ws.innerHTML = `<p style="color:var(--success);">Analysis diverted to Temporal Matrix...</p>`;
        }
    }, 400);
};

window.updateCollectionUI = function() {
    if(document.getElementById('collectionCount')) document.getElementById('collectionCount').innerText = (window.collectionDataMap ? window.collectionDataMap.size : 0);
    const container = document.getElementById('collectionContainer');
    if(!container) return;

    if (!window.collectionDataMap || window.collectionDataMap.size === 0) {
        container.innerHTML = `<div class="comment-card" style="text-align:center; padding:30px; color:var(--text-muted);">Collection locker is empty. Long-press elements in the feeds to save them here.</div>`;
        return;
    }

    let profiles = [], entities = [], evidence = [];
    window.collectionDataMap.forEach(v => {
        if(v.type === 'profile') profiles.push(v);
        else if(v.type === 'entity') entities.push(v);
        else evidence.push(v);
    });

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; width:100%;">
            <h3 style="margin:0; color:var(--primary);">Workspace Transforms</h3>
            <button class="btn btn-danger btn-compact" style="border:1px solid var(--danger);" onclick="if(confirm('Are you sure you want to completely wipe the Persistent Collection? This cannot be undone.')) { window.collectionDataMap.clear(); window.saveCollectionState(); window.updateCollectionUI(); }">🗑️ Clear Collection</button>
        </div>
        
        <div style="display:flex; flex-wrap:wrap; gap:15px; width:100%; box-sizing:border-box;">
            <div style="flex:1; min-width:300px; display:flex; flex-direction:column; gap:15px;">
                <div class="comment-card" style="margin:0;">
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0; margin-bottom:10px;">Run advanced analysis across all saved data points.</p>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        <button class="btn btn-secondary" onclick="window.runTransform('network-overlap')" title="Find shared subreddits and threads">🕸️ Thread & Group Overlap Matrix</button>
                        <button class="btn btn-secondary" onclick="window.runTransform('gap-check')" title="Align inactivity/sleep gaps">⏱️ Temporal Gap Sync</button>
                        <button class="btn btn-secondary" onclick="window.runTransform('clone-check')" title="Compare N-Gram Fingerprints">🧬 Linguistic Stylometry</button>
                    </div>
                </div>

                <div id="transformWorkspace" class="glass-panel" style="padding:15px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.4); min-height: 200px;">
                    <div style="color:var(--text-muted); text-align:center; margin-top:50px;">Select an Entity or Macro Transform to begin analysis.</div>
                </div>
            </div>

            <div style="flex:1; min-width:300px; display:flex; flex-direction:column; gap:15px;">
                <div class="comment-card" style="margin:0;">
                    <h4 style="margin-top:0; color:var(--text-main); border-bottom:1px solid var(--border); padding-bottom:5px;">Saved Profiles (${profiles.length})</h4>
                    <div style="max-height: 200px; overflow-y:auto; padding-right:5px;">
                        ${profiles.map(p => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; margin-bottom:6px; border-radius:4px;">
                                <b class="clickable-author" onclick="if(typeof triggerSearch==='function') triggerSearch('${window.escapeHTML(p.value)}')">u/${window.escapeHTML(p.value)}</b>
                                <div style="display:flex; gap:5px;">
                                    <button class="btn btn-secondary btn-compact" onclick="window.runTransform('user-scanner', '${window.escapeHTML(p.value)}', 'username')" title="Send to CLI">⚡ Scan</button>
                                    <button class="btn btn-danger btn-compact" onclick="window.collectionDataMap.delete('${p.id}'); window.updateCollectionUI(); window.saveCollectionState();">X</button>
                                </div>
                            </div>
                        `).join('') || '<div style="color:var(--text-muted); font-size:0.85rem;">No profiles saved.</div>'}
                    </div>
                </div>

                <div class="comment-card" style="margin:0;">
                    <h4 style="margin-top:0; color:var(--text-main); border-bottom:1px solid var(--border); padding-bottom:5px;">Saved Entities (${entities.length})</h4>
                    <div style="max-height: 200px; overflow-y:auto; padding-right:5px;">
                        ${entities.map(e => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; margin-bottom:6px; border-radius:4px;">
                                <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:10px;">
                                    <span style="font-size:0.7rem; color:var(--warning); text-transform:uppercase;">[${e.entityType}]</span><br>
                                    <b class="entity-link" style="font-size:0.9rem;">${window.escapeHTML(e.value)}</b>
                                </div>
                                <div style="display:flex; gap:5px;">
                                    ${e.entityType === 'email' ? `<button class="btn btn-secondary btn-compact" onclick="window.runTransform('user-scanner', '${window.escapeHTML(e.value)}', 'email')" title="Send to CLI">⚡ Scan</button>` : ''}
                                    <button class="btn btn-danger btn-compact" onclick="window.collectionDataMap.delete('${e.id}'); window.updateCollectionUI(); window.saveCollectionState();">X</button>
                                </div>
                            </div>
                        `).join('') || '<div style="color:var(--text-muted); font-size:0.85rem;">No entities saved.</div>'}
                    </div>
                </div>

                <div class="comment-card" style="margin:0;">
                    <h4 style="margin-top:0; color:var(--text-main); border-bottom:1px solid var(--border); padding-bottom:5px;">Saved Evidence Items (${evidence.length})</h4>
                    <div style="max-height: 400px; overflow-y:auto; padding-right:5px;">
                        ${evidence.map(item => `
                            <div style="background:rgba(255,255,255,0.05); padding:10px; margin-bottom:8px; border-radius:6px; border-left:3px solid var(--primary);">
                                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:5px;">
                                    <span><b style="color:var(--text-main);">u/${window.escapeHTML(item.author || item.value || 'unknown')}</b></span>
                                    <button class="btn btn-danger btn-compact" style="padding:2px 6px;" onclick="window.collectionDataMap.delete('${item.id}'); window.updateCollectionUI(); window.saveCollectionState();">X</button>
                                </div>
                                <div style="font-size:0.85rem; line-height:1.4; color:var(--text-main); word-break:break-word;">
                                    ${window.escapeHTML(item.text || item.value || '')}
                                </div>
                            </div>
                        `).join('') || '<div style="color:var(--text-muted); font-size:0.85rem;">No text evidence saved.</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
};

// Bootstrap Context Events
document.addEventListener('DOMContentLoaded', () => { window.attachLongPress(); });