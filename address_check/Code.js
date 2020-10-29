function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createAddonMenu()
      .addItem("Start", 'start') //在Add-on中创建start选项
      .addToUi();
}

function start(){
}

