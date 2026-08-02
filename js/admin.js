/* ============================================================
   LAXMI AGRO PRODUCTS — admin panel logic
   Note: login is a simple client-side password check stored in
   localStorage. It keeps casual visitors out of the panel but is
   NOT real security (anyone editing the page source could bypass
   it). Don't store sensitive data here. See README for upgrade path.
   ============================================================ */

/* ---------------- Auth ---------------- */
function isLoggedIn() { return sessionStorage.getItem("laxmi_admin_ok") === "1"; }
async function showAdmin() {
  document.getElementById("loginWrap").style.display = "none";
  document.getElementById("adminShell").style.display = "flex";
  loadSettingsForm();
  renderProducts();
  await renderDashboard();
  await renderOrders();
  await renderCustomers();
}
if (isLoggedIn()) showAdmin();

document.getElementById("loginBtn").addEventListener("click", tryLogin);
document.getElementById("loginPass").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
function tryLogin() {
  const pass = document.getElementById("loginPass").value;
  if (Store.checkAdminPass(pass)) {
    sessionStorage.setItem("laxmi_admin_ok", "1");
    showAdmin();
  } else {
    document.getElementById("loginError").textContent = "Incorrect password. Try again.";
  }
}
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("laxmi_admin_ok");
  location.reload();
});
document.getElementById("viewStoreBtn").addEventListener("click", () => window.open("index.html", "_blank"));

/* ---------------- Tabs ---------------- */
document.querySelectorAll(".admin-nav-btn[data-tab]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-nav-btn[data-tab]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    ["dashboard", "products", "orders", "customers", "settings"].forEach(t =>
      document.getElementById("tab-" + t).style.display = (t === btn.dataset.tab ? "block" : "none")
    );
  });
});

/* ---------------- Dashboard ---------------- */
async function renderDashboard() {
  document.getElementById("statRow").innerHTML = `<p style="color:var(--espresso-soft);">Loading...</p>`;
  const orders = await Store.fetchOrders();
  const products = Store.getProducts();
  const revenue = orders.filter(o => o.paymentStatus !== "Pending").reduce((s, o) => s + o.total, 0);
  const pendingVerify = orders.filter(o => o.paymentStatus === "Claimed - Pending Verification").length;
  document.getElementById("statRow").innerHTML = `
    <div class="stat-card"><div class="num">${orders.length}</div><div class="lbl">Total Orders</div></div>
    <div class="stat-card"><div class="num">${pendingVerify}</div><div class="lbl">Payments to Verify</div></div>
    <div class="stat-card"><div class="num">${formatINR(revenue)}</div><div class="lbl">Revenue (confirmed)</div></div>
    <div class="stat-card"><div class="num">${products.length}</div><div class="lbl">Active Varieties</div></div>
  `;
  document.getElementById("recentOrdersTable").innerHTML = buildOrdersTable(orders.slice(0, 5));
}

/* ---------------- Products ---------------- */
function renderProducts() {
  return (async () => {
    document.getElementById("prodEditGrid").innerHTML = `<p style="color:var(--espresso-soft);">Loading products...</p>`;
    const products = await Store.fetchProducts();
    document.getElementById("prodEditGrid").innerHTML = products.map(p => `
      <div class="prod-edit-card">
        <div class="swatch-big" style="background:${p.image ? `url(${p.image})` : `linear-gradient(160deg, ${p.color}, ${p.accent})`};"></div>
        <div class="field-mini"><label>Name</label><input value="${p.name}" onchange="updateProduct('${p.id}','name',this.value)"></div>
        <div class="field-mini"><label>Local Name</label><input value="${p.localName || ""}" onchange="updateProduct('${p.id}','localName',this.value)"></div>
        <div class="field-mini"><label>Tag / Badge</label><input value="${p.tag || ""}" onchange="updateProduct('${p.id}','tag',this.value)"></div>
        <div class="field-mini"><label>Price per kg (₹)</label><input type="number" value="${p.pricePerKg}" onchange="updateProduct('${p.id}','pricePerKg',parseFloat(this.value)||0)"></div>
        <div class="field-mini"><label>Description</label><textarea rows="2" onchange="updateProduct('${p.id}','description',this.value)">${p.description || ""}</textarea></div>
        <div class="field-mini"><label>Image URL (optional — replaces placeholder)</label><input value="${p.image || ""}" placeholder="https://..." onchange="updateProduct('${p.id}','image',this.value)"></div>
        <div class="field-inline">
          <input type="checkbox" id="stock-${p.id}" ${p.stock ? "checked" : ""} onchange="updateProduct('${p.id}','stock',this.checked)">
          <label for="stock-${p.id}" style="font-size:.85rem;">In Stock</label>
        </div>
        <button class="icon-btn" style="color:var(--rust);" onclick="deleteProduct('${p.id}')">Delete Variety</button>
      </div>
    `).join("");
  })();
}
async function updateProduct(id, field, value) {
  const products = Store.getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;
  p[field] = value;
  await Store.pushProducts(products);
  showToast("Saved" + (Store.hasBackend() ? " & synced to all devices" : ""));
  renderDashboard();
}
async function deleteProduct(id) {
  if (!confirm("Remove this variety from the store?")) return;
  await Store.pushProducts(Store.getProducts().filter(p => p.id !== id));
  renderProducts();
  renderDashboard();
  showToast("Variety removed");
}
document.getElementById("addProductBtn").addEventListener("click", async () => {
  const products = Store.getProducts();
  const newP = {
    id: "p" + Date.now(),
    name: "New Jowar Variety",
    localName: "",
    tag: "New",
    pricePerKg: 70,
    stock: true,
    color: "#E7D8B8",
    accent: "#A2432B",
    description: "Describe this variety here.",
    image: ""
  };
  products.push(newP);
  await Store.pushProducts(products);
  renderProducts();
  showToast("New variety added — edit its details below");
});

/* ---------------- Orders ---------------- */
function statusClass(s) { return "status-" + s.replace(/\s+/g, "-"); }

function buildOrdersTable(orders) {
  if (orders.length === 0) return `<p style="color:var(--espresso-soft);">No orders yet.</p>`;
  return `
    <table>
      <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td class="mono">${o.id}</td>
            <td>${o.customer.name}<br><span style="color:var(--espresso-soft);font-size:.78rem;">${o.customer.phone}</span></td>
            <td class="mono">${formatINR(o.total)}</td>
            <td><span class="status-chip ${o.paymentStatus.includes("Pending") ? "status-Placed" : "status-Payment-Verified"}">${o.paymentStatus}</span></td>
            <td><span class="status-chip ${statusClass(o.orderStatus)}">${o.orderStatus}</span></td>
            <td>${new Date(o.date).toLocaleDateString("en-IN")}</td>
            <td><button class="icon-btn" onclick="openOrderModal('${o.id}')">View / Print</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function renderOrders() {
  return (async () => {
    document.getElementById("ordersTableWrap").innerHTML = `<p style="color:var(--espresso-soft);">Loading orders...</p>`;
    const orders = await Store.fetchOrders();
    document.getElementById("ordersTableWrap").innerHTML = buildOrdersTable(orders);
  })();
}
document.getElementById("refreshOrdersBtn").addEventListener("click", renderOrders);

async function openOrderModal(id) {
  const o = await Store.getOrder(id);
  if (!o) return;
  const itemsRows = o.items.map(it => `<tr><td>${it.name}</td><td>${it.weightKg} kg</td><td>${it.qty}</td><td>${formatINR(it.subtotal)}</td></tr>`).join("");
  const statusOptions = ORDER_STAGES.map(s => `<option value="${s}" ${o.orderStatus === s ? "selected" : ""}>${s}</option>`).join("");
  document.getElementById("orderModalBody").innerHTML = `
    <h2 style="margin-bottom:2px;">Order ${o.id}</h2>
    <p class="step-note">Placed ${new Date(o.date).toLocaleString("en-IN")}</p>

    ${o.utr ? `<div class="pay-box" style="text-align:left;padding:10px 14px;margin:10px 0;"><span style="font-size:.78rem;color:var(--espresso-soft);">Customer-submitted UPI Reference (UTR) — match this against your bank/UPI statement:</span><br><b class="mono" style="font-size:1.05rem;">${o.utr}</b></div>` : `<p style="color:var(--rust);font-size:.85rem;">No payment reference submitted for this order.</p>`}

    <h3 style="font-size:1rem;margin-bottom:6px;">Customer & Address</h3>
    <p style="font-size:.9rem;line-height:1.6;">
      <b>${o.customer.name}</b> — ${o.customer.phone}${o.customer.altPhone ? " / " + o.customer.altPhone : ""}<br>
      ${o.customer.address}<br>
      ${o.customer.village}, ${o.customer.mandal}, ${o.customer.district} - ${o.customer.pincode}
    </p>

    <h3 style="font-size:1rem;margin:16px 0 6px;">Items</h3>
    <table><thead><tr><th>Item</th><th>Pack</th><th>Qty</th><th>Subtotal</th></tr></thead><tbody>${itemsRows}</tbody></table>
    <p style="text-align:right;font-weight:700;margin-top:8px;">Total: ${formatINR(o.total)}</p>

    <div class="two-col" style="margin-top:14px;">
      <div class="form-row">
        <label>Payment Status</label>
        <select id="payStatusSelect">
          <option ${o.paymentStatus === "Pending" ? "selected" : ""}>Pending</option>
          <option ${o.paymentStatus.includes("Claimed") ? "selected" : ""} value="Claimed - Pending Verification">Claimed - Pending Verification</option>
          <option ${o.paymentStatus === "Verified" ? "selected" : ""}>Verified</option>
        </select>
      </div>
      <div class="form-row">
        <label>Order Status</label>
        <select id="orderStatusSelect">${statusOptions}</select>
      </div>
    </div>
    <button class="pill-btn" onclick="saveOrderStatus('${o.id}')">Save Status</button>
    <button class="pill-btn ghost" onclick="printOrder('${o.id}')">🖨 Print Address / Order Slip</button>
  `;
  document.getElementById("orderModalOverlay").classList.add("open");
}
document.getElementById("closeOrderModal").addEventListener("click", () => document.getElementById("orderModalOverlay").classList.remove("open"));

async function saveOrderStatus(id) {
  const paymentStatus = document.getElementById("payStatusSelect").value;
  const orderStatus = document.getElementById("orderStatusSelect").value;
  await Store.updateOrder(id, { paymentStatus, orderStatus });
  await renderOrders(); await renderDashboard();
  showToast("Order updated");
  document.getElementById("orderModalOverlay").classList.remove("open");
}

async function printOrder(id) {
  const o = await Store.getOrder(id);
  if (!o) return;
  const itemsRows = o.items.map(it => `<tr><td>${it.name} (${it.weightKg}kg)</td><td>${it.qty}</td><td>${formatINR(it.subtotal)}</td></tr>`).join("");
  document.getElementById("printArea").innerHTML = `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="margin-bottom:0;">LAXMI AGRO PRODUCTS</h2>
      <p style="margin-top:2px;">Ranjini Village, Kubeer Mandal</p>
      <hr>
      <h3>Order ${o.id} — ${new Date(o.date).toLocaleDateString("en-IN")}</h3>
      <p><b>Ship To:</b><br>
      ${o.customer.name}<br>
      ${o.customer.address}<br>
      ${o.customer.village}, ${o.customer.mandal}<br>
      ${o.customer.district} - ${o.customer.pincode}<br>
      Phone: ${o.customer.phone}${o.customer.altPhone ? " / " + o.customer.altPhone : ""}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:14px;">
        <thead><tr style="border-bottom:1px solid #000;text-align:left;"><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <p style="text-align:right;font-weight:bold;margin-top:8px;">Total: ${formatINR(o.total)}</p>
      <p>Payment: ${o.paymentStatus} | Order Status: ${o.orderStatus}</p>
      ${o.utr ? `<p>UPI Reference (UTR): <b>${o.utr}</b></p>` : ""}
    </div>
  `;
  window.print();
}

/* ---------------- Customers ---------------- */
function buildUsersTable(users) {
  if (users.length === 0) return `<p style="color:var(--espresso-soft);">No registered customers yet.</p>`;
  return `
    <table>
      <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Registered</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>${u.name}</td>
            <td class="mono">${u.phone}</td>
            <td>${u.email || "—"}</td>
            <td>${u.registeredDate ? new Date(u.registeredDate).toLocaleDateString("en-IN") : "—"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function renderCustomers() {
  return (async () => {
    document.getElementById("usersTableWrap").innerHTML = `<p style="color:var(--espresso-soft);">Loading customers...</p>`;
    const users = await Store.fetchUsers();
    document.getElementById("usersTableWrap").innerHTML = buildUsersTable(users);
  })();
}
document.getElementById("refreshUsersBtn").addEventListener("click", renderCustomers);

/* ---------------- Settings ---------------- */
function loadSettingsForm() {
  const s = Store.getSettings();
  const url = Store.backendUrl();
  document.getElementById("backendStatusBox").textContent = url ? url : "Not configured — orders/customers are local-only right now.";
  document.getElementById("setName").value = s.name || "";
  document.getElementById("setVillage").value = s.village || "";
  document.getElementById("setMandal").value = s.mandal || "";
  document.getElementById("setDistrict").value = s.district || "";
  document.getElementById("setPhone1").value = s.phone1 || "";
  document.getElementById("setPhone2").value = s.phone2 || "";
  document.getElementById("setUpi").value = s.upiId || "";
}
document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  const s = Store.getSettings();
  s.name = document.getElementById("setName").value;
  s.village = document.getElementById("setVillage").value;
  s.mandal = document.getElementById("setMandal").value;
  s.district = document.getElementById("setDistrict").value;
  s.phone1 = document.getElementById("setPhone1").value;
  s.phone2 = document.getElementById("setPhone2").value;
  s.upiId = document.getElementById("setUpi").value;
  s.upiPayee = s.name;
  Store.saveSettings(s);
  showToast("Settings saved");
});
document.getElementById("savePassBtn").addEventListener("click", () => {
  const np = document.getElementById("newPass").value.trim();
  if (np.length < 4) { showToast("Password too short"); return; }
  Store.setAdminPass(np);
  document.getElementById("newPass").value = "";
  showToast("Password updated");
});

/* ---------------- Toast ---------------- */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}
