// =======================================================
// お旅管理 GAS
// =======================================================

function ensureOtabiSheets() {
  const ss = getSS();
  const sheetsNeeded = [
    { name: "otabi_places", headers: ["place_id", "name", "address", "memo"] },
    { name: "otabi_schedules", headers: ["entry_id", "year", "group", "no", "time", "place_id", "place_name", "memo", "donation"] }
  ];
  sheetsNeeded.forEach(({ name, headers }) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
    }
  });
}

// ===== 場所 CRUD =====
function getOtabiPlacesGAS() {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_places");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const places = rows.slice(1).filter(r => r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { success: true, places };
}

function saveOtabiPlaceGAS(place) {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_places");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const hMap = {};
  headers.forEach((h, i) => hMap[h] = i);

  if (place.place_id) {
    // 更新
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][hMap["place_id"]] == place.place_id) {
        sheet.getRange(i + 1, hMap["name"] + 1).setValue(place.name || "");
        sheet.getRange(i + 1, hMap["address"] + 1).setValue(place.address || "");
        sheet.getRange(i + 1, hMap["memo"] + 1).setValue(place.memo || "");
        return { success: true };
      }
    }
  }
  // 新規
  const newId = Date.now();
  sheet.appendRow([newId, place.name || "", place.address || "", place.memo || ""]);
  return { success: true, place_id: newId };
}

function deleteOtabiPlaceGAS(placeId) {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_places");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == placeId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, msg: "not found" };
}

// ===== スケジュール CRUD =====
function getOtabiScheduleGAS(year, group) {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_schedules");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const hMap = {};
  headers.forEach((h, i) => hMap[h] = i);

  const schedule = rows.slice(1).filter(r => r[0] && r[hMap["year"]] == year && r[hMap["group"]] == group)
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    })
    .sort((a, b) => (a.no || 0) - (b.no || 0));
  return { success: true, schedule };
}

function saveOtabiEntryGAS(entry) {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_schedules");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const hMap = {};
  headers.forEach((h, i) => hMap[h] = i);

  const rowArr = [
    entry.entry_id || Date.now(),
    entry.year,
    entry.group,
    entry.no || "",
    entry.time || "",
    entry.place_id || "",
    entry.place_name || "",
    entry.memo || "",
    entry.donation || ""
  ];

  if (entry.entry_id) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][hMap["entry_id"]] == entry.entry_id) {
        rowArr[0] = entry.entry_id;
        sheet.getRange(i + 1, 1, 1, rowArr.length).setValues([rowArr]);
        return { success: true };
      }
    }
  }
  sheet.appendRow(rowArr);
  return { success: true };
}

function deleteOtabiEntryGAS(entryId) {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_schedules");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == entryId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, msg: "not found" };
}

function copyOtabiScheduleGAS(fromYear, toYear, group) {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_schedules");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const hMap = {};
  headers.forEach((h, i) => hMap[h] = i);

  const fromRows = rows.slice(1).filter(r => r[0] && r[hMap["year"]] == fromYear && r[hMap["group"]] == group);
  fromRows.forEach(r => {
    const newRow = [...r];
    newRow[hMap["entry_id"]] = Date.now() + Math.random();
    newRow[hMap["year"]] = toYear;
    newRow[hMap["donation"]] = "";
    sheet.appendRow(newRow);
  });
  return { success: true, copied: fromRows.length };
}

function getOtabiDonationsGAS(year, group) {
  ensureOtabiSheets();
  const sheet = getSS().getSheetByName("otabi_schedules");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const hMap = {};
  headers.forEach((h, i) => hMap[h] = i);

  const donations = rows.slice(1)
    .filter(r => r[0] && r[hMap["year"]] == year && r[hMap["group"]] == group && r[hMap["donation"]])
    .map(r => ({
      place_name: r[hMap["place_name"]] || "",
      donation: r[hMap["donation"]] || 0
    }));
  return { success: true, donations };
}
