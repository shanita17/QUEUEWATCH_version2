// ─── SEED DATA ───
const branches = [
  {
    id: 1,
    name: "Home Affairs Benoni",
    type: "Home Affairs",
    status: "Very Busy",
    wait: 120,
    reports: 7,
    updated: "8 min ago",
  },
  {
    id: 2,
    name: "SASSA Boksburg Office",
    type: "SASSA",
    status: "Busy",
    wait: 60,
    reports: 4,
    updated: "22 min ago",
  },
  {
    id: 3,
    name: "Kempton Park Licensing",
    type: "Licensing",
    status: "Quiet",
    wait: 20,
    reports: 2,
    updated: "5 min ago",
  },
  {
    id: 4,
    name: "Germiston Clinic",
    type: "Clinic",
    status: "Very Busy",
    wait: 90,
    reports: 11,
    updated: "2 min ago",
  },
  {
    id: 5,
    name: "Home Affairs Alberton",
    type: "Home Affairs",
    status: "System Offline",
    wait: 0,
    reports: 3,
    updated: "1 hr ago",
  },
  {
    id: 6,
    name: "SASSA Thembisa Office",
    type: "SASSA",
    status: "Busy",
    wait: 45,
    reports: 5,
    updated: "14 min ago",
  },
  {
    id: 7,
    name: "Edenvale Licensing Dept",
    type: "Licensing",
    status: "Quiet",
    wait: 15,
    reports: 1,
    updated: "31 min ago",
  },
  {
    id: 8,
    name: "Brakpan Community Clinic",
    type: "Clinic",
    status: "Busy",
    wait: 75,
    reports: 6,
    updated: "9 min ago",
  },
];

const statusMap = {
  Quiet: { cls: "status-quiet", cssVar: "var(--quiet)" },
  Busy: { cls: "status-busy", cssVar: "var(--busy)" },
  "Very Busy": { cls: "status-vbusy", cssVar: "var(--vbusy)" },
  "System Offline": { cls: "status-offline", cssVar: "var(--offline)" },
};

let activeFilter = "all";
let selectedStatus = "";

// ─── HELPERS ───
function waitLabel(w) {
  if (w === 0) return { num: "—", unit: "system down" };
  if (w < 60) return { num: w, unit: "min wait" };
  const h = (w / 60).toFixed(1).replace(".0", "");
  return { num: h, unit: h === "1" ? "hr wait" : "hrs wait" };
}

// ─── RENDER CARDS (with onclick built in) ───
function renderCards(list) {
  const grid = document.getElementById("branchGrid");
  const empty = document.getElementById("emptyState");
  if (!grid) return; // safety: only run on pages that have branchGrid
  grid.innerHTML = "";

  if (!list.length) {
    if (empty) empty.classList.add("show");
    return;
  }
  if (empty) empty.classList.remove("show");

  list.forEach((b) => {
    const s = statusMap[b.status] || statusMap["System Offline"];
    const wl = waitLabel(b.wait);
    const card = document.createElement("div");
    card.className = "branch-card";
    card.style.setProperty("--status-color", s.cssVar);
    card.style.cursor = "pointer";
    card.onclick = () => {
      localStorage.setItem("selectedBranch", JSON.stringify(b));
      window.location.href = "branch.html";
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
        <span class="report-count">${b.reports} report${b.reports !== 1 ? "s" : ""} today</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateStats(list) {
  const qc = document.getElementById("quietCount");
  const bc = document.getElementById("busyCount");
  const vc = document.getElementById("vbusyCount");
  const oc = document.getElementById("offlineCount");
  if (qc) qc.textContent = list.filter((b) => b.status === "Quiet").length;
  if (bc) bc.textContent = list.filter((b) => b.status === "Busy").length;
  if (vc) vc.textContent = list.filter((b) => b.status === "Very Busy").length;
  if (oc)
    oc.textContent = list.filter((b) => b.status === "System Offline").length;
}

function getFiltered() {
  const searchEl = document.getElementById("searchInput");
  const q = searchEl ? searchEl.value.toLowerCase() : "";
  return branches.filter(
    (b) =>
      (activeFilter === "all" || b.type === activeFilter) &&
      (b.name.toLowerCase().includes(q) || b.type.toLowerCase().includes(q)),
  );
}

function filterCards() {
  const filtered = getFiltered();
  renderCards(filtered);
  updateStats(filtered);
}

function setFilter(type, el) {
  activeFilter = type;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  filterCards();
}

// ─── STATUS PICKER ───
function selectStatus(el) {
  document
    .querySelectorAll(".status-opt")
    .forEach((o) => (o.className = "status-opt"));
  const v = el.dataset.val;
  selectedStatus = v;
  const map = {
    Quiet: "quiet",
    Busy: "busy",
    "Very Busy": "vbusy",
    "System Offline": "offline",
  };
  el.classList.add("selected-" + (map[v] || "quiet"));
}

// ─── TOAST ───
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => {
    t.style.display = "none";
  }, 3000);
}

// ─── INIT: only run filterCards on pages that have a branchGrid ───
if (document.getElementById("branchGrid")) {
  filterCards();
}
