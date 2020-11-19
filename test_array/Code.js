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
  var emp_array = ["非CN地址","b","c","d"];
  var err_position = ["，State栏出现错误","，City栏出现错误","，District栏出现错误"];
  var new_str = emp_array[0].concat(err_position[1]);
  var outrange = activeSheet.getRange(1,1);
  outrange.setValue(new_str);
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