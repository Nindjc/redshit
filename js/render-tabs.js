/* OSINT PLATFORM: HEAVY ANALYTICAL TABS RENDERER (render-tabs.js) */
/* Purpose: Offloaded from render.js to preserve garbage collection thresholds. Paints Timelines, Word Clouds, and Demographic Inference views. */

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
    const escapedTerms = allServices.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
    
    const vData = typeof window.viewData !== 'undefined' ? window.viewData : [];
    let hits = [];
    
    window.executeChunkedRender(vData, (item) => {
        if(!item.text) return;
        const matches = item.text.match(regex);
        if(matches && matches.length > 0) {
            const uniqueMatches = [...new Set(matches.map(m=>m.toUpperCase()))];
            
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