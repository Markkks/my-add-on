function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createAddonMenu()
      .addItem("Begin", 'showPrompt') //在Add-on中创建Begin选项
      .addToUi();
}

function showPrompt() {
  var ui = SpreadsheetApp.getUi(); 
  ui.alert('Hello World with little difference!'); //弹窗显示Hello World!
}
