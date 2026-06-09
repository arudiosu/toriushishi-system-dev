// =======================================================
// ししまる機能：参加率・気づきメモ GAS
// =======================================================

// ===== 参加率集計 =====
function getParticipationStatsGAS(filter) {
  const ss = getSS();
  const usersSheet = ss.getSheetByName("users");
  if (!usersSheet) return { success: false, msg: "users sheet not found" };

  const userRows = usersSheet.getDataRange().getValues();
  const uMap = {};
  userRows[0].forEach((h, i) => uMap[h] = i);

  // アクティブメンバー全員（管理者も含む）
  const members = userRows.slice(1)
    .filter(r => r[uMap["status"]] === "active")
    .map(r => ({ userId: r[uMap["userId"]], name: r[uMap["storedName"]] }));

  return filter === "practice"
    ? calcPracticeStats(ss, members)
    : calcEventStats(ss, members);
}

function calcEventStats(ss, members) {
  // イベント総数はeventsシートから取得
  const eventSheet = ss.getSheetByName("events");
  const total = eventSheet
    ? eventSheet.getDataRange().getValues().slice(1).filter(r => r[0]).length
    : 0;
  if (!total) return { success: true, stats: [] };

  const ansSheet = ss.getSheetByName("answers-events");
  const rows = ansSheet ? ansSheet.getDataRange().getValues() : [[]];
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);

  const stats = members.map(m => {
    const participated = rows.slice(1).filter(r =>
      r[h["userId"]] == m.userId && r[h["status"]] === "参加"
    ).length;
    return { name: m.name, participated, total, rate: participated / total };
  });

  stats.sort((a, b) => b.rate - a.rate);
  return { success: true, stats };
}

function calcPracticeStats(ss, members) {
  const practiceSheet = ss.getSheetByName("practices");
  const practiceTotal = practiceSheet
    ? practiceSheet.getDataRange().getValues().slice(1).filter(r => r[0]).length
    : 0;
  if (!practiceTotal) return { success: true, stats: [] };

  const sheet = ss.getSheetByName("answers-practices");
  const rows = sheet ? sheet.getDataRange().getValues() : [[]];
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);

  const stats = members.map(m => {
    // 欠席・遅刻の数を数える（回答なし＝出席扱い）
    const absent = rows.slice(1).filter(r =>
      r[h["userId"]] == m.userId &&
      (r[h["status"]] === "欠席" || r[h["status"]] === "遅刻")
    ).length;
    const participated = practiceTotal - absent;
    return { name: m.name, participated, total: practiceTotal, rate: participated / practiceTotal };
  });

  stats.sort((a, b) => b.rate - a.rate);
  return { success: true, stats };
}

// ===== 気づきメモ CRUD =====
function ensureMemoSheet() {
  const ss = getSS();
  let sheet = ss.getSheetByName("memos");
  if (!sheet) {
    sheet = ss.insertSheet("memos");
    sheet.appendRow(["memo_id", "user_id", "user_name", "date", "text"]);
  }
  return sheet;
}

function getMemosGAS() {
  const sheet = ensureMemoSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const memos = rows.slice(1)
    .filter(r => r[0])
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    })
    .reverse();
  return { success: true, memos };
}

function saveMemoGAS(text, userId) {
  const sheet = ensureMemoSheet();
  const usersSheet = getSS().getSheetByName("users");
  let userName = "名無し";
  if (usersSheet) {
    const rows = usersSheet.getDataRange().getValues();
    const h = {};
    rows[0].forEach((v, i) => h[v] = i);
    const row = rows.slice(1).find(r => r[h["userId"]] == userId);
    if (row) userName = row[h["storedName"]] || userName;
  }
  const memoId = Date.now();
  const date = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm");
  sheet.appendRow([memoId, userId, userName, date, text]);
  return { success: true, memo_id: memoId };
}

function deleteMemoGAS(memoId, userId) {
  const sheet = ensureMemoSheet();
  const rows = sheet.getDataRange().getValues();
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);

  const usersSheet = getSS().getSheetByName("users");
  let isAdmin = false;
  if (usersSheet) {
    const uRows = usersSheet.getDataRange().getValues();
    const uH = {};
    uRows[0].forEach((v, i) => uH[v] = i);
    const row = uRows.slice(1).find(r => r[uH["userId"]] == userId);
    if (row) isAdmin = row[uH["role"]] === "admin";
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][h["memo_id"]] == memoId) {
      if (rows[i][h["user_id"]] != userId && !isAdmin) {
        return { success: false, msg: "権限がありません" };
      }
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, msg: "not found" };
}
