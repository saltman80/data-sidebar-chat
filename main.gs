function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('Data Whisperer')
    .addItem('Show Sidebar', 'showSidebar')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile('setupChatSidebar')
    .setTitle('Data Whisperer');
  SpreadsheetApp.getUi().showSidebar(html);
}