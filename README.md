# LAXMI AGRO PRODUCTS — Website

A ready-to-use website for selling Jowar Atta (sorghum flour) online, with:

- **Customer site** (`index.html`) — browse 5 varieties, search, add to cart, checkout, pay via UPI, track order, and now **create an account / log in** so delivery details auto-fill next time.
- **Admin panel** (`admin.html`) — edit products/prices/images, view & manage all orders, see all **registered customers**, print shipping/address slips, change settings.
- **Optional shared backend** (`apps-script/Code.gs`) — a free Google Sheet that turns Orders and Customer Accounts into ONE shared list visible from any device, instead of being stuck on one browser.

No coding needed to run it day-to-day — everything is edited from the Admin panel in your browser.

---

## 1. How it works (important — read this)

This is a **static website** (plain HTML/CSS/JS). By default, all products, orders, customer accounts and
settings are stored in the visitor's own browser using `localStorage` — meaning orders placed on a customer's
phone stay on their phone unless you connect the shared backend below.

### 🔗 Connect the shared backend (recommended — turns this into a real multi-device shop)
Follow the step-by-step setup written inside **`apps-script/Code.gs`** (about 10 minutes, all copy-paste, no
coding). In short:
1. Create a new Google Sheet.
2. Extensions → Apps Script → paste in the contents of `apps-script/Code.gs` → Save.
3. Deploy → New deployment → Web app → Execute as "Me", access "Anyone" → Deploy → copy the URL (ends in `/exec`).
4. **Open `js/data.js`** and paste that URL into the `BACKEND_URL` constant near the top of the file.
5. Push the change to GitHub (or re-upload `js/data.js`) so Vercel redeploys.

⚠️ **Important:** the backend URL must be set in `js/data.js` (the code), not typed into the Admin Settings screen.
A value only entered in Admin Settings would only ever be saved in *your own browser* — every other visitor's
browser would never see it, which is exactly why changes weren't showing up on other devices before. Setting it
in `js/data.js` means every visitor's browser gets the same value the moment they load the site.

Once connected, **Products, Orders, and Customer accounts** are all shared:
- Price/stock/image changes made in Admin → Products now sync to every visitor's browser (may take a moment — they'll see it on their next page load or by hitting the search box).
- Every order placed by any customer, on any device, appears in **Admin → Orders** automatically.
- Every customer who signs up appears in **Admin → Customers**.
- The data lives in a Google Sheet you own, so you can also open it directly, export it, or back it up any time — it now has three tabs: Orders, Users, and Products.

**Without the backend connected**, the site still works exactly as before (each device independent) — connecting it is optional but strongly recommended.

### 💳 About payment
This site supports **real Razorpay checkout** — the order is only created after Razorpay confirms the payment
actually succeeded. To turn it on:
1. Get your **Key ID** from Razorpay Dashboard → Settings → API Keys → Generate Key (looks like `rzp_test_...` or `rzp_live_...`).
2. Open `js/data.js` on your own computer and paste it into the `RAZORPAY_KEY_ID` constant near the top.
3. Push the change to GitHub (or re-upload `js/data.js`) so Vercel redeploys.

⚠️ Only paste the **Key ID** — never the **Key Secret** (a separate, longer value). The Key ID is meant to be
public and safe inside website code; the Key Secret must never appear anywhere in this project, since there's no
private backend server here to hold it safely.

**If `RAZORPAY_KEY_ID` is left blank**, the site automatically falls back to the manual flow instead: customer
pays via UPI to your number → enters the **UPI transaction reference number (UTR)** → ticks a confirmation box →
you check the UTR against your bank/UPI app and mark the order "Verified" in Admin.

### 👤 About customer accounts
Customers can now sign up / log in from the header. This is for convenience (auto-filling their delivery details)
and so you have a clean **Customers list** in Admin — it is not used to gate checkout; customers can still order
as a guest without an account. Passwords are hashed (SHA-256) before being sent or stored — never stored in plain text.

---

## 2. First-time setup

1. Open `admin.html` in your browser. Default password: **laxmi123** — change it under **Settings → Change Admin Password** right away.
2. (Recommended) Set up the shared backend as described above, and paste the URL into **Settings → Backend Web App URL**.
3. In **Settings**, also update:
   - Business name / village / mandal / district (already pre-filled for Ranjini Village, Kubeer Mandal)
   - Customer care phone numbers (pre-filled: 8096045061 / 9392530367)
   - **UPI ID** — important: `9392530367@ybl` is a placeholder. Replace it with your **real UPI ID** (ask your bank
     or check your GPay/PhonePe app — it looks like `phonenumber@bankname` or `yourname@upi`).
4. Go to **Products** and:
   - Adjust prices per kg to match today's market rate — this updates every pack size automatically everywhere on the site.
   - Replace placeholder images: upload a clear photo of each atta packet to Google Drive/Imgur (set sharing to
     "anyone with the link"), then paste the **direct image link** into the "Image URL" field.
   - Add/remove varieties any time with **+ Add Variety** / **Delete Variety**.

---

## 3. Managing orders

- **Admin → Orders** shows every order (from the shared backend if connected, or this device otherwise): customer, address, items, total, payment & order status.
- Click **View / Print** to see full order + delivery address + the customer's UTR payment reference, update **Payment Status** (Pending → Claimed → Verified) and **Order Status** (Placed → Payment Verified → Packed → Shipped → Delivered), and **print an address/order slip** for packing.
- Customers can check their own order any time on the **Track Order** page using their Order ID or phone number.
- **Admin → Customers** shows everyone who has signed up on the site.

---

## 4. Deploying to GitHub + Vercel (free hosting)

### A. Push to GitHub
Use `git` commands (not the "Upload files" web button, which can drop subfolders like `css/` and `js/`):
```bash
cd laxmi-agro
git init
git add .
git status          # confirm css/, js/, and apps-script/ files are all listed
git commit -m "Laxmi Agro Products website"
git remote add origin https://github.com/YOUR-USERNAME/laxmi-agro-products.git
git branch -M main
git push -u origin main
```

### B. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **Add New → Project**, select your `laxmi-agro-products` repo.
3. Framework preset: choose **"Other"** (this is a plain static site — no build step needed).
4. Click **Deploy**. In under a minute you'll get a live link like `laxmi-agro-products.vercel.app`.
5. (Optional) Under Project Settings → Domains, connect a custom domain like `laxmiagro.in` if you buy one.

Every time you push a change to GitHub, Vercel redeploys automatically.

---

## 5. File structure

```
laxmi-agro/
├── index.html            Customer storefront (shop, search, cart, checkout, login/signup, track order)
├── success.html           Order confirmation page shown after payment
├── admin.html              Admin panel (login, products, orders, customers, settings)
├── favicon.svg              Browser tab icon
├── css/style.css             All styling
├── js/data.js                 Starting product list & business info (only used the very first time)
├── js/store.js                 Shared save/load logic (localStorage + optional shared backend)
├── js/main.js                   Customer-side logic (shop, cart, checkout, accounts)
├── js/admin.js                   Admin-side logic
└── apps-script/Code.gs             Optional Google Apps Script backend — paste into Google Sheets
```

## 6. Things you may want next
- Real payment gateway (Razorpay/PhonePe) so payment is verified automatically instead of via UTR + bank check.
- Syncing Products (not just Orders/Customers) through the shared backend too, so price changes reflect from any device.
- SMS/WhatsApp order confirmation to customers.

Happy to build any of these when you're ready — just say the word.

