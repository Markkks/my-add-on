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

  var find_bj = findcity.getCity('北京')
  if(find_bj == ''){
    range.setValue('match failed');
  }//匹配失败
  //range.setValue(find_bj[0].i);

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

function trans(text){
  var result = LanguageApp.translate(text,'en','zh-CN');
  return result;
}

function text_findPosition(){
  var fix_result = findPosition('北京市');
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = ss.getRange(5,5);
  range.setValue(fix_result);
}

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
  }

  for (var i=0; i<3; i++)
  {
    if(result_n[i]==0){return false;}
  }

  for (var i=0; i<3; i++)
  {
    if(result_n[i] != -1){
      fixtext = originText.substring(0,originText.length-1);
      return fixtext;
    }
  }
  
  return originText;
}