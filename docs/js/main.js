/* =======================================================
共通変数・DOM取得
======================================================= */
const homeScheduleContainer = document.getElementById("home-schedule");
const eventActiveScheduleContainer = document.getElementById("event-active-schedule");
const eventPastScheduleContainer = document.getElementById("event-past-schedule");
const loadingOverlay = document.getElementById("globalLoading");
const calendarArea = document.getElementById("calendarArea");
let scheduleContainer = [];
let eventMap = {}; 
let practiceMap = {}; 


/* =======================================================
初期処理
======================================================= */
document.addEventListener("DOMContentLoaded", async () => {

    initLoadingScreen();

    initBottomNav();
    initEventDelegation();
    initChatBot();

    scheduleContainer = [
        homeScheduleContainer,
        eventActiveScheduleContainer,
        eventPastScheduleContainer
    ];
    showSkeleton(scheduleContainer);
    showCalendarSkeleton();

    const ok = await checkSessionAndGetUserId();
    if (!ok) return;

    await getEvents();
    await getPractices();

    loadHomeEvents();   
    loadEventEvents(); 
    initCalendar();
    loadMembersUser();   
    if (userRole === "admin") loadMembersAdmin();

});

/* =======================================================
共通関数
======================================================= */
function normalize(str) {
    return str.replace(/-/g, "/").split(" ")[0];
}

/* =======================================================
ローディング画面
======================================================= */
function initLoadingScreen() {
    const loadingStart = Date.now();
    window.addEventListener('load', function(){
        const elapsed = Date.now() - loadingStart;
        const minTime = 3000;
        if (elapsed < minTime) setTimeout(hideLoading, minTime - elapsed);
        else hideLoading();
    });
}
function hideLoading() {
    const loading = document.getElementById('loading');
    if(!loading) return;
    loading.style.opacity = 0;
    setTimeout(() => {
        loading.style.display = 'none';
        const main = document.getElementById('main-content');
        if(main) main.style.display = 'block';
    }, 500);
}

/* =======================================================
ボトムナビ
======================================================= */
function initBottomNav() {
    document.querySelectorAll(".bottom-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            document.querySelectorAll(".bottom-nav-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            document.getElementById(target).classList.add("active");
        });
    });
}

/* =======================================================
スケルトン
======================================================= */
function showSkeleton(containers) {
    containers.forEach(container => {
        if(!container) return;
        container.innerHTML = "";
        for (let i = 0; i < 4; i++) {
            const sk = document.createElement("div");
            sk.className = "skeleton skeleton-card";
            container.appendChild(sk);
        }
    });
}

function showCalendarSkeleton() {
    calendarArea.innerHTML = generateCalendarSkeleton();
}

function generateCalendarSkeleton() {
    const weeks = 6;
    const cols = 7;
    let html = `<div class="cal-grid">`;
    for (let i = 0; i < weeks * cols; i++) {
        html += `<div class="day"><div class="skeleton-box" style="height:40px;"></div></div>`;
    }
    html += `</div>`;
    return html;
}

/* =======================================================
イベント・練習　取得
======================================================= */
async function getEvents() {
    try {
        const res = await callGasApi({ action: "getEventsWithStats", userId });
        if (res && res.success && Array.isArray(res.events)) {
            events = res.events;
            eventMap = {};
            events.forEach(ev => { eventMap[ev.eventId] = ev; });
        } else {
            console.error("データ取得失敗:", res?.msg);
            events = []; eventMap = {};
        }
    } catch (e) {
        console.error("イベント取得エラー:", e);
        events = []; eventMap = {};
    }
}

async function getPractices() {
    try {
        const res = await callGasApi({ action: "getPracticeWithStats", userId });
        if (res && res.success && Array.isArray(res.practices)) {
            practices = res.practices;
            practiceMap = {};
            practices.forEach(p => { practiceMap[p.practiceId] = p; });
        } else {
            console.error("データ取得失敗:", res?.msg);
            practices = []; practiceMap = {};
        }
    } catch (e) {
        console.error("practice取得エラー:", e);
        practices = []; practiceMap = {};
    }
}

function loadHomeEvents() {
    homeScheduleContainer.innerHTML = "";
    renderScheduleHome(events, practices);
}

function loadEventEvents() {
    eventActiveScheduleContainer.innerHTML = "";
    eventPastScheduleContainer.innerHTML = "";
    renderScheduleEvent(events);
}

/* =======================================================
イベントカード描画
======================================================= */
function createEventCard(ev, options = {}) {
    const { includeDeadline = false } = options;
    const className = ev.type === "festival" ? "event-festival" : "event-regular";
    const card = document.createElement("div");
    card.className = className;
    card.dataset.eventId = ev.eventId;
    card.innerHTML = `
        <div class="event-date">${ev.date}</div>
        <div class="event-title">${ev.title}</div>
        <div class="answer">${ev.myStatus}</div>
        <div class="responses-list">参加:${ev.yes} 不参加:${ev.no}</div>
        ${includeDeadline ? `<div class="deadline">期限:${ev.deadline}</div>` : ""}
    `;
    return card;
}

