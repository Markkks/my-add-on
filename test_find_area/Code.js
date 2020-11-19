// function onOpen(e){
//   SpreadsheetApp.getUi()
//       .createMenu('test')
//       .addItem('start', 'start')
//       .addToUi();
// }

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createAddonMenu()
      .addItem("Start", 'showPrompt')
      .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showPrompt() {
  var ui = SpreadsheetApp.getUi(); // Same variations.
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();

  var result = ui.prompt(
      "省市区校验",
      "请输入需要校验的sheet名称",
      ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  var text = result.getResponseText();
  if (button == ui.Button.OK) {
    // User clicked "OK".
    sheet_name = text;
    var allsheets_name = new Array();
    for(var i=0;i<sheets.length;i++){
      allsheets_name.push(sheets[i].getName());
    }
    if(allsheets_name.includes(sheet_name)){
      ui.alert("开始处理，请稍后！")
      start(sheet_name);
    }
    else{
      ui.alert("输入的sheet名称在当前文件中不存在！")
    }
    
  }
}

//模板要求v0.5：标题在第一行，省、市、区、详细地址分别在11，12，13，14行
function start(name){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName(name);

  var aRange = source.getDataRange(); //get all valid cell in a sheet
  var aData =aRange.getValues();

  new_sheet_name = 'Test Result of '+ name;

  ss.insertSheet().setName(new_sheet_name); //添加一个新sheet
  var outsheet = ss.getSheetByName(new_sheet_name);

  var row_l = aData.length;
  //var col_l = allData[0].length;

  var id_range = source.getRange(1,1,row_l,1);

  var allRange = source.getRange(1,11,row_l,4);
  var allData = allRange.getValues();

  //var titlerange = source.getRange(1,1,1,4);
  id_range.copyTo(outsheet.getRange(1,1));
  allRange.copyTo(outsheet.getRange(1,2));

  var outData = [["标注"]];
  var enErr = ["非香港地区填写英文/拼音"];
  //var cnErr = ["繁体字"];
  var symErr = ["乱码，特殊符号"];
  var noErr = ["非CN地址"];
  var maErr = ["省市区匹配关系错误"];
  var emErr = ["地址为空"];
  var inErr = ["填写不规范"];
  var right = [""];
  //outsheet.getRange(1,5).setValue("标注");

  var col_pos = 10;
  for(var i=1; i<row_l; i++){
    //var markrange = outsheet.getRange(i,5);
    //var fixrange = outsheet.getRange(i,6);
    var state_info = [];
    var city_info = [];
    var district_info = [];

    for(var j=0;j<3;j++){
      var city = allData[i][j];
      if(city == ""){
        outData.push(emErr);
        break;
      }
      var check_result = formatcheck(city);

      if(check_result == false){
        //markrange.setValue("乱码，特殊符号");
        outData.push(symErr);
        break;
      }

      //香港地址的校验-英/中
      if(check_result=="Hongkong"&&j==0){
        if(allData[i][j+11+1]==""||allData[i][j+11+2]==""){//校验后两个单元格是否为空
          outData.push(emErr);
          break;
        }

        HK_state = translate_en(allData[i][j]);
        HK_city = translate_en(allData[i][j+1]);
        HK_dist = translate_en(allData[i][j+2]);
        
        HK_result = check_HK(HK_state,HK_city,HK_dist);
        if(HK_result==true){
          outData.push(right);
          break;
        }
        else if(HK_result=="noMatch"){
          outData.push(noErr);
          break;
        }
        else{
          outData.push(maErr);
          break;
        }
      }

      if(check_result=="Eng"){
        //markrange.setValue("非香港地区填写英文/拼音")
        outData.push(enErr);
        break;
      }
      
      //中文地址校验
      var city_fix = findPosition(city);
      var match_city = findcity.getCity(city_fix);

      if(match_city == ''){
        //markrange.setValue("非CN地址");
        outData.push(noErr);
        break;
      }

      if(!city.includes("自治")&&city.length>=8){
        outData.push(inErr);
        break;        
      }

      // if(j==0&&city.length>10){
      //   outData.push(inErr);
      //   break;
      // }
      // else if(j!=0&&city_fix.length>=8){
      //   outData.push(inErr);
      //   break;
      // }
      
      if(j==0){
        state_info = match_city;
      }
      else if(j==1){
        city_info = match_city;
      }
      else{
        district_info = match_city;
      }
    }

    if(outData.length == i+1){//除中文地址外的结果
      continue;
    }

    if(match_address(state_info,city_info,district_info)){
      outData.push(right);
    }
    else{
      //markrange.setValue("省市区匹配关系错误");
      outData.push(maErr);
    }
    
  }

  var outRange = outsheet.getRange(1,6,row_l,1);
  outRange.setValues(outData);

}

//校验香港地址--英/中
function check_HK(state,city,area){
  state_fix = findPosition(state);
  city_fix = findPosition(city);
  area_fix = area;

  state_info = findcity.getCity(state_fix);
  city_info = findcity.getCity(city_fix);
  area_info = findcity.getCity(area_fix);

  if(city_info==""||area_info==""){
    return "noMatch";
  }
  
  if(match_address(state_info,city_info,area_info)){
    return true;
  }
  else{
    return false;
  }
}

function test_getcity(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName('sheet5');
  var arange = source.getRange(2,2);
  var test_city = "北京市";
  var test_result = findcity.getCity(test_city);
  arange.setValue(test_result[0].n);
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

function test_translate(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName('sheet5');
  var arange = source.getRange(2,3);
  var test_city = "Kowloon";
  var test_result = translate_en(test_city);
  arange.setValue(test_result);
}

//英文翻译为中文
function translate_en(text){
  var result = LanguageApp.translate(text,'en','zh-CN');//简中zh-CN，繁中zh-TW，英文en。
  Utilities.sleep(50);
  if(result == "粤"){
    return "广东";
  }
  else{
    return result;
  }
}

//繁中翻译为简中
function translate_cn(text){
  var result = LanguageApp.translate(text,'zh-TW','zh-CN');//简中zh-CN，繁中zh-TW，英文en。
  Utilities.sleep(50);
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
  if(originText.length==2){
    return originText;
  }
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
        if(pro[l].i==city[j].p && city[j].i==area[k].p){
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
    range.setValue(tran_result);
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

  // if(patt_cn.test(str)){
  //   var trans = LanguageApp.translate(str,'zh-TW','zh-CN');//简中zh-CN，繁中zh-TW，英文en。
  //   if(trans==str){
  //     var lan = '简中';
  //   }
  //   else{
  //     var lan = '繁中';
  //   }
  // }
  // if(patt_en.test(str)){
  //   var trans = translate_en(str);
  //   var lan = 'Eng';
  // }

  if(patt_en.test(str)){
    var trans = translate_en(str);
    if(trans=="香港"){
      return "Hongkong";
    }
    else{
      return "Eng";
    }
  }

  if(patt_cn.test(str)){
    return "Chi";
  }

  return false;
}