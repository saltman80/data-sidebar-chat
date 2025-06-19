function processUserInput(prompt) {
  try {
    var dataJson = getSelectedRangeAsJson();
    appendChatMessage('user', prompt);
    var response = callAiProvider(prompt, dataJson);
    appendChatMessage('assistant', response);
    return { success: true, messages: getChatHistory() };
  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.toString() };
  }
}

function getSelectedRangeAsJson() {
  var range = SpreadsheetApp.getActiveRange();
  if (!range) return JSON.stringify([]);
  var values = range.getDisplayValues();
  if (values.length < 1) return JSON.stringify([]);
  var headers = values[0];
  var rows = values.slice(1);
  var data = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
  return JSON.stringify(data);
}

function callAiProvider(prompt, dataJson) {
  var props = PropertiesService.getDocumentProperties();
  var provider = props.getProperty('aiProvider') || 'openai';
  if (provider === 'openai') {
    var apiKey = props.getProperty('openaiApiKey');
    if (!apiKey) throw new Error('Missing OpenAI API key. Please configure it in the settings.');
    var apiUrl = props.getProperty('openaiApiUrl') || 'https://api.openai.com/v1/chat/completions';
    var model = props.getProperty('openaiModel') || 'gpt-3.5-turbo';
    var systemPrompt = 'You are a helpful assistant for Google Sheets data analysis.';
    // Truncate data if too large
    var truncated = truncateForOpenAI(prompt, dataJson, model, 500);
    dataJson = truncated.data;
    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt + '\n\nData:\n' + dataJson }
    ];
    var payload = { model: model, messages: messages };
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var res = UrlFetchApp.fetch(apiUrl, options);
    var code = res.getResponseCode(), body = res.getContentText();
    if (code >= 200 && code < 300) {
      var json = JSON.parse(body);
      return json.choices[0].message.content.trim();
    } else {
      throw new Error('OpenAI API Error: ' + code + ' ' + body);
    }
  } else if (provider === 'anthropic') {
    var apiKey = props.getProperty('anthropicApiKey');
    if (!apiKey) throw new Error('Missing Anthropic API key. Please configure it in the settings.');
    var apiUrl = props.getProperty('anthropicApiUrl') || 'https://api.anthropic.com/v1/complete';
    var model = props.getProperty('anthropicModel') || 'claude-v1';
    var maxCompletionTokens = parseInt(props.getProperty('anthropicMaxTokens') || '500', 10);
    // Truncate data if too large
    var truncated = truncateForAnthropic(prompt, dataJson, model, maxCompletionTokens);
    dataJson = truncated.data;
    var promptText = "You are a helpful AI assistant for Google Sheets data analysis.\n\nUser: " + prompt + "\n\nData:\n" + dataJson + "\n\nAssistant:";
    var payload = {
      model: model,
      prompt: promptText,
      max_tokens_to_sample: maxCompletionTokens,
      temperature: 0.7
    };
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var res = UrlFetchApp.fetch(apiUrl, options);
    var code = res.getResponseCode(), body = res.getContentText();
    if (code >= 200 && code < 300) {
      var json = JSON.parse(body);
      return json.completion.trim();
    } else {
      throw new Error('Anthropic API Error: ' + code + ' ' + body);
    }
  } else {
    throw new Error('Unsupported AI provider: ' + provider);
  }
}

function truncateForOpenAI(prompt, dataJson, model, reservedTokens) {
  var maxModelTokens = 4096;
  if (model.toLowerCase().indexOf('gpt-4') !== -1) maxModelTokens = 8192;
  var promptTokens = Math.ceil(prompt.length / 4);
  var dataTokens = Math.ceil(dataJson.length / 4);
  var available = maxModelTokens - reservedTokens - promptTokens;
  if (dataTokens > available) {
    var maxChars = available * 4;
    return { data: dataJson.substring(0, maxChars) + '\n...[truncated]', truncated: true };
  }
  return { data: dataJson, truncated: false };
}

function truncateForAnthropic(prompt, dataJson, model, reservedTokens) {
  var maxModelTokens = 9000;
  var promptTokens = Math.ceil(prompt.length / 4);
  var dataTokens = Math.ceil(dataJson.length / 4);
  var available = maxModelTokens - reservedTokens - promptTokens;
  if (dataTokens > available) {
    var maxChars = available * 4;
    return { data: dataJson.substring(0, maxChars) + '\n...[truncated]', truncated: true };
  }
  return { data: dataJson, truncated: false };
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