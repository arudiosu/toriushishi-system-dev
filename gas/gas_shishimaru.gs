// =======================================================
// ししまる機能：参加率・気づきメモ GAS
// =======================================================

// ===== 参加率集計 =====
function getParticipationStatsGAS(filter) {
  const ss = getSS();
  const usersSheet = ss.getSheetByName("users");
  if (!usersSheet) return { success: false, msg: "users sheet not found" };

  const userRows = usersSheet.getDataRange().getValues();
  const userHeaders = userRows[0];
  const uMap = {};
  userHeaders.forEach((h, i) => uMap[h] = i);

  // アクティブメンバーのみ
  const members = userRows.slice(1)
    .filter(r => r[uMap["status"]] === "active" && r[uMap["role"]] !== "admin")
    .map(r => ({ userId: r[uMap["userId"]], name: r[uMap["username"]] }));

  if (filter === "practice") {
    return calcPracticeStats(ss, members);
  }
  return calcEventStats(ss, members);
}

function calcEventStats(ss, members) {
  const sheet = ss.getSheetByName("answers-events");
  if (!sheet) return { success: true, stats: [] };

  const rows = sheet.getDataRange().getValues();
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);

  // イベントごとの全ユーザー回答を集計
  const eventIds = [...new Set(rows.slice(1).map(r => r[h["eventId"]]).filter(Boolean))];
  const total = eventIds.length;
  if (!total) return { success: true, stats: [] };

  const stats = members.map(m => {
    const participated = rows.slice(1).filter(r =>
      r[h["userId"]] == m.userId && r[h["answer"]] === "参加"
    ).length;
    return { name: m.name, participated, total, rate: participated / total };
  });

  stats.sort((a, b) => b.rate - a.rate);
  return { success: true, stats };
}

function calcPracticeStats(ss, members) {
  const sheet = ss.getSheetByName("answers-practices");
  if (!sheet) return { success: true, stats: [] };

  const rows = sheet.getDataRange().getValues();
  const h = {};
  rows[0].forEach((v, i) => h[v] = i);

  // 練習日の総数
  const practiceIds = [...new Set(rows.slice(1).map(r => r[h["practiceId"]]).filter(Boolean))];
  const total = practiceIds.length;

  // 練習シートからも集計（回答がない＝出席とみなす）
  const practiceSheet = ss.getSheetByName("practices");
  const allPracticeIds = practiceSheet
    ? practiceSheet.getDataRange().getValues().slice(1).map(r => r[0]).filter(Boolean)
    : practiceIds;
  const practiceTotal = allPracticeIds.length;
  if (!practiceTotal) return { success: true, stats: [] };

  const stats = members.map(m => {
    // 欠席・遅刻の数を数える
    const absent = rows.slice(1).filter(r =>
      r[h["userId"]] == m.userId && (r[h["answer"]] === "欠席" || r[h["answer"]] === "遅刻")
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
    .reverse(); // 新しい順
  return { success: true, memos };
}

function saveMemoGAS(text, userId) {
  const sheet = ensureMemoSheet();

  // ユーザー名を取得
  const usersSheet = getSS().getSheetByName("users");
  let userName = "名無し";
  if (usersSheet) {
    const rows = usersSheet.getDataRange().getValues();
    const h = {};
    rows[0].forEach((v, i) => h[v] = i);
    const userRow = rows.slice(1).find(r => r[h["userId"]] == userId);
    if (userRow) userName = userRow[h["username"]] || userName;
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

  // 管理者かどうかを確認
  const usersSheet = getSS().getSheetByName("users");
  let isAdmin = false;
  if (usersSheet) {
    const uRows = usersSheet.getDataRange().getValues();
    const uH = {};
    uRows[0].forEach((v, i) => uH[v] = i);
    const userRow = uRows.slice(1).find(r => r[uH["userId"]] == userId);
    if (userRow) isAdmin = userRow[uH["role"]] === "admin";
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
