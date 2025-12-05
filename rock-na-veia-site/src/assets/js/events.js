// events.js — renders a simple calendar and upcoming events list
document.addEventListener('DOMContentLoaded', function() {
    initEventsPage();
});

async function initEventsPage(){
    try{
        const res = await fetch('../data/events.json');
        const json = await res.json();
        // Support both shapes: { events: [...] } or [...]
        const events = Array.isArray(json) ? json : (json.events || []);

        // Normalize and parse dates
        const parsed = events.map(e => ({
            ...e,
            dateObj: parseDate(e.date),
        })).filter(e => e.dateObj);

        parsed.sort((a,b)=> a.dateObj - b.dateObj);

        renderUpcomingList(parsed, 6);
        renderCalendar(parsed);
    }catch(err){
        console.error('Erro ao carregar eventos:', err);
    }
}

function parseDate(dateStr){
    if(!dateStr) return null;
    // Expecting YYYY-MM-DD
    const parts = dateStr.split('-').map(Number);
    if(parts.length < 3) return null;
    // months in Date are 0-based
    return new Date(parts[0], parts[1]-1, parts[2]);
}

function renderUpcomingList(events, limit=5){
    const container = document.getElementById('events');
    if(!container) return;
    container.innerHTML = '';

    const today = new Date();
    const upcoming = events.filter(e => e.dateObj >= startOfDay(today));

    if(upcoming.length === 0){
        container.innerHTML = '<li class="list-group-item">Sem eventos programados no momento.</li>';
        return;
    }

    upcoming.slice(0, limit).forEach(e => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-start';
        li.innerHTML = `
            <div class="ms-2 me-auto">
                <div class="fw-bold">${escapeHtml(e.title || e.location)}</div>
                <div class="text-muted-2 small">${formatDate(e.dateObj)} • ${e.time || ''} — ${escapeHtml(e.city || '')}</div>
            </div>
            <div class="d-flex flex-column align-items-end">
                <a class="btn btn-sm btn-outline-primary mb-2" href="${e.ticketLink || '#'}" target="_blank">Ingressos</a>
                <button class="btn btn-sm btn-outline-secondary" data-event-date="${e.date}">Ver no calendário</button>
            </div>
        `;
        container.appendChild(li);
    });

    // Add click handlers for 'Ver no calendário' buttons
    container.querySelectorAll('button[data-event-date]').forEach(btn => {
        btn.addEventListener('click', () => {
            const date = btn.getAttribute('data-event-date');
            highlightDateInCalendar(date);
        });
    });
}

