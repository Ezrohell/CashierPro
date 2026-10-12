"use strict";

const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");

const ADMIN_EMAIL = "abcdefghi@gmail.com";
const ADMIN_PASSWORD = "A1B2C3D4";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

/* ---------- Siapkan folder data ---------- */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

function dbPath(name) { return path.join(DATA_DIR, name + ".json"); }

function dbRead(name, fallback) {
  const p = dbPath(name);
  try {
    if (!fs.existsSync(p)) return fallback;
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (e) {
    console.error("[dbRead]", name, e.message);
    return fallback;
  }
}
function dbWrite(name, data) {
  const p = dbPath(name);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, p);
}

/* ---------- Master produk (server-side) ---------- */
const MASTER = [
  { id:"kopi",    name:"Kopi",        icon:"☕", category:"drink",
    items:[["Espresso",5000],["Cappuccino",7000],["Kopi Hitam",3000]],
    sizes:[["Regular",0],["Large",2000],["Extra Large",3000]] },
  { id:"susu",    name:"Susu",        icon:"🥛", category:"drink",
    items:[["Susu Putih",5000],["Susu Coklat",6000],["Susu Jahe",7000]],
    sizes:[["Regular",0],["Large",2000],["Extra Large",3000]] },
  { id:"matcha",  name:"Matcha",      icon:"🍵", category:"drink",
    items:[["Matcha Pure",8000],["Matcha Latte",10000]],
    sizes:[["Regular",0],["Large",2000],["Extra Large",3000]] },
  { id:"teh",     name:"Teh",         icon:"🥤", category:"drink",
    items:[["Teh Manis",3000],["Teh Tawar",2000],["Teh Lemon",5000]],
    sizes:[["Regular",0],["Large",2000],["Extra Large",3000]] },
  { id:"indomie", name:"Indomie",     icon:"🍜", category:"food",
    items:[["Indomie Goreng",5000],["Indomie Kuah",5000]],
    sizes:[["Polos",0],["Sosis",3000],["Telur",3000],["Komplit",5000]] },
  { id:"nasgor",  name:"Nasi Goreng", icon:"🍚", category:"food",
    items:[["Original",15000],["Pedas",15000],["Extra Pedas",17000]],
    sizes:[["Standard",0],["Telur",3000],["Sosis",3000]] },
  { id:"rotis",   name:"Roti Single", icon:"🍞", category:"food",
    items:[["Coklat",10000],["Keju",12000],["Mozarella",15000],["Kacang",10000],["Susu",8000]],
    sizes:null },
  { id:"rotim",   name:"Roti Mix",    icon:"🥪", category:"food",
    items:[["Coklat Keju",15000],["Coklat Mozarella",17000],["Coklat Kacang",14000],["Keju Mozarella",18000],["Keju Susu",14000],["Mozarella Susu",16000]],
    sizes:null }
];

function defaultStock() {
  const o = {};
  MASTER.forEach(m => { o[m.id] = 20; });
  return o;
}
function defaultDailySold() {
  return { [new Date().toLocaleDateString("en-CA")]: {} };
}

/* Pastikan file data dasar ada */
if (!fs.existsSync(dbPath("stock"))) {
  dbWrite("stock", { limits: defaultStock(), dailySold: defaultDailySold() });
}
if (!fs.existsSync(dbPath("reviews")))   dbWrite("reviews", []);
if (!fs.existsSync(dbPath("sales")))     dbWrite("sales", []);
if (!fs.existsSync(dbPath("cashflow")))  dbWrite("cashflow", []);
if (!fs.existsSync(dbPath("sessions")))  dbWrite("sessions", {});

/* ---------- Sessions ---------- */
function todayKey() { return new Date().toLocaleDateString("en-CA"); }

function loadSessions() { return dbRead("sessions", {}); }
function saveSessions(s) { dbWrite("sessions", s); }

function createSession(email) {
  const token = crypto.randomBytes(32).toString("hex");
  const sessions = loadSessions();
  sessions[token] = { email, created: Date.now(), expires: Date.now() + SESSION_TTL_MS };
  // bersihkan sesi kedaluwarsa
  const now = Date.now();
  for (const t in sessions) if (sessions[t].expires < now) delete sessions[t];
  saveSessions(sessions);
  return token;
}
function getSession(token) {
  if (!token) return null;
  const sessions = loadSessions();
  const s = sessions[token];
  if (!s) return null;
  if (s.expires < Date.now()) {
    delete sessions[token];
    saveSessions(sessions);
    return null;
  }
  return s;
}
function destroySession(token) {
  if (!token) return;
  const sessions = loadSessions();
  delete sessions[token];
  saveSessions(sessions);
}

/* ---------- Express app ---------- */
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

/* Middleware: cek admin */
function requireAdmin(req, res, next) {
  const sess = getSession(req.cookies?.cpsess);
  if (!sess || sess.email !== ADMIN_EMAIL) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  req.admin = sess;
  next();
}

/* ---------- AUTH ---------- */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (String(email || "").toLowerCase() !== ADMIN_EMAIL || String(password || "") !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "invalid_credentials" });
  }
  const token = createSession(ADMIN_EMAIL);
  res.cookie("cpsess", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS
  });
  res.json({ ok: true, email: ADMIN_EMAIL });
});

app.post("/api/logout", (req, res) => {
  destroySession(req.cookies?.cpsess);
  res.clearCookie("cpsess");
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  const sess = getSession(req.cookies?.cpsess);
  if (!sess || sess.email !== ADMIN_EMAIL) return res.json({ ok: true, admin: false });
  res.json({ ok: true, admin: true, email: sess.email });
});

/* ---------- PRODUK & STOK ---------- */
app.get("/api/products", (req, res) => {
  const stock = dbRead("stock", { limits: defaultStock(), dailySold: defaultDailySold() });
  res.json({ ok: true, master: MASTER, stock });
});

app.post("/api/stock", requireAdmin, (req, res) => {
  const { limits } = req.body || {};
  if (!limits || typeof limits !== "object") {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }
  const stock = dbRead("stock", { limits: defaultStock(), dailySold: defaultDailySold() });
  for (const id in limits) {
    if (MASTER.some(m => m.id === id)) {
      stock.limits[id] = Math.max(0, Number(limits[id] || 0));
    }
  }
  dbWrite("stock", stock);
  res.json({ ok: true, stock });
});

app.post("/api/stock/reset-daily", requireAdmin, (req, res) => {
  const stock = dbRead("stock", { limits: defaultStock(), dailySold: defaultDailySold() });
  stock.dailySold = defaultDailySold();
  dbWrite("stock", stock);
  res.json({ ok: true, stock });
});

/* ---------- REVIEWS ---------- */
app.get("/api/reviews", (req, res) => {
  const reviews = dbRead("reviews", []);
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + Number(r.score || 0), 0) / total : 0;
  res.json({ ok: true, reviews, avg, total });
});

app.post("/api/reviews", (req, res) => {
  const { name, score, text } = req.body || {};
  const s = Number(score);
  if (!text || String(text).trim().length < 2) {
    return res.status(400).json({ ok: false, error: "empty_text" });
  }
  if (!Number.isFinite(s) || s < 1 || s > 5) {
    return res.status(400).json({ ok: false, error: "invalid_score" });
  }
  const rounded = Math.round(s * 10) / 10;
  const reviews = dbRead("reviews", []);
  const entry = {
    id: "RV-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    name: (String(name || "").trim() || "Anonim").slice(0, 40),
    score: rounded,
    text: String(text).trim().slice(0, 800),
    date: new Date().toISOString(),
    ip: req.ip
  };
  reviews.unshift(entry);
  if (reviews.length > 2000) reviews.length = 2000;
  dbWrite("reviews", reviews);
  res.json({ ok: true, review: entry });
});

