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
  var ss = SpreadsheetApp.getActiveSheet()
  ss.insertSheet();
  ss.setName("Test Result");

  var allRange = ss.getDataRange();//get all valid cell in a sheet
  var allData = allRange.getValues();

  var row_l = allData.length;
  var col_l = allData[0].length;

}

//格式校验，区分乱码、拼音、繁中、简中
function check_format(){
}

//翻译英文、拼音、繁中为简中
function translate(){
}

//找到对应省市区的编码
function find_code(){
}

//确定编码是否匹配--省市区包含关系
function match_address(){
}


