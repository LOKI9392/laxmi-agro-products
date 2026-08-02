/* ============================================================
   LAXMI AGRO PRODUCTS — customer storefront logic
   ============================================================ */

const settings = Store.getSettings();
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------------- Nav / view switching ---------------- */
const views = { shop: "viewShop", track: "viewTrack", contact: "viewContact" };
function switchView(name) {
  Object.values(views).forEach(id => document.getElementById(id).style.display = "none");
  document.getElementById(views[name] || "viewShop").style.display = "block";
  document.querySelectorAll(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.view === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll(".nav-link").forEach(a => {
  a.addEventListener("click", e => { e.preventDefault(); switchView(a.dataset.view); });
});

/* ---------------- Rate board (signature ticker) ---------------- */
function renderRateBoard() {
  const products = Store.getProducts();
  const items = products.map(p =>
    `<span class="rate-item"><span class="rate-label">${p.name}</span><b>${formatINR(p.pricePerKg)}</b>/kg</span>`
  ).join("");
  document.getElementById("rateTrack").innerHTML = items + items; // duplicated for seamless loop
}

/* ---------------- Product grid + search ---------------- */
function productMedia(p) {
  if (p.image) {
    return `<img src="${p.image}" alt="${p.name}">`;
  }
  return `<div style="position:absolute;inset:0;background:linear-gradient(160deg, ${p.color}, ${p.accent});"></div>`;
}

function renderGrid(filter = "") {
  const products = Store.getProducts();
  const q = filter.trim().toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.localName || "").toLowerCase().includes(q) ||
    (p.tag || "").toLowerCase().includes(q)
  );
  document.getElementById("resultCount").textContent = `${filtered.length} varieties`;
  const grid = document.getElementById("grid");
  if (filtered.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;color:var(--espresso-soft);">No jowar atta matches "${filter}". Try another search.</p>`;
    return;
  }
  grid.innerHTML = filtered.map(p => `
    <div class="card ${p.stock ? "" : "out-of-stock"}">
      <div class="card-media">
        ${productMedia(p)}
        <span class="card-tag">${p.tag || "Jowar Atta"}</span>
      </div>
      <div class="card-body">
        <h3>${p.name}</h3>
        <div class="card-local">${p.localName || ""}</div>
        <p class="card-desc">${p.description || ""}</p>
        <div class="card-price">${formatINR(p.pricePerKg)} <span>/ kg</span></div>
        <button class="pill-btn" ${p.stock ? "" : "disabled"} onclick="openProductPicker('${p.id}')">
          ${p.stock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  `).join("");
}
document.getElementById("searchInput").addEventListener("input", e => renderGrid(e.target.value));

/* ---------------- Quick pack-size picker ---------------- */
function openProductPicker(productId) {
  const p = Store.getProducts().find(x => x.id === productId);
  if (!p) return;
  const options = PACK_SIZES.map(ps =>
    `<option value="${ps.kg}">${ps.label} — ${formatINR((p.pricePerKg * ps.kg).toFixed(0))}</option>`
  ).join("");
  document.getElementById("checkoutBody").innerHTML = `
    <h2>${p.name}</h2>
    <p class="step-note">${p.localName || ""} · ${formatINR(p.pricePerKg)}/kg</p>
    <div class="form-row">
      <label>Choose pack size</label>
      <select id="packSelect">${options}</select>
    </div>
    <div class="form-row">
      <label>Quantity (packs)</label>
      <input type="number" id="packQty" value="1" min="1">
    </div>
    <button class="pill-btn" style="width:100%;" onclick="addToCartFromPicker('${p.id}')">Add to Cart</button>
  `;
  document.getElementById("checkoutOverlay").classList.add("open");
}
function addToCartFromPicker(productId) {
  const p = Store.getProducts().find(x => x.id === productId);
  const kg = parseFloat(document.getElementById("packSelect").value);
  const qty = Math.max(1, parseInt(document.getElementById("packQty").value || "1"));
  const cart = Store.getCart();
  const existing = cart.find(l => l.productId === productId && l.weightKg === kg);
  if (existing) existing.qty += qty;
  else cart.push({ productId, name: p.name, weightKg: kg, pricePerKg: p.pricePerKg, qty });
  Store.saveCart(cart);
  document.getElementById("checkoutOverlay").classList.remove("open");
  showToast(`${p.name} added to cart`);
  renderCartCount();
}

/* ---------------- Cart drawer ---------------- */
function renderCartCount() {
  const cart = Store.getCart();
  document.getElementById("cartCount").textContent = cart.reduce((s, l) => s + l.qty, 0);
}
function lineTotal(l) { return l.pricePerKg * l.weightKg * l.qty; }
function cartTotal() { return Store.getCart().reduce((s, l) => s + lineTotal(l), 0); }

function renderCartDrawer() {
  const cart = Store.getCart();
  const linesEl = document.getElementById("cartLines");
  const footEl = document.getElementById("cartFooter");
  if (cart.length === 0) {
    linesEl.innerHTML = `<div class="empty-note">Your cart is empty.<br>Add some jowar atta to get started!</div>`;
    footEl.innerHTML = "";
    return;
  }
  linesEl.innerHTML = cart.map((l, i) => {
    const p = Store.getProducts().find(x => x.id === l.productId) || {};
    return `
    <div class="cart-line">
      <div class="swatch" style="background:linear-gradient(160deg, ${p.color || "#eee"}, ${p.accent || "#ccc"});"></div>
      <div class="cart-line-info">
        <b>${l.name}</b>
        <div>${l.weightKg} kg pack × ${l.qty} — ${formatINR(lineTotal(l))}</div>
        <div class="qty-ctrl">
          <button onclick="changeQty(${i},-1)">−</button>
          <span>${l.qty}</span>
          <button onclick="changeQty(${i},1)">+</button>
          <button class="remove-x" onclick="removeLine(${i})">Remove</button>
        </div>
      </div>
    </div>`;
  }).join("");
  footEl.innerHTML = `
    <div class="cart-total-row"><span>Total</span><span>${formatINR(cartTotal())}</span></div>
    <button class="pill-btn" style="width:100%;" onclick="beginCheckout()">Proceed to Checkout</button>
  `;
}
function changeQty(i, delta) {
  const cart = Store.getCart();
  cart[i].qty += delta;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  Store.saveCart(cart);
  renderCartDrawer(); renderCartCount();
}
function removeLine(i) {
  const cart = Store.getCart();
  cart.splice(i, 1);
  Store.saveCart(cart);
  renderCartDrawer(); renderCartCount();
}
document.getElementById("openCartBtn").addEventListener("click", () => {
  renderCartDrawer();
  document.getElementById("cartOverlay").classList.add("open");
});
document.getElementById("closeCart").addEventListener("click", () => document.getElementById("cartOverlay").classList.remove("open"));
document.getElementById("closeCheckout").addEventListener("click", () => document.getElementById("checkoutOverlay").classList.remove("open"));

/* ---------------- Checkout flow ---------------- */
function beginCheckout() {
  document.getElementById("cartOverlay").classList.remove("open");
  if (Store.getCart().length === 0) { showToast("Your cart is empty"); return; }
  renderCheckoutStep1();
  document.getElementById("checkoutOverlay").classList.add("open");
}

function renderCheckoutStep1() {
  const session = Store.getSession();
  document.getElementById("checkoutBody").innerHTML = `
    <h2>Delivery Details</h2>
    <p class="step-note">Step 1 of 2 — where should we deliver your jowar atta?</p>
    <div class="form-row"><label>Full Name *</label><input id="cName" placeholder="Your name" value="${session ? session.name : ""}"></div>
    <div class="two-col">
      <div class="form-row"><label>Phone Number *</label><input id="cPhone" placeholder="10-digit mobile" maxlength="10" value="${session ? session.phone : ""}"></div>
      <div class="form-row"><label>Alternate Phone</label><input id="cAltPhone" placeholder="Optional"></div>
    </div>
    <div class="form-row"><label>Full Address *</label><textarea id="cAddress" rows="3" placeholder="House no, street, landmark"></textarea></div>
    <div class="two-col">
      <div class="form-row"><label>Village / Town *</label><input id="cVillage" placeholder="Village or town"></div>
      <div class="form-row"><label>Mandal / Taluk *</label><input id="cMandal" placeholder="Mandal"></div>
    </div>
    <div class="two-col">
      <div class="form-row"><label>District *</label><input id="cDistrict" placeholder="District"></div>
      <div class="form-row"><label>Pincode *</label><input id="cPincode" placeholder="6-digit pincode" maxlength="6"></div>
    </div>
    <button class="pill-btn" style="width:100%;" onclick="goToPayment()">Continue to Payment →</button>
  `;
}

let pendingOrder = null;

function goToPayment() {
  const name = document.getElementById("cName").value.trim();
  const phone = document.getElementById("cPhone").value.trim();
  const address = document.getElementById("cAddress").value.trim();
  const village = document.getElementById("cVillage").value.trim();
  const mandal = document.getElementById("cMandal").value.trim();
  const district = document.getElementById("cDistrict").value.trim();
  const pincode = document.getElementById("cPincode").value.trim();
  const altPhone = document.getElementById("cAltPhone").value.trim();

  if (!name || !phone || !address || !village || !mandal || !district || !pincode) {
    showToast("Please fill all required fields (*)"); return;
  }
  if (!/^\d{10}$/.test(phone)) { showToast("Enter a valid 10-digit phone number"); return; }

  const cart = Store.getCart();
  const total = cartTotal();
  pendingOrder = {
    id: makeOrderId(),
    date: new Date().toISOString(),
    customer: { name, phone, altPhone, address, village, mandal, district, pincode },
    items: cart.map(l => ({ ...l, subtotal: lineTotal(l) })),
    total,
    paymentStatus: "Pending",
    orderStatus: "Placed"
  };
  renderPaymentStep();
}

function renderPaymentStep() {
  if (typeof RAZORPAY_KEY_ID === "string" && RAZORPAY_KEY_ID.trim()) {
    renderRazorpayPaymentStep();
  } else {
    renderManualPaymentStep();
  }
}

/* ---- Real payment gateway (Razorpay) — order is only created after Razorpay confirms success ---- */
function renderRazorpayPaymentStep() {
  const amount = pendingOrder.total;
  document.getElementById("checkoutBody").innerHTML = `
    <h2>Payment</h2>
    <p class="step-note">Step 2 of 2 — pay securely below. Your order is placed only after payment is successful.</p>
    <div class="pay-box">
      <div>Amount to Pay</div>
      <div class="amount">${formatINR(amount)}</div>
    </div>
    <p id="payError" style="color:var(--rust);font-size:.82rem;min-height:1.2em;text-align:center;"></p>
    <button class="pill-btn" id="razorpayPayBtn" style="width:100%;">🔒 Pay ${formatINR(amount)} Securely</button>
    <button class="pill-btn ghost" style="width:100%;margin-top:8px;" onclick="renderCheckoutStep1()">← Back</button>
    <p style="font-size:.78rem;color:var(--espresso-soft);margin-top:14px;text-align:center;">Payments are processed securely by Razorpay. We never see or store your card/UPI details.</p>
  `;
  document.getElementById("razorpayPayBtn").addEventListener("click", openRazorpayCheckout);
}

function openRazorpayCheckout() {
  const btn = document.getElementById("razorpayPayBtn");
  const errEl = document.getElementById("payError");
  const cfg = Store.getSettings();
  const amount = pendingOrder.total;

  if (typeof Razorpay === "undefined") {
    errEl.textContent = "Payment could not load. Please check your internet connection and try again.";
    return;
  }

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: Math.round(amount * 100), // paise
    currency: "INR",
    name: cfg.name || "LAXMI AGRO PRODUCTS",
    description: "Order " + pendingOrder.id,
    prefill: {
      name: pendingOrder.customer.name,
      contact: pendingOrder.customer.phone
    },
    notes: { order_id: pendingOrder.id },
    theme: { color: "#A2432B" },
    handler: async function (response) {
      // Payment succeeded — only now do we create the order
      btn.disabled = true;
      btn.textContent = "Confirming order...";
      pendingOrder.paymentStatus = "Verified";
      pendingOrder.razorpayPaymentId = response.razorpay_payment_id;
      await Store.addOrder(pendingOrder);
      Store.clearCart();
      const orderId = pendingOrder.id;
      pendingOrder = null;
      window.location.href = `success.html?id=${orderId}`;
    },
    modal: {
      ondismiss: function () {
        errEl.textContent = "Payment was not completed, so your order has not been placed. You can try again.";
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.on("payment.failed", function (response) {
    errEl.textContent = "Payment failed. Your order has not been placed — please try again.";
  });
  rzp.open();
}

/* ---- Manual UPI + reference-number fallback (used only if Razorpay isn't configured) ---- */
function renderManualPaymentStep() {
  const cfg = Store.getSettings();
  const amount = pendingOrder.total;
  const upiLink = `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(cfg.upiPayee || "LAXMI AGRO PRODUCTS")}&am=${amount}&cu=INR&tn=${encodeURIComponent("Order " + pendingOrder.id)}`;
  document.getElementById("checkoutBody").innerHTML = `
    <h2>Payment</h2>
    <p class="step-note">Step 2 of 2 — pay first, then confirm your order below.</p>
    <div class="pay-box">
      <div>Amount to Pay</div>
      <div class="amount">${formatINR(amount)}</div>
      <div style="margin-top:10px;">Pay to UPI / Phone Number</div>
      <div class="num">${cfg.phone2 || "9392530367"}</div>
      <a class="upi-link" id="payNowLink" href="${upiLink}" style="font-size:1.05rem;padding:14px 24px;">📱 Pay Now via PhonePe / GPay / Paytm</a>
    </div>
    <p style="font-size:.82rem;color:var(--espresso-soft);">Tapping the button opens your phone's UPI app (PhonePe, Google Pay, Paytm, etc.) with the amount filled in. On desktop, pay ${formatINR(amount)} to <b>${cfg.phone2 || "9392530367"}</b> using any UPI app on your phone.</p>

    <div id="confirmSection" style="display:none;margin-top:10px;padding-top:14px;border-top:1px dashed var(--line);">
      <p style="font-size:.9rem;font-weight:600;color:var(--green);">✓ Once your payment is done, confirm it here:</p>
      <div class="form-row">
        <label>UPI Transaction / Reference Number (UTR) *</label>
        <input id="utrInput" placeholder="12-digit number shown in your UPI app after payment">
      </div>
      <p style="font-size:.78rem;color:var(--espresso-soft);margin-top:-8px;">
        Open your UPI app → this payment → "Transaction details" — copy the UTR / Reference No. shown there.
        This lets us match your payment to your order when we check our bank statement.
      </p>
      <div class="field-inline" style="margin-top:10px;">
        <input type="checkbox" id="payConfirmCheck">
        <label for="payConfirmCheck" style="font-size:.85rem;">I confirm I have already paid ${formatINR(amount)} to the number above.</label>
      </div>
      <p id="payError" style="color:var(--rust);font-size:.82rem;min-height:1.2em;"></p>
      <button class="pill-btn" id="paySubmitBtn" style="width:100%;" onclick="confirmPayment()">Submit Payment & Place Order</button>
    </div>

    <p id="notPaidYetNote" style="font-size:.82rem;color:var(--espresso-soft);margin-top:14px;">
      Tap "Pay Now" above first. Already paid and the button didn't work?
      <a href="#" id="alreadyPaidLink">Click here to confirm your payment</a>.
    </p>

    <button class="pill-btn ghost" style="width:100%;margin-top:8px;" onclick="renderCheckoutStep1()">← Back</button>
  `;

  const reveal = () => {
    document.getElementById("confirmSection").style.display = "block";
    document.getElementById("notPaidYetNote").style.display = "none";
    document.getElementById("payNowLink").textContent = "✓ Opened — complete payment in your app";
  };
  document.getElementById("payNowLink").addEventListener("click", reveal);
  document.getElementById("alreadyPaidLink").addEventListener("click", e => { e.preventDefault(); reveal(); });
}

async function confirmPayment() {
  const utr = document.getElementById("utrInput").value.trim();
  const confirmed = document.getElementById("payConfirmCheck").checked;
  const errEl = document.getElementById("payError");

  if (!/^[A-Za-z0-9]{6,22}$/.test(utr)) {
    errEl.textContent = "Please enter a valid UPI transaction / reference number (found in your UPI app after paying).";
    return;
  }
  if (!confirmed) {
    errEl.textContent = "Please tick the box confirming you've completed the payment.";
    return;
  }

  const btn = document.getElementById("paySubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }

  pendingOrder.paymentStatus = "Claimed - Pending Verification";
  pendingOrder.utr = utr;
  await Store.addOrder(pendingOrder);
  Store.clearCart();
  const orderId = pendingOrder.id;
  pendingOrder = null;
  window.location.href = `success.html?id=${orderId}`;
}

/* ---------------- Track order ---------------- */
document.getElementById("trackBtn").addEventListener("click", async () => {
  const q = document.getElementById("trackInput").value.trim().toLowerCase();
  const resultEl = document.getElementById("trackResult");
  if (!q) { resultEl.innerHTML = ""; return; }
  resultEl.innerHTML = `<p style="margin-top:20px;color:var(--espresso-soft);">Searching...</p>`;
  const allOrders = await Store.fetchOrders();
  const orders = allOrders.filter(o =>
    o.id.toLowerCase() === q || o.customer.phone === q
  );
  if (orders.length === 0) {
    resultEl.innerHTML = `<p style="margin-top:20px;color:var(--espresso-soft);">No order found for "${q}". Check the Order ID or phone number and try again.</p>`;
    return;
  }
  resultEl.innerHTML = orders.map(renderOrderTimeline).join("<hr style='margin:30px 0;border:none;border-top:1px solid var(--line);'>");
});

function renderOrderTimeline(o) {
  const stageIdx = ORDER_STAGES.indexOf(o.orderStatus);
  const steps = ORDER_STAGES.map((s, i) => `
    <div class="tl-step ${i <= stageIdx ? "done" : ""}">
      <div class="tl-dot">${i <= stageIdx ? "✓" : i + 1}</div>
      <span>${s}</span>
    </div>
  `).join("");
  const items = o.items.map(it => `<div class="row"><span>${it.name} (${it.weightKg}kg × ${it.qty})</span><span>${formatINR(it.subtotal)}</span></div>`).join("");
  return `
    <div style="margin-top:20px;">
      <p><b>Order ${o.id}</b> — placed ${new Date(o.date).toLocaleDateString("en-IN")}</p>
      <p style="font-size:.85rem;color:var(--espresso-soft);">Payment: ${o.paymentStatus}</p>
      <div class="timeline">${steps}</div>
      <div class="order-items-list">
        ${items}
        <div class="row" style="font-weight:700;border-top:1px solid var(--line);padding-top:8px;margin-top:6px;"><span>Total</span><span>${formatINR(o.total)}</span></div>
      </div>
    </div>
  `;
}

/* ---------------- Toast ---------------- */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------------- Customer account (login / signup) ---------------- */
function applyShopGate() {
  const session = Store.getSession();
  const gate = document.getElementById("shopGateArea");
  const content = document.getElementById("shopContentArea");
  if (!gate || !content) return;
  if (session) {
    gate.style.display = "none";
    content.style.display = "block";
  } else {
    gate.style.display = "block";
    content.style.display = "none";
  }
}
document.getElementById("gateLoginBtn").addEventListener("click", () => openAuthModal("login"));
document.getElementById("gateSignupBtn").addEventListener("click", () => openAuthModal("signup"));

function renderAccountNav() {
  const session = Store.getSession();
  const el = document.getElementById("accountNavSlot");
  if (!el) return;
  if (session) {
    el.innerHTML = `<a href="#" id="accountLink">Hi, ${session.name.split(" ")[0]}</a> <a href="#" id="logoutLink" style="margin-left:6px;">Logout</a>`;
    document.getElementById("logoutLink").addEventListener("click", e => {
      e.preventDefault();
      Store.clearSession();
      showToast("Logged out");
      renderAccountNav();
  applyShopGate();
    });
  } else {
    el.innerHTML = `<a href="#" id="accountLink">Login / Sign Up</a>`;
  }
  document.getElementById("accountLink").addEventListener("click", e => {
    e.preventDefault();
    if (Store.getSession()) return; // already logged in, link is just a greeting
    openAuthModal("login");
  });
}

function openAuthModal(mode) {
  renderAuthForm(mode);
  document.getElementById("checkoutOverlay").classList.add("open");
}

function renderAuthForm(mode) {
  const isLogin = mode === "login";
  document.getElementById("checkoutBody").innerHTML = `
    <h2>${isLogin ? "Login" : "Create Account"}</h2>
    <p class="step-note">${isLogin ? "Log in to auto-fill your delivery details at checkout." : "Sign up so we can auto-fill your details next time you order."}</p>
    ${isLogin ? "" : `<div class="form-row"><label>Full Name *</label><input id="authName" placeholder="Your name"></div>`}
    <div class="form-row"><label>Phone Number *</label><input id="authPhone" placeholder="10-digit mobile" maxlength="10"></div>
    ${isLogin ? "" : `<div class="form-row"><label>Email (optional)</label><input id="authEmail" placeholder="you@example.com"></div>`}
    <div class="form-row"><label>Password *</label><input id="authPassword" type="password" placeholder="At least 4 characters"></div>
    <p id="authError" style="color:var(--rust);font-size:.82rem;min-height:1.2em;"></p>
    <button class="pill-btn" style="width:100%;" id="authSubmitBtn">${isLogin ? "Login" : "Sign Up"}</button>
    <p style="text-align:center;font-size:.85rem;margin-top:14px;">
      ${isLogin ? `New here? <a href="#" id="switchToSignup">Create an account</a>` : `Already have an account? <a href="#" id="switchToLogin">Login</a>`}
    </p>
  `;
  document.getElementById("authSubmitBtn").addEventListener("click", () => isLogin ? doLogin() : doSignup());
  const switchLink = document.getElementById(isLogin ? "switchToSignup" : "switchToLogin");
  switchLink.addEventListener("click", e => { e.preventDefault(); renderAuthForm(isLogin ? "signup" : "login"); });
}

async function doSignup() {
  const name = document.getElementById("authName").value.trim();
  const phone = document.getElementById("authPhone").value.trim();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");

  if (!name || !/^\d{10}$/.test(phone) || password.length < 4) {
    errEl.textContent = "Enter your name, a valid 10-digit phone number, and a password of at least 4 characters.";
    return;
  }
  const btn = document.getElementById("authSubmitBtn");
  btn.disabled = true; btn.textContent = "Creating account...";
  const passwordHash = await hashPassword(password, phone);
  const res = await Store.signup({ name, phone, email, passwordHash });
  if (!res.success) {
    errEl.textContent = res.error || "Could not create account.";
    btn.disabled = false; btn.textContent = "Sign Up";
    return;
  }
  Store.setSession(res.user);
  document.getElementById("checkoutOverlay").classList.remove("open");
  showToast(`Welcome, ${res.user.name}!`);
  renderAccountNav();
  applyShopGate();
}

async function doLogin() {
  const phone = document.getElementById("authPhone").value.trim();
  const password = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");

  if (!/^\d{10}$/.test(phone) || !password) {
    errEl.textContent = "Enter your phone number and password.";
    return;
  }
  const btn = document.getElementById("authSubmitBtn");
  btn.disabled = true; btn.textContent = "Logging in...";
  const passwordHash = await hashPassword(password, phone);
  const res = await Store.login(phone, passwordHash);
  if (!res.success) {
    errEl.textContent = res.error || "Could not log in.";
    btn.disabled = false; btn.textContent = "Login";
    return;
  }
  Store.setSession(res.user);
  document.getElementById("checkoutOverlay").classList.remove("open");
  showToast(`Welcome back, ${res.user.name}!`);
  renderAccountNav();
  applyShopGate();
}

/* ---------------- Init ---------------- */
renderRateBoard();
renderGrid();
renderCartCount();
renderAccountNav();
  applyShopGate();

if (Store.hasBackend()) {
  Store.fetchProducts().then(() => {
    renderRateBoard();
    renderGrid(document.getElementById("searchInput").value);
  });
}