function renderCalendar(events){
    const calRoot = document.getElementById('calendar');
    if(!calRoot) return;

    // Build a simple month selector + grid
    const now = new Date();
    // Default to current month/year
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth();

    // If there are upcoming events, default calendar to the month of the next upcoming event.
    const today = startOfDay(new Date());
    const upcoming = events.filter(e => e.dateObj >= today);
    if(upcoming.length > 0){
        currentYear = upcoming[0].dateObj.getFullYear();
        currentMonth = upcoming[0].dateObj.getMonth();
    } else if(events.length > 0){
        // else default to first event's month (useful if all events are historical)
        currentYear = events[0].dateObj.getFullYear();
        currentMonth = events[0].dateObj.getMonth();
    }

    function draw(){
        calRoot.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center mb-3';
        header.innerHTML = `
            <div>
                <button class="btn btn-sm btn-outline-secondary me-2" id="prevMonth">&larr;</button>
                <button class="btn btn-sm btn-outline-secondary" id="nextMonth">&rarr;</button>
            </div>
            <div class="fw-bold">${monthName(currentMonth)} ${currentYear}</div>
            <div></div>
        `;
        calRoot.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Weekday headers
        const weekdays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const wkHeader = document.createElement('div');
        wkHeader.className = 'd-grid';
        wkHeader.style.gridTemplateColumns = 'repeat(7, 1fr)';
        weekdays.forEach(w => {
            const el = document.createElement('div');
            el.className = 'text-center small text-muted-2';
            el.textContent = w;
            wkHeader.appendChild(el);
        });
        grid.appendChild(wkHeader);

        // Days
        const first = new Date(currentYear, currentMonth, 1);
        const startDay = first.getDay();
        const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();

        const cells = document.createElement('div');
        cells.className = 'd-grid gap-2';
        cells.style.gridTemplateColumns = 'repeat(7, 1fr)';

        // empty cells before first day
        for(let i=0;i<startDay;i++){
            const empty = document.createElement('div');
            empty.className = 'p-2';
            cells.appendChild(empty);
        }

        // map events by date string YYYY-MM-DD
        const map = {};
        events.forEach(e=>{
            if(!e.date) return;
            map[e.date] = map[e.date] || [];
            map[e.date].push(e);
        });

        for(let d=1; d<=daysInMonth; d++){
            const dateStr = formatISODate(new Date(currentYear, currentMonth, d));
            const dayEl = document.createElement('div');
            dayEl.className = 'p-2 border rounded text-center calendar-day';
            dayEl.setAttribute('data-date', dateStr);
            dayEl.innerHTML = `<div class="d-flex justify-content-between align-items-start"><small class="text-muted-2">${d}</small></div>`;

            if(map[dateStr]){
                const badge = document.createElement('span');
                badge.className = 'badge bg-primary mt-2';
                badge.textContent = map[dateStr].length;
                dayEl.appendChild(badge);
                dayEl.classList.add('calendar-has-event');
            }

            dayEl.addEventListener('click', ()=> showEventsForDate(dateStr, map[dateStr] || []));
            cells.appendChild(dayEl);
        }

        grid.appendChild(cells);
        calRoot.appendChild(grid);

        document.getElementById('prevMonth').addEventListener('click', ()=>{ currentMonth--; if(currentMonth<0){currentMonth=11; currentYear--;} draw(); });
        document.getElementById('nextMonth').addEventListener('click', ()=>{ currentMonth++; if(currentMonth>11){currentMonth=0; currentYear++;} draw(); });
    }

    draw();
}

function showEventsForDate(dateStr, events){
    const modalId = 'eventsForDateModal';
    let modal = document.getElementById(modalId);
    if(!modal){
        modal = document.createElement('div');
        modal.id = modalId;
        modal.innerHTML = `
            <div class="card p-3" id="events-date-card">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="fw-bold" id="events-date-title"></div>
                    <button class="btn btn-sm btn-outline-secondary" id="closeEventsDate">Fechar</button>
                </div>
                <div id="events-date-list"></div>
            </div>
        `;
        const calRoot = document.getElementById('calendar');
        calRoot.appendChild(modal);
        document.getElementById('closeEventsDate').addEventListener('click', ()=> modal.remove());
    }

    document.getElementById('events-date-title').textContent = formatReadableDate(dateStr);
    const list = document.getElementById('events-date-list');
    list.innerHTML = '';
    if(!events || events.length === 0){
        list.innerHTML = '<div class="text-muted-2">Nenhum evento neste dia.</div>';
        return;
    }
    events.forEach(e => {
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = `<div class="fw-bold">${escapeHtml(e.title || e.location)}</div>
                         <div class="text-muted-2 small">${e.time || ''} — ${escapeHtml(e.city || '')}</div>
                         <a class="btn btn-sm btn-link" href="${e.ticketLink || '#'}" target="_blank">Ingressos</a>`;
        list.appendChild(div);
    });
}

function highlightDateInCalendar(dateStr){
    const el = document.querySelector(`[data-date='${dateStr}']`);
    if(!el) return;
    el.classList.add('border-primary');
    el.scrollIntoView({behavior:'smooth', block:'center'});
    // flash effect
    el.style.transition = 'box-shadow .4s';
    el.style.boxShadow = '0 6px 20px rgba(13,110,253,0.12)';
    setTimeout(()=>{ el.style.boxShadow = ''; }, 1500);
}

/* Helpers */
function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function formatDate(d){ return d.toLocaleDateString('pt-BR'); }
function formatISODate(d){ return d.toISOString().slice(0,10); }
function monthName(m){ return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]; }
function formatReadableDate(iso){ return (new Date(iso)).toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric'}); }
function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }