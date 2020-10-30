function onOpen(e){
  SpreadsheetApp.getUi()
      .createMenu('test')
      .addItem('start', 'start')
      .addToUi();
}

function start(){
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  var range = ss.getRange(2, 2);
  //range.setValue(found[0].name);

  var find_bj = findcity.getCity('北京')   //getCity为library中的函数
  if(find_bj == ''){
    range.setValue('match failed');
  }//匹配失败
  range.setValue(find_bj[0].i);

  var city_cn = trans('beijing');
  range.setValue(city_cn);
  
}

function getCityByName(n) {
  var iter = [
    {"n": "北京","i": 11,"p": 0,"y": "b"},
    {"n": "北京","i": 1101,"p": 11,"y": "b"},
    {"n": "东城","i": 110101,"p": 1101,"y": "d"}]
  return iter.filter(
    function(iter) {
      return iter.n == n
    }
  );
}

function test_tran(){
  var tran_result = trans('henan');
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = ss.getRange(5,5);
  range.setValue(tran_result);
}

//英文翻译为中文
function trans(text){
  var result = LanguageApp.translate(text,'en','zh-CN');//简中zh-CN，繁中zh-TW，英文en。
  return result;
}

function text_findPosition(){
  var fix_result = findPosition('北京市');
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = ss.getRange(5,5);
  range.setValue(fix_result);
}

//去除省市区字样，北京市->北京
function findPosition(originText){
  var text1 = '省';
  var text2 = '市';
  var text3 = '区';
  var all_text = [text1,text2,text3];
  var result_n = [0,0,0];

  for (var i=0; i<3; i++)
  {
    n = originText.indexOf(all_text[i]);
    result_n[i] = n;
  }

  if(result_n == [-1,-1,-1]){
    return originText;
  }//[-1,-1,-1]指没有相应字样

  for (var i=0; i<3; i++)
  {
    if(result_n[i]==0){return originText;}
  }//0指对应字样（省市区）位于第一个

  for (var i=0; i<3; i++)
  {
    if(result_n[i] != -1 && result_n[i] == originText.length){
      fixtext = originText.substring(0,originText.length-1);
      return fixtext;
    }//有对应字样且对应字样位于最后一位，去掉最后一个字
  }
  
  return originText;
}