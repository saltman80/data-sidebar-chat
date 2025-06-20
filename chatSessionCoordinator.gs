function processUserInput(prompt) {
  try {
    var range = getSelectedRangeAsJson();
    var dataJson = JSON.stringify([]);
    if (!range.error) {
      var headers = range.headers;
      dataJson = JSON.stringify(range.values.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i]; });
        return obj;
      }));
    }
    appendChatMessage('user', prompt);
    var response = callAiProvider(prompt, dataJson);
    appendChatMessage('assistant', response);
    return { success: true, messages: getChatHistory() };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.toString() };
  }
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