// =======================================================
// 装備管理 GAS
// =======================================================

const GEAR_COLS = ["userId", "happi_no", "tshirt_size", "tekkou", "hakama", "kimono_top", "kimono_bottom", "memo"];
const SPARE_TYPES = ["法被", "Tシャツ", "手甲", "はかま", "着物上", "着物下"];

function ensureGearSheet() {
  const ss = getSS();
  let sheet = ss.getSheetByName("member_gear");
  if (!sheet) {
    sheet = ss.insertSheet("member_gear");
    sheet.appendRow(GEAR_COLS);
  }
  return sheet;
}

function ensureSpareSheet() {
  const ss = getSS();
  let sheet = ss.getSheetByName("gear_spare");
  if (!sheet) {
    sheet = ss.insertSheet("gear_spare");
    sheet.appendRow(["spare_id", "item_type", "value", "memo"]);
  }
  return sheet;
}

// ===== メンバー装備 =====
function getGearGAS() {
  const ss = getSS();
  const usersSheet = ss.getSheetByName("users");
  if (!usersSheet) return { success: false };

  const userRows = usersSheet.getDataRange().getValues();
  const uH = {};
  userRows[0].forEach((v, i) => uH[v] = i);
  const members = userRows.slice(1)
    .filter(r => r[uH["status"]] === "active")
    .map(r => ({ userId: String(r[uH["userId"]]), name: r[uH["storedName"]], role: r[uH["role"]] }));

  const gearSheet = ensureGearSheet();
  const gearRows = gearSheet.getDataRange().getValues();
  const gH = {};
  gearRows[0].forEach((v, i) => gH[v] = i);
  const gearMap = {};
  gearRows.slice(1).forEach(r => {
    if (!r[0]) return;
    const obj = {};
    GEAR_COLS.slice(1).forEach(col => { obj[col] = r[gH[col]] ?? ""; });
    gearMap[String(r[gH["userId"]])] = obj;
  });

  return { success: true, members: members.map(m => ({ ...m, gear: gearMap[m.userId] || {} })) };
}

function saveGearGAS(targetUserId, gear, requestUserId) {
  if (!isAdmin_(requestUserId)) return { success: false, msg: "権限がありません" };

  const gearSheet = ensureGearSheet();
  const rows = gearSheet.getDataRange().getValues();
  const gH = {};
  rows[0].forEach((v, i) => gH[v] = i);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][gH["userId"]]) === String(targetUserId)) {
      GEAR_COLS.slice(1).forEach(col => gearSheet.getRange(i + 1, gH[col] + 1).setValue(gear[col] ?? ""));
      return { success: true };
    }
  }
  gearSheet.appendRow(GEAR_COLS.map(col => col === "userId" ? targetUserId : (gear[col] ?? "")));
  return { success: true };
}

// ===== 未配布在庫 =====
function getGearSpareGAS() {
  const sheet = ensureSpareSheet();
  const rows = sheet.getDataRange().getValues();
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);
  const items = rows.slice(1)
    .filter(r => r[0])
    .map(r => ({
      spare_id: r[h["spare_id"]],
      item_type: r[h["item_type"]],
      value: r[h["value"]],
      memo: r[h["memo"]]
    }));
  return { success: true, items };
}

function addGearSpareGAS(item_type, value, memo, requestUserId) {
  if (!isAdmin_(requestUserId)) return { success: false, msg: "権限がありません" };
  if (!SPARE_TYPES.includes(item_type)) return { success: false, msg: "不正な種別" };
  const sheet = ensureSpareSheet();
  const id = Date.now();
  sheet.appendRow([id, item_type, value, memo || ""]);
  return { success: true, spare_id: id };
}

function deleteGearSpareGAS(spare_id, requestUserId) {
  if (!isAdmin_(requestUserId)) return { success: false, msg: "権限がありません" };
  const sheet = ensureSpareSheet();
  const rows = sheet.getDataRange().getValues();
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][h["spare_id"]]) === String(spare_id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, msg: "not found" };
}

function isAdmin_(userId) {
  const usersSheet = getSS().getSheetByName("users");
  if (!usersSheet) return false;
  const rows = usersSheet.getDataRange().getValues();
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);
  const row = rows.slice(1).find(r => r[h["userId"]] == userId);
  return row && row[h["role"]] === "admin";
}
