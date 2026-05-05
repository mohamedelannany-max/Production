# دليل ربط البرنامج بـ Google Sheets 🚀

لضمان عمل المزامنة التلقائية، يرجى اتباع الخطوات التالية بدقة:

### ⛔ تنبيه خطير جداً (الخطأ الشائع)
**لا تستخدم رابط المتصفح!** 
الرابط الذي يبدأ بـ `https://docs.google.com/spreadsheets/...` **لن يعمل**. 
يجب أن تستخدم الرابط الذي يظهر لك في نهاية خطوة "Deploy" والذي يبدأ بـ `https://script.google.com/macros/...`.

---

### الخطوات الصحيحة (اتبعها واحدة بواحدة):

1.  **افتح ملف Google Sheet** الخاص بك.
2.  من القائمة العلوية، اختر **Extensions** ثم **Apps Script**.
3.  في الصفحة التي ستفتح، امسح أي كود موجود فيها وضع الكود التالي:

```javascript
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === 'test') {
      var sheet = ss.getSheets()[0];
      sheet.appendRow([new Date(), "بوابة النظام", "تم اختبار الاتصال بنجاح ✅"]);
      return ContentService.createTextOutput("SUCCESS").setMimeType(ContentService.MimeType.TEXT);
    }
    
    if (data.action === 'full_sync') {
      var db = data.data;
      
      // 1. Sync Users
      syncEntity(ss, "Users", ["id", "username", "name", "role", "lastLogin"], db.users);
      
      // 2. Sync Materials (الخامات)
      syncEntity(ss, "Materials", ["id", "name", "minStock", "unit"], db.materials);
      
      // 3. Sync Formulas (التركيبات)
      syncEntity(ss, "Formulas", ["id", "name", "totalQty", "targetMoisture"], db.formulas);
      
      // 4. Sync Orders (أوامر الإنتاج)
      syncEntity(ss, "Orders", ["id", "orderNo", "client", "product", "status", "date"], db.orders);
      
      // 5. Sync Inventory (المخزن)
      syncEntity(ss, "Inventory", ["id", "name", "stock"], db.inventory);
      
      // 6. Sync Consumption (تقارير سجل الاستهلاك)
      syncEntity(ss, "Reports_Consumption", ["batchId", "formulaName", "materialName", "targetWeight", "actualWeight", "variance", "timestamp"], db.consumption);

      return ContentService.createTextOutput("SYNC_SUCCESS").setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService.createTextOutput("UNKNOWN_ACTION").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function syncEntity(ss, sheetName, headers, items) {
  if (!items || items.length === 0) return;
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();
  sheet.appendRow(headers);
  var rows = items.map(function(item) {
    return headers.map(function(header) {
      var val = item[header];
      return (typeof val === 'object') ? JSON.stringify(val) : val;
    });
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}
```

4.  اضغط على أيقونة **الحفظ** (أيقونة الديسك) وسمِّ المشروع "PMS".
5.  **خطوة النشر (التفعيل):**
    *   اضغط على زر **Deploy** (الأزرق في الأعلى) -> ثم اختر **New Deployment**.
    *   اضغط على "ترس" (Select type) واختر **Web App**.
    *   **الإعدادات الهامة جداً:**
        *   Execute as: **Me** (إيميلك الشخصي).
        *   Who has access: **Anyone** (⚠️ يجب اختيار هذا الخيار تحديداً لكي يعمل الربط).
    *   اضغط زر **Deploy**.
6.  ستظهر نافذة "Authorize Access"، اختر حسابك، ثم اضغط **Advanced** ثم **Go to PMS (unsafe)** ثم **Allow**.
7.  **الرابط النهائي:** سيظهر لك صندوق يسمى **Web App URL** ينتهي بكلمة `/exec`.
8.  **انسخ هذا الرابط** واذهب إلى إعدادات البرنامج، الصقه في الخانة المخصصة واحفظ الإعدادات.

---

### ❌ استكشاف الأخطاء (Troubleshooting):

*   **خطأ 401 أو 404:** يعني أنك نسخت رابط الجدول من المتصفح. يجب نسخ الرابط الذي يظهر **بعد** الضغط على Deploy والذي يبدأ بـ `script.google.com`.
*   **فشل الاتصال:** تأكد أنك اخترت "Anyone" وليس "Anyone with Google Account".
*   **لا تظهر بيانات:** تأكد أنك ضغطت زر "حفظ" في صفحة الإعدادات بالبرنامج بعد وضع الرابط وقبل عمل "اختبار المزامنة".
