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
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = activeSpreadSheet.getActiveSheet();
  var activeRange = activeSheet.getRange("A1:D4");
  var outputRange = activeSheet.getRange("A7:D10");
  var allArray = activeRange.getValues();
  var newArray = allArray[0].map(function (col, i) {
    return allArray.map(function (row) {
      return row[i];
    }) 
  });
  outputRange.setValues(newArray);
  //ui.alert('Hello World with little difference!'); //弹窗显示Hello World!
}