/* ---------- SALES ---------- */
app.get("/api/sales", requireAdmin, (req, res) => {
  const sales = dbRead("sales", []);
  res.json({ ok: true, sales });
});

app.post("/api/sales", (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "empty_cart" });
  }

  // Validasi terhadap MASTER + stok harian
  const stock = dbRead("stock", { limits: defaultStock(), dailySold: defaultDailySold() });
  const today = todayKey();
  stock.dailySold[today] = stock.dailySold[today] || {};

  // hitung qty per produk dalam keranjang
  const perProduct = {};
  for (const it of items) {
    const pid = it.pid;
    if (!MASTER.some(m => m.id === pid)) {
      return res.status(400).json({ ok: false, error: "unknown_product", pid });
    }
    perProduct[pid] = (perProduct[pid] || 0) + Number(it.qty || 0);
  }
  // cek stok
  for (const pid in perProduct) {
    const limit = Number(stock.limits[pid] ?? 20);
    const sold  = Number(stock.dailySold[today][pid] || 0);
    if (sold + perProduct[pid] > limit) {
      return res.status(400).json({ ok: false, error: "stock_exceeded", pid,
        remaining: Math.max(0, limit - sold) });
    }
  }

  // total
  let total = 0;
  const cleanItems = items.map(i => {
    const line = Number(i.price || 0) * Number(i.qty || 0);
    total += line;
    return {
      pid: i.pid,
      name: String(i.name || "").slice(0, 80),
      price: Number(i.price || 0),
      qty: Number(i.qty || 0)
    };
  });

  const txId = "TRX-" + Date.now();
  const tx = { id: txId, timestamp: new Date().toISOString(), items: cleanItems, total };

  const sales = dbRead("sales", []);
  sales.push(tx);
  if (sales.length > 5000) sales.shift();
  dbWrite("sales", sales);

  // update dailySold
  for (const pid in perProduct) {
    stock.dailySold[today][pid] = Number(stock.dailySold[today][pid] || 0) + perProduct[pid];
  }
  dbWrite("stock", stock);

  // catat arus kas masuk
  const cash = dbRead("cashflow", []);
  cash.push({
    id: txId, type: "income",
    description: "Penjualan " + txId,
    amount: total, vendor: "Pelanggan",
    timestamp: tx.timestamp
  });
  if (cash.length > 5000) cash.shift();
  dbWrite("cashflow", cash);

  res.json({ ok: true, tx });
});

/* ---------- CASHFLOW ---------- */
app.get("/api/cashflow", requireAdmin, (req, res) => {
  res.json({ ok: true, cashflow: dbRead("cashflow", []) });
});

app.post("/api/cashflow", requireAdmin, (req, res) => {
  const { type, description, amount, vendor } = req.body || {};
  const a = Number(amount);
  if (!description || !Number.isFinite(a) || a <= 0) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }
  if (type !== "income" && type !== "expense") {
    return res.status(400).json({ ok: false, error: "invalid_type" });
  }
  const cash = dbRead("cashflow", []);
  const entry = {
    id: "CF-" + Date.now(),
    type,
    description: String(description).slice(0, 200),
    amount: a,
    vendor: String(vendor || "-").slice(0, 120),
    timestamp: new Date().toISOString()
  };
  cash.push(entry);
  if (cash.length > 5000) cash.shift();
  dbWrite("cashflow", cash);
  res.json({ ok: true, entry });
});

/* ---------- BACKUP ---------- */
app.get("/api/backup", requireAdmin, (req, res) => {
  res.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    stock: dbRead("stock", {}),
    sales: dbRead("sales", []),
    cashflow: dbRead("cashflow", []),
    reviews: dbRead("reviews", [])
  });
});

/* ---------- SPA fallback ---------- */
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log("");
  console.log("  CashierPro - Platform Manajemen Toko");
  console.log("  -------------------------------------");
  console.log("  Server berjalan di  http://localhost:" + PORT);
  console.log("  Data tersimpan di   ./data/");
  console.log("");
});