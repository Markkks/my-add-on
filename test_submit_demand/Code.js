function start(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var range = sheet.getRange("A1:H1");

  var title = [["部门","名字","shopee邮箱","需求背景","需求概要","紧急程度","创建日期","提交状态(无需填写)"]];
  var example = [["Special Project","Marks Chen","yiming.chen@shopee.com","Add-on工具的初步使用","需要一个 Add-on 工具完成有关 Add-on 的需求提交","紧急/正常/不紧急","2020/11/12"]];
  var ex_range = sheet.getRange("A2:G2");
  range.setValues(title);
  range.setFontWeight("bold");
  ex_range.setValues(example);

  sheet.autoResizeColumns(1,8);
  var dem_range = sheet.getRange(2,4,200,2);
  dem_range.setWrap(true);

//var cell = sheet.getRange("B2");
//cell.setWrap(false);
//sheet.autoResizeColumn(2);
}

function submit(){
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var all_range = sheet.getDataRange();
  var all_data = all_range.getValues();
  var status = "已提交";

  if(all_range==2){
    ui.alert("请填写您的需求后再进行提交！");
  }

  for(var i=3; i<all_data.length+1; i++){
    all_data[i-1].push(status);
  }
}