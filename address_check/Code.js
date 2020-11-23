function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createAddonMenu()
      .addItem("Begin", 'showPrompt')
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
      ui.alert("开始处理，请稍后！");
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

  //new_sheet_name = 'Check Result of '+ name;

  //ss.insertSheet().setName(new_sheet_name); //添加一个新sheet
  //var outsheet = ss.getSheetByName(new_sheet_name);

  var row_l = aData.length;
  var col_l = aData[0].length;

  //var id_range = source.getRange(1,1,row_l,1);

  var allRange = source.getRange(1,11,row_l,4);
  var allData = allRange.getValues();

  //var titlerange = source.getRange(1,1,1,4);
  //id_range.copyTo(outsheet.getRange(1,1));
  //allRange.copyTo(outsheet.getRange(1,2));

  var date = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd' 'HH:mm:ss");
  
  var outData = [["标注 "+ date]];
  var enErr = ["非香港地区填写英文/拼音"];
  //var cnErr = ["繁体字"];
  var symErr = ["乱码，特殊符号"];
  var noErr = ["非CN地址"];
  var maErr = ["省市区匹配关系错误"];
  var emErr = ["地址为空"];
  var inErr = ["填写不规范"];
  var right = [""];
  var merge_result = [""];
  var err_position = ["，State栏出现错误","，City栏出现错误","，District栏出现错误"];
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

      //若表格太大，英文翻译功能可能失败，校验Guangdong字段减少调用翻译次数
      if(city =="Guangdong"){
        merge_result = [enErr[0].concat(err_position[j])];
        outData.push(merge_result);
        break;
      }


      var check_result = formatcheck(city);

      if(check_result == false){
        //markrange.setValue("乱码，特殊符号");
        merge_result = [symErr[0].concat(err_position[j])];
        outData.push(merge_result);
        break;
      }

      //香港地址的校验-英/中
      if(check_result=="Hongkong"&&j==0){
        if(allData[i][j+1]==""||allData[i][j+2]==""){//校验后两个单元格是否为空
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
        else if(HK_result=="noMatch1"){
          merge_result = [noErr[0].concat(err_position[1])];
          outData.push(merge_result);
          break;
        }
        else if(HK_result=="noMatch2"){
          merge_result = [noErr[0].concat(err_position[2])];
          outData.push(merge_result);
          break;
        }
        else{
          merge_result = [maErr[0].concat(err_position[HK_result])];
          outData.push(merge_result);
          break;
        }
      }

      if(check_result=="Eng"){
        //markrange.setValue("非香港地区填写英文/拼音")
        merge_result = [enErr[0].concat(err_position[j])];
        outData.push(merge_result);
        break;
      }
      
      //中文地址校验
      var city_fix = findPosition(city);
      var match_city = getCity(city_fix);

      if(match_city == ''){
        //markrange.setValue("非CN地址");
        merge_result = [noErr[0].concat(err_position[j])];
        outData.push(merge_result);
        break;
      }

      if(!city.includes("自治")&&city.length>=8){
        merge_result = [inErr[0].concat(err_position[j])];
        outData.push(merge_result);
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

    var match_result = match_address(state_info,city_info,district_info);
    if(match_result == true){
      outData.push(right);
    }
    else{
      //markrange.setValue("省市区匹配关系错误");
      merge_result = [maErr[0].concat(err_position[match_result])];
      outData.push(merge_result);
    }
    
  }
  
  source.insertColumnAfter(col_l);
  var outRange = source.getRange(1,col_l+1,row_l,1);
  outRange.setValues(outData);

}

//校验香港地址--英/中
function check_HK(state,city,area){
  state_fix = findPosition(state);
  city_fix = findPosition(city);
  area_fix = area;

  state_info = getCity(state_fix);
  city_info = getCity(city_fix);
  area_info = getCity(area_fix);

  if(city_info==""){
    return "noMatch1";
  }
  else if(area_info==""){
    return "noMatch2";
  }
  var result = match_address(state_info,city_info,area_info);
  return result;
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

//确定编码是否匹配--省市区包含关系
//parameter: province,city,area
function match_address(pro,city,area){
  len_pro = pro.length;
  len_city = city.length;
  len_area = area.length;
  var result = "State匹配成功";
  var result2 = "匹配失败";
  for (var l=0; l<len_pro; l++){
    for(var j=0; j<len_city; j++){
      if(pro[l].p == 0 && pro[l].i==city[j].p){
        result = "city匹配成功";
        for(var k=0; k<len_area; k++){
          if(city[j].i==area[k].p){
            result2 = "匹配成功";
          }
        }
      }
    }
  }
  if(result2 == "匹配成功"){
    return true;
  }
  else if(result == "city匹配成功"){
    return 2;
  }
  else{
    return 1;
  }
  

  // for (var l=0; l<len_pro; l++){
  //   for(var j=0; j<len_city; j++){
  //     for(var k=0; k<len_area; k++){
  //       if(pro[l].i==city[j].p && city[j].i==area[k].p){
  //         return true;
  //       }
  //     }
  //   }
  // }

  // return false;
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
    //var trans = translate_en(str);//最好不要调用此功能，运行时有限制
    if(str == "Hongkong"||str == "Hong Kong"){
      var trans = "香港";
    }
    else{
      var trans = str;
    }

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

function getCity(n) {
  var iter = [
    {
        "n": "北京",
        "i": 11,
        "p": 0,
        "y": "b"
    },
    {
        "n": "北京",
        "i": 1101,
        "p": 11,
        "y": "b"
    },
    {
        "n": "东城",
        "i": 110101,
        "p": 1101,
        "y": "d"
    },
    {
        "n": "西城",
        "i": 110102,
        "p": 1101,
        "y": "x"
    },
    {
        "n": "朝阳",
        "i": 110105,
        "p": 1101,
        "y": "c"
    },
    {
        "n": "丰台",
        "i": 110106,
        "p": 1101,
        "y": "f"
    },
    {
        "n": "石景山",
        "i": 110107,
        "p": 1101,
        "y": "s"
    },
    {
        "n": "海淀",
        "i": 110108,
        "p": 1101,
        "y": "h"
    },
    {
        "n": "门头沟",
        "i": 110109,
        "p": 1101,
        "y": "m"
    },
    {
        "n": "房山",
        "i": 110111,
        "p": 1101,
        "y": "f"
    },
    {
        "n": "通州",
        "i": 110112,
        "p": 1101,
        "y": "t"
    },
    {
        "n": "顺义",
        "i": 110113,
        "p": 1101,
        "y": "s"
    },
    {
        "n": "昌平",
        "i": 110114,
        "p": 1101,
        "y": "c"
    },
    {
        "n": "大兴",
        "i": 110115,
        "p": 1101,
        "y": "d"
    },
    {
        "n": "怀柔",
        "i": 110116,
        "p": 1101,
        "y": "h"
    },
    {
        "n": "平谷",
        "i": 110117,
        "p": 1101,
        "y": "p"
    },
    {
        "n": "密云",
        "i": 110118,
        "p": 1101,
        "y": "m"
    },
    {
        "n": "延庆",
        "i": 110119,
        "p": 1101,
        "y": "y"
    },
    {
        "n": "天津",
        "i": 12,
        "p": 0,
        "y": "t"
    },
    {
        "n": "天津",
        "i": 1201,
        "p": 12,
        "y": "t"
    },
    {
        "n": "和平",
        "i": 120101,
        "p": 1201,
        "y": "h"
    },
    {
        "n": "河东",
        "i": 120102,
        "p": 1201,
        "y": "h"
    },
    {
        "n": "河西",
        "i": 120103,
        "p": 1201,
        "y": "h"
    },
    {
        "n": "南开",
        "i": 120104,
        "p": 1201,
        "y": "n"
    },
    {
        "n": "河北",
        "i": 120105,
        "p": 1201,
        "y": "h"
    },
    {
        "n": "红桥",
        "i": 120106,
        "p": 1201,
        "y": "h"
    },
    {
        "n": "东丽",
        "i": 120110,
        "p": 1201,
        "y": "d"
    },
    {
        "n": "西青",
        "i": 120111,
        "p": 1201,
        "y": "x"
    },
    {
        "n": "津南",
        "i": 120112,
        "p": 1201,
        "y": "j"
    },
    {
        "n": "北辰",
        "i": 120113,
        "p": 1201,
        "y": "b"
    },
    {
        "n": "武清",
        "i": 120114,
        "p": 1201,
        "y": "w"
    },
    {
        "n": "宝坻",
        "i": 120115,
        "p": 1201,
        "y": "b"
    },
    {
        "n": "滨海新区",
        "i": 120116,
        "p": 1201,
        "y": "b"
    },
    {
        "n": "宁河",
        "i": 120117,
        "p": 1201,
        "y": "n"
    },
    {
        "n": "静海",
        "i": 120118,
        "p": 1201,
        "y": "j"
    },
    {
        "n": "蓟州",
        "i": 120119,
        "p": 1201,
        "y": "j"
    },
    {
        "n": "河北",
        "i": 13,
        "p": 0,
        "y": "h"
    },
    {
        "n": "石家庄",
        "i": 1301,
        "p": 13,
        "y": "s"
    },
    {
        "n": "长安",
        "i": 130102,
        "p": 1301,
        "y": "c"
    },
    {
        "n": "桥西",
        "i": 130104,
        "p": 1301,
        "y": "q"
    },
    {
        "n": "新华",
        "i": 130105,
        "p": 1301,
        "y": "x"
    },
    {
        "n": "井陉矿区",
        "i": 130107,
        "p": 1301,
        "y": "j"
    },
    {
        "n": "裕华",
        "i": 130108,
        "p": 1301,
        "y": "y"
    },
    {
        "n": "藁城",
        "i": 130109,
        "p": 1301,
        "y": "g"
    },
    {
        "n": "鹿泉",
        "i": 130110,
        "p": 1301,
        "y": "l"
    },
    {
        "n": "栾城",
        "i": 130111,
        "p": 1301,
        "y": "l"
    },
    {
        "n": "井陉",
        "i": 130121,
        "p": 1301,
        "y": "j"
    },
    {
        "n": "正定",
        "i": 130123,
        "p": 1301,
        "y": "z"
    },
    {
        "n": "行唐",
        "i": 130125,
        "p": 1301,
        "y": "x"
    },
    {
        "n": "灵寿",
        "i": 130126,
        "p": 1301,
        "y": "l"
    },
    {
        "n": "高邑",
        "i": 130127,
        "p": 1301,
        "y": "g"
    },
    {
        "n": "深泽",
        "i": 130128,
        "p": 1301,
        "y": "s"
    },
    {
        "n": "赞皇",
        "i": 130129,
        "p": 1301,
        "y": "z"
    },
    {
        "n": "无极",
        "i": 130130,
        "p": 1301,
        "y": "w"
    },
    {
        "n": "平山",
        "i": 130131,
        "p": 1301,
        "y": "p"
    },
    {
        "n": "元氏",
        "i": 130132,
        "p": 1301,
        "y": "y"
    },
    {
        "n": "赵县",
        "i": 130133,
        "p": 1301,
        "y": "z"
    },
    {
        "n": "辛集",
        "i": 130181,
        "p": 1301,
        "y": "x"
    },
    {
        "n": "晋州",
        "i": 130183,
        "p": 1301,
        "y": "j"
    },
    {
        "n": "新乐",
        "i": 130184,
        "p": 1301,
        "y": "x"
    },
    {
        "n": "唐山",
        "i": 1302,
        "p": 13,
        "y": "t"
    },
    {
        "n": "路南",
        "i": 130202,
        "p": 1302,
        "y": "l"
    },
    {
        "n": "路北",
        "i": 130203,
        "p": 1302,
        "y": "l"
    },
    {
        "n": "古冶",
        "i": 130204,
        "p": 1302,
        "y": "g"
    },
    {
        "n": "开平",
        "i": 130205,
        "p": 1302,
        "y": "k"
    },
    {
        "n": "丰南",
        "i": 130207,
        "p": 1302,
        "y": "f"
    },
    {
        "n": "丰润",
        "i": 130208,
        "p": 1302,
        "y": "f"
    },
    {
        "n": "曹妃甸",
        "i": 130209,
        "p": 1302,
        "y": "c"
    },
    {
        "n": "滦南",
        "i": 130224,
        "p": 1302,
        "y": "l"
    },
    {
        "n": "乐亭",
        "i": 130225,
        "p": 1302,
        "y": "l"
    },
    {
        "n": "迁西",
        "i": 130227,
        "p": 1302,
        "y": "q"
    },
    {
        "n": "玉田",
        "i": 130229,
        "p": 1302,
        "y": "y"
    },
    {
        "n": "遵化",
        "i": 130281,
        "p": 1302,
        "y": "z"
    },
    {
        "n": "迁安",
        "i": 130283,
        "p": 1302,
        "y": "q"
    },
    {
        "n": "滦州",
        "i": 130284,
        "p": 1302,
        "y": "l"
    },
    {
        "n": "秦皇岛",
        "i": 1303,
        "p": 13,
        "y": "q"
    },
    {
        "n": "海港",
        "i": 130302,
        "p": 1303,
        "y": "h"
    },
    {
        "n": "山海关",
        "i": 130303,
        "p": 1303,
        "y": "s"
    },
    {
        "n": "北戴河",
        "i": 130304,
        "p": 1303,
        "y": "b"
    },
    {
        "n": "抚宁",
        "i": 130306,
        "p": 1303,
        "y": "f"
    },
    {
        "n": "青龙",
        "i": 130321,
        "p": 1303,
        "y": "q"
    },
    {
        "n": "昌黎",
        "i": 130322,
        "p": 1303,
        "y": "c"
    },
    {
        "n": "卢龙",
        "i": 130324,
        "p": 1303,
        "y": "l"
    },
    {
        "n": "邯郸",
        "i": 1304,
        "p": 13,
        "y": "h"
    },
    {
        "n": "邯山",
        "i": 130402,
        "p": 1304,
        "y": "h"
    },
    {
        "n": "丛台",
        "i": 130403,
        "p": 1304,
        "y": "c"
    },
    {
        "n": "复兴",
        "i": 130404,
        "p": 1304,
        "y": "f"
    },
    {
        "n": "峰峰矿区",
        "i": 130406,
        "p": 1304,
        "y": "f"
    },
    {
        "n": "肥乡",
        "i": 130407,
        "p": 1304,
        "y": "f"
    },
    {
        "n": "永年",
        "i": 130408,
        "p": 1304,
        "y": "y"
    },
    {
        "n": "临漳",
        "i": 130423,
        "p": 1304,
        "y": "l"
    },
    {
        "n": "成安",
        "i": 130424,
        "p": 1304,
        "y": "c"
    },
    {
        "n": "大名",
        "i": 130425,
        "p": 1304,
        "y": "d"
    },
    {
        "n": "涉县",
        "i": 130426,
        "p": 1304,
        "y": "s"
    },
    {
        "n": "磁县",
        "i": 130427,
        "p": 1304,
        "y": "c"
    },
    {
        "n": "邱县",
        "i": 130430,
        "p": 1304,
        "y": "q"
    },
    {
        "n": "鸡泽",
        "i": 130431,
        "p": 1304,
        "y": "j"
    },
    {
        "n": "广平",
        "i": 130432,
        "p": 1304,
        "y": "g"
    },
    {
        "n": "馆陶",
        "i": 130433,
        "p": 1304,
        "y": "g"
    },
    {
        "n": "魏县",
        "i": 130434,
        "p": 1304,
        "y": "w"
    },
    {
        "n": "曲周",
        "i": 130435,
        "p": 1304,
        "y": "q"
    },
    {
        "n": "武安",
        "i": 130481,
        "p": 1304,
        "y": "w"
    },
    {
        "n": "邢台",
        "i": 1305,
        "p": 13,
        "y": "x"
    },
    {
        "n": "襄都",
        "i": 130502,
        "p": 1305,
        "y": "x"
    },
    {
        "n": "信都",
        "i": 130503,
        "p": 1305,
        "y": "x"
    },
    {
        "n": "临城",
        "i": 130522,
        "p": 1305,
        "y": "l"
    },
    {
        "n": "内丘",
        "i": 130523,
        "p": 1305,
        "y": "n"
    },
    {
        "n": "柏乡",
        "i": 130524,
        "p": 1305,
        "y": "b"
    },
    {
        "n": "隆尧",
        "i": 130525,
        "p": 1305,
        "y": "l"
    },
    {
        "n": "任县",
        "i": 130526,
        "p": 1305,
        "y": "r"
    },
    {
        "n": "南和",
        "i": 130527,
        "p": 1305,
        "y": "n"
    },
    {
        "n": "宁晋",
        "i": 130528,
        "p": 1305,
        "y": "n"
    },
    {
        "n": "巨鹿",
        "i": 130529,
        "p": 1305,
        "y": "j"
    },
    {
        "n": "新河",
        "i": 130530,
        "p": 1305,
        "y": "x"
    },
    {
        "n": "广宗",
        "i": 130531,
        "p": 1305,
        "y": "g"
    },
    {
        "n": "平乡",
        "i": 130532,
        "p": 1305,
        "y": "p"
    },
    {
        "n": "威县",
        "i": 130533,
        "p": 1305,
        "y": "w"
    },
    {
        "n": "清河",
        "i": 130534,
        "p": 1305,
        "y": "q"
    },
    {
        "n": "临西",
        "i": 130535,
        "p": 1305,
        "y": "l"
    },
    {
        "n": "南宫",
        "i": 130581,
        "p": 1305,
        "y": "n"
    },
    {
        "n": "沙河",
        "i": 130582,
        "p": 1305,
        "y": "s"
    },
    {
        "n": "保定",
        "i": 1306,
        "p": 13,
        "y": "b"
    },
    {
        "n": "竞秀",
        "i": 130602,
        "p": 1306,
        "y": "j"
    },
    {
        "n": "莲池",
        "i": 130606,
        "p": 1306,
        "y": "l"
    },
    {
        "n": "满城",
        "i": 130607,
        "p": 1306,
        "y": "m"
    },
    {
        "n": "清苑",
        "i": 130608,
        "p": 1306,
        "y": "q"
    },
    {
        "n": "徐水",
        "i": 130609,
        "p": 1306,
        "y": "x"
    },
    {
        "n": "涞水",
        "i": 130623,
        "p": 1306,
        "y": "l"
    },
    {
        "n": "阜平",
        "i": 130624,
        "p": 1306,
        "y": "f"
    },
    {
        "n": "定兴",
        "i": 130626,
        "p": 1306,
        "y": "d"
    },
    {
        "n": "唐县",
        "i": 130627,
        "p": 1306,
        "y": "t"
    },
    {
        "n": "高阳",
        "i": 130628,
        "p": 1306,
        "y": "g"
    },
    {
        "n": "容城",
        "i": 130629,
        "p": 1306,
        "y": "r"
    },
    {
        "n": "涞源",
        "i": 130630,
        "p": 1306,
        "y": "l"
    },
    {
        "n": "望都",
        "i": 130631,
        "p": 1306,
        "y": "w"
    },
    {
        "n": "安新",
        "i": 130632,
        "p": 1306,
        "y": "a"
    },
    {
        "n": "易县",
        "i": 130633,
        "p": 1306,
        "y": "y"
    },
    {
        "n": "曲阳",
        "i": 130634,
        "p": 1306,
        "y": "q"
    },
    {
        "n": "蠡县",
        "i": 130635,
        "p": 1306,
        "y": "l"
    },
    {
        "n": "顺平",
        "i": 130636,
        "p": 1306,
        "y": "s"
    },
    {
        "n": "博野",
        "i": 130637,
        "p": 1306,
        "y": "b"
    },
    {
        "n": "雄县",
        "i": 130638,
        "p": 1306,
        "y": "x"
    },
    {
        "n": "涿州",
        "i": 130681,
        "p": 1306,
        "y": "z"
    },
    {
        "n": "定州",
        "i": 130682,
        "p": 1306,
        "y": "d"
    },
    {
        "n": "安国",
        "i": 130683,
        "p": 1306,
        "y": "a"
    },
    {
        "n": "高碑店",
        "i": 130684,
        "p": 1306,
        "y": "g"
    },
    {
        "n": "张家口",
        "i": 1307,
        "p": 13,
        "y": "z"
    },
    {
        "n": "桥东",
        "i": 130702,
        "p": 1307,
        "y": "q"
    },
    {
        "n": "桥西",
        "i": 130703,
        "p": 1307,
        "y": "q"
    },
    {
        "n": "宣化",
        "i": 130705,
        "p": 1307,
        "y": "x"
    },
    {
        "n": "下花园",
        "i": 130706,
        "p": 1307,
        "y": "x"
    },
    {
        "n": "万全",
        "i": 130708,
        "p": 1307,
        "y": "w"
    },
    {
        "n": "崇礼",
        "i": 130709,
        "p": 1307,
        "y": "c"
    },
    {
        "n": "张北",
        "i": 130722,
        "p": 1307,
        "y": "z"
    },
    {
        "n": "康保",
        "i": 130723,
        "p": 1307,
        "y": "k"
    },
    {
        "n": "沽源",
        "i": 130724,
        "p": 1307,
        "y": "g"
    },
    {
        "n": "尚义",
        "i": 130725,
        "p": 1307,
        "y": "s"
    },
    {
        "n": "蔚县",
        "i": 130726,
        "p": 1307,
        "y": "y"
    },
    {
        "n": "阳原",
        "i": 130727,
        "p": 1307,
        "y": "y"
    },
    {
        "n": "怀安",
        "i": 130728,
        "p": 1307,
        "y": "h"
    },
    {
        "n": "怀来",
        "i": 130730,
        "p": 1307,
        "y": "h"
    },
    {
        "n": "涿鹿",
        "i": 130731,
        "p": 1307,
        "y": "z"
    },
    {
        "n": "赤城",
        "i": 130732,
        "p": 1307,
        "y": "c"
    },
    {
        "n": "承德",
        "i": 1308,
        "p": 13,
        "y": "c"
    },
    {
        "n": "双桥",
        "i": 130802,
        "p": 1308,
        "y": "s"
    },
    {
        "n": "双滦",
        "i": 130803,
        "p": 1308,
        "y": "s"
    },
    {
        "n": "鹰手营子矿区",
        "i": 130804,
        "p": 1308,
        "y": "y"
    },
    {
        "n": "承德县",
        "i": 130821,
        "p": 1308,
        "y": "c"
    },
    {
        "n": "兴隆",
        "i": 130822,
        "p": 1308,
        "y": "x"
    },
    {
        "n": "滦平",
        "i": 130824,
        "p": 1308,
        "y": "l"
    },
    {
        "n": "隆化",
        "i": 130825,
        "p": 1308,
        "y": "l"
    },
    {
        "n": "丰宁",
        "i": 130826,
        "p": 1308,
        "y": "f"
    },
    {
        "n": "宽城",
        "i": 130827,
        "p": 1308,
        "y": "k"
    },
    {
        "n": "围场",
        "i": 130828,
        "p": 1308,
        "y": "w"
    },
    {
        "n": "平泉",
        "i": 130881,
        "p": 1308,
        "y": "p"
    },
    {
        "n": "沧州",
        "i": 1309,
        "p": 13,
        "y": "c"
    },
    {
        "n": "新华",
        "i": 130902,
        "p": 1309,
        "y": "x"
    },
    {
        "n": "运河",
        "i": 130903,
        "p": 1309,
        "y": "y"
    },
    {
        "n": "沧县",
        "i": 130921,
        "p": 1309,
        "y": "c"
    },
    {
        "n": "青县",
        "i": 130922,
        "p": 1309,
        "y": "q"
    },
    {
        "n": "东光",
        "i": 130923,
        "p": 1309,
        "y": "d"
    },
    {
        "n": "海兴",
        "i": 130924,
        "p": 1309,
        "y": "h"
    },
    {
        "n": "盐山",
        "i": 130925,
        "p": 1309,
        "y": "y"
    },
    {
        "n": "肃宁",
        "i": 130926,
        "p": 1309,
        "y": "s"
    },
    {
        "n": "南皮",
        "i": 130927,
        "p": 1309,
        "y": "n"
    },
    {
        "n": "吴桥",
        "i": 130928,
        "p": 1309,
        "y": "w"
    },
    {
        "n": "献县",
        "i": 130929,
        "p": 1309,
        "y": "x"
    },
    {
        "n": "孟村",
        "i": 130930,
        "p": 1309,
        "y": "m"
    },
    {
        "n": "泊头",
        "i": 130981,
        "p": 1309,
        "y": "b"
    },
    {
        "n": "任丘",
        "i": 130982,
        "p": 1309,
        "y": "r"
    },
    {
        "n": "黄骅",
        "i": 130983,
        "p": 1309,
        "y": "h"
    },
    {
        "n": "河间",
        "i": 130984,
        "p": 1309,
        "y": "h"
    },
    {
        "n": "廊坊",
        "i": 1310,
        "p": 13,
        "y": "l"
    },
    {
        "n": "安次",
        "i": 131002,
        "p": 1310,
        "y": "a"
    },
    {
        "n": "广阳",
        "i": 131003,
        "p": 1310,
        "y": "g"
    },
    {
        "n": "固安",
        "i": 131022,
        "p": 1310,
        "y": "g"
    },
    {
        "n": "永清",
        "i": 131023,
        "p": 1310,
        "y": "y"
    },
    {
        "n": "香河",
        "i": 131024,
        "p": 1310,
        "y": "x"
    },
    {
        "n": "大城",
        "i": 131025,
        "p": 1310,
        "y": "d"
    },
    {
        "n": "文安",
        "i": 131026,
        "p": 1310,
        "y": "w"
    },
    {
        "n": "大厂",
        "i": 131028,
        "p": 1310,
        "y": "d"
    },
    {
        "n": "霸州",
        "i": 131081,
        "p": 1310,
        "y": "b"
    },
    {
        "n": "三河",
        "i": 131082,
        "p": 1310,
        "y": "s"
    },
    {
        "n": "衡水",
        "i": 1311,
        "p": 13,
        "y": "h"
    },
    {
        "n": "桃城",
        "i": 131102,
        "p": 1311,
        "y": "t"
    },
    {
        "n": "冀州",
        "i": 131103,
        "p": 1311,
        "y": "j"
    },
    {
        "n": "枣强",
        "i": 131121,
        "p": 1311,
        "y": "z"
    },
    {
        "n": "武邑",
        "i": 131122,
        "p": 1311,
        "y": "w"
    },
    {
        "n": "武强",
        "i": 131123,
        "p": 1311,
        "y": "w"
    },
    {
        "n": "饶阳",
        "i": 131124,
        "p": 1311,
        "y": "r"
    },
    {
        "n": "安平",
        "i": 131125,
        "p": 1311,
        "y": "a"
    },
    {
        "n": "故城",
        "i": 131126,
        "p": 1311,
        "y": "g"
    },
    {
        "n": "景县",
        "i": 131127,
        "p": 1311,
        "y": "j"
    },
    {
        "n": "阜城",
        "i": 131128,
        "p": 1311,
        "y": "f"
    },
    {
        "n": "深州",
        "i": 131182,
        "p": 1311,
        "y": "s"
    },
    {
        "n": "山西",
        "i": 14,
        "p": 0,
        "y": "s"
    },
    {
        "n": "太原",
        "i": 1401,
        "p": 14,
        "y": "t"
    },
    {
        "n": "小店",
        "i": 140105,
        "p": 1401,
        "y": "x"
    },
    {
        "n": "迎泽",
        "i": 140106,
        "p": 1401,
        "y": "y"
    },
    {
        "n": "杏花岭",
        "i": 140107,
        "p": 1401,
        "y": "x"
    },
    {
        "n": "尖草坪",
        "i": 140108,
        "p": 1401,
        "y": "j"
    },
    {
        "n": "万柏林",
        "i": 140109,
        "p": 1401,
        "y": "w"
    },
    {
        "n": "晋源",
        "i": 140110,
        "p": 1401,
        "y": "j"
    },
    {
        "n": "清徐",
        "i": 140121,
        "p": 1401,
        "y": "q"
    },
    {
        "n": "阳曲",
        "i": 140122,
        "p": 1401,
        "y": "y"
    },
    {
        "n": "娄烦",
        "i": 140123,
        "p": 1401,
        "y": "l"
    },
    {
        "n": "古交",
        "i": 140181,
        "p": 1401,
        "y": "g"
    },
    {
        "n": "大同",
        "i": 1402,
        "p": 14,
        "y": "d"
    },
    {
        "n": "新荣",
        "i": 140212,
        "p": 1402,
        "y": "x"
    },
    {
        "n": "平城",
        "i": 140213,
        "p": 1402,
        "y": "p"
    },
    {
        "n": "云冈",
        "i": 140214,
        "p": 1402,
        "y": "y"
    },
    {
        "n": "云州",
        "i": 140215,
        "p": 1402,
        "y": "y"
    },
    {
        "n": "阳高",
        "i": 140221,
        "p": 1402,
        "y": "y"
    },
    {
        "n": "天镇",
        "i": 140222,
        "p": 1402,
        "y": "t"
    },
    {
        "n": "广灵",
        "i": 140223,
        "p": 1402,
        "y": "g"
    },
    {
        "n": "灵丘",
        "i": 140224,
        "p": 1402,
        "y": "l"
    },
    {
        "n": "浑源",
        "i": 140225,
        "p": 1402,
        "y": "h"
    },
    {
        "n": "左云",
        "i": 140226,
        "p": 1402,
        "y": "z"
    },
    {
        "n": "阳泉",
        "i": 1403,
        "p": 14,
        "y": "y"
    },
    {
        "n": "城区",
        "i": 140302,
        "p": 1403,
        "y": "c"
    },
    {
        "n": "矿区",
        "i": 140303,
        "p": 1403,
        "y": "k"
    },
    {
        "n": "郊区",
        "i": 140311,
        "p": 1403,
        "y": "j"
    },
    {
        "n": "平定",
        "i": 140321,
        "p": 1403,
        "y": "p"
    },
    {
        "n": "盂县",
        "i": 140322,
        "p": 1403,
        "y": "y"
    },
    {
        "n": "长治",
        "i": 1404,
        "p": 14,
        "y": "c"
    },
    {
        "n": "潞州",
        "i": 140403,
        "p": 1404,
        "y": "l"
    },
    {
        "n": "上党",
        "i": 140404,
        "p": 1404,
        "y": "s"
    },
    {
        "n": "屯留",
        "i": 140405,
        "p": 1404,
        "y": "t"
    },
    {
        "n": "潞城",
        "i": 140406,
        "p": 1404,
        "y": "l"
    },
    {
        "n": "襄垣",
        "i": 140423,
        "p": 1404,
        "y": "x"
    },
    {
        "n": "平顺",
        "i": 140425,
        "p": 1404,
        "y": "p"
    },
    {
        "n": "黎城",
        "i": 140426,
        "p": 1404,
        "y": "l"
    },
    {
        "n": "壶关",
        "i": 140427,
        "p": 1404,
        "y": "h"
    },
    {
        "n": "长子",
        "i": 140428,
        "p": 1404,
        "y": "z"
    },
    {
        "n": "武乡",
        "i": 140429,
        "p": 1404,
        "y": "w"
    },
    {
        "n": "沁县",
        "i": 140430,
        "p": 1404,
        "y": "q"
    },
    {
        "n": "沁源",
        "i": 140431,
        "p": 1404,
        "y": "q"
    },
    {
        "n": "晋城",
        "i": 1405,
        "p": 14,
        "y": "j"
    },
    {
        "n": "城区",
        "i": 140502,
        "p": 1405,
        "y": "c"
    },
    {
        "n": "沁水",
        "i": 140521,
        "p": 1405,
        "y": "q"
    },
    {
        "n": "阳城",
        "i": 140522,
        "p": 1405,
        "y": "y"
    },
    {
        "n": "陵川",
        "i": 140524,
        "p": 1405,
        "y": "l"
    },
    {
        "n": "泽州",
        "i": 140525,
        "p": 1405,
        "y": "z"
    },
    {
        "n": "高平",
        "i": 140581,
        "p": 1405,
        "y": "g"
    },
    {
        "n": "朔州",
        "i": 1406,
        "p": 14,
        "y": "s"
    },
    {
        "n": "朔城",
        "i": 140602,
        "p": 1406,
        "y": "s"
    },
    {
        "n": "平鲁",
        "i": 140603,
        "p": 1406,
        "y": "p"
    },
    {
        "n": "山阴",
        "i": 140621,
        "p": 1406,
        "y": "s"
    },
    {
        "n": "应县",
        "i": 140622,
        "p": 1406,
        "y": "y"
    },
    {
        "n": "右玉",
        "i": 140623,
        "p": 1406,
        "y": "y"
    },
    {
        "n": "怀仁",
        "i": 140681,
        "p": 1406,
        "y": "h"
    },
    {
        "n": "晋中",
        "i": 1407,
        "p": 14,
        "y": "j"
    },
    {
        "n": "榆次",
        "i": 140702,
        "p": 1407,
        "y": "y"
    },
    {
        "n": "太谷",
        "i": 140703,
        "p": 1407,
        "y": "t"
    },
    {
        "n": "榆社",
        "i": 140721,
        "p": 1407,
        "y": "y"
    },
    {
        "n": "左权",
        "i": 140722,
        "p": 1407,
        "y": "z"
    },
    {
        "n": "和顺",
        "i": 140723,
        "p": 1407,
        "y": "h"
    },
    {
        "n": "昔阳",
        "i": 140724,
        "p": 1407,
        "y": "x"
    },
    {
        "n": "寿阳",
        "i": 140725,
        "p": 1407,
        "y": "s"
    },
    {
        "n": "祁县",
        "i": 140727,
        "p": 1407,
        "y": "q"
    },
    {
        "n": "平遥",
        "i": 140728,
        "p": 1407,
        "y": "p"
    },
    {
        "n": "灵石",
        "i": 140729,
        "p": 1407,
        "y": "l"
    },
    {
        "n": "介休",
        "i": 140781,
        "p": 1407,
        "y": "j"
    },
    {
        "n": "运城",
        "i": 1408,
        "p": 14,
        "y": "y"
    },
    {
        "n": "盐湖",
        "i": 140802,
        "p": 1408,
        "y": "y"
    },
    {
        "n": "临猗",
        "i": 140821,
        "p": 1408,
        "y": "l"
    },
    {
        "n": "万荣",
        "i": 140822,
        "p": 1408,
        "y": "w"
    },
    {
        "n": "闻喜",
        "i": 140823,
        "p": 1408,
        "y": "w"
    },
    {
        "n": "稷山",
        "i": 140824,
        "p": 1408,
        "y": "j"
    },
    {
        "n": "新绛",
        "i": 140825,
        "p": 1408,
        "y": "x"
    },
    {
        "n": "绛县",
        "i": 140826,
        "p": 1408,
        "y": "j"
    },
    {
        "n": "垣曲",
        "i": 140827,
        "p": 1408,
        "y": "y"
    },
    {
        "n": "夏县",
        "i": 140828,
        "p": 1408,
        "y": "x"
    },
    {
        "n": "平陆",
        "i": 140829,
        "p": 1408,
        "y": "p"
    },
    {
        "n": "芮城",
        "i": 140830,
        "p": 1408,
        "y": "r"
    },
    {
        "n": "永济",
        "i": 140881,
        "p": 1408,
        "y": "y"
    },
    {
        "n": "河津",
        "i": 140882,
        "p": 1408,
        "y": "h"
    },
    {
        "n": "忻州",
        "i": 1409,
        "p": 14,
        "y": "x"
    },
    {
        "n": "忻府",
        "i": 140902,
        "p": 1409,
        "y": "x"
    },
    {
        "n": "定襄",
        "i": 140921,
        "p": 1409,
        "y": "d"
    },
    {
        "n": "五台",
        "i": 140922,
        "p": 1409,
        "y": "w"
    },
    {
        "n": "代县",
        "i": 140923,
        "p": 1409,
        "y": "d"
    },
    {
        "n": "繁峙",
        "i": 140924,
        "p": 1409,
        "y": "f"
    },
    {
        "n": "宁武",
        "i": 140925,
        "p": 1409,
        "y": "n"
    },
    {
        "n": "静乐",
        "i": 140926,
        "p": 1409,
        "y": "j"
    },
    {
        "n": "神池",
        "i": 140927,
        "p": 1409,
        "y": "s"
    },
    {
        "n": "五寨",
        "i": 140928,
        "p": 1409,
        "y": "w"
    },
    {
        "n": "岢岚",
        "i": 140929,
        "p": 1409,
        "y": "k"
    },
    {
        "n": "河曲",
        "i": 140930,
        "p": 1409,
        "y": "h"
    },
    {
        "n": "保德",
        "i": 140931,
        "p": 1409,
        "y": "b"
    },
    {
        "n": "偏关",
        "i": 140932,
        "p": 1409,
        "y": "p"
    },
    {
        "n": "原平",
        "i": 140981,
        "p": 1409,
        "y": "y"
    },
    {
        "n": "临汾",
        "i": 1410,
        "p": 14,
        "y": "l"
    },
    {
        "n": "尧都",
        "i": 141002,
        "p": 1410,
        "y": "y"
    },
    {
        "n": "曲沃",
        "i": 141021,
        "p": 1410,
        "y": "q"
    },
    {
        "n": "翼城",
        "i": 141022,
        "p": 1410,
        "y": "y"
    },
    {
        "n": "襄汾",
        "i": 141023,
        "p": 1410,
        "y": "x"
    },
    {
        "n": "洪洞",
        "i": 141024,
        "p": 1410,
        "y": "h"
    },
    {
        "n": "古县",
        "i": 141025,
        "p": 1410,
        "y": "g"
    },
    {
        "n": "安泽",
        "i": 141026,
        "p": 1410,
        "y": "a"
    },
    {
        "n": "浮山",
        "i": 141027,
        "p": 1410,
        "y": "f"
    },
    {
        "n": "吉县",
        "i": 141028,
        "p": 1410,
        "y": "j"
    },
    {
        "n": "乡宁",
        "i": 141029,
        "p": 1410,
        "y": "x"
    },
    {
        "n": "大宁",
        "i": 141030,
        "p": 1410,
        "y": "d"
    },
    {
        "n": "隰县",
        "i": 141031,
        "p": 1410,
        "y": "x"
    },
    {
        "n": "永和",
        "i": 141032,
        "p": 1410,
        "y": "y"
    },
    {
        "n": "蒲县",
        "i": 141033,
        "p": 1410,
        "y": "p"
    },
    {
        "n": "汾西",
        "i": 141034,
        "p": 1410,
        "y": "f"
    },
    {
        "n": "侯马",
        "i": 141081,
        "p": 1410,
        "y": "h"
    },
    {
        "n": "霍州",
        "i": 141082,
        "p": 1410,
        "y": "h"
    },
    {
        "n": "吕梁",
        "i": 1411,
        "p": 14,
        "y": "l"
    },
    {
        "n": "离石",
        "i": 141102,
        "p": 1411,
        "y": "l"
    },
    {
        "n": "文水",
        "i": 141121,
        "p": 1411,
        "y": "w"
    },
    {
        "n": "交城",
        "i": 141122,
        "p": 1411,
        "y": "j"
    },
    {
        "n": "兴县",
        "i": 141123,
        "p": 1411,
        "y": "x"
    },
    {
        "n": "临县",
        "i": 141124,
        "p": 1411,
        "y": "l"
    },
    {
        "n": "柳林",
        "i": 141125,
        "p": 1411,
        "y": "l"
    },
    {
        "n": "石楼",
        "i": 141126,
        "p": 1411,
        "y": "s"
    },
    {
        "n": "岚县",
        "i": 141127,
        "p": 1411,
        "y": "l"
    },
    {
        "n": "方山",
        "i": 141128,
        "p": 1411,
        "y": "f"
    },
    {
        "n": "中阳",
        "i": 141129,
        "p": 1411,
        "y": "z"
    },
    {
        "n": "交口",
        "i": 141130,
        "p": 1411,
        "y": "j"
    },
    {
        "n": "孝义",
        "i": 141181,
        "p": 1411,
        "y": "x"
    },
    {
        "n": "汾阳",
        "i": 141182,
        "p": 1411,
        "y": "f"
    },
    {
        "n": "内蒙古",
        "i": 15,
        "p": 0,
        "y": "n"
    },
    {
        "n": "呼和浩特",
        "i": 1501,
        "p": 15,
        "y": "h"
    },
    {
        "n": "新城",
        "i": 150102,
        "p": 1501,
        "y": "x"
    },
    {
        "n": "回民",
        "i": 150103,
        "p": 1501,
        "y": "h"
    },
    {
        "n": "玉泉",
        "i": 150104,
        "p": 1501,
        "y": "y"
    },
    {
        "n": "赛罕",
        "i": 150105,
        "p": 1501,
        "y": "s"
    },
    {
        "n": "土默特左旗",
        "i": 150121,
        "p": 1501,
        "y": "t"
    },
    {
        "n": "托克托",
        "i": 150122,
        "p": 1501,
        "y": "t"
    },
    {
        "n": "和林格尔",
        "i": 150123,
        "p": 1501,
        "y": "h"
    },
    {
        "n": "清水河",
        "i": 150124,
        "p": 1501,
        "y": "q"
    },
    {
        "n": "武川",
        "i": 150125,
        "p": 1501,
        "y": "w"
    },
    {
        "n": "包头",
        "i": 1502,
        "p": 15,
        "y": "b"
    },
    {
        "n": "东河",
        "i": 150202,
        "p": 1502,
        "y": "d"
    },
    {
        "n": "昆都仑",
        "i": 150203,
        "p": 1502,
        "y": "k"
    },
    {
        "n": "青山",
        "i": 150204,
        "p": 1502,
        "y": "q"
    },
    {
        "n": "石拐",
        "i": 150205,
        "p": 1502,
        "y": "s"
    },
    {
        "n": "白云鄂博矿区",
        "i": 150206,
        "p": 1502,
        "y": "b"
    },
    {
        "n": "九原",
        "i": 150207,
        "p": 1502,
        "y": "j"
    },
    {
        "n": "土默特右旗",
        "i": 150221,
        "p": 1502,
        "y": "t"
    },
    {
        "n": "固阳",
        "i": 150222,
        "p": 1502,
        "y": "g"
    },
    {
        "n": "达尔罕茂明安联合旗",
        "i": 150223,
        "p": 1502,
        "y": "d"
    },
    {
        "n": "乌海",
        "i": 1503,
        "p": 15,
        "y": "w"
    },
    {
        "n": "海勃湾",
        "i": 150302,
        "p": 1503,
        "y": "h"
    },
    {
        "n": "海南",
        "i": 150303,
        "p": 1503,
        "y": "h"
    },
    {
        "n": "乌达",
        "i": 150304,
        "p": 1503,
        "y": "w"
    },
    {
        "n": "赤峰",
        "i": 1504,
        "p": 15,
        "y": "c"
    },
    {
        "n": "红山",
        "i": 150402,
        "p": 1504,
        "y": "h"
    },
    {
        "n": "元宝山",
        "i": 150403,
        "p": 1504,
        "y": "y"
    },
    {
        "n": "松山",
        "i": 150404,
        "p": 1504,
        "y": "s"
    },
    {
        "n": "阿鲁科尔沁旗",
        "i": 150421,
        "p": 1504,
        "y": "a"
    },
    {
        "n": "巴林左旗",
        "i": 150422,
        "p": 1504,
        "y": "b"
    },
    {
        "n": "巴林右旗",
        "i": 150423,
        "p": 1504,
        "y": "b"
    },
    {
        "n": "林西",
        "i": 150424,
        "p": 1504,
        "y": "l"
    },
    {
        "n": "克什克腾旗",
        "i": 150425,
        "p": 1504,
        "y": "k"
    },
    {
        "n": "翁牛特旗",
        "i": 150426,
        "p": 1504,
        "y": "w"
    },
    {
        "n": "喀喇沁旗",
        "i": 150428,
        "p": 1504,
        "y": "k"
    },
    {
        "n": "宁城",
        "i": 150429,
        "p": 1504,
        "y": "n"
    },
    {
        "n": "敖汉旗",
        "i": 150430,
        "p": 1504,
        "y": "a"
    },
    {
        "n": "通辽",
        "i": 1505,
        "p": 15,
        "y": "t"
    },
    {
        "n": "科尔沁",
        "i": 150502,
        "p": 1505,
        "y": "k"
    },
    {
        "n": "科尔沁左翼中旗",
        "i": 150521,
        "p": 1505,
        "y": "k"
    },
    {
        "n": "科尔沁左翼后旗",
        "i": 150522,
        "p": 1505,
        "y": "k"
    },
    {
        "n": "开鲁",
        "i": 150523,
        "p": 1505,
        "y": "k"
    },
    {
        "n": "库伦旗",
        "i": 150524,
        "p": 1505,
        "y": "k"
    },
    {
        "n": "奈曼旗",
        "i": 150525,
        "p": 1505,
        "y": "n"
    },
    {
        "n": "扎鲁特旗",
        "i": 150526,
        "p": 1505,
        "y": "z"
    },
    {
        "n": "霍林郭勒",
        "i": 150581,
        "p": 1505,
        "y": "h"
    },
    {
        "n": "鄂尔多斯",
        "i": 1506,
        "p": 15,
        "y": "e"
    },
    {
        "n": "东胜",
        "i": 150602,
        "p": 1506,
        "y": "d"
    },
    {
        "n": "康巴什",
        "i": 150603,
        "p": 1506,
        "y": "k"
    },
    {
        "n": "达拉特旗",
        "i": 150621,
        "p": 1506,
        "y": "d"
    },
    {
        "n": "准格尔旗",
        "i": 150622,
        "p": 1506,
        "y": "z"
    },
    {
        "n": "鄂托克前旗",
        "i": 150623,
        "p": 1506,
        "y": "e"
    },
    {
        "n": "鄂托克旗",
        "i": 150624,
        "p": 1506,
        "y": "e"
    },
    {
        "n": "杭锦旗",
        "i": 150625,
        "p": 1506,
        "y": "h"
    },
    {
        "n": "乌审旗",
        "i": 150626,
        "p": 1506,
        "y": "w"
    },
    {
        "n": "伊金霍洛旗",
        "i": 150627,
        "p": 1506,
        "y": "y"
    },
    {
        "n": "呼伦贝尔",
        "i": 1507,
        "p": 15,
        "y": "h"
    },
    {
        "n": "海拉尔",
        "i": 150702,
        "p": 1507,
        "y": "h"
    },
    {
        "n": "扎赉诺尔区",
        "i": 150703,
        "p": 1507,
        "y": "z"
    },
    {
        "n": "阿荣旗",
        "i": 150721,
        "p": 1507,
        "y": "a"
    },
    {
        "n": "莫力达瓦",
        "i": 150722,
        "p": 1507,
        "y": "m"
    },
    {
        "n": "鄂伦春自治旗",
        "i": 150723,
        "p": 1507,
        "y": "e"
    },
    {
        "n": "鄂温克族自治旗",
        "i": 150724,
        "p": 1507,
        "y": "e"
    },
    {
        "n": "陈巴尔虎旗",
        "i": 150725,
        "p": 1507,
        "y": "c"
    },
    {
        "n": "新巴尔虎左旗",
        "i": 150726,
        "p": 1507,
        "y": "x"
    },
    {
        "n": "新巴尔虎右旗",
        "i": 150727,
        "p": 1507,
        "y": "x"
    },
    {
        "n": "满洲里",
        "i": 150781,
        "p": 1507,
        "y": "m"
    },
    {
        "n": "牙克石",
        "i": 150782,
        "p": 1507,
        "y": "y"
    },
    {
        "n": "扎兰屯",
        "i": 150783,
        "p": 1507,
        "y": "z"
    },
    {
        "n": "额尔古纳",
        "i": 150784,
        "p": 1507,
        "y": "e"
    },
    {
        "n": "根河",
        "i": 150785,
        "p": 1507,
        "y": "g"
    },
    {
        "n": "巴彦淖尔",
        "i": 1508,
        "p": 15,
        "y": "b"
    },
    {
        "n": "临河",
        "i": 150802,
        "p": 1508,
        "y": "l"
    },
    {
        "n": "五原",
        "i": 150821,
        "p": 1508,
        "y": "w"
    },
    {
        "n": "磴口",
        "i": 150822,
        "p": 1508,
        "y": "d"
    },
    {
        "n": "乌拉特前旗",
        "i": 150823,
        "p": 1508,
        "y": "w"
    },
    {
        "n": "乌拉特中旗",
        "i": 150824,
        "p": 1508,
        "y": "w"
    },
    {
        "n": "乌拉特后旗",
        "i": 150825,
        "p": 1508,
        "y": "w"
    },
    {
        "n": "杭锦后旗",
        "i": 150826,
        "p": 1508,
        "y": "h"
    },
    {
        "n": "乌兰察布",
        "i": 1509,
        "p": 15,
        "y": "w"
    },
    {
        "n": "集宁",
        "i": 150902,
        "p": 1509,
        "y": "j"
    },
    {
        "n": "卓资",
        "i": 150921,
        "p": 1509,
        "y": "z"
    },
    {
        "n": "化德",
        "i": 150922,
        "p": 1509,
        "y": "h"
    },
    {
        "n": "商都",
        "i": 150923,
        "p": 1509,
        "y": "s"
    },
    {
        "n": "兴和",
        "i": 150924,
        "p": 1509,
        "y": "x"
    },
    {
        "n": "凉城",
        "i": 150925,
        "p": 1509,
        "y": "l"
    },
    {
        "n": "察哈尔右翼前旗",
        "i": 150926,
        "p": 1509,
        "y": "c"
    },
    {
        "n": "察哈尔右翼中旗",
        "i": 150927,
        "p": 1509,
        "y": "c"
    },
    {
        "n": "察哈尔右翼后旗",
        "i": 150928,
        "p": 1509,
        "y": "c"
    },
    {
        "n": "四子王旗",
        "i": 150929,
        "p": 1509,
        "y": "s"
    },
    {
        "n": "丰镇",
        "i": 150981,
        "p": 1509,
        "y": "f"
    },
    {
        "n": "兴安",
        "i": 1522,
        "p": 15,
        "y": "x"
    },
    {
        "n": "乌兰浩特",
        "i": 152201,
        "p": 1522,
        "y": "w"
    },
    {
        "n": "阿尔山",
        "i": 152202,
        "p": 1522,
        "y": "a"
    },
    {
        "n": "科尔沁右翼前旗",
        "i": 152221,
        "p": 1522,
        "y": "k"
    },
    {
        "n": "科尔沁右翼中旗",
        "i": 152222,
        "p": 1522,
        "y": "k"
    },
    {
        "n": "扎赉特旗",
        "i": 152223,
        "p": 1522,
        "y": "z"
    },
    {
        "n": "突泉",
        "i": 152224,
        "p": 1522,
        "y": "t"
    },
    {
        "n": "锡林郭勒",
        "i": 1525,
        "p": 15,
        "y": "x"
    },
    {
        "n": "二连浩特",
        "i": 152501,
        "p": 1525,
        "y": "e"
    },
    {
        "n": "锡林浩特",
        "i": 152502,
        "p": 1525,
        "y": "x"
    },
    {
        "n": "阿巴嘎旗",
        "i": 152522,
        "p": 1525,
        "y": "a"
    },
    {
        "n": "苏尼特左旗",
        "i": 152523,
        "p": 1525,
        "y": "s"
    },
    {
        "n": "苏尼特右旗",
        "i": 152524,
        "p": 1525,
        "y": "s"
    },
    {
        "n": "东乌珠穆沁旗",
        "i": 152525,
        "p": 1525,
        "y": "d"
    },
    {
        "n": "西乌珠穆沁旗",
        "i": 152526,
        "p": 1525,
        "y": "x"
    },
    {
        "n": "太仆寺旗",
        "i": 152527,
        "p": 1525,
        "y": "t"
    },
    {
        "n": "镶黄旗",
        "i": 152528,
        "p": 1525,
        "y": "x"
    },
    {
        "n": "正镶白旗",
        "i": 152529,
        "p": 1525,
        "y": "z"
    },
    {
        "n": "正蓝旗",
        "i": 152530,
        "p": 1525,
        "y": "z"
    },
    {
        "n": "多伦",
        "i": 152531,
        "p": 1525,
        "y": "d"
    },
    {
        "n": "阿拉善",
        "i": 1529,
        "p": 15,
        "y": "a"
    },
    {
        "n": "阿拉善左旗",
        "i": 152921,
        "p": 1529,
        "y": "a"
    },
    {
        "n": "阿拉善右旗",
        "i": 152922,
        "p": 1529,
        "y": "a"
    },
    {
        "n": "额济纳旗",
        "i": 152923,
        "p": 1529,
        "y": "e"
    },
    {
        "n": "辽宁",
        "i": 21,
        "p": 0,
        "y": "l"
    },
    {
        "n": "沈阳",
        "i": 2101,
        "p": 21,
        "y": "s"
    },
    {
        "n": "和平",
        "i": 210102,
        "p": 2101,
        "y": "h"
    },
    {
        "n": "沈河",
        "i": 210103,
        "p": 2101,
        "y": "s"
    },
    {
        "n": "大东",
        "i": 210104,
        "p": 2101,
        "y": "d"
    },
    {
        "n": "皇姑",
        "i": 210105,
        "p": 2101,
        "y": "h"
    },
    {
        "n": "铁西",
        "i": 210106,
        "p": 2101,
        "y": "t"
    },
    {
        "n": "苏家屯",
        "i": 210111,
        "p": 2101,
        "y": "s"
    },
    {
        "n": "浑南",
        "i": 210112,
        "p": 2101,
        "y": "h"
    },
    {
        "n": "沈北新区",
        "i": 210113,
        "p": 2101,
        "y": "s"
    },
    {
        "n": "于洪",
        "i": 210114,
        "p": 2101,
        "y": "y"
    },
    {
        "n": "辽中",
        "i": 210115,
        "p": 2101,
        "y": "l"
    },
    {
        "n": "康平",
        "i": 210123,
        "p": 2101,
        "y": "k"
    },
    {
        "n": "法库",
        "i": 210124,
        "p": 2101,
        "y": "f"
    },
    {
        "n": "新民",
        "i": 210181,
        "p": 2101,
        "y": "x"
    },
    {
        "n": "大连",
        "i": 2102,
        "p": 21,
        "y": "d"
    },
    {
        "n": "中山",
        "i": 210202,
        "p": 2102,
        "y": "z"
    },
    {
        "n": "西岗",
        "i": 210203,
        "p": 2102,
        "y": "x"
    },
    {
        "n": "沙河口",
        "i": 210204,
        "p": 2102,
        "y": "s"
    },
    {
        "n": "甘井子",
        "i": 210211,
        "p": 2102,
        "y": "g"
    },
    {
        "n": "旅顺口",
        "i": 210212,
        "p": 2102,
        "y": "l"
    },
    {
        "n": "金州",
        "i": 210213,
        "p": 2102,
        "y": "j"
    },
    {
        "n": "普兰店",
        "i": 210214,
        "p": 2102,
        "y": "p"
    },
    {
        "n": "长海",
        "i": 210224,
        "p": 2102,
        "y": "c"
    },
    {
        "n": "瓦房店",
        "i": 210281,
        "p": 2102,
        "y": "w"
    },
    {
        "n": "庄河",
        "i": 210283,
        "p": 2102,
        "y": "z"
    },
    {
        "n": "鞍山",
        "i": 2103,
        "p": 21,
        "y": "a"
    },
    {
        "n": "铁东",
        "i": 210302,
        "p": 2103,
        "y": "t"
    },
    {
        "n": "铁西",
        "i": 210303,
        "p": 2103,
        "y": "t"
    },
    {
        "n": "立山",
        "i": 210304,
        "p": 2103,
        "y": "l"
    },
    {
        "n": "千山",
        "i": 210311,
        "p": 2103,
        "y": "q"
    },
    {
        "n": "台安",
        "i": 210321,
        "p": 2103,
        "y": "t"
    },
    {
        "n": "岫岩",
        "i": 210323,
        "p": 2103,
        "y": "x"
    },
    {
        "n": "海城",
        "i": 210381,
        "p": 2103,
        "y": "h"
    },
    {
        "n": "抚顺",
        "i": 2104,
        "p": 21,
        "y": "f"
    },
    {
        "n": "新抚",
        "i": 210402,
        "p": 2104,
        "y": "x"
    },
    {
        "n": "东洲",
        "i": 210403,
        "p": 2104,
        "y": "d"
    },
    {
        "n": "望花",
        "i": 210404,
        "p": 2104,
        "y": "w"
    },
    {
        "n": "顺城",
        "i": 210411,
        "p": 2104,
        "y": "s"
    },
    {
        "n": "抚顺县",
        "i": 210421,
        "p": 2104,
        "y": "f"
    },
    {
        "n": "新宾",
        "i": 210422,
        "p": 2104,
        "y": "x"
    },
    {
        "n": "清原",
        "i": 210423,
        "p": 2104,
        "y": "q"
    },
    {
        "n": "本溪",
        "i": 2105,
        "p": 21,
        "y": "b"
    },
    {
        "n": "平山",
        "i": 210502,
        "p": 2105,
        "y": "p"
    },
    {
        "n": "溪湖",
        "i": 210503,
        "p": 2105,
        "y": "x"
    },
    {
        "n": "明山",
        "i": 210504,
        "p": 2105,
        "y": "m"
    },
    {
        "n": "南芬",
        "i": 210505,
        "p": 2105,
        "y": "n"
    },
    {
        "n": "本溪满族自治县",
        "i": 210521,
        "p": 2105,
        "y": "b"
    },
    {
        "n": "桓仁",
        "i": 210522,
        "p": 2105,
        "y": "h"
    },
    {
        "n": "丹东",
        "i": 2106,
        "p": 21,
        "y": "d"
    },
    {
        "n": "元宝",
        "i": 210602,
        "p": 2106,
        "y": "y"
    },
    {
        "n": "振兴",
        "i": 210603,
        "p": 2106,
        "y": "z"
    },
    {
        "n": "振安",
        "i": 210604,
        "p": 2106,
        "y": "z"
    },
    {
        "n": "宽甸",
        "i": 210624,
        "p": 2106,
        "y": "k"
    },
    {
        "n": "东港",
        "i": 210681,
        "p": 2106,
        "y": "d"
    },
    {
        "n": "凤城",
        "i": 210682,
        "p": 2106,
        "y": "f"
    },
    {
        "n": "锦州",
        "i": 2107,
        "p": 21,
        "y": "j"
    },
    {
        "n": "古塔",
        "i": 210702,
        "p": 2107,
        "y": "g"
    },
    {
        "n": "凌河",
        "i": 210703,
        "p": 2107,
        "y": "l"
    },
    {
        "n": "太和",
        "i": 210711,
        "p": 2107,
        "y": "t"
    },
    {
        "n": "黑山",
        "i": 210726,
        "p": 2107,
        "y": "h"
    },
    {
        "n": "义县",
        "i": 210727,
        "p": 2107,
        "y": "y"
    },
    {
        "n": "凌海",
        "i": 210781,
        "p": 2107,
        "y": "l"
    },
    {
        "n": "北镇",
        "i": 210782,
        "p": 2107,
        "y": "b"
    },
    {
        "n": "营口",
        "i": 2108,
        "p": 21,
        "y": "y"
    },
    {
        "n": "站前",
        "i": 210802,
        "p": 2108,
        "y": "z"
    },
    {
        "n": "西市",
        "i": 210803,
        "p": 2108,
        "y": "x"
    },
    {
        "n": "鲅鱼圈",
        "i": 210804,
        "p": 2108,
        "y": "b"
    },
    {
        "n": "老边",
        "i": 210811,
        "p": 2108,
        "y": "l"
    },
    {
        "n": "盖州",
        "i": 210881,
        "p": 2108,
        "y": "g"
    },
    {
        "n": "大石桥",
        "i": 210882,
        "p": 2108,
        "y": "d"
    },
    {
        "n": "阜新",
        "i": 2109,
        "p": 21,
        "y": "f"
    },
    {
        "n": "海州",
        "i": 210902,
        "p": 2109,
        "y": "h"
    },
    {
        "n": "新邱",
        "i": 210903,
        "p": 2109,
        "y": "x"
    },
    {
        "n": "太平",
        "i": 210904,
        "p": 2109,
        "y": "t"
    },
    {
        "n": "清河门",
        "i": 210905,
        "p": 2109,
        "y": "q"
    },
    {
        "n": "细河",
        "i": 210911,
        "p": 2109,
        "y": "x"
    },
    {
        "n": "阜新蒙古族自治县",
        "i": 210921,
        "p": 2109,
        "y": "f"
    },
    {
        "n": "彰武",
        "i": 210922,
        "p": 2109,
        "y": "z"
    },
    {
        "n": "辽阳",
        "i": 2110,
        "p": 21,
        "y": "l"
    },
    {
        "n": "白塔",
        "i": 211002,
        "p": 2110,
        "y": "b"
    },
    {
        "n": "文圣",
        "i": 211003,
        "p": 2110,
        "y": "w"
    },
    {
        "n": "宏伟",
        "i": 211004,
        "p": 2110,
        "y": "h"
    },
    {
        "n": "弓长岭",
        "i": 211005,
        "p": 2110,
        "y": "g"
    },
    {
        "n": "太子河",
        "i": 211011,
        "p": 2110,
        "y": "t"
    },
    {
        "n": "辽阳县",
        "i": 211021,
        "p": 2110,
        "y": "l"
    },
    {
        "n": "灯塔",
        "i": 211081,
        "p": 2110,
        "y": "d"
    },
    {
        "n": "盘锦",
        "i": 2111,
        "p": 21,
        "y": "p"
    },
    {
        "n": "双台子",
        "i": 211102,
        "p": 2111,
        "y": "s"
    },
    {
        "n": "兴隆台",
        "i": 211103,
        "p": 2111,
        "y": "x"
    },
    {
        "n": "大洼",
        "i": 211104,
        "p": 2111,
        "y": "d"
    },
    {
        "n": "盘山",
        "i": 211122,
        "p": 2111,
        "y": "p"
    },
    {
        "n": "铁岭",
        "i": 2112,
        "p": 21,
        "y": "t"
    },
    {
        "n": "银州",
        "i": 211202,
        "p": 2112,
        "y": "y"
    },
    {
        "n": "清河",
        "i": 211204,
        "p": 2112,
        "y": "q"
    },
    {
        "n": "铁岭县",
        "i": 211221,
        "p": 2112,
        "y": "t"
    },
    {
        "n": "西丰",
        "i": 211223,
        "p": 2112,
        "y": "x"
    },
    {
        "n": "昌图",
        "i": 211224,
        "p": 2112,
        "y": "c"
    },
    {
        "n": "调兵山",
        "i": 211281,
        "p": 2112,
        "y": "d"
    },
    {
        "n": "开原",
        "i": 211282,
        "p": 2112,
        "y": "k"
    },
    {
        "n": "朝阳",
        "i": 2113,
        "p": 21,
        "y": "c"
    },
    {
        "n": "双塔",
        "i": 211302,
        "p": 2113,
        "y": "s"
    },
    {
        "n": "龙城",
        "i": 211303,
        "p": 2113,
        "y": "l"
    },
    {
        "n": "朝阳县",
        "i": 211321,
        "p": 2113,
        "y": "c"
    },
    {
        "n": "建平",
        "i": 211322,
        "p": 2113,
        "y": "j"
    },
    {
        "n": "喀喇沁左翼",
        "i": 211324,
        "p": 2113,
        "y": "k"
    },
    {
        "n": "北票",
        "i": 211381,
        "p": 2113,
        "y": "b"
    },
    {
        "n": "凌源",
        "i": 211382,
        "p": 2113,
        "y": "l"
    },
    {
        "n": "葫芦岛",
        "i": 2114,
        "p": 21,
        "y": "h"
    },
    {
        "n": "连山",
        "i": 211402,
        "p": 2114,
        "y": "l"
    },
    {
        "n": "龙港",
        "i": 211403,
        "p": 2114,
        "y": "l"
    },
    {
        "n": "南票",
        "i": 211404,
        "p": 2114,
        "y": "n"
    },
    {
        "n": "绥中",
        "i": 211421,
        "p": 2114,
        "y": "s"
    },
    {
        "n": "建昌",
        "i": 211422,
        "p": 2114,
        "y": "j"
    },
    {
        "n": "兴城",
        "i": 211481,
        "p": 2114,
        "y": "x"
    },
    {
        "n": "吉林",
        "i": 22,
        "p": 0,
        "y": "j"
    },
    {
        "n": "长春",
        "i": 2201,
        "p": 22,
        "y": "c"
    },
    {
        "n": "南关",
        "i": 220102,
        "p": 2201,
        "y": "n"
    },
    {
        "n": "宽城",
        "i": 220103,
        "p": 2201,
        "y": "k"
    },
    {
        "n": "朝阳",
        "i": 220104,
        "p": 2201,
        "y": "c"
    },
    {
        "n": "二道",
        "i": 220105,
        "p": 2201,
        "y": "e"
    },
    {
        "n": "绿园",
        "i": 220106,
        "p": 2201,
        "y": "l"
    },
    {
        "n": "双阳",
        "i": 220112,
        "p": 2201,
        "y": "s"
    },
    {
        "n": "九台",
        "i": 220113,
        "p": 2201,
        "y": "j"
    },
    {
        "n": "农安",
        "i": 220122,
        "p": 2201,
        "y": "n"
    },
    {
        "n": "榆树",
        "i": 220182,
        "p": 2201,
        "y": "y"
    },
    {
        "n": "德惠",
        "i": 220183,
        "p": 2201,
        "y": "d"
    },
    {
        "n": "公主岭",
        "i": 220184,
        "p": 2201,
        "y": "g"
    },
    {
        "n": "吉林市",
        "i": 2202,
        "p": 22,
        "y": "j"
    },
    {
        "n": "昌邑",
        "i": 220202,
        "p": 2202,
        "y": "c"
    },
    {
        "n": "龙潭",
        "i": 220203,
        "p": 2202,
        "y": "l"
    },
    {
        "n": "船营",
        "i": 220204,
        "p": 2202,
        "y": "c"
    },
    {
        "n": "丰满",
        "i": 220211,
        "p": 2202,
        "y": "f"
    },
    {
        "n": "永吉",
        "i": 220221,
        "p": 2202,
        "y": "y"
    },
    {
        "n": "蛟河",
        "i": 220281,
        "p": 2202,
        "y": "j"
    },
    {
        "n": "桦甸",
        "i": 220282,
        "p": 2202,
        "y": "h"
    },
    {
        "n": "舒兰",
        "i": 220283,
        "p": 2202,
        "y": "s"
    },
    {
        "n": "磐石",
        "i": 220284,
        "p": 2202,
        "y": "p"
    },
    {
        "n": "四平",
        "i": 2203,
        "p": 22,
        "y": "s"
    },
    {
        "n": "铁西",
        "i": 220302,
        "p": 2203,
        "y": "t"
    },
    {
        "n": "铁东",
        "i": 220303,
        "p": 2203,
        "y": "t"
    },
    {
        "n": "梨树",
        "i": 220322,
        "p": 2203,
        "y": "l"
    },
    {
        "n": "伊通",
        "i": 220323,
        "p": 2203,
        "y": "y"
    },
    {
        "n": "双辽",
        "i": 220382,
        "p": 2203,
        "y": "s"
    },
    {
        "n": "辽源",
        "i": 2204,
        "p": 22,
        "y": "l"
    },
    {
        "n": "龙山",
        "i": 220402,
        "p": 2204,
        "y": "l"
    },
    {
        "n": "西安",
        "i": 220403,
        "p": 2204,
        "y": "x"
    },
    {
        "n": "东丰",
        "i": 220421,
        "p": 2204,
        "y": "d"
    },
    {
        "n": "东辽",
        "i": 220422,
        "p": 2204,
        "y": "d"
    },
    {
        "n": "通化",
        "i": 2205,
        "p": 22,
        "y": "t"
    },
    {
        "n": "东昌",
        "i": 220502,
        "p": 2205,
        "y": "d"
    },
    {
        "n": "二道江",
        "i": 220503,
        "p": 2205,
        "y": "e"
    },
    {
        "n": "通化县",
        "i": 220521,
        "p": 2205,
        "y": "t"
    },
    {
        "n": "辉南",
        "i": 220523,
        "p": 2205,
        "y": "h"
    },
    {
        "n": "柳河",
        "i": 220524,
        "p": 2205,
        "y": "l"
    },
    {
        "n": "梅河口",
        "i": 220581,
        "p": 2205,
        "y": "m"
    },
    {
        "n": "集安",
        "i": 220582,
        "p": 2205,
        "y": "j"
    },
    {
        "n": "白山",
        "i": 2206,
        "p": 22,
        "y": "b"
    },
    {
        "n": "浑江",
        "i": 220602,
        "p": 2206,
        "y": "h"
    },
    {
        "n": "江源",
        "i": 220605,
        "p": 2206,
        "y": "j"
    },
    {
        "n": "抚松",
        "i": 220621,
        "p": 2206,
        "y": "f"
    },
    {
        "n": "靖宇",
        "i": 220622,
        "p": 2206,
        "y": "j"
    },
    {
        "n": "长白",
        "i": 220623,
        "p": 2206,
        "y": "c"
    },
    {
        "n": "临江",
        "i": 220681,
        "p": 2206,
        "y": "l"
    },
    {
        "n": "松原",
        "i": 2207,
        "p": 22,
        "y": "s"
    },
    {
        "n": "宁江",
        "i": 220702,
        "p": 2207,
        "y": "n"
    },
    {
        "n": "前郭尔罗斯",
        "i": 220721,
        "p": 2207,
        "y": "q"
    },
    {
        "n": "长岭",
        "i": 220722,
        "p": 2207,
        "y": "c"
    },
    {
        "n": "乾安",
        "i": 220723,
        "p": 2207,
        "y": "q"
    },
    {
        "n": "扶余",
        "i": 220781,
        "p": 2207,
        "y": "f"
    },
    {
        "n": "白城",
        "i": 2208,
        "p": 22,
        "y": "b"
    },
    {
        "n": "洮北",
        "i": 220802,
        "p": 2208,
        "y": "t"
    },
    {
        "n": "镇赉",
        "i": 220821,
        "p": 2208,
        "y": "z"
    },
    {
        "n": "通榆",
        "i": 220822,
        "p": 2208,
        "y": "t"
    },
    {
        "n": "洮南",
        "i": 220881,
        "p": 2208,
        "y": "t"
    },
    {
        "n": "大安",
        "i": 220882,
        "p": 2208,
        "y": "d"
    },
    {
        "n": "延边",
        "i": 2224,
        "p": 22,
        "y": "y"
    },
    {
        "n": "延吉",
        "i": 222401,
        "p": 2224,
        "y": "y"
    },
    {
        "n": "图们",
        "i": 222402,
        "p": 2224,
        "y": "t"
    },
    {
        "n": "敦化",
        "i": 222403,
        "p": 2224,
        "y": "d"
    },
    {
        "n": "珲春",
        "i": 222404,
        "p": 2224,
        "y": "h"
    },
    {
        "n": "龙井",
        "i": 222405,
        "p": 2224,
        "y": "l"
    },
    {
        "n": "和龙",
        "i": 222406,
        "p": 2224,
        "y": "h"
    },
    {
        "n": "汪清",
        "i": 222424,
        "p": 2224,
        "y": "w"
    },
    {
        "n": "安图",
        "i": 222426,
        "p": 2224,
        "y": "a"
    },
    {
        "n": "黑龙江",
        "i": 23,
        "p": 0,
        "y": "h"
    },
    {
        "n": "哈尔滨",
        "i": 2301,
        "p": 23,
        "y": "h"
    },
    {
        "n": "道里",
        "i": 230102,
        "p": 2301,
        "y": "d"
    },
    {
        "n": "南岗",
        "i": 230103,
        "p": 2301,
        "y": "n"
    },
    {
        "n": "道外",
        "i": 230104,
        "p": 2301,
        "y": "d"
    },
    {
        "n": "平房",
        "i": 230108,
        "p": 2301,
        "y": "p"
    },
    {
        "n": "松北",
        "i": 230109,
        "p": 2301,
        "y": "s"
    },
    {
        "n": "香坊",
        "i": 230110,
        "p": 2301,
        "y": "x"
    },
    {
        "n": "呼兰",
        "i": 230111,
        "p": 2301,
        "y": "h"
    },
    {
        "n": "阿城",
        "i": 230112,
        "p": 2301,
        "y": "a"
    },
    {
        "n": "双城",
        "i": 230113,
        "p": 2301,
        "y": "s"
    },
    {
        "n": "依兰",
        "i": 230123,
        "p": 2301,
        "y": "y"
    },
    {
        "n": "方正",
        "i": 230124,
        "p": 2301,
        "y": "f"
    },
    {
        "n": "宾县",
        "i": 230125,
        "p": 2301,
        "y": "b"
    },
    {
        "n": "巴彦",
        "i": 230126,
        "p": 2301,
        "y": "b"
    },
    {
        "n": "木兰",
        "i": 230127,
        "p": 2301,
        "y": "m"
    },
    {
        "n": "通河",
        "i": 230128,
        "p": 2301,
        "y": "t"
    },
    {
        "n": "延寿",
        "i": 230129,
        "p": 2301,
        "y": "y"
    },
    {
        "n": "尚志",
        "i": 230183,
        "p": 2301,
        "y": "s"
    },
    {
        "n": "五常",
        "i": 230184,
        "p": 2301,
        "y": "w"
    },
    {
        "n": "齐齐哈尔",
        "i": 2302,
        "p": 23,
        "y": "q"
    },
    {
        "n": "龙沙",
        "i": 230202,
        "p": 2302,
        "y": "l"
    },
    {
        "n": "建华",
        "i": 230203,
        "p": 2302,
        "y": "j"
    },
    {
        "n": "铁锋",
        "i": 230204,
        "p": 2302,
        "y": "t"
    },
    {
        "n": "昂昂溪",
        "i": 230205,
        "p": 2302,
        "y": "a"
    },
    {
        "n": "富拉尔基区",
        "i": 230206,
        "p": 2302,
        "y": "f"
    },
    {
        "n": "碾子山",
        "i": 230207,
        "p": 2302,
        "y": "n"
    },
    {
        "n": "梅里斯达斡尔族区",
        "i": 230208,
        "p": 2302,
        "y": "m"
    },
    {
        "n": "龙江",
        "i": 230221,
        "p": 2302,
        "y": "l"
    },
    {
        "n": "依安",
        "i": 230223,
        "p": 2302,
        "y": "y"
    },
    {
        "n": "泰来",
        "i": 230224,
        "p": 2302,
        "y": "t"
    },
    {
        "n": "甘南",
        "i": 230225,
        "p": 2302,
        "y": "g"
    },
    {
        "n": "富裕",
        "i": 230227,
        "p": 2302,
        "y": "f"
    },
    {
        "n": "克山",
        "i": 230229,
        "p": 2302,
        "y": "k"
    },
    {
        "n": "克东",
        "i": 230230,
        "p": 2302,
        "y": "k"
    },
    {
        "n": "拜泉",
        "i": 230231,
        "p": 2302,
        "y": "b"
    },
    {
        "n": "讷河",
        "i": 230281,
        "p": 2302,
        "y": "n"
    },
    {
        "n": "鸡西",
        "i": 2303,
        "p": 23,
        "y": "j"
    },
    {
        "n": "鸡冠",
        "i": 230302,
        "p": 2303,
        "y": "j"
    },
    {
        "n": "恒山",
        "i": 230303,
        "p": 2303,
        "y": "h"
    },
    {
        "n": "滴道",
        "i": 230304,
        "p": 2303,
        "y": "d"
    },
    {
        "n": "梨树",
        "i": 230305,
        "p": 2303,
        "y": "l"
    },
    {
        "n": "城子河",
        "i": 230306,
        "p": 2303,
        "y": "c"
    },
    {
        "n": "麻山",
        "i": 230307,
        "p": 2303,
        "y": "m"
    },
    {
        "n": "鸡东",
        "i": 230321,
        "p": 2303,
        "y": "j"
    },
    {
        "n": "虎林",
        "i": 230381,
        "p": 2303,
        "y": "h"
    },
    {
        "n": "密山",
        "i": 230382,
        "p": 2303,
        "y": "m"
    },
    {
        "n": "鹤岗",
        "i": 2304,
        "p": 23,
        "y": "h"
    },
    {
        "n": "向阳",
        "i": 230402,
        "p": 2304,
        "y": "x"
    },
    {
        "n": "工农",
        "i": 230403,
        "p": 2304,
        "y": "g"
    },
    {
        "n": "南山",
        "i": 230404,
        "p": 2304,
        "y": "n"
    },
    {
        "n": "兴安",
        "i": 230405,
        "p": 2304,
        "y": "x"
    },
    {
        "n": "东山",
        "i": 230406,
        "p": 2304,
        "y": "d"
    },
    {
        "n": "兴山",
        "i": 230407,
        "p": 2304,
        "y": "x"
    },
    {
        "n": "萝北",
        "i": 230421,
        "p": 2304,
        "y": "l"
    },
    {
        "n": "绥滨",
        "i": 230422,
        "p": 2304,
        "y": "s"
    },
    {
        "n": "双鸭山",
        "i": 2305,
        "p": 23,
        "y": "s"
    },
    {
        "n": "尖山",
        "i": 230502,
        "p": 2305,
        "y": "j"
    },
    {
        "n": "岭东",
        "i": 230503,
        "p": 2305,
        "y": "l"
    },
    {
        "n": "四方台",
        "i": 230505,
        "p": 2305,
        "y": "s"
    },
    {
        "n": "宝山",
        "i": 230506,
        "p": 2305,
        "y": "b"
    },
    {
        "n": "集贤",
        "i": 230521,
        "p": 2305,
        "y": "j"
    },
    {
        "n": "友谊",
        "i": 230522,
        "p": 2305,
        "y": "y"
    },
    {
        "n": "宝清",
        "i": 230523,
        "p": 2305,
        "y": "b"
    },
    {
        "n": "饶河",
        "i": 230524,
        "p": 2305,
        "y": "r"
    },
    {
        "n": "大庆",
        "i": 2306,
        "p": 23,
        "y": "d"
    },
    {
        "n": "萨尔图",
        "i": 230602,
        "p": 2306,
        "y": "s"
    },
    {
        "n": "龙凤",
        "i": 230603,
        "p": 2306,
        "y": "l"
    },
    {
        "n": "让胡路",
        "i": 230604,
        "p": 2306,
        "y": "r"
    },
    {
        "n": "红岗",
        "i": 230605,
        "p": 2306,
        "y": "h"
    },
    {
        "n": "大同",
        "i": 230606,
        "p": 2306,
        "y": "d"
    },
    {
        "n": "肇州",
        "i": 230621,
        "p": 2306,
        "y": "z"
    },
    {
        "n": "肇源",
        "i": 230622,
        "p": 2306,
        "y": "z"
    },
    {
        "n": "林甸",
        "i": 230623,
        "p": 2306,
        "y": "l"
    },
    {
        "n": "杜尔伯特",
        "i": 230624,
        "p": 2306,
        "y": "d"
    },
    {
        "n": "伊春",
        "i": 2307,
        "p": 23,
        "y": "y"
    },
    {
        "n": "伊美",
        "i": 230717,
        "p": 2307,
        "y": "y"
    },
    {
        "n": "乌翠",
        "i": 230718,
        "p": 2307,
        "y": "w"
    },
    {
        "n": "友好",
        "i": 230719,
        "p": 2307,
        "y": "y"
    },
    {
        "n": "嘉荫",
        "i": 230722,
        "p": 2307,
        "y": "j"
    },
    {
        "n": "汤旺",
        "i": 230723,
        "p": 2307,
        "y": "t"
    },
    {
        "n": "丰林",
        "i": 230724,
        "p": 2307,
        "y": "f"
    },
    {
        "n": "大箐山",
        "i": 230725,
        "p": 2307,
        "y": "d"
    },
    {
        "n": "南岔",
        "i": 230726,
        "p": 2307,
        "y": "n"
    },
    {
        "n": "金林",
        "i": 230751,
        "p": 2307,
        "y": "j"
    },
    {
        "n": "铁力",
        "i": 230781,
        "p": 2307,
        "y": "t"
    },
    {
        "n": "佳木斯",
        "i": 2308,
        "p": 23,
        "y": "j"
    },
    {
        "n": "向阳",
        "i": 230803,
        "p": 2308,
        "y": "x"
    },
    {
        "n": "前进",
        "i": 230804,
        "p": 2308,
        "y": "q"
    },
    {
        "n": "东风",
        "i": 230805,
        "p": 2308,
        "y": "d"
    },
    {
        "n": "郊区",
        "i": 230811,
        "p": 2308,
        "y": "j"
    },
    {
        "n": "桦南",
        "i": 230822,
        "p": 2308,
        "y": "h"
    },
    {
        "n": "桦川",
        "i": 230826,
        "p": 2308,
        "y": "h"
    },
    {
        "n": "汤原",
        "i": 230828,
        "p": 2308,
        "y": "t"
    },
    {
        "n": "同江",
        "i": 230881,
        "p": 2308,
        "y": "t"
    },
    {
        "n": "富锦",
        "i": 230882,
        "p": 2308,
        "y": "f"
    },
    {
        "n": "抚远",
        "i": 230883,
        "p": 2308,
        "y": "f"
    },
    {
        "n": "七台河",
        "i": 2309,
        "p": 23,
        "y": "q"
    },
    {
        "n": "新兴",
        "i": 230902,
        "p": 2309,
        "y": "x"
    },
    {
        "n": "桃山",
        "i": 230903,
        "p": 2309,
        "y": "t"
    },
    {
        "n": "茄子河",
        "i": 230904,
        "p": 2309,
        "y": "q"
    },
    {
        "n": "勃利",
        "i": 230921,
        "p": 2309,
        "y": "b"
    },
    {
        "n": "牡丹江",
        "i": 2310,
        "p": 23,
        "y": "m"
    },
    {
        "n": "东安",
        "i": 231002,
        "p": 2310,
        "y": "d"
    },
    {
        "n": "阳明",
        "i": 231003,
        "p": 2310,
        "y": "y"
    },
    {
        "n": "爱民",
        "i": 231004,
        "p": 2310,
        "y": "a"
    },
    {
        "n": "西安",
        "i": 231005,
        "p": 2310,
        "y": "x"
    },
    {
        "n": "林口",
        "i": 231025,
        "p": 2310,
        "y": "l"
    },
    {
        "n": "绥芬河",
        "i": 231081,
        "p": 2310,
        "y": "s"
    },
    {
        "n": "海林",
        "i": 231083,
        "p": 2310,
        "y": "h"
    },
    {
        "n": "宁安",
        "i": 231084,
        "p": 2310,
        "y": "n"
    },
    {
        "n": "穆棱",
        "i": 231085,
        "p": 2310,
        "y": "m"
    },
    {
        "n": "东宁",
        "i": 231086,
        "p": 2310,
        "y": "d"
    },
    {
        "n": "黑河",
        "i": 2311,
        "p": 23,
        "y": "h"
    },
    {
        "n": "爱辉",
        "i": 231102,
        "p": 2311,
        "y": "a"
    },
    {
        "n": "逊克",
        "i": 231123,
        "p": 2311,
        "y": "x"
    },
    {
        "n": "孙吴",
        "i": 231124,
        "p": 2311,
        "y": "s"
    },
    {
        "n": "北安",
        "i": 231181,
        "p": 2311,
        "y": "b"
    },
    {
        "n": "五大连池",
        "i": 231182,
        "p": 2311,
        "y": "w"
    },
    {
        "n": "嫩江",
        "i": 231183,
        "p": 2311,
        "y": "n"
    },
    {
        "n": "绥化",
        "i": 2312,
        "p": 23,
        "y": "s"
    },
    {
        "n": "北林",
        "i": 231202,
        "p": 2312,
        "y": "b"
    },
    {
        "n": "望奎",
        "i": 231221,
        "p": 2312,
        "y": "w"
    },
    {
        "n": "兰西",
        "i": 231222,
        "p": 2312,
        "y": "l"
    },
    {
        "n": "青冈",
        "i": 231223,
        "p": 2312,
        "y": "q"
    },
    {
        "n": "庆安",
        "i": 231224,
        "p": 2312,
        "y": "q"
    },
    {
        "n": "明水",
        "i": 231225,
        "p": 2312,
        "y": "m"
    },
    {
        "n": "绥棱",
        "i": 231226,
        "p": 2312,
        "y": "s"
    },
    {
        "n": "安达",
        "i": 231281,
        "p": 2312,
        "y": "a"
    },
    {
        "n": "肇东",
        "i": 231282,
        "p": 2312,
        "y": "z"
    },
    {
        "n": "海伦",
        "i": 231283,
        "p": 2312,
        "y": "h"
    },
    {
        "n": "大兴安岭",
        "i": 2327,
        "p": 23,
        "y": "d"
    },
    {
        "n": "漠河",
        "i": 232701,
        "p": 2327,
        "y": "m"
    },
    {
        "n": "呼玛",
        "i": 232721,
        "p": 2327,
        "y": "h"
    },
    {
        "n": "塔河",
        "i": 232722,
        "p": 2327,
        "y": "t"
    },
    {
        "n": "加格达奇区",
        "i": 232761,
        "p": 2327,
        "y": "j"
    },
    {
        "n": "上海",
        "i": 31,
        "p": 0,
        "y": "s"
    },
    {
        "n": "上海",
        "i": 3101,
        "p": 31,
        "y": "s"
    },
    {
        "n": "黄浦",
        "i": 310101,
        "p": 3101,
        "y": "h"
    },
    {
        "n": "徐汇",
        "i": 310104,
        "p": 3101,
        "y": "x"
    },
    {
        "n": "长宁",
        "i": 310105,
        "p": 3101,
        "y": "c"
    },
    {
        "n": "静安",
        "i": 310106,
        "p": 3101,
        "y": "j"
    },
    {
        "n": "普陀",
        "i": 310107,
        "p": 3101,
        "y": "p"
    },
    {
        "n": "虹口",
        "i": 310109,
        "p": 3101,
        "y": "h"
    },
    {
        "n": "杨浦",
        "i": 310110,
        "p": 3101,
        "y": "y"
    },
    {
        "n": "闵行",
        "i": 310112,
        "p": 3101,
        "y": "m"
    },
    {
        "n": "宝山",
        "i": 310113,
        "p": 3101,
        "y": "b"
    },
    {
        "n": "嘉定",
        "i": 310114,
        "p": 3101,
        "y": "j"
    },
    {
        "n": "浦东新区",
        "i": 310115,
        "p": 3101,
        "y": "p"
    },
    {
        "n": "金山",
        "i": 310116,
        "p": 3101,
        "y": "j"
    },
    {
        "n": "松江",
        "i": 310117,
        "p": 3101,
        "y": "s"
    },
    {
        "n": "青浦",
        "i": 310118,
        "p": 3101,
        "y": "q"
    },
    {
        "n": "奉贤",
        "i": 310120,
        "p": 3101,
        "y": "f"
    },
    {
        "n": "崇明",
        "i": 310151,
        "p": 3101,
        "y": "c"
    },
    {
        "n": "江苏",
        "i": 32,
        "p": 0,
        "y": "j"
    },
    {
        "n": "南京",
        "i": 3201,
        "p": 32,
        "y": "n"
    },
    {
        "n": "玄武",
        "i": 320102,
        "p": 3201,
        "y": "x"
    },
    {
        "n": "秦淮",
        "i": 320104,
        "p": 3201,
        "y": "q"
    },
    {
        "n": "建邺",
        "i": 320105,
        "p": 3201,
        "y": "j"
    },
    {
        "n": "鼓楼",
        "i": 320106,
        "p": 3201,
        "y": "g"
    },
    {
        "n": "浦口",
        "i": 320111,
        "p": 3201,
        "y": "p"
    },
    {
        "n": "栖霞",
        "i": 320113,
        "p": 3201,
        "y": "q"
    },
    {
        "n": "雨花台",
        "i": 320114,
        "p": 3201,
        "y": "y"
    },
    {
        "n": "江宁",
        "i": 320115,
        "p": 3201,
        "y": "j"
    },
    {
        "n": "六合",
        "i": 320116,
        "p": 3201,
        "y": "l"
    },
    {
        "n": "溧水",
        "i": 320117,
        "p": 3201,
        "y": "l"
    },
    {
        "n": "高淳",
        "i": 320118,
        "p": 3201,
        "y": "g"
    },
    {
        "n": "无锡",
        "i": 3202,
        "p": 32,
        "y": "w"
    },
    {
        "n": "锡山",
        "i": 320205,
        "p": 3202,
        "y": "x"
    },
    {
        "n": "惠山",
        "i": 320206,
        "p": 3202,
        "y": "h"
    },
    {
        "n": "滨湖",
        "i": 320211,
        "p": 3202,
        "y": "b"
    },
    {
        "n": "梁溪",
        "i": 320213,
        "p": 3202,
        "y": "l"
    },
    {
        "n": "新吴",
        "i": 320214,
        "p": 3202,
        "y": "x"
    },
    {
        "n": "江阴",
        "i": 320281,
        "p": 3202,
        "y": "j"
    },
    {
        "n": "宜兴",
        "i": 320282,
        "p": 3202,
        "y": "y"
    },
    {
        "n": "徐州",
        "i": 3203,
        "p": 32,
        "y": "x"
    },
    {
        "n": "鼓楼",
        "i": 320302,
        "p": 3203,
        "y": "g"
    },
    {
        "n": "云龙",
        "i": 320303,
        "p": 3203,
        "y": "y"
    },
    {
        "n": "贾汪",
        "i": 320305,
        "p": 3203,
        "y": "j"
    },
    {
        "n": "泉山",
        "i": 320311,
        "p": 3203,
        "y": "q"
    },
    {
        "n": "铜山",
        "i": 320312,
        "p": 3203,
        "y": "t"
    },
    {
        "n": "丰县",
        "i": 320321,
        "p": 3203,
        "y": "f"
    },
    {
        "n": "沛县",
        "i": 320322,
        "p": 3203,
        "y": "p"
    },
    {
        "n": "睢宁",
        "i": 320324,
        "p": 3203,
        "y": "s"
    },
    {
        "n": "新沂",
        "i": 320381,
        "p": 3203,
        "y": "x"
    },
    {
        "n": "邳州",
        "i": 320382,
        "p": 3203,
        "y": "p"
    },
    {
        "n": "常州",
        "i": 3204,
        "p": 32,
        "y": "c"
    },
    {
        "n": "天宁",
        "i": 320402,
        "p": 3204,
        "y": "t"
    },
    {
        "n": "钟楼",
        "i": 320404,
        "p": 3204,
        "y": "z"
    },
    {
        "n": "新北",
        "i": 320411,
        "p": 3204,
        "y": "x"
    },
    {
        "n": "武进",
        "i": 320412,
        "p": 3204,
        "y": "w"
    },
    {
        "n": "金坛",
        "i": 320413,
        "p": 3204,
        "y": "j"
    },
    {
        "n": "溧阳",
        "i": 320481,
        "p": 3204,
        "y": "l"
    },
    {
        "n": "苏州",
        "i": 3205,
        "p": 32,
        "y": "s"
    },
    {
        "n": "虎丘",
        "i": 320505,
        "p": 3205,
        "y": "h"
    },
    {
        "n": "吴中",
        "i": 320506,
        "p": 3205,
        "y": "w"
    },
    {
        "n": "相城",
        "i": 320507,
        "p": 3205,
        "y": "x"
    },
    {
        "n": "姑苏",
        "i": 320508,
        "p": 3205,
        "y": "g"
    },
    {
        "n": "吴江",
        "i": 320509,
        "p": 3205,
        "y": "w"
    },
    {
        "n": "工业园区",
        "i": 320571,
        "p": 3205,
        "y": "g"
    },
    {
        "n": "常熟",
        "i": 320581,
        "p": 3205,
        "y": "c"
    },
    {
        "n": "张家港",
        "i": 320582,
        "p": 3205,
        "y": "z"
    },
    {
        "n": "昆山",
        "i": 320583,
        "p": 3205,
        "y": "k"
    },
    {
        "n": "太仓",
        "i": 320585,
        "p": 3205,
        "y": "t"
    },
    {
        "n": "南通",
        "i": 3206,
        "p": 32,
        "y": "n"
    },
    {
        "n": "崇川",
        "i": 320602,
        "p": 3206,
        "y": "c"
    },
    {
        "n": "港闸",
        "i": 320611,
        "p": 3206,
        "y": "g"
    },
    {
        "n": "通州",
        "i": 320612,
        "p": 3206,
        "y": "t"
    },
    {
        "n": "如东",
        "i": 320623,
        "p": 3206,
        "y": "r"
    },
    {
        "n": "启东",
        "i": 320681,
        "p": 3206,
        "y": "q"
    },
    {
        "n": "如皋",
        "i": 320682,
        "p": 3206,
        "y": "r"
    },
    {
        "n": "海门",
        "i": 320684,
        "p": 3206,
        "y": "h"
    },
    {
        "n": "海安",
        "i": 320685,
        "p": 3206,
        "y": "h"
    },
    {
        "n": "连云港",
        "i": 3207,
        "p": 32,
        "y": "l"
    },
    {
        "n": "连云",
        "i": 320703,
        "p": 3207,
        "y": "l"
    },
    {
        "n": "海州",
        "i": 320706,
        "p": 3207,
        "y": "h"
    },
    {
        "n": "赣榆",
        "i": 320707,
        "p": 3207,
        "y": "g"
    },
    {
        "n": "东海",
        "i": 320722,
        "p": 3207,
        "y": "d"
    },
    {
        "n": "灌云",
        "i": 320723,
        "p": 3207,
        "y": "g"
    },
    {
        "n": "灌南",
        "i": 320724,
        "p": 3207,
        "y": "g"
    },
    {
        "n": "淮安",
        "i": 3208,
        "p": 32,
        "y": "h"
    },
    {
        "n": "淮安区",
        "i": 320803,
        "p": 3208,
        "y": "h"
    },
    {
        "n": "淮阴",
        "i": 320804,
        "p": 3208,
        "y": "h"
    },
    {
        "n": "清江浦",
        "i": 320812,
        "p": 3208,
        "y": "q"
    },
    {
        "n": "洪泽",
        "i": 320813,
        "p": 3208,
        "y": "h"
    },
    {
        "n": "涟水",
        "i": 320826,
        "p": 3208,
        "y": "l"
    },
    {
        "n": "盱眙",
        "i": 320830,
        "p": 3208,
        "y": "x"
    },
    {
        "n": "金湖",
        "i": 320831,
        "p": 3208,
        "y": "j"
    },
    {
        "n": "盐城",
        "i": 3209,
        "p": 32,
        "y": "y"
    },
    {
        "n": "亭湖",
        "i": 320902,
        "p": 3209,
        "y": "t"
    },
    {
        "n": "盐都",
        "i": 320903,
        "p": 3209,
        "y": "y"
    },
    {
        "n": "大丰",
        "i": 320904,
        "p": 3209,
        "y": "d"
    },
    {
        "n": "响水",
        "i": 320921,
        "p": 3209,
        "y": "x"
    },
    {
        "n": "滨海",
        "i": 320922,
        "p": 3209,
        "y": "b"
    },
    {
        "n": "阜宁",
        "i": 320923,
        "p": 3209,
        "y": "f"
    },
    {
        "n": "射阳",
        "i": 320924,
        "p": 3209,
        "y": "s"
    },
    {
        "n": "建湖",
        "i": 320925,
        "p": 3209,
        "y": "j"
    },
    {
        "n": "东台",
        "i": 320981,
        "p": 3209,
        "y": "d"
    },
    {
        "n": "扬州",
        "i": 3210,
        "p": 32,
        "y": "y"
    },
    {
        "n": "广陵",
        "i": 321002,
        "p": 3210,
        "y": "g"
    },
    {
        "n": "邗江",
        "i": 321003,
        "p": 3210,
        "y": "h"
    },
    {
        "n": "江都",
        "i": 321012,
        "p": 3210,
        "y": "j"
    },
    {
        "n": "宝应",
        "i": 321023,
        "p": 3210,
        "y": "b"
    },
    {
        "n": "仪征",
        "i": 321081,
        "p": 3210,
        "y": "y"
    },
    {
        "n": "高邮",
        "i": 321084,
        "p": 3210,
        "y": "g"
    },
    {
        "n": "镇江",
        "i": 3211,
        "p": 32,
        "y": "z"
    },
    {
        "n": "京口",
        "i": 321102,
        "p": 3211,
        "y": "j"
    },
    {
        "n": "润州",
        "i": 321111,
        "p": 3211,
        "y": "r"
    },
    {
        "n": "丹徒",
        "i": 321112,
        "p": 3211,
        "y": "d"
    },
    {
        "n": "丹阳",
        "i": 321181,
        "p": 3211,
        "y": "d"
    },
    {
        "n": "扬中",
        "i": 321182,
        "p": 3211,
        "y": "y"
    },
    {
        "n": "句容",
        "i": 321183,
        "p": 3211,
        "y": "j"
    },
    {
        "n": "泰州",
        "i": 3212,
        "p": 32,
        "y": "t"
    },
    {
        "n": "海陵",
        "i": 321202,
        "p": 3212,
        "y": "h"
    },
    {
        "n": "高港",
        "i": 321203,
        "p": 3212,
        "y": "g"
    },
    {
        "n": "姜堰",
        "i": 321204,
        "p": 3212,
        "y": "j"
    },
    {
        "n": "兴化",
        "i": 321281,
        "p": 3212,
        "y": "x"
    },
    {
        "n": "靖江",
        "i": 321282,
        "p": 3212,
        "y": "j"
    },
    {
        "n": "泰兴",
        "i": 321283,
        "p": 3212,
        "y": "t"
    },
    {
        "n": "宿迁",
        "i": 3213,
        "p": 32,
        "y": "s"
    },
    {
        "n": "宿城",
        "i": 321302,
        "p": 3213,
        "y": "s"
    },
    {
        "n": "宿豫",
        "i": 321311,
        "p": 3213,
        "y": "s"
    },
    {
        "n": "沭阳",
        "i": 321322,
        "p": 3213,
        "y": "s"
    },
    {
        "n": "泗阳",
        "i": 321323,
        "p": 3213,
        "y": "s"
    },
    {
        "n": "泗洪",
        "i": 321324,
        "p": 3213,
        "y": "s"
    },
    {
        "n": "浙江",
        "i": 33,
        "p": 0,
        "y": "z"
    },
    {
        "n": "杭州",
        "i": 3301,
        "p": 33,
        "y": "h"
    },
    {
        "n": "上城",
        "i": 330102,
        "p": 3301,
        "y": "s"
    },
    {
        "n": "下城",
        "i": 330103,
        "p": 3301,
        "y": "x"
    },
    {
        "n": "江干",
        "i": 330104,
        "p": 3301,
        "y": "j"
    },
    {
        "n": "拱墅",
        "i": 330105,
        "p": 3301,
        "y": "g"
    },
    {
        "n": "西湖",
        "i": 330106,
        "p": 3301,
        "y": "x"
    },
    {
        "n": "滨江",
        "i": 330108,
        "p": 3301,
        "y": "b"
    },
    {
        "n": "萧山",
        "i": 330109,
        "p": 3301,
        "y": "x"
    },
    {
        "n": "余杭",
        "i": 330110,
        "p": 3301,
        "y": "y"
    },
    {
        "n": "富阳",
        "i": 330111,
        "p": 3301,
        "y": "f"
    },
    {
        "n": "临安",
        "i": 330112,
        "p": 3301,
        "y": "l"
    },
    {
        "n": "桐庐",
        "i": 330122,
        "p": 3301,
        "y": "t"
    },
    {
        "n": "淳安",
        "i": 330127,
        "p": 3301,
        "y": "c"
    },
    {
        "n": "建德",
        "i": 330182,
        "p": 3301,
        "y": "j"
    },
    {
        "n": "宁波",
        "i": 3302,
        "p": 33,
        "y": "n"
    },
    {
        "n": "海曙",
        "i": 330203,
        "p": 3302,
        "y": "h"
    },
    {
        "n": "江北",
        "i": 330205,
        "p": 3302,
        "y": "j"
    },
    {
        "n": "北仑",
        "i": 330206,
        "p": 3302,
        "y": "b"
    },
    {
        "n": "镇海",
        "i": 330211,
        "p": 3302,
        "y": "z"
    },
    {
        "n": "鄞州",
        "i": 330212,
        "p": 3302,
        "y": "y"
    },
    {
        "n": "奉化",
        "i": 330213,
        "p": 3302,
        "y": "f"
    },
    {
        "n": "象山",
        "i": 330225,
        "p": 3302,
        "y": "x"
    },
    {
        "n": "宁海",
        "i": 330226,
        "p": 3302,
        "y": "n"
    },
    {
        "n": "余姚",
        "i": 330281,
        "p": 3302,
        "y": "y"
    },
    {
        "n": "慈溪",
        "i": 330282,
        "p": 3302,
        "y": "c"
    },
    {
        "n": "温州",
        "i": 3303,
        "p": 33,
        "y": "w"
    },
    {
        "n": "鹿城",
        "i": 330302,
        "p": 3303,
        "y": "l"
    },
    {
        "n": "龙湾",
        "i": 330303,
        "p": 3303,
        "y": "l"
    },
    {
        "n": "瓯海",
        "i": 330304,
        "p": 3303,
        "y": "o"
    },
    {
        "n": "洞头",
        "i": 330305,
        "p": 3303,
        "y": "d"
    },
    {
        "n": "永嘉",
        "i": 330324,
        "p": 3303,
        "y": "y"
    },
    {
        "n": "平阳",
        "i": 330326,
        "p": 3303,
        "y": "p"
    },
    {
        "n": "苍南",
        "i": 330327,
        "p": 3303,
        "y": "c"
    },
    {
        "n": "文成",
        "i": 330328,
        "p": 3303,
        "y": "w"
    },
    {
        "n": "泰顺",
        "i": 330329,
        "p": 3303,
        "y": "t"
    },
    {
        "n": "瑞安",
        "i": 330381,
        "p": 3303,
        "y": "r"
    },
    {
        "n": "乐清",
        "i": 330382,
        "p": 3303,
        "y": "y"
    },
    {
        "n": "龙港",
        "i": 330383,
        "p": 3303,
        "y": "l"
    },
    {
        "n": "嘉兴",
        "i": 3304,
        "p": 33,
        "y": "j"
    },
    {
        "n": "南湖",
        "i": 330402,
        "p": 3304,
        "y": "n"
    },
    {
        "n": "秀洲",
        "i": 330411,
        "p": 3304,
        "y": "x"
    },
    {
        "n": "嘉善",
        "i": 330421,
        "p": 3304,
        "y": "j"
    },
    {
        "n": "海盐",
        "i": 330424,
        "p": 3304,
        "y": "h"
    },
    {
        "n": "海宁",
        "i": 330481,
        "p": 3304,
        "y": "h"
    },
    {
        "n": "平湖",
        "i": 330482,
        "p": 3304,
        "y": "p"
    },
    {
        "n": "桐乡",
        "i": 330483,
        "p": 3304,
        "y": "t"
    },
    {
        "n": "湖州",
        "i": 3305,
        "p": 33,
        "y": "h"
    },
    {
        "n": "吴兴",
        "i": 330502,
        "p": 3305,
        "y": "w"
    },
    {
        "n": "南浔",
        "i": 330503,
        "p": 3305,
        "y": "n"
    },
    {
        "n": "德清",
        "i": 330521,
        "p": 3305,
        "y": "d"
    },
    {
        "n": "长兴",
        "i": 330522,
        "p": 3305,
        "y": "c"
    },
    {
        "n": "安吉",
        "i": 330523,
        "p": 3305,
        "y": "a"
    },
    {
        "n": "绍兴",
        "i": 3306,
        "p": 33,
        "y": "s"
    },
    {
        "n": "越城",
        "i": 330602,
        "p": 3306,
        "y": "y"
    },
    {
        "n": "柯桥",
        "i": 330603,
        "p": 3306,
        "y": "k"
    },
    {
        "n": "上虞",
        "i": 330604,
        "p": 3306,
        "y": "s"
    },
    {
        "n": "新昌",
        "i": 330624,
        "p": 3306,
        "y": "x"
    },
    {
        "n": "诸暨",
        "i": 330681,
        "p": 3306,
        "y": "z"
    },
    {
        "n": "嵊州",
        "i": 330683,
        "p": 3306,
        "y": "s"
    },
    {
        "n": "金华",
        "i": 3307,
        "p": 33,
        "y": "j"
    },
    {
        "n": "婺城",
        "i": 330702,
        "p": 3307,
        "y": "w"
    },
    {
        "n": "金东",
        "i": 330703,
        "p": 3307,
        "y": "j"
    },
    {
        "n": "武义",
        "i": 330723,
        "p": 3307,
        "y": "w"
    },
    {
        "n": "浦江",
        "i": 330726,
        "p": 3307,
        "y": "p"
    },
    {
        "n": "磐安",
        "i": 330727,
        "p": 3307,
        "y": "p"
    },
    {
        "n": "兰溪",
        "i": 330781,
        "p": 3307,
        "y": "l"
    },
    {
        "n": "义乌",
        "i": 330782,
        "p": 3307,
        "y": "y"
    },
    {
        "n": "东阳",
        "i": 330783,
        "p": 3307,
        "y": "d"
    },
    {
        "n": "永康",
        "i": 330784,
        "p": 3307,
        "y": "y"
    },
    {
        "n": "衢州",
        "i": 3308,
        "p": 33,
        "y": "q"
    },
    {
        "n": "柯城",
        "i": 330802,
        "p": 3308,
        "y": "k"
    },
    {
        "n": "衢江",
        "i": 330803,
        "p": 3308,
        "y": "q"
    },
    {
        "n": "常山",
        "i": 330822,
        "p": 3308,
        "y": "c"
    },
    {
        "n": "开化",
        "i": 330824,
        "p": 3308,
        "y": "k"
    },
    {
        "n": "龙游",
        "i": 330825,
        "p": 3308,
        "y": "l"
    },
    {
        "n": "江山",
        "i": 330881,
        "p": 3308,
        "y": "j"
    },
    {
        "n": "舟山",
        "i": 3309,
        "p": 33,
        "y": "z"
    },
    {
        "n": "定海",
        "i": 330902,
        "p": 3309,
        "y": "d"
    },
    {
        "n": "普陀",
        "i": 330903,
        "p": 3309,
        "y": "p"
    },
    {
        "n": "岱山",
        "i": 330921,
        "p": 3309,
        "y": "d"
    },
    {
        "n": "嵊泗",
        "i": 330922,
        "p": 3309,
        "y": "s"
    },
    {
        "n": "台州",
        "i": 3310,
        "p": 33,
        "y": "t"
    },
    {
        "n": "椒江",
        "i": 331002,
        "p": 3310,
        "y": "j"
    },
    {
        "n": "黄岩",
        "i": 331003,
        "p": 3310,
        "y": "h"
    },
    {
        "n": "路桥",
        "i": 331004,
        "p": 3310,
        "y": "l"
    },
    {
        "n": "三门",
        "i": 331022,
        "p": 3310,
        "y": "s"
    },
    {
        "n": "天台",
        "i": 331023,
        "p": 3310,
        "y": "t"
    },
    {
        "n": "仙居",
        "i": 331024,
        "p": 3310,
        "y": "x"
    },
    {
        "n": "温岭",
        "i": 331081,
        "p": 3310,
        "y": "w"
    },
    {
        "n": "临海",
        "i": 331082,
        "p": 3310,
        "y": "l"
    },
    {
        "n": "玉环",
        "i": 331083,
        "p": 3310,
        "y": "y"
    },
    {
        "n": "丽水",
        "i": 3311,
        "p": 33,
        "y": "l"
    },
    {
        "n": "莲都",
        "i": 331102,
        "p": 3311,
        "y": "l"
    },
    {
        "n": "青田",
        "i": 331121,
        "p": 3311,
        "y": "q"
    },
    {
        "n": "缙云",
        "i": 331122,
        "p": 3311,
        "y": "j"
    },
    {
        "n": "遂昌",
        "i": 331123,
        "p": 3311,
        "y": "s"
    },
    {
        "n": "松阳",
        "i": 331124,
        "p": 3311,
        "y": "s"
    },
    {
        "n": "云和",
        "i": 331125,
        "p": 3311,
        "y": "y"
    },
    {
        "n": "庆元",
        "i": 331126,
        "p": 3311,
        "y": "q"
    },
    {
        "n": "景宁",
        "i": 331127,
        "p": 3311,
        "y": "j"
    },
    {
        "n": "龙泉",
        "i": 331181,
        "p": 3311,
        "y": "l"
    },
    {
        "n": "安徽",
        "i": 34,
        "p": 0,
        "y": "a"
    },
    {
        "n": "合肥",
        "i": 3401,
        "p": 34,
        "y": "h"
    },
    {
        "n": "瑶海",
        "i": 340102,
        "p": 3401,
        "y": "y"
    },
    {
        "n": "庐阳",
        "i": 340103,
        "p": 3401,
        "y": "l"
    },
    {
        "n": "蜀山",
        "i": 340104,
        "p": 3401,
        "y": "s"
    },
    {
        "n": "包河",
        "i": 340111,
        "p": 3401,
        "y": "b"
    },
    {
        "n": "长丰",
        "i": 340121,
        "p": 3401,
        "y": "c"
    },
    {
        "n": "肥东",
        "i": 340122,
        "p": 3401,
        "y": "f"
    },
    {
        "n": "肥西",
        "i": 340123,
        "p": 3401,
        "y": "f"
    },
    {
        "n": "庐江",
        "i": 340124,
        "p": 3401,
        "y": "l"
    },
    {
        "n": "巢湖",
        "i": 340181,
        "p": 3401,
        "y": "c"
    },
    {
        "n": "芜湖",
        "i": 3402,
        "p": 34,
        "y": "w"
    },
    {
        "n": "镜湖",
        "i": 340202,
        "p": 3402,
        "y": "j"
    },
    {
        "n": "弋江",
        "i": 340203,
        "p": 3402,
        "y": "y"
    },
    {
        "n": "鸠江",
        "i": 340207,
        "p": 3402,
        "y": "j"
    },
    {
        "n": "三山",
        "i": 340208,
        "p": 3402,
        "y": "s"
    },
    {
        "n": "芜湖县",
        "i": 340221,
        "p": 3402,
        "y": "w"
    },
    {
        "n": "繁昌",
        "i": 340222,
        "p": 3402,
        "y": "f"
    },
    {
        "n": "南陵",
        "i": 340223,
        "p": 3402,
        "y": "n"
    },
    {
        "n": "无为",
        "i": 340281,
        "p": 3402,
        "y": "w"
    },
    {
        "n": "蚌埠",
        "i": 3403,
        "p": 34,
        "y": "b"
    },
    {
        "n": "龙子湖",
        "i": 340302,
        "p": 3403,
        "y": "l"
    },
    {
        "n": "蚌山",
        "i": 340303,
        "p": 3403,
        "y": "b"
    },
    {
        "n": "禹会",
        "i": 340304,
        "p": 3403,
        "y": "y"
    },
    {
        "n": "淮上",
        "i": 340311,
        "p": 3403,
        "y": "h"
    },
    {
        "n": "怀远",
        "i": 340321,
        "p": 3403,
        "y": "h"
    },
    {
        "n": "五河",
        "i": 340322,
        "p": 3403,
        "y": "w"
    },
    {
        "n": "固镇",
        "i": 340323,
        "p": 3403,
        "y": "g"
    },
    {
        "n": "淮南",
        "i": 3404,
        "p": 34,
        "y": "h"
    },
    {
        "n": "大通",
        "i": 340402,
        "p": 3404,
        "y": "d"
    },
    {
        "n": "田家庵",
        "i": 340403,
        "p": 3404,
        "y": "t"
    },
    {
        "n": "谢家集",
        "i": 340404,
        "p": 3404,
        "y": "x"
    },
    {
        "n": "八公山",
        "i": 340405,
        "p": 3404,
        "y": "b"
    },
    {
        "n": "潘集",
        "i": 340406,
        "p": 3404,
        "y": "p"
    },
    {
        "n": "凤台",
        "i": 340421,
        "p": 3404,
        "y": "f"
    },
    {
        "n": "寿县",
        "i": 340422,
        "p": 3404,
        "y": "s"
    },
    {
        "n": "马鞍山",
        "i": 3405,
        "p": 34,
        "y": "m"
    },
    {
        "n": "花山",
        "i": 340503,
        "p": 3405,
        "y": "h"
    },
    {
        "n": "雨山",
        "i": 340504,
        "p": 3405,
        "y": "y"
    },
    {
        "n": "博望",
        "i": 340506,
        "p": 3405,
        "y": "b"
    },
    {
        "n": "当涂",
        "i": 340521,
        "p": 3405,
        "y": "d"
    },
    {
        "n": "含山",
        "i": 340522,
        "p": 3405,
        "y": "h"
    },
    {
        "n": "和县",
        "i": 340523,
        "p": 3405,
        "y": "h"
    },
    {
        "n": "淮北",
        "i": 3406,
        "p": 34,
        "y": "h"
    },
    {
        "n": "杜集",
        "i": 340602,
        "p": 3406,
        "y": "d"
    },
    {
        "n": "相山",
        "i": 340603,
        "p": 3406,
        "y": "x"
    },
    {
        "n": "烈山",
        "i": 340604,
        "p": 3406,
        "y": "l"
    },
    {
        "n": "濉溪",
        "i": 340621,
        "p": 3406,
        "y": "s"
    },
    {
        "n": "铜陵",
        "i": 3407,
        "p": 34,
        "y": "t"
    },
    {
        "n": "铜官",
        "i": 340705,
        "p": 3407,
        "y": "t"
    },
    {
        "n": "义安",
        "i": 340706,
        "p": 3407,
        "y": "y"
    },
    {
        "n": "郊区",
        "i": 340711,
        "p": 3407,
        "y": "j"
    },
    {
        "n": "枞阳",
        "i": 340722,
        "p": 3407,
        "y": "z"
    },
    {
        "n": "安庆",
        "i": 3408,
        "p": 34,
        "y": "a"
    },
    {
        "n": "迎江",
        "i": 340802,
        "p": 3408,
        "y": "y"
    },
    {
        "n": "大观",
        "i": 340803,
        "p": 3408,
        "y": "d"
    },
    {
        "n": "宜秀",
        "i": 340811,
        "p": 3408,
        "y": "y"
    },
    {
        "n": "怀宁",
        "i": 340822,
        "p": 3408,
        "y": "h"
    },
    {
        "n": "太湖",
        "i": 340825,
        "p": 3408,
        "y": "t"
    },
    {
        "n": "宿松",
        "i": 340826,
        "p": 3408,
        "y": "s"
    },
    {
        "n": "望江",
        "i": 340827,
        "p": 3408,
        "y": "w"
    },
    {
        "n": "岳西",
        "i": 340828,
        "p": 3408,
        "y": "y"
    },
    {
        "n": "桐城",
        "i": 340881,
        "p": 3408,
        "y": "t"
    },
    {
        "n": "潜山",
        "i": 340882,
        "p": 3408,
        "y": "q"
    },
    {
        "n": "黄山",
        "i": 3410,
        "p": 34,
        "y": "h"
    },
    {
        "n": "屯溪",
        "i": 341002,
        "p": 3410,
        "y": "t"
    },
    {
        "n": "黄山区",
        "i": 341003,
        "p": 3410,
        "y": "h"
    },
    {
        "n": "徽州",
        "i": 341004,
        "p": 3410,
        "y": "h"
    },
    {
        "n": "歙县",
        "i": 341021,
        "p": 3410,
        "y": "s"
    },
    {
        "n": "休宁",
        "i": 341022,
        "p": 3410,
        "y": "x"
    },
    {
        "n": "黟县",
        "i": 341023,
        "p": 3410,
        "y": "y"
    },
    {
        "n": "祁门",
        "i": 341024,
        "p": 3410,
        "y": "q"
    },
    {
        "n": "滁州",
        "i": 3411,
        "p": 34,
        "y": "c"
    },
    {
        "n": "琅琊",
        "i": 341102,
        "p": 3411,
        "y": "l"
    },
    {
        "n": "南谯",
        "i": 341103,
        "p": 3411,
        "y": "n"
    },
    {
        "n": "来安",
        "i": 341122,
        "p": 3411,
        "y": "l"
    },
    {
        "n": "全椒",
        "i": 341124,
        "p": 3411,
        "y": "q"
    },
    {
        "n": "定远",
        "i": 341125,
        "p": 3411,
        "y": "d"
    },
    {
        "n": "凤阳",
        "i": 341126,
        "p": 3411,
        "y": "f"
    },
    {
        "n": "天长",
        "i": 341181,
        "p": 3411,
        "y": "t"
    },
    {
        "n": "明光",
        "i": 341182,
        "p": 3411,
        "y": "m"
    },
    {
        "n": "阜阳",
        "i": 3412,
        "p": 34,
        "y": "f"
    },
    {
        "n": "颍州",
        "i": 341202,
        "p": 3412,
        "y": "y"
    },
    {
        "n": "颍东",
        "i": 341203,
        "p": 3412,
        "y": "y"
    },
    {
        "n": "颍泉",
        "i": 341204,
        "p": 3412,
        "y": "y"
    },
    {
        "n": "临泉",
        "i": 341221,
        "p": 3412,
        "y": "l"
    },
    {
        "n": "太和",
        "i": 341222,
        "p": 3412,
        "y": "t"
    },
    {
        "n": "阜南",
        "i": 341225,
        "p": 3412,
        "y": "f"
    },
    {
        "n": "颍上",
        "i": 341226,
        "p": 3412,
        "y": "y"
    },
    {
        "n": "界首",
        "i": 341282,
        "p": 3412,
        "y": "j"
    },
    {
        "n": "宿州",
        "i": 3413,
        "p": 34,
        "y": "s"
    },
    {
        "n": "埇桥",
        "i": 341302,
        "p": 3413,
        "y": "y"
    },
    {
        "n": "砀山",
        "i": 341321,
        "p": 3413,
        "y": "d"
    },
    {
        "n": "萧县",
        "i": 341322,
        "p": 3413,
        "y": "x"
    },
    {
        "n": "灵璧",
        "i": 341323,
        "p": 3413,
        "y": "l"
    },
    {
        "n": "泗县",
        "i": 341324,
        "p": 3413,
        "y": "s"
    },
    {
        "n": "六安",
        "i": 3415,
        "p": 34,
        "y": "l"
    },
    {
        "n": "金安",
        "i": 341502,
        "p": 3415,
        "y": "j"
    },
    {
        "n": "裕安",
        "i": 341503,
        "p": 3415,
        "y": "y"
    },
    {
        "n": "叶集",
        "i": 341504,
        "p": 3415,
        "y": "y"
    },
    {
        "n": "霍邱",
        "i": 341522,
        "p": 3415,
        "y": "h"
    },
    {
        "n": "舒城",
        "i": 341523,
        "p": 3415,
        "y": "s"
    },
    {
        "n": "金寨",
        "i": 341524,
        "p": 3415,
        "y": "j"
    },
    {
        "n": "霍山",
        "i": 341525,
        "p": 3415,
        "y": "h"
    },
    {
        "n": "亳州",
        "i": 3416,
        "p": 34,
        "y": "b"
    },
    {
        "n": "谯城",
        "i": 341602,
        "p": 3416,
        "y": "q"
    },
    {
        "n": "涡阳",
        "i": 341621,
        "p": 3416,
        "y": "g"
    },
    {
        "n": "蒙城",
        "i": 341622,
        "p": 3416,
        "y": "m"
    },
    {
        "n": "利辛",
        "i": 341623,
        "p": 3416,
        "y": "l"
    },
    {
        "n": "池州",
        "i": 3417,
        "p": 34,
        "y": "c"
    },
    {
        "n": "贵池",
        "i": 341702,
        "p": 3417,
        "y": "g"
    },
    {
        "n": "东至",
        "i": 341721,
        "p": 3417,
        "y": "d"
    },
    {
        "n": "石台",
        "i": 341722,
        "p": 3417,
        "y": "s"
    },
    {
        "n": "青阳",
        "i": 341723,
        "p": 3417,
        "y": "q"
    },
    {
        "n": "宣城",
        "i": 3418,
        "p": 34,
        "y": "x"
    },
    {
        "n": "宣州",
        "i": 341802,
        "p": 3418,
        "y": "x"
    },
    {
        "n": "郎溪",
        "i": 341821,
        "p": 3418,
        "y": "l"
    },
    {
        "n": "泾县",
        "i": 341823,
        "p": 3418,
        "y": "j"
    },
    {
        "n": "绩溪",
        "i": 341824,
        "p": 3418,
        "y": "j"
    },
    {
        "n": "旌德",
        "i": 341825,
        "p": 3418,
        "y": "j"
    },
    {
        "n": "宁国",
        "i": 341881,
        "p": 3418,
        "y": "n"
    },
    {
        "n": "广德",
        "i": 341882,
        "p": 3418,
        "y": "g"
    },
    {
        "n": "福建",
        "i": 35,
        "p": 0,
        "y": "f"
    },
    {
        "n": "福州",
        "i": 3501,
        "p": 35,
        "y": "f"
    },
    {
        "n": "鼓楼",
        "i": 350102,
        "p": 3501,
        "y": "g"
    },
    {
        "n": "台江",
        "i": 350103,
        "p": 3501,
        "y": "t"
    },
    {
        "n": "仓山",
        "i": 350104,
        "p": 3501,
        "y": "c"
    },
    {
        "n": "马尾",
        "i": 350105,
        "p": 3501,
        "y": "m"
    },
    {
        "n": "晋安",
        "i": 350111,
        "p": 3501,
        "y": "j"
    },
    {
        "n": "长乐",
        "i": 350112,
        "p": 3501,
        "y": "c"
    },
    {
        "n": "闽侯",
        "i": 350121,
        "p": 3501,
        "y": "m"
    },
    {
        "n": "连江",
        "i": 350122,
        "p": 3501,
        "y": "l"
    },
    {
        "n": "罗源",
        "i": 350123,
        "p": 3501,
        "y": "l"
    },
    {
        "n": "闽清",
        "i": 350124,
        "p": 3501,
        "y": "m"
    },
    {
        "n": "永泰",
        "i": 350125,
        "p": 3501,
        "y": "y"
    },
    {
        "n": "平潭",
        "i": 350128,
        "p": 3501,
        "y": "p"
    },
    {
        "n": "福清",
        "i": 350181,
        "p": 3501,
        "y": "f"
    },
    {
        "n": "厦门",
        "i": 3502,
        "p": 35,
        "y": "x"
    },
    {
        "n": "思明",
        "i": 350203,
        "p": 3502,
        "y": "s"
    },
    {
        "n": "海沧",
        "i": 350205,
        "p": 3502,
        "y": "h"
    },
    {
        "n": "湖里",
        "i": 350206,
        "p": 3502,
        "y": "h"
    },
    {
        "n": "集美",
        "i": 350211,
        "p": 3502,
        "y": "j"
    },
    {
        "n": "同安",
        "i": 350212,
        "p": 3502,
        "y": "t"
    },
    {
        "n": "翔安",
        "i": 350213,
        "p": 3502,
        "y": "x"
    },
    {
        "n": "莆田",
        "i": 3503,
        "p": 35,
        "y": "p"
    },
    {
        "n": "城厢",
        "i": 350302,
        "p": 3503,
        "y": "c"
    },
    {
        "n": "涵江",
        "i": 350303,
        "p": 3503,
        "y": "h"
    },
    {
        "n": "荔城",
        "i": 350304,
        "p": 3503,
        "y": "l"
    },
    {
        "n": "秀屿",
        "i": 350305,
        "p": 3503,
        "y": "x"
    },
    {
        "n": "仙游",
        "i": 350322,
        "p": 3503,
        "y": "x"
    },
    {
        "n": "三明",
        "i": 3504,
        "p": 35,
        "y": "s"
    },
    {
        "n": "梅列",
        "i": 350402,
        "p": 3504,
        "y": "m"
    },
    {
        "n": "三元",
        "i": 350403,
        "p": 3504,
        "y": "s"
    },
    {
        "n": "明溪",
        "i": 350421,
        "p": 3504,
        "y": "m"
    },
    {
        "n": "清流",
        "i": 350423,
        "p": 3504,
        "y": "q"
    },
    {
        "n": "宁化",
        "i": 350424,
        "p": 3504,
        "y": "n"
    },
    {
        "n": "大田",
        "i": 350425,
        "p": 3504,
        "y": "d"
    },
    {
        "n": "尤溪",
        "i": 350426,
        "p": 3504,
        "y": "y"
    },
    {
        "n": "沙县",
        "i": 350427,
        "p": 3504,
        "y": "s"
    },
    {
        "n": "将乐",
        "i": 350428,
        "p": 3504,
        "y": "j"
    },
    {
        "n": "泰宁",
        "i": 350429,
        "p": 3504,
        "y": "t"
    },
    {
        "n": "建宁",
        "i": 350430,
        "p": 3504,
        "y": "j"
    },
    {
        "n": "永安",
        "i": 350481,
        "p": 3504,
        "y": "y"
    },
    {
        "n": "泉州",
        "i": 3505,
        "p": 35,
        "y": "q"
    },
    {
        "n": "鲤城",
        "i": 350502,
        "p": 3505,
        "y": "l"
    },
    {
        "n": "丰泽",
        "i": 350503,
        "p": 3505,
        "y": "f"
    },
    {
        "n": "洛江",
        "i": 350504,
        "p": 3505,
        "y": "l"
    },
    {
        "n": "泉港",
        "i": 350505,
        "p": 3505,
        "y": "q"
    },
    {
        "n": "惠安",
        "i": 350521,
        "p": 3505,
        "y": "h"
    },
    {
        "n": "安溪",
        "i": 350524,
        "p": 3505,
        "y": "a"
    },
    {
        "n": "永春",
        "i": 350525,
        "p": 3505,
        "y": "y"
    },
    {
        "n": "德化",
        "i": 350526,
        "p": 3505,
        "y": "d"
    },
    {
        "n": "金门",
        "i": 350527,
        "p": 3505,
        "y": "j"
    },
    {
        "n": "石狮",
        "i": 350581,
        "p": 3505,
        "y": "s"
    },
    {
        "n": "晋江",
        "i": 350582,
        "p": 3505,
        "y": "j"
    },
    {
        "n": "南安",
        "i": 350583,
        "p": 3505,
        "y": "n"
    },
    {
        "n": "漳州",
        "i": 3506,
        "p": 35,
        "y": "z"
    },
    {
        "n": "芗城",
        "i": 350602,
        "p": 3506,
        "y": "x"
    },
    {
        "n": "龙文",
        "i": 350603,
        "p": 3506,
        "y": "l"
    },
    {
        "n": "云霄",
        "i": 350622,
        "p": 3506,
        "y": "y"
    },
    {
        "n": "漳浦",
        "i": 350623,
        "p": 3506,
        "y": "z"
    },
    {
        "n": "诏安",
        "i": 350624,
        "p": 3506,
        "y": "z"
    },
    {
        "n": "长泰",
        "i": 350625,
        "p": 3506,
        "y": "c"
    },
    {
        "n": "东山",
        "i": 350626,
        "p": 3506,
        "y": "d"
    },
    {
        "n": "南靖",
        "i": 350627,
        "p": 3506,
        "y": "n"
    },
    {
        "n": "平和",
        "i": 350628,
        "p": 3506,
        "y": "p"
    },
    {
        "n": "华安",
        "i": 350629,
        "p": 3506,
        "y": "h"
    },
    {
        "n": "龙海",
        "i": 350681,
        "p": 3506,
        "y": "l"
    },
    {
        "n": "南平",
        "i": 3507,
        "p": 35,
        "y": "n"
    },
    {
        "n": "延平",
        "i": 350702,
        "p": 3507,
        "y": "y"
    },
    {
        "n": "建阳",
        "i": 350703,
        "p": 3507,
        "y": "j"
    },
    {
        "n": "顺昌",
        "i": 350721,
        "p": 3507,
        "y": "s"
    },
    {
        "n": "浦城",
        "i": 350722,
        "p": 3507,
        "y": "p"
    },
    {
        "n": "光泽",
        "i": 350723,
        "p": 3507,
        "y": "g"
    },
    {
        "n": "松溪",
        "i": 350724,
        "p": 3507,
        "y": "s"
    },
    {
        "n": "政和",
        "i": 350725,
        "p": 3507,
        "y": "z"
    },
    {
        "n": "邵武",
        "i": 350781,
        "p": 3507,
        "y": "s"
    },
    {
        "n": "武夷山",
        "i": 350782,
        "p": 3507,
        "y": "w"
    },
    {
        "n": "建瓯",
        "i": 350783,
        "p": 3507,
        "y": "j"
    },
    {
        "n": "龙岩",
        "i": 3508,
        "p": 35,
        "y": "l"
    },
    {
        "n": "新罗",
        "i": 350802,
        "p": 3508,
        "y": "x"
    },
    {
        "n": "永定",
        "i": 350803,
        "p": 3508,
        "y": "y"
    },
    {
        "n": "长汀",
        "i": 350821,
        "p": 3508,
        "y": "c"
    },
    {
        "n": "上杭",
        "i": 350823,
        "p": 3508,
        "y": "s"
    },
    {
        "n": "武平",
        "i": 350824,
        "p": 3508,
        "y": "w"
    },
    {
        "n": "连城",
        "i": 350825,
        "p": 3508,
        "y": "l"
    },
    {
        "n": "漳平",
        "i": 350881,
        "p": 3508,
        "y": "z"
    },
    {
        "n": "宁德",
        "i": 3509,
        "p": 35,
        "y": "n"
    },
    {
        "n": "蕉城",
        "i": 350902,
        "p": 3509,
        "y": "j"
    },
    {
        "n": "霞浦",
        "i": 350921,
        "p": 3509,
        "y": "x"
    },
    {
        "n": "古田",
        "i": 350922,
        "p": 3509,
        "y": "g"
    },
    {
        "n": "屏南",
        "i": 350923,
        "p": 3509,
        "y": "p"
    },
    {
        "n": "寿宁",
        "i": 350924,
        "p": 3509,
        "y": "s"
    },
    {
        "n": "周宁",
        "i": 350925,
        "p": 3509,
        "y": "z"
    },
    {
        "n": "柘荣",
        "i": 350926,
        "p": 3509,
        "y": "z"
    },
    {
        "n": "福安",
        "i": 350981,
        "p": 3509,
        "y": "f"
    },
    {
        "n": "福鼎",
        "i": 350982,
        "p": 3509,
        "y": "f"
    },
    {
        "n": "江西",
        "i": 36,
        "p": 0,
        "y": "j"
    },
    {
        "n": "南昌",
        "i": 3601,
        "p": 36,
        "y": "n"
    },
    {
        "n": "东湖",
        "i": 360102,
        "p": 3601,
        "y": "d"
    },
    {
        "n": "西湖",
        "i": 360103,
        "p": 3601,
        "y": "x"
    },
    {
        "n": "青云谱",
        "i": 360104,
        "p": 3601,
        "y": "q"
    },
    {
        "n": "青山湖",
        "i": 360111,
        "p": 3601,
        "y": "q"
    },
    {
        "n": "新建",
        "i": 360112,
        "p": 3601,
        "y": "x"
    },
    {
        "n": "红谷滩",
        "i": 360113,
        "p": 3601,
        "y": "h"
    },
    {
        "n": "南昌县",
        "i": 360121,
        "p": 3601,
        "y": "n"
    },
    {
        "n": "安义",
        "i": 360123,
        "p": 3601,
        "y": "a"
    },
    {
        "n": "进贤",
        "i": 360124,
        "p": 3601,
        "y": "j"
    },
    {
        "n": "景德镇",
        "i": 3602,
        "p": 36,
        "y": "j"
    },
    {
        "n": "昌江",
        "i": 360202,
        "p": 3602,
        "y": "c"
    },
    {
        "n": "珠山",
        "i": 360203,
        "p": 3602,
        "y": "z"
    },
    {
        "n": "浮梁",
        "i": 360222,
        "p": 3602,
        "y": "f"
    },
    {
        "n": "乐平",
        "i": 360281,
        "p": 3602,
        "y": "l"
    },
    {
        "n": "萍乡",
        "i": 3603,
        "p": 36,
        "y": "p"
    },
    {
        "n": "安源",
        "i": 360302,
        "p": 3603,
        "y": "a"
    },
    {
        "n": "湘东",
        "i": 360313,
        "p": 3603,
        "y": "x"
    },
    {
        "n": "莲花",
        "i": 360321,
        "p": 3603,
        "y": "l"
    },
    {
        "n": "上栗",
        "i": 360322,
        "p": 3603,
        "y": "s"
    },
    {
        "n": "芦溪",
        "i": 360323,
        "p": 3603,
        "y": "l"
    },
    {
        "n": "九江",
        "i": 3604,
        "p": 36,
        "y": "j"
    },
    {
        "n": "濂溪",
        "i": 360402,
        "p": 3604,
        "y": "l"
    },
    {
        "n": "浔阳",
        "i": 360403,
        "p": 3604,
        "y": "x"
    },
    {
        "n": "柴桑",
        "i": 360404,
        "p": 3604,
        "y": "c"
    },
    {
        "n": "武宁",
        "i": 360423,
        "p": 3604,
        "y": "w"
    },
    {
        "n": "修水",
        "i": 360424,
        "p": 3604,
        "y": "x"
    },
    {
        "n": "永修",
        "i": 360425,
        "p": 3604,
        "y": "y"
    },
    {
        "n": "德安",
        "i": 360426,
        "p": 3604,
        "y": "d"
    },
    {
        "n": "都昌",
        "i": 360428,
        "p": 3604,
        "y": "d"
    },
    {
        "n": "湖口",
        "i": 360429,
        "p": 3604,
        "y": "h"
    },
    {
        "n": "彭泽",
        "i": 360430,
        "p": 3604,
        "y": "p"
    },
    {
        "n": "瑞昌",
        "i": 360481,
        "p": 3604,
        "y": "r"
    },
    {
        "n": "共青城",
        "i": 360482,
        "p": 3604,
        "y": "g"
    },
    {
        "n": "庐山",
        "i": 360483,
        "p": 3604,
        "y": "l"
    },
    {
        "n": "新余",
        "i": 3605,
        "p": 36,
        "y": "x"
    },
    {
        "n": "渝水",
        "i": 360502,
        "p": 3605,
        "y": "y"
    },
    {
        "n": "分宜",
        "i": 360521,
        "p": 3605,
        "y": "f"
    },
    {
        "n": "鹰潭",
        "i": 3606,
        "p": 36,
        "y": "y"
    },
    {
        "n": "月湖",
        "i": 360602,
        "p": 3606,
        "y": "y"
    },
    {
        "n": "余江",
        "i": 360603,
        "p": 3606,
        "y": "y"
    },
    {
        "n": "贵溪",
        "i": 360681,
        "p": 3606,
        "y": "g"
    },
    {
        "n": "赣州",
        "i": 3607,
        "p": 36,
        "y": "g"
    },
    {
        "n": "章贡",
        "i": 360702,
        "p": 3607,
        "y": "z"
    },
    {
        "n": "南康",
        "i": 360703,
        "p": 3607,
        "y": "n"
    },
    {
        "n": "赣县",
        "i": 360704,
        "p": 3607,
        "y": "g"
    },
    {
        "n": "信丰",
        "i": 360722,
        "p": 3607,
        "y": "x"
    },
    {
        "n": "大余",
        "i": 360723,
        "p": 3607,
        "y": "d"
    },
    {
        "n": "上犹",
        "i": 360724,
        "p": 3607,
        "y": "s"
    },
    {
        "n": "崇义",
        "i": 360725,
        "p": 3607,
        "y": "c"
    },
    {
        "n": "安远",
        "i": 360726,
        "p": 3607,
        "y": "a"
    },
    {
        "n": "龙南",
        "i": 360727,
        "p": 3607,
        "y": "l"
    },
    {
        "n": "定南",
        "i": 360728,
        "p": 3607,
        "y": "d"
    },
    {
        "n": "全南",
        "i": 360729,
        "p": 3607,
        "y": "q"
    },
    {
        "n": "宁都",
        "i": 360730,
        "p": 3607,
        "y": "n"
    },
    {
        "n": "于都",
        "i": 360731,
        "p": 3607,
        "y": "y"
    },
    {
        "n": "兴国",
        "i": 360732,
        "p": 3607,
        "y": "x"
    },
    {
        "n": "会昌",
        "i": 360733,
        "p": 3607,
        "y": "h"
    },
    {
        "n": "寻乌",
        "i": 360734,
        "p": 3607,
        "y": "x"
    },
    {
        "n": "石城",
        "i": 360735,
        "p": 3607,
        "y": "s"
    },
    {
        "n": "瑞金",
        "i": 360781,
        "p": 3607,
        "y": "r"
    },
    {
        "n": "吉安",
        "i": 3608,
        "p": 36,
        "y": "j"
    },
    {
        "n": "吉州",
        "i": 360802,
        "p": 3608,
        "y": "j"
    },
    {
        "n": "青原",
        "i": 360803,
        "p": 3608,
        "y": "q"
    },
    {
        "n": "吉安县",
        "i": 360821,
        "p": 3608,
        "y": "j"
    },
    {
        "n": "吉水",
        "i": 360822,
        "p": 3608,
        "y": "j"
    },
    {
        "n": "峡江",
        "i": 360823,
        "p": 3608,
        "y": "x"
    },
    {
        "n": "新干",
        "i": 360824,
        "p": 3608,
        "y": "x"
    },
    {
        "n": "永丰",
        "i": 360825,
        "p": 3608,
        "y": "y"
    },
    {
        "n": "泰和",
        "i": 360826,
        "p": 3608,
        "y": "t"
    },
    {
        "n": "遂川",
        "i": 360827,
        "p": 3608,
        "y": "s"
    },
    {
        "n": "万安",
        "i": 360828,
        "p": 3608,
        "y": "w"
    },
    {
        "n": "安福",
        "i": 360829,
        "p": 3608,
        "y": "a"
    },
    {
        "n": "永新",
        "i": 360830,
        "p": 3608,
        "y": "y"
    },
    {
        "n": "井冈山",
        "i": 360881,
        "p": 3608,
        "y": "j"
    },
    {
        "n": "宜春",
        "i": 3609,
        "p": 36,
        "y": "y"
    },
    {
        "n": "袁州",
        "i": 360902,
        "p": 3609,
        "y": "y"
    },
    {
        "n": "奉新",
        "i": 360921,
        "p": 3609,
        "y": "f"
    },
    {
        "n": "万载",
        "i": 360922,
        "p": 3609,
        "y": "w"
    },
    {
        "n": "上高",
        "i": 360923,
        "p": 3609,
        "y": "s"
    },
    {
        "n": "宜丰",
        "i": 360924,
        "p": 3609,
        "y": "y"
    },
    {
        "n": "靖安",
        "i": 360925,
        "p": 3609,
        "y": "j"
    },
    {
        "n": "铜鼓",
        "i": 360926,
        "p": 3609,
        "y": "t"
    },
    {
        "n": "丰城",
        "i": 360981,
        "p": 3609,
        "y": "f"
    },
    {
        "n": "樟树",
        "i": 360982,
        "p": 3609,
        "y": "z"
    },
    {
        "n": "高安",
        "i": 360983,
        "p": 3609,
        "y": "g"
    },
    {
        "n": "抚州",
        "i": 3610,
        "p": 36,
        "y": "f"
    },
    {
        "n": "临川",
        "i": 361002,
        "p": 3610,
        "y": "l"
    },
    {
        "n": "东乡",
        "i": 361003,
        "p": 3610,
        "y": "d"
    },
    {
        "n": "南城",
        "i": 361021,
        "p": 3610,
        "y": "n"
    },
    {
        "n": "黎川",
        "i": 361022,
        "p": 3610,
        "y": "l"
    },
    {
        "n": "南丰",
        "i": 361023,
        "p": 3610,
        "y": "n"
    },
    {
        "n": "崇仁",
        "i": 361024,
        "p": 3610,
        "y": "c"
    },
    {
        "n": "乐安",
        "i": 361025,
        "p": 3610,
        "y": "l"
    },
    {
        "n": "宜黄",
        "i": 361026,
        "p": 3610,
        "y": "y"
    },
    {
        "n": "金溪",
        "i": 361027,
        "p": 3610,
        "y": "j"
    },
    {
        "n": "资溪",
        "i": 361028,
        "p": 3610,
        "y": "z"
    },
    {
        "n": "广昌",
        "i": 361030,
        "p": 3610,
        "y": "g"
    },
    {
        "n": "上饶",
        "i": 3611,
        "p": 36,
        "y": "s"
    },
    {
        "n": "信州",
        "i": 361102,
        "p": 3611,
        "y": "x"
    },
    {
        "n": "广丰",
        "i": 361103,
        "p": 3611,
        "y": "g"
    },
    {
        "n": "广信",
        "i": 361104,
        "p": 3611,
        "y": "g"
    },
    {
        "n": "玉山",
        "i": 361123,
        "p": 3611,
        "y": "y"
    },
    {
        "n": "铅山",
        "i": 361124,
        "p": 3611,
        "y": "y"
    },
    {
        "n": "横峰",
        "i": 361125,
        "p": 3611,
        "y": "h"
    },
    {
        "n": "弋阳",
        "i": 361126,
        "p": 3611,
        "y": "y"
    },
    {
        "n": "余干",
        "i": 361127,
        "p": 3611,
        "y": "y"
    },
    {
        "n": "鄱阳",
        "i": 361128,
        "p": 3611,
        "y": "p"
    },
    {
        "n": "万年",
        "i": 361129,
        "p": 3611,
        "y": "w"
    },
    {
        "n": "婺源",
        "i": 361130,
        "p": 3611,
        "y": "w"
    },
    {
        "n": "德兴",
        "i": 361181,
        "p": 3611,
        "y": "d"
    },
    {
        "n": "山东",
        "i": 37,
        "p": 0,
        "y": "s"
    },
    {
        "n": "济南",
        "i": 3701,
        "p": 37,
        "y": "j"
    },
    {
        "n": "历下",
        "i": 370102,
        "p": 3701,
        "y": "l"
    },
    {
        "n": "市中",
        "i": 370103,
        "p": 3701,
        "y": "s"
    },
    {
        "n": "槐荫",
        "i": 370104,
        "p": 3701,
        "y": "h"
    },
    {
        "n": "天桥",
        "i": 370105,
        "p": 3701,
        "y": "t"
    },
    {
        "n": "历城",
        "i": 370112,
        "p": 3701,
        "y": "l"
    },
    {
        "n": "长清",
        "i": 370113,
        "p": 3701,
        "y": "c"
    },
    {
        "n": "章丘",
        "i": 370114,
        "p": 3701,
        "y": "z"
    },
    {
        "n": "济阳",
        "i": 370115,
        "p": 3701,
        "y": "j"
    },
    {
        "n": "莱芜",
        "i": 370116,
        "p": 3701,
        "y": "l"
    },
    {
        "n": "钢城",
        "i": 370117,
        "p": 3701,
        "y": "g"
    },
    {
        "n": "平阴",
        "i": 370124,
        "p": 3701,
        "y": "p"
    },
    {
        "n": "商河",
        "i": 370126,
        "p": 3701,
        "y": "s"
    },
    {
        "n": "青岛",
        "i": 3702,
        "p": 37,
        "y": "q"
    },
    {
        "n": "市南",
        "i": 370202,
        "p": 3702,
        "y": "s"
    },
    {
        "n": "市北",
        "i": 370203,
        "p": 3702,
        "y": "s"
    },
    {
        "n": "黄岛",
        "i": 370211,
        "p": 3702,
        "y": "h"
    },
    {
        "n": "崂山",
        "i": 370212,
        "p": 3702,
        "y": "l"
    },
    {
        "n": "李沧",
        "i": 370213,
        "p": 3702,
        "y": "l"
    },
    {
        "n": "城阳",
        "i": 370214,
        "p": 3702,
        "y": "c"
    },
    {
        "n": "即墨",
        "i": 370215,
        "p": 3702,
        "y": "j"
    },
    {
        "n": "胶州",
        "i": 370281,
        "p": 3702,
        "y": "j"
    },
    {
        "n": "平度",
        "i": 370283,
        "p": 3702,
        "y": "p"
    },
    {
        "n": "莱西",
        "i": 370285,
        "p": 3702,
        "y": "l"
    },
    {
        "n": "淄博",
        "i": 3703,
        "p": 37,
        "y": "z"
    },
    {
        "n": "淄川",
        "i": 370302,
        "p": 3703,
        "y": "z"
    },
    {
        "n": "张店",
        "i": 370303,
        "p": 3703,
        "y": "z"
    },
    {
        "n": "博山",
        "i": 370304,
        "p": 3703,
        "y": "b"
    },
    {
        "n": "临淄",
        "i": 370305,
        "p": 3703,
        "y": "l"
    },
    {
        "n": "周村",
        "i": 370306,
        "p": 3703,
        "y": "z"
    },
    {
        "n": "桓台",
        "i": 370321,
        "p": 3703,
        "y": "h"
    },
    {
        "n": "高青",
        "i": 370322,
        "p": 3703,
        "y": "g"
    },
    {
        "n": "沂源",
        "i": 370323,
        "p": 3703,
        "y": "y"
    },
    {
        "n": "枣庄",
        "i": 3704,
        "p": 37,
        "y": "z"
    },
    {
        "n": "市中",
        "i": 370402,
        "p": 3704,
        "y": "s"
    },
    {
        "n": "薛城",
        "i": 370403,
        "p": 3704,
        "y": "x"
    },
    {
        "n": "峄城",
        "i": 370404,
        "p": 3704,
        "y": "y"
    },
    {
        "n": "台儿庄",
        "i": 370405,
        "p": 3704,
        "y": "t"
    },
    {
        "n": "山亭",
        "i": 370406,
        "p": 3704,
        "y": "s"
    },
    {
        "n": "滕州",
        "i": 370481,
        "p": 3704,
        "y": "t"
    },
    {
        "n": "东营",
        "i": 3705,
        "p": 37,
        "y": "d"
    },
    {
        "n": "东营区",
        "i": 370502,
        "p": 3705,
        "y": "d"
    },
    {
        "n": "河口",
        "i": 370503,
        "p": 3705,
        "y": "h"
    },
    {
        "n": "垦利",
        "i": 370505,
        "p": 3705,
        "y": "k"
    },
    {
        "n": "利津",
        "i": 370522,
        "p": 3705,
        "y": "l"
    },
    {
        "n": "广饶",
        "i": 370523,
        "p": 3705,
        "y": "g"
    },
    {
        "n": "烟台",
        "i": 3706,
        "p": 37,
        "y": "y"
    },
    {
        "n": "芝罘",
        "i": 370602,
        "p": 3706,
        "y": "z"
    },
    {
        "n": "福山",
        "i": 370611,
        "p": 3706,
        "y": "f"
    },
    {
        "n": "牟平",
        "i": 370612,
        "p": 3706,
        "y": "m"
    },
    {
        "n": "莱山",
        "i": 370613,
        "p": 3706,
        "y": "l"
    },
    {
        "n": "蓬莱",
        "i": 370614,
        "p": 3706,
        "y": "p"
    },
    {
        "n": "龙口",
        "i": 370681,
        "p": 3706,
        "y": "l"
    },
    {
        "n": "莱阳",
        "i": 370682,
        "p": 3706,
        "y": "l"
    },
    {
        "n": "莱州",
        "i": 370683,
        "p": 3706,
        "y": "l"
    },
    {
        "n": "招远",
        "i": 370685,
        "p": 3706,
        "y": "z"
    },
    {
        "n": "栖霞",
        "i": 370686,
        "p": 3706,
        "y": "q"
    },
    {
        "n": "海阳",
        "i": 370687,
        "p": 3706,
        "y": "h"
    },
    {
        "n": "潍坊",
        "i": 3707,
        "p": 37,
        "y": "w"
    },
    {
        "n": "潍城",
        "i": 370702,
        "p": 3707,
        "y": "w"
    },
    {
        "n": "寒亭",
        "i": 370703,
        "p": 3707,
        "y": "h"
    },
    {
        "n": "坊子",
        "i": 370704,
        "p": 3707,
        "y": "f"
    },
    {
        "n": "奎文",
        "i": 370705,
        "p": 3707,
        "y": "k"
    },
    {
        "n": "临朐",
        "i": 370724,
        "p": 3707,
        "y": "l"
    },
    {
        "n": "昌乐",
        "i": 370725,
        "p": 3707,
        "y": "c"
    },
    {
        "n": "青州",
        "i": 370781,
        "p": 3707,
        "y": "q"
    },
    {
        "n": "诸城",
        "i": 370782,
        "p": 3707,
        "y": "z"
    },
    {
        "n": "寿光",
        "i": 370783,
        "p": 3707,
        "y": "s"
    },
    {
        "n": "安丘",
        "i": 370784,
        "p": 3707,
        "y": "a"
    },
    {
        "n": "高密",
        "i": 370785,
        "p": 3707,
        "y": "g"
    },
    {
        "n": "昌邑",
        "i": 370786,
        "p": 3707,
        "y": "c"
    },
    {
        "n": "济宁",
        "i": 3708,
        "p": 37,
        "y": "j"
    },
    {
        "n": "任城",
        "i": 370811,
        "p": 3708,
        "y": "r"
    },
    {
        "n": "兖州",
        "i": 370812,
        "p": 3708,
        "y": "y"
    },
    {
        "n": "微山",
        "i": 370826,
        "p": 3708,
        "y": "w"
    },
    {
        "n": "鱼台",
        "i": 370827,
        "p": 3708,
        "y": "y"
    },
    {
        "n": "金乡",
        "i": 370828,
        "p": 3708,
        "y": "j"
    },
    {
        "n": "嘉祥",
        "i": 370829,
        "p": 3708,
        "y": "j"
    },
    {
        "n": "汶上",
        "i": 370830,
        "p": 3708,
        "y": "w"
    },
    {
        "n": "泗水",
        "i": 370831,
        "p": 3708,
        "y": "s"
    },
    {
        "n": "梁山",
        "i": 370832,
        "p": 3708,
        "y": "l"
    },
    {
        "n": "曲阜",
        "i": 370881,
        "p": 3708,
        "y": "q"
    },
    {
        "n": "邹城",
        "i": 370883,
        "p": 3708,
        "y": "z"
    },
    {
        "n": "泰安",
        "i": 3709,
        "p": 37,
        "y": "t"
    },
    {
        "n": "泰山",
        "i": 370902,
        "p": 3709,
        "y": "t"
    },
    {
        "n": "岱岳",
        "i": 370911,
        "p": 3709,
        "y": "d"
    },
    {
        "n": "宁阳",
        "i": 370921,
        "p": 3709,
        "y": "n"
    },
    {
        "n": "东平",
        "i": 370923,
        "p": 3709,
        "y": "d"
    },
    {
        "n": "新泰",
        "i": 370982,
        "p": 3709,
        "y": "x"
    },
    {
        "n": "肥城",
        "i": 370983,
        "p": 3709,
        "y": "f"
    },
    {
        "n": "威海",
        "i": 3710,
        "p": 37,
        "y": "w"
    },
    {
        "n": "环翠",
        "i": 371002,
        "p": 3710,
        "y": "h"
    },
    {
        "n": "文登",
        "i": 371003,
        "p": 3710,
        "y": "w"
    },
    {
        "n": "荣成",
        "i": 371082,
        "p": 3710,
        "y": "r"
    },
    {
        "n": "乳山",
        "i": 371083,
        "p": 3710,
        "y": "r"
    },
    {
        "n": "日照",
        "i": 3711,
        "p": 37,
        "y": "r"
    },
    {
        "n": "东港",
        "i": 371102,
        "p": 3711,
        "y": "d"
    },
    {
        "n": "岚山",
        "i": 371103,
        "p": 3711,
        "y": "l"
    },
    {
        "n": "五莲",
        "i": 371121,
        "p": 3711,
        "y": "w"
    },
    {
        "n": "莒县",
        "i": 371122,
        "p": 3711,
        "y": "j"
    },
    {
        "n": "临沂",
        "i": 3713,
        "p": 37,
        "y": "l"
    },
    {
        "n": "兰山",
        "i": 371302,
        "p": 3713,
        "y": "l"
    },
    {
        "n": "罗庄",
        "i": 371311,
        "p": 3713,
        "y": "l"
    },
    {
        "n": "河东",
        "i": 371312,
        "p": 3713,
        "y": "h"
    },
    {
        "n": "沂南",
        "i": 371321,
        "p": 3713,
        "y": "y"
    },
    {
        "n": "郯城",
        "i": 371322,
        "p": 3713,
        "y": "t"
    },
    {
        "n": "沂水",
        "i": 371323,
        "p": 3713,
        "y": "y"
    },
    {
        "n": "兰陵",
        "i": 371324,
        "p": 3713,
        "y": "l"
    },
    {
        "n": "费县",
        "i": 371325,
        "p": 3713,
        "y": "f"
    },
    {
        "n": "平邑",
        "i": 371326,
        "p": 3713,
        "y": "p"
    },
    {
        "n": "莒南",
        "i": 371327,
        "p": 3713,
        "y": "j"
    },
    {
        "n": "蒙阴",
        "i": 371328,
        "p": 3713,
        "y": "m"
    },
    {
        "n": "临沭",
        "i": 371329,
        "p": 3713,
        "y": "l"
    },
    {
        "n": "德州",
        "i": 3714,
        "p": 37,
        "y": "d"
    },
    {
        "n": "德城",
        "i": 371402,
        "p": 3714,
        "y": "d"
    },
    {
        "n": "陵城",
        "i": 371403,
        "p": 3714,
        "y": "l"
    },
    {
        "n": "宁津",
        "i": 371422,
        "p": 3714,
        "y": "n"
    },
    {
        "n": "庆云",
        "i": 371423,
        "p": 3714,
        "y": "q"
    },
    {
        "n": "临邑",
        "i": 371424,
        "p": 3714,
        "y": "l"
    },
    {
        "n": "齐河",
        "i": 371425,
        "p": 3714,
        "y": "q"
    },
    {
        "n": "平原",
        "i": 371426,
        "p": 3714,
        "y": "p"
    },
    {
        "n": "夏津",
        "i": 371427,
        "p": 3714,
        "y": "x"
    },
    {
        "n": "武城",
        "i": 371428,
        "p": 3714,
        "y": "w"
    },
    {
        "n": "乐陵",
        "i": 371481,
        "p": 3714,
        "y": "l"
    },
    {
        "n": "禹城",
        "i": 371482,
        "p": 3714,
        "y": "y"
    },
    {
        "n": "聊城",
        "i": 3715,
        "p": 37,
        "y": "l"
    },
    {
        "n": "东昌府",
        "i": 371502,
        "p": 3715,
        "y": "d"
    },
    {
        "n": "茌平",
        "i": 371503,
        "p": 3715,
        "y": "c"
    },
    {
        "n": "阳谷",
        "i": 371521,
        "p": 3715,
        "y": "y"
    },
    {
        "n": "莘县",
        "i": 371522,
        "p": 3715,
        "y": "s"
    },
    {
        "n": "东阿",
        "i": 371524,
        "p": 3715,
        "y": "d"
    },
    {
        "n": "冠县",
        "i": 371525,
        "p": 3715,
        "y": "g"
    },
    {
        "n": "高唐",
        "i": 371526,
        "p": 3715,
        "y": "g"
    },
    {
        "n": "临清",
        "i": 371581,
        "p": 3715,
        "y": "l"
    },
    {
        "n": "滨州",
        "i": 3716,
        "p": 37,
        "y": "b"
    },
    {
        "n": "滨城",
        "i": 371602,
        "p": 3716,
        "y": "b"
    },
    {
        "n": "沾化",
        "i": 371603,
        "p": 3716,
        "y": "z"
    },
    {
        "n": "惠民",
        "i": 371621,
        "p": 3716,
        "y": "h"
    },
    {
        "n": "阳信",
        "i": 371622,
        "p": 3716,
        "y": "y"
    },
    {
        "n": "无棣",
        "i": 371623,
        "p": 3716,
        "y": "w"
    },
    {
        "n": "博兴",
        "i": 371625,
        "p": 3716,
        "y": "b"
    },
    {
        "n": "邹平",
        "i": 371681,
        "p": 3716,
        "y": "z"
    },
    {
        "n": "菏泽",
        "i": 3717,
        "p": 37,
        "y": "h"
    },
    {
        "n": "牡丹",
        "i": 371702,
        "p": 3717,
        "y": "m"
    },
    {
        "n": "定陶",
        "i": 371703,
        "p": 3717,
        "y": "d"
    },
    {
        "n": "曹县",
        "i": 371721,
        "p": 3717,
        "y": "c"
    },
    {
        "n": "单县",
        "i": 371722,
        "p": 3717,
        "y": "s"
    },
    {
        "n": "成武",
        "i": 371723,
        "p": 3717,
        "y": "c"
    },
    {
        "n": "巨野",
        "i": 371724,
        "p": 3717,
        "y": "j"
    },
    {
        "n": "郓城",
        "i": 371725,
        "p": 3717,
        "y": "y"
    },
    {
        "n": "鄄城",
        "i": 371726,
        "p": 3717,
        "y": "j"
    },
    {
        "n": "东明",
        "i": 371728,
        "p": 3717,
        "y": "d"
    },
    {
        "n": "河南",
        "i": 41,
        "p": 0,
        "y": "h"
    },
    {
        "n": "郑州",
        "i": 4101,
        "p": 41,
        "y": "z"
    },
    {
        "n": "中原",
        "i": 410102,
        "p": 4101,
        "y": "z"
    },
    {
        "n": "二七",
        "i": 410103,
        "p": 4101,
        "y": "e"
    },
    {
        "n": "管城回族区",
        "i": 410104,
        "p": 4101,
        "y": "g"
    },
    {
        "n": "金水",
        "i": 410105,
        "p": 4101,
        "y": "j"
    },
    {
        "n": "上街",
        "i": 410106,
        "p": 4101,
        "y": "s"
    },
    {
        "n": "惠济",
        "i": 410108,
        "p": 4101,
        "y": "h"
    },
    {
        "n": "中牟",
        "i": 410122,
        "p": 4101,
        "y": "z"
    },
    {
        "n": "巩义",
        "i": 410181,
        "p": 4101,
        "y": "g"
    },
    {
        "n": "荥阳",
        "i": 410182,
        "p": 4101,
        "y": "x"
    },
    {
        "n": "新密",
        "i": 410183,
        "p": 4101,
        "y": "x"
    },
    {
        "n": "新郑",
        "i": 410184,
        "p": 4101,
        "y": "x"
    },
    {
        "n": "登封",
        "i": 410185,
        "p": 4101,
        "y": "d"
    },
    {
        "n": "开封",
        "i": 4102,
        "p": 41,
        "y": "k"
    },
    {
        "n": "龙亭",
        "i": 410202,
        "p": 4102,
        "y": "l"
    },
    {
        "n": "顺河回族区",
        "i": 410203,
        "p": 4102,
        "y": "s"
    },
    {
        "n": "鼓楼",
        "i": 410204,
        "p": 4102,
        "y": "g"
    },
    {
        "n": "禹王台",
        "i": 410205,
        "p": 4102,
        "y": "y"
    },
    {
        "n": "祥符",
        "i": 410212,
        "p": 4102,
        "y": "x"
    },
    {
        "n": "杞县",
        "i": 410221,
        "p": 4102,
        "y": "q"
    },
    {
        "n": "通许",
        "i": 410222,
        "p": 4102,
        "y": "t"
    },
    {
        "n": "尉氏",
        "i": 410223,
        "p": 4102,
        "y": "w"
    },
    {
        "n": "兰考",
        "i": 410225,
        "p": 4102,
        "y": "l"
    },
    {
        "n": "洛阳",
        "i": 4103,
        "p": 41,
        "y": "l"
    },
    {
        "n": "老城",
        "i": 410302,
        "p": 4103,
        "y": "l"
    },
    {
        "n": "西工",
        "i": 410303,
        "p": 4103,
        "y": "x"
    },
    {
        "n": "瀍河回族区",
        "i": 410304,
        "p": 4103,
        "y": "c"
    },
    {
        "n": "涧西",
        "i": 410305,
        "p": 4103,
        "y": "j"
    },
    {
        "n": "吉利",
        "i": 410306,
        "p": 4103,
        "y": "j"
    },
    {
        "n": "洛龙",
        "i": 410311,
        "p": 4103,
        "y": "l"
    },
    {
        "n": "孟津",
        "i": 410322,
        "p": 4103,
        "y": "m"
    },
    {
        "n": "新安",
        "i": 410323,
        "p": 4103,
        "y": "x"
    },
    {
        "n": "栾川",
        "i": 410324,
        "p": 4103,
        "y": "l"
    },
    {
        "n": "嵩县",
        "i": 410325,
        "p": 4103,
        "y": "s"
    },
    {
        "n": "汝阳",
        "i": 410326,
        "p": 4103,
        "y": "r"
    },
    {
        "n": "宜阳",
        "i": 410327,
        "p": 4103,
        "y": "y"
    },
    {
        "n": "洛宁",
        "i": 410328,
        "p": 4103,
        "y": "l"
    },
    {
        "n": "伊川",
        "i": 410329,
        "p": 4103,
        "y": "y"
    },
    {
        "n": "偃师",
        "i": 410381,
        "p": 4103,
        "y": "y"
    },
    {
        "n": "平顶山",
        "i": 4104,
        "p": 41,
        "y": "p"
    },
    {
        "n": "新华",
        "i": 410402,
        "p": 4104,
        "y": "x"
    },
    {
        "n": "卫东",
        "i": 410403,
        "p": 4104,
        "y": "w"
    },
    {
        "n": "石龙",
        "i": 410404,
        "p": 4104,
        "y": "s"
    },
    {
        "n": "湛河",
        "i": 410411,
        "p": 4104,
        "y": "z"
    },
    {
        "n": "宝丰",
        "i": 410421,
        "p": 4104,
        "y": "b"
    },
    {
        "n": "叶县",
        "i": 410422,
        "p": 4104,
        "y": "y"
    },
    {
        "n": "鲁山",
        "i": 410423,
        "p": 4104,
        "y": "l"
    },
    {
        "n": "郏县",
        "i": 410425,
        "p": 4104,
        "y": "j"
    },
    {
        "n": "舞钢",
        "i": 410481,
        "p": 4104,
        "y": "w"
    },
    {
        "n": "汝州",
        "i": 410482,
        "p": 4104,
        "y": "r"
    },
    {
        "n": "安阳",
        "i": 4105,
        "p": 41,
        "y": "a"
    },
    {
        "n": "文峰",
        "i": 410502,
        "p": 4105,
        "y": "w"
    },
    {
        "n": "北关",
        "i": 410503,
        "p": 4105,
        "y": "b"
    },
    {
        "n": "殷都",
        "i": 410505,
        "p": 4105,
        "y": "y"
    },
    {
        "n": "龙安",
        "i": 410506,
        "p": 4105,
        "y": "l"
    },
    {
        "n": "安阳县",
        "i": 410522,
        "p": 4105,
        "y": "a"
    },
    {
        "n": "汤阴",
        "i": 410523,
        "p": 4105,
        "y": "t"
    },
    {
        "n": "滑县",
        "i": 410526,
        "p": 4105,
        "y": "h"
    },
    {
        "n": "内黄",
        "i": 410527,
        "p": 4105,
        "y": "n"
    },
    {
        "n": "林州",
        "i": 410581,
        "p": 4105,
        "y": "l"
    },
    {
        "n": "鹤壁",
        "i": 4106,
        "p": 41,
        "y": "h"
    },
    {
        "n": "鹤山",
        "i": 410602,
        "p": 4106,
        "y": "h"
    },
    {
        "n": "山城",
        "i": 410603,
        "p": 4106,
        "y": "s"
    },
    {
        "n": "淇滨",
        "i": 410611,
        "p": 4106,
        "y": "q"
    },
    {
        "n": "浚县",
        "i": 410621,
        "p": 4106,
        "y": "x"
    },
    {
        "n": "淇县",
        "i": 410622,
        "p": 4106,
        "y": "q"
    },
    {
        "n": "新乡",
        "i": 4107,
        "p": 41,
        "y": "x"
    },
    {
        "n": "红旗",
        "i": 410702,
        "p": 4107,
        "y": "h"
    },
    {
        "n": "卫滨",
        "i": 410703,
        "p": 4107,
        "y": "w"
    },
    {
        "n": "凤泉",
        "i": 410704,
        "p": 4107,
        "y": "f"
    },
    {
        "n": "牧野",
        "i": 410711,
        "p": 4107,
        "y": "m"
    },
    {
        "n": "新乡县",
        "i": 410721,
        "p": 4107,
        "y": "x"
    },
    {
        "n": "获嘉",
        "i": 410724,
        "p": 4107,
        "y": "h"
    },
    {
        "n": "原阳",
        "i": 410725,
        "p": 4107,
        "y": "y"
    },
    {
        "n": "延津",
        "i": 410726,
        "p": 4107,
        "y": "y"
    },
    {
        "n": "封丘",
        "i": 410727,
        "p": 4107,
        "y": "f"
    },
    {
        "n": "卫辉",
        "i": 410781,
        "p": 4107,
        "y": "w"
    },
    {
        "n": "辉县",
        "i": 410782,
        "p": 4107,
        "y": "h"
    },
    {
        "n": "长垣",
        "i": 410783,
        "p": 4107,
        "y": "c"
    },
    {
        "n": "焦作",
        "i": 4108,
        "p": 41,
        "y": "j"
    },
    {
        "n": "解放",
        "i": 410802,
        "p": 4108,
        "y": "j"
    },
    {
        "n": "中站",
        "i": 410803,
        "p": 4108,
        "y": "z"
    },
    {
        "n": "马村",
        "i": 410804,
        "p": 4108,
        "y": "m"
    },
    {
        "n": "山阳",
        "i": 410811,
        "p": 4108,
        "y": "s"
    },
    {
        "n": "修武",
        "i": 410821,
        "p": 4108,
        "y": "x"
    },
    {
        "n": "博爱",
        "i": 410822,
        "p": 4108,
        "y": "b"
    },
    {
        "n": "武陟",
        "i": 410823,
        "p": 4108,
        "y": "w"
    },
    {
        "n": "温县",
        "i": 410825,
        "p": 4108,
        "y": "w"
    },
    {
        "n": "沁阳",
        "i": 410882,
        "p": 4108,
        "y": "q"
    },
    {
        "n": "孟州",
        "i": 410883,
        "p": 4108,
        "y": "m"
    },
    {
        "n": "濮阳",
        "i": 4109,
        "p": 41,
        "y": "p"
    },
    {
        "n": "华龙",
        "i": 410902,
        "p": 4109,
        "y": "h"
    },
    {
        "n": "清丰",
        "i": 410922,
        "p": 4109,
        "y": "q"
    },
    {
        "n": "南乐",
        "i": 410923,
        "p": 4109,
        "y": "n"
    },
    {
        "n": "范县",
        "i": 410926,
        "p": 4109,
        "y": "f"
    },
    {
        "n": "台前",
        "i": 410927,
        "p": 4109,
        "y": "t"
    },
    {
        "n": "濮阳县",
        "i": 410928,
        "p": 4109,
        "y": "p"
    },
    {
        "n": "许昌",
        "i": 4110,
        "p": 41,
        "y": "x"
    },
    {
        "n": "魏都",
        "i": 411002,
        "p": 4110,
        "y": "w"
    },
    {
        "n": "建安",
        "i": 411003,
        "p": 4110,
        "y": "j"
    },
    {
        "n": "鄢陵",
        "i": 411024,
        "p": 4110,
        "y": "y"
    },
    {
        "n": "襄城",
        "i": 411025,
        "p": 4110,
        "y": "x"
    },
    {
        "n": "禹州",
        "i": 411081,
        "p": 4110,
        "y": "y"
    },
    {
        "n": "长葛",
        "i": 411082,
        "p": 4110,
        "y": "c"
    },
    {
        "n": "漯河",
        "i": 4111,
        "p": 41,
        "y": "l"
    },
    {
        "n": "源汇",
        "i": 411102,
        "p": 4111,
        "y": "y"
    },
    {
        "n": "郾城",
        "i": 411103,
        "p": 4111,
        "y": "y"
    },
    {
        "n": "召陵",
        "i": 411104,
        "p": 4111,
        "y": "s"
    },
    {
        "n": "舞阳",
        "i": 411121,
        "p": 4111,
        "y": "w"
    },
    {
        "n": "临颍",
        "i": 411122,
        "p": 4111,
        "y": "l"
    },
    {
        "n": "三门峡",
        "i": 4112,
        "p": 41,
        "y": "s"
    },
    {
        "n": "湖滨",
        "i": 411202,
        "p": 4112,
        "y": "h"
    },
    {
        "n": "陕州",
        "i": 411203,
        "p": 4112,
        "y": "s"
    },
    {
        "n": "渑池",
        "i": 411221,
        "p": 4112,
        "y": "m"
    },
    {
        "n": "卢氏",
        "i": 411224,
        "p": 4112,
        "y": "l"
    },
    {
        "n": "义马",
        "i": 411281,
        "p": 4112,
        "y": "y"
    },
    {
        "n": "灵宝",
        "i": 411282,
        "p": 4112,
        "y": "l"
    },
    {
        "n": "南阳",
        "i": 4113,
        "p": 41,
        "y": "n"
    },
    {
        "n": "宛城",
        "i": 411302,
        "p": 4113,
        "y": "w"
    },
    {
        "n": "卧龙",
        "i": 411303,
        "p": 4113,
        "y": "w"
    },
    {
        "n": "南召",
        "i": 411321,
        "p": 4113,
        "y": "n"
    },
    {
        "n": "方城",
        "i": 411322,
        "p": 4113,
        "y": "f"
    },
    {
        "n": "西峡",
        "i": 411323,
        "p": 4113,
        "y": "x"
    },
    {
        "n": "镇平",
        "i": 411324,
        "p": 4113,
        "y": "z"
    },
    {
        "n": "内乡",
        "i": 411325,
        "p": 4113,
        "y": "n"
    },
    {
        "n": "淅川",
        "i": 411326,
        "p": 4113,
        "y": "x"
    },
    {
        "n": "社旗",
        "i": 411327,
        "p": 4113,
        "y": "s"
    },
    {
        "n": "唐河",
        "i": 411328,
        "p": 4113,
        "y": "t"
    },
    {
        "n": "新野",
        "i": 411329,
        "p": 4113,
        "y": "x"
    },
    {
        "n": "桐柏",
        "i": 411330,
        "p": 4113,
        "y": "t"
    },
    {
        "n": "邓州",
        "i": 411381,
        "p": 4113,
        "y": "d"
    },
    {
        "n": "商丘",
        "i": 4114,
        "p": 41,
        "y": "s"
    },
    {
        "n": "梁园",
        "i": 411402,
        "p": 4114,
        "y": "l"
    },
    {
        "n": "睢阳",
        "i": 411403,
        "p": 4114,
        "y": "s"
    },
    {
        "n": "民权",
        "i": 411421,
        "p": 4114,
        "y": "m"
    },
    {
        "n": "睢县",
        "i": 411422,
        "p": 4114,
        "y": "s"
    },
    {
        "n": "宁陵",
        "i": 411423,
        "p": 4114,
        "y": "n"
    },
    {
        "n": "柘城",
        "i": 411424,
        "p": 4114,
        "y": "z"
    },
    {
        "n": "虞城",
        "i": 411425,
        "p": 4114,
        "y": "y"
    },
    {
        "n": "夏邑",
        "i": 411426,
        "p": 4114,
        "y": "x"
    },
    {
        "n": "永城",
        "i": 411481,
        "p": 4114,
        "y": "y"
    },
    {
        "n": "信阳",
        "i": 4115,
        "p": 41,
        "y": "x"
    },
    {
        "n": "浉河",
        "i": 411502,
        "p": 4115,
        "y": "s"
    },
    {
        "n": "平桥",
        "i": 411503,
        "p": 4115,
        "y": "p"
    },
    {
        "n": "罗山",
        "i": 411521,
        "p": 4115,
        "y": "l"
    },
    {
        "n": "光山",
        "i": 411522,
        "p": 4115,
        "y": "g"
    },
    {
        "n": "新县",
        "i": 411523,
        "p": 4115,
        "y": "x"
    },
    {
        "n": "商城",
        "i": 411524,
        "p": 4115,
        "y": "s"
    },
    {
        "n": "固始",
        "i": 411525,
        "p": 4115,
        "y": "g"
    },
    {
        "n": "潢川",
        "i": 411526,
        "p": 4115,
        "y": "h"
    },
    {
        "n": "淮滨",
        "i": 411527,
        "p": 4115,
        "y": "h"
    },
    {
        "n": "息县",
        "i": 411528,
        "p": 4115,
        "y": "x"
    },
    {
        "n": "周口",
        "i": 4116,
        "p": 41,
        "y": "z"
    },
    {
        "n": "川汇",
        "i": 411602,
        "p": 4116,
        "y": "c"
    },
    {
        "n": "淮阳",
        "i": 411603,
        "p": 4116,
        "y": "h"
    },
    {
        "n": "扶沟",
        "i": 411621,
        "p": 4116,
        "y": "f"
    },
    {
        "n": "西华",
        "i": 411622,
        "p": 4116,
        "y": "x"
    },
    {
        "n": "商水",
        "i": 411623,
        "p": 4116,
        "y": "s"
    },
    {
        "n": "沈丘",
        "i": 411624,
        "p": 4116,
        "y": "s"
    },
    {
        "n": "郸城",
        "i": 411625,
        "p": 4116,
        "y": "d"
    },
    {
        "n": "太康",
        "i": 411627,
        "p": 4116,
        "y": "t"
    },
    {
        "n": "鹿邑",
        "i": 411628,
        "p": 4116,
        "y": "l"
    },
    {
        "n": "项城",
        "i": 411681,
        "p": 4116,
        "y": "x"
    },
    {
        "n": "驻马店",
        "i": 4117,
        "p": 41,
        "y": "z"
    },
    {
        "n": "驿城",
        "i": 411702,
        "p": 4117,
        "y": "y"
    },
    {
        "n": "西平",
        "i": 411721,
        "p": 4117,
        "y": "x"
    },
    {
        "n": "上蔡",
        "i": 411722,
        "p": 4117,
        "y": "s"
    },
    {
        "n": "平舆",
        "i": 411723,
        "p": 4117,
        "y": "p"
    },
    {
        "n": "正阳",
        "i": 411724,
        "p": 4117,
        "y": "z"
    },
    {
        "n": "确山",
        "i": 411725,
        "p": 4117,
        "y": "q"
    },
    {
        "n": "泌阳",
        "i": 411726,
        "p": 4117,
        "y": "b"
    },
    {
        "n": "汝南",
        "i": 411727,
        "p": 4117,
        "y": "r"
    },
    {
        "n": "遂平",
        "i": 411728,
        "p": 4117,
        "y": "s"
    },
    {
        "n": "新蔡",
        "i": 411729,
        "p": 4117,
        "y": "x"
    },
    {
        "n": "济源",
        "i": 419001000,
        "p": 41,
        "y": "j"
    },
    {
        "n": "沁园",
        "i": 419001001,
        "p": 419001000,
        "y": "q"
    },
    {
        "n": "济水",
        "i": 419001002,
        "p": 419001000,
        "y": "j"
    },
    {
        "n": "北海",
        "i": 419001003,
        "p": 419001000,
        "y": "b"
    },
    {
        "n": "天坛",
        "i": 419001004,
        "p": 419001000,
        "y": "t"
    },
    {
        "n": "玉泉",
        "i": 419001005,
        "p": 419001000,
        "y": "y"
    },
    {
        "n": "克井",
        "i": 419001100,
        "p": 419001000,
        "y": "k"
    },
    {
        "n": "五龙口",
        "i": 419001101,
        "p": 419001000,
        "y": "w"
    },
    {
        "n": "轵城",
        "i": 419001102,
        "p": 419001000,
        "y": "z"
    },
    {
        "n": "承留",
        "i": 419001103,
        "p": 419001000,
        "y": "c"
    },
    {
        "n": "邵原",
        "i": 419001104,
        "p": 419001000,
        "y": "s"
    },
    {
        "n": "坡头",
        "i": 419001105,
        "p": 419001000,
        "y": "p"
    },
    {
        "n": "梨林",
        "i": 419001106,
        "p": 419001000,
        "y": "l"
    },
    {
        "n": "大峪",
        "i": 419001107,
        "p": 419001000,
        "y": "d"
    },
    {
        "n": "思礼",
        "i": 419001108,
        "p": 419001000,
        "y": "s"
    },
    {
        "n": "王屋",
        "i": 419001109,
        "p": 419001000,
        "y": "w"
    },
    {
        "n": "下冶",
        "i": 419001110,
        "p": 419001000,
        "y": "x"
    },
    {
        "n": "湖北",
        "i": 42,
        "p": 0,
        "y": "h"
    },
    {
        "n": "武汉",
        "i": 4201,
        "p": 42,
        "y": "w"
    },
    {
        "n": "江岸",
        "i": 420102,
        "p": 4201,
        "y": "j"
    },
    {
        "n": "江汉",
        "i": 420103,
        "p": 4201,
        "y": "j"
    },
    {
        "n": "硚口",
        "i": 420104,
        "p": 4201,
        "y": "q"
    },
    {
        "n": "汉阳",
        "i": 420105,
        "p": 4201,
        "y": "h"
    },
    {
        "n": "武昌",
        "i": 420106,
        "p": 4201,
        "y": "w"
    },
    {
        "n": "青山",
        "i": 420107,
        "p": 4201,
        "y": "q"
    },
    {
        "n": "洪山",
        "i": 420111,
        "p": 4201,
        "y": "h"
    },
    {
        "n": "东西湖",
        "i": 420112,
        "p": 4201,
        "y": "d"
    },
    {
        "n": "汉南",
        "i": 420113,
        "p": 4201,
        "y": "h"
    },
    {
        "n": "蔡甸",
        "i": 420114,
        "p": 4201,
        "y": "c"
    },
    {
        "n": "江夏",
        "i": 420115,
        "p": 4201,
        "y": "j"
    },
    {
        "n": "黄陂",
        "i": 420116,
        "p": 4201,
        "y": "h"
    },
    {
        "n": "新洲",
        "i": 420117,
        "p": 4201,
        "y": "x"
    },
    {
        "n": "黄石",
        "i": 4202,
        "p": 42,
        "y": "h"
    },
    {
        "n": "黄石港",
        "i": 420202,
        "p": 4202,
        "y": "h"
    },
    {
        "n": "西塞山",
        "i": 420203,
        "p": 4202,
        "y": "x"
    },
    {
        "n": "下陆",
        "i": 420204,
        "p": 4202,
        "y": "x"
    },
    {
        "n": "铁山",
        "i": 420205,
        "p": 4202,
        "y": "t"
    },
    {
        "n": "阳新",
        "i": 420222,
        "p": 4202,
        "y": "y"
    },
    {
        "n": "大冶",
        "i": 420281,
        "p": 4202,
        "y": "d"
    },
    {
        "n": "十堰",
        "i": 4203,
        "p": 42,
        "y": "s"
    },
    {
        "n": "茅箭",
        "i": 420302,
        "p": 4203,
        "y": "m"
    },
    {
        "n": "张湾",
        "i": 420303,
        "p": 4203,
        "y": "z"
    },
    {
        "n": "郧阳",
        "i": 420304,
        "p": 4203,
        "y": "y"
    },
    {
        "n": "郧西",
        "i": 420322,
        "p": 4203,
        "y": "y"
    },
    {
        "n": "竹山",
        "i": 420323,
        "p": 4203,
        "y": "z"
    },
    {
        "n": "竹溪",
        "i": 420324,
        "p": 4203,
        "y": "z"
    },
    {
        "n": "房县",
        "i": 420325,
        "p": 4203,
        "y": "f"
    },
    {
        "n": "丹江口",
        "i": 420381,
        "p": 4203,
        "y": "d"
    },
    {
        "n": "宜昌",
        "i": 4205,
        "p": 42,
        "y": "y"
    },
    {
        "n": "西陵",
        "i": 420502,
        "p": 4205,
        "y": "x"
    },
    {
        "n": "伍家岗",
        "i": 420503,
        "p": 4205,
        "y": "w"
    },
    {
        "n": "点军",
        "i": 420504,
        "p": 4205,
        "y": "d"
    },
    {
        "n": "猇亭",
        "i": 420505,
        "p": 4205,
        "y": "x"
    },
    {
        "n": "夷陵",
        "i": 420506,
        "p": 4205,
        "y": "y"
    },
    {
        "n": "远安",
        "i": 420525,
        "p": 4205,
        "y": "y"
    },
    {
        "n": "兴山",
        "i": 420526,
        "p": 4205,
        "y": "x"
    },
    {
        "n": "秭归",
        "i": 420527,
        "p": 4205,
        "y": "z"
    },
    {
        "n": "长阳",
        "i": 420528,
        "p": 4205,
        "y": "c"
    },
    {
        "n": "五峰",
        "i": 420529,
        "p": 4205,
        "y": "w"
    },
    {
        "n": "宜都",
        "i": 420581,
        "p": 4205,
        "y": "y"
    },
    {
        "n": "当阳",
        "i": 420582,
        "p": 4205,
        "y": "d"
    },
    {
        "n": "枝江",
        "i": 420583,
        "p": 4205,
        "y": "z"
    },
    {
        "n": "襄阳",
        "i": 4206,
        "p": 42,
        "y": "x"
    },
    {
        "n": "襄城",
        "i": 420602,
        "p": 4206,
        "y": "x"
    },
    {
        "n": "樊城",
        "i": 420606,
        "p": 4206,
        "y": "f"
    },
    {
        "n": "襄州",
        "i": 420607,
        "p": 4206,
        "y": "x"
    },
    {
        "n": "南漳",
        "i": 420624,
        "p": 4206,
        "y": "n"
    },
    {
        "n": "谷城",
        "i": 420625,
        "p": 4206,
        "y": "g"
    },
    {
        "n": "保康",
        "i": 420626,
        "p": 4206,
        "y": "b"
    },
    {
        "n": "老河口",
        "i": 420682,
        "p": 4206,
        "y": "l"
    },
    {
        "n": "枣阳",
        "i": 420683,
        "p": 4206,
        "y": "z"
    },
    {
        "n": "宜城",
        "i": 420684,
        "p": 4206,
        "y": "y"
    },
    {
        "n": "鄂州",
        "i": 4207,
        "p": 42,
        "y": "e"
    },
    {
        "n": "梁子湖",
        "i": 420702,
        "p": 4207,
        "y": "l"
    },
    {
        "n": "华容",
        "i": 420703,
        "p": 4207,
        "y": "h"
    },
    {
        "n": "鄂城",
        "i": 420704,
        "p": 4207,
        "y": "e"
    },
    {
        "n": "荆门",
        "i": 4208,
        "p": 42,
        "y": "j"
    },
    {
        "n": "东宝",
        "i": 420802,
        "p": 4208,
        "y": "d"
    },
    {
        "n": "掇刀",
        "i": 420804,
        "p": 4208,
        "y": "d"
    },
    {
        "n": "沙洋",
        "i": 420822,
        "p": 4208,
        "y": "s"
    },
    {
        "n": "钟祥",
        "i": 420881,
        "p": 4208,
        "y": "z"
    },
    {
        "n": "京山",
        "i": 420882,
        "p": 4208,
        "y": "j"
    },
    {
        "n": "孝感",
        "i": 4209,
        "p": 42,
        "y": "x"
    },
    {
        "n": "孝南",
        "i": 420902,
        "p": 4209,
        "y": "x"
    },
    {
        "n": "孝昌",
        "i": 420921,
        "p": 4209,
        "y": "x"
    },
    {
        "n": "大悟",
        "i": 420922,
        "p": 4209,
        "y": "d"
    },
    {
        "n": "云梦",
        "i": 420923,
        "p": 4209,
        "y": "y"
    },
    {
        "n": "应城",
        "i": 420981,
        "p": 4209,
        "y": "y"
    },
    {
        "n": "安陆",
        "i": 420982,
        "p": 4209,
        "y": "a"
    },
    {
        "n": "汉川",
        "i": 420984,
        "p": 4209,
        "y": "h"
    },
    {
        "n": "荆州",
        "i": 4210,
        "p": 42,
        "y": "j"
    },
    {
        "n": "沙市",
        "i": 421002,
        "p": 4210,
        "y": "s"
    },
    {
        "n": "荆州区",
        "i": 421003,
        "p": 4210,
        "y": "j"
    },
    {
        "n": "公安",
        "i": 421022,
        "p": 4210,
        "y": "g"
    },
    {
        "n": "监利",
        "i": 421023,
        "p": 4210,
        "y": "j"
    },
    {
        "n": "江陵",
        "i": 421024,
        "p": 4210,
        "y": "j"
    },
    {
        "n": "石首",
        "i": 421081,
        "p": 4210,
        "y": "s"
    },
    {
        "n": "洪湖",
        "i": 421083,
        "p": 4210,
        "y": "h"
    },
    {
        "n": "松滋",
        "i": 421087,
        "p": 4210,
        "y": "s"
    },
    {
        "n": "黄冈",
        "i": 4211,
        "p": 42,
        "y": "h"
    },
    {
        "n": "黄州",
        "i": 421102,
        "p": 4211,
        "y": "h"
    },
    {
        "n": "团风",
        "i": 421121,
        "p": 4211,
        "y": "t"
    },
    {
        "n": "红安",
        "i": 421122,
        "p": 4211,
        "y": "h"
    },
    {
        "n": "罗田",
        "i": 421123,
        "p": 4211,
        "y": "l"
    },
    {
        "n": "英山",
        "i": 421124,
        "p": 4211,
        "y": "y"
    },
    {
        "n": "浠水",
        "i": 421125,
        "p": 4211,
        "y": "x"
    },
    {
        "n": "蕲春",
        "i": 421126,
        "p": 4211,
        "y": "q"
    },
    {
        "n": "黄梅",
        "i": 421127,
        "p": 4211,
        "y": "h"
    },
    {
        "n": "麻城",
        "i": 421181,
        "p": 4211,
        "y": "m"
    },
    {
        "n": "武穴",
        "i": 421182,
        "p": 4211,
        "y": "w"
    },
    {
        "n": "咸宁",
        "i": 4212,
        "p": 42,
        "y": "x"
    },
    {
        "n": "咸安",
        "i": 421202,
        "p": 4212,
        "y": "x"
    },
    {
        "n": "嘉鱼",
        "i": 421221,
        "p": 4212,
        "y": "j"
    },
    {
        "n": "通城",
        "i": 421222,
        "p": 4212,
        "y": "t"
    },
    {
        "n": "崇阳",
        "i": 421223,
        "p": 4212,
        "y": "c"
    },
    {
        "n": "通山",
        "i": 421224,
        "p": 4212,
        "y": "t"
    },
    {
        "n": "赤壁",
        "i": 421281,
        "p": 4212,
        "y": "c"
    },
    {
        "n": "随州",
        "i": 4213,
        "p": 42,
        "y": "s"
    },
    {
        "n": "曾都",
        "i": 421303,
        "p": 4213,
        "y": "z"
    },
    {
        "n": "随县",
        "i": 421321,
        "p": 4213,
        "y": "s"
    },
    {
        "n": "广水",
        "i": 421381,
        "p": 4213,
        "y": "g"
    },
    {
        "n": "恩施",
        "i": 4228,
        "p": 42,
        "y": "e"
    },
    {
        "n": "恩施市",
        "i": 422801,
        "p": 4228,
        "y": "e"
    },
    {
        "n": "利川",
        "i": 422802,
        "p": 4228,
        "y": "l"
    },
    {
        "n": "建始",
        "i": 422822,
        "p": 4228,
        "y": "j"
    },
    {
        "n": "巴东",
        "i": 422823,
        "p": 4228,
        "y": "b"
    },
    {
        "n": "宣恩",
        "i": 422825,
        "p": 4228,
        "y": "x"
    },
    {
        "n": "咸丰",
        "i": 422826,
        "p": 4228,
        "y": "x"
    },
    {
        "n": "来凤",
        "i": 422827,
        "p": 4228,
        "y": "l"
    },
    {
        "n": "鹤峰",
        "i": 422828,
        "p": 4228,
        "y": "h"
    },
    {
        "n": "仙桃",
        "i": 429004000,
        "p": 42,
        "y": "x"
    },
    {
        "n": "沙嘴",
        "i": 429004001,
        "p": 429004000,
        "y": "s"
    },
    {
        "n": "干河",
        "i": 429004002,
        "p": 429004000,
        "y": "g"
    },
    {
        "n": "龙华山",
        "i": 429004003,
        "p": 429004000,
        "y": "l"
    },
    {
        "n": "郑场",
        "i": 429004100,
        "p": 429004000,
        "y": "z"
    },
    {
        "n": "毛嘴",
        "i": 429004101,
        "p": 429004000,
        "y": "m"
    },
    {
        "n": "豆河",
        "i": 429004102,
        "p": 429004000,
        "y": "d"
    },
    {
        "n": "三伏潭",
        "i": 429004103,
        "p": 429004000,
        "y": "s"
    },
    {
        "n": "胡场",
        "i": 429004104,
        "p": 429004000,
        "y": "h"
    },
    {
        "n": "长倘口",
        "i": 429004105,
        "p": 429004000,
        "y": "c"
    },
    {
        "n": "西流河",
        "i": 429004106,
        "p": 429004000,
        "y": "x"
    },
    {
        "n": "沙湖",
        "i": 429004107,
        "p": 429004000,
        "y": "s"
    },
    {
        "n": "杨林尾",
        "i": 429004108,
        "p": 429004000,
        "y": "y"
    },
    {
        "n": "彭场",
        "i": 429004109,
        "p": 429004000,
        "y": "p"
    },
    {
        "n": "张沟",
        "i": 429004110,
        "p": 429004000,
        "y": "z"
    },
    {
        "n": "郭河",
        "i": 429004111,
        "p": 429004000,
        "y": "g"
    },
    {
        "n": "沔城",
        "i": 429004112,
        "p": 429004000,
        "y": "m"
    },
    {
        "n": "通海口",
        "i": 429004113,
        "p": 429004000,
        "y": "t"
    },
    {
        "n": "陈场",
        "i": 429004114,
        "p": 429004000,
        "y": "c"
    },
    {
        "n": "工业园区",
        "i": 429004400,
        "p": 429004000,
        "y": "g"
    },
    {
        "n": "九合垸原种场",
        "i": 429004401,
        "p": 429004000,
        "y": "j"
    },
    {
        "n": "五湖渔场",
        "i": 429004404,
        "p": 429004000,
        "y": "w"
    },
    {
        "n": "赵西垸林场",
        "i": 429004405,
        "p": 429004000,
        "y": "z"
    },
    {
        "n": "畜禽良种场",
        "i": 429004407,
        "p": 429004000,
        "y": "c"
    },
    {
        "n": "潜江",
        "i": 429005000,
        "p": 42,
        "y": "q"
    },
    {
        "n": "园林",
        "i": 429005001,
        "p": 429005000,
        "y": "y"
    },
    {
        "n": "周矶",
        "i": 429005003,
        "p": 429005000,
        "y": "z"
    },
    {
        "n": "广华",
        "i": 429005004,
        "p": 429005000,
        "y": "g"
    },
    {
        "n": "泰丰",
        "i": 429005005,
        "p": 429005000,
        "y": "t"
    },
    {
        "n": "高场",
        "i": 429005006,
        "p": 429005000,
        "y": "g"
    },
    {
        "n": "竹根滩",
        "i": 429005100,
        "p": 429005000,
        "y": "z"
    },
    {
        "n": "渔洋",
        "i": 429005101,
        "p": 429005000,
        "y": "y"
    },
    {
        "n": "王场",
        "i": 429005102,
        "p": 429005000,
        "y": "w"
    },
    {
        "n": "高石碑",
        "i": 429005103,
        "p": 429005000,
        "y": "g"
    },
    {
        "n": "熊口",
        "i": 429005104,
        "p": 429005000,
        "y": "x"
    },
    {
        "n": "老新",
        "i": 429005105,
        "p": 429005000,
        "y": "l"
    },
    {
        "n": "浩口",
        "i": 429005106,
        "p": 429005000,
        "y": "h"
    },
    {
        "n": "积玉口",
        "i": 429005107,
        "p": 429005000,
        "y": "j"
    },
    {
        "n": "张金",
        "i": 429005108,
        "p": 429005000,
        "y": "z"
    },
    {
        "n": "龙湾",
        "i": 429005109,
        "p": 429005000,
        "y": "l"
    },
    {
        "n": "后湖管理区",
        "i": 429005451,
        "p": 429005000,
        "y": "h"
    },
    {
        "n": "熊口管理区",
        "i": 429005452,
        "p": 429005000,
        "y": "x"
    },
    {
        "n": "总口管理区",
        "i": 429005453,
        "p": 429005000,
        "y": "z"
    },
    {
        "n": "白鹭湖管理区",
        "i": 429005454,
        "p": 429005000,
        "y": "b"
    },
    {
        "n": "运粮湖管理区",
        "i": 429005455,
        "p": 429005000,
        "y": "y"
    },
    {
        "n": "杨市",
        "i": 429005900,
        "p": 429005000,
        "y": "y"
    },
    {
        "n": "广华寺农场",
        "i": 429005950,
        "p": 429005000,
        "y": "g"
    },
    {
        "n": "天门",
        "i": 429006000,
        "p": 42,
        "y": "t"
    },
    {
        "n": "竟陵",
        "i": 429006001,
        "p": 429006000,
        "y": "j"
    },
    {
        "n": "侨乡街道开发区",
        "i": 429006002,
        "p": 429006000,
        "y": "q"
    },
    {
        "n": "杨林",
        "i": 429006003,
        "p": 429006000,
        "y": "y"
    },
    {
        "n": "多宝",
        "i": 429006100,
        "p": 429006000,
        "y": "d"
    },
    {
        "n": "拖市",
        "i": 429006101,
        "p": 429006000,
        "y": "t"
    },
    {
        "n": "张港",
        "i": 429006102,
        "p": 429006000,
        "y": "z"
    },
    {
        "n": "蒋场",
        "i": 429006103,
        "p": 429006000,
        "y": "j"
    },
    {
        "n": "汪场",
        "i": 429006104,
        "p": 429006000,
        "y": "w"
    },
    {
        "n": "渔薪",
        "i": 429006105,
        "p": 429006000,
        "y": "y"
    },
    {
        "n": "黄潭",
        "i": 429006106,
        "p": 429006000,
        "y": "h"
    },
    {
        "n": "岳口",
        "i": 429006107,
        "p": 429006000,
        "y": "y"
    },
    {
        "n": "横林",
        "i": 429006108,
        "p": 429006000,
        "y": "h"
    },
    {
        "n": "彭市",
        "i": 429006109,
        "p": 429006000,
        "y": "p"
    },
    {
        "n": "麻洋",
        "i": 429006110,
        "p": 429006000,
        "y": "m"
    },
    {
        "n": "多祥",
        "i": 429006111,
        "p": 429006000,
        "y": "d"
    },
    {
        "n": "干驿",
        "i": 429006112,
        "p": 429006000,
        "y": "g"
    },
    {
        "n": "马湾",
        "i": 429006113,
        "p": 429006000,
        "y": "m"
    },
    {
        "n": "卢市",
        "i": 429006114,
        "p": 429006000,
        "y": "l"
    },
    {
        "n": "小板",
        "i": 429006115,
        "p": 429006000,
        "y": "x"
    },
    {
        "n": "九真",
        "i": 429006116,
        "p": 429006000,
        "y": "j"
    },
    {
        "n": "皂市",
        "i": 429006118,
        "p": 429006000,
        "y": "z"
    },
    {
        "n": "胡市",
        "i": 429006119,
        "p": 429006000,
        "y": "h"
    },
    {
        "n": "石河",
        "i": 429006120,
        "p": 429006000,
        "y": "s"
    },
    {
        "n": "佛子山",
        "i": 429006121,
        "p": 429006000,
        "y": "f"
    },
    {
        "n": "净潭",
        "i": 429006201,
        "p": 429006000,
        "y": "j"
    },
    {
        "n": "蒋湖农场",
        "i": 429006450,
        "p": 429006000,
        "y": "j"
    },
    {
        "n": "白茅湖农场",
        "i": 429006451,
        "p": 429006000,
        "y": "b"
    },
    {
        "n": "沉湖管委会",
        "i": 429006452,
        "p": 429006000,
        "y": "c"
    },
    {
        "n": "神农架",
        "i": 429021,
        "p": 42,
        "y": "s"
    },
    {
        "n": "神农架林区",
        "i": 429021000,
        "p": 429021,
        "y": "s"
    },
    {
        "n": "湖南",
        "i": 43,
        "p": 0,
        "y": "h"
    },
    {
        "n": "长沙",
        "i": 4301,
        "p": 43,
        "y": "c"
    },
    {
        "n": "芙蓉",
        "i": 430102,
        "p": 4301,
        "y": "f"
    },
    {
        "n": "天心",
        "i": 430103,
        "p": 4301,
        "y": "t"
    },
    {
        "n": "岳麓",
        "i": 430104,
        "p": 4301,
        "y": "y"
    },
    {
        "n": "开福",
        "i": 430105,
        "p": 4301,
        "y": "k"
    },
    {
        "n": "雨花",
        "i": 430111,
        "p": 4301,
        "y": "y"
    },
    {
        "n": "望城",
        "i": 430112,
        "p": 4301,
        "y": "w"
    },
    {
        "n": "长沙县",
        "i": 430121,
        "p": 4301,
        "y": "c"
    },
    {
        "n": "浏阳",
        "i": 430181,
        "p": 4301,
        "y": "l"
    },
    {
        "n": "宁乡",
        "i": 430182,
        "p": 4301,
        "y": "n"
    },
    {
        "n": "株洲",
        "i": 4302,
        "p": 43,
        "y": "z"
    },
    {
        "n": "荷塘",
        "i": 430202,
        "p": 4302,
        "y": "h"
    },
    {
        "n": "芦淞",
        "i": 430203,
        "p": 4302,
        "y": "l"
    },
    {
        "n": "石峰",
        "i": 430204,
        "p": 4302,
        "y": "s"
    },
    {
        "n": "天元",
        "i": 430211,
        "p": 4302,
        "y": "t"
    },
    {
        "n": "渌口",
        "i": 430212,
        "p": 4302,
        "y": "l"
    },
    {
        "n": "攸县",
        "i": 430223,
        "p": 4302,
        "y": "y"
    },
    {
        "n": "茶陵",
        "i": 430224,
        "p": 4302,
        "y": "c"
    },
    {
        "n": "炎陵",
        "i": 430225,
        "p": 4302,
        "y": "y"
    },
    {
        "n": "醴陵",
        "i": 430281,
        "p": 4302,
        "y": "l"
    },
    {
        "n": "湘潭",
        "i": 4303,
        "p": 43,
        "y": "x"
    },
    {
        "n": "雨湖",
        "i": 430302,
        "p": 4303,
        "y": "y"
    },
    {
        "n": "岳塘",
        "i": 430304,
        "p": 4303,
        "y": "y"
    },
    {
        "n": "湘潭县",
        "i": 430321,
        "p": 4303,
        "y": "x"
    },
    {
        "n": "湘乡",
        "i": 430381,
        "p": 4303,
        "y": "x"
    },
    {
        "n": "韶山",
        "i": 430382,
        "p": 4303,
        "y": "s"
    },
    {
        "n": "衡阳",
        "i": 4304,
        "p": 43,
        "y": "h"
    },
    {
        "n": "珠晖",
        "i": 430405,
        "p": 4304,
        "y": "z"
    },
    {
        "n": "雁峰",
        "i": 430406,
        "p": 4304,
        "y": "y"
    },
    {
        "n": "石鼓",
        "i": 430407,
        "p": 4304,
        "y": "s"
    },
    {
        "n": "蒸湘",
        "i": 430408,
        "p": 4304,
        "y": "z"
    },
    {
        "n": "南岳",
        "i": 430412,
        "p": 4304,
        "y": "n"
    },
    {
        "n": "衡阳县",
        "i": 430421,
        "p": 4304,
        "y": "h"
    },
    {
        "n": "衡南",
        "i": 430422,
        "p": 4304,
        "y": "h"
    },
    {
        "n": "衡山",
        "i": 430423,
        "p": 4304,
        "y": "h"
    },
    {
        "n": "衡东",
        "i": 430424,
        "p": 4304,
        "y": "h"
    },
    {
        "n": "祁东",
        "i": 430426,
        "p": 4304,
        "y": "q"
    },
    {
        "n": "耒阳",
        "i": 430481,
        "p": 4304,
        "y": "l"
    },
    {
        "n": "常宁",
        "i": 430482,
        "p": 4304,
        "y": "c"
    },
    {
        "n": "邵阳",
        "i": 4305,
        "p": 43,
        "y": "s"
    },
    {
        "n": "双清",
        "i": 430502,
        "p": 4305,
        "y": "s"
    },
    {
        "n": "大祥",
        "i": 430503,
        "p": 4305,
        "y": "d"
    },
    {
        "n": "北塔",
        "i": 430511,
        "p": 4305,
        "y": "b"
    },
    {
        "n": "新邵",
        "i": 430522,
        "p": 4305,
        "y": "x"
    },
    {
        "n": "邵阳县",
        "i": 430523,
        "p": 4305,
        "y": "s"
    },
    {
        "n": "隆回",
        "i": 430524,
        "p": 4305,
        "y": "l"
    },
    {
        "n": "洞口",
        "i": 430525,
        "p": 4305,
        "y": "d"
    },
    {
        "n": "绥宁",
        "i": 430527,
        "p": 4305,
        "y": "s"
    },
    {
        "n": "新宁",
        "i": 430528,
        "p": 4305,
        "y": "x"
    },
    {
        "n": "城步",
        "i": 430529,
        "p": 4305,
        "y": "c"
    },
    {
        "n": "武冈",
        "i": 430581,
        "p": 4305,
        "y": "w"
    },
    {
        "n": "邵东",
        "i": 430582,
        "p": 4305,
        "y": "s"
    },
    {
        "n": "岳阳",
        "i": 4306,
        "p": 43,
        "y": "y"
    },
    {
        "n": "岳阳楼",
        "i": 430602,
        "p": 4306,
        "y": "y"
    },
    {
        "n": "云溪",
        "i": 430603,
        "p": 4306,
        "y": "y"
    },
    {
        "n": "君山",
        "i": 430611,
        "p": 4306,
        "y": "j"
    },
    {
        "n": "岳阳县",
        "i": 430621,
        "p": 4306,
        "y": "y"
    },
    {
        "n": "华容",
        "i": 430623,
        "p": 4306,
        "y": "h"
    },
    {
        "n": "湘阴",
        "i": 430624,
        "p": 4306,
        "y": "x"
    },
    {
        "n": "平江",
        "i": 430626,
        "p": 4306,
        "y": "p"
    },
    {
        "n": "汨罗",
        "i": 430681,
        "p": 4306,
        "y": "m"
    },
    {
        "n": "临湘",
        "i": 430682,
        "p": 4306,
        "y": "l"
    },
    {
        "n": "常德",
        "i": 4307,
        "p": 43,
        "y": "c"
    },
    {
        "n": "武陵",
        "i": 430702,
        "p": 4307,
        "y": "w"
    },
    {
        "n": "鼎城",
        "i": 430703,
        "p": 4307,
        "y": "d"
    },
    {
        "n": "安乡",
        "i": 430721,
        "p": 4307,
        "y": "a"
    },
    {
        "n": "汉寿",
        "i": 430722,
        "p": 4307,
        "y": "h"
    },
    {
        "n": "澧县",
        "i": 430723,
        "p": 4307,
        "y": "l"
    },
    {
        "n": "临澧",
        "i": 430724,
        "p": 4307,
        "y": "l"
    },
    {
        "n": "桃源",
        "i": 430725,
        "p": 4307,
        "y": "t"
    },
    {
        "n": "石门",
        "i": 430726,
        "p": 4307,
        "y": "s"
    },
    {
        "n": "津市",
        "i": 430781,
        "p": 4307,
        "y": "j"
    },
    {
        "n": "张家界",
        "i": 4308,
        "p": 43,
        "y": "z"
    },
    {
        "n": "永定",
        "i": 430802,
        "p": 4308,
        "y": "y"
    },
    {
        "n": "武陵源",
        "i": 430811,
        "p": 4308,
        "y": "w"
    },
    {
        "n": "慈利",
        "i": 430821,
        "p": 4308,
        "y": "c"
    },
    {
        "n": "桑植",
        "i": 430822,
        "p": 4308,
        "y": "s"
    },
    {
        "n": "益阳",
        "i": 4309,
        "p": 43,
        "y": "y"
    },
    {
        "n": "资阳",
        "i": 430902,
        "p": 4309,
        "y": "z"
    },
    {
        "n": "赫山",
        "i": 430903,
        "p": 4309,
        "y": "h"
    },
    {
        "n": "南县",
        "i": 430921,
        "p": 4309,
        "y": "n"
    },
    {
        "n": "桃江",
        "i": 430922,
        "p": 4309,
        "y": "t"
    },
    {
        "n": "安化",
        "i": 430923,
        "p": 4309,
        "y": "a"
    },
    {
        "n": "沅江",
        "i": 430981,
        "p": 4309,
        "y": "y"
    },
    {
        "n": "郴州",
        "i": 4310,
        "p": 43,
        "y": "c"
    },
    {
        "n": "北湖",
        "i": 431002,
        "p": 4310,
        "y": "b"
    },
    {
        "n": "苏仙",
        "i": 431003,
        "p": 4310,
        "y": "s"
    },
    {
        "n": "桂阳",
        "i": 431021,
        "p": 4310,
        "y": "g"
    },
    {
        "n": "宜章",
        "i": 431022,
        "p": 4310,
        "y": "y"
    },
    {
        "n": "永兴",
        "i": 431023,
        "p": 4310,
        "y": "y"
    },
    {
        "n": "嘉禾",
        "i": 431024,
        "p": 4310,
        "y": "j"
    },
    {
        "n": "临武",
        "i": 431025,
        "p": 4310,
        "y": "l"
    },
    {
        "n": "汝城",
        "i": 431026,
        "p": 4310,
        "y": "r"
    },
    {
        "n": "桂东",
        "i": 431027,
        "p": 4310,
        "y": "g"
    },
    {
        "n": "安仁",
        "i": 431028,
        "p": 4310,
        "y": "a"
    },
    {
        "n": "资兴",
        "i": 431081,
        "p": 4310,
        "y": "z"
    },
    {
        "n": "永州",
        "i": 4311,
        "p": 43,
        "y": "y"
    },
    {
        "n": "零陵",
        "i": 431102,
        "p": 4311,
        "y": "l"
    },
    {
        "n": "冷水滩",
        "i": 431103,
        "p": 4311,
        "y": "l"
    },
    {
        "n": "祁阳",
        "i": 431121,
        "p": 4311,
        "y": "q"
    },
    {
        "n": "东安",
        "i": 431122,
        "p": 4311,
        "y": "d"
    },
    {
        "n": "双牌",
        "i": 431123,
        "p": 4311,
        "y": "s"
    },
    {
        "n": "道县",
        "i": 431124,
        "p": 4311,
        "y": "d"
    },
    {
        "n": "江永",
        "i": 431125,
        "p": 4311,
        "y": "j"
    },
    {
        "n": "宁远",
        "i": 431126,
        "p": 4311,
        "y": "n"
    },
    {
        "n": "蓝山",
        "i": 431127,
        "p": 4311,
        "y": "l"
    },
    {
        "n": "新田",
        "i": 431128,
        "p": 4311,
        "y": "x"
    },
    {
        "n": "江华",
        "i": 431129,
        "p": 4311,
        "y": "j"
    },
    {
        "n": "怀化",
        "i": 4312,
        "p": 43,
        "y": "h"
    },
    {
        "n": "鹤城",
        "i": 431202,
        "p": 4312,
        "y": "h"
    },
    {
        "n": "中方",
        "i": 431221,
        "p": 4312,
        "y": "z"
    },
    {
        "n": "沅陵",
        "i": 431222,
        "p": 4312,
        "y": "y"
    },
    {
        "n": "辰溪",
        "i": 431223,
        "p": 4312,
        "y": "c"
    },
    {
        "n": "溆浦",
        "i": 431224,
        "p": 4312,
        "y": "x"
    },
    {
        "n": "会同",
        "i": 431225,
        "p": 4312,
        "y": "h"
    },
    {
        "n": "麻阳",
        "i": 431226,
        "p": 4312,
        "y": "m"
    },
    {
        "n": "新晃",
        "i": 431227,
        "p": 4312,
        "y": "x"
    },
    {
        "n": "芷江",
        "i": 431228,
        "p": 4312,
        "y": "z"
    },
    {
        "n": "靖州",
        "i": 431229,
        "p": 4312,
        "y": "j"
    },
    {
        "n": "通道",
        "i": 431230,
        "p": 4312,
        "y": "t"
    },
    {
        "n": "洪江",
        "i": 431281,
        "p": 4312,
        "y": "h"
    },
    {
        "n": "娄底",
        "i": 4313,
        "p": 43,
        "y": "l"
    },
    {
        "n": "娄星",
        "i": 431302,
        "p": 4313,
        "y": "l"
    },
    {
        "n": "双峰",
        "i": 431321,
        "p": 4313,
        "y": "s"
    },
    {
        "n": "新化",
        "i": 431322,
        "p": 4313,
        "y": "x"
    },
    {
        "n": "冷水江",
        "i": 431381,
        "p": 4313,
        "y": "l"
    },
    {
        "n": "涟源",
        "i": 431382,
        "p": 4313,
        "y": "l"
    },
    {
        "n": "湘西",
        "i": 4331,
        "p": 43,
        "y": "x"
    },
    {
        "n": "吉首",
        "i": 433101,
        "p": 4331,
        "y": "j"
    },
    {
        "n": "泸溪",
        "i": 433122,
        "p": 4331,
        "y": "l"
    },
    {
        "n": "凤凰",
        "i": 433123,
        "p": 4331,
        "y": "f"
    },
    {
        "n": "花垣",
        "i": 433124,
        "p": 4331,
        "y": "h"
    },
    {
        "n": "保靖",
        "i": 433125,
        "p": 4331,
        "y": "b"
    },
    {
        "n": "古丈",
        "i": 433126,
        "p": 4331,
        "y": "g"
    },
    {
        "n": "永顺",
        "i": 433127,
        "p": 4331,
        "y": "y"
    },
    {
        "n": "龙山",
        "i": 433130,
        "p": 4331,
        "y": "l"
    },
    {
        "n": "广东",
        "i": 44,
        "p": 0,
        "y": "g"
    },
    {
        "n": "广州",
        "i": 4401,
        "p": 44,
        "y": "g"
    },
    {
        "n": "荔湾",
        "i": 440103,
        "p": 4401,
        "y": "l"
    },
    {
        "n": "越秀",
        "i": 440104,
        "p": 4401,
        "y": "y"
    },
    {
        "n": "海珠",
        "i": 440105,
        "p": 4401,
        "y": "h"
    },
    {
        "n": "天河",
        "i": 440106,
        "p": 4401,
        "y": "t"
    },
    {
        "n": "白云",
        "i": 440111,
        "p": 4401,
        "y": "b"
    },
    {
        "n": "黄埔",
        "i": 440112,
        "p": 4401,
        "y": "h"
    },
    {
        "n": "番禺",
        "i": 440113,
        "p": 4401,
        "y": "p"
    },
    {
        "n": "花都",
        "i": 440114,
        "p": 4401,
        "y": "h"
    },
    {
        "n": "南沙",
        "i": 440115,
        "p": 4401,
        "y": "n"
    },
    {
        "n": "从化",
        "i": 440117,
        "p": 4401,
        "y": "c"
    },
    {
        "n": "增城",
        "i": 440118,
        "p": 4401,
        "y": "z"
    },
    {
        "n": "韶关",
        "i": 4402,
        "p": 44,
        "y": "s"
    },
    {
        "n": "武江",
        "i": 440203,
        "p": 4402,
        "y": "w"
    },
    {
        "n": "浈江",
        "i": 440204,
        "p": 4402,
        "y": "z"
    },
    {
        "n": "曲江",
        "i": 440205,
        "p": 4402,
        "y": "q"
    },
    {
        "n": "始兴",
        "i": 440222,
        "p": 4402,
        "y": "s"
    },
    {
        "n": "仁化",
        "i": 440224,
        "p": 4402,
        "y": "r"
    },
    {
        "n": "翁源",
        "i": 440229,
        "p": 4402,
        "y": "w"
    },
    {
        "n": "乳源",
        "i": 440232,
        "p": 4402,
        "y": "r"
    },
    {
        "n": "新丰",
        "i": 440233,
        "p": 4402,
        "y": "x"
    },
    {
        "n": "乐昌",
        "i": 440281,
        "p": 4402,
        "y": "l"
    },
    {
        "n": "南雄",
        "i": 440282,
        "p": 4402,
        "y": "n"
    },
    {
        "n": "深圳",
        "i": 4403,
        "p": 44,
        "y": "s"
    },
    {
        "n": "罗湖",
        "i": 440303,
        "p": 4403,
        "y": "l"
    },
    {
        "n": "福田",
        "i": 440304,
        "p": 4403,
        "y": "f"
    },
    {
        "n": "南山",
        "i": 440305,
        "p": 4403,
        "y": "n"
    },
    {
        "n": "宝安",
        "i": 440306,
        "p": 4403,
        "y": "b"
    },
    {
        "n": "龙岗",
        "i": 440307,
        "p": 4403,
        "y": "l"
    },
    {
        "n": "盐田",
        "i": 440308,
        "p": 4403,
        "y": "y"
    },
    {
        "n": "龙华",
        "i": 440309,
        "p": 4403,
        "y": "l"
    },
    {
        "n": "坪山",
        "i": 440310,
        "p": 4403,
        "y": "p"
    },
    {
        "n": "光明",
        "i": 440311,
        "p": 4403,
        "y": "g"
    },
    {
        "n": "珠海",
        "i": 4404,
        "p": 44,
        "y": "z"
    },
    {
        "n": "香洲",
        "i": 440402,
        "p": 4404,
        "y": "x"
    },
    {
        "n": "斗门",
        "i": 440403,
        "p": 4404,
        "y": "d"
    },
    {
        "n": "金湾",
        "i": 440404,
        "p": 4404,
        "y": "j"
    },
    {
        "n": "汕头",
        "i": 4405,
        "p": 44,
        "y": "s"
    },
    {
        "n": "龙湖",
        "i": 440507,
        "p": 4405,
        "y": "l"
    },
    {
        "n": "金平",
        "i": 440511,
        "p": 4405,
        "y": "j"
    },
    {
        "n": "濠江",
        "i": 440512,
        "p": 4405,
        "y": "h"
    },
    {
        "n": "潮阳",
        "i": 440513,
        "p": 4405,
        "y": "c"
    },
    {
        "n": "潮南",
        "i": 440514,
        "p": 4405,
        "y": "c"
    },
    {
        "n": "澄海",
        "i": 440515,
        "p": 4405,
        "y": "c"
    },
    {
        "n": "南澳",
        "i": 440523,
        "p": 4405,
        "y": "n"
    },
    {
        "n": "佛山",
        "i": 4406,
        "p": 44,
        "y": "f"
    },
    {
        "n": "禅城",
        "i": 440604,
        "p": 4406,
        "y": "c"
    },
    {
        "n": "南海",
        "i": 440605,
        "p": 4406,
        "y": "n"
    },
    {
        "n": "顺德",
        "i": 440606,
        "p": 4406,
        "y": "s"
    },
    {
        "n": "三水",
        "i": 440607,
        "p": 4406,
        "y": "s"
    },
    {
        "n": "高明",
        "i": 440608,
        "p": 4406,
        "y": "g"
    },
    {
        "n": "江门",
        "i": 4407,
        "p": 44,
        "y": "j"
    },
    {
        "n": "蓬江",
        "i": 440703,
        "p": 4407,
        "y": "p"
    },
    {
        "n": "江海",
        "i": 440704,
        "p": 4407,
        "y": "j"
    },
    {
        "n": "新会",
        "i": 440705,
        "p": 4407,
        "y": "x"
    },
    {
        "n": "台山",
        "i": 440781,
        "p": 4407,
        "y": "t"
    },
    {
        "n": "开平",
        "i": 440783,
        "p": 4407,
        "y": "k"
    },
    {
        "n": "鹤山",
        "i": 440784,
        "p": 4407,
        "y": "h"
    },
    {
        "n": "恩平",
        "i": 440785,
        "p": 4407,
        "y": "e"
    },
    {
        "n": "湛江",
        "i": 4408,
        "p": 44,
        "y": "z"
    },
    {
        "n": "赤坎",
        "i": 440802,
        "p": 4408,
        "y": "c"
    },
    {
        "n": "霞山",
        "i": 440803,
        "p": 4408,
        "y": "x"
    },
    {
        "n": "坡头",
        "i": 440804,
        "p": 4408,
        "y": "p"
    },
    {
        "n": "麻章",
        "i": 440811,
        "p": 4408,
        "y": "m"
    },
    {
        "n": "遂溪",
        "i": 440823,
        "p": 4408,
        "y": "s"
    },
    {
        "n": "徐闻",
        "i": 440825,
        "p": 4408,
        "y": "x"
    },
    {
        "n": "廉江",
        "i": 440881,
        "p": 4408,
        "y": "l"
    },
    {
        "n": "雷州",
        "i": 440882,
        "p": 4408,
        "y": "l"
    },
    {
        "n": "吴川",
        "i": 440883,
        "p": 4408,
        "y": "w"
    },
    {
        "n": "茂名",
        "i": 4409,
        "p": 44,
        "y": "m"
    },
    {
        "n": "茂南",
        "i": 440902,
        "p": 4409,
        "y": "m"
    },
    {
        "n": "电白",
        "i": 440904,
        "p": 4409,
        "y": "d"
    },
    {
        "n": "高州",
        "i": 440981,
        "p": 4409,
        "y": "g"
    },
    {
        "n": "化州",
        "i": 440982,
        "p": 4409,
        "y": "h"
    },
    {
        "n": "信宜",
        "i": 440983,
        "p": 4409,
        "y": "x"
    },
    {
        "n": "肇庆",
        "i": 4412,
        "p": 44,
        "y": "z"
    },
    {
        "n": "端州",
        "i": 441202,
        "p": 4412,
        "y": "d"
    },
    {
        "n": "鼎湖",
        "i": 441203,
        "p": 4412,
        "y": "d"
    },
    {
        "n": "高要",
        "i": 441204,
        "p": 4412,
        "y": "g"
    },
    {
        "n": "广宁",
        "i": 441223,
        "p": 4412,
        "y": "g"
    },
    {
        "n": "怀集",
        "i": 441224,
        "p": 4412,
        "y": "h"
    },
    {
        "n": "封开",
        "i": 441225,
        "p": 4412,
        "y": "f"
    },
    {
        "n": "德庆",
        "i": 441226,
        "p": 4412,
        "y": "d"
    },
    {
        "n": "四会",
        "i": 441284,
        "p": 4412,
        "y": "s"
    },
    {
        "n": "惠州",
        "i": 4413,
        "p": 44,
        "y": "h"
    },
    {
        "n": "惠城",
        "i": 441302,
        "p": 4413,
        "y": "h"
    },
    {
        "n": "惠阳",
        "i": 441303,
        "p": 4413,
        "y": "h"
    },
    {
        "n": "博罗",
        "i": 441322,
        "p": 4413,
        "y": "b"
    },
    {
        "n": "惠东",
        "i": 441323,
        "p": 4413,
        "y": "h"
    },
    {
        "n": "龙门",
        "i": 441324,
        "p": 4413,
        "y": "l"
    },
    {
        "n": "梅州",
        "i": 4414,
        "p": 44,
        "y": "m"
    },
    {
        "n": "梅江",
        "i": 441402,
        "p": 4414,
        "y": "m"
    },
    {
        "n": "梅县",
        "i": 441403,
        "p": 4414,
        "y": "m"
    },
    {
        "n": "大埔",
        "i": 441422,
        "p": 4414,
        "y": "d"
    },
    {
        "n": "丰顺",
        "i": 441423,
        "p": 4414,
        "y": "f"
    },
    {
        "n": "五华",
        "i": 441424,
        "p": 4414,
        "y": "w"
    },
    {
        "n": "平远",
        "i": 441426,
        "p": 4414,
        "y": "p"
    },
    {
        "n": "蕉岭",
        "i": 441427,
        "p": 4414,
        "y": "j"
    },
    {
        "n": "兴宁",
        "i": 441481,
        "p": 4414,
        "y": "x"
    },
    {
        "n": "汕尾",
        "i": 4415,
        "p": 44,
        "y": "s"
    },
    {
        "n": "城区",
        "i": 441502,
        "p": 4415,
        "y": "c"
    },
    {
        "n": "海丰",
        "i": 441521,
        "p": 4415,
        "y": "h"
    },
    {
        "n": "陆河",
        "i": 441523,
        "p": 4415,
        "y": "l"
    },
    {
        "n": "陆丰",
        "i": 441581,
        "p": 4415,
        "y": "l"
    },
    {
        "n": "河源",
        "i": 4416,
        "p": 44,
        "y": "h"
    },
    {
        "n": "源城",
        "i": 441602,
        "p": 4416,
        "y": "y"
    },
    {
        "n": "紫金",
        "i": 441621,
        "p": 4416,
        "y": "z"
    },
    {
        "n": "龙川",
        "i": 441622,
        "p": 4416,
        "y": "l"
    },
    {
        "n": "连平",
        "i": 441623,
        "p": 4416,
        "y": "l"
    },
    {
        "n": "和平",
        "i": 441624,
        "p": 4416,
        "y": "h"
    },
    {
        "n": "东源",
        "i": 441625,
        "p": 4416,
        "y": "d"
    },
    {
        "n": "阳江",
        "i": 4417,
        "p": 44,
        "y": "y"
    },
    {
        "n": "江城",
        "i": 441702,
        "p": 4417,
        "y": "j"
    },
    {
        "n": "阳东",
        "i": 441704,
        "p": 4417,
        "y": "y"
    },
    {
        "n": "阳西",
        "i": 441721,
        "p": 4417,
        "y": "y"
    },
    {
        "n": "阳春",
        "i": 441781,
        "p": 4417,
        "y": "y"
    },
    {
        "n": "清远",
        "i": 4418,
        "p": 44,
        "y": "q"
    },
    {
        "n": "清城",
        "i": 441802,
        "p": 4418,
        "y": "q"
    },
    {
        "n": "清新区",
        "i": 441803,
        "p": 4418,
        "y": "q"
    },
    {
        "n": "佛冈",
        "i": 441821,
        "p": 4418,
        "y": "f"
    },
    {
        "n": "阳山",
        "i": 441823,
        "p": 4418,
        "y": "y"
    },
    {
        "n": "连山",
        "i": 441825,
        "p": 4418,
        "y": "l"
    },
    {
        "n": "连南",
        "i": 441826,
        "p": 4418,
        "y": "l"
    },
    {
        "n": "英德",
        "i": 441881,
        "p": 4418,
        "y": "y"
    },
    {
        "n": "连州",
        "i": 441882,
        "p": 4418,
        "y": "l"
    },
    {
        "n": "东莞",
        "i": 441900,
        "p": 44,
        "y": "d"
    },
    {
        "n": "东城",
        "i": 441900003,
        "p": 441900,
        "y": "d"
    },
    {
        "n": "南城",
        "i": 441900004,
        "p": 441900,
        "y": "n"
    },
    {
        "n": "万江",
        "i": 441900005,
        "p": 441900,
        "y": "w"
    },
    {
        "n": "莞城",
        "i": 441900006,
        "p": 441900,
        "y": "w"
    },
    {
        "n": "石碣",
        "i": 441900101,
        "p": 441900,
        "y": "s"
    },
    {
        "n": "石龙",
        "i": 441900102,
        "p": 441900,
        "y": "s"
    },
    {
        "n": "茶山",
        "i": 441900103,
        "p": 441900,
        "y": "c"
    },
    {
        "n": "石排",
        "i": 441900104,
        "p": 441900,
        "y": "s"
    },
    {
        "n": "企石",
        "i": 441900105,
        "p": 441900,
        "y": "q"
    },
    {
        "n": "横沥",
        "i": 441900106,
        "p": 441900,
        "y": "h"
    },
    {
        "n": "桥头",
        "i": 441900107,
        "p": 441900,
        "y": "q"
    },
    {
        "n": "谢岗",
        "i": 441900108,
        "p": 441900,
        "y": "x"
    },
    {
        "n": "东坑",
        "i": 441900109,
        "p": 441900,
        "y": "d"
    },
    {
        "n": "常平",
        "i": 441900110,
        "p": 441900,
        "y": "c"
    },
    {
        "n": "寮步",
        "i": 441900111,
        "p": 441900,
        "y": "l"
    },
    {
        "n": "樟木头",
        "i": 441900112,
        "p": 441900,
        "y": "z"
    },
    {
        "n": "大朗",
        "i": 441900113,
        "p": 441900,
        "y": "d"
    },
    {
        "n": "黄江",
        "i": 441900114,
        "p": 441900,
        "y": "h"
    },
    {
        "n": "清溪",
        "i": 441900115,
        "p": 441900,
        "y": "q"
    },
    {
        "n": "塘厦",
        "i": 441900116,
        "p": 441900,
        "y": "t"
    },
    {
        "n": "凤岗",
        "i": 441900117,
        "p": 441900,
        "y": "f"
    },
    {
        "n": "大岭山",
        "i": 441900118,
        "p": 441900,
        "y": "d"
    },
    {
        "n": "长安",
        "i": 441900119,
        "p": 441900,
        "y": "c"
    },
    {
        "n": "虎门",
        "i": 441900121,
        "p": 441900,
        "y": "h"
    },
    {
        "n": "厚街",
        "i": 441900122,
        "p": 441900,
        "y": "h"
    },
    {
        "n": "沙田",
        "i": 441900123,
        "p": 441900,
        "y": "s"
    },
    {
        "n": "道滘",
        "i": 441900124,
        "p": 441900,
        "y": "d"
    },
    {
        "n": "洪梅",
        "i": 441900125,
        "p": 441900,
        "y": "h"
    },
    {
        "n": "麻涌",
        "i": 441900126,
        "p": 441900,
        "y": "m"
    },
    {
        "n": "望牛墩",
        "i": 441900127,
        "p": 441900,
        "y": "w"
    },
    {
        "n": "中堂",
        "i": 441900128,
        "p": 441900,
        "y": "z"
    },
    {
        "n": "高埗",
        "i": 441900129,
        "p": 441900,
        "y": "g"
    },
    {
        "n": "松山湖管委会",
        "i": 441900401,
        "p": 441900,
        "y": "s"
    },
    {
        "n": "虎门港管委会",
        "i": 441900402,
        "p": 441900,
        "y": "h"
    },
    {
        "n": "东莞生态园",
        "i": 441900403,
        "p": 441900,
        "y": "d"
    },
    {
        "n": "中山",
        "i": 442000,
        "p": 44,
        "y": "z"
    },
    {
        "n": "石岐区",
        "i": 442000001,
        "p": 442000,
        "y": "s"
    },
    {
        "n": "东区",
        "i": 442000002,
        "p": 442000,
        "y": "d"
    },
    {
        "n": "火炬开发区",
        "i": 442000003,
        "p": 442000,
        "y": "h"
    },
    {
        "n": "西区",
        "i": 442000004,
        "p": 442000,
        "y": "x"
    },
    {
        "n": "南区",
        "i": 442000005,
        "p": 442000,
        "y": "n"
    },
    {
        "n": "五桂山",
        "i": 442000006,
        "p": 442000,
        "y": "w"
    },
    {
        "n": "小榄",
        "i": 442000100,
        "p": 442000,
        "y": "x"
    },
    {
        "n": "黄圃",
        "i": 442000101,
        "p": 442000,
        "y": "h"
    },
    {
        "n": "民众",
        "i": 442000102,
        "p": 442000,
        "y": "m"
    },
    {
        "n": "东凤",
        "i": 442000103,
        "p": 442000,
        "y": "d"
    },
    {
        "n": "东升",
        "i": 442000104,
        "p": 442000,
        "y": "d"
    },
    {
        "n": "古镇",
        "i": 442000105,
        "p": 442000,
        "y": "g"
    },
    {
        "n": "沙溪",
        "i": 442000106,
        "p": 442000,
        "y": "s"
    },
    {
        "n": "坦洲",
        "i": 442000107,
        "p": 442000,
        "y": "t"
    },
    {
        "n": "港口",
        "i": 442000108,
        "p": 442000,
        "y": "g"
    },
    {
        "n": "三角",
        "i": 442000109,
        "p": 442000,
        "y": "s"
    },
    {
        "n": "横栏",
        "i": 442000110,
        "p": 442000,
        "y": "h"
    },
    {
        "n": "南头",
        "i": 442000111,
        "p": 442000,
        "y": "n"
    },
    {
        "n": "阜沙",
        "i": 442000112,
        "p": 442000,
        "y": "f"
    },
    {
        "n": "南朗",
        "i": 442000113,
        "p": 442000,
        "y": "n"
    },
    {
        "n": "三乡",
        "i": 442000114,
        "p": 442000,
        "y": "s"
    },
    {
        "n": "板芙",
        "i": 442000115,
        "p": 442000,
        "y": "b"
    },
    {
        "n": "大涌",
        "i": 442000116,
        "p": 442000,
        "y": "d"
    },
    {
        "n": "神湾",
        "i": 442000117,
        "p": 442000,
        "y": "s"
    },
    {
        "n": "潮州",
        "i": 4451,
        "p": 44,
        "y": "c"
    },
    {
        "n": "湘桥",
        "i": 445102,
        "p": 4451,
        "y": "x"
    },
    {
        "n": "潮安",
        "i": 445103,
        "p": 4451,
        "y": "c"
    },
    {
        "n": "饶平",
        "i": 445122,
        "p": 4451,
        "y": "r"
    },
    {
        "n": "揭阳",
        "i": 4452,
        "p": 44,
        "y": "j"
    },
    {
        "n": "榕城",
        "i": 445202,
        "p": 4452,
        "y": "r"
    },
    {
        "n": "揭东",
        "i": 445203,
        "p": 4452,
        "y": "j"
    },
    {
        "n": "揭西",
        "i": 445222,
        "p": 4452,
        "y": "j"
    },
    {
        "n": "惠来",
        "i": 445224,
        "p": 4452,
        "y": "h"
    },
    {
        "n": "普宁",
        "i": 445281,
        "p": 4452,
        "y": "p"
    },
    {
        "n": "云浮",
        "i": 4453,
        "p": 44,
        "y": "y"
    },
    {
        "n": "云城",
        "i": 445302,
        "p": 4453,
        "y": "y"
    },
    {
        "n": "云安",
        "i": 445303,
        "p": 4453,
        "y": "y"
    },
    {
        "n": "新兴",
        "i": 445321,
        "p": 4453,
        "y": "x"
    },
    {
        "n": "郁南",
        "i": 445322,
        "p": 4453,
        "y": "y"
    },
    {
        "n": "罗定",
        "i": 445381,
        "p": 4453,
        "y": "l"
    },
    {
        "n": "广西",
        "i": 45,
        "p": 0,
        "y": "g"
    },
    {
        "n": "南宁",
        "i": 4501,
        "p": 45,
        "y": "n"
    },
    {
        "n": "兴宁",
        "i": 450102,
        "p": 4501,
        "y": "x"
    },
    {
        "n": "青秀",
        "i": 450103,
        "p": 4501,
        "y": "q"
    },
    {
        "n": "江南",
        "i": 450105,
        "p": 4501,
        "y": "j"
    },
    {
        "n": "西乡塘",
        "i": 450107,
        "p": 4501,
        "y": "x"
    },
    {
        "n": "良庆",
        "i": 450108,
        "p": 4501,
        "y": "l"
    },
    {
        "n": "邕宁",
        "i": 450109,
        "p": 4501,
        "y": "y"
    },
    {
        "n": "武鸣",
        "i": 450110,
        "p": 4501,
        "y": "w"
    },
    {
        "n": "隆安",
        "i": 450123,
        "p": 4501,
        "y": "l"
    },
    {
        "n": "马山",
        "i": 450124,
        "p": 4501,
        "y": "m"
    },
    {
        "n": "上林",
        "i": 450125,
        "p": 4501,
        "y": "s"
    },
    {
        "n": "宾阳",
        "i": 450126,
        "p": 4501,
        "y": "b"
    },
    {
        "n": "横县",
        "i": 450127,
        "p": 4501,
        "y": "h"
    },
    {
        "n": "柳州",
        "i": 4502,
        "p": 45,
        "y": "l"
    },
    {
        "n": "城中",
        "i": 450202,
        "p": 4502,
        "y": "c"
    },
    {
        "n": "鱼峰",
        "i": 450203,
        "p": 4502,
        "y": "y"
    },
    {
        "n": "柳南",
        "i": 450204,
        "p": 4502,
        "y": "l"
    },
    {
        "n": "柳北",
        "i": 450205,
        "p": 4502,
        "y": "l"
    },
    {
        "n": "柳江",
        "i": 450206,
        "p": 4502,
        "y": "l"
    },
    {
        "n": "柳城",
        "i": 450222,
        "p": 4502,
        "y": "l"
    },
    {
        "n": "鹿寨",
        "i": 450223,
        "p": 4502,
        "y": "l"
    },
    {
        "n": "融安",
        "i": 450224,
        "p": 4502,
        "y": "r"
    },
    {
        "n": "融水",
        "i": 450225,
        "p": 4502,
        "y": "r"
    },
    {
        "n": "三江",
        "i": 450226,
        "p": 4502,
        "y": "s"
    },
    {
        "n": "桂林",
        "i": 4503,
        "p": 45,
        "y": "g"
    },
    {
        "n": "秀峰",
        "i": 450302,
        "p": 4503,
        "y": "x"
    },
    {
        "n": "叠彩",
        "i": 450303,
        "p": 4503,
        "y": "d"
    },
    {
        "n": "象山",
        "i": 450304,
        "p": 4503,
        "y": "x"
    },
    {
        "n": "七星",
        "i": 450305,
        "p": 4503,
        "y": "q"
    },
    {
        "n": "雁山",
        "i": 450311,
        "p": 4503,
        "y": "y"
    },
    {
        "n": "临桂",
        "i": 450312,
        "p": 4503,
        "y": "l"
    },
    {
        "n": "阳朔",
        "i": 450321,
        "p": 4503,
        "y": "y"
    },
    {
        "n": "灵川",
        "i": 450323,
        "p": 4503,
        "y": "l"
    },
    {
        "n": "全州",
        "i": 450324,
        "p": 4503,
        "y": "q"
    },
    {
        "n": "兴安",
        "i": 450325,
        "p": 4503,
        "y": "x"
    },
    {
        "n": "永福",
        "i": 450326,
        "p": 4503,
        "y": "y"
    },
    {
        "n": "灌阳",
        "i": 450327,
        "p": 4503,
        "y": "g"
    },
    {
        "n": "龙胜",
        "i": 450328,
        "p": 4503,
        "y": "l"
    },
    {
        "n": "资源",
        "i": 450329,
        "p": 4503,
        "y": "z"
    },
    {
        "n": "平乐",
        "i": 450330,
        "p": 4503,
        "y": "p"
    },
    {
        "n": "恭城",
        "i": 450332,
        "p": 4503,
        "y": "g"
    },
    {
        "n": "荔浦",
        "i": 450381,
        "p": 4503,
        "y": "l"
    },
    {
        "n": "梧州",
        "i": 4504,
        "p": 45,
        "y": "w"
    },
    {
        "n": "万秀",
        "i": 450403,
        "p": 4504,
        "y": "w"
    },
    {
        "n": "长洲",
        "i": 450405,
        "p": 4504,
        "y": "c"
    },
    {
        "n": "龙圩",
        "i": 450406,
        "p": 4504,
        "y": "l"
    },
    {
        "n": "苍梧",
        "i": 450421,
        "p": 4504,
        "y": "c"
    },
    {
        "n": "藤县",
        "i": 450422,
        "p": 4504,
        "y": "t"
    },
    {
        "n": "蒙山",
        "i": 450423,
        "p": 4504,
        "y": "m"
    },
    {
        "n": "岑溪",
        "i": 450481,
        "p": 4504,
        "y": "c"
    },
    {
        "n": "北海",
        "i": 4505,
        "p": 45,
        "y": "b"
    },
    {
        "n": "海城",
        "i": 450502,
        "p": 4505,
        "y": "h"
    },
    {
        "n": "银海",
        "i": 450503,
        "p": 4505,
        "y": "y"
    },
    {
        "n": "铁山港",
        "i": 450512,
        "p": 4505,
        "y": "t"
    },
    {
        "n": "合浦",
        "i": 450521,
        "p": 4505,
        "y": "h"
    },
    {
        "n": "防城港",
        "i": 4506,
        "p": 45,
        "y": "f"
    },
    {
        "n": "港口",
        "i": 450602,
        "p": 4506,
        "y": "g"
    },
    {
        "n": "防城",
        "i": 450603,
        "p": 4506,
        "y": "f"
    },
    {
        "n": "上思",
        "i": 450621,
        "p": 4506,
        "y": "s"
    },
    {
        "n": "东兴",
        "i": 450681,
        "p": 4506,
        "y": "d"
    },
    {
        "n": "钦州",
        "i": 4507,
        "p": 45,
        "y": "q"
    },
    {
        "n": "钦南",
        "i": 450702,
        "p": 4507,
        "y": "q"
    },
    {
        "n": "钦北",
        "i": 450703,
        "p": 4507,
        "y": "q"
    },
    {
        "n": "灵山",
        "i": 450721,
        "p": 4507,
        "y": "l"
    },
    {
        "n": "浦北",
        "i": 450722,
        "p": 4507,
        "y": "p"
    },
    {
        "n": "贵港",
        "i": 4508,
        "p": 45,
        "y": "g"
    },
    {
        "n": "港北",
        "i": 450802,
        "p": 4508,
        "y": "g"
    },
    {
        "n": "港南",
        "i": 450803,
        "p": 4508,
        "y": "g"
    },
    {
        "n": "覃塘",
        "i": 450804,
        "p": 4508,
        "y": "q"
    },
    {
        "n": "平南",
        "i": 450821,
        "p": 4508,
        "y": "p"
    },
    {
        "n": "桂平",
        "i": 450881,
        "p": 4508,
        "y": "g"
    },
    {
        "n": "玉林",
        "i": 4509,
        "p": 45,
        "y": "y"
    },
    {
        "n": "玉州",
        "i": 450902,
        "p": 4509,
        "y": "y"
    },
    {
        "n": "福绵",
        "i": 450903,
        "p": 4509,
        "y": "f"
    },
    {
        "n": "容县",
        "i": 450921,
        "p": 4509,
        "y": "r"
    },
    {
        "n": "陆川",
        "i": 450922,
        "p": 4509,
        "y": "l"
    },
    {
        "n": "博白",
        "i": 450923,
        "p": 4509,
        "y": "b"
    },
    {
        "n": "兴业",
        "i": 450924,
        "p": 4509,
        "y": "x"
    },
    {
        "n": "北流",
        "i": 450981,
        "p": 4509,
        "y": "b"
    },
    {
        "n": "百色",
        "i": 4510,
        "p": 45,
        "y": "b"
    },
    {
        "n": "右江",
        "i": 451002,
        "p": 4510,
        "y": "y"
    },
    {
        "n": "田阳",
        "i": 451003,
        "p": 4510,
        "y": "t"
    },
    {
        "n": "田东",
        "i": 451022,
        "p": 4510,
        "y": "t"
    },
    {
        "n": "德保",
        "i": 451024,
        "p": 4510,
        "y": "d"
    },
    {
        "n": "那坡",
        "i": 451026,
        "p": 4510,
        "y": "n"
    },
    {
        "n": "凌云",
        "i": 451027,
        "p": 4510,
        "y": "l"
    },
    {
        "n": "乐业",
        "i": 451028,
        "p": 4510,
        "y": "l"
    },
    {
        "n": "田林",
        "i": 451029,
        "p": 4510,
        "y": "t"
    },
    {
        "n": "西林",
        "i": 451030,
        "p": 4510,
        "y": "x"
    },
    {
        "n": "隆林",
        "i": 451031,
        "p": 4510,
        "y": "l"
    },
    {
        "n": "靖西",
        "i": 451081,
        "p": 4510,
        "y": "j"
    },
    {
        "n": "平果",
        "i": 451082,
        "p": 4510,
        "y": "p"
    },
    {
        "n": "贺州",
        "i": 4511,
        "p": 45,
        "y": "h"
    },
    {
        "n": "八步",
        "i": 451102,
        "p": 4511,
        "y": "b"
    },
    {
        "n": "平桂",
        "i": 451103,
        "p": 4511,
        "y": "p"
    },
    {
        "n": "昭平",
        "i": 451121,
        "p": 4511,
        "y": "z"
    },
    {
        "n": "钟山",
        "i": 451122,
        "p": 4511,
        "y": "z"
    },
    {
        "n": "富川",
        "i": 451123,
        "p": 4511,
        "y": "f"
    },
    {
        "n": "河池",
        "i": 4512,
        "p": 45,
        "y": "h"
    },
    {
        "n": "金城江",
        "i": 451202,
        "p": 4512,
        "y": "j"
    },
    {
        "n": "宜州",
        "i": 451203,
        "p": 4512,
        "y": "y"
    },
    {
        "n": "南丹",
        "i": 451221,
        "p": 4512,
        "y": "n"
    },
    {
        "n": "天峨",
        "i": 451222,
        "p": 4512,
        "y": "t"
    },
    {
        "n": "凤山",
        "i": 451223,
        "p": 4512,
        "y": "f"
    },
    {
        "n": "东兰",
        "i": 451224,
        "p": 4512,
        "y": "d"
    },
    {
        "n": "罗城",
        "i": 451225,
        "p": 4512,
        "y": "l"
    },
    {
        "n": "环江",
        "i": 451226,
        "p": 4512,
        "y": "h"
    },
    {
        "n": "巴马",
        "i": 451227,
        "p": 4512,
        "y": "b"
    },
    {
        "n": "都安",
        "i": 451228,
        "p": 4512,
        "y": "d"
    },
    {
        "n": "大化",
        "i": 451229,
        "p": 4512,
        "y": "d"
    },
    {
        "n": "来宾",
        "i": 4513,
        "p": 45,
        "y": "l"
    },
    {
        "n": "兴宾",
        "i": 451302,
        "p": 4513,
        "y": "x"
    },
    {
        "n": "忻城",
        "i": 451321,
        "p": 4513,
        "y": "x"
    },
    {
        "n": "象州",
        "i": 451322,
        "p": 4513,
        "y": "x"
    },
    {
        "n": "武宣",
        "i": 451323,
        "p": 4513,
        "y": "w"
    },
    {
        "n": "金秀",
        "i": 451324,
        "p": 4513,
        "y": "j"
    },
    {
        "n": "合山",
        "i": 451381,
        "p": 4513,
        "y": "h"
    },
    {
        "n": "崇左",
        "i": 4514,
        "p": 45,
        "y": "c"
    },
    {
        "n": "江州",
        "i": 451402,
        "p": 4514,
        "y": "j"
    },
    {
        "n": "扶绥",
        "i": 451421,
        "p": 4514,
        "y": "f"
    },
    {
        "n": "宁明",
        "i": 451422,
        "p": 4514,
        "y": "n"
    },
    {
        "n": "龙州",
        "i": 451423,
        "p": 4514,
        "y": "l"
    },
    {
        "n": "大新",
        "i": 451424,
        "p": 4514,
        "y": "d"
    },
    {
        "n": "天等",
        "i": 451425,
        "p": 4514,
        "y": "t"
    },
    {
        "n": "凭祥",
        "i": 451481,
        "p": 4514,
        "y": "p"
    },
    {
        "n": "海南",
        "i": 46,
        "p": 0,
        "y": "h"
    },
    {
        "n": "海口",
        "i": 4601,
        "p": 46,
        "y": "h"
    },
    {
        "n": "秀英",
        "i": 460105,
        "p": 4601,
        "y": "x"
    },
    {
        "n": "龙华",
        "i": 460106,
        "p": 4601,
        "y": "l"
    },
    {
        "n": "琼山",
        "i": 460107,
        "p": 4601,
        "y": "q"
    },
    {
        "n": "美兰",
        "i": 460108,
        "p": 4601,
        "y": "m"
    },
    {
        "n": "三亚",
        "i": 4602,
        "p": 46,
        "y": "s"
    },
    {
        "n": "海棠",
        "i": 460202,
        "p": 4602,
        "y": "h"
    },
    {
        "n": "吉阳",
        "i": 460203,
        "p": 4602,
        "y": "j"
    },
    {
        "n": "天涯",
        "i": 460204,
        "p": 4602,
        "y": "t"
    },
    {
        "n": "崖州",
        "i": 460205,
        "p": 4602,
        "y": "y"
    },
    {
        "n": "三沙",
        "i": 4603,
        "p": 46,
        "y": "s"
    },
    {
        "n": "西沙",
        "i": 460301,
        "p": 4603,
        "y": "x"
    },
    {
        "n": "南沙",
        "i": 460302,
        "p": 4603,
        "y": "n"
    },
    {
        "n": "儋州",
        "i": 460400,
        "p": 46,
        "y": "d"
    },
    {
        "n": "那大",
        "i": 460400100,
        "p": 460400,
        "y": "n"
    },
    {
        "n": "和庆",
        "i": 460400101,
        "p": 460400,
        "y": "h"
    },
    {
        "n": "南丰",
        "i": 460400102,
        "p": 460400,
        "y": "n"
    },
    {
        "n": "大成",
        "i": 460400103,
        "p": 460400,
        "y": "d"
    },
    {
        "n": "雅星",
        "i": 460400104,
        "p": 460400,
        "y": "y"
    },
    {
        "n": "兰洋",
        "i": 460400105,
        "p": 460400,
        "y": "l"
    },
    {
        "n": "光村",
        "i": 460400106,
        "p": 460400,
        "y": "g"
    },
    {
        "n": "木棠",
        "i": 460400107,
        "p": 460400,
        "y": "m"
    },
    {
        "n": "海头",
        "i": 460400108,
        "p": 460400,
        "y": "h"
    },
    {
        "n": "峨蔓",
        "i": 460400109,
        "p": 460400,
        "y": "e"
    },
    {
        "n": "三都",
        "i": 460400110,
        "p": 460400,
        "y": "s"
    },
    {
        "n": "王五",
        "i": 460400111,
        "p": 460400,
        "y": "w"
    },
    {
        "n": "白马井",
        "i": 460400112,
        "p": 460400,
        "y": "b"
    },
    {
        "n": "中和",
        "i": 460400113,
        "p": 460400,
        "y": "z"
    },
    {
        "n": "排浦",
        "i": 460400114,
        "p": 460400,
        "y": "p"
    },
    {
        "n": "东成",
        "i": 460400115,
        "p": 460400,
        "y": "d"
    },
    {
        "n": "新州",
        "i": 460400116,
        "p": 460400,
        "y": "x"
    },
    {
        "n": "国营西培农场",
        "i": 460400400,
        "p": 460400,
        "y": "g"
    },
    {
        "n": "国营西联农场",
        "i": 460400404,
        "p": 460400,
        "y": "g"
    },
    {
        "n": "国营蓝洋农场",
        "i": 460400405,
        "p": 460400,
        "y": "g"
    },
    {
        "n": "国营八一农场",
        "i": 460400407,
        "p": 460400,
        "y": "g"
    },
    {
        "n": "洋浦经济开发区",
        "i": 460400499,
        "p": 460400,
        "y": "y"
    },
    {
        "n": "华南热作学院",
        "i": 460400500,
        "p": 460400,
        "y": "h"
    },
    {
        "n": "红岭农场",
        "i": 460400950,
        "p": 460400,
        "y": "h"
    },
    {
        "n": "五指山",
        "i": 469001000,
        "p": 46,
        "y": "w"
    },
    {
        "n": "通什",
        "i": 469001100,
        "p": 469001000,
        "y": "t"
    },
    {
        "n": "南圣",
        "i": 469001101,
        "p": 469001000,
        "y": "n"
    },
    {
        "n": "毛阳",
        "i": 469001102,
        "p": 469001000,
        "y": "m"
    },
    {
        "n": "番阳",
        "i": 469001103,
        "p": 469001000,
        "y": "f"
    },
    {
        "n": "畅好",
        "i": 469001200,
        "p": 469001000,
        "y": "c"
    },
    {
        "n": "毛道",
        "i": 469001201,
        "p": 469001000,
        "y": "m"
    },
    {
        "n": "水满",
        "i": 469001202,
        "p": 469001000,
        "y": "s"
    },
    {
        "n": "国营畅好农场",
        "i": 469001400,
        "p": 469001000,
        "y": "g"
    },
    {
        "n": "琼海",
        "i": 469002000,
        "p": 46,
        "y": "q"
    },
    {
        "n": "嘉积",
        "i": 469002100,
        "p": 469002000,
        "y": "j"
    },
    {
        "n": "万泉",
        "i": 469002101,
        "p": 469002000,
        "y": "w"
    },
    {
        "n": "石壁",
        "i": 469002102,
        "p": 469002000,
        "y": "s"
    },
    {
        "n": "中原",
        "i": 469002103,
        "p": 469002000,
        "y": "z"
    },
    {
        "n": "博鳌",
        "i": 469002104,
        "p": 469002000,
        "y": "b"
    },
    {
        "n": "阳江",
        "i": 469002105,
        "p": 469002000,
        "y": "y"
    },
    {
        "n": "龙江",
        "i": 469002106,
        "p": 469002000,
        "y": "l"
    },
    {
        "n": "潭门",
        "i": 469002107,
        "p": 469002000,
        "y": "t"
    },
    {
        "n": "塔洋",
        "i": 469002108,
        "p": 469002000,
        "y": "t"
    },
    {
        "n": "长坡",
        "i": 469002109,
        "p": 469002000,
        "y": "c"
    },
    {
        "n": "大路",
        "i": 469002110,
        "p": 469002000,
        "y": "d"
    },
    {
        "n": "会山",
        "i": 469002111,
        "p": 469002000,
        "y": "h"
    },
    {
        "n": "东太农场",
        "i": 469002400,
        "p": 469002000,
        "y": "d"
    },
    {
        "n": "南俸农场",
        "i": 469002401,
        "p": 469002000,
        "y": "n"
    },
    {
        "n": "东红农场",
        "i": 469002402,
        "p": 469002000,
        "y": "d"
    },
    {
        "n": "彬村山华侨农场",
        "i": 469002500,
        "p": 469002000,
        "y": "b"
    },
    {
        "n": "东平农场",
        "i": 469002953,
        "p": 469002000,
        "y": "d"
    },
    {
        "n": "文昌",
        "i": 469005000,
        "p": 46,
        "y": "w"
    },
    {
        "n": "文城",
        "i": 469005100,
        "p": 469005000,
        "y": "w"
    },
    {
        "n": "重兴",
        "i": 469005101,
        "p": 469005000,
        "y": "z"
    },
    {
        "n": "蓬莱",
        "i": 469005102,
        "p": 469005000,
        "y": "p"
    },
    {
        "n": "会文",
        "i": 469005103,
        "p": 469005000,
        "y": "h"
    },
    {
        "n": "东路",
        "i": 469005104,
        "p": 469005000,
        "y": "d"
    },
    {
        "n": "潭牛",
        "i": 469005105,
        "p": 469005000,
        "y": "t"
    },
    {
        "n": "东阁",
        "i": 469005106,
        "p": 469005000,
        "y": "d"
    },
    {
        "n": "文教",
        "i": 469005107,
        "p": 469005000,
        "y": "w"
    },
    {
        "n": "东郊",
        "i": 469005108,
        "p": 469005000,
        "y": "d"
    },
    {
        "n": "龙楼",
        "i": 469005109,
        "p": 469005000,
        "y": "l"
    },
    {
        "n": "昌洒",
        "i": 469005110,
        "p": 469005000,
        "y": "c"
    },
    {
        "n": "翁田",
        "i": 469005111,
        "p": 469005000,
        "y": "w"
    },
    {
        "n": "抱罗",
        "i": 469005112,
        "p": 469005000,
        "y": "b"
    },
    {
        "n": "冯坡",
        "i": 469005113,
        "p": 469005000,
        "y": "f"
    },
    {
        "n": "锦山",
        "i": 469005114,
        "p": 469005000,
        "y": "j"
    },
    {
        "n": "铺前",
        "i": 469005115,
        "p": 469005000,
        "y": "p"
    },
    {
        "n": "公坡",
        "i": 469005116,
        "p": 469005000,
        "y": "g"
    },
    {
        "n": "国营南阳农场",
        "i": 469005401,
        "p": 469005000,
        "y": "g"
    },
    {
        "n": "国营罗豆农场",
        "i": 469005402,
        "p": 469005000,
        "y": "g"
    },
    {
        "n": "万宁",
        "i": 469006000,
        "p": 46,
        "y": "w"
    },
    {
        "n": "万城",
        "i": 469006100,
        "p": 469006000,
        "y": "w"
    },
    {
        "n": "龙滚",
        "i": 469006101,
        "p": 469006000,
        "y": "l"
    },
    {
        "n": "和乐",
        "i": 469006102,
        "p": 469006000,
        "y": "h"
    },
    {
        "n": "后安",
        "i": 469006103,
        "p": 469006000,
        "y": "h"
    },
    {
        "n": "大茂",
        "i": 469006104,
        "p": 469006000,
        "y": "d"
    },
    {
        "n": "东澳",
        "i": 469006105,
        "p": 469006000,
        "y": "d"
    },
    {
        "n": "礼纪",
        "i": 469006106,
        "p": 469006000,
        "y": "l"
    },
    {
        "n": "长丰",
        "i": 469006107,
        "p": 469006000,
        "y": "c"
    },
    {
        "n": "山根",
        "i": 469006108,
        "p": 469006000,
        "y": "s"
    },
    {
        "n": "北大",
        "i": 469006109,
        "p": 469006000,
        "y": "b"
    },
    {
        "n": "南桥",
        "i": 469006110,
        "p": 469006000,
        "y": "n"
    },
    {
        "n": "三更罗",
        "i": 469006111,
        "p": 469006000,
        "y": "s"
    },
    {
        "n": "国营东兴农场",
        "i": 469006400,
        "p": 469006000,
        "y": "g"
    },
    {
        "n": "兴隆华侨农场",
        "i": 469006500,
        "p": 469006000,
        "y": "x"
    },
    {
        "n": "地方国营六连林场",
        "i": 469006501,
        "p": 469006000,
        "y": "d"
    },
    {
        "n": "东岭农场",
        "i": 469006951,
        "p": 469006000,
        "y": "d"
    },
    {
        "n": "东方",
        "i": 469007000,
        "p": 46,
        "y": "d"
    },
    {
        "n": "八所",
        "i": 469007100,
        "p": 469007000,
        "y": "b"
    },
    {
        "n": "东河",
        "i": 469007101,
        "p": 469007000,
        "y": "d"
    },
    {
        "n": "大田",
        "i": 469007102,
        "p": 469007000,
        "y": "d"
    },
    {
        "n": "感城",
        "i": 469007103,
        "p": 469007000,
        "y": "g"
    },
    {
        "n": "板桥",
        "i": 469007104,
        "p": 469007000,
        "y": "b"
    },
    {
        "n": "三家",
        "i": 469007105,
        "p": 469007000,
        "y": "s"
    },
    {
        "n": "四更",
        "i": 469007106,
        "p": 469007000,
        "y": "s"
    },
    {
        "n": "新龙",
        "i": 469007107,
        "p": 469007000,
        "y": "x"
    },
    {
        "n": "天安",
        "i": 469007200,
        "p": 469007000,
        "y": "t"
    },
    {
        "n": "江边",
        "i": 469007201,
        "p": 469007000,
        "y": "j"
    },
    {
        "n": "国营广坝农场",
        "i": 469007400,
        "p": 469007000,
        "y": "g"
    },
    {
        "n": "东方华侨农场",
        "i": 469007500,
        "p": 469007000,
        "y": "d"
    },
    {
        "n": "东方农场",
        "i": 469007950,
        "p": 469007000,
        "y": "d"
    },
    {
        "n": "定安",
        "i": 469021000,
        "p": 46,
        "y": "d"
    },
    {
        "n": "定城",
        "i": 469021100,
        "p": 469021000,
        "y": "d"
    },
    {
        "n": "新竹",
        "i": 469021101,
        "p": 469021000,
        "y": "x"
    },
    {
        "n": "龙湖",
        "i": 469021102,
        "p": 469021000,
        "y": "l"
    },
    {
        "n": "黄竹",
        "i": 469021103,
        "p": 469021000,
        "y": "h"
    },
    {
        "n": "雷鸣",
        "i": 469021104,
        "p": 469021000,
        "y": "l"
    },
    {
        "n": "龙门",
        "i": 469021105,
        "p": 469021000,
        "y": "l"
    },
    {
        "n": "龙河",
        "i": 469021106,
        "p": 469021000,
        "y": "l"
    },
    {
        "n": "岭口",
        "i": 469021107,
        "p": 469021000,
        "y": "l"
    },
    {
        "n": "翰林",
        "i": 469021108,
        "p": 469021000,
        "y": "h"
    },
    {
        "n": "富文",
        "i": 469021109,
        "p": 469021000,
        "y": "f"
    },
    {
        "n": "国营中瑞农场",
        "i": 469021400,
        "p": 469021000,
        "y": "g"
    },
    {
        "n": "国营南海农场",
        "i": 469021401,
        "p": 469021000,
        "y": "g"
    },
    {
        "n": "国营金鸡岭农场",
        "i": 469021402,
        "p": 469021000,
        "y": "g"
    },
    {
        "n": "国营东升农场",
        "i": 469021403,
        "p": 469021000,
        "y": "g"
    },
    {
        "n": "屯昌",
        "i": 469022000,
        "p": 46,
        "y": "t"
    },
    {
        "n": "屯城",
        "i": 469022100,
        "p": 469022000,
        "y": "t"
    },
    {
        "n": "新兴",
        "i": 469022101,
        "p": 469022000,
        "y": "x"
    },
    {
        "n": "枫木",
        "i": 469022102,
        "p": 469022000,
        "y": "f"
    },
    {
        "n": "乌坡",
        "i": 469022103,
        "p": 469022000,
        "y": "w"
    },
    {
        "n": "南吕",
        "i": 469022104,
        "p": 469022000,
        "y": "n"
    },
    {
        "n": "南坤",
        "i": 469022105,
        "p": 469022000,
        "y": "n"
    },
    {
        "n": "坡心",
        "i": 469022106,
        "p": 469022000,
        "y": "p"
    },
    {
        "n": "西昌",
        "i": 469022107,
        "p": 469022000,
        "y": "x"
    },
    {
        "n": "国营中瑞农场",
        "i": 469022400,
        "p": 469022000,
        "y": "g"
    },
    {
        "n": "国营中坤农场",
        "i": 469022401,
        "p": 469022000,
        "y": "g"
    },
    {
        "n": "国营中建农场",
        "i": 469022950,
        "p": 469022000,
        "y": "g"
    },
    {
        "n": "晨星农场",
        "i": 469022951,
        "p": 469022000,
        "y": "c"
    },
    {
        "n": "黄岭农场",
        "i": 469022952,
        "p": 469022000,
        "y": "h"
    },
    {
        "n": "广青农场",
        "i": 469022954,
        "p": 469022000,
        "y": "g"
    },
    {
        "n": "澄迈",
        "i": 469023000,
        "p": 46,
        "y": "c"
    },
    {
        "n": "金江",
        "i": 469023100,
        "p": 469023000,
        "y": "j"
    },
    {
        "n": "老城",
        "i": 469023101,
        "p": 469023000,
        "y": "l"
    },
    {
        "n": "瑞溪",
        "i": 469023102,
        "p": 469023000,
        "y": "r"
    },
    {
        "n": "永发",
        "i": 469023103,
        "p": 469023000,
        "y": "y"
    },
    {
        "n": "加乐",
        "i": 469023104,
        "p": 469023000,
        "y": "j"
    },
    {
        "n": "文儒",
        "i": 469023105,
        "p": 469023000,
        "y": "w"
    },
    {
        "n": "中兴",
        "i": 469023106,
        "p": 469023000,
        "y": "z"
    },
    {
        "n": "仁兴",
        "i": 469023107,
        "p": 469023000,
        "y": "r"
    },
    {
        "n": "福山",
        "i": 469023108,
        "p": 469023000,
        "y": "f"
    },
    {
        "n": "桥头",
        "i": 469023109,
        "p": 469023000,
        "y": "q"
    },
    {
        "n": "大丰",
        "i": 469023110,
        "p": 469023000,
        "y": "d"
    },
    {
        "n": "国营红光农场",
        "i": 469023400,
        "p": 469023000,
        "y": "g"
    },
    {
        "n": "红岗农场",
        "i": 469023401,
        "p": 469023000,
        "y": "h"
    },
    {
        "n": "国营西达农场",
        "i": 469023402,
        "p": 469023000,
        "y": "g"
    },
    {
        "n": "国营金安农场",
        "i": 469023405,
        "p": 469023000,
        "y": "g"
    },
    {
        "n": "临高",
        "i": 469024000,
        "p": 46,
        "y": "l"
    },
    {
        "n": "临城",
        "i": 469024100,
        "p": 469024000,
        "y": "l"
    },
    {
        "n": "波莲",
        "i": 469024101,
        "p": 469024000,
        "y": "b"
    },
    {
        "n": "东英",
        "i": 469024102,
        "p": 469024000,
        "y": "d"
    },
    {
        "n": "博厚",
        "i": 469024103,
        "p": 469024000,
        "y": "b"
    },
    {
        "n": "皇桐",
        "i": 469024104,
        "p": 469024000,
        "y": "h"
    },
    {
        "n": "多文",
        "i": 469024105,
        "p": 469024000,
        "y": "d"
    },
    {
        "n": "和舍",
        "i": 469024106,
        "p": 469024000,
        "y": "h"
    },
    {
        "n": "南宝",
        "i": 469024107,
        "p": 469024000,
        "y": "n"
    },
    {
        "n": "新盈",
        "i": 469024108,
        "p": 469024000,
        "y": "x"
    },
    {
        "n": "调楼",
        "i": 469024109,
        "p": 469024000,
        "y": "t"
    },
    {
        "n": "国营红华农场",
        "i": 469024400,
        "p": 469024000,
        "y": "g"
    },
    {
        "n": "国营加来农场",
        "i": 469024401,
        "p": 469024000,
        "y": "g"
    },
    {
        "n": "白沙",
        "i": 469025000,
        "p": 46,
        "y": "b"
    },
    {
        "n": "牙叉",
        "i": 469025100,
        "p": 469025000,
        "y": "y"
    },
    {
        "n": "七坊",
        "i": 469025101,
        "p": 469025000,
        "y": "q"
    },
    {
        "n": "邦溪",
        "i": 469025102,
        "p": 469025000,
        "y": "b"
    },
    {
        "n": "打安",
        "i": 469025103,
        "p": 469025000,
        "y": "d"
    },
    {
        "n": "细水",
        "i": 469025200,
        "p": 469025000,
        "y": "x"
    },
    {
        "n": "元门",
        "i": 469025201,
        "p": 469025000,
        "y": "y"
    },
    {
        "n": "南开",
        "i": 469025202,
        "p": 469025000,
        "y": "n"
    },
    {
        "n": "阜龙",
        "i": 469025203,
        "p": 469025000,
        "y": "f"
    },
    {
        "n": "青松",
        "i": 469025204,
        "p": 469025000,
        "y": "q"
    },
    {
        "n": "金波",
        "i": 469025205,
        "p": 469025000,
        "y": "j"
    },
    {
        "n": "荣邦",
        "i": 469025206,
        "p": 469025000,
        "y": "r"
    },
    {
        "n": "国营白沙农场",
        "i": 469025401,
        "p": 469025000,
        "y": "g"
    },
    {
        "n": "国营龙江农场",
        "i": 469025404,
        "p": 469025000,
        "y": "g"
    },
    {
        "n": "卫星农场",
        "i": 469025950,
        "p": 469025000,
        "y": "w"
    },
    {
        "n": "昌江",
        "i": 469026000,
        "p": 46,
        "y": "c"
    },
    {
        "n": "石碌",
        "i": 469026100,
        "p": 469026000,
        "y": "s"
    },
    {
        "n": "叉河",
        "i": 469026101,
        "p": 469026000,
        "y": "c"
    },
    {
        "n": "十月田",
        "i": 469026102,
        "p": 469026000,
        "y": "s"
    },
    {
        "n": "乌烈",
        "i": 469026103,
        "p": 469026000,
        "y": "w"
    },
    {
        "n": "昌化",
        "i": 469026104,
        "p": 469026000,
        "y": "c"
    },
    {
        "n": "海尾",
        "i": 469026105,
        "p": 469026000,
        "y": "h"
    },
    {
        "n": "七叉",
        "i": 469026106,
        "p": 469026000,
        "y": "q"
    },
    {
        "n": "王下",
        "i": 469026200,
        "p": 469026000,
        "y": "w"
    },
    {
        "n": "国营红林农场",
        "i": 469026401,
        "p": 469026000,
        "y": "g"
    },
    {
        "n": "国营霸王岭林场",
        "i": 469026500,
        "p": 469026000,
        "y": "g"
    },
    {
        "n": "乐东",
        "i": 469027000,
        "p": 46,
        "y": "l"
    },
    {
        "n": "抱由",
        "i": 469027100,
        "p": 469027000,
        "y": "b"
    },
    {
        "n": "万冲",
        "i": 469027101,
        "p": 469027000,
        "y": "w"
    },
    {
        "n": "大安",
        "i": 469027102,
        "p": 469027000,
        "y": "d"
    },
    {
        "n": "志仲",
        "i": 469027103,
        "p": 469027000,
        "y": "z"
    },
    {
        "n": "千家",
        "i": 469027104,
        "p": 469027000,
        "y": "q"
    },
    {
        "n": "九所",
        "i": 469027105,
        "p": 469027000,
        "y": "j"
    },
    {
        "n": "利国",
        "i": 469027106,
        "p": 469027000,
        "y": "l"
    },
    {
        "n": "黄流",
        "i": 469027107,
        "p": 469027000,
        "y": "h"
    },
    {
        "n": "佛罗",
        "i": 469027108,
        "p": 469027000,
        "y": "f"
    },
    {
        "n": "尖峰",
        "i": 469027109,
        "p": 469027000,
        "y": "j"
    },
    {
        "n": "莺歌海",
        "i": 469027110,
        "p": 469027000,
        "y": "y"
    },
    {
        "n": "国营山荣农场",
        "i": 469027401,
        "p": 469027000,
        "y": "g"
    },
    {
        "n": "国营乐光农场",
        "i": 469027402,
        "p": 469027000,
        "y": "g"
    },
    {
        "n": "国营保国农场",
        "i": 469027405,
        "p": 469027000,
        "y": "g"
    },
    {
        "n": "福报农场",
        "i": 469027951,
        "p": 469027000,
        "y": "f"
    },
    {
        "n": "陵水",
        "i": 469028000,
        "p": 46,
        "y": "l"
    },
    {
        "n": "椰林",
        "i": 469028100,
        "p": 469028000,
        "y": "y"
    },
    {
        "n": "光坡",
        "i": 469028101,
        "p": 469028000,
        "y": "g"
    },
    {
        "n": "三才",
        "i": 469028102,
        "p": 469028000,
        "y": "s"
    },
    {
        "n": "英州",
        "i": 469028103,
        "p": 469028000,
        "y": "y"
    },
    {
        "n": "隆广",
        "i": 469028104,
        "p": 469028000,
        "y": "l"
    },
    {
        "n": "文罗",
        "i": 469028105,
        "p": 469028000,
        "y": "w"
    },
    {
        "n": "本号",
        "i": 469028106,
        "p": 469028000,
        "y": "b"
    },
    {
        "n": "新村",
        "i": 469028107,
        "p": 469028000,
        "y": "x"
    },
    {
        "n": "黎安",
        "i": 469028108,
        "p": 469028000,
        "y": "l"
    },
    {
        "n": "提蒙",
        "i": 469028200,
        "p": 469028000,
        "y": "t"
    },
    {
        "n": "群英",
        "i": 469028201,
        "p": 469028000,
        "y": "q"
    },
    {
        "n": "岭门农场",
        "i": 469028400,
        "p": 469028000,
        "y": "l"
    },
    {
        "n": "国营南平农场",
        "i": 469028401,
        "p": 469028000,
        "y": "g"
    },
    {
        "n": "保亭",
        "i": 469029000,
        "p": 46,
        "y": "b"
    },
    {
        "n": "保城",
        "i": 469029100,
        "p": 469029000,
        "y": "b"
    },
    {
        "n": "什玲",
        "i": 469029101,
        "p": 469029000,
        "y": "s"
    },
    {
        "n": "加茂",
        "i": 469029102,
        "p": 469029000,
        "y": "j"
    },
    {
        "n": "响水",
        "i": 469029103,
        "p": 469029000,
        "y": "x"
    },
    {
        "n": "新政",
        "i": 469029104,
        "p": 469029000,
        "y": "x"
    },
    {
        "n": "三道",
        "i": 469029105,
        "p": 469029000,
        "y": "s"
    },
    {
        "n": "六弓",
        "i": 469029200,
        "p": 469029000,
        "y": "l"
    },
    {
        "n": "南林",
        "i": 469029201,
        "p": 469029000,
        "y": "n"
    },
    {
        "n": "毛感",
        "i": 469029202,
        "p": 469029000,
        "y": "m"
    },
    {
        "n": "新星农场",
        "i": 469029401,
        "p": 469029000,
        "y": "x"
    },
    {
        "n": "海南保亭热带作物研究所",
        "i": 469029402,
        "p": 469029000,
        "y": "h"
    },
    {
        "n": "国营金江农场",
        "i": 469029403,
        "p": 469029000,
        "y": "g"
    },
    {
        "n": "南茂农场",
        "i": 469029950,
        "p": 469029000,
        "y": "n"
    },
    {
        "n": "通什茶场",
        "i": 469029952,
        "p": 469029000,
        "y": "t"
    },
    {
        "n": "琼中",
        "i": 469030000,
        "p": 46,
        "y": "q"
    },
    {
        "n": "营根",
        "i": 469030100,
        "p": 469030000,
        "y": "y"
    },
    {
        "n": "湾岭",
        "i": 469030101,
        "p": 469030000,
        "y": "w"
    },
    {
        "n": "黎母山",
        "i": 469030102,
        "p": 469030000,
        "y": "l"
    },
    {
        "n": "和平",
        "i": 469030103,
        "p": 469030000,
        "y": "h"
    },
    {
        "n": "长征",
        "i": 469030104,
        "p": 469030000,
        "y": "c"
    },
    {
        "n": "红毛",
        "i": 469030105,
        "p": 469030000,
        "y": "h"
    },
    {
        "n": "中平",
        "i": 469030106,
        "p": 469030000,
        "y": "z"
    },
    {
        "n": "吊罗山",
        "i": 469030200,
        "p": 469030000,
        "y": "d"
    },
    {
        "n": "上安",
        "i": 469030201,
        "p": 469030000,
        "y": "s"
    },
    {
        "n": "什运",
        "i": 469030202,
        "p": 469030000,
        "y": "s"
    },
    {
        "n": "阳江农场",
        "i": 469030402,
        "p": 469030000,
        "y": "y"
    },
    {
        "n": "乌石农场",
        "i": 469030403,
        "p": 469030000,
        "y": "w"
    },
    {
        "n": "岭头茶场",
        "i": 469030950,
        "p": 469030000,
        "y": "l"
    },
    {
        "n": "南方农场",
        "i": 469030951,
        "p": 469030000,
        "y": "n"
    },
    {
        "n": "重庆",
        "i": 50,
        "p": 0,
        "y": "c"
    },
    {
        "n": "重庆城区",
        "i": 5001,
        "p": 50,
        "y": "c"
    },
    {
        "n": "万州",
        "i": 500101,
        "p": 5001,
        "y": "w"
    },
    {
        "n": "涪陵",
        "i": 500102,
        "p": 5001,
        "y": "f"
    },
    {
        "n": "渝中",
        "i": 500103,
        "p": 5001,
        "y": "y"
    },
    {
        "n": "大渡口",
        "i": 500104,
        "p": 5001,
        "y": "d"
    },
    {
        "n": "江北",
        "i": 500105,
        "p": 5001,
        "y": "j"
    },
    {
        "n": "沙坪坝",
        "i": 500106,
        "p": 5001,
        "y": "s"
    },
    {
        "n": "九龙坡",
        "i": 500107,
        "p": 5001,
        "y": "j"
    },
    {
        "n": "南岸",
        "i": 500108,
        "p": 5001,
        "y": "n"
    },
    {
        "n": "北碚",
        "i": 500109,
        "p": 5001,
        "y": "b"
    },
    {
        "n": "綦江",
        "i": 500110,
        "p": 5001,
        "y": "q"
    },
    {
        "n": "大足",
        "i": 500111,
        "p": 5001,
        "y": "d"
    },
    {
        "n": "渝北",
        "i": 500112,
        "p": 5001,
        "y": "y"
    },
    {
        "n": "巴南",
        "i": 500113,
        "p": 5001,
        "y": "b"
    },
    {
        "n": "黔江",
        "i": 500114,
        "p": 5001,
        "y": "q"
    },
    {
        "n": "长寿",
        "i": 500115,
        "p": 5001,
        "y": "c"
    },
    {
        "n": "江津",
        "i": 500116,
        "p": 5001,
        "y": "j"
    },
    {
        "n": "合川",
        "i": 500117,
        "p": 5001,
        "y": "h"
    },
    {
        "n": "永川",
        "i": 500118,
        "p": 5001,
        "y": "y"
    },
    {
        "n": "南川",
        "i": 500119,
        "p": 5001,
        "y": "n"
    },
    {
        "n": "璧山",
        "i": 500120,
        "p": 5001,
        "y": "b"
    },
    {
        "n": "铜梁",
        "i": 500151,
        "p": 5001,
        "y": "t"
    },
    {
        "n": "潼南",
        "i": 500152,
        "p": 5001,
        "y": "t"
    },
    {
        "n": "荣昌",
        "i": 500153,
        "p": 5001,
        "y": "r"
    },
    {
        "n": "开州",
        "i": 500154,
        "p": 5001,
        "y": "k"
    },
    {
        "n": "梁平",
        "i": 500155,
        "p": 5001,
        "y": "l"
    },
    {
        "n": "武隆",
        "i": 500156,
        "p": 5001,
        "y": "w"
    },
    {
        "n": "重庆郊县",
        "i": 5002,
        "p": 50,
        "y": "c"
    },
    {
        "n": "城口",
        "i": 500229,
        "p": 5002,
        "y": "c"
    },
    {
        "n": "丰都",
        "i": 500230,
        "p": 5002,
        "y": "f"
    },
    {
        "n": "垫江",
        "i": 500231,
        "p": 5002,
        "y": "d"
    },
    {
        "n": "忠县",
        "i": 500233,
        "p": 5002,
        "y": "z"
    },
    {
        "n": "云阳",
        "i": 500235,
        "p": 5002,
        "y": "y"
    },
    {
        "n": "奉节",
        "i": 500236,
        "p": 5002,
        "y": "f"
    },
    {
        "n": "巫山",
        "i": 500237,
        "p": 5002,
        "y": "w"
    },
    {
        "n": "巫溪",
        "i": 500238,
        "p": 5002,
        "y": "w"
    },
    {
        "n": "石柱",
        "i": 500240,
        "p": 5002,
        "y": "s"
    },
    {
        "n": "秀山",
        "i": 500241,
        "p": 5002,
        "y": "x"
    },
    {
        "n": "酉阳",
        "i": 500242,
        "p": 5002,
        "y": "y"
    },
    {
        "n": "彭水",
        "i": 500243,
        "p": 5002,
        "y": "p"
    },
    {
        "n": "四川",
        "i": 51,
        "p": 0,
        "y": "s"
    },
    {
        "n": "成都",
        "i": 5101,
        "p": 51,
        "y": "c"
    },
    {
        "n": "锦江",
        "i": 510104,
        "p": 5101,
        "y": "j"
    },
    {
        "n": "青羊",
        "i": 510105,
        "p": 5101,
        "y": "q"
    },
    {
        "n": "金牛",
        "i": 510106,
        "p": 5101,
        "y": "j"
    },
    {
        "n": "武侯",
        "i": 510107,
        "p": 5101,
        "y": "w"
    },
    {
        "n": "成华",
        "i": 510108,
        "p": 5101,
        "y": "c"
    },
    {
        "n": "龙泉驿",
        "i": 510112,
        "p": 5101,
        "y": "l"
    },
    {
        "n": "青白江",
        "i": 510113,
        "p": 5101,
        "y": "q"
    },
    {
        "n": "新都",
        "i": 510114,
        "p": 5101,
        "y": "x"
    },
    {
        "n": "温江",
        "i": 510115,
        "p": 5101,
        "y": "w"
    },
    {
        "n": "双流",
        "i": 510116,
        "p": 5101,
        "y": "s"
    },
    {
        "n": "郫都",
        "i": 510117,
        "p": 5101,
        "y": "p"
    },
    {
        "n": "金堂",
        "i": 510121,
        "p": 5101,
        "y": "j"
    },
    {
        "n": "大邑",
        "i": 510129,
        "p": 5101,
        "y": "d"
    },
    {
        "n": "蒲江",
        "i": 510131,
        "p": 5101,
        "y": "p"
    },
    {
        "n": "新津",
        "i": 510132,
        "p": 5101,
        "y": "x"
    },
    {
        "n": "都江堰",
        "i": 510181,
        "p": 5101,
        "y": "d"
    },
    {
        "n": "彭州",
        "i": 510182,
        "p": 5101,
        "y": "p"
    },
    {
        "n": "邛崃",
        "i": 510183,
        "p": 5101,
        "y": "q"
    },
    {
        "n": "崇州",
        "i": 510184,
        "p": 5101,
        "y": "c"
    },
    {
        "n": "简阳",
        "i": 510185,
        "p": 5101,
        "y": "j"
    },
    {
        "n": "自贡",
        "i": 5103,
        "p": 51,
        "y": "z"
    },
    {
        "n": "自流井",
        "i": 510302,
        "p": 5103,
        "y": "z"
    },
    {
        "n": "贡井",
        "i": 510303,
        "p": 5103,
        "y": "g"
    },
    {
        "n": "大安",
        "i": 510304,
        "p": 5103,
        "y": "d"
    },
    {
        "n": "沿滩",
        "i": 510311,
        "p": 5103,
        "y": "y"
    },
    {
        "n": "荣县",
        "i": 510321,
        "p": 5103,
        "y": "r"
    },
    {
        "n": "富顺",
        "i": 510322,
        "p": 5103,
        "y": "f"
    },
    {
        "n": "攀枝花",
        "i": 5104,
        "p": 51,
        "y": "p"
    },
    {
        "n": "东区",
        "i": 510402,
        "p": 5104,
        "y": "d"
    },
    {
        "n": "西区",
        "i": 510403,
        "p": 5104,
        "y": "x"
    },
    {
        "n": "仁和",
        "i": 510411,
        "p": 5104,
        "y": "r"
    },
    {
        "n": "米易",
        "i": 510421,
        "p": 5104,
        "y": "m"
    },
    {
        "n": "盐边",
        "i": 510422,
        "p": 5104,
        "y": "y"
    },
    {
        "n": "泸州",
        "i": 5105,
        "p": 51,
        "y": "l"
    },
    {
        "n": "江阳",
        "i": 510502,
        "p": 5105,
        "y": "j"
    },
    {
        "n": "纳溪",
        "i": 510503,
        "p": 5105,
        "y": "n"
    },
    {
        "n": "龙马潭",
        "i": 510504,
        "p": 5105,
        "y": "l"
    },
    {
        "n": "泸县",
        "i": 510521,
        "p": 5105,
        "y": "l"
    },
    {
        "n": "合江",
        "i": 510522,
        "p": 5105,
        "y": "h"
    },
    {
        "n": "叙永",
        "i": 510524,
        "p": 5105,
        "y": "x"
    },
    {
        "n": "古蔺",
        "i": 510525,
        "p": 5105,
        "y": "g"
    },
    {
        "n": "德阳",
        "i": 5106,
        "p": 51,
        "y": "d"
    },
    {
        "n": "旌阳",
        "i": 510603,
        "p": 5106,
        "y": "j"
    },
    {
        "n": "罗江",
        "i": 510604,
        "p": 5106,
        "y": "l"
    },
    {
        "n": "中江",
        "i": 510623,
        "p": 5106,
        "y": "z"
    },
    {
        "n": "广汉",
        "i": 510681,
        "p": 5106,
        "y": "g"
    },
    {
        "n": "什邡",
        "i": 510682,
        "p": 5106,
        "y": "s"
    },
    {
        "n": "绵竹",
        "i": 510683,
        "p": 5106,
        "y": "m"
    },
    {
        "n": "绵阳",
        "i": 5107,
        "p": 51,
        "y": "m"
    },
    {
        "n": "涪城",
        "i": 510703,
        "p": 5107,
        "y": "f"
    },
    {
        "n": "游仙",
        "i": 510704,
        "p": 5107,
        "y": "y"
    },
    {
        "n": "安州",
        "i": 510705,
        "p": 5107,
        "y": "a"
    },
    {
        "n": "三台",
        "i": 510722,
        "p": 5107,
        "y": "s"
    },
    {
        "n": "盐亭",
        "i": 510723,
        "p": 5107,
        "y": "y"
    },
    {
        "n": "梓潼",
        "i": 510725,
        "p": 5107,
        "y": "z"
    },
    {
        "n": "北川",
        "i": 510726,
        "p": 5107,
        "y": "b"
    },
    {
        "n": "平武",
        "i": 510727,
        "p": 5107,
        "y": "p"
    },
    {
        "n": "江油",
        "i": 510781,
        "p": 5107,
        "y": "j"
    },
    {
        "n": "广元",
        "i": 5108,
        "p": 51,
        "y": "g"
    },
    {
        "n": "利州",
        "i": 510802,
        "p": 5108,
        "y": "l"
    },
    {
        "n": "昭化",
        "i": 510811,
        "p": 5108,
        "y": "z"
    },
    {
        "n": "朝天",
        "i": 510812,
        "p": 5108,
        "y": "c"
    },
    {
        "n": "旺苍",
        "i": 510821,
        "p": 5108,
        "y": "w"
    },
    {
        "n": "青川",
        "i": 510822,
        "p": 5108,
        "y": "q"
    },
    {
        "n": "剑阁",
        "i": 510823,
        "p": 5108,
        "y": "j"
    },
    {
        "n": "苍溪",
        "i": 510824,
        "p": 5108,
        "y": "c"
    },
    {
        "n": "遂宁",
        "i": 5109,
        "p": 51,
        "y": "s"
    },
    {
        "n": "船山",
        "i": 510903,
        "p": 5109,
        "y": "c"
    },
    {
        "n": "安居",
        "i": 510904,
        "p": 5109,
        "y": "a"
    },
    {
        "n": "蓬溪",
        "i": 510921,
        "p": 5109,
        "y": "p"
    },
    {
        "n": "大英",
        "i": 510923,
        "p": 5109,
        "y": "d"
    },
    {
        "n": "射洪",
        "i": 510981,
        "p": 5109,
        "y": "s"
    },
    {
        "n": "内江",
        "i": 5110,
        "p": 51,
        "y": "n"
    },
    {
        "n": "市中",
        "i": 511002,
        "p": 5110,
        "y": "s"
    },
    {
        "n": "东兴",
        "i": 511011,
        "p": 5110,
        "y": "d"
    },
    {
        "n": "威远",
        "i": 511024,
        "p": 5110,
        "y": "w"
    },
    {
        "n": "资中",
        "i": 511025,
        "p": 5110,
        "y": "z"
    },
    {
        "n": "隆昌",
        "i": 511083,
        "p": 5110,
        "y": "l"
    },
    {
        "n": "乐山",
        "i": 5111,
        "p": 51,
        "y": "l"
    },
    {
        "n": "市中",
        "i": 511102,
        "p": 5111,
        "y": "s"
    },
    {
        "n": "沙湾",
        "i": 511111,
        "p": 5111,
        "y": "s"
    },
    {
        "n": "五通桥",
        "i": 511112,
        "p": 5111,
        "y": "w"
    },
    {
        "n": "金口河",
        "i": 511113,
        "p": 5111,
        "y": "j"
    },
    {
        "n": "犍为",
        "i": 511123,
        "p": 5111,
        "y": "q"
    },
    {
        "n": "井研",
        "i": 511124,
        "p": 5111,
        "y": "j"
    },
    {
        "n": "夹江",
        "i": 511126,
        "p": 5111,
        "y": "j"
    },
    {
        "n": "沐川",
        "i": 511129,
        "p": 5111,
        "y": "m"
    },
    {
        "n": "峨边",
        "i": 511132,
        "p": 5111,
        "y": "e"
    },
    {
        "n": "马边",
        "i": 511133,
        "p": 5111,
        "y": "m"
    },
    {
        "n": "峨眉山",
        "i": 511181,
        "p": 5111,
        "y": "e"
    },
    {
        "n": "南充",
        "i": 5113,
        "p": 51,
        "y": "n"
    },
    {
        "n": "顺庆",
        "i": 511302,
        "p": 5113,
        "y": "s"
    },
    {
        "n": "高坪",
        "i": 511303,
        "p": 5113,
        "y": "g"
    },
    {
        "n": "嘉陵",
        "i": 511304,
        "p": 5113,
        "y": "j"
    },
    {
        "n": "南部",
        "i": 511321,
        "p": 5113,
        "y": "n"
    },
    {
        "n": "营山",
        "i": 511322,
        "p": 5113,
        "y": "y"
    },
    {
        "n": "蓬安",
        "i": 511323,
        "p": 5113,
        "y": "p"
    },
    {
        "n": "仪陇",
        "i": 511324,
        "p": 5113,
        "y": "y"
    },
    {
        "n": "西充",
        "i": 511325,
        "p": 5113,
        "y": "x"
    },
    {
        "n": "阆中",
        "i": 511381,
        "p": 5113,
        "y": "l"
    },
    {
        "n": "眉山",
        "i": 5114,
        "p": 51,
        "y": "m"
    },
    {
        "n": "东坡",
        "i": 511402,
        "p": 5114,
        "y": "d"
    },
    {
        "n": "彭山",
        "i": 511403,
        "p": 5114,
        "y": "p"
    },
    {
        "n": "仁寿",
        "i": 511421,
        "p": 5114,
        "y": "r"
    },
    {
        "n": "洪雅",
        "i": 511423,
        "p": 5114,
        "y": "h"
    },
    {
        "n": "丹棱",
        "i": 511424,
        "p": 5114,
        "y": "d"
    },
    {
        "n": "青神",
        "i": 511425,
        "p": 5114,
        "y": "q"
    },
    {
        "n": "宜宾",
        "i": 5115,
        "p": 51,
        "y": "y"
    },
    {
        "n": "翠屏",
        "i": 511502,
        "p": 5115,
        "y": "c"
    },
    {
        "n": "南溪",
        "i": 511503,
        "p": 5115,
        "y": "n"
    },
    {
        "n": "叙州",
        "i": 511504,
        "p": 5115,
        "y": "x"
    },
    {
        "n": "江安",
        "i": 511523,
        "p": 5115,
        "y": "j"
    },
    {
        "n": "长宁",
        "i": 511524,
        "p": 5115,
        "y": "c"
    },
    {
        "n": "高县",
        "i": 511525,
        "p": 5115,
        "y": "g"
    },
    {
        "n": "珙县",
        "i": 511526,
        "p": 5115,
        "y": "g"
    },
    {
        "n": "筠连",
        "i": 511527,
        "p": 5115,
        "y": "j"
    },
    {
        "n": "兴文",
        "i": 511528,
        "p": 5115,
        "y": "x"
    },
    {
        "n": "屏山",
        "i": 511529,
        "p": 5115,
        "y": "p"
    },
    {
        "n": "广安",
        "i": 5116,
        "p": 51,
        "y": "g"
    },
    {
        "n": "广安区",
        "i": 511602,
        "p": 5116,
        "y": "g"
    },
    {
        "n": "前锋",
        "i": 511603,
        "p": 5116,
        "y": "q"
    },
    {
        "n": "岳池",
        "i": 511621,
        "p": 5116,
        "y": "y"
    },
    {
        "n": "武胜",
        "i": 511622,
        "p": 5116,
        "y": "w"
    },
    {
        "n": "邻水",
        "i": 511623,
        "p": 5116,
        "y": "l"
    },
    {
        "n": "华蓥",
        "i": 511681,
        "p": 5116,
        "y": "h"
    },
    {
        "n": "达州",
        "i": 5117,
        "p": 51,
        "y": "d"
    },
    {
        "n": "通川",
        "i": 511702,
        "p": 5117,
        "y": "t"
    },
    {
        "n": "达川",
        "i": 511703,
        "p": 5117,
        "y": "d"
    },
    {
        "n": "宣汉",
        "i": 511722,
        "p": 5117,
        "y": "x"
    },
    {
        "n": "开江",
        "i": 511723,
        "p": 5117,
        "y": "k"
    },
    {
        "n": "大竹",
        "i": 511724,
        "p": 5117,
        "y": "d"
    },
    {
        "n": "渠县",
        "i": 511725,
        "p": 5117,
        "y": "q"
    },
    {
        "n": "万源",
        "i": 511781,
        "p": 5117,
        "y": "w"
    },
    {
        "n": "雅安",
        "i": 5118,
        "p": 51,
        "y": "y"
    },
    {
        "n": "雨城",
        "i": 511802,
        "p": 5118,
        "y": "y"
    },
    {
        "n": "名山",
        "i": 511803,
        "p": 5118,
        "y": "m"
    },
    {
        "n": "荥经",
        "i": 511822,
        "p": 5118,
        "y": "y"
    },
    {
        "n": "汉源",
        "i": 511823,
        "p": 5118,
        "y": "h"
    },
    {
        "n": "石棉",
        "i": 511824,
        "p": 5118,
        "y": "s"
    },
    {
        "n": "天全",
        "i": 511825,
        "p": 5118,
        "y": "t"
    },
    {
        "n": "芦山",
        "i": 511826,
        "p": 5118,
        "y": "l"
    },
    {
        "n": "宝兴",
        "i": 511827,
        "p": 5118,
        "y": "b"
    },
    {
        "n": "巴中",
        "i": 5119,
        "p": 51,
        "y": "b"
    },
    {
        "n": "巴州",
        "i": 511902,
        "p": 5119,
        "y": "b"
    },
    {
        "n": "恩阳",
        "i": 511903,
        "p": 5119,
        "y": "e"
    },
    {
        "n": "通江",
        "i": 511921,
        "p": 5119,
        "y": "t"
    },
    {
        "n": "南江",
        "i": 511922,
        "p": 5119,
        "y": "n"
    },
    {
        "n": "平昌",
        "i": 511923,
        "p": 5119,
        "y": "p"
    },
    {
        "n": "资阳",
        "i": 5120,
        "p": 51,
        "y": "z"
    },
    {
        "n": "雁江",
        "i": 512002,
        "p": 5120,
        "y": "y"
    },
    {
        "n": "安岳",
        "i": 512021,
        "p": 5120,
        "y": "a"
    },
    {
        "n": "乐至",
        "i": 512022,
        "p": 5120,
        "y": "l"
    },
    {
        "n": "阿坝",
        "i": 5132,
        "p": 51,
        "y": "a"
    },
    {
        "n": "马尔康",
        "i": 513201,
        "p": 5132,
        "y": "m"
    },
    {
        "n": "汶川",
        "i": 513221,
        "p": 5132,
        "y": "w"
    },
    {
        "n": "理县",
        "i": 513222,
        "p": 5132,
        "y": "l"
    },
    {
        "n": "茂县",
        "i": 513223,
        "p": 5132,
        "y": "m"
    },
    {
        "n": "松潘",
        "i": 513224,
        "p": 5132,
        "y": "s"
    },
    {
        "n": "九寨沟",
        "i": 513225,
        "p": 5132,
        "y": "j"
    },
    {
        "n": "金川",
        "i": 513226,
        "p": 5132,
        "y": "j"
    },
    {
        "n": "小金",
        "i": 513227,
        "p": 5132,
        "y": "x"
    },
    {
        "n": "黑水",
        "i": 513228,
        "p": 5132,
        "y": "h"
    },
    {
        "n": "壤塘",
        "i": 513230,
        "p": 5132,
        "y": "r"
    },
    {
        "n": "阿坝县",
        "i": 513231,
        "p": 5132,
        "y": "a"
    },
    {
        "n": "若尔盖",
        "i": 513232,
        "p": 5132,
        "y": "r"
    },
    {
        "n": "红原",
        "i": 513233,
        "p": 5132,
        "y": "h"
    },
    {
        "n": "甘孜",
        "i": 5133,
        "p": 51,
        "y": "g"
    },
    {
        "n": "康定",
        "i": 513301,
        "p": 5133,
        "y": "k"
    },
    {
        "n": "泸定",
        "i": 513322,
        "p": 5133,
        "y": "l"
    },
    {
        "n": "丹巴",
        "i": 513323,
        "p": 5133,
        "y": "d"
    },
    {
        "n": "九龙",
        "i": 513324,
        "p": 5133,
        "y": "j"
    },
    {
        "n": "雅江",
        "i": 513325,
        "p": 5133,
        "y": "y"
    },
    {
        "n": "道孚",
        "i": 513326,
        "p": 5133,
        "y": "d"
    },
    {
        "n": "炉霍",
        "i": 513327,
        "p": 5133,
        "y": "l"
    },
    {
        "n": "甘孜县",
        "i": 513328,
        "p": 5133,
        "y": "g"
    },
    {
        "n": "新龙",
        "i": 513329,
        "p": 5133,
        "y": "x"
    },
    {
        "n": "德格",
        "i": 513330,
        "p": 5133,
        "y": "d"
    },
    {
        "n": "白玉",
        "i": 513331,
        "p": 5133,
        "y": "b"
    },
    {
        "n": "石渠",
        "i": 513332,
        "p": 5133,
        "y": "s"
    },
    {
        "n": "色达",
        "i": 513333,
        "p": 5133,
        "y": "s"
    },
    {
        "n": "理塘",
        "i": 513334,
        "p": 5133,
        "y": "l"
    },
    {
        "n": "巴塘",
        "i": 513335,
        "p": 5133,
        "y": "b"
    },
    {
        "n": "乡城",
        "i": 513336,
        "p": 5133,
        "y": "x"
    },
    {
        "n": "稻城",
        "i": 513337,
        "p": 5133,
        "y": "d"
    },
    {
        "n": "得荣",
        "i": 513338,
        "p": 5133,
        "y": "d"
    },
    {
        "n": "凉山",
        "i": 5134,
        "p": 51,
        "y": "l"
    },
    {
        "n": "西昌",
        "i": 513401,
        "p": 5134,
        "y": "x"
    },
    {
        "n": "木里",
        "i": 513422,
        "p": 5134,
        "y": "m"
    },
    {
        "n": "盐源",
        "i": 513423,
        "p": 5134,
        "y": "y"
    },
    {
        "n": "德昌",
        "i": 513424,
        "p": 5134,
        "y": "d"
    },
    {
        "n": "会理",
        "i": 513425,
        "p": 5134,
        "y": "h"
    },
    {
        "n": "会东",
        "i": 513426,
        "p": 5134,
        "y": "h"
    },
    {
        "n": "宁南",
        "i": 513427,
        "p": 5134,
        "y": "n"
    },
    {
        "n": "普格",
        "i": 513428,
        "p": 5134,
        "y": "p"
    },
    {
        "n": "布拖",
        "i": 513429,
        "p": 5134,
        "y": "b"
    },
    {
        "n": "金阳",
        "i": 513430,
        "p": 5134,
        "y": "j"
    },
    {
        "n": "昭觉",
        "i": 513431,
        "p": 5134,
        "y": "z"
    },
    {
        "n": "喜德",
        "i": 513432,
        "p": 5134,
        "y": "x"
    },
    {
        "n": "冕宁",
        "i": 513433,
        "p": 5134,
        "y": "m"
    },
    {
        "n": "越西",
        "i": 513434,
        "p": 5134,
        "y": "y"
    },
    {
        "n": "甘洛",
        "i": 513435,
        "p": 5134,
        "y": "g"
    },
    {
        "n": "美姑",
        "i": 513436,
        "p": 5134,
        "y": "m"
    },
    {
        "n": "雷波",
        "i": 513437,
        "p": 5134,
        "y": "l"
    },
    {
        "n": "贵州",
        "i": 52,
        "p": 0,
        "y": "g"
    },
    {
        "n": "贵阳",
        "i": 5201,
        "p": 52,
        "y": "g"
    },
    {
        "n": "南明",
        "i": 520102,
        "p": 5201,
        "y": "n"
    },
    {
        "n": "云岩",
        "i": 520103,
        "p": 5201,
        "y": "y"
    },
    {
        "n": "花溪",
        "i": 520111,
        "p": 5201,
        "y": "h"
    },
    {
        "n": "乌当",
        "i": 520112,
        "p": 5201,
        "y": "w"
    },
    {
        "n": "白云",
        "i": 520113,
        "p": 5201,
        "y": "b"
    },
    {
        "n": "观山湖",
        "i": 520115,
        "p": 5201,
        "y": "g"
    },
    {
        "n": "开阳",
        "i": 520121,
        "p": 5201,
        "y": "k"
    },
    {
        "n": "息烽",
        "i": 520122,
        "p": 5201,
        "y": "x"
    },
    {
        "n": "修文",
        "i": 520123,
        "p": 5201,
        "y": "x"
    },
    {
        "n": "清镇",
        "i": 520181,
        "p": 5201,
        "y": "q"
    },
    {
        "n": "六盘水",
        "i": 5202,
        "p": 52,
        "y": "l"
    },
    {
        "n": "钟山",
        "i": 520201,
        "p": 5202,
        "y": "z"
    },
    {
        "n": "六枝特",
        "i": 520203,
        "p": 5202,
        "y": "l"
    },
    {
        "n": "水城",
        "i": 520221,
        "p": 5202,
        "y": "s"
    },
    {
        "n": "盘州",
        "i": 520281,
        "p": 5202,
        "y": "p"
    },
    {
        "n": "遵义",
        "i": 5203,
        "p": 52,
        "y": "z"
    },
    {
        "n": "红花岗",
        "i": 520302,
        "p": 5203,
        "y": "h"
    },
    {
        "n": "汇川",
        "i": 520303,
        "p": 5203,
        "y": "h"
    },
    {
        "n": "播州",
        "i": 520304,
        "p": 5203,
        "y": "b"
    },
    {
        "n": "桐梓",
        "i": 520322,
        "p": 5203,
        "y": "t"
    },
    {
        "n": "绥阳",
        "i": 520323,
        "p": 5203,
        "y": "s"
    },
    {
        "n": "正安",
        "i": 520324,
        "p": 5203,
        "y": "z"
    },
    {
        "n": "道真",
        "i": 520325,
        "p": 5203,
        "y": "d"
    },
    {
        "n": "务川",
        "i": 520326,
        "p": 5203,
        "y": "w"
    },
    {
        "n": "凤冈",
        "i": 520327,
        "p": 5203,
        "y": "f"
    },
    {
        "n": "湄潭",
        "i": 520328,
        "p": 5203,
        "y": "m"
    },
    {
        "n": "余庆",
        "i": 520329,
        "p": 5203,
        "y": "y"
    },
    {
        "n": "习水",
        "i": 520330,
        "p": 5203,
        "y": "x"
    },
    {
        "n": "赤水",
        "i": 520381,
        "p": 5203,
        "y": "c"
    },
    {
        "n": "仁怀",
        "i": 520382,
        "p": 5203,
        "y": "r"
    },
    {
        "n": "安顺",
        "i": 5204,
        "p": 52,
        "y": "a"
    },
    {
        "n": "西秀",
        "i": 520402,
        "p": 5204,
        "y": "x"
    },
    {
        "n": "平坝",
        "i": 520403,
        "p": 5204,
        "y": "p"
    },
    {
        "n": "普定",
        "i": 520422,
        "p": 5204,
        "y": "p"
    },
    {
        "n": "镇宁",
        "i": 520423,
        "p": 5204,
        "y": "z"
    },
    {
        "n": "关岭",
        "i": 520424,
        "p": 5204,
        "y": "g"
    },
    {
        "n": "紫云",
        "i": 520425,
        "p": 5204,
        "y": "z"
    },
    {
        "n": "毕节",
        "i": 5205,
        "p": 52,
        "y": "b"
    },
    {
        "n": "七星关",
        "i": 520502,
        "p": 5205,
        "y": "q"
    },
    {
        "n": "大方",
        "i": 520521,
        "p": 5205,
        "y": "d"
    },
    {
        "n": "黔西",
        "i": 520522,
        "p": 5205,
        "y": "q"
    },
    {
        "n": "金沙",
        "i": 520523,
        "p": 5205,
        "y": "j"
    },
    {
        "n": "织金",
        "i": 520524,
        "p": 5205,
        "y": "z"
    },
    {
        "n": "纳雍",
        "i": 520525,
        "p": 5205,
        "y": "n"
    },
    {
        "n": "威宁",
        "i": 520526,
        "p": 5205,
        "y": "w"
    },
    {
        "n": "赫章",
        "i": 520527,
        "p": 5205,
        "y": "h"
    },
    {
        "n": "铜仁",
        "i": 5206,
        "p": 52,
        "y": "t"
    },
    {
        "n": "碧江",
        "i": 520602,
        "p": 5206,
        "y": "b"
    },
    {
        "n": "万山",
        "i": 520603,
        "p": 5206,
        "y": "w"
    },
    {
        "n": "江口",
        "i": 520621,
        "p": 5206,
        "y": "j"
    },
    {
        "n": "玉屏",
        "i": 520622,
        "p": 5206,
        "y": "y"
    },
    {
        "n": "石阡",
        "i": 520623,
        "p": 5206,
        "y": "s"
    },
    {
        "n": "思南",
        "i": 520624,
        "p": 5206,
        "y": "s"
    },
    {
        "n": "印江",
        "i": 520625,
        "p": 5206,
        "y": "y"
    },
    {
        "n": "德江",
        "i": 520626,
        "p": 5206,
        "y": "d"
    },
    {
        "n": "沿河",
        "i": 520627,
        "p": 5206,
        "y": "y"
    },
    {
        "n": "松桃",
        "i": 520628,
        "p": 5206,
        "y": "s"
    },
    {
        "n": "黔西南",
        "i": 5223,
        "p": 52,
        "y": "q"
    },
    {
        "n": "兴义",
        "i": 522301,
        "p": 5223,
        "y": "x"
    },
    {
        "n": "兴仁",
        "i": 522302,
        "p": 5223,
        "y": "x"
    },
    {
        "n": "普安",
        "i": 522323,
        "p": 5223,
        "y": "p"
    },
    {
        "n": "晴隆",
        "i": 522324,
        "p": 5223,
        "y": "q"
    },
    {
        "n": "贞丰",
        "i": 522325,
        "p": 5223,
        "y": "z"
    },
    {
        "n": "望谟",
        "i": 522326,
        "p": 5223,
        "y": "w"
    },
    {
        "n": "册亨",
        "i": 522327,
        "p": 5223,
        "y": "c"
    },
    {
        "n": "安龙",
        "i": 522328,
        "p": 5223,
        "y": "a"
    },
    {
        "n": "黔东南",
        "i": 5226,
        "p": 52,
        "y": "q"
    },
    {
        "n": "凯里",
        "i": 522601,
        "p": 5226,
        "y": "k"
    },
    {
        "n": "黄平",
        "i": 522622,
        "p": 5226,
        "y": "h"
    },
    {
        "n": "施秉",
        "i": 522623,
        "p": 5226,
        "y": "s"
    },
    {
        "n": "三穗",
        "i": 522624,
        "p": 5226,
        "y": "s"
    },
    {
        "n": "镇远",
        "i": 522625,
        "p": 5226,
        "y": "z"
    },
    {
        "n": "岑巩",
        "i": 522626,
        "p": 5226,
        "y": "c"
    },
    {
        "n": "天柱",
        "i": 522627,
        "p": 5226,
        "y": "t"
    },
    {
        "n": "锦屏",
        "i": 522628,
        "p": 5226,
        "y": "j"
    },
    {
        "n": "剑河",
        "i": 522629,
        "p": 5226,
        "y": "j"
    },
    {
        "n": "台江",
        "i": 522630,
        "p": 5226,
        "y": "t"
    },
    {
        "n": "黎平",
        "i": 522631,
        "p": 5226,
        "y": "l"
    },
    {
        "n": "榕江",
        "i": 522632,
        "p": 5226,
        "y": "r"
    },
    {
        "n": "从江",
        "i": 522633,
        "p": 5226,
        "y": "c"
    },
    {
        "n": "雷山",
        "i": 522634,
        "p": 5226,
        "y": "l"
    },
    {
        "n": "麻江",
        "i": 522635,
        "p": 5226,
        "y": "m"
    },
    {
        "n": "丹寨",
        "i": 522636,
        "p": 5226,
        "y": "d"
    },
    {
        "n": "黔南",
        "i": 5227,
        "p": 52,
        "y": "q"
    },
    {
        "n": "都匀",
        "i": 522701,
        "p": 5227,
        "y": "d"
    },
    {
        "n": "福泉",
        "i": 522702,
        "p": 5227,
        "y": "f"
    },
    {
        "n": "荔波",
        "i": 522722,
        "p": 5227,
        "y": "l"
    },
    {
        "n": "贵定",
        "i": 522723,
        "p": 5227,
        "y": "g"
    },
    {
        "n": "瓮安",
        "i": 522725,
        "p": 5227,
        "y": "w"
    },
    {
        "n": "独山",
        "i": 522726,
        "p": 5227,
        "y": "d"
    },
    {
        "n": "平塘",
        "i": 522727,
        "p": 5227,
        "y": "p"
    },
    {
        "n": "罗甸",
        "i": 522728,
        "p": 5227,
        "y": "l"
    },
    {
        "n": "长顺",
        "i": 522729,
        "p": 5227,
        "y": "c"
    },
    {
        "n": "龙里",
        "i": 522730,
        "p": 5227,
        "y": "l"
    },
    {
        "n": "惠水",
        "i": 522731,
        "p": 5227,
        "y": "h"
    },
    {
        "n": "三都",
        "i": 522732,
        "p": 5227,
        "y": "s"
    },
    {
        "n": "云南",
        "i": 53,
        "p": 0,
        "y": "y"
    },
    {
        "n": "昆明",
        "i": 5301,
        "p": 53,
        "y": "k"
    },
    {
        "n": "五华",
        "i": 530102,
        "p": 5301,
        "y": "w"
    },
    {
        "n": "盘龙",
        "i": 530103,
        "p": 5301,
        "y": "p"
    },
    {
        "n": "官渡",
        "i": 530111,
        "p": 5301,
        "y": "g"
    },
    {
        "n": "西山",
        "i": 530112,
        "p": 5301,
        "y": "x"
    },
    {
        "n": "东川",
        "i": 530113,
        "p": 5301,
        "y": "d"
    },
    {
        "n": "呈贡",
        "i": 530114,
        "p": 5301,
        "y": "c"
    },
    {
        "n": "晋宁",
        "i": 530115,
        "p": 5301,
        "y": "j"
    },
    {
        "n": "富民",
        "i": 530124,
        "p": 5301,
        "y": "f"
    },
    {
        "n": "宜良",
        "i": 530125,
        "p": 5301,
        "y": "y"
    },
    {
        "n": "石林",
        "i": 530126,
        "p": 5301,
        "y": "s"
    },
    {
        "n": "嵩明",
        "i": 530127,
        "p": 5301,
        "y": "s"
    },
    {
        "n": "禄劝",
        "i": 530128,
        "p": 5301,
        "y": "l"
    },
    {
        "n": "寻甸",
        "i": 530129,
        "p": 5301,
        "y": "x"
    },
    {
        "n": "安宁",
        "i": 530181,
        "p": 5301,
        "y": "a"
    },
    {
        "n": "曲靖",
        "i": 5303,
        "p": 53,
        "y": "q"
    },
    {
        "n": "麒麟",
        "i": 530302,
        "p": 5303,
        "y": "q"
    },
    {
        "n": "沾益",
        "i": 530303,
        "p": 5303,
        "y": "z"
    },
    {
        "n": "马龙",
        "i": 530304,
        "p": 5303,
        "y": "m"
    },
    {
        "n": "陆良",
        "i": 530322,
        "p": 5303,
        "y": "l"
    },
    {
        "n": "师宗",
        "i": 530323,
        "p": 5303,
        "y": "s"
    },
    {
        "n": "罗平",
        "i": 530324,
        "p": 5303,
        "y": "l"
    },
    {
        "n": "富源",
        "i": 530325,
        "p": 5303,
        "y": "f"
    },
    {
        "n": "会泽",
        "i": 530326,
        "p": 5303,
        "y": "h"
    },
    {
        "n": "宣威",
        "i": 530381,
        "p": 5303,
        "y": "x"
    },
    {
        "n": "玉溪",
        "i": 5304,
        "p": 53,
        "y": "y"
    },
    {
        "n": "红塔",
        "i": 530402,
        "p": 5304,
        "y": "h"
    },
    {
        "n": "江川",
        "i": 530403,
        "p": 5304,
        "y": "j"
    },
    {
        "n": "通海",
        "i": 530423,
        "p": 5304,
        "y": "t"
    },
    {
        "n": "华宁",
        "i": 530424,
        "p": 5304,
        "y": "h"
    },
    {
        "n": "易门",
        "i": 530425,
        "p": 5304,
        "y": "y"
    },
    {
        "n": "峨山",
        "i": 530426,
        "p": 5304,
        "y": "e"
    },
    {
        "n": "新平",
        "i": 530427,
        "p": 5304,
        "y": "x"
    },
    {
        "n": "元江",
        "i": 530428,
        "p": 5304,
        "y": "y"
    },
    {
        "n": "澄江",
        "i": 530481,
        "p": 5304,
        "y": "c"
    },
    {
        "n": "保山",
        "i": 5305,
        "p": 53,
        "y": "b"
    },
    {
        "n": "隆阳",
        "i": 530502,
        "p": 5305,
        "y": "l"
    },
    {
        "n": "施甸",
        "i": 530521,
        "p": 5305,
        "y": "s"
    },
    {
        "n": "龙陵",
        "i": 530523,
        "p": 5305,
        "y": "l"
    },
    {
        "n": "昌宁",
        "i": 530524,
        "p": 5305,
        "y": "c"
    },
    {
        "n": "腾冲",
        "i": 530581,
        "p": 5305,
        "y": "t"
    },
    {
        "n": "昭通",
        "i": 5306,
        "p": 53,
        "y": "z"
    },
    {
        "n": "昭阳",
        "i": 530602,
        "p": 5306,
        "y": "z"
    },
    {
        "n": "鲁甸",
        "i": 530621,
        "p": 5306,
        "y": "l"
    },
    {
        "n": "巧家",
        "i": 530622,
        "p": 5306,
        "y": "q"
    },
    {
        "n": "盐津",
        "i": 530623,
        "p": 5306,
        "y": "y"
    },
    {
        "n": "大关",
        "i": 530624,
        "p": 5306,
        "y": "d"
    },
    {
        "n": "永善",
        "i": 530625,
        "p": 5306,
        "y": "y"
    },
    {
        "n": "绥江",
        "i": 530626,
        "p": 5306,
        "y": "s"
    },
    {
        "n": "镇雄",
        "i": 530627,
        "p": 5306,
        "y": "z"
    },
    {
        "n": "彝良",
        "i": 530628,
        "p": 5306,
        "y": "y"
    },
    {
        "n": "威信",
        "i": 530629,
        "p": 5306,
        "y": "w"
    },
    {
        "n": "水富",
        "i": 530681,
        "p": 5306,
        "y": "s"
    },
    {
        "n": "丽江",
        "i": 5307,
        "p": 53,
        "y": "l"
    },
    {
        "n": "古城",
        "i": 530702,
        "p": 5307,
        "y": "g"
    },
    {
        "n": "玉龙",
        "i": 530721,
        "p": 5307,
        "y": "y"
    },
    {
        "n": "永胜",
        "i": 530722,
        "p": 5307,
        "y": "y"
    },
    {
        "n": "华坪",
        "i": 530723,
        "p": 5307,
        "y": "h"
    },
    {
        "n": "宁蒗",
        "i": 530724,
        "p": 5307,
        "y": "n"
    },
    {
        "n": "普洱",
        "i": 5308,
        "p": 53,
        "y": "p"
    },
    {
        "n": "思茅",
        "i": 530802,
        "p": 5308,
        "y": "s"
    },
    {
        "n": "宁洱",
        "i": 530821,
        "p": 5308,
        "y": "n"
    },
    {
        "n": "墨江",
        "i": 530822,
        "p": 5308,
        "y": "m"
    },
    {
        "n": "景东",
        "i": 530823,
        "p": 5308,
        "y": "j"
    },
    {
        "n": "景谷",
        "i": 530824,
        "p": 5308,
        "y": "j"
    },
    {
        "n": "镇沅",
        "i": 530825,
        "p": 5308,
        "y": "z"
    },
    {
        "n": "江城",
        "i": 530826,
        "p": 5308,
        "y": "j"
    },
    {
        "n": "孟连",
        "i": 530827,
        "p": 5308,
        "y": "m"
    },
    {
        "n": "澜沧",
        "i": 530828,
        "p": 5308,
        "y": "l"
    },
    {
        "n": "西盟",
        "i": 530829,
        "p": 5308,
        "y": "x"
    },
    {
        "n": "临沧",
        "i": 5309,
        "p": 53,
        "y": "l"
    },
    {
        "n": "临翔",
        "i": 530902,
        "p": 5309,
        "y": "l"
    },
    {
        "n": "凤庆",
        "i": 530921,
        "p": 5309,
        "y": "f"
    },
    {
        "n": "云县",
        "i": 530922,
        "p": 5309,
        "y": "y"
    },
    {
        "n": "永德",
        "i": 530923,
        "p": 5309,
        "y": "y"
    },
    {
        "n": "镇康",
        "i": 530924,
        "p": 5309,
        "y": "z"
    },
    {
        "n": "双江",
        "i": 530925,
        "p": 5309,
        "y": "s"
    },
    {
        "n": "耿马",
        "i": 530926,
        "p": 5309,
        "y": "g"
    },
    {
        "n": "沧源",
        "i": 530927,
        "p": 5309,
        "y": "c"
    },
    {
        "n": "楚雄",
        "i": 5323,
        "p": 53,
        "y": "c"
    },
    {
        "n": "楚雄市",
        "i": 532301,
        "p": 5323,
        "y": "c"
    },
    {
        "n": "双柏",
        "i": 532322,
        "p": 5323,
        "y": "s"
    },
    {
        "n": "牟定",
        "i": 532323,
        "p": 5323,
        "y": "m"
    },
    {
        "n": "南华",
        "i": 532324,
        "p": 5323,
        "y": "n"
    },
    {
        "n": "姚安",
        "i": 532325,
        "p": 5323,
        "y": "y"
    },
    {
        "n": "大姚",
        "i": 532326,
        "p": 5323,
        "y": "d"
    },
    {
        "n": "永仁",
        "i": 532327,
        "p": 5323,
        "y": "y"
    },
    {
        "n": "元谋",
        "i": 532328,
        "p": 5323,
        "y": "y"
    },
    {
        "n": "武定",
        "i": 532329,
        "p": 5323,
        "y": "w"
    },
    {
        "n": "禄丰",
        "i": 532331,
        "p": 5323,
        "y": "l"
    },
    {
        "n": "红河",
        "i": 5325,
        "p": 53,
        "y": "h"
    },
    {
        "n": "个旧",
        "i": 532501,
        "p": 5325,
        "y": "g"
    },
    {
        "n": "开远",
        "i": 532502,
        "p": 5325,
        "y": "k"
    },
    {
        "n": "蒙自",
        "i": 532503,
        "p": 5325,
        "y": "m"
    },
    {
        "n": "弥勒",
        "i": 532504,
        "p": 5325,
        "y": "m"
    },
    {
        "n": "屏边",
        "i": 532523,
        "p": 5325,
        "y": "p"
    },
    {
        "n": "建水",
        "i": 532524,
        "p": 5325,
        "y": "j"
    },
    {
        "n": "石屏",
        "i": 532525,
        "p": 5325,
        "y": "s"
    },
    {
        "n": "泸西",
        "i": 532527,
        "p": 5325,
        "y": "l"
    },
    {
        "n": "元阳",
        "i": 532528,
        "p": 5325,
        "y": "y"
    },
    {
        "n": "红河县",
        "i": 532529,
        "p": 5325,
        "y": "h"
    },
    {
        "n": "金平",
        "i": 532530,
        "p": 5325,
        "y": "j"
    },
    {
        "n": "绿春",
        "i": 532531,
        "p": 5325,
        "y": "l"
    },
    {
        "n": "河口",
        "i": 532532,
        "p": 5325,
        "y": "h"
    },
    {
        "n": "文山",
        "i": 5326,
        "p": 53,
        "y": "w"
    },
    {
        "n": "文山市",
        "i": 532601,
        "p": 5326,
        "y": "w"
    },
    {
        "n": "砚山",
        "i": 532622,
        "p": 5326,
        "y": "y"
    },
    {
        "n": "西畴",
        "i": 532623,
        "p": 5326,
        "y": "x"
    },
    {
        "n": "麻栗坡",
        "i": 532624,
        "p": 5326,
        "y": "m"
    },
    {
        "n": "马关",
        "i": 532625,
        "p": 5326,
        "y": "m"
    },
    {
        "n": "丘北",
        "i": 532626,
        "p": 5326,
        "y": "q"
    },
    {
        "n": "广南",
        "i": 532627,
        "p": 5326,
        "y": "g"
    },
    {
        "n": "富宁",
        "i": 532628,
        "p": 5326,
        "y": "f"
    },
    {
        "n": "西双版纳",
        "i": 5328,
        "p": 53,
        "y": "x"
    },
    {
        "n": "景洪",
        "i": 532801,
        "p": 5328,
        "y": "j"
    },
    {
        "n": "勐海",
        "i": 532822,
        "p": 5328,
        "y": "m"
    },
    {
        "n": "勐腊",
        "i": 532823,
        "p": 5328,
        "y": "m"
    },
    {
        "n": "大理",
        "i": 5329,
        "p": 53,
        "y": "d"
    },
    {
        "n": "大理市",
        "i": 532901,
        "p": 5329,
        "y": "d"
    },
    {
        "n": "漾濞",
        "i": 532922,
        "p": 5329,
        "y": "y"
    },
    {
        "n": "祥云",
        "i": 532923,
        "p": 5329,
        "y": "x"
    },
    {
        "n": "宾川",
        "i": 532924,
        "p": 5329,
        "y": "b"
    },
    {
        "n": "弥渡",
        "i": 532925,
        "p": 5329,
        "y": "m"
    },
    {
        "n": "南涧",
        "i": 532926,
        "p": 5329,
        "y": "n"
    },
    {
        "n": "巍山",
        "i": 532927,
        "p": 5329,
        "y": "w"
    },
    {
        "n": "永平",
        "i": 532928,
        "p": 5329,
        "y": "y"
    },
    {
        "n": "云龙",
        "i": 532929,
        "p": 5329,
        "y": "y"
    },
    {
        "n": "洱源",
        "i": 532930,
        "p": 5329,
        "y": "e"
    },
    {
        "n": "剑川",
        "i": 532931,
        "p": 5329,
        "y": "j"
    },
    {
        "n": "鹤庆",
        "i": 532932,
        "p": 5329,
        "y": "h"
    },
    {
        "n": "德宏",
        "i": 5331,
        "p": 53,
        "y": "d"
    },
    {
        "n": "瑞丽",
        "i": 533102,
        "p": 5331,
        "y": "r"
    },
    {
        "n": "芒市",
        "i": 533103,
        "p": 5331,
        "y": "m"
    },
    {
        "n": "梁河",
        "i": 533122,
        "p": 5331,
        "y": "l"
    },
    {
        "n": "盈江",
        "i": 533123,
        "p": 5331,
        "y": "y"
    },
    {
        "n": "陇川",
        "i": 533124,
        "p": 5331,
        "y": "l"
    },
    {
        "n": "怒江",
        "i": 5333,
        "p": 53,
        "y": "n"
    },
    {
        "n": "泸水",
        "i": 533301,
        "p": 5333,
        "y": "l"
    },
    {
        "n": "福贡",
        "i": 533323,
        "p": 5333,
        "y": "f"
    },
    {
        "n": "贡山",
        "i": 533324,
        "p": 5333,
        "y": "g"
    },
    {
        "n": "兰坪",
        "i": 533325,
        "p": 5333,
        "y": "l"
    },
    {
        "n": "迪庆",
        "i": 5334,
        "p": 53,
        "y": "d"
    },
    {
        "n": "香格里拉",
        "i": 533401,
        "p": 5334,
        "y": "x"
    },
    {
        "n": "德钦",
        "i": 533422,
        "p": 5334,
        "y": "d"
    },
    {
        "n": "维西",
        "i": 533423,
        "p": 5334,
        "y": "w"
    },
    {
        "n": "西藏",
        "i": 54,
        "p": 0,
        "y": "x"
    },
    {
        "n": "拉萨",
        "i": 5401,
        "p": 54,
        "y": "l"
    },
    {
        "n": "城关",
        "i": 540102,
        "p": 5401,
        "y": "c"
    },
    {
        "n": "堆龙德庆区",
        "i": 540103,
        "p": 5401,
        "y": "d"
    },
    {
        "n": "达孜",
        "i": 540104,
        "p": 5401,
        "y": "d"
    },
    {
        "n": "林周",
        "i": 540121,
        "p": 5401,
        "y": "l"
    },
    {
        "n": "当雄",
        "i": 540122,
        "p": 5401,
        "y": "d"
    },
    {
        "n": "尼木",
        "i": 540123,
        "p": 5401,
        "y": "n"
    },
    {
        "n": "曲水",
        "i": 540124,
        "p": 5401,
        "y": "q"
    },
    {
        "n": "墨竹工卡",
        "i": 540127,
        "p": 5401,
        "y": "m"
    },
    {
        "n": "日喀则",
        "i": 5402,
        "p": 54,
        "y": "r"
    },
    {
        "n": "桑珠孜",
        "i": 540202,
        "p": 5402,
        "y": "s"
    },
    {
        "n": "南木林",
        "i": 540221,
        "p": 5402,
        "y": "n"
    },
    {
        "n": "江孜",
        "i": 540222,
        "p": 5402,
        "y": "j"
    },
    {
        "n": "定日",
        "i": 540223,
        "p": 5402,
        "y": "d"
    },
    {
        "n": "萨迦",
        "i": 540224,
        "p": 5402,
        "y": "s"
    },
    {
        "n": "拉孜",
        "i": 540225,
        "p": 5402,
        "y": "l"
    },
    {
        "n": "昂仁",
        "i": 540226,
        "p": 5402,
        "y": "a"
    },
    {
        "n": "谢通门",
        "i": 540227,
        "p": 5402,
        "y": "x"
    },
    {
        "n": "白朗",
        "i": 540228,
        "p": 5402,
        "y": "b"
    },
    {
        "n": "仁布",
        "i": 540229,
        "p": 5402,
        "y": "r"
    },
    {
        "n": "康马",
        "i": 540230,
        "p": 5402,
        "y": "k"
    },
    {
        "n": "定结",
        "i": 540231,
        "p": 5402,
        "y": "d"
    },
    {
        "n": "仲巴",
        "i": 540232,
        "p": 5402,
        "y": "z"
    },
    {
        "n": "亚东",
        "i": 540233,
        "p": 5402,
        "y": "y"
    },
    {
        "n": "吉隆",
        "i": 540234,
        "p": 5402,
        "y": "j"
    },
    {
        "n": "聂拉木",
        "i": 540235,
        "p": 5402,
        "y": "n"
    },
    {
        "n": "萨嘎",
        "i": 540236,
        "p": 5402,
        "y": "s"
    },
    {
        "n": "岗巴",
        "i": 540237,
        "p": 5402,
        "y": "g"
    },
    {
        "n": "昌都",
        "i": 5403,
        "p": 54,
        "y": "c"
    },
    {
        "n": "卡若",
        "i": 540302,
        "p": 5403,
        "y": "k"
    },
    {
        "n": "江达",
        "i": 540321,
        "p": 5403,
        "y": "j"
    },
    {
        "n": "贡觉",
        "i": 540322,
        "p": 5403,
        "y": "g"
    },
    {
        "n": "类乌齐",
        "i": 540323,
        "p": 5403,
        "y": "l"
    },
    {
        "n": "丁青",
        "i": 540324,
        "p": 5403,
        "y": "d"
    },
    {
        "n": "察雅",
        "i": 540325,
        "p": 5403,
        "y": "c"
    },
    {
        "n": "八宿",
        "i": 540326,
        "p": 5403,
        "y": "b"
    },
    {
        "n": "左贡",
        "i": 540327,
        "p": 5403,
        "y": "z"
    },
    {
        "n": "芒康",
        "i": 540328,
        "p": 5403,
        "y": "m"
    },
    {
        "n": "洛隆",
        "i": 540329,
        "p": 5403,
        "y": "l"
    },
    {
        "n": "边坝",
        "i": 540330,
        "p": 5403,
        "y": "b"
    },
    {
        "n": "林芝",
        "i": 5404,
        "p": 54,
        "y": "l"
    },
    {
        "n": "巴宜",
        "i": 540402,
        "p": 5404,
        "y": "b"
    },
    {
        "n": "工布江达",
        "i": 540421,
        "p": 5404,
        "y": "g"
    },
    {
        "n": "米林",
        "i": 540422,
        "p": 5404,
        "y": "m"
    },
    {
        "n": "墨脱",
        "i": 540423,
        "p": 5404,
        "y": "m"
    },
    {
        "n": "波密",
        "i": 540424,
        "p": 5404,
        "y": "b"
    },
    {
        "n": "察隅",
        "i": 540425,
        "p": 5404,
        "y": "c"
    },
    {
        "n": "朗县",
        "i": 540426,
        "p": 5404,
        "y": "l"
    },
    {
        "n": "山南",
        "i": 5405,
        "p": 54,
        "y": "s"
    },
    {
        "n": "乃东",
        "i": 540502,
        "p": 5405,
        "y": "n"
    },
    {
        "n": "扎囊",
        "i": 540521,
        "p": 5405,
        "y": "z"
    },
    {
        "n": "贡嘎",
        "i": 540522,
        "p": 5405,
        "y": "g"
    },
    {
        "n": "桑日",
        "i": 540523,
        "p": 5405,
        "y": "s"
    },
    {
        "n": "琼结",
        "i": 540524,
        "p": 5405,
        "y": "q"
    },
    {
        "n": "曲松",
        "i": 540525,
        "p": 5405,
        "y": "q"
    },
    {
        "n": "措美",
        "i": 540526,
        "p": 5405,
        "y": "c"
    },
    {
        "n": "洛扎",
        "i": 540527,
        "p": 5405,
        "y": "l"
    },
    {
        "n": "加查",
        "i": 540528,
        "p": 5405,
        "y": "j"
    },
    {
        "n": "隆子",
        "i": 540529,
        "p": 5405,
        "y": "l"
    },
    {
        "n": "错那",
        "i": 540530,
        "p": 5405,
        "y": "c"
    },
    {
        "n": "浪卡子",
        "i": 540531,
        "p": 5405,
        "y": "l"
    },
    {
        "n": "那曲",
        "i": 5406,
        "p": 54,
        "y": "n"
    },
    {
        "n": "色尼",
        "i": 540602,
        "p": 5406,
        "y": "s"
    },
    {
        "n": "嘉黎",
        "i": 540621,
        "p": 5406,
        "y": "j"
    },
    {
        "n": "比如",
        "i": 540622,
        "p": 5406,
        "y": "b"
    },
    {
        "n": "聂荣",
        "i": 540623,
        "p": 5406,
        "y": "n"
    },
    {
        "n": "安多",
        "i": 540624,
        "p": 5406,
        "y": "a"
    },
    {
        "n": "申扎",
        "i": 540625,
        "p": 5406,
        "y": "s"
    },
    {
        "n": "索县",
        "i": 540626,
        "p": 5406,
        "y": "s"
    },
    {
        "n": "班戈",
        "i": 540627,
        "p": 5406,
        "y": "b"
    },
    {
        "n": "巴青",
        "i": 540628,
        "p": 5406,
        "y": "b"
    },
    {
        "n": "尼玛",
        "i": 540629,
        "p": 5406,
        "y": "n"
    },
    {
        "n": "双湖",
        "i": 540630,
        "p": 5406,
        "y": "s"
    },
    {
        "n": "阿里",
        "i": 5425,
        "p": 54,
        "y": "a"
    },
    {
        "n": "普兰",
        "i": 542521,
        "p": 5425,
        "y": "p"
    },
    {
        "n": "札达",
        "i": 542522,
        "p": 5425,
        "y": "z"
    },
    {
        "n": "噶尔",
        "i": 542523,
        "p": 5425,
        "y": "g"
    },
    {
        "n": "日土",
        "i": 542524,
        "p": 5425,
        "y": "r"
    },
    {
        "n": "革吉",
        "i": 542525,
        "p": 5425,
        "y": "g"
    },
    {
        "n": "改则",
        "i": 542526,
        "p": 5425,
        "y": "g"
    },
    {
        "n": "措勤",
        "i": 542527,
        "p": 5425,
        "y": "c"
    },
    {
        "n": "陕西",
        "i": 61,
        "p": 0,
        "y": "s"
    },
    {
        "n": "西安",
        "i": 6101,
        "p": 61,
        "y": "x"
    },
    {
        "n": "新城",
        "i": 610102,
        "p": 6101,
        "y": "x"
    },
    {
        "n": "碑林",
        "i": 610103,
        "p": 6101,
        "y": "b"
    },
    {
        "n": "莲湖",
        "i": 610104,
        "p": 6101,
        "y": "l"
    },
    {
        "n": "灞桥",
        "i": 610111,
        "p": 6101,
        "y": "b"
    },
    {
        "n": "未央",
        "i": 610112,
        "p": 6101,
        "y": "w"
    },
    {
        "n": "雁塔",
        "i": 610113,
        "p": 6101,
        "y": "y"
    },
    {
        "n": "阎良",
        "i": 610114,
        "p": 6101,
        "y": "y"
    },
    {
        "n": "临潼",
        "i": 610115,
        "p": 6101,
        "y": "l"
    },
    {
        "n": "长安",
        "i": 610116,
        "p": 6101,
        "y": "c"
    },
    {
        "n": "高陵",
        "i": 610117,
        "p": 6101,
        "y": "g"
    },
    {
        "n": "鄠邑",
        "i": 610118,
        "p": 6101,
        "y": "h"
    },
    {
        "n": "蓝田",
        "i": 610122,
        "p": 6101,
        "y": "l"
    },
    {
        "n": "周至",
        "i": 610124,
        "p": 6101,
        "y": "z"
    },
    {
        "n": "铜川",
        "i": 6102,
        "p": 61,
        "y": "t"
    },
    {
        "n": "王益",
        "i": 610202,
        "p": 6102,
        "y": "w"
    },
    {
        "n": "印台",
        "i": 610203,
        "p": 6102,
        "y": "y"
    },
    {
        "n": "耀州",
        "i": 610204,
        "p": 6102,
        "y": "y"
    },
    {
        "n": "宜君",
        "i": 610222,
        "p": 6102,
        "y": "y"
    },
    {
        "n": "宝鸡",
        "i": 6103,
        "p": 61,
        "y": "b"
    },
    {
        "n": "渭滨",
        "i": 610302,
        "p": 6103,
        "y": "w"
    },
    {
        "n": "金台",
        "i": 610303,
        "p": 6103,
        "y": "j"
    },
    {
        "n": "陈仓",
        "i": 610304,
        "p": 6103,
        "y": "c"
    },
    {
        "n": "凤翔",
        "i": 610322,
        "p": 6103,
        "y": "f"
    },
    {
        "n": "岐山",
        "i": 610323,
        "p": 6103,
        "y": "q"
    },
    {
        "n": "扶风",
        "i": 610324,
        "p": 6103,
        "y": "f"
    },
    {
        "n": "眉县",
        "i": 610326,
        "p": 6103,
        "y": "m"
    },
    {
        "n": "陇县",
        "i": 610327,
        "p": 6103,
        "y": "l"
    },
    {
        "n": "千阳",
        "i": 610328,
        "p": 6103,
        "y": "q"
    },
    {
        "n": "麟游",
        "i": 610329,
        "p": 6103,
        "y": "l"
    },
    {
        "n": "凤县",
        "i": 610330,
        "p": 6103,
        "y": "f"
    },
    {
        "n": "太白",
        "i": 610331,
        "p": 6103,
        "y": "t"
    },
    {
        "n": "咸阳",
        "i": 6104,
        "p": 61,
        "y": "x"
    },
    {
        "n": "秦都",
        "i": 610402,
        "p": 6104,
        "y": "q"
    },
    {
        "n": "杨陵",
        "i": 610403,
        "p": 6104,
        "y": "y"
    },
    {
        "n": "渭城",
        "i": 610404,
        "p": 6104,
        "y": "w"
    },
    {
        "n": "三原",
        "i": 610422,
        "p": 6104,
        "y": "s"
    },
    {
        "n": "泾阳",
        "i": 610423,
        "p": 6104,
        "y": "j"
    },
    {
        "n": "乾县",
        "i": 610424,
        "p": 6104,
        "y": "q"
    },
    {
        "n": "礼泉",
        "i": 610425,
        "p": 6104,
        "y": "l"
    },
    {
        "n": "永寿",
        "i": 610426,
        "p": 6104,
        "y": "y"
    },
    {
        "n": "长武",
        "i": 610428,
        "p": 6104,
        "y": "c"
    },
    {
        "n": "旬邑",
        "i": 610429,
        "p": 6104,
        "y": "x"
    },
    {
        "n": "淳化",
        "i": 610430,
        "p": 6104,
        "y": "c"
    },
    {
        "n": "武功",
        "i": 610431,
        "p": 6104,
        "y": "w"
    },
    {
        "n": "兴平",
        "i": 610481,
        "p": 6104,
        "y": "x"
    },
    {
        "n": "彬州",
        "i": 610482,
        "p": 6104,
        "y": "b"
    },
    {
        "n": "渭南",
        "i": 6105,
        "p": 61,
        "y": "w"
    },
    {
        "n": "临渭",
        "i": 610502,
        "p": 6105,
        "y": "l"
    },
    {
        "n": "华州",
        "i": 610503,
        "p": 6105,
        "y": "h"
    },
    {
        "n": "潼关",
        "i": 610522,
        "p": 6105,
        "y": "t"
    },
    {
        "n": "大荔",
        "i": 610523,
        "p": 6105,
        "y": "d"
    },
    {
        "n": "合阳",
        "i": 610524,
        "p": 6105,
        "y": "h"
    },
    {
        "n": "澄城",
        "i": 610525,
        "p": 6105,
        "y": "c"
    },
    {
        "n": "蒲城",
        "i": 610526,
        "p": 6105,
        "y": "p"
    },
    {
        "n": "白水",
        "i": 610527,
        "p": 6105,
        "y": "b"
    },
    {
        "n": "富平",
        "i": 610528,
        "p": 6105,
        "y": "f"
    },
    {
        "n": "韩城",
        "i": 610581,
        "p": 6105,
        "y": "h"
    },
    {
        "n": "华阴",
        "i": 610582,
        "p": 6105,
        "y": "h"
    },
    {
        "n": "延安",
        "i": 6106,
        "p": 61,
        "y": "y"
    },
    {
        "n": "宝塔",
        "i": 610602,
        "p": 6106,
        "y": "b"
    },
    {
        "n": "安塞",
        "i": 610603,
        "p": 6106,
        "y": "a"
    },
    {
        "n": "延长",
        "i": 610621,
        "p": 6106,
        "y": "y"
    },
    {
        "n": "延川",
        "i": 610622,
        "p": 6106,
        "y": "y"
    },
    {
        "n": "志丹",
        "i": 610625,
        "p": 6106,
        "y": "z"
    },
    {
        "n": "吴起",
        "i": 610626,
        "p": 6106,
        "y": "w"
    },
    {
        "n": "甘泉",
        "i": 610627,
        "p": 6106,
        "y": "g"
    },
    {
        "n": "富县",
        "i": 610628,
        "p": 6106,
        "y": "f"
    },
    {
        "n": "洛川",
        "i": 610629,
        "p": 6106,
        "y": "l"
    },
    {
        "n": "宜川",
        "i": 610630,
        "p": 6106,
        "y": "y"
    },
    {
        "n": "黄龙",
        "i": 610631,
        "p": 6106,
        "y": "h"
    },
    {
        "n": "黄陵",
        "i": 610632,
        "p": 6106,
        "y": "h"
    },
    {
        "n": "子长",
        "i": 610681,
        "p": 6106,
        "y": "z"
    },
    {
        "n": "汉中",
        "i": 6107,
        "p": 61,
        "y": "h"
    },
    {
        "n": "汉台",
        "i": 610702,
        "p": 6107,
        "y": "h"
    },
    {
        "n": "南郑",
        "i": 610703,
        "p": 6107,
        "y": "n"
    },
    {
        "n": "城固",
        "i": 610722,
        "p": 6107,
        "y": "c"
    },
    {
        "n": "洋县",
        "i": 610723,
        "p": 6107,
        "y": "y"
    },
    {
        "n": "西乡",
        "i": 610724,
        "p": 6107,
        "y": "x"
    },
    {
        "n": "勉县",
        "i": 610725,
        "p": 6107,
        "y": "m"
    },
    {
        "n": "宁强",
        "i": 610726,
        "p": 6107,
        "y": "n"
    },
    {
        "n": "略阳",
        "i": 610727,
        "p": 6107,
        "y": "l"
    },
    {
        "n": "镇巴",
        "i": 610728,
        "p": 6107,
        "y": "z"
    },
    {
        "n": "留坝",
        "i": 610729,
        "p": 6107,
        "y": "l"
    },
    {
        "n": "佛坪",
        "i": 610730,
        "p": 6107,
        "y": "f"
    },
    {
        "n": "榆林",
        "i": 6108,
        "p": 61,
        "y": "y"
    },
    {
        "n": "榆阳",
        "i": 610802,
        "p": 6108,
        "y": "y"
    },
    {
        "n": "横山",
        "i": 610803,
        "p": 6108,
        "y": "h"
    },
    {
        "n": "府谷",
        "i": 610822,
        "p": 6108,
        "y": "f"
    },
    {
        "n": "靖边",
        "i": 610824,
        "p": 6108,
        "y": "j"
    },
    {
        "n": "定边",
        "i": 610825,
        "p": 6108,
        "y": "d"
    },
    {
        "n": "绥德",
        "i": 610826,
        "p": 6108,
        "y": "s"
    },
    {
        "n": "米脂",
        "i": 610827,
        "p": 6108,
        "y": "m"
    },
    {
        "n": "佳县",
        "i": 610828,
        "p": 6108,
        "y": "j"
    },
    {
        "n": "吴堡",
        "i": 610829,
        "p": 6108,
        "y": "w"
    },
    {
        "n": "清涧",
        "i": 610830,
        "p": 6108,
        "y": "q"
    },
    {
        "n": "子洲",
        "i": 610831,
        "p": 6108,
        "y": "z"
    },
    {
        "n": "神木",
        "i": 610881,
        "p": 6108,
        "y": "s"
    },
    {
        "n": "安康",
        "i": 6109,
        "p": 61,
        "y": "a"
    },
    {
        "n": "汉滨",
        "i": 610902,
        "p": 6109,
        "y": "h"
    },
    {
        "n": "汉阴",
        "i": 610921,
        "p": 6109,
        "y": "h"
    },
    {
        "n": "石泉",
        "i": 610922,
        "p": 6109,
        "y": "s"
    },
    {
        "n": "宁陕",
        "i": 610923,
        "p": 6109,
        "y": "n"
    },
    {
        "n": "紫阳",
        "i": 610924,
        "p": 6109,
        "y": "z"
    },
    {
        "n": "岚皋",
        "i": 610925,
        "p": 6109,
        "y": "l"
    },
    {
        "n": "平利",
        "i": 610926,
        "p": 6109,
        "y": "p"
    },
    {
        "n": "镇坪",
        "i": 610927,
        "p": 6109,
        "y": "z"
    },
    {
        "n": "旬阳",
        "i": 610928,
        "p": 6109,
        "y": "x"
    },
    {
        "n": "白河",
        "i": 610929,
        "p": 6109,
        "y": "b"
    },
    {
        "n": "商洛",
        "i": 6110,
        "p": 61,
        "y": "s"
    },
    {
        "n": "商州",
        "i": 611002,
        "p": 6110,
        "y": "s"
    },
    {
        "n": "洛南",
        "i": 611021,
        "p": 6110,
        "y": "l"
    },
    {
        "n": "丹凤",
        "i": 611022,
        "p": 6110,
        "y": "d"
    },
    {
        "n": "商南",
        "i": 611023,
        "p": 6110,
        "y": "s"
    },
    {
        "n": "山阳",
        "i": 611024,
        "p": 6110,
        "y": "s"
    },
    {
        "n": "镇安",
        "i": 611025,
        "p": 6110,
        "y": "z"
    },
    {
        "n": "柞水",
        "i": 611026,
        "p": 6110,
        "y": "z"
    },
    {
        "n": "甘肃",
        "i": 62,
        "p": 0,
        "y": "g"
    },
    {
        "n": "兰州",
        "i": 6201,
        "p": 62,
        "y": "l"
    },
    {
        "n": "城关",
        "i": 620102,
        "p": 6201,
        "y": "c"
    },
    {
        "n": "七里河",
        "i": 620103,
        "p": 6201,
        "y": "q"
    },
    {
        "n": "西固",
        "i": 620104,
        "p": 6201,
        "y": "x"
    },
    {
        "n": "安宁",
        "i": 620105,
        "p": 6201,
        "y": "a"
    },
    {
        "n": "红古",
        "i": 620111,
        "p": 6201,
        "y": "h"
    },
    {
        "n": "永登",
        "i": 620121,
        "p": 6201,
        "y": "y"
    },
    {
        "n": "皋兰",
        "i": 620122,
        "p": 6201,
        "y": "g"
    },
    {
        "n": "榆中",
        "i": 620123,
        "p": 6201,
        "y": "y"
    },
    {
        "n": "嘉峪关",
        "i": 6202,
        "p": 62,
        "y": "j"
    },
    {
        "n": "嘉峪关",
        "i": 620201,
        "p": 6202,
        "y": "j"
    },
    {
        "n": "金昌",
        "i": 6203,
        "p": 62,
        "y": "j"
    },
    {
        "n": "金川",
        "i": 620302,
        "p": 6203,
        "y": "j"
    },
    {
        "n": "永昌",
        "i": 620321,
        "p": 6203,
        "y": "y"
    },
    {
        "n": "白银",
        "i": 6204,
        "p": 62,
        "y": "b"
    },
    {
        "n": "白银区",
        "i": 620402,
        "p": 6204,
        "y": "b"
    },
    {
        "n": "平川",
        "i": 620403,
        "p": 6204,
        "y": "p"
    },
    {
        "n": "靖远",
        "i": 620421,
        "p": 6204,
        "y": "j"
    },
    {
        "n": "会宁",
        "i": 620422,
        "p": 6204,
        "y": "h"
    },
    {
        "n": "景泰",
        "i": 620423,
        "p": 6204,
        "y": "j"
    },
    {
        "n": "天水",
        "i": 6205,
        "p": 62,
        "y": "t"
    },
    {
        "n": "秦州",
        "i": 620502,
        "p": 6205,
        "y": "q"
    },
    {
        "n": "麦积",
        "i": 620503,
        "p": 6205,
        "y": "m"
    },
    {
        "n": "清水",
        "i": 620521,
        "p": 6205,
        "y": "q"
    },
    {
        "n": "秦安",
        "i": 620522,
        "p": 6205,
        "y": "q"
    },
    {
        "n": "甘谷",
        "i": 620523,
        "p": 6205,
        "y": "g"
    },
    {
        "n": "武山",
        "i": 620524,
        "p": 6205,
        "y": "w"
    },
    {
        "n": "张家川",
        "i": 620525,
        "p": 6205,
        "y": "z"
    },
    {
        "n": "武威",
        "i": 6206,
        "p": 62,
        "y": "w"
    },
    {
        "n": "凉州",
        "i": 620602,
        "p": 6206,
        "y": "l"
    },
    {
        "n": "民勤",
        "i": 620621,
        "p": 6206,
        "y": "m"
    },
    {
        "n": "古浪",
        "i": 620622,
        "p": 6206,
        "y": "g"
    },
    {
        "n": "天祝",
        "i": 620623,
        "p": 6206,
        "y": "t"
    },
    {
        "n": "张掖",
        "i": 6207,
        "p": 62,
        "y": "z"
    },
    {
        "n": "甘州",
        "i": 620702,
        "p": 6207,
        "y": "g"
    },
    {
        "n": "肃南",
        "i": 620721,
        "p": 6207,
        "y": "s"
    },
    {
        "n": "民乐",
        "i": 620722,
        "p": 6207,
        "y": "m"
    },
    {
        "n": "临泽",
        "i": 620723,
        "p": 6207,
        "y": "l"
    },
    {
        "n": "高台",
        "i": 620724,
        "p": 6207,
        "y": "g"
    },
    {
        "n": "山丹",
        "i": 620725,
        "p": 6207,
        "y": "s"
    },
    {
        "n": "平凉",
        "i": 6208,
        "p": 62,
        "y": "p"
    },
    {
        "n": "崆峒",
        "i": 620802,
        "p": 6208,
        "y": "k"
    },
    {
        "n": "泾川",
        "i": 620821,
        "p": 6208,
        "y": "j"
    },
    {
        "n": "灵台",
        "i": 620822,
        "p": 6208,
        "y": "l"
    },
    {
        "n": "崇信",
        "i": 620823,
        "p": 6208,
        "y": "c"
    },
    {
        "n": "庄浪",
        "i": 620825,
        "p": 6208,
        "y": "z"
    },
    {
        "n": "静宁",
        "i": 620826,
        "p": 6208,
        "y": "j"
    },
    {
        "n": "华亭",
        "i": 620881,
        "p": 6208,
        "y": "h"
    },
    {
        "n": "酒泉",
        "i": 6209,
        "p": 62,
        "y": "j"
    },
    {
        "n": "肃州",
        "i": 620902,
        "p": 6209,
        "y": "s"
    },
    {
        "n": "金塔",
        "i": 620921,
        "p": 6209,
        "y": "j"
    },
    {
        "n": "瓜州",
        "i": 620922,
        "p": 6209,
        "y": "g"
    },
    {
        "n": "肃北",
        "i": 620923,
        "p": 6209,
        "y": "s"
    },
    {
        "n": "阿克塞",
        "i": 620924,
        "p": 6209,
        "y": "a"
    },
    {
        "n": "玉门",
        "i": 620981,
        "p": 6209,
        "y": "y"
    },
    {
        "n": "敦煌",
        "i": 620982,
        "p": 6209,
        "y": "d"
    },
    {
        "n": "庆阳",
        "i": 6210,
        "p": 62,
        "y": "q"
    },
    {
        "n": "西峰",
        "i": 621002,
        "p": 6210,
        "y": "x"
    },
    {
        "n": "庆城",
        "i": 621021,
        "p": 6210,
        "y": "q"
    },
    {
        "n": "环县",
        "i": 621022,
        "p": 6210,
        "y": "h"
    },
    {
        "n": "华池",
        "i": 621023,
        "p": 6210,
        "y": "h"
    },
    {
        "n": "合水",
        "i": 621024,
        "p": 6210,
        "y": "h"
    },
    {
        "n": "正宁",
        "i": 621025,
        "p": 6210,
        "y": "z"
    },
    {
        "n": "宁县",
        "i": 621026,
        "p": 6210,
        "y": "n"
    },
    {
        "n": "镇原",
        "i": 621027,
        "p": 6210,
        "y": "z"
    },
    {
        "n": "定西",
        "i": 6211,
        "p": 62,
        "y": "d"
    },
    {
        "n": "安定",
        "i": 621102,
        "p": 6211,
        "y": "a"
    },
    {
        "n": "通渭",
        "i": 621121,
        "p": 6211,
        "y": "t"
    },
    {
        "n": "陇西",
        "i": 621122,
        "p": 6211,
        "y": "l"
    },
    {
        "n": "渭源",
        "i": 621123,
        "p": 6211,
        "y": "w"
    },
    {
        "n": "临洮",
        "i": 621124,
        "p": 6211,
        "y": "l"
    },
    {
        "n": "漳县",
        "i": 621125,
        "p": 6211,
        "y": "z"
    },
    {
        "n": "岷县",
        "i": 621126,
        "p": 6211,
        "y": "m"
    },
    {
        "n": "陇南",
        "i": 6212,
        "p": 62,
        "y": "l"
    },
    {
        "n": "武都",
        "i": 621202,
        "p": 6212,
        "y": "w"
    },
    {
        "n": "成县",
        "i": 621221,
        "p": 6212,
        "y": "c"
    },
    {
        "n": "文县",
        "i": 621222,
        "p": 6212,
        "y": "w"
    },
    {
        "n": "宕昌",
        "i": 621223,
        "p": 6212,
        "y": "d"
    },
    {
        "n": "康县",
        "i": 621224,
        "p": 6212,
        "y": "k"
    },
    {
        "n": "西和",
        "i": 621225,
        "p": 6212,
        "y": "x"
    },
    {
        "n": "礼县",
        "i": 621226,
        "p": 6212,
        "y": "l"
    },
    {
        "n": "徽县",
        "i": 621227,
        "p": 6212,
        "y": "h"
    },
    {
        "n": "两当",
        "i": 621228,
        "p": 6212,
        "y": "l"
    },
    {
        "n": "临夏",
        "i": 6229,
        "p": 62,
        "y": "l"
    },
    {
        "n": "临夏市",
        "i": 622901,
        "p": 6229,
        "y": "l"
    },
    {
        "n": "临夏县",
        "i": 622921,
        "p": 6229,
        "y": "l"
    },
    {
        "n": "康乐",
        "i": 622922,
        "p": 6229,
        "y": "k"
    },
    {
        "n": "永靖",
        "i": 622923,
        "p": 6229,
        "y": "y"
    },
    {
        "n": "广河",
        "i": 622924,
        "p": 6229,
        "y": "g"
    },
    {
        "n": "和政",
        "i": 622925,
        "p": 6229,
        "y": "h"
    },
    {
        "n": "东乡族自治县",
        "i": 622926,
        "p": 6229,
        "y": "d"
    },
    {
        "n": "积石山",
        "i": 622927,
        "p": 6229,
        "y": "j"
    },
    {
        "n": "甘南",
        "i": 6230,
        "p": 62,
        "y": "g"
    },
    {
        "n": "合作",
        "i": 623001,
        "p": 6230,
        "y": "h"
    },
    {
        "n": "临潭",
        "i": 623021,
        "p": 6230,
        "y": "l"
    },
    {
        "n": "卓尼",
        "i": 623022,
        "p": 6230,
        "y": "z"
    },
    {
        "n": "舟曲",
        "i": 623023,
        "p": 6230,
        "y": "z"
    },
    {
        "n": "迭部",
        "i": 623024,
        "p": 6230,
        "y": "d"
    },
    {
        "n": "玛曲",
        "i": 623025,
        "p": 6230,
        "y": "m"
    },
    {
        "n": "碌曲",
        "i": 623026,
        "p": 6230,
        "y": "l"
    },
    {
        "n": "夏河",
        "i": 623027,
        "p": 6230,
        "y": "x"
    },
    {
        "n": "青海",
        "i": 63,
        "p": 0,
        "y": "q"
    },
    {
        "n": "西宁",
        "i": 6301,
        "p": 63,
        "y": "x"
    },
    {
        "n": "城东",
        "i": 630102,
        "p": 6301,
        "y": "c"
    },
    {
        "n": "城中",
        "i": 630103,
        "p": 6301,
        "y": "c"
    },
    {
        "n": "城西",
        "i": 630104,
        "p": 6301,
        "y": "c"
    },
    {
        "n": "城北",
        "i": 630105,
        "p": 6301,
        "y": "c"
    },
    {
        "n": "湟中",
        "i": 630106,
        "p": 6301,
        "y": "h"
    },
    {
        "n": "大通",
        "i": 630121,
        "p": 6301,
        "y": "d"
    },
    {
        "n": "湟源",
        "i": 630123,
        "p": 6301,
        "y": "h"
    },
    {
        "n": "海东",
        "i": 6302,
        "p": 63,
        "y": "h"
    },
    {
        "n": "乐都",
        "i": 630202,
        "p": 6302,
        "y": "l"
    },
    {
        "n": "平安",
        "i": 630203,
        "p": 6302,
        "y": "p"
    },
    {
        "n": "民和",
        "i": 630222,
        "p": 6302,
        "y": "m"
    },
    {
        "n": "互助",
        "i": 630223,
        "p": 6302,
        "y": "h"
    },
    {
        "n": "化隆",
        "i": 630224,
        "p": 6302,
        "y": "h"
    },
    {
        "n": "循化",
        "i": 630225,
        "p": 6302,
        "y": "x"
    },
    {
        "n": "海北",
        "i": 6322,
        "p": 63,
        "y": "h"
    },
    {
        "n": "门源",
        "i": 632221,
        "p": 6322,
        "y": "m"
    },
    {
        "n": "祁连",
        "i": 632222,
        "p": 6322,
        "y": "q"
    },
    {
        "n": "海晏",
        "i": 632223,
        "p": 6322,
        "y": "h"
    },
    {
        "n": "刚察",
        "i": 632224,
        "p": 6322,
        "y": "g"
    },
    {
        "n": "黄南",
        "i": 6323,
        "p": 63,
        "y": "h"
    },
    {
        "n": "同仁",
        "i": 632321,
        "p": 6323,
        "y": "t"
    },
    {
        "n": "尖扎",
        "i": 632322,
        "p": 6323,
        "y": "j"
    },
    {
        "n": "泽库",
        "i": 632323,
        "p": 6323,
        "y": "z"
    },
    {
        "n": "河南",
        "i": 632324,
        "p": 6323,
        "y": "h"
    },
    {
        "n": "海南",
        "i": 6325,
        "p": 63,
        "y": "h"
    },
    {
        "n": "共和",
        "i": 632521,
        "p": 6325,
        "y": "g"
    },
    {
        "n": "同德",
        "i": 632522,
        "p": 6325,
        "y": "t"
    },
    {
        "n": "贵德",
        "i": 632523,
        "p": 6325,
        "y": "g"
    },
    {
        "n": "兴海",
        "i": 632524,
        "p": 6325,
        "y": "x"
    },
    {
        "n": "贵南",
        "i": 632525,
        "p": 6325,
        "y": "g"
    },
    {
        "n": "果洛",
        "i": 6326,
        "p": 63,
        "y": "g"
    },
    {
        "n": "玛沁",
        "i": 632621,
        "p": 6326,
        "y": "m"
    },
    {
        "n": "班玛",
        "i": 632622,
        "p": 6326,
        "y": "b"
    },
    {
        "n": "甘德",
        "i": 632623,
        "p": 6326,
        "y": "g"
    },
    {
        "n": "达日",
        "i": 632624,
        "p": 6326,
        "y": "d"
    },
    {
        "n": "久治",
        "i": 632625,
        "p": 6326,
        "y": "j"
    },
    {
        "n": "玛多",
        "i": 632626,
        "p": 6326,
        "y": "m"
    },
    {
        "n": "玉树",
        "i": 6327,
        "p": 63,
        "y": "y"
    },
    {
        "n": "玉树市",
        "i": 632701,
        "p": 6327,
        "y": "y"
    },
    {
        "n": "杂多",
        "i": 632722,
        "p": 6327,
        "y": "z"
    },
    {
        "n": "称多",
        "i": 632723,
        "p": 6327,
        "y": "c"
    },
    {
        "n": "治多",
        "i": 632724,
        "p": 6327,
        "y": "z"
    },
    {
        "n": "囊谦",
        "i": 632725,
        "p": 6327,
        "y": "n"
    },
    {
        "n": "曲麻莱",
        "i": 632726,
        "p": 6327,
        "y": "q"
    },
    {
        "n": "海西",
        "i": 6328,
        "p": 63,
        "y": "h"
    },
    {
        "n": "格尔木",
        "i": 632801,
        "p": 6328,
        "y": "g"
    },
    {
        "n": "德令哈",
        "i": 632802,
        "p": 6328,
        "y": "d"
    },
    {
        "n": "茫崖",
        "i": 632803,
        "p": 6328,
        "y": "m"
    },
    {
        "n": "乌兰",
        "i": 632821,
        "p": 6328,
        "y": "w"
    },
    {
        "n": "都兰",
        "i": 632822,
        "p": 6328,
        "y": "d"
    },
    {
        "n": "天峻",
        "i": 632823,
        "p": 6328,
        "y": "t"
    },
    {
        "n": "大柴旦行政委员会",
        "i": 632857,
        "p": 6328,
        "y": "d"
    },
    {
        "n": "宁夏",
        "i": 64,
        "p": 0,
        "y": "n"
    },
    {
        "n": "银川",
        "i": 6401,
        "p": 64,
        "y": "y"
    },
    {
        "n": "兴庆",
        "i": 640104,
        "p": 6401,
        "y": "x"
    },
    {
        "n": "西夏",
        "i": 640105,
        "p": 6401,
        "y": "x"
    },
    {
        "n": "金凤",
        "i": 640106,
        "p": 6401,
        "y": "j"
    },
    {
        "n": "永宁",
        "i": 640121,
        "p": 6401,
        "y": "y"
    },
    {
        "n": "贺兰",
        "i": 640122,
        "p": 6401,
        "y": "h"
    },
    {
        "n": "灵武",
        "i": 640181,
        "p": 6401,
        "y": "l"
    },
    {
        "n": "石嘴山",
        "i": 6402,
        "p": 64,
        "y": "s"
    },
    {
        "n": "大武口",
        "i": 640202,
        "p": 6402,
        "y": "d"
    },
    {
        "n": "惠农",
        "i": 640205,
        "p": 6402,
        "y": "h"
    },
    {
        "n": "平罗",
        "i": 640221,
        "p": 6402,
        "y": "p"
    },
    {
        "n": "吴忠",
        "i": 6403,
        "p": 64,
        "y": "w"
    },
    {
        "n": "利通",
        "i": 640302,
        "p": 6403,
        "y": "l"
    },
    {
        "n": "红寺堡",
        "i": 640303,
        "p": 6403,
        "y": "h"
    },
    {
        "n": "盐池",
        "i": 640323,
        "p": 6403,
        "y": "y"
    },
    {
        "n": "同心",
        "i": 640324,
        "p": 6403,
        "y": "t"
    },
    {
        "n": "青铜峡",
        "i": 640381,
        "p": 6403,
        "y": "q"
    },
    {
        "n": "固原",
        "i": 6404,
        "p": 64,
        "y": "g"
    },
    {
        "n": "原州",
        "i": 640402,
        "p": 6404,
        "y": "y"
    },
    {
        "n": "西吉",
        "i": 640422,
        "p": 6404,
        "y": "x"
    },
    {
        "n": "隆德",
        "i": 640423,
        "p": 6404,
        "y": "l"
    },
    {
        "n": "泾源",
        "i": 640424,
        "p": 6404,
        "y": "j"
    },
    {
        "n": "彭阳",
        "i": 640425,
        "p": 6404,
        "y": "p"
    },
    {
        "n": "中卫",
        "i": 6405,
        "p": 64,
        "y": "z"
    },
    {
        "n": "沙坡头",
        "i": 640502,
        "p": 6405,
        "y": "s"
    },
    {
        "n": "中宁",
        "i": 640521,
        "p": 6405,
        "y": "z"
    },
    {
        "n": "海原",
        "i": 640522,
        "p": 6405,
        "y": "h"
    },
    {
        "n": "新疆",
        "i": 65,
        "p": 0,
        "y": "x"
    },
    {
        "n": "乌鲁木齐",
        "i": 6501,
        "p": 65,
        "y": "w"
    },
    {
        "n": "天山",
        "i": 650102,
        "p": 6501,
        "y": "t"
    },
    {
        "n": "沙依巴克区",
        "i": 650103,
        "p": 6501,
        "y": "s"
    },
    {
        "n": "新市",
        "i": 650104,
        "p": 6501,
        "y": "x"
    },
    {
        "n": "水磨沟",
        "i": 650105,
        "p": 6501,
        "y": "s"
    },
    {
        "n": "头屯河",
        "i": 650106,
        "p": 6501,
        "y": "t"
    },
    {
        "n": "达坂城",
        "i": 650107,
        "p": 6501,
        "y": "d"
    },
    {
        "n": "米东",
        "i": 650109,
        "p": 6501,
        "y": "m"
    },
    {
        "n": "乌鲁木齐县",
        "i": 650121,
        "p": 6501,
        "y": "w"
    },
    {
        "n": "克拉玛依",
        "i": 6502,
        "p": 65,
        "y": "k"
    },
    {
        "n": "独山子",
        "i": 650202,
        "p": 6502,
        "y": "d"
    },
    {
        "n": "克拉玛依区",
        "i": 650203,
        "p": 6502,
        "y": "k"
    },
    {
        "n": "白碱滩",
        "i": 650204,
        "p": 6502,
        "y": "b"
    },
    {
        "n": "乌尔禾",
        "i": 650205,
        "p": 6502,
        "y": "w"
    },
    {
        "n": "吐鲁番",
        "i": 6504,
        "p": 65,
        "y": "t"
    },
    {
        "n": "高昌",
        "i": 650402,
        "p": 6504,
        "y": "g"
    },
    {
        "n": "鄯善",
        "i": 650421,
        "p": 6504,
        "y": "s"
    },
    {
        "n": "托克逊",
        "i": 650422,
        "p": 6504,
        "y": "t"
    },
    {
        "n": "哈密",
        "i": 6505,
        "p": 65,
        "y": "h"
    },
    {
        "n": "伊州",
        "i": 650502,
        "p": 6505,
        "y": "y"
    },
    {
        "n": "巴里坤",
        "i": 650521,
        "p": 6505,
        "y": "b"
    },
    {
        "n": "伊吾",
        "i": 650522,
        "p": 6505,
        "y": "y"
    },
    {
        "n": "昌吉",
        "i": 6523,
        "p": 65,
        "y": "c"
    },
    {
        "n": "昌吉市",
        "i": 652301,
        "p": 6523,
        "y": "c"
    },
    {
        "n": "阜康",
        "i": 652302,
        "p": 6523,
        "y": "f"
    },
    {
        "n": "呼图壁",
        "i": 652323,
        "p": 6523,
        "y": "h"
    },
    {
        "n": "玛纳斯",
        "i": 652324,
        "p": 6523,
        "y": "m"
    },
    {
        "n": "奇台",
        "i": 652325,
        "p": 6523,
        "y": "q"
    },
    {
        "n": "吉木萨尔",
        "i": 652327,
        "p": 6523,
        "y": "j"
    },
    {
        "n": "木垒",
        "i": 652328,
        "p": 6523,
        "y": "m"
    },
    {
        "n": "博尔塔拉",
        "i": 6527,
        "p": 65,
        "y": "b"
    },
    {
        "n": "博乐",
        "i": 652701,
        "p": 6527,
        "y": "b"
    },
    {
        "n": "阿拉山口",
        "i": 652702,
        "p": 6527,
        "y": "a"
    },
    {
        "n": "精河",
        "i": 652722,
        "p": 6527,
        "y": "j"
    },
    {
        "n": "温泉",
        "i": 652723,
        "p": 6527,
        "y": "w"
    },
    {
        "n": "巴音郭楞",
        "i": 6528,
        "p": 65,
        "y": "b"
    },
    {
        "n": "库尔勒",
        "i": 652801,
        "p": 6528,
        "y": "k"
    },
    {
        "n": "轮台",
        "i": 652822,
        "p": 6528,
        "y": "l"
    },
    {
        "n": "尉犁",
        "i": 652823,
        "p": 6528,
        "y": "y"
    },
    {
        "n": "若羌",
        "i": 652824,
        "p": 6528,
        "y": "r"
    },
    {
        "n": "且末",
        "i": 652825,
        "p": 6528,
        "y": "q"
    },
    {
        "n": "焉耆",
        "i": 652826,
        "p": 6528,
        "y": "y"
    },
    {
        "n": "和静",
        "i": 652827,
        "p": 6528,
        "y": "h"
    },
    {
        "n": "和硕",
        "i": 652828,
        "p": 6528,
        "y": "h"
    },
    {
        "n": "博湖",
        "i": 652829,
        "p": 6528,
        "y": "b"
    },
    {
        "n": "阿克苏",
        "i": 6529,
        "p": 65,
        "y": "a"
    },
    {
        "n": "阿克苏市",
        "i": 652901,
        "p": 6529,
        "y": "a"
    },
    {
        "n": "库车",
        "i": 652902,
        "p": 6529,
        "y": "k"
    },
    {
        "n": "温宿",
        "i": 652922,
        "p": 6529,
        "y": "w"
    },
    {
        "n": "沙雅",
        "i": 652924,
        "p": 6529,
        "y": "s"
    },
    {
        "n": "新和",
        "i": 652925,
        "p": 6529,
        "y": "x"
    },
    {
        "n": "拜城",
        "i": 652926,
        "p": 6529,
        "y": "b"
    },
    {
        "n": "乌什",
        "i": 652927,
        "p": 6529,
        "y": "w"
    },
    {
        "n": "阿瓦提",
        "i": 652928,
        "p": 6529,
        "y": "a"
    },
    {
        "n": "柯坪",
        "i": 652929,
        "p": 6529,
        "y": "k"
    },
    {
        "n": "克孜勒苏",
        "i": 6530,
        "p": 65,
        "y": "k"
    },
    {
        "n": "阿图什",
        "i": 653001,
        "p": 6530,
        "y": "a"
    },
    {
        "n": "阿克陶",
        "i": 653022,
        "p": 6530,
        "y": "a"
    },
    {
        "n": "阿合奇",
        "i": 653023,
        "p": 6530,
        "y": "a"
    },
    {
        "n": "乌恰",
        "i": 653024,
        "p": 6530,
        "y": "w"
    },
    {
        "n": "喀什",
        "i": 6531,
        "p": 65,
        "y": "k"
    },
    {
        "n": "喀什市",
        "i": 653101,
        "p": 6531,
        "y": "k"
    },
    {
        "n": "疏附",
        "i": 653121,
        "p": 6531,
        "y": "s"
    },
    {
        "n": "疏勒",
        "i": 653122,
        "p": 6531,
        "y": "s"
    },
    {
        "n": "英吉沙",
        "i": 653123,
        "p": 6531,
        "y": "y"
    },
    {
        "n": "泽普",
        "i": 653124,
        "p": 6531,
        "y": "z"
    },
    {
        "n": "莎车",
        "i": 653125,
        "p": 6531,
        "y": "s"
    },
    {
        "n": "叶城",
        "i": 653126,
        "p": 6531,
        "y": "y"
    },
    {
        "n": "麦盖提",
        "i": 653127,
        "p": 6531,
        "y": "m"
    },
    {
        "n": "岳普湖",
        "i": 653128,
        "p": 6531,
        "y": "y"
    },
    {
        "n": "伽师",
        "i": 653129,
        "p": 6531,
        "y": "j"
    },
    {
        "n": "巴楚",
        "i": 653130,
        "p": 6531,
        "y": "b"
    },
    {
        "n": "塔什库尔干",
        "i": 653131,
        "p": 6531,
        "y": "t"
    },
    {
        "n": "和田",
        "i": 6532,
        "p": 65,
        "y": "h"
    },
    {
        "n": "和田市",
        "i": 653201,
        "p": 6532,
        "y": "h"
    },
    {
        "n": "和田县",
        "i": 653221,
        "p": 6532,
        "y": "h"
    },
    {
        "n": "墨玉",
        "i": 653222,
        "p": 6532,
        "y": "m"
    },
    {
        "n": "皮山",
        "i": 653223,
        "p": 6532,
        "y": "p"
    },
    {
        "n": "洛浦",
        "i": 653224,
        "p": 6532,
        "y": "l"
    },
    {
        "n": "策勒",
        "i": 653225,
        "p": 6532,
        "y": "c"
    },
    {
        "n": "于田",
        "i": 653226,
        "p": 6532,
        "y": "y"
    },
    {
        "n": "民丰",
        "i": 653227,
        "p": 6532,
        "y": "m"
    },
    {
        "n": "伊犁",
        "i": 6540,
        "p": 65,
        "y": "y"
    },
    {
        "n": "伊宁市",
        "i": 654002,
        "p": 6540,
        "y": "y"
    },
    {
        "n": "奎屯",
        "i": 654003,
        "p": 6540,
        "y": "k"
    },
    {
        "n": "霍尔果斯",
        "i": 654004,
        "p": 6540,
        "y": "h"
    },
    {
        "n": "伊宁县",
        "i": 654021,
        "p": 6540,
        "y": "y"
    },
    {
        "n": "察布查尔",
        "i": 654022,
        "p": 6540,
        "y": "c"
    },
    {
        "n": "霍城",
        "i": 654023,
        "p": 6540,
        "y": "h"
    },
    {
        "n": "巩留",
        "i": 654024,
        "p": 6540,
        "y": "g"
    },
    {
        "n": "新源",
        "i": 654025,
        "p": 6540,
        "y": "x"
    },
    {
        "n": "昭苏",
        "i": 654026,
        "p": 6540,
        "y": "z"
    },
    {
        "n": "特克斯",
        "i": 654027,
        "p": 6540,
        "y": "t"
    },
    {
        "n": "尼勒克",
        "i": 654028,
        "p": 6540,
        "y": "n"
    },
    {
        "n": "塔城",
        "i": 6542,
        "p": 65,
        "y": "t"
    },
    {
        "n": "塔城市",
        "i": 654201,
        "p": 6542,
        "y": "t"
    },
    {
        "n": "乌苏",
        "i": 654202,
        "p": 6542,
        "y": "w"
    },
    {
        "n": "额敏",
        "i": 654221,
        "p": 6542,
        "y": "e"
    },
    {
        "n": "沙湾",
        "i": 654223,
        "p": 6542,
        "y": "s"
    },
    {
        "n": "托里",
        "i": 654224,
        "p": 6542,
        "y": "t"
    },
    {
        "n": "裕民",
        "i": 654225,
        "p": 6542,
        "y": "y"
    },
    {
        "n": "和布克赛尔",
        "i": 654226,
        "p": 6542,
        "y": "h"
    },
    {
        "n": "阿勒泰",
        "i": 6543,
        "p": 65,
        "y": "a"
    },
    {
        "n": "阿勒泰市",
        "i": 654301,
        "p": 6543,
        "y": "a"
    },
    {
        "n": "布尔津",
        "i": 654321,
        "p": 6543,
        "y": "b"
    },
    {
        "n": "富蕴",
        "i": 654322,
        "p": 6543,
        "y": "f"
    },
    {
        "n": "福海",
        "i": 654323,
        "p": 6543,
        "y": "f"
    },
    {
        "n": "哈巴河",
        "i": 654324,
        "p": 6543,
        "y": "h"
    },
    {
        "n": "青河",
        "i": 654325,
        "p": 6543,
        "y": "q"
    },
    {
        "n": "吉木乃",
        "i": 654326,
        "p": 6543,
        "y": "j"
    },
    {
        "n": "石河子",
        "i": 659001000,
        "p": 65,
        "y": "s"
    },
    {
        "n": "新城",
        "i": 659001001,
        "p": 659001000,
        "y": "x"
    },
    {
        "n": "向阳",
        "i": 659001002,
        "p": 659001000,
        "y": "x"
    },
    {
        "n": "红山",
        "i": 659001003,
        "p": 659001000,
        "y": "h"
    },
    {
        "n": "老街",
        "i": 659001004,
        "p": 659001000,
        "y": "l"
    },
    {
        "n": "东城",
        "i": 659001005,
        "p": 659001000,
        "y": "d"
    },
    {
        "n": "北泉",
        "i": 659001100,
        "p": 659001000,
        "y": "b"
    },
    {
        "n": "石河子镇",
        "i": 659001200,
        "p": 659001000,
        "y": "s"
    },
    {
        "n": "兵团一五二团",
        "i": 659001500,
        "p": 659001000,
        "y": "b"
    },
    {
        "n": "阿拉尔",
        "i": 659002000,
        "p": 65,
        "y": "a"
    },
    {
        "n": "金银川路",
        "i": 659002001,
        "p": 659002000,
        "y": "j"
    },
    {
        "n": "幸福路",
        "i": 659002002,
        "p": 659002000,
        "y": "x"
    },
    {
        "n": "青松路",
        "i": 659002003,
        "p": 659002000,
        "y": "q"
    },
    {
        "n": "南口",
        "i": 659002004,
        "p": 659002000,
        "y": "n"
    },
    {
        "n": "托喀依",
        "i": 659002200,
        "p": 659002000,
        "y": "t"
    },
    {
        "n": "兵团七团",
        "i": 659002500,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团八团",
        "i": 659002501,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团十团",
        "i": 659002503,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团十二团",
        "i": 659002505,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团十四团",
        "i": 659002507,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团五团",
        "i": 659002508,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团十六团",
        "i": 659002509,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团第一师水利水电工程处",
        "i": 659002511,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "阿拉尔农场",
        "i": 659002513,
        "p": 659002000,
        "y": "a"
    },
    {
        "n": "兵团第一师幸福农场",
        "i": 659002514,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团二团",
        "i": 659002901,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团农一师沙井子水利管理处",
        "i": 659002902,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团九团",
        "i": 659002964,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团十一团",
        "i": 659002966,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团十三团",
        "i": 659002967,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "兵团十五团",
        "i": 659002968,
        "p": 659002000,
        "y": "b"
    },
    {
        "n": "图木舒克",
        "i": 659003000,
        "p": 65,
        "y": "t"
    },
    {
        "n": "齐干却勒",
        "i": 659003001,
        "p": 659003000,
        "y": "q"
    },
    {
        "n": "前海",
        "i": 659003002,
        "p": 659003000,
        "y": "q"
    },
    {
        "n": "永安坝",
        "i": 659003003,
        "p": 659003000,
        "y": "y"
    },
    {
        "n": "兵团四十四团",
        "i": 659003504,
        "p": 659003000,
        "y": "b"
    },
    {
        "n": "兵团四十九团",
        "i": 659003509,
        "p": 659003000,
        "y": "b"
    },
    {
        "n": "兵团五十三团",
        "i": 659003513,
        "p": 659003000,
        "y": "b"
    },
    {
        "n": "喀拉拜勒",
        "i": 659003960,
        "p": 659003000,
        "y": "k"
    },
    {
        "n": "兵团五十一团",
        "i": 659003964,
        "p": 659003000,
        "y": "b"
    },
    {
        "n": "兵团五十二团",
        "i": 659003965,
        "p": 659003000,
        "y": "b"
    },
    {
        "n": "兵团五十团",
        "i": 659003966,
        "p": 659003000,
        "y": "b"
    },
    {
        "n": "五家渠",
        "i": 659004000,
        "p": 65,
        "y": "w"
    },
    {
        "n": "军垦路",
        "i": 659004001,
        "p": 659004000,
        "y": "j"
    },
    {
        "n": "青湖路",
        "i": 659004002,
        "p": 659004000,
        "y": "q"
    },
    {
        "n": "人民路",
        "i": 659004003,
        "p": 659004000,
        "y": "r"
    },
    {
        "n": "兵团一零一团",
        "i": 659004500,
        "p": 659004000,
        "y": "b"
    },
    {
        "n": "蔡家湖",
        "i": 659004960,
        "p": 659004000,
        "y": "c"
    },
    {
        "n": "梧桐",
        "i": 659004961,
        "p": 659004000,
        "y": "w"
    },
    {
        "n": "北屯",
        "i": 659005000,
        "p": 65,
        "y": "b"
    },
    {
        "n": "兵团一八七团",
        "i": 659005502,
        "p": 659005000,
        "y": "b"
    },
    {
        "n": "兵团一八八团",
        "i": 659005503,
        "p": 659005000,
        "y": "b"
    },
    {
        "n": "铁门关",
        "i": 659006000,
        "p": 65,
        "y": "t"
    },
    {
        "n": "兵团二十九团",
        "i": 659006501,
        "p": 659006000,
        "y": "b"
    },
    {
        "n": "农二师三十团",
        "i": 659006502,
        "p": 659006000,
        "y": "n"
    },
    {
        "n": "双河",
        "i": 659007000,
        "p": 65,
        "y": "s"
    },
    {
        "n": "兵团八十一团",
        "i": 659007501,
        "p": 659007000,
        "y": "b"
    },
    {
        "n": "兵团八十四团",
        "i": 659007502,
        "p": 659007000,
        "y": "b"
    },
    {
        "n": "兵团八十六团",
        "i": 659007504,
        "p": 659007000,
        "y": "b"
    },
    {
        "n": "兵团八十九团",
        "i": 659007505,
        "p": 659007000,
        "y": "b"
    },
    {
        "n": "兵团九十团",
        "i": 659007506,
        "p": 659007000,
        "y": "b"
    },
    {
        "n": "可克达拉",
        "i": 659008000,
        "p": 65,
        "y": "k"
    },
    {
        "n": "兵团六十七团",
        "i": 659008502,
        "p": 659008000,
        "y": "b"
    },
    {
        "n": "兵团六十八团",
        "i": 659008503,
        "p": 659008000,
        "y": "b"
    },
    {
        "n": "兵团六十三团",
        "i": 659008507,
        "p": 659008000,
        "y": "b"
    },
    {
        "n": "兵团六十四团",
        "i": 659008508,
        "p": 659008000,
        "y": "b"
    },
    {
        "n": "兵团六十六团",
        "i": 659008509,
        "p": 659008000,
        "y": "b"
    },
    {
        "n": "昆玉",
        "i": 659009000,
        "p": 65,
        "y": "k"
    },
    {
        "n": "兵团一牧场",
        "i": 659009400,
        "p": 659009000,
        "y": "b"
    },
    {
        "n": "兵团皮山农场",
        "i": 659009401,
        "p": 659009000,
        "y": "b"
    },
    {
        "n": "兵团二二四团",
        "i": 659009501,
        "p": 659009000,
        "y": "b"
    },
    {
        "n": "胡杨河",
        "i": 659010000,
        "p": 65,
        "y": "h"
    },
    {
        "n": "五五新镇",
        "i": 659010006,
        "p": 659010000,
        "y": "w"
    },
    {
        "n": "兵团一二八团",
        "i": 659010505,
        "p": 659010000,
        "y": "b"
    },
    {
        "n": "兵团一二九团",
        "i": 659010506,
        "p": 659010000,
        "y": "b"
    },
    {
        "n": "香港",
        "i": 8100,
        "p": 0,
        "y": "x"
    },
    {
        "n": "香港",
        "i": 810000,
        "p": 8100,
        "y": "x"
    },
    {
        "n": "中西区",
        "i": 810101000,
        "p": 810000,
        "y": "z"
    },
    {
        "n": "东区",
        "i": 810102000,
        "p": 810000,
        "y": "d"
    },
    {
        "n": "九龙",
        "i": 810103000,
        "p": 810000,
        "y": "j"
    },
    {
        "n": "观塘区",
        "i": 810104000,
        "p": 810000,
        "y": "g"
    },
    {
        "n": "南区",
        "i": 810105000,
        "p": 810000,
        "y": "n"
    },
    {
        "n": "深水埗区",
        "i": 810106000,
        "p": 810000,
        "y": "s"
    },
    {
        "n": "湾仔区",
        "i": 810107000,
        "p": 810000,
        "y": "w"
    },
    {
        "n": "黄大仙区",
        "i": 810108000,
        "p": 810000,
        "y": "h"
    },
    {
        "n": "油尖旺区",
        "i": 810109000,
        "p": 810000,
        "y": "y"
    },
    {
        "n": "离岛区",
        "i": 810110000,
        "p": 810000,
        "y": "l"
    },
    {
        "n": "葵青区",
        "i": 810111000,
        "p": 810000,
        "y": "k"
    },
    {
        "n": "北区",
        "i": 810112000,
        "p": 810000,
        "y": "b"
    },
    {
        "n": "西贡区",
        "i": 810113000,
        "p": 810000,
        "y": "x"
    },
    {
        "n": "沙田区",
        "i": 810114000,
        "p": 810000,
        "y": "s"
    },
    {
        "n": "屯门区",
        "i": 810115000,
        "p": 810000,
        "y": "t"
    },
    {
        "n": "大埔区",
        "i": 810116000,
        "p": 810000,
        "y": "d"
    },
    {
        "n": "荃湾区",
        "i": 810117000,
        "p": 810000,
        "y": "q"
    },
    {
        "n": "元朗区",
        "i": 810118000,
        "p": 810000,
        "y": "y"
    }
]
  return iter.filter(
    function(iter) {
      return iter.n.includes(n)||n.includes(iter.n);
    }
  );
}