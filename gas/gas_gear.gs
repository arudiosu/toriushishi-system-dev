// =======================================================
// 装備管理 GAS
// =======================================================

const GEAR_COLS = ["userId", "happi_no", "tshirt_size", "tekkou", "art",
                   "odaiko", "kotaiko", "shishi", "happi_r8",
                   "hakama", "kimono_top", "kimono_bottom", "memo"];

function ensureGearSheet() {
  const ss = getSS();
  let sheet = ss.getSheetByName("member_gear");
  if (!sheet) {
    sheet = ss.insertSheet("member_gear");
    sheet.appendRow(GEAR_COLS);
  }
  return sheet;
}

function getGearGAS() {
  const ss = getSS();
  const usersSheet = ss.getSheetByName("users");
  if (!usersSheet) return { success: false };

  const userRows = usersSheet.getDataRange().getValues();
  const uH = {};
  userRows[0].forEach((v, i) => uH[v] = i);
  const members = userRows.slice(1)
    .filter(r => r[uH["status"]] === "active")
    .map(r => ({
      userId: String(r[uH["userId"]]),
      name: r[uH["storedName"]],
      role: r[uH["role"]]
    }));

  const gearSheet = ensureGearSheet();
  const gearRows = gearSheet.getDataRange().getValues();
  const gH = {};
  gearRows[0].forEach((v, i) => gH[v] = i);
  const gearMap = {};
  gearRows.slice(1).forEach(r => {
    if (!r[0]) return;
    const uid = String(r[gH["userId"]]);
    const obj = {};
    GEAR_COLS.slice(1).forEach(col => { obj[col] = r[gH[col]] ?? ""; });
    gearMap[uid] = obj;
  });

  const result = members.map(m => ({ ...m, gear: gearMap[m.userId] || {} }));
  return { success: true, members: result };
}

function saveGearGAS(targetUserId, gear, requestUserId) {
  const ss = getSS();
  const usersSheet = ss.getSheetByName("users");
  if (!usersSheet) return { success: false };
  const uRows = usersSheet.getDataRange().getValues();
  const uH = {};
  uRows[0].forEach((v, i) => uH[v] = i);
  const reqUser = uRows.slice(1).find(r => r[uH["userId"]] == requestUserId);
  if (!reqUser || reqUser[uH["role"]] !== "admin") return { success: false, msg: "権限がありません" };

  const gearSheet = ensureGearSheet();
  const rows = gearSheet.getDataRange().getValues();
  const gH = {};
  rows[0].forEach((v, i) => gH[v] = i);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][gH["userId"]]) === String(targetUserId)) {
      GEAR_COLS.slice(1).forEach(col => {
        gearSheet.getRange(i + 1, gH[col] + 1).setValue(gear[col] ?? "");
      });
      return { success: true };
    }
  }
  const newRow = GEAR_COLS.map(col => col === "userId" ? targetUserId : (gear[col] ?? ""));
  gearSheet.appendRow(newRow);
  return { success: true };
}
