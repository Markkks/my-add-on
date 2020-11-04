function onOpen(e){
  SpreadsheetApp.getUi()
      .createMenu('test')
      .addItem('start', 'start')
      .addToUi();
}

function start(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName('sheet1');

  var allRange = source.getDataRange(); //get all valid cell in a sheet
  var allData =allRange.getValues();

  //ss.insertSheet().setName('Test Result'); //添加一个新sheet
  var outsheet = ss.getSheetByName('Test Result')

  var row_l = allData.length;
  //var col_l = allData[0].length;

  //var titlerange = source.getRange(1,1,1,4);
  allRange.copyTo(outsheet.getRange(1,1));

  outsheet.getRange(1,5).setValue("标注");

//模板要求v0.1：标题在第一行，每行有四列信息：省、市、区、详细地址
  for(var i=2; i<row_l+1; i++){
    var markrange = outsheet.getRange(i,5);
    //var fixrange = outsheet.getRange(i,6);
    var state_info = [];
    var city_info = [];
    var district_info = [];

    for(var j=1;j<4;j++){
      var city = outsheet.getRange(i,j).getValue();
      var check_result = formatcheck(city);

      if(check_result == false){
        markrange.setValue("乱码，特殊符号");
        break;
      }

      var city_fix = findPosition(check_result.Ch);
      var match_city = findcity.getCity(city_fix);

      if(match_city == ''){
        markrange.setValue("非CN地址");
        break;
      }

      if(markrange.getValue()==''&&state_info[0]!="香港"&&check_result.Ch!="香港"){//香港地区可以填写英文
        if(check_result.Lan=='繁中'){
          markrange.setValue("繁体字");
        }
        else if(check_result.Lan=="Eng"&&check_result.Ch!="香港"){
          markrange.setValue("非香港地区填写英文/拼音")
        }
      }
      
      if(j==1){
        state_info = match_city;
      }
      else if(j==2){
        city_info = match_city;
      }
      else{
        district_info = match_city;
      }
    }

    if(markrange.getValue()=="乱码，特殊符号"||markrange.getValue()=="非CN地址"){
      continue;
    }

    if(match_address(state_info,city_info,district_info)){
      continue;//未进行纠正
    }
    else{
      markrange.setValue("省市区匹配关系错误");
    }
    
  }

}

function start_ori(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var outsheet = ss.getSheetByName('Test Result')

  var i = 14;
  var markrange = outsheet.getRange(i,6);
  var state_info = [];
  var city_info = [];
  var district_info = [];
  //var range = ss.getRange(2, 7);

  // var find_bj = findcity.getCity('南山')   //getCity为library中的函数
  // if(find_bj == ''){
  //   range.setValue('match failed');
  // }//匹配失败
  // else{
  //   range.setValue(find_bj[0].i);
  // }

  for(var j=1;j<4;j++){
    var city = outsheet.getRange(i,j).getValue();
    var check_result = formatcheck(city);

    if(check_result == false){
      markrange.setValue("乱码，特殊符号");
      break;
    }

    var city_fix = findPosition(check_result.Ch);
    var match_city = findcity.getCity(city_fix);

    if(match_city == ''){
      markrange.setValue("非CN地址");
      break;
    }

    if(markrange.getValue()==''&&state_info[0]!="香港"&&check_result.Ch!="香港"){//香港地区可以填写英文
      if(check_result.Lan=='繁中'){
        markrange.setValue("繁体字");
      }
      else if(check_result.Lan=="Eng"&&check_result.Ch!="香港"){
        markrange.setValue("非香港地区填写英文/拼音")
      }
    }
    
    if(j==1){
      state_info = match_city;
      outsheet.getRange(i,7).setValue(state_info[0].i);
    }
    else if(j==2){
      city_info = match_city;
      outsheet.getRange(i,8).setValue(city_info[0].i);
    }
    else{
      district_info = match_city;
      outsheet.getRange(i,9).setValue(district_info[0].i);
    }
  }
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
  var all_text = ['省','市','区','县','區','縣'];//省市区县字样
  var result_n = [0,0,0,0,0,0];

  for (var i=0; i<6; i++)
  {
    n = originText.indexOf(all_text[i]);
    result_n[i] = n;
  }

  if(result_n == [-1,-1,-1,-1,-1,-1]){
    return originText;
  }//[-1,-1,-1,-1]指没有相应字样

  // for (var i=0; i<4; i++)
  // {
  //   if(result_n[i]==0){return originText;}
  // }//0指对应字样（省市区县）位于第一个

  for (var i=0; i<6; i++){
    if(result_n[i] != -1 && result_n[i] == originText.length-1){
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
function match_address(pro,city,area){
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
  var patt_sym = new RegExp("[�`~!@#$^&*()=|{}':;',\\[\\]<>《》/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？]"); //符号

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