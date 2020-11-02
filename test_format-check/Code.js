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

function test_formatcheck(){
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = ss.getRange(2, 2);
  var tran_result = formatcheck('HongKong');
  if(tran_result){
    range.setValue('Fail');
  }
  else{
    range.setValue(tran_result.Ch);
  }
}

function formatcheck(str){
  var patt_cn = new RegExp("[\u4E00-\u9FA5]+"); //简体中文繁体中文
  var patt_en = new RegExp("[A-Za-z]+"); //英文
  var patt_num = new RegExp("[0-9]+"); //数字
  var patt_sym = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>《》/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？]"); //符号

  if(patt_num.test(str)||patt_sym.test(str)){
    return false;
  }
  if(patt_cn.test(str)&&patt_en.test(str)){
    return false;
  }

  if(patt_cn.test(str)){
    var trans = LanguageApp.translate(str,'zh-TW','zh-CN');//简中zh-CN，繁中zh-TW，英文en。
    if(trans==str){
      var lan = '简中';
    }
    else{
      var lan = '繁中';
    }
  }
  if(patt_en.test(str)){
    var trans = LanguageApp.translate(str,'en','zh-CN');
    var lan = 'Eng';
  }

  if(patt_cn.test(trans)){
    var result = {"Ori":str,"Lan":lan,"Ch":trans};
    return result;
  }
  else{
    return false;
  }
}