/* ============================================================
   LAXMI AGRO PRODUCTS — shared backend (Google Apps Script)
   ------------------------------------------------------------
   This turns a Google Sheet into a free mini-database so that:
   - Every order placed by any customer, on any device, lands in
     ONE place you can see (an "Orders" sheet).
   - Every customer who signs up on the website lands in ONE
     place too (a "Users" sheet), visible in your Admin panel.

   SETUP (one-time, ~10 minutes):
   1. Go to https://sheets.google.com and create a new blank Google Sheet.
      Name it e.g. "Laxmi Agro Orders".
   2. In the sheet, click Extensions → Apps Script.
   3. Delete any starter code there, and paste this ENTIRE file in its place.
   4. Click the Save icon (💾).
   5. Click Deploy → New deployment.
      - Click the gear icon next to "Select type" → choose "Web app".
      - Description: "Laxmi Agro backend" (anything you like).
      - Execute as: "Me".
      - Who has access: "Anyone".
      - Click Deploy. Google may ask you to authorize — click through
        "Advanced" → "Go to (project name) (unsafe)" → Allow. This
        warning appears because it's your own new script, not a
        published app — it's safe to allow.
   6. Copy the "Web app URL" it gives you (ends in /exec).
   7. Paste that URL into your website's Admin panel → Settings →
      "Shared Backend URL" → Save.

   That's it — orders and signups from every device will now flow
   into this one Google Sheet, and your Admin panel will read live
   from it.

   NOTE ON SECURITY: This is a lightweight setup suitable for a
   small/early-stage shop. Passwords are stored as SHA-256 hashes
   (never plain text), but this Sheet is still only as private as
   your Google account — don't share edit access to it with anyone
   you don't trust, and don't store anything more sensitive than
   name/phone/address/order data here.
   ============================================================ */

function doGet(e) {
  var action = e.parameter.action;
  if (action === "list") return jsonResponse({ orders: listOrders() });
  if (action === "listUsers") return jsonResponse({ users: listUsers() });
  if (action === "listProducts") return jsonResponse({ products: listProducts() });
  return jsonResponse({ error: "unknown action" });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;

  if (action === "addOrder") return jsonResponse(addOrder(body.order));
  if (action === "updateOrder") return jsonResponse(updateOrder(body.id, body.patch));
  if (action === "signup") return jsonResponse(signupUser(body.user));
  if (action === "login") return jsonResponse(loginUser(body.phone, body.passwordHash));
  if (action === "saveProducts") return jsonResponse(saveProducts(body.products));

  return jsonResponse({ success: false, error: "unknown action" });
}

/* ---------------- Orders sheet ---------------- */
var ORDER_HEADERS = ["OrderID","Date","Name","Phone","AltPhone","Address","Village","Mandal","District","Pincode","ItemsJSON","Total","PaymentStatus","OrderStatus","UTR"];

function getOrdersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Orders");
  if (!sheet) {
    sheet = ss.insertSheet("Orders");
    sheet.appendRow(ORDER_HEADERS);
  }
  return sheet;
}

function addOrder(o) {
  var sheet = getOrdersSheet();
  sheet.appendRow([
    o.id, o.date, o.customer.name, o.customer.phone, o.customer.altPhone || "",
    o.customer.address, o.customer.village, o.customer.mandal, o.customer.district, o.customer.pincode,
    JSON.stringify(o.items), o.total, o.paymentStatus, o.orderStatus, o.utr || ""
  ]);
  return { success: true };
}

function updateOrder(id, patch) {
  var sheet = getOrdersSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      var row = i + 1;
      if (patch.paymentStatus !== undefined) sheet.getRange(row, 13).setValue(patch.paymentStatus);
      if (patch.orderStatus !== undefined) sheet.getRange(row, 14).setValue(patch.orderStatus);
      return { success: true };
    }
  }
  return { success: false, error: "order not found" };
}

function listOrders() {
  var sheet = getOrdersSheet();
  var data = sheet.getDataRange().getValues();
  var orders = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    orders.push({
      id: r[0], date: r[1],
      customer: { name: r[2], phone: r[3], altPhone: r[4], address: r[5], village: r[6], mandal: r[7], district: r[8], pincode: r[9] },
      items: JSON.parse(r[10] || "[]"),
      total: r[11], paymentStatus: r[12], orderStatus: r[13], utr: r[14]
    });
  }
  orders.reverse();
  return orders;
}

/* ---------------- Users sheet ---------------- */
var USER_HEADERS = ["Name","Phone","Email","PasswordHash","RegisteredDate"];

function getUsersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(USER_HEADERS);
  }
  return sheet;
}

function signupUser(u) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(u.phone)) {
      return { success: false, error: "A customer with this phone number is already registered." };
    }
  }
  sheet.appendRow([u.name, u.phone, u.email || "", u.passwordHash, new Date().toISOString()]);
  return { success: true, user: { name: u.name, phone: u.phone, email: u.email || "" } };
}

function loginUser(phone, passwordHash) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(phone)) {
      if (String(data[i][3]) === String(passwordHash)) {
        return { success: true, user: { name: data[i][0], phone: data[i][1], email: data[i][2] } };
      }
      return { success: false, error: "Incorrect password." };
    }
  }
  return { success: false, error: "No account found with this phone number." };
}

function listUsers() {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[1]) continue;
    users.push({ name: r[0], phone: r[1], email: r[2], registeredDate: r[4] });
  }
  users.reverse();
  return users;
}

/* ---------------- Helper ---------------- */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Products sheet ---------------- */
var PRODUCT_HEADERS = ["ID","Name","LocalName","Tag","PricePerKg","Stock","Color","Accent","Description","Image"];

function getProductsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Products");
  if (!sheet) {
    sheet = ss.insertSheet("Products");
    sheet.appendRow(PRODUCT_HEADERS);
  }
  return sheet;
}

function listProducts() {
  var sheet = getProductsSheet();
  var data = sheet.getDataRange().getValues();
  var products = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    products.push({
      id: r[0], name: r[1], localName: r[2], tag: r[3],
      pricePerKg: r[4], stock: (r[5] === true || r[5] === "TRUE" || r[5] === "true"),
      color: r[6], accent: r[7], description: r[8], image: r[9]
    });
  }
  return products;
}

// Full overwrite — simplest way to stay in sync with admin add/edit/delete
function saveProducts(products) {
  var sheet = getProductsSheet();
  sheet.clearContents();
  sheet.appendRow(PRODUCT_HEADERS);
  (products || []).forEach(function (p) {
    sheet.appendRow([
      p.id, p.name, p.localName || "", p.tag || "", p.pricePerKg,
      !!p.stock, p.color || "", p.accent || "", p.description || "", p.image || ""
    ]);
  });
  return { success: true };
}
