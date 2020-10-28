function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createAddonMenu()
      .addItem("Begin", 'rangecheck') //在Add-on中创建Begin选项
      .addToUi();
}

function rangecheck(){
  var inputRange = getInputRange();
  if (inputRange == ""){
    return;
  }

  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = activeSpreadSheet.getActiveSheet();
  var activeRange = activeSheet.getRange(inputRange);  

  var text = activeRange.getValues();
  text_result = text.map(formatcheck);

  var outputRange = findOutputRange(activeRange);
  outputRange.setValues(text_result);
  
}

function getInputRange() {
  var ui = SpreadsheetApp.getUi();

  var result = ui.prompt(
    'Links Extractor',
    'Please enter the range that you want to check format (e.g. A1:A10):',
      ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  var text = result.getResponseText();
  if (button == ui.Button.OK) {
    // May need to check valid range later.
    return text;
  } 
  return "";
}

function findOutputRange(inputRange) { 
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = activeSpreadSheet.getActiveSheet();
  
  var inputHeight = inputRange.getHeight();
  var inputWidth = inputRange.getWidth();
  var outputRow = inputRange.getRow();
  var outputColumn = activeSheet.getDataRange().getWidth() + 1;

  return activeSheet.getRange(outputRow, outputColumn, inputHeight, inputWidth);
}
