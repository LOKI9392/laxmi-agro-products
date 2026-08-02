/* ============================================================
   LAXMI AGRO PRODUCTS — storage layer
   ------------------------------------------------------------
   By default everything lives in the browser's localStorage
   (no server, nothing shared between devices).

   If the shop owner sets a "Shared Backend URL" in
   Admin → Settings (a free Google Apps Script Web App — see
   /apps-script/Code.gs), then ORDERS and CUSTOMER ACCOUNTS are
   read from and written to that shared Google Sheet instead, so
   every device sees the same list. Products, cart and the admin
   password always stay local to each browser.
   ============================================================ */

const LS_PRODUCTS = "laxmi_products";
const LS_ORDERS = "laxmi_orders";
const LS_USERS = "laxmi_users";
const LS_SETTINGS = "laxmi_settings";
const LS_CART = "laxmi_cart";
const LS_ADMIN_PASS = "laxmi_admin_pass";
const LS_SESSION = "laxmi_session";

function initStore() {
  if (!localStorage.getItem(LS_PRODUCTS)) {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem(LS_ORDERS)) {
    localStorage.setItem(LS_ORDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(LS_USERS)) {
    localStorage.setItem(LS_USERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(LS_SETTINGS)) {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(BUSINESS));
  }
  if (!localStorage.getItem(LS_ADMIN_PASS)) {
    localStorage.setItem(LS_ADMIN_PASS, "laxmi123");
  }
}
initStore();

/* ---------------- password hashing (client-side, SHA-256) ---------------- */
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(password + ":" + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const Store = {
  /* ---- products (always local — see README for syncing these too) ---- */
  getProducts() {
    return JSON.parse(localStorage.getItem(LS_PRODUCTS) || "[]");
  },
  saveProducts(list) {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(list));
  },
  async fetchProducts() {
    const url = Store.backendUrl();
    if (!url) return Store.getProducts();
    try {
      const res = await fetch(`${url}?action=listProducts`);
      const data = await res.json();
      const products = data.products || [];
      if (products.length > 0) {
        Store.saveProducts(products); // cache locally as backup
        return products;
      }
      // backend has no products yet (first time) — push current local list up
      const local = Store.getProducts();
      await Store.pushProducts(local);
      return local;
    } catch (err) {
      console.error("Backend fetchProducts failed, using local cache:", err);
      return Store.getProducts();
    }
  },
  async pushProducts(list) {
    Store.saveProducts(list);
    const url = Store.backendUrl();
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "saveProducts", products: list })
        });
      } catch (err) {
        console.error("Backend pushProducts failed, saved locally only:", err);
      }
    }
  },

  /* ---- settings (always local) ---- */
  getSettings() {
    return JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
  },
  saveSettings(s) {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  },
  backendUrl() {
    return (typeof BACKEND_URL === "string" ? BACKEND_URL : "").trim();
  },
  hasBackend() {
    return !!Store.backendUrl();
  },

  /* ---- orders (local, OR shared backend if configured) ---- */
  getOrders() {
    return JSON.parse(localStorage.getItem(LS_ORDERS) || "[]");
  },
  saveOrders(list) {
    localStorage.setItem(LS_ORDERS, JSON.stringify(list));
  },
  async fetchOrders() {
    const url = Store.backendUrl();
    if (!url) return Store.getOrders();
    try {
      const res = await fetch(`${url}?action=list`);
      const data = await res.json();
      const orders = data.orders || [];
      Store.saveOrders(orders); // cache locally as backup
      return orders;
    } catch (err) {
      console.error("Backend fetchOrders failed, using local cache:", err);
      return Store.getOrders();
    }
  },
  async addOrder(order) {
    const url = Store.backendUrl();
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "addOrder", order })
        });
      } catch (err) {
        console.error("Backend addOrder failed, order saved locally only:", err);
      }
    }
    const orders = Store.getOrders();
    orders.unshift(order);
    Store.saveOrders(orders);
  },
  async getOrder(id) {
    if (Store.hasBackend()) {
      const orders = await Store.fetchOrders();
      return orders.find(o => o.id === id);
    }
    return Store.getOrders().find(o => o.id === id);
  },
  async updateOrder(id, patch) {
    const url = Store.backendUrl();
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "updateOrder", id, patch })
        });
      } catch (err) {
        console.error("Backend updateOrder failed:", err);
      }
    }
    const orders = Store.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx > -1) {
      orders[idx] = { ...orders[idx], ...patch };
      Store.saveOrders(orders);
    }
  },

  /* ---- cart (always local) ---- */
  getCart() {
    return JSON.parse(localStorage.getItem(LS_CART) || "[]");
  },
  saveCart(cart) {
    localStorage.setItem(LS_CART, JSON.stringify(cart));
  },
  clearCart() {
    localStorage.setItem(LS_CART, JSON.stringify([]));
  },

  /* ---- admin password (always local to that device) ---- */
  checkAdminPass(pass) {
    return localStorage.getItem(LS_ADMIN_PASS) === pass;
  },
  setAdminPass(pass) {
    localStorage.setItem(LS_ADMIN_PASS, pass);
  },

  /* ---- customer accounts (local, OR shared backend if configured) ---- */
  getUsersLocal() {
    return JSON.parse(localStorage.getItem(LS_USERS) || "[]");
  },
  saveUsersLocal(list) {
    localStorage.setItem(LS_USERS, JSON.stringify(list));
  },
  async fetchUsers() {
    const url = Store.backendUrl();
    if (!url) return Store.getUsersLocal();
    try {
      const res = await fetch(`${url}?action=listUsers`);
      const data = await res.json();
      return data.users || [];
    } catch (err) {
      console.error("Backend fetchUsers failed:", err);
      return Store.getUsersLocal();
    }
  },
  async signup(user) {
    const url = Store.backendUrl();
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "signup", user })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: "Could not reach the server. Check your internet connection." };
      }
    }
    // local fallback (device-only accounts)
    const users = Store.getUsersLocal();
    if (users.find(u => u.phone === user.phone)) {
      return { success: false, error: "A customer with this phone number is already registered on this device." };
    }
    users.push({ ...user, registeredDate: new Date().toISOString() });
    Store.saveUsersLocal(users);
    return { success: true, user: { name: user.name, phone: user.phone, email: user.email || "" } };
  },
  async login(phone, passwordHash) {
    const url = Store.backendUrl();
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "login", phone, passwordHash })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: "Could not reach the server. Check your internet connection." };
      }
    }
    // local fallback
    const users = Store.getUsersLocal();
    const u = users.find(x => x.phone === phone);
    if (!u) return { success: false, error: "No account found with this phone number on this device." };
    if (u.passwordHash !== passwordHash) return { success: false, error: "Incorrect password." };
    return { success: true, user: { name: u.name, phone: u.phone, email: u.email || "" } };
  },

  /* ---- logged-in customer session (always local — just remembers who's using this browser) ---- */
  getSession() {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? JSON.parse(raw) : null;
  },
  setSession(user) {
    localStorage.setItem(LS_SESSION, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(LS_SESSION);
  }
};

function formatINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function makeOrderId() {
  const d = new Date();
  const stamp = d.getFullYear().toString().slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(100 + Math.random() * 900);
  return "LAP" + stamp + rand;
}
