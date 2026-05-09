/* OSINT PLATFORM: SURGICAL UI UPGRADES (osint-upgrades.js) */
/* Purpose: Safely overrides specific render.js functions to inject new UI elements (Circadian + Subreddit Ingest) without bloating the core file. */

// [OVERRIDE: 21] createCommentCard()
// Purpose: Paints evidence cards. Upgraded to include Circadian Timezone badges and Subreddit Ingest Lightning Bolts.
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
    
    // [CIRCADIAN INJECTION]
    let circadianHtml = '';
    if (item.forensics && item.forensics.utcHour !== undefined) {
        const hour = item.forensics.utcHour;
        const shift = item.forensics.circadianShift || 0;
        const localHour = (hour + shift + 24) % 24;
        
        let phase = "Active";
        let icon = "☀️";
        if (localHour >= 0 && localHour < 6) { phase = "Deep Sleep"; icon = "💤"; }
        else if (localHour >= 6 && localHour < 12) { phase = "Morning"; icon = "🌅"; }
        else if (localHour >= 12 && localHour < 18) { phase = "Afternoon"; icon = "☀️"; }
        else if (localHour >= 18 && localHour < 24) { phase = "Evening"; icon = "🌙"; }
        
        // Use explicit timezone mention if found by parser, otherwise fallback to UTC offset
        const tzLabel = item.forensics.tzMention ? item.forensics.tzMention : "UTC" + (shift >= 0 ? "+" : "") + shift;
        
        circadianHtml = `
            <span class="circadian-badge" style="display:inline-flex; align-items:center; font-size:0.75rem; color:var(--text-muted); background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:2px 8px; margin-left:6px; cursor:help; position:relative; vertical-align:middle;">
                <span class="tz-icon" style="margin-right:4px; font-size:0.8rem;">${icon}</span> ${localHour}:00
                <div class="tz-tooltip" style="visibility:hidden; opacity:0; position:absolute; bottom:120%; left:50%; transform:translateX(-50%); background:var(--bg-panel); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid var(--primary); border-radius:8px; padding:8px; width:max-content; font-size:0.75rem; color:var(--text-main); box-shadow:0 4px 12px rgba(0,0,0,0.6); z-index:100; transition:opacity 0.2s, visibility 0.2s; text-align:left; line-height:1.4;">
                    <span class="tz-tooltip-header" style="font-weight:bold; color:var(--primary); border-bottom:1px solid var(--border); padding-bottom:2px; margin-bottom:4px; display:block;">Temporal Profile</span>
                    <b>Base UTC:</b> ${hour}:00<br>
                    <b>Est. TZ:</b> ${tzLabel}<br>
                    <b>Phase:</b> ${phase}
                </div>
            </span>
        `;
    }
    // [/CIRCADIAN INJECTION]

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
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; flex-wrap:wrap; width:100%;">
                ${dateStr} | <b style="margin-left:4px;">${escapeHTML(subStr)}</b> 
                <span style="cursor:pointer; color: var(--primary); margin-left: 6px; font-size: 1.1em;" title="Ingest Subreddit History" onclick="event.stopPropagation(); if(typeof prepSubredditIngest === 'function') prepSubredditIngest('${escapeHTML(subStr)}', ${item.timestamp});">⚡</span>
                <span style="margin-left:4px;">| Post ID: ${escapeHTML(item.id)}</span> ${circadianHtml}
            </div>
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
                <span>${dateStr.substring(0, 10)} ${circadianHtml}</span>
            </div>
            
            <div class="as-header">
                ${checkboxHtml}
                <span class="as-sub" onclick="if(typeof triggerSubSearch === 'function') triggerSubSearch('${escapeHTML(subStr)}')">r/${escapeHTML(subStr)}</span> 
                <span style="cursor:pointer; color: var(--primary); margin-left: 4px; margin-right: 4px; font-size: 1.1em;" title="Ingest Subreddit History" onclick="event.stopPropagation(); if(typeof prepSubredditIngest === 'function') prepSubredditIngest('${escapeHTML(subStr)}', ${item.timestamp});">⚡</span>
                by <span class="author clickable-author" style="color:var(--text-main);" onclick="if(typeof triggerSearch === 'function') triggerSearch('${escapeHTML(item.author)}')">u/${escapeHTML(item.author)}</span>
                <span style="cursor:pointer; color: var(--warning); margin-left: 6px; font-size: 1.1em;" title="Sync Full Account History via API" onclick="if(typeof fetchFullUserHistory === 'function') fetchFullUserHistory('${escapeHTML(item.author)}');">⚡</span>
            </div>
            
            <div class="as-meta" style="display:flex; align-items:center; flex-wrap:wrap;">
                at ${dateStr} | ID: ${escapeHTML(item.id)} ${circadianHtml}
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
        
        // Quick bind for hover effect dynamically inside the script
        const badge = div.querySelector('.circadian-badge');
        const tooltip = div.querySelector('.tz-tooltip');
        if (badge && tooltip) {
            badge.addEventListener('mouseenter', () => { tooltip.style.visibility = 'visible'; tooltip.style.opacity = '1'; });
            badge.addEventListener('mouseleave', () => { tooltip.style.visibility = 'hidden'; tooltip.style.opacity = '0'; });
        }
        
        wrapper.innerHTML = swipeBg;
        wrapper.appendChild(div);
    }
    return wrapper;
};


// [OVERRIDE: 25] renderTimeline()
// Purpose: Multi-scale heatmap generation + NEW Circadian UTC Histogram block
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
    
    // [CIRCADIAN INJECTION] Keep track of 24h cycle
    const hourCounts = new Array(24).fill(0);

    window.executeChunkedRender(vData, (item) => {
        if (item.timestamp < minTime) minTime = item.timestamp;
        if (item.timestamp > maxTime) maxTime = item.timestamp;
        
        const d = new Date(item.timestamp * 1000);
        
        // Count for the circadian histogram
        hourCounts[d.getUTCHours()]++;
        
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
                    const cellClass = (window.gapFilterMode !== 'all' && typeof window.gapStatusMap !== 'undefined' && level > 0) ? "heatmap-cell gap-alert" : "heatmap-cell";
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

        // [CIRCADIAN INJECTION] Build 24-hour Histogram Block
        const maxHr = Math.max(...hourCounts, 1);
        let hrHtml = `
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--border);">
                <h4 style="margin:0 0 10px 0; font-size:1rem; color:var(--text-main);">Circadian Posting Chart (UTC)</h4>
                <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom: 10px;">A visualization of all activity sorted by hour of the day to isolate sleep cycles.</p>
                <div style="display:flex; height: 80px; align-items:flex-end; gap:3px; width:100%; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:2px;">
                    ${hourCounts.map((h, idx) => `<div style="flex:1; background:var(--primary); height:${(h/maxHr)*100}%; border-radius:3px 3px 0 0; min-height:1px;" title="Hour ${idx} UTC: ${h} posts"></div>`).join('')}
                </div>
                <div style="display:flex; width:100%; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                </div>
            </div>`;

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
                ${hrHtml}
            </div>`;

        // Preserve interactive tooltips
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