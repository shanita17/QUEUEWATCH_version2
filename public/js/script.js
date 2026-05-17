// ─── script.js — QueueWatch SA Frontend ───

const statusMap = {
  "Quiet":          { cls: "status-quiet",   cssVar: "var(--quiet)"   },
  "Busy":           { cls: "status-busy",    cssVar: "var(--busy)"    },
  "Very Busy":      { cls: "status-vbusy",   cssVar: "var(--vbusy)"   },
  "System Offline": { cls: "status-offline", cssVar: "var(--offline)" },
};

let branches     = [];
let activeFilter = 'all';

// ─── HELPERS ───
function waitLabel(w) {
  if (!w || w === 0) return { num: '—', unit: 'no reports yet' };
  if (w < 60)        return { num: w,   unit: 'min wait' };
  const h = (w / 60).toFixed(1).replace('.0', '');
  return { num: h, unit: h === '1' ? 'hr wait' : 'hrs wait' };
}

function timeAgo(dateStr) {
  if (!dateStr) return 'no reports yet';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff} min ago`;
  const h = Math.floor(diff / 60);
  return `${h} hr${h > 1 ? 's' : ''} ago`;
}

// ─── FETCH BRANCHES FROM API ───
async function loadBranches() {
  try {
    const res  = await fetch('/api/branches');
    const data = await res.json();
    branches = data.map(b => ({
      id:      b.BranchID,
      name:    b.Name,
      type:    b.Type,
      address: b.Address,
      lat:     b.Latitude,
      lng:     b.Longitude,
      status:  b.Status || 'System Offline',
      wait:    b.AvgWait || 0,
      reports: b.ReportsToday || 0,
      updated: timeAgo(b.LastReportAt),
    }));
    filterCards();
  } catch (err) {
    console.error('Failed to load branches:', err);
    showToast(' Could not load branches. Is the server running?');
  }
}

// ─── RENDER CARDS ───
function renderCards(list) {
  const grid  = document.getElementById('branchGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;
  grid.innerHTML = '';

  if (!list.length) {
    if (empty) empty.classList.add('show');
    return;
  }
  if (empty) empty.classList.remove('show');

  list.forEach(b => {
    const s  = statusMap[b.status] || statusMap["System Offline"];
    const wl = waitLabel(b.wait);
    const card = document.createElement('div');
    card.className = 'branch-card';
    card.style.setProperty('--status-color', s.cssVar);
    card.style.cursor = 'pointer';
    card.onclick = () => {
      localStorage.setItem('selectedBranch', JSON.stringify(b));
      window.location.href = 'branch.html';
    };
    card.innerHTML = `
      <div class="card-top">
        <div class="branch-name">${b.name}</div>
        <div class="status-badge ${s.cls}">${b.status}</div>
      </div>
      <div class="branch-type">${b.type}</div>
      <div class="wait-display">
        <span class="wait-number">${wl.num}</span>
        <span class="wait-unit">${wl.unit}</span>
      </div>
      <div class="card-footer">
        <span class="last-update">Updated ${b.updated}</span>
        <span class="report-count">${b.reports} report${b.reports !== 1 ? 's' : ''} today</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateStats(list) {
  const qc = document.getElementById('quietCount');
  const bc = document.getElementById('busyCount');
  const vc = document.getElementById('vbusyCount');
  const oc = document.getElementById('offlineCount');
  if (qc) qc.textContent = list.filter(b => b.status === 'Quiet').length;
  if (bc) bc.textContent = list.filter(b => b.status === 'Busy').length;
  if (vc) vc.textContent = list.filter(b => b.status === 'Very Busy').length;
  if (oc) oc.textContent = list.filter(b => b.status === 'System Offline').length;
}

function getFiltered() {
  const searchEl = document.getElementById('searchInput');
  const q = searchEl ? searchEl.value.toLowerCase() : '';
  return branches.filter(b =>
    (activeFilter === 'all' || b.type === activeFilter) &&
    (b.name.toLowerCase().includes(q) || b.type.toLowerCase().includes(q))
  );
}

function filterCards() {
  const filtered = getFiltered();
  renderCards(filtered);
  updateStats(filtered);
}

function setFilter(type, el) {
  activeFilter = type;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  filterCards();
}

// ─── TOAST ───
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent   = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

// ─── INIT ───
if (document.getElementById('branchGrid')) {
  loadBranches();
}
