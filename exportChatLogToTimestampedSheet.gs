function exportChatLogToTimestampedSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log;
  try {
    log = ChatService.getChatLog();
  } catch (err) {
    Logger.log('Error retrieving chat log: ' + err);
    ss.toast('Error retrieving chat log.', 'Export Chat Log', 5);
    return;
  }
  if (!Array.isArray(log) || log.length === 0) {
    ss.toast('No chat log to export.', 'Export Chat Log', 5);
    return;
  }
  var entriesValid = log.every(function(entry) {
    return entry && typeof entry === 'object';
  });
  if (!entriesValid) {
    Logger.log('Invalid chat log structure: ' + JSON.stringify(log));
    ss.toast('Invalid chat log structure.', 'Export Chat Log', 5);
    return;
  }
  var tz = ss.getSpreadsheetTimeZone();
  var now = new Date();
  var sheetTimestamp = Utilities.formatDate(now, tz, 'yyyyMMdd_HHmmss');
  var baseName = 'Chat Export - ' + sheetTimestamp;
  var MAX_SHEET_NAME_LENGTH = 100;
  var sheetName = baseName.length > MAX_SHEET_NAME_LENGTH
    ? baseName.substring(0, MAX_SHEET_NAME_LENGTH)
    : baseName;
  var existingNames = ss.getSheets().map(function(s) { return s.getName(); });
  var sheet;
  var maxRetries = 5;
  for (var i = 0; i < maxRetries; i++) {
    try {
      if (existingNames.indexOf(sheetName) !== -1) {
        var suffix = '_' + Math.floor(Math.random() * 10000);
        var tempName = baseName + suffix;
        sheetName = tempName.length > MAX_SHEET_NAME_LENGTH
          ? tempName.substring(0, MAX_SHEET_NAME_LENGTH)
          : tempName;
      }
      sheet = ss.insertSheet(sheetName);
      break;
    } catch (e) {
      Logger.log('Attempt ' + (i + 1) + ' to create sheet "' + sheetName + '" failed: ' + e);
      if (i === maxRetries - 1) {
        ss.toast('Could not create export sheet after ' + maxRetries + ' attempts.', 'Export Chat Log', 5);
        return;
      }
      var retrySuffix = '_' + Math.floor(Math.random() * 10000);
      var retryName = baseName + retrySuffix;
      sheetName = retryName.length > MAX_SHEET_NAME_LENGTH
        ? retryName.substring(0, MAX_SHEET_NAME_LENGTH)
        : retryName;
    }
  }
  var rows = [['Timestamp', 'Role', 'Message']];
  log.forEach(function(entry) {
    var ts = '';
    if (entry.timestamp) {
      try {
        ts = Utilities.formatDate(new Date(entry.timestamp), tz, 'yyyy-MM-dd HH:mm:ss');
      } catch (err) {
        ts = '';
      }
    }
    var role = entry.role || '';
    var msg = entry.message || entry.text || '';
    rows.push([ts, role, msg]);
  });
  try {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  } catch (err) {
    Logger.log('Error writing chat log to sheet "' + sheetName + '": ' + err);
    ss.toast('Error writing chat log to sheet.', 'Export Chat Log', 5);
    return;
  }
  ss.setActiveSheet(sheet);
  ss.toast('Chat log exported to sheet: ' + sheetName, 'Export Chat Log', 5);
}