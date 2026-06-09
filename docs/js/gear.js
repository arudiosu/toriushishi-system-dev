// =======================================================
// 装備管理
// =======================================================

const GEAR_FIELDS = ["happi_no", "tshirt_size", "tekkou", "hakama", "kimono_top", "kimono_bottom", "memo"];
const GEAR_LABELS = { happi_no: "法被", tshirt_size: "T", tekkou: "手甲", hakama: "はかま", kimono_top: "着物上", kimono_bottom: "着物下", memo: "" };

let gearData = [];
let spareData = [];
let gearEditTargetUserId = null;
let currentGearTab = "members";

function openGearCard() {
    document.getElementById("gearCard").classList.add("active");
    loadGear();
    if (currentGearTab === "spare") loadGearSpare();
}

// ===== タブ切り替え =====
function initGearTabs() {
    document.querySelectorAll(".gear-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".gear-tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".gear-tab-pane").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            currentGearTab = btn.dataset.gearTab;
            const paneId = currentGearTab === "members" ? "gearMembersPane" : "gearSparePane";
            document.getElementById(paneId).classList.add("active");
            if (currentGearTab === "spare") loadGearSpare();
        });
    });
}

// ===== メンバー装備 =====
async function loadGear() {
    const card = document.getElementById("gearCard");
    const overlay = card.querySelector(".loading-overlay");
    overlay.style.display = "flex";
    const res = await callGasApi({ action: "getGear" });
    overlay.style.display = "none";
    if (!res?.success) {
        document.getElementById("gearList").innerHTML = '<p style="padding:16px;color:var(--text-3);">取得失敗</p>';
        return;
    }
    gearData = res.members || [];
    renderGearList();
}

function renderGearList() {
    const list = document.getElementById("gearList");
    if (!gearData.length) { list.innerHTML = '<p style="padding:16px;color:var(--text-3);">メンバーなし</p>'; return; }
    list.innerHTML = "";
    gearData.forEach(m => {
        const g = m.gear || {};
        const item = document.createElement("div");
        item.className = "gear-item";
        const tags = GEAR_FIELDS.filter(f => f !== "memo" && g[f] !== "" && g[f] !== undefined)
            .map(f => `<span class="gear-tag">${GEAR_LABELS[f]}：${escHtml(String(g[f]))}</span>`).join("");
        const memoTag = g.memo ? `<span class="gear-tag gear-tag-memo">${escHtml(String(g.memo))}</span>` : "";
        const isAdmin = typeof userRole !== "undefined" && userRole === "admin";
        item.innerHTML = `
            <div class="gear-item-header">
                <span class="gear-member-name">${escHtml(m.name)}</span>
                ${isAdmin ? `<button class="gear-edit-btn" aria-label="編集"><i class="fas fa-pen"></i></button>` : ""}
            </div>
            <div class="gear-tags">${tags || memoTag ? tags + memoTag : '<span style="color:var(--text-3);font-size:.8rem;">未登録</span>'}</div>
        `;
        if (isAdmin) item.querySelector(".gear-edit-btn").addEventListener("click", () => openGearEdit(m));
        list.appendChild(item);
    });
}

function openGearEdit(member) {
    gearEditTargetUserId = member.userId;
    document.getElementById("gearEditTitle").textContent = `装備編集：${member.name}`;
    const g = member.gear || {};
    GEAR_FIELDS.forEach(f => {
        const el = document.getElementById("gEdit_" + f);
        if (el) el.value = g[f] !== undefined ? String(g[f]) : "";
    });
    document.getElementById("gearEditCard").classList.add("active");
}

async function saveGear() {
    if (!gearEditTargetUserId) return;
    const gear = {};
    GEAR_FIELDS.forEach(f => { gear[f] = document.getElementById("gEdit_" + f)?.value.trim() ?? ""; });
    const btn = document.getElementById("gearSaveBtn");
    btn.disabled = true; btn.textContent = "保存中…";
    const res = await callGasApi({ action: "saveGear", targetUserId: gearEditTargetUserId, gear, userId });
    btn.disabled = false; btn.textContent = "保存";
    if (!res?.success) { alert(res?.msg || "保存失敗"); return; }
    const m = gearData.find(m => m.userId === gearEditTargetUserId);
    if (m) m.gear = gear;
    document.getElementById("gearEditCard").classList.remove("active");
    renderGearList();
}

// ===== 未配布在庫 =====
async function loadGearSpare() {
    const list = document.getElementById("gearSpareList");
    list.innerHTML = '<p style="padding:8px 0;color:var(--text-3);">読み込み中…</p>';
    const res = await callGasApi({ action: "getGearSpare" });
    if (!res?.success) { list.innerHTML = '<p style="color:var(--text-3);">取得失敗</p>'; return; }
    spareData = res.items || [];
    renderSpareList();
    const adminArea = document.getElementById("gearSpareAdminArea");
    if (adminArea) adminArea.style.display = (typeof userRole !== "undefined" && userRole === "admin") ? "block" : "none";
}

function renderSpareList() {
    const list = document.getElementById("gearSpareList");
    const types = ["法被", "Tシャツ", "手甲", "はかま", "着物上", "着物下"];
    if (!spareData.length) { list.innerHTML = '<p style="padding:8px 0;color:var(--text-3);">在庫なし</p>'; return; }
    list.innerHTML = "";
    types.forEach(type => {
        const items = spareData.filter(s => s.item_type === type);
        if (!items.length) return;
        const group = document.createElement("div");
        group.className = "gear-spare-group";
        group.innerHTML = `<div class="gear-spare-type-label">${escHtml(type)}</div>`;
        items.forEach(s => {
            const row = document.createElement("div");
            row.className = "gear-spare-row";
            const isAdmin = typeof userRole !== "undefined" && userRole === "admin";
            row.innerHTML = `
                <span class="gear-spare-value">${escHtml(String(s.value))}</span>
                ${s.memo ? `<span class="gear-spare-memo">${escHtml(String(s.memo))}</span>` : ""}
                ${isAdmin ? `<button class="gear-spare-del-btn" aria-label="削除"><i class="fas fa-trash"></i></button>` : ""}
            `;
            if (isAdmin) row.querySelector(".gear-spare-del-btn").addEventListener("click", () => deleteSpare(s.spare_id));
            group.appendChild(row);
        });
        list.appendChild(group);
    });
}

async function addSpare() {
    const type = document.getElementById("gSpareType").value;
    const value = document.getElementById("gSpareValue").value.trim();
    const memo = document.getElementById("gSpareMemo").value.trim();
    if (!value) { alert("番号・サイズを入力してください"); return; }
    const btn = document.getElementById("gSpareAddBtn");
    btn.disabled = true;
    const res = await callGasApi({ action: "addGearSpare", item_type: type, value, memo, userId });
    btn.disabled = false;
    if (!res?.success) { alert(res?.msg || "追加失敗"); return; }
    document.getElementById("gSpareValue").value = "";
    document.getElementById("gSpareMemo").value = "";
    await loadGearSpare();
}

async function deleteSpare(spare_id) {
    if (!confirm("削除しますか？")) return;
    const res = await callGasApi({ action: "deleteGearSpare", spare_id, userId });
    if (!res?.success) { alert(res?.msg || "削除失敗"); return; }
    await loadGearSpare();
}

document.addEventListener("DOMContentLoaded", () => {
    initGearTabs();
    document.getElementById("gearSaveBtn")?.addEventListener("click", saveGear);
    document.getElementById("gSpareAddBtn")?.addEventListener("click", addSpare);
});
