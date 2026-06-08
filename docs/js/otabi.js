/* =======================================================
お旅管理
======================================================= */
let otabiPlaces = [];
let otabiScheduleEntries = [];
let otabiYear = new Date().getFullYear();
let otabiGroup = "上組";

function openOtabiCard() {
    otabiYear = new Date().getFullYear();
    document.getElementById("otabiCard").classList.add("active");
    switchOtabiTab("places");
}

function switchOtabiTab(tab) {
    document.querySelectorAll(".otabi-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".otabi-tab-pane").forEach(p => p.classList.toggle("active", p.dataset.tab === tab));
    if (tab === "places")    loadOtabiPlaces();
    if (tab === "schedule")  loadOtabiSchedule();
    if (tab === "donations") loadOtabiDonations();
}

// ===== 訪問先マスタ =====

async function loadOtabiPlaces() {
    const list = document.getElementById("otabiPlacesList");
    list.innerHTML = [1,2,3].map(() => '<div class="skeleton skeleton-card"></div>').join('');
    const res = await callGasApi({ action: "getOtabiPlaces" });
    otabiPlaces = res.places || [];
    renderOtabiPlaces();
}

function renderOtabiPlaces() {
    const list = document.getElementById("otabiPlacesList");
    if (!otabiPlaces.length) {
        list.innerHTML = '<p class="no-event">訪問先が登録されていません</p>';
        return;
    }
    list.innerHTML = otabiPlaces.map(p => {
        const gc = p.group === '上' ? 'ue' : p.group === '下' ? 'shita' : 'joint';
        const addressHtml = p.address
            ? `<a class="otabi-map-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}" target="_blank" rel="noopener">${p.address}</a>`
            : '';
        const sub = [addressHtml, p.tel].filter(Boolean).join(' ／ ');
        return `
        <div class="otabi-item" data-place-id="${p.place_id}">
            <span class="otabi-badge otabi-badge-${gc}">${p.group || '-'}</span>
            <div class="otabi-item-body">
                <div class="otabi-item-title">${p.name}</div>
                ${sub ? `<div class="otabi-item-sub">${sub}</div>` : ''}
            </div>
            <button class="otabi-action-btn edit-place-btn" data-id="${p.place_id}">編集</button>
        </div>`;
    }).join('');
    list.querySelectorAll(".edit-place-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            openPlaceForm(otabiPlaces.find(p => p.place_id == btn.dataset.id));
        });
    });
}

function openPlaceForm(place = null) {
    document.getElementById("placeFormId").value = place?.place_id || "";
    document.getElementById("placeFormName").value = place?.name || "";
    document.getElementById("placeFormAddress").value = place?.address || "";
    document.getElementById("placeFormTel").value = place?.tel || "";
    const g = place?.group || "上";
    const radio = document.querySelector(`input[name="placeGroup"][value="${g}"]`);
    if (radio) radio.checked = true;
    document.getElementById("deletePlaceBtn").style.display = place ? "block" : "none";
    document.getElementById("otabiPlaceFormCard").classList.add("active");
}

async function savePlaceForm() {
    const name = document.getElementById("placeFormName").value.trim();
    if (!name) return alert("訪問先名を入力してください");
    const id = document.getElementById("placeFormId").value;
    const place = {
        place_id: id ? Number(id) : null,
        name,
        address: document.getElementById("placeFormAddress").value.trim(),
        tel: document.getElementById("placeFormTel").value.trim(),
        group: document.querySelector('input[name="placeGroup"]:checked')?.value || "上"
    };
    loadingOverlay.style.display = "flex";
    try {
        const res = await callGasApi({ action: "saveOtabiPlace", place });
        if (!res.success) throw new Error("保存失敗");
        document.getElementById("otabiPlaceFormCard").classList.remove("active");
        await loadOtabiPlaces();
    } catch(e) { alert("保存中にエラーが発生しました"); }
    finally { loadingOverlay.style.display = "none"; }
}

async function deletePlaceForm() {
    if (!confirm("この訪問先を削除しますか？")) return;
    const id = document.getElementById("placeFormId").value;
    loadingOverlay.style.display = "flex";
    try {
        await callGasApi({ action: "deleteOtabiPlace", placeId: Number(id) });
        document.getElementById("otabiPlaceFormCard").classList.remove("active");
        await loadOtabiPlaces();
    } finally { loadingOverlay.style.display = "none"; }
}

// ===== スケジュール =====

async function loadOtabiSchedule() {
    document.getElementById("otabiScheduleYear").textContent = otabiYear;
    document.querySelectorAll(".otabi-group-btn").forEach(b => b.classList.toggle("active", b.dataset.group === otabiGroup));
    const list = document.getElementById("otabiScheduleList");
    list.innerHTML = [1,2,3].map(() => '<div class="skeleton skeleton-card"></div>').join('');
    const fetches = [callGasApi({ action: "getOtabiSchedule", year: otabiYear, group: otabiGroup })];
    if (!otabiPlaces.length) fetches.push(callGasApi({ action: "getOtabiPlaces" }));
    const [schedRes, placesRes] = await Promise.all(fetches);
    otabiScheduleEntries = schedRes.entries || [];
    if (placesRes) otabiPlaces = placesRes.places || [];
    renderOtabiSchedule();
}

function renderOtabiSchedule() {
    const list = document.getElementById("otabiScheduleList");
    if (!otabiScheduleEntries.length) {
        list.innerHTML = '<p class="no-event">スケジュールが登録されていません</p>';
        return;
    }
    list.innerHTML = otabiScheduleEntries.map(e => {
        const place = otabiPlaces.find(p => p.place_id == e.place_id);
        const mapBtn = place?.address
            ? `<a class="otabi-map-icon" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" target="_blank" rel="noopener" title="地図を見る"><i class="fas fa-map-marker-alt"></i></a>`
            : '';
        return `
        <div class="otabi-item otabi-entry-item" data-entry-id="${e.entry_id}">
            <div class="otabi-entry-no">${e.no || '-'}</div>
            <div class="otabi-entry-time">${e.time || '--:--'}</div>
            <div class="otabi-item-body">
                <div class="otabi-item-title">${e.place_name || '未設定'}</div>
                ${e.memo ? `<div class="otabi-item-sub">${e.memo}</div>` : ''}
            </div>
            ${mapBtn}
            ${e.donation ? `<div class="otabi-donation-badge">￥${Number(e.donation).toLocaleString()}</div>` : ''}
        </div>`;
    }).join('');
    list.querySelectorAll(".otabi-entry-item").forEach(item => {
        item.addEventListener("click", e => {
            if (e.target.closest(".otabi-map-icon")) return;
            openEntryForm(otabiScheduleEntries.find(en => en.entry_id == item.dataset.entryId));
        });
    });
}

async function openEntryForm(entry = null) {
    if (!otabiPlaces.length) {
        const res = await callGasApi({ action: "getOtabiPlaces" });
        otabiPlaces = res.places || [];
    }
    document.getElementById("entryFormId").value = entry?.entry_id || "";
    const nextNo = otabiScheduleEntries.length > 0
        ? Math.max(...otabiScheduleEntries.map(e => Number(e.no) || 0)) + 1 : 1;
    document.getElementById("entryFormNo").value = entry?.no ?? nextNo;
    document.getElementById("entryFormTime").value = entry?.time || "";
    document.getElementById("entryFormPlaceName").value = entry?.place_name || "";
    document.getElementById("entryFormMemo").value = entry?.memo || "";
    document.getElementById("entryFormDonation").value = entry?.donation || "";

    const select = document.getElementById("entryFormPlaceSelect");
    select.innerHTML = '<option value="">― マスタから選択 ―</option>' +
        otabiPlaces.map(p => `<option value="${p.place_id}" ${entry?.place_id == p.place_id ? 'selected' : ''}>${p.name}（${p.group}）</option>`).join('');
    select.onchange = () => {
        const p = otabiPlaces.find(pl => pl.place_id == select.value);
        if (p) document.getElementById("entryFormPlaceName").value = p.name;
    };
    document.getElementById("deleteEntryBtn").style.display = entry ? "block" : "none";
    document.getElementById("otabiEntryFormCard").classList.add("active");
}

async function saveEntryForm() {
    const placeName = document.getElementById("entryFormPlaceName").value.trim();
    if (!placeName) return alert("訪問先名を入力してください");
    const id = document.getElementById("entryFormId").value;
    const entry = {
        entry_id: id ? Number(id) : null,
        year: otabiYear,
        group: otabiGroup,
        no: Number(document.getElementById("entryFormNo").value) || 0,
        time: document.getElementById("entryFormTime").value,
        place_id: document.getElementById("entryFormPlaceSelect").value || "",
        place_name: placeName,
        memo: document.getElementById("entryFormMemo").value.trim(),
        donation: Number(document.getElementById("entryFormDonation").value) || 0
    };
    loadingOverlay.style.display = "flex";
    try {
        const res = await callGasApi({ action: "saveOtabiEntry", entry });
        if (!res.success) throw new Error("保存失敗");
        document.getElementById("otabiEntryFormCard").classList.remove("active");
        await loadOtabiSchedule();
    } catch(e) { alert("保存中にエラーが発生しました"); }
    finally { loadingOverlay.style.display = "none"; }
}

async function deleteEntryForm() {
    if (!confirm("このエントリを削除しますか？")) return;
    const id = document.getElementById("entryFormId").value;
    loadingOverlay.style.display = "flex";
    try {
        await callGasApi({ action: "deleteOtabiEntry", entryId: Number(id) });
        document.getElementById("otabiEntryFormCard").classList.remove("active");
        await loadOtabiSchedule();
    } finally { loadingOverlay.style.display = "none"; }
}

// ===== 一括入力 =====

async function openBulkEntryForm() {
    if (!otabiPlaces.length) {
        const res = await callGasApi({ action: "getOtabiPlaces" });
        otabiPlaces = res.places || [];
    }
    const container = document.getElementById("otabiBulkRows");
    container.innerHTML = "";
    const nextNo = otabiScheduleEntries.length > 0
        ? Math.max(...otabiScheduleEntries.map(e => Number(e.no) || 0)) + 1 : 1;
    for (let i = 0; i < 3; i++) addBulkRow(nextNo + i);
    document.getElementById("otabiBulkEntryCard").classList.add("active");
}

function addBulkRow(no) {
    const container = document.getElementById("otabiBulkRows");
    if (no == null) {
        const rows = container.querySelectorAll(".otabi-bulk-row");
        const nums = [...rows].map(r => Number(r.querySelector(".bulk-no").value) || 0);
        no = nums.length ? Math.max(...nums) + 1 : 1;
    }
    const selectOptions = '<option value="">― マスタから選択 ―</option>' +
        otabiPlaces.map(p => `<option value="${p.place_id}">${p.name}（${p.group}）</option>`).join('');
    const div = document.createElement("div");
    div.className = "otabi-bulk-row";
    div.innerHTML = `
        <div class="otabi-bulk-top">
            <input type="number" class="bulk-no" placeholder="No." value="${no}" min="1" />
            <input type="time" class="bulk-time" />
            <button class="otabi-bulk-remove" type="button">✕</button>
        </div>
        <select class="bulk-place-select">${selectOptions}</select>
        <input type="text" class="bulk-place-name" placeholder="訪問先名 *" />
        <div class="otabi-bulk-bottom">
            <input type="text" class="bulk-memo" placeholder="メモ" />
            <input type="number" class="bulk-donation" placeholder="¥0" min="0" step="500" />
        </div>
    `;
    div.querySelector(".otabi-bulk-remove").addEventListener("click", () => div.remove());
    div.querySelector(".bulk-place-select").addEventListener("change", e => {
        const p = otabiPlaces.find(pl => pl.place_id == e.target.value);
        if (p) div.querySelector(".bulk-place-name").value = p.name;
    });
    container.appendChild(div);
}

async function saveBulkEntries() {
    const rows = document.querySelectorAll("#otabiBulkRows .otabi-bulk-row");
    const entries = [];
    rows.forEach(row => {
        const name = row.querySelector(".bulk-place-name").value.trim();
        if (!name) return;
        entries.push({
            entry_id: null,
            year: otabiYear,
            group: otabiGroup,
            no: Number(row.querySelector(".bulk-no").value) || 0,
            time: row.querySelector(".bulk-time").value,
            place_id: row.querySelector(".bulk-place-select").value || "",
            place_name: name,
            memo: row.querySelector(".bulk-memo").value.trim(),
            donation: Number(row.querySelector(".bulk-donation").value) || 0
        });
    });
    if (!entries.length) return alert("訪問先名を1件以上入力してください");
    if (!confirm(`${entries.length}件のスケジュールを保存しますか？`)) return;
    loadingOverlay.style.display = "flex";
    try {
        await Promise.all(entries.map(entry => callGasApi({ action: "saveOtabiEntry", entry })));
        document.getElementById("otabiBulkEntryCard").classList.remove("active");
        await loadOtabiSchedule();
    } catch(e) { alert("保存中にエラーが発生しました"); }
    finally { loadingOverlay.style.display = "none"; }
}

async function copyOtabiSchedule() {
    const fromYear = otabiYear - 1;
    if (!confirm(`${fromYear}年の${otabiGroup}スケジュールを${otabiYear}年にコピーしますか？\n(お花代はリセットされます)`)) return;
    loadingOverlay.style.display = "flex";
    try {
        const res = await callGasApi({ action: "copyOtabiSchedule", fromYear, toYear: otabiYear, group: otabiGroup });
        if (!res.success) return alert(res.msg || "コピー失敗");
        alert(`${res.count}件コピーしました`);
        await loadOtabiSchedule();
    } finally { loadingOverlay.style.display = "none"; }
}

async function shareOtabiSchedule() {
    if (!otabiScheduleEntries.length) return alert("スケジュールがありません");
    const lines = [`${otabiYear}年 ${otabiGroup} お旅スケジュール`, ""];
    otabiScheduleEntries.forEach(e => {
        const don = e.donation ? ` ￥${Number(e.donation).toLocaleString()}` : "";
        const memo = e.memo ? ` [​${e.memo}]` : "";
        lines.push(`${String(e.no || '').padStart(2,'　')} ${e.time || '--:--'} ${e.place_name}${memo}${don}`);
    });
    const text = lines.join('\n');
    try {
        await navigator.clipboard.writeText(text);
        alert("クリップボードにコピーしました\nLINEなどに貼り付けて利用できます");
    } catch {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
        alert("コピーしました");
    }
}

// ===== お花代 =====

async function loadOtabiDonations() {
    document.getElementById("otabiDonYear").textContent = otabiYear;
    const area = document.getElementById("otabiDonationSummary");
    area.innerHTML = '<div class="skeleton skeleton-card"></div>';
    const res = await callGasApi({ action: "getOtabiDonations", year: otabiYear });
    renderOtabiDonations(res);
}

function renderOtabiDonations(data) {
    const area = document.getElementById("otabiDonationSummary");
    if (!data.success || !data.entries || !data.entries.length) {
        area.innerHTML = '<p class="no-event">お花代の記録がありません</p>';
        return;
    }
    const byGroupHtml = Object.entries(data.byGroup || {}).map(([g, amt]) =>
        `<div class="otabi-don-row"><span>${g}</span><span>￥${amt.toLocaleString()}</span></div>`
    ).join('');
    const detailHtml = data.entries.map(e => `
        <div class="otabi-item">
            <div class="otabi-item-body">
                <div class="otabi-item-title">${e.place_name}</div>
                <div class="otabi-item-sub">${e.group} No.${e.no} ${e.time || ''}</div>
            </div>
            <div class="otabi-donation-badge">￥${e.donation.toLocaleString()}</div>
        </div>
    `).join('');
    area.innerHTML = `
        <div class="otabi-don-card">
            ${byGroupHtml}
            <div class="otabi-don-row total">合計 <span>￥${(data.total||0).toLocaleString()}</span></div>
        </div>
        <div class="event-status">明細</div>
        ${detailHtml}
    `;
}

// ===== 初期化 =====
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".otabi-tab-btn").forEach(btn =>
        btn.addEventListener("click", () => switchOtabiTab(btn.dataset.tab))
    );
    document.querySelectorAll(".otabi-group-btn").forEach(btn =>
        btn.addEventListener("click", () => { otabiGroup = btn.dataset.group; loadOtabiSchedule(); })
    );
    document.getElementById("otabiSchedYearPrev")?.addEventListener("click", () => { otabiYear--; loadOtabiSchedule(); });
    document.getElementById("otabiSchedYearNext")?.addEventListener("click", () => { otabiYear++; loadOtabiSchedule(); });
    document.getElementById("otabiDonYearPrev")?.addEventListener("click",  () => { otabiYear--; loadOtabiDonations(); });
    document.getElementById("otabiDonYearNext")?.addEventListener("click",  () => { otabiYear++; loadOtabiDonations(); });
    document.getElementById("addPlaceBtn")?.addEventListener("click", () => openPlaceForm());
    document.getElementById("addEntryBtn")?.addEventListener("click", () => openBulkEntryForm());
    document.getElementById("addBulkRowBtn")?.addEventListener("click", () => addBulkRow());
    document.getElementById("saveBulkEntriesBtn")?.addEventListener("click", saveBulkEntries);
    document.getElementById("copyScheduleBtn")?.addEventListener("click", copyOtabiSchedule);
    document.getElementById("shareScheduleBtn")?.addEventListener("click", shareOtabiSchedule);
    document.getElementById("savePlaceBtn")?.addEventListener("click", savePlaceForm);
    document.getElementById("deletePlaceBtn")?.addEventListener("click", deletePlaceForm);
    document.getElementById("saveEntryBtn")?.addEventListener("click", saveEntryForm);
    document.getElementById("deleteEntryBtn")?.addEventListener("click", deleteEntryForm);
});
