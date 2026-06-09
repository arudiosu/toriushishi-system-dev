// =======================================================
// 装備管理
// =======================================================

let gearData = [];
let gearEditTargetUserId = null;

function openGearCard() {
    document.getElementById("gearCard").classList.add("active");
    loadGear();
}

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
    if (!gearData.length) {
        list.innerHTML = '<p style="padding:16px;color:var(--text-3);">メンバーなし</p>';
        return;
    }
    list.innerHTML = "";
    gearData.forEach(m => {
        const g = m.gear || {};
        const roles = [g.odaiko && "大太鼓", g.kotaiko && "小太鼓", g.shishi && "獅子"].filter(Boolean).join("・");
        const item = document.createElement("div");
        item.className = "gear-item";
        item.innerHTML = `
            <div class="gear-item-header">
                <span class="gear-member-name">${escHtml(m.name)}</span>
                ${typeof userRole !== "undefined" && userRole === "admin"
                    ? `<button class="gear-edit-btn" data-uid="${m.userId}"><i class="fas fa-pen"></i></button>`
                    : ""}
            </div>
            <div class="gear-tags">
                ${roles ? `<span class="gear-tag gear-tag-role">${roles}</span>` : ""}
                ${g.art ? `<span class="gear-tag">芸：${escHtml(String(g.art))}</span>` : ""}
                ${g.happi_no !== "" && g.happi_no !== undefined ? `<span class="gear-tag">法被：${escHtml(String(g.happi_no))}</span>` : ""}
                ${g.happi_r8 !== "" && g.happi_r8 !== undefined ? `<span class="gear-tag">R8：${escHtml(String(g.happi_r8))}</span>` : ""}
                ${g.tshirt_size ? `<span class="gear-tag">T：${escHtml(String(g.tshirt_size))}</span>` : ""}
                ${g.tekkou ? `<span class="gear-tag">手甲：${escHtml(String(g.tekkou))}</span>` : ""}
                ${g.hakama ? `<span class="gear-tag">はかま：${escHtml(String(g.hakama))}</span>` : ""}
                ${g.kimono_top ? `<span class="gear-tag">着物上：${escHtml(String(g.kimono_top))}</span>` : ""}
                ${g.kimono_bottom ? `<span class="gear-tag">着物下：${escHtml(String(g.kimono_bottom))}</span>` : ""}
                ${g.memo ? `<span class="gear-tag gear-tag-memo">${escHtml(String(g.memo))}</span>` : ""}
            </div>
        `;
        const btn = item.querySelector(".gear-edit-btn");
        if (btn) btn.addEventListener("click", () => openGearEdit(m));
        list.appendChild(item);
    });
}

function openGearEdit(member) {
    gearEditTargetUserId = member.userId;
    document.getElementById("gearEditTitle").textContent = `装備編集：${member.name}`;
    const g = member.gear || {};
    document.getElementById("gEdit_odaiko").checked = !!g.odaiko;
    document.getElementById("gEdit_kotaiko").checked = !!g.kotaiko;
    document.getElementById("gEdit_shishi").checked = !!g.shishi;
    ["art", "happi_no", "happi_r8", "tshirt_size", "tekkou", "hakama", "kimono_top", "kimono_bottom", "memo"].forEach(f => {
        const el = document.getElementById("gEdit_" + f);
        if (el) el.value = g[f] !== undefined ? String(g[f]) : "";
    });
    document.getElementById("gearEditCard").classList.add("active");
}

async function saveGear() {
    if (!gearEditTargetUserId) return;
    const gear = {
        odaiko: document.getElementById("gEdit_odaiko").checked,
        kotaiko: document.getElementById("gEdit_kotaiko").checked,
        shishi: document.getElementById("gEdit_shishi").checked,
    };
    ["art", "happi_no", "happi_r8", "tshirt_size", "tekkou", "hakama", "kimono_top", "kimono_bottom", "memo"].forEach(f => {
        gear[f] = document.getElementById("gEdit_" + f)?.value.trim() ?? "";
    });
    const btn = document.getElementById("gearSaveBtn");
    btn.disabled = true;
    btn.textContent = "保存中…";
    const res = await callGasApi({ action: "saveGear", targetUserId: gearEditTargetUserId, gear, userId });
    btn.disabled = false;
    btn.textContent = "保存";
    if (!res?.success) { alert(res?.msg || "保存失敗"); return; }
    // update local data
    const m = gearData.find(m => m.userId === gearEditTargetUserId);
    if (m) m.gear = gear;
    document.getElementById("gearEditCard").classList.remove("active");
    renderGearList();
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("gearSaveBtn")?.addEventListener("click", saveGear);
});
