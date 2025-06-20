function processUserInput(prompt) {
  try {
    var dataObj = extractSheetDataFromPrompt(prompt);
    var dataJson = JSON.stringify(dataObj);
    appendChatMessage('user', prompt);
    var provider = getProvider();
    var fullPrompt = prompt + '\n\nData:\n' + dataJson;
    var response =
      provider === 'openrouter' ? AI_OpenRouter(fullPrompt) : AI_OpenAI(fullPrompt);
    appendChatMessage('assistant', response);
    return { success: true, messages: getChatHistory() };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.toString() };
  }
}

function extractSheetDataFromPrompt(prompt) {
  var sheet = SpreadsheetApp.getActiveSheet();
  if (!sheet) return { columns: {}, rows: {} };
  var maxRow = sheet.getLastRow();
  var maxCol = sheet.getLastColumn();

  var columns = {};
  var colLetters = [];
  var colRegex = /\bcol(?:umn)?s?\s+([a-z]+(?:\s*(?:,|and)\s*[a-z]+)*)/gi;
  var match;
  while ((match = colRegex.exec(prompt)) !== null) {
    var parts = match[1]
      .split(/(?:,|and)/i)
      .map(function(p) { return p.trim().toUpperCase(); })
      .filter(function(p) { return p; });
    Array.prototype.push.apply(colLetters, parts);
  }
  colLetters = Array.from(new Set(colLetters));
  colLetters.forEach(function(letter) {
    var colIndex = columnLetterToIndex(letter);
    if (colIndex >= 1 && colIndex <= maxCol) {
      var colValues = [];
      if (maxRow > 1) {
        colValues = sheet.getRange(2, colIndex, maxRow - 1, 1).getValues();
        colValues = colValues.map(function(r) { return r[0]; });
      }
      columns[letter] = colValues;
    }
  });

  var rows = {};
  var rowNumbers = [];
  var rowRegex = /\brow[s]?\s+(\d+(?:\s*-\s*\d+)?(?:\s*(?:,|and)\s*\d+(?:\s*-\s*\d+)?)*)/gi;
  while ((match = rowRegex.exec(prompt)) !== null) {
    var segments = match[1].split(/(?:,|and)/i);
    segments.forEach(function(seg) {
      var rangeParts = seg.trim().split(/\s*-\s*/);
      if (rangeParts.length === 2) {
        var start = parseInt(rangeParts[0], 10);
        var end = parseInt(rangeParts[1], 10);
        if (!isNaN(start) && !isNaN(end)) {
          if (start > end) {
            var tmp = start;
            start = end;
            end = tmp;
          }
          for (var i = start; i <= end; i++) rowNumbers.push(i);
        }
      } else {
        var num = parseInt(rangeParts[0], 10);
        if (!isNaN(num)) rowNumbers.push(num);
      }
    });
  }
  rowNumbers = Array.from(new Set(rowNumbers));
  rowNumbers.forEach(function(n) {
    if (n >= 1 && n <= maxRow) {
      var rowData = sheet.getRange(n, 1, 1, maxCol).getValues()[0];
      rows[n] = rowData;
    }
  });

  return { columns: columns, rows: rows };
}

function columnLetterToIndex(letter) {
  var col = 0;
  for (var i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col;
}


function appendChatMessage(role, content) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var cache = CacheService.getDocumentCache();
    var key = 'chatHistory';
    var raw = cache.get(key);
    var history = raw ? JSON.parse(raw) : [];
    history.push({
      role: role,
      content: content,
      message: content,
      text: content,
      timestamp: new Date().toISOString()
    });
    if (history.length > 100) history = history.slice(history.length - 100);
    cache.put(key, JSON.stringify(history), 3600);
  } finally {
    lock.releaseLock();
  }
}

function getChatHistory() {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var cache = CacheService.getDocumentCache();
    var raw = cache.get('chatHistory');
    return raw ? JSON.parse(raw) : [];
  } finally {
    lock.releaseLock();
  }
}

function clearChatHistory() {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    CacheService.getDocumentCache().remove('chatHistory');
  } finally {
    lock.releaseLock();
  }
}

// Alias for external usage
if (typeof ChatService === 'undefined') {
  ChatService = {};
}
ChatService.getChatLog = getChatHistory;
ChatService.clearChat = clearChatHistory;
ChatService.exportChatLog = exportChatLogToTimestampedSheet;

function getChatLog() {
  return getChatHistory();
}

function clearChat() {
  clearChatHistory();
  return getChatHistory();
}

function exportChatLog() {
  exportChatLogToTimestampedSheet();
}
