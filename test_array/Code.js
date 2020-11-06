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
  var activeRange = activeSheet.getDataRange(); //get all valid cell in a sheet
  // var outputRange = findOutputRange(activeRange);

  // var allArray = activeRange.getValues();

  //数组转置
  // var newArray = allArray[0].map(function (col, i) {
  //   return allArray.map(function (row) {
  //     return row[i];
  //   }) 
  // });
  //outputRange.setValues(allArray);
  var emp_array = ["a","b","c","d"]
  var outrange = activeSheet.getRange(1,1);
  outrange.setValues(emp_array);
}

function findOutputRange(inputRange) { 
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = activeSpreadSheet.getActiveSheet();
  
  var inputHeight = inputRange.getHeight();
  var inputWidth = inputRange.getWidth();
  var outputRow = inputRange.getRow();
  var outputColumn = activeSheet.getDataRange().getWidth() + 2;

  return activeSheet.getRange(outputRow, outputColumn, inputHeight, inputWidth);
}