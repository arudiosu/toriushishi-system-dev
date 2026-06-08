/* =======================================================
  お旅管理
======================================================= */
let otabiPlaces = [];
let otabiSchedule = [];
let otabiYear = new Date().getFullYear();
let otabiGroup = "A";

// ===========================
// カードを開く
// ===========================
function openOtabiCard() {
    const card = document.getElementById("otabiCard");
    card.classList.add("active");
    initOtabiYearSelect();
    loadOtabiPlaces();
}

function initOtabiYearSelect() {
    const sel = document.getElementById("otabiYearSelect");
    if (!sel || sel.options.length) return;
    const y = new Date().getFullYear();
    for (let i = y - 2; i <= y + 2; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = i + "年";
        if (i === y) opt.selected = true;
        sel.appendChild(opt);
    }
    sel.addEventListener("change", () => { otabiYear = Number(sel.value); loadOtabiSchedule(); });
    const grpSel = document.getElementById("otabiGroupSelect");
    if (grpSel) grpSel.addEventListener("change", () => { otabiGroup = grpSel.value; loadOtabiSchedule(); });
}

// ===========================
// タブ切り替え
// ===========================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("otabiCard")?.addEventListener("click", e => {
        const btn = e.target.closest(".otabi-tab-btn");
        if (!btn) return;
        const tab = btn.dataset.otabiTab;
        document.querySelectorAll(".otabi-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".otabi-tab-content").forEach(c => c.classList.remove("active"));
        document.getElementById("otabi" + tab.charAt(0).toUpperCase() + tab.slice(1) + "Tab")?.classList.add("active");

        if (tab === "schedule") loadOtabiSchedule();
        if (tab === "donation") loadOtabiDonations();
    });

    // 場所追加ボタン
    document.getElementById("addPlaceBtn")?.addEventListener("click", () => openPlaceForm());
    // 場所保存
    document.getElementById("savePlaceBtn")?.addEventListener("click", savePlace);
    // スケジュール一括入力ボタン
    document.getElementById("addEntryBtn")?.addEventListener("click", openBulkEntryForm);
    // スケジュール追加行
    document.getElementById("addBulkRowBtn")?.addEventListener("click", () => {
        const rows = document.querySelectorAll(".otabi-bulk-row").length;
        addBulkRow(rows + 1);
    });
    // 一括保存
    document.getElementById("saveBulkEntriesBtn")?.addEventListener("click", saveBulkEntries);
    // スケジュール1件保存
    document.getElementById("saveEntryBtn")?.addEventListener("click", saveEntry);
    // 前年コピー
    document.getElementById("copyScheduleBtn")?.addEventListener("click", copySchedule);
});

// ===========================
// 場所管理
// ===========================
async function loadOtabiPlaces() {
    const res = await callGasApi({ action: "getOtabiPlaces" });
    if (res?.success) {
        otabiPlaces = res.places || [];
        renderOtabiPlaces();
    }
}

function renderOtabiPlaces() {
    const list = document.getElementById("otabiPlacesList");
    if (!list) return;
    list.innerHTML = "";
    otabiPlaces.forEach(p => {
        const div = document.createElement("div");
        div.className = "otabi-place-item";
        const mapLink = p.address
            ? `<a class="otabi-map-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}" target="_blank" rel="noopener"><i class="fas fa-map-marker-alt"></i> 地図</a>`
            : "";
        div.innerHTML = `
            <div class="otabi-place-info">
                <span class="otabi-place-name">${p.name}</span>
                <span class="otabi-place-address">${p.address || ""}</span>
                ${mapLink}
            </div>
            <div class="otabi-place-actions">
                <button class="otabi-edit-btn" data-place-id="${p.place_id}">編集</button>
                <button class="otabi-delete-btn" data-place-id="${p.place_id}">削除</button>
            </div>
        `;
        div.querySelector(".otabi-edit-btn").addEventListener("click", () => openPlaceForm(p));
        div.querySelector(".otabi-delete-btn").addEventListener("click", () => deletePlace(p.place_id));
        list.appendChild(div);
    });
}

function openPlaceForm(place = null) {
    document.getElementById("placeId").value = place?.place_id || "";
    document.getElementById("placeName").value = place?.name || "";
    document.getElementById("placeAddress").value = place?.address || "";
    document.getElementById("placeMemo").value = place?.memo || "";
    document.getElementById("otabiPlaceFormCard").classList.add("active");
}

