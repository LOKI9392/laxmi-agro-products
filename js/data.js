/* ============================================================
   LAXMI AGRO PRODUCTS — seed data
   Edit DEFAULT_PRODUCTS below to change starting varieties,
   but once the site runs once in a browser, the REAL data lives
   in that browser's localStorage and is managed from /admin.html
   ============================================================ */

// IMPORTANT — shared backend (Google Apps Script) URL.
// Setting this ONLY in Admin → Settings saves it to the admin's own
// browser, which other visitors never see — that's why changes didn't
// show up on other devices. Instead, paste your Web App URL (ends in
// /exec) HERE, then push this file to GitHub so it ships to everyone.
// See /apps-script/Code.gs for how to get this URL. Leave blank ("")
// to run with no shared backend (each browser stays independent).
const BACKEND_URL = "";

// IMPORTANT — Razorpay Key ID (safe to be public, this is NOT the secret key).
// Get it from: Razorpay Dashboard → Settings → API Keys → Generate Key.
// Paste ONLY the Key ID here — it looks like "rzp_test_XXXXXXXXXXXXXX"
// (test mode) or "rzp_live_XXXXXXXXXXXXXX" (live mode). Never put the
// Key SECRET here or anywhere in this website's code — that one must
// stay private and is not needed for this basic checkout.
// Leave blank ("") to keep using the manual UPI + reference-number flow instead.
const RAZORPAY_KEY_ID = "";

const BUSINESS = {
  name: "LAXMI AGRO PRODUCTS",
  tagline: "Pure Stone-Ground Jowar Atta, Straight From the Village",
  village: "Ranjini Village",
  mandal: "Kubeer Mandal",
  district: "Nirmal District, Telangana",
  phone1: "8096045061",
  phone2: "9392530367",
  upiId: "9392530367@ybl", // change to your real UPI ID in Admin > Settings
  upiPayee: "LAXMI AGRO PRODUCTS",
  backendUrl: BACKEND_URL
};

// Starting catalogue — 5 Jowar Atta varieties, priced from current
// retail/mandi market references (per-kg). Admin can change anytime.
const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "White Jowar Atta",
    localName: "Safed Jowar Atta",
    tag: "Bestseller",
    pricePerKg: 65,
    stock: true,
    color: "#EDE3C8",
    accent: "#A2432B",
    description: "Everyday stone-ground white sorghum flour. Soft rotis, naturally gluten-free, mild flavour."
  },
  {
    id: "p2",
    name: "Yellow Jowar Atta",
    localName: "Peela Jowar Atta",
    tag: "Popular",
    pricePerKg: 70,
    stock: true,
    color: "#F1CE6B",
    accent: "#8B5A15",
    description: "Rich golden sorghum flour with a slightly nutty taste. Great for rotis and bhakri."
  },
  {
    id: "p3",
    name: "Organic Jowar Atta",
    localName: "Organic Jowar",
    tag: "100% Organic",
    pricePerKg: 95,
    stock: true,
    color: "#DCE7C8",
    accent: "#3B5D3E",
    description: "Grown without chemical fertilizers or pesticides. Stone-ground fresh on order for maximum nutrition."
  },
  {
    id: "p4",
    name: "Red Jowar Atta",
    localName: "Lal Jowar Atta",
    tag: "Farm Fresh",
    pricePerKg: 75,
    stock: true,
    color: "#E7B199",
    accent: "#A2432B",
    description: "Traditional red sorghum variety, high in fibre and antioxidants. A village favourite."
  },
  {
    id: "p5",
    name: "Multigrain Health Atta",
    localName: "Jowar + Bajra + Ragi Mix",
    tag: "Health Mix",
    pricePerKg: 85,
    stock: true,
    color: "#D9C6A3",
    accent: "#6B4226",
    description: "A wholesome blend of Jowar, Bajra and Ragi for a diabetic-friendly, high-fibre daily roti."
  }
];

const PACK_SIZES = [
  { label: "500 g", kg: 0.5 },
  { label: "1 kg", kg: 1 },
  { label: "2 kg", kg: 2 },
  { label: "5 kg", kg: 5 },
  { label: "10 kg", kg: 10 }
];

const ORDER_STAGES = ["Placed", "Payment Verified", "Packed", "Shipped", "Delivered"];
