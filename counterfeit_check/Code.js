function start() {
  var brand_ss = SpreadsheetApp.openById("1YhmH6w2tPQU2kcBq7d7qR_TakVNvfs8RbVJoqn4P7kc");
  var shop_ss = SpreadsheetApp.openById("1kP5qz_g22yn3sU-6FKMiXGgo5noFlQRz7n88WUgGSl0");
  
  var brand_sheet = brand_ss.getSheetByName("工作表1");
  var shop_sheet = shop_ss.getSheetByName("品牌授权书备案");
  var item_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  
  var all_brand = brand_sheet.getDataRange().getValues();
  var brand_rows = all_brand.length;
  var brand_name = brand_sheet.getRange(2,1,brand_rows-1,1).getValues();

  var all_shop = shop_sheet.getDataRange().getValues();
  var shop_rows = all_shop.length;
  var shop_info = shop_sheet.getRange(3,3,shop_rows-2,5).getValues();

  
  var all_item = item_sheet.getDataRange().getValues();
  var item_rows = all_item.length;
  var item_name = item_sheet.getRange(2,1,item_rows-1,1).getValues;
  var item_shopid = item_sheet.getRange(2,2,item_rows-1,1).getValues;
  
  var brand_name_low = new Array();
  var check_result = new Array();
  var empty = [""];
  
  //convert brand_name to lower case(1-d string)
  for(var i=0;i<brand_name.length;i++){
    brand_name_low.push(brand_name[i][0].toLowerCase());
  }

  for(var j=0;j<item_name.length;j++){
    var brand_result = new Array();
    var low_item = item_name[j][0].toLowerCase();
    //result(string) --> all brand_name in item_name
    var result = brand_name_low.filter(
      function(brand_name_low){
        return low_item.includes(brand_name_low);
      }
    );

    if(result == ''){
      check_result.push(empty);
      continue;
    }

    var shopid_in = item_shopid[j][0];
    var shop_info_in = shop_info.filter(  //shop_info_in --> shop_info based on shopid_in
      function(shop_info){
        return shopid_in == shop_info[0];
      }
    );

    for(var h=0;h<result.length;h++){
      a_result = result[h];
      var brand_ind = brand_name_low.findIndex(
        function(brand_name_low){
          return a_result == brand_name_low;
        }
      );
      
    }


  }
  
  var outrange = sheet.getRange("E2:E8");
  outrange.setValues(output);
}