async function savePlace() {
    const id = document.getElementById("placeId").value;
    const name = document.getElementById("placeName").value.trim();
    if (!name) return alert("場所名を入力してください");
    const data = {
        place_id: id || null,
        name,
        address: document.getElementById("placeAddress").value.trim(),
        memo: document.getElementById("placeMemo").value.trim()
    };
    const res = await callGasApi({ action: "saveOtabiPlace", place: data });
    if (res?.success) {
        document.getElementById("otabiPlaceFormCard").classList.remove("active");
        await loadOtabiPlaces();
    } else {
        alert("保存に失敗しました");
    }
}

async function deletePlace(placeId) {
    if (!confirm("削除しますか？")) return;
    const res = await callGasApi({ action: "deleteOtabiPlace", placeId });
    if (res?.success) await loadOtabiPlaces();
    else alert("削除に失敗しました");
}

// ===========================
// スケジュール管理
// ===========================
async function loadOtabiSchedule() {
    const fetches = [callGasApi({ action: "getOtabiSchedule", year: otabiYear, group: otabiGroup })];
    if (!otabiPlaces.length) fetches.push(callGasApi({ action: "getOtabiPlaces" }));
    const [schedRes, placesRes] = await Promise.all(fetches);
    if (placesRes?.success) otabiPlaces = placesRes.places || [];
    if (schedRes?.success) {
        otabiSchedule = schedRes.schedule || [];
        renderOtabiSchedule();
    }
}

function renderOtabiSchedule() {
    const list = document.getElementById("otabiScheduleList");
    if (!list) return;
    list.innerHTML = "";
    if (!otabiSchedule.length) {
        list.innerHTML = "<div class='otabi-empty'>スケジュールなし</div>";
        return;
    }
    otabiSchedule.forEach(e => {
        const place = otabiPlaces.find(p => p.place_id == e.place_id);
        const mapBtn = place?.address
            ? `<a class="otabi-map-icon" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" target="_blank" rel="noopener" title="地図を見る"><i class="fas fa-map-marker-alt"></i></a>`
            : "";
        const div = document.createElement("div");
        div.className = "otabi-schedule-item";
        div.dataset.entryId = e.entry_id;
        div.innerHTML = `
            <span class="otabi-entry-no">${e.no || ""}</span>
            <span class="otabi-entry-time">${e.time || ""}</span>
            <span class="otabi-entry-place">${e.place_name || place?.name || ""}</span>
            ${mapBtn}
            <span class="otabi-entry-donation">${e.donation ? "¥" + Number(e.donation).toLocaleString() : ""}</span>
            <button class="otabi-edit-btn otabi-entry-edit" data-entry-id="${e.entry_id}">編集</button>
            <button class="otabi-delete-btn otabi-entry-delete" data-entry-id="${e.entry_id}">削除</button>
        `;
        div.querySelector(".otabi-entry-edit").addEventListener("click", ev => {
            ev.stopPropagation();
            openEntryForm(e);
        });
        div.querySelector(".otabi-entry-delete").addEventListener("click", ev => {
            ev.stopPropagation();
            deleteEntry(e.entry_id);
        });
        list.appendChild(div);
    });
}

function populatePlaceSelect(selectEl, selectedId) {
    selectEl.innerHTML = '<option value="">場所を選択</option>';
    otabiPlaces.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.place_id;
        opt.textContent = p.name;
        if (p.place_id == selectedId) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

function openEntryForm(entry = null) {
    document.getElementById("entryId").value = entry?.entry_id || "";
    document.getElementById("entryNo").value = entry?.no || "";
    document.getElementById("entryTime").value = entry?.time || "";
    document.getElementById("entryPlaceName").value = entry?.place_name || "";
    document.getElementById("entryMemo").value = entry?.memo || "";
    document.getElementById("entryDonation").value = entry?.donation || "";
    populatePlaceSelect(document.getElementById("entryPlace"), entry?.place_id);
    document.getElementById("otabiEntryFormCard").classList.add("active");
}

async function saveEntry() {
    const data = {
        entry_id: document.getElementById("entryId").value || null,
        year: otabiYear,
        group: otabiGroup,
        no: document.getElementById("entryNo").value,
        time: document.getElementById("entryTime").value,
        place_id: document.getElementById("entryPlace").value || null,
        place_name: document.getElementById("entryPlaceName").value.trim(),
        memo: document.getElementById("entryMemo").value.trim(),
        donation: document.getElementById("entryDonation").value || null
    };
    const res = await callGasApi({ action: "saveOtabiEntry", entry: data });
    if (res?.success) {
        document.getElementById("otabiEntryFormCard").classList.remove("active");
        await loadOtabiSchedule();
    } else {
        alert("保存に失敗しました");
    }
}

async function deleteEntry(entryId) {
    if (!confirm("削除しますか？")) return;
    const res = await callGasApi({ action: "deleteOtabiEntry", entryId });
    if (res?.success) await loadOtabiSchedule();
    else alert("削除に失敗しました");
}

// ===========================
// 一括入力
// ===========================
function openBulkEntryForm() {
    const bulkCard = document.getElementById("otabiBulkEntryCard");
    const rowsContainer = document.getElementById("otabiBulkRows");
    rowsContainer.innerHTML = "";
    for (let i = 1; i <= 3; i++) addBulkRow(i);
    bulkCard.classList.add("active");
}

function addBulkRow(no) {
    const rowsContainer = document.getElementById("otabiBulkRows");
    const div = document.createElement("div");
    div.className = "otabi-bulk-row";
    div.innerHTML = `
        <div class="otabi-bulk-top">
            <input type="number" class="bulk-no" placeholder="No." value="${no}" style="width:50px">
            <input type="time" class="bulk-time">
            <select class="bulk-place"><option value="">場所選択</option></select>
            <button type="button" class="otabi-bulk-remove">✕</button>
        </div>
        <div class="otabi-bulk-bottom">
            <input type="text" class="bulk-place-name" placeholder="表示名（省略可）">
            <input type="text" class="bulk-memo" placeholder="メモ">
            <input type="number" class="bulk-donation" placeholder="御花">
        </div>
    `;
    div.querySelector(".otabi-bulk-remove").addEventListener("click", () => div.remove());
    populatePlaceSelect(div.querySelector(".bulk-place"), null);
    rowsContainer.appendChild(div);
}

async function saveBulkEntries() {
    const rows = document.querySelectorAll(".otabi-bulk-row");
    const entries = [];
    rows.forEach(row => {
        const time = row.querySelector(".bulk-time")?.value;
        const placeName = row.querySelector(".bulk-place-name")?.value.trim();
        const placeId = row.querySelector(".bulk-place")?.value;
        if (!time && !placeId && !placeName) return;
        entries.push({
            year: otabiYear,
            group: otabiGroup,
            no: row.querySelector(".bulk-no")?.value,
            time,
            place_id: placeId || null,
            place_name: placeName,
            memo: row.querySelector(".bulk-memo")?.value.trim(),
            donation: row.querySelector(".bulk-donation")?.value || null
        });
    });
    if (!entries.length) return alert("入力がありません");
    try {
        await Promise.all(entries.map(e => callGasApi({ action: "saveOtabiEntry", entry: e })));
        document.getElementById("otabiBulkEntryCard").classList.remove("active");
        await loadOtabiSchedule();
    } catch (err) {
        alert("保存中にエラーが発生しました");
    }
}

// ===========================
// 御花集計
// ===========================
async function loadOtabiDonations() {
    const res = await callGasApi({ action: "getOtabiDonations", year: otabiYear, group: otabiGroup });
    const list = document.getElementById("otabiDonationList");
    if (!res?.success || !list) return;
    const donations = res.donations || [];
    if (!donations.length) { list.innerHTML = "<div class='otabi-empty'>データなし</div>"; return; }
    let total = 0;
    list.innerHTML = donations.map(d => {
        total += Number(d.donation) || 0;
        return `<div class="otabi-donation-item"><span>${d.place_name || ""}</span><span>¥${Number(d.donation).toLocaleString()}</span></div>`;
    }).join("") + `<div class="otabi-donation-total">合計: ¥${total.toLocaleString()}</div>`;
}

// ===========================
// 前年コピー
// ===========================
async function copySchedule() {
    if (!confirm(`${otabiYear - 1}年のスケジュールを${otabiYear}年にコピーしますか？`)) return;
    const res = await callGasApi({ action: "copyOtabiSchedule", fromYear: otabiYear - 1, toYear: otabiYear, group: otabiGroup });
    if (res?.success) { await loadOtabiSchedule(); alert("コピーしました"); }
    else alert("コピーに失敗しました");
}
