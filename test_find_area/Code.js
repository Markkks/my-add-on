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

function test_match_address(){
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = ss.getRange(1, 4);
  if(match_address()){
    range.setValue('success');
  }
}

//确定编码是否匹配--省市区包含关系
//parameter: province,city,area
function match_address(pro= [{"n": "北京","i": 11,"p": 0,"y": "b"}],city=[{"n": "北京","i": 1101,"p": 11,"y": "b"}],area=[{"n": "东城","i": 110101,"p": 1101,"y": "d"}]){
  pro = [{"n": "北京","i": 11,"p": 0,"y": "b"}];
  city = [{"n": "北京","i": 1101,"p": 11,"y": "b"}];
  area = [{"n": "东城","i": 110101,"p": 1101,"y": "d"}];
  len_pro = pro.length;
  len_city = city.length;
  len_area = area.length;

  for (var l=0; l<len_pro; l++){
    for(var j=0; j<len_city; j++){
      for(var k=0; k<len_area; k++){
        if(pro[l].p==0 && pro[l].i==city[j].p && city[j].i==area[k].p){
          return true;
        }
      }
    }
  }

  return false;
}

function test_formatcheck(){
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = ss.getRange(2, 2);
  var tran_result = formatcheck('HongKong');
  if(tran_result == false){
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
  var patt_sym = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>《》/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？\uFFF0-\uFFFF]+"); //符号

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