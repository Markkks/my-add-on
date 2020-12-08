function start() {
  var brand_ss = SpreadsheetApp.openById("1YhmH6w2tPQU2kcBq7d7qR_TakVNvfs8RbVJoqn4P7kc");
  var shop_ss = SpreadsheetApp.openById("1kP5qz_g22yn3sU-6FKMiXGgo5noFlQRz7n88WUgGSl0");
  
  var brand_sheet = brand_ss.getSheetByName("工作表1");
  var shop_sheet = shop_ss.getSheetByName("品牌授权书备案");
  
  
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("Sheet1");
  var brand = sheet.getRange(2,1,78,1).getValues();
  var items = sheet.getRange("D2:D8").getValues();
  var lowbrand = new Array();
  var output = new Array();
  var empty = [""];
  
  for(var i=0;i<brand.length;i++){
    lowbrand.push(brand[i][0].toLowerCase());
  }
  
  for(var j=0;j<items.length;j++){
    var lowitem = items[j][0].toLowerCase();
    var result = lowbrand.filter(
      function(lowbrand){
        return lowitem.includes(lowbrand);
      }
    );
    if(result == ''){output.push(empty);}
    else{output.push(result);}
  }
  
  var outrange = sheet.getRange("E2:E8");
  outrange.setValues(output);
}