function renderScheduleHome(events, practices = []) {
    const today = new Date(); today.setHours(0,0,0,0);
    const items = [];
    events.forEach(ev => {
        const d = new Date(ev.date); d.setHours(0,0,0,0);
        if (d >= today) items.push({ type: "event", date: d, data: ev });
    });
    practices.forEach(pr => {
        const d = new Date(pr.date); d.setHours(0,0,0,0);
        if (d.getTime() === today.getTime()) items.push({ type: "practice", date: d, data: pr });
    });
    items.sort((a, b) => a.date - b.date);
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        if (item.type === "event") fragment.appendChild(createEventCard(item.data, { includeDeadline: true }));
        else fragment.appendChild(createPracticeCard(item.data));
    });
    homeScheduleContainer.appendChild(fragment);
}

function renderScheduleEvent(events) {
    const today = new Date(); today.setHours(0,0,0,0);
    const activeFragment = document.createDocumentFragment();
    const pastFragment = document.createDocumentFragment();
    events.forEach(ev => {
        const eventDate = new Date(ev.date); eventDate.setHours(0,0,0,0);
        eventMap[ev.eventId] = ev;
        const card = createEventCard(ev);
        if (eventDate >= today) activeFragment.appendChild(card);
        else pastFragment.appendChild(card);
    });
    eventActiveScheduleContainer.appendChild(activeFragment);
    eventPastScheduleContainer.appendChild(pastFragment);
}

/* =======================================================
練習カード描画
======================================================= */
function createPracticeCard(pr) {
    const card = document.createElement("div");
    card.className = "event-practice";
    card.dataset.practiceId = pr.practiceId;
    card.innerHTML = `
        <div class="practice-date">${pr.date}</div>
        <div class="practice-title">${pr.title || "練習"}</div>
        <div class="answer">${pr.myStatus || ""}</div>
        <div class="responses-list">欠席:${pr.absent.length} 遅れる:${pr.late.length}</div>
    `;
    return card;
}

/* =======================================================
イベント委譲
======================================================= */
function initEventDelegation() {
    document.body.addEventListener("click", async (event) => {
        const target = event.target;

        if (target.closest(".reload-btn")) {
            location.reload();
            return;
        }

        const eventCard = target.closest("[data-event-id]");
        if (eventCard) {
            if (eventCard.closest("#home-schedule, #event-active-schedule, #event-past-schedule, #eventArea")) {
                const eventId = Number(eventCard.dataset.eventId);
                const eventData = eventMap[eventId];
                const card = document.getElementById("eventDetailCard");
                card.classList.add("active");
                card.dataset.eventId = eventId;
                await fillDetailCard(eventData, userId, card);
                return;
            }
        }

        const practiceCard = target.closest("[data-practice-id]");
        if (practiceCard && !target.closest(".close-card-btn, .response-btn, .toggle-response-btn")) {
            const practiceId = Number(practiceCard.dataset.practiceId);
            const practiceData = practiceMap[practiceId];
            const card = document.getElementById("practiceDetailCard");
            card.classList.add("active");
            card.dataset.practiceId = practiceId;
            await fillPracticeDetailCard(practiceData, userId, card);
            return;
        }

        function toggleNextList(btn) {
            const ul = btn.nextElementSibling;
            if (!ul) return;
            const isOpen = ul.style.display === "block";
            ul.style.display = isOpen ? "none" : "block";
            btn.classList.toggle("open", !isOpen);
        }
        const toggleBtn = target.closest(".toggle-response-btn, .toggle-performances-btn, .toggle-children-btn");
        if (toggleBtn) {
            toggleNextList(toggleBtn);
            return;
        }

        const responseBtn = target.closest(".response-btn");
        if (responseBtn) {
            const practiceCard = responseBtn.closest(".practice-detail-card");
            if (practiceCard) {
                const practiceId = Number(practiceCard.dataset.practiceId);
                const dateText = practiceCard.querySelector(".practice-detail-card-date")?.textContent || "";
                const practiceDate = new Date(dateText.replace(/\//g, "-")).setHours(0,0,0,0);
                const today = new Date().setHours(0,0,0,0);
                if (practiceDate < today) { alert("過去の練習には回答できません。"); return; }
                let answer = "";
                if (responseBtn.classList.contains("absent")) answer = "欠席";
                if (responseBtn.classList.contains("late")) answer = "遅刻";
                await updatePracticeResponse(practiceId, answer, practiceCard, userId);
                return;
            }
            const card = responseBtn.closest(".event-detail-card");
            const dateText = card.querySelector(".event-detail-card-date")?.textContent || "";
            const eventDate = new Date(dateText.replace(/\//g, "-")).setHours(0,0,0,0);
            const today = new Date().setHours(0,0,0,0);
            if (eventDate < today) { alert("過去のイベントは回答できません。"); return; }
            const eventId = Number(card.dataset.eventId);
            const answer = responseBtn.classList.contains("yes") ? "参加" : "不参加";
            await updateResponse(eventId, answer, card, userId);
            return;
        }

        const closeTarget = target.closest(".close-card-btn");
        if (closeTarget) {
            const targetType = closeTarget.dataset.target;
            switch (targetType) {
                case "event":              document.getElementById("eventDetailCard")?.classList.remove("active"); break;
                case "practice":           document.getElementById("practiceDetailCard")?.classList.remove("active"); break;
                case "member":             document.getElementById("membersCardUser")?.classList.remove("active"); break;
                case "member-management":  document.getElementById("membersCardAdmin")?.classList.remove("active"); break;
                case "create":             document.getElementById("eventCreateCard")?.classList.remove("active"); break;
                case "practice-create":    document.getElementById("practiceCreateCard")?.classList.remove("active"); break;
                case "otabi":              document.getElementById("otabiCard")?.classList.remove("active"); break;
                case "otabi-place-form":   document.getElementById("otabiPlaceFormCard")?.classList.remove("active"); break;
                case "otabi-entry-form":   document.getElementById("otabiEntryFormCard")?.classList.remove("active"); break;
            }
            return;
        }

        if (target.closest(".edit-event-btn")) {
            const detailCard = document.getElementById("eventDetailCard");
            const eventId = Number(detailCard.dataset.eventId);
            openEditForm(eventMap[eventId]);
        }
    });
}

/* =======================================================
タブ / メンバー
======================================================= */
document.querySelectorAll(".tab-item").forEach(tab => {
    tab.addEventListener("click", async () => {
        const targetTab = tab.dataset.target;
        if (targetTab === "member") {
            document.getElementById("membersCardUser").classList.add("active");
            return;
        }
        if (targetTab === "member-management") {
            if (userRole === "user") { alert("管理者のみアクセスできます。"); return; }
            document.getElementById("membersCardAdmin").classList.add("active");
            return;
        }
        if (targetTab === "event-management") {
            if (userRole === "user") { alert("管理者のみアクセスできます。"); return; }
            openCreateForm();
            return;
        }
        if (targetTab === "practice-management") {
            if (userRole === "user") { alert("管理者のみアクセスできます。"); return; }
            openPracticeCreateForm();
            return;
        }
        if (targetTab === "otabi-management") {
            if (userRole === "user") { alert("管理者のみアクセスできます。"); return; }
            openOtabiCard();
            return;
        }
    });
});

async function loadMembersUser() {
    const card = document.getElementById("membersCardUser");
    const list = document.getElementById("memberListUser");
    const overlay = card.querySelector(".loading-overlay");
    overlay.style.display = "flex";
    const res = await callGasApi({ action: "getMembers", role: "user" });
    list.innerHTML = "";
    res.members.filter(m => m.status === "active").forEach(m => list.appendChild(buildMemberItemUser(m)));
    overlay.style.display = "none";
}

async function loadMembersAdmin() {
    const card = document.getElementById("membersCardAdmin");
    const list = document.getElementById("memberListAdmin");
    const overlay = card.querySelector(".loading-overlay");
    overlay.style.display = "flex";
    try {
        const res = await callGasApi({ action: "getMembers", role: "admin" });
        list.innerHTML = "";
        const hold = res.members.filter(m => m.status === "hold");
        const active = res.members.filter(m => m.status === "active");
        if (hold.length) {
            list.appendChild(makeTitle("承認待ちメンバー"));
            hold.forEach(m => list.appendChild(buildMemberItemAdmin(m, true)));
        }
        if (active.length) {
            list.appendChild(makeTitle("アクティブメンバー"));
            active.forEach(m => list.appendChild(buildMemberItemAdmin(m, false)));
        }
    } finally {
        overlay.style.display = "none";
    }
}

function buildMemberItemUser(member) {
    const li = document.createElement("li");
    li.classList.add("member-item");
    if (member.position) {
        const posSpan = document.createElement("span");
        posSpan.classList.add("member-position");
        posSpan.textContent = member.position;
        li.appendChild(posSpan);
    }
    const nameSpan = document.createElement("span");
    nameSpan.classList.add("member-name");
    nameSpan.textContent = member.name;
    li.appendChild(nameSpan);
    appendChildren(li, member);
    return li;
}

function buildMemberItemAdmin(member, isHold) {
    const li = document.createElement("li");
    li.classList.add("member-item");
    if (isHold) li.classList.add("is-hold");
    if (member.position) {
        const posSpan = document.createElement("span");
        posSpan.classList.add("member-position");
        posSpan.textContent = member.position;
        li.appendChild(posSpan);
    }
    const nameSpan = document.createElement("span");
    nameSpan.classList.add("member-name");
    nameSpan.textContent = member.name;
    li.appendChild(nameSpan);
    appendChildren(li, member);
    const btn = document.createElement("button");
    btn.classList.add("member-action");
    if (isHold) {
        btn.textContent = "承認する";
        btn.addEventListener("click", () => approveMember(member.userId));
    } else {
        btn.textContent = "削除";
        btn.addEventListener("click", () => deleteMember(member.userId));
    }
    li.appendChild(btn);
    return li;
}

function appendChildren(li, member) {
    if (!member.children?.length) return;
    const details = document.createElement("details");
    details.classList.add("children-details");
    const summary = document.createElement("summary");
    summary.textContent = `子供 (${member.children.length}人)`;
    details.appendChild(summary);
    const ul = document.createElement("ul");
    member.children.forEach(child => {
        const c = document.createElement("li");
        c.textContent = child.childName;
        ul.appendChild(c);
    });
    details.appendChild(ul);
    li.appendChild(details);
}

function makeTitle(text) {
    const p = document.createElement("p");
    p.textContent = text;
    p.classList.add("list-title");
    return p;
}

async function approveMember(userId) {
    if (!confirm("このユーザーを承認しますか？")) return;
    const res = await callGasApi({ action: "approveMember", userId });
    if (res.success) { alert("承認しました！"); loadMembersAdmin(); }
    else alert("承認に失敗しました");
}

async function deleteMember(userId) {
    if (!confirm("本当に削除しますか？")) return;
    const res = await callGasApi({ action: "deleteMember", userId });
    if (res.success) { alert("削除しました！"); loadMembersAdmin(); }
    else alert("削除に失敗しました");
}

/* =======================================================
イベント新規作成
======================================================= */
function initEventCreateCard() {
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";
    document.getElementById("eventLocation").value = "";
    document.getElementById("eventComment").value = "";
    const performanceList = document.getElementById("performanceList");
    if (performanceList) performanceList.innerHTML = "";
    document.querySelectorAll(".response-list").forEach(ul => ul.innerHTML = "");
    const overlay = document.querySelector(".event-create-card .loading-overlay");
    if (overlay) overlay.style.display = "none";
}

function openCreateForm() {
    initEventCreateCard();
    document.querySelector(".event-create-card").classList.add("active");
}

function openEditForm(eventData) {
    initEventCreateCard();
    const editCard = document.querySelector(".event-create-card");
    editCard.dataset.eventId = eventData.eventId;
    document.querySelectorAll('input[name="eventType"]').forEach(radio => {
        radio.checked = (radio.value === eventData.type);
    });
    document.getElementById("eventTitle").value = eventData.title || "";
    document.getElementById("eventDate").value = (eventData.date || "").replace(/\//g, "-");
    document.getElementById("eventTime").value = eventData.time || "";
    document.getElementById("eventLocation").value = eventData.location || "";
    document.getElementById("eventComment").value = eventData.comment || "";
    const performanceList = document.getElementById("performanceList");
    if (performanceList && Array.isArray(eventData.performances)) {
        eventData.performances.forEach(perf => {
            const wrapper = document.createElement("div");
            wrapper.classList.add("performance-item");
            const nameInput = document.createElement("input");
            nameInput.type = "text"; nameInput.placeholder = "演目名";
            nameInput.classList.add("performance-name"); nameInput.value = perf.name || "";
            wrapper.appendChild(nameInput);
            ["太鼓", "小太鼓", "獅子舞"].forEach(roleName => {
                const roleInput = document.createElement("input");
                roleInput.type = "text"; roleInput.placeholder = roleName;
                roleInput.classList.add("performance-role"); roleInput.dataset.role = roleName;
                roleInput.value = perf.roles?.[roleName] || "";
                wrapper.appendChild(roleInput);
            });
            performanceList.appendChild(wrapper);
        });
    }
    editCard.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("addPerformanceBtn");
    const performanceList = document.getElementById("performanceList");
    const saveBtn = document.querySelector(".save-event-btn");

    addBtn.addEventListener("click", () => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("performance-item");
        const nameInput = document.createElement("input");
        nameInput.type = "text"; nameInput.placeholder = "演目名";
        nameInput.classList.add("performance-name");
        wrapper.appendChild(nameInput);
        ["太鼓", "小太鼓", "獅子舞"].forEach(roleName => {
            const roleInput = document.createElement("input");
            roleInput.type = "text"; roleInput.placeholder = roleName;
            roleInput.classList.add("performance-role"); roleInput.dataset.role = roleName;
            wrapper.appendChild(roleInput);
        });
        performanceList.appendChild(wrapper);
    });

    saveBtn.addEventListener("click", async () => {
        if (!confirm("保存しますか？")) return;
        const type = document.querySelector('input[name="eventType"]:checked').value;
        const title = document.getElementById("eventTitle").value.trim();
        const date = document.getElementById("eventDate").value;
        const time = document.getElementById("eventTime").value;
        const location = document.getElementById("eventLocation").value.trim();
        const comment = document.getElementById("eventComment").value;
        if (!title) return alert("タイトルを入力してください");
        if (!date) return alert("日付を選択してください");
        if (!time) return alert("時間を選択してください");
        const createCard = document.querySelector(".event-create-card");
        const eventId = createCard.dataset.eventId ? Number(createCard.dataset.eventId) : null;
        const performances = [];
        document.querySelectorAll("#performanceList .performance-item").forEach(item => {
            const name = item.querySelector(".performance-name")?.value.trim();
            if (!name) return;
            const roles = {};
            item.querySelectorAll(".performance-role").forEach(input => {
                if (input.value.trim()) roles[input.dataset.role] = input.value.trim();
            });
            performances.push({ name, roles });
        });
        try {
            loadingOverlay.style.display = "flex";
            const res = await callGasApi({ action: "saveEvent", event: { eventId, type, title, date, time, location, comment, performances } });
            if (!res.success) throw new Error(res.message || "イベント保存失敗");
            alert("保存しました");
            document.getElementById("eventCreateCard").classList.remove("active");
        } catch (err) {
            console.error(err);
            alert("保存中にエラーが発生しました");
        } finally {
            loadingOverlay.style.display = "none";
        }
    });
});

/* =======================================================
練習日新規作成
======================================================= */
function initPracticeCreateCard() {
    document.getElementById("practiceTitle").value = "";
    document.getElementById("practiceDate").value = "";
    document.getElementById("practiceStartDate").value = "";
    document.getElementById("practiceEndDate").value = "";
    document.getElementById("practiceStart").value = "";
    document.getElementById("practiceEnd").value = "";
    document.getElementById("practiceLocation").value = "";
    document.getElementById("practiceComment").value = "";
    const rangeMode = document.getElementById("practiceRangeMode");
    if (rangeMode) rangeMode.checked = false;
    document.getElementById("practiceSingleDate").style.display = "";
    document.getElementById("practiceRangeDates").style.display = "none";
    document.querySelectorAll('input[name="practiceWeekday"]').forEach(cb => cb.checked = false);
}

function openPracticeCreateForm() {
    initPracticeCreateCard();
    document.getElementById("practiceCreateCard").classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
    const rangeModeCheck = document.getElementById("practiceRangeMode");
    if (rangeModeCheck) {
        rangeModeCheck.addEventListener("change", () => {
            document.getElementById("practiceSingleDate").style.display = rangeModeCheck.checked ? "none" : "";
            document.getElementById("practiceRangeDates").style.display = rangeModeCheck.checked ? "" : "none";
        });
    }

    const savePracticeBtn = document.querySelector(".save-practice-btn");
    if (!savePracticeBtn) return;

    savePracticeBtn.addEventListener("click", async () => {
        const title    = document.getElementById("practiceTitle").value.trim();
        const start    = document.getElementById("practiceStart").value;
        const end      = document.getElementById("practiceEnd").value;
        const location = document.getElementById("practiceLocation").value.trim();
        const comment  = document.getElementById("practiceComment").value.trim();
        const isRange  = document.getElementById("practiceRangeMode").checked;
        let datesToSave = [];

        if (isRange) {
            const startDate = document.getElementById("practiceStartDate").value;
            const endDate   = document.getElementById("practiceEndDate").value;
            const selectedWeekdays = [...document.querySelectorAll('input[name="practiceWeekday"]:checked')].map(cb => Number(cb.value));
            if (!startDate) return alert("開始日を選択してください");
            if (!endDate)   return alert("終了日を選択してください");
            if (startDate > endDate) return alert("開始日は終了日より前にしてください");
            if (selectedWeekdays.length === 0) return alert("曜日を選択してください");
            const cur  = new Date(startDate + "T00:00:00");
            const last = new Date(endDate   + "T00:00:00");
            while (cur <= last) {
                if (selectedWeekdays.includes(cur.getDay())) {
                    const y = cur.getFullYear();
                    const m = String(cur.getMonth() + 1).padStart(2, "0");
                    const d = String(cur.getDate()).padStart(2, "0");
                    datesToSave.push(`${y}-${m}-${d}`);
                }
                cur.setDate(cur.getDate() + 1);
            }
            if (datesToSave.length === 0) return alert("指定の期間・曜日に該当する日がありません");
            if (!confirm(`${datesToSave.length}件の練習日を登録します。よろしいですか？`)) return;
        } else {
            const date = document.getElementById("practiceDate").value;
            if (!date) return alert("日付を選択してください");
            datesToSave = [date];
            if (!confirm("練習日を保存しますか？")) return;
        }

        if (!start) return alert("開始時間を選択してください");
        try {
            loadingOverlay.style.display = "flex";
            for (const date of datesToSave) {
                const res = await callGasApi({ action: "savePractice", practice: { title: title || "練習", date, start, end, location, comment } });
                if (!res.success) throw new Error(res.message || "練習日保存失敗");
            }
            alert("保存しました");
            document.getElementById("practiceCreateCard").classList.remove("active");
            await getPractices();
            loadHomeEvents();
            initCalendar();
        } catch (err) {
            console.error(err);
            alert("保存中にエラーが発生しました");
        } finally {
            loadingOverlay.style.display = "none";
        }
    });
});

/* =======================================================
API 連携ロジック
======================================================= */
async function updateResponse(eventId, answer, card, userId) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    try {
        const result = await callGasApi({ action: "updateEventResponse", eventId, userId, answer });
        card.querySelector(".response-btn.yes").classList.toggle("selected", answer === "参加");
        card.querySelector(".response-btn.no").classList.toggle("selected", answer === "不参加");
        fillResponseList(card.querySelector("ul.response-list.yes"), result.yes);
        fillResponseList(card.querySelector("ul.response-list.no"), result.no);
        fillResponseList(card.querySelector("ul.response-list.na"), result.na);
        card.querySelector(".toggle-response-btn.yes").textContent = `参加者 ${result.yes.length}人`;
        card.querySelector(".toggle-response-btn.no").textContent  = `不参加者 ${result.no.length}人`;
        card.querySelector(".toggle-response-btn.na").textContent  = `未回答者 ${result.na.length}人`;
    } catch(e) { console.error(e); }
    if (loadingOverlay) loadingOverlay.style.display = "none";
}

async function updatePracticeResponse(practiceId, answer, card, userId) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    try {
        const result = await callGasApi({ action: "updatePracticeResponse", practiceId, userId, answer });
        card.querySelector(".response-btn.absent")?.classList.toggle("selected", answer === "欠席");
        card.querySelector(".response-btn.late")?.classList.toggle("selected", answer === "遅刻");
        fillResponseList(card.querySelector("ul.response-list.absent"), result.absent);
        fillResponseList(card.querySelector("ul.response-list.late"), result.late);
        card.querySelector(".toggle-response-btn.absent").textContent = `欠席 ${result.absent.length}人`;
        card.querySelector(".toggle-response-btn.late").textContent   = `遅刻 ${result.late.length}人`;
    } catch (e) { console.error(e); }
    if (loadingOverlay) loadingOverlay.style.display = "none";
}

async function fillDetailCard(eventData, userId, card) {
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    const editBtn = card.querySelector(".edit-event-btn");
    editBtn.style.display = (userRole === "admin") ? "block" : "none";
    try {
        card.querySelector(".event-detail-card-title").textContent = eventData.title || "";
        card.querySelector(".event-detail-card-date").textContent = eventData.date || "";
        card.querySelector(".event-detail-card-time-text").textContent = eventData.time || "";
        card.querySelector(".event-detail-card-location").textContent = eventData.location || "場所未設定";
        card.querySelector(".event-detail-card-comment").textContent = eventData.comment || "";
        const myStatus = eventData.myStatus || "未回答";
        card.querySelector(".response-btn.yes").classList.toggle("selected", myStatus === "参加");
        card.querySelector(".response-btn.no").classList.toggle("selected", myStatus === "不参加");
        fillResponseList(card.querySelector("ul.response-list.yes"), eventData.members.yes);
        fillResponseList(card.querySelector("ul.response-list.no"), eventData.members.no);
        fillResponseList(card.querySelector("ul.response-list.na"), eventData.members.na);
        card.querySelector(".toggle-response-btn.yes").textContent = `参加者 ${eventData.members.yes.length}人`;
        card.querySelector(".toggle-response-btn.no").textContent  = `不参加者 ${eventData.members.no.length}人`;
        card.querySelector(".toggle-response-btn.na").textContent  = `未回答者 ${eventData.members.na.length}人`;
        const perfList = card.querySelector(".performance-list");
        perfList.innerHTML = "";
        if (Array.isArray(eventData.performances)) {
            eventData.performances.forEach(perf => {
                const li = document.createElement("li");
                li.classList.add("performance-item");
                const nameSpan = document.createElement("span");
                nameSpan.classList.add("performance-name");
                nameSpan.textContent = perf.name || "未設定";
                li.appendChild(nameSpan);
                if (perf.roles) {
                    const rolesText = Object.entries(perf.roles).map(([role, person]) => `${role}: ${person || "未設定"}`).join(" / ");
                    const rolesSpan = document.createElement("span");
                    rolesSpan.classList.add("performance-roles");
                    rolesSpan.textContent = " - " + rolesText;
                    li.appendChild(rolesSpan);
                }
                perfList.appendChild(li);
            });
        }
        card.querySelectorAll(".response-list").forEach(ul => ul.style.display = "none");
    } catch (e) { console.error(e); }
    finally { if (loadingOverlay) loadingOverlay.style.display = "none"; }
}

function fillResponseList(ulElement, names) {
    if (!ulElement) return;
    ulElement.innerHTML = (names || []).map(name => `<li><span class="name">${name}</span></li>`).join('');
}

async function fillPracticeDetailCard(practiceData, userId, card) {
    card.querySelector(".practice-detail-card-title").textContent = practiceData.title || "練習";
    card.querySelector(".practice-detail-card-date").textContent = practiceData.date;
    card.querySelector(".practice-detail-card-time-text").textContent = (practiceData.start || "") + (practiceData.end ? " 〜 " + practiceData.end : "");
    card.querySelector(".practice-detail-card-location").textContent = practiceData.location || "";
    card.querySelector(".practice-detail-card-comment").textContent = practiceData.comment || "";
    const absentList = card.querySelector(".response-list.absent");
    const lateList   = card.querySelector(".response-list.late");
    absentList.innerHTML = ""; lateList.innerHTML = "";
    card.querySelectorAll(".response-list").forEach(ul => ul.style.display = "none");
    (practiceData.absent || []).forEach(name => { const li = document.createElement("li"); li.textContent = name; absentList.appendChild(li); });
    (practiceData.late   || []).forEach(name => { const li = document.createElement("li"); li.textContent = name; lateList.appendChild(li); });
    const absentToggle = card.querySelector(".toggle-response-btn.absent");
    const lateToggle   = card.querySelector(".toggle-response-btn.late");
    if (absentToggle) absentToggle.textContent = `欠席 ${(practiceData.absent || []).length}人`;
    if (lateToggle)   lateToggle.textContent   = `遅れて参加 ${(practiceData.late || []).length}人`;
    const myStatus = practiceData.myStatus || "";
    card.querySelector(".response-btn.absent")?.classList.toggle("selected", myStatus === "欠席");
    card.querySelector(".response-btn.late")?.classList.toggle("selected", myStatus === "遅刻");
}

/* =======================================================
チャットボット
======================================================= */
function initChatBot() {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");
    const area = document.getElementById("ai-chat-area");
    if(!input || !sendBtn || !area) return;
    sendBtn.addEventListener("click", sendChat);
    input.addEventListener("keypress", (e) => { if(e.key === "Enter") sendChat(); });

    async function sendChat() {
        const text = input.value.trim();
        if(!text) return;
        appendChatMessage(text, "user");
        input.value = "";
        const typingWrapper = createTypingIndicator();
        area.appendChild(typingWrapper);
        area.scrollTop = area.scrollHeight;
        try {
            const data = await callGasApi({ action: "chatAI", text: text });
            typingWrapper.remove();
            if (!data.success) { appendChatMessage(data.message || "AIサービスでエラーが発生しました。", "ai"); return; }
            appendChatMessage(data.reply, "ai");
        } catch (e) {
            typingWrapper.remove();
            appendChatMessage("通信エラーが発生しました。", "ai");
        }
    }

    function createTypingIndicator() {
        const wrapper = document.createElement("div");
        wrapper.className = "chat-ai-wrapper";
        const icon = `<img class="icon-img" src="images/鳥生獅子連_ししまる.PNG">`;
        const msg = document.createElement("div");
        msg.className = "chat-msg chat-ai"; msg.textContent = "入力中";
        wrapper.innerHTML = icon; wrapper.appendChild(msg);
        let dotCount = 0;
        const intervalId = setInterval(() => { dotCount = (dotCount + 1) % 4; msg.textContent = "入力中" + ".".repeat(dotCount); }, 400);
        const originalRemove = wrapper.remove;
        wrapper.remove = function () { clearInterval(intervalId); originalRemove.call(this); };
        return wrapper;
    }

    function appendChatMessage(text, sender) {
        const msgDiv = document.createElement("div");
        if(sender === "ai") {
            msgDiv.className = "chat-ai-wrapper";
            msgDiv.innerHTML = `<img class="icon-img" src="images/鳥生獅子連_ししまる.PNG"><div class="chat-msg chat-ai">${text}</div>`;
        } else {
            msgDiv.className = "chat-msg chat-user";
            msgDiv.textContent = text;
        }
        area.appendChild(msgDiv);
        area.scrollTop = area.scrollHeight;
    }
}

/* =======================================================
カレンダー描画
======================================================= */
function initCalendar() {
    const today = new Date();
    generateCalendar(today.getFullYear(), today.getMonth());
}

function generateCalendar(year, month, direction) {
    const cal = document.getElementById("calendarArea");

    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const todayObj = new Date();
    const isCurrentMonth = (todayObj.getFullYear() === year && todayObj.getMonth() === month);

    let gridHtml = "";
    for (let w of weekdays) {
        gridHtml += `<div class="cal-weekday">${w}</div>`;
    }
    for (let i = 0; i < startWeekday; i++) {
        gridHtml += `<div class="empty"></div>`;
    }
    for (let d = 1; d <= totalDays; d++) {
        const fullDate = `${year}/${String(month+1).padStart(2,"0")}/${String(d).padStart(2,"0")}`;
        const event = Object.values(eventMap).find(e => normalize(e.date) === normalize(fullDate));
        const practice = Object.values(practiceMap).find(p => normalize(p.date) === normalize(fullDate));
        let dots = "";
        if (event?.type === "festival") dots += '<span class="event-dot festival"></span>';
        if (event?.type === "regular")  dots += '<span class="event-dot regular"></span>';
        if (practice)                    dots += '<span class="event-dot practice"></span>';
        const isToday = (todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === d);
        gridHtml += `<div class="day${isToday ? " today" : ""}" data-date="${fullDate}">${d}<div class="dots">${dots}</div></div>`;
    }

    const newHtml = `
        <div class="cal-header">
            <button class="cal-prev-year" title="前の年">&#171;</button>
            <button class="cal-prev" title="前の月">&#8249;</button>
            <div class="cal-header-center">
                <span class="cal-year-month">${year}年 ${month+1}月</span>
                ${!isCurrentMonth ? `<button class="cal-today-btn">今月</button>` : ""}
            </div>
            <button class="cal-next" title="次の月">&#8250;</button>
            <button class="cal-next-year" title="次の年">&#187;</button>
        </div>
        <div class="cal-grid">${gridHtml}</div>
    `;

    if (direction) {
        cal.style.transition = "none";
        cal.style.transform  = `translateX(${direction > 0 ? "30%" : "-30%"})`;
        cal.style.opacity    = "0";
        cal.innerHTML = newHtml;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                cal.style.transition = "transform 0.28s ease, opacity 0.28s ease";
                cal.style.transform  = "translateX(0)";
                cal.style.opacity    = "1";
            });
        });
    } else {
        cal.style.transform = "";
        cal.style.opacity   = "";
        cal.innerHTML = newHtml;
    }

    function selectDay(dayElem) {
        cal.querySelectorAll(".day.selected").forEach(el => el.classList.remove("selected"));
        dayElem.classList.add("selected");
        loadEventByDate(dayElem.dataset.date);
    }

    cal.querySelectorAll(".day").forEach(day => {
        day.addEventListener("click", () => selectDay(day));
    });

    if (isCurrentMonth) {
        const todayStr = `${year}/${String(month+1).padStart(2,"0")}/${String(todayObj.getDate()).padStart(2,"0")}`;
        const todayCell = cal.querySelector(`.day[data-date="${todayStr}"]`);
        if (todayCell) selectDay(todayCell);
    }

    cal.querySelector(".cal-prev").addEventListener("click", () => {
        const prev = new Date(year, month - 1);
        generateCalendar(prev.getFullYear(), prev.getMonth(), 1);
    });
    cal.querySelector(".cal-next").addEventListener("click", () => {
        const next = new Date(year, month + 1);
        generateCalendar(next.getFullYear(), next.getMonth(), -1);
    });
    cal.querySelector(".cal-prev-year").addEventListener("click", () => {
        generateCalendar(year - 1, month, 1);
    });
    cal.querySelector(".cal-next-year").addEventListener("click", () => {
        generateCalendar(year + 1, month, -1);
    });

    const todayBtn = cal.querySelector(".cal-today-btn");
    if (todayBtn) {
        todayBtn.addEventListener("click", () => {
            const now = new Date();
            generateCalendar(now.getFullYear(), now.getMonth());
        });
    }

    let touchStartX = 0;
    let touchStartY = 0;
    cal.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    cal.addEventListener("touchend", (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) {
                const next = new Date(year, month + 1);
                generateCalendar(next.getFullYear(), next.getMonth(), -1);
            } else {
                const prev = new Date(year, month - 1);
                generateCalendar(prev.getFullYear(), prev.getMonth(), 1);
            }
        }
    }, { passive: true });
}

function loadEventByDate(dateStr) {
    renderEventsOfDate(dateStr);
}

function renderEventsOfDate(dateStr) {
    const eventArea = document.getElementById("eventArea");
    eventArea.innerHTML = "";
    const normalize = s => s.replace(/-/g, "/").split(" ")[0];
    const eventsToday   = Object.values(eventMap).filter(ev => normalize(ev.date) === normalize(dateStr));
    const practiceToday = Object.values(practiceMap).filter(pr => normalize(pr.date) === normalize(dateStr));
    if (eventsToday.length === 0 && practiceToday.length === 0) {
        eventArea.innerHTML = `<div class="no-event">予定なし</div>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    eventsToday.forEach(ev => fragment.appendChild(createEventCard(ev, { includeDeadline: true })));
    practiceToday.forEach(pr => fragment.appendChild(createPracticeCard(pr)));
    eventArea.appendChild(fragment);
}
