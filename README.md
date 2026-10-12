# 🧾 CashierPro

> A self-hosted point-of-sale and store management system for small shops — Node.js + Express, offline-first, no third-party services.

CashierPro is a lightweight store manager that runs entirely on your own machine or server. Manage your product catalog, accept orders through a cart, track daily stock, collect customer ratings, and review sales and cashflow from a clean admin panel. Everything is written in vanilla JavaScript with a JSON file store — no database, no cloud, no subscription. 🏪

## ✨ Features

- 🛒 **Storefront** — Product catalog grouped by category, expandable accordion per product, variant and size selection with live price calculation.
- 📦 **Daily Stock Control** — Set a limit per product; the system tracks how many units were sold today and disables items when stock runs out.
- 💬 **WhatsApp Checkout** — Cart contents are formatted into a message and sent to the shop's WhatsApp number at the press of a button.
- ⭐ **Customer Ratings** — Slider from 1.0 to 5.0 (step 0.1) plus a numeric input field for direct keyboard entry. Reviews are stored server-side.
- 🔐 **Admin Panel** — Login with email and password; 7-day session cookie keeps you signed in across browser restarts.
- 📊 **Sales Reports** — Today's revenue, total transactions, top-selling products, and full transaction history.
- 💰 **Cashflow Ledger** — Record income and expense entries with vendor names alongside automatic sales entries.
- 📤 **Exports** — Download sales as CSV or export the entire dataset as JSON backup.
- 💾 **Persistent Storage** — All data lives in `./data/` as plain JSON files. Copy the folder to migrate or back up.
- 📴 **Offline-First** — The server only needs to be reachable on your local network. No external APIs, no analytics, no tracking.
- 📱 **Mobile & Desktop** — Responsive layout built for phone screens first, scales up to tablet and desktop.

## 🎮 How to Use

- **Browse the store** — Tap a product card to expand it, pick a variant and size, then add to cart.
- **Checkout** — Open the cart, review the total, and press "Konfirmasi & Checkout". The order is sent to WhatsApp and stored on the server.
- **Leave a rating** — Open the Rating tab, drag the slider or type a score directly, write a comment, and submit.
- **Admin login** — Open the Admin tab and sign in with the configured email and password. The session lasts 7 days.
- **Manage stock** — Adjust daily limits per product, save, and reset the daily sold counter when a new day begins.
- **Record cashflow** — Log expenses and additional income manually from the admin panel.

## 🛠 Tech Stack

- **Node.js ≥ 16** — Runtime.
- **Express 4** — HTTP server and REST API.
- **cookie-parser** — Session cookie handling.
- **Vanilla HTML / CSS / JavaScript** — Frontend, no framework.
- **JSON files on disk** — Storage layer inside `./data/`.
- **crypto.randomBytes(32)** — Session token generation.
- **No database, no ORM, no build step.**

## 🚀 Getting Started

### Prerequisites

- Node.js 16 or newer
- npm

### Steps

```bash
git clone https://github.com/YOUR_USERNAME/cashierpro.git
cd cashierpro
npm install
npm start
```

Server runs at `http://localhost:3000`.

To use a different port:

```bash
PORT=8080 npm start
```

> Note: The `data/` folder is created automatically on first run. Delete it to reset everything.

## 🔑 Default Admin Credentials

```
Email:    abcdefghi@gmail.com
Password: A1B2C3D4
```

> These are hardcoded in `server.js` for the initial setup. Change them before exposing the server to a public network.

## 📁 File Structure

```
cashierpro/
├── package.json
├── server.js              # Express server + REST API
├── public/
│   └── index.html         # Single-page frontend
└── data/                  # Auto-created on first run
    ├── stock.json         # Daily stock limits and units sold
    ├── reviews.json       # Customer reviews
    ├── sales.json         # Transaction history
    ├── cashflow.json      # Income and expense ledger
    └── sessions.json      # Active admin session tokens
```

## ⚙️ Configuration & Customisation

- **Admin credentials** — Edit `ADMIN_EMAIL` and `ADMIN_PASSWORD` at the top of `server.js`.
- **Session duration** — Change `SESSION_TTL` in `server.js` (default: 7 days).
- **WhatsApp number** — Update `CONFIG.whatsapp` in `public/index.html`.
- **Product catalog** — Edit the `MASTER` array in `server.js` to add products, variants, sizes, or prices.
- **Default stock limits** — Edit `defStock()` in `server.js` to change the default daily limit per product.
- **Port** — Set the `PORT` environment variable, or edit the fallback in `server.js`.

## 🌐 Deployment Options

### Local (Termux on Android)

```bash
pkg install nodejs
git clone https://github.com/YOUR_USERNAME/cashierpro.git
cd cashierpro
npm install
npm start
```

Then open `http://localhost:3000` in your Android browser.

### GitHub Codespaces

1. Open the repository on GitHub.
2. Code → Codespaces → Create codespace on main.
3. In the terminal: `npm install && npm start`.
4. Codespaces exposes port 3000 automatically.

### Render / Railway / Fly.io

Point the platform at this repository and set:

- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `PORT` (usually provided by the platform)

> Note: Platforms with ephemeral filesystems will lose the `data/` folder on restart. Attach a persistent volume if you need long-term storage.

## 📊 API Endpoints

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products` | Product catalog and current stock |
| GET | `/api/reviews` | List reviews with average score |
| POST | `/api/reviews` | Submit a new review |
| POST | `/api/sales` | Complete a transaction |
| POST | `/api/login` | Authenticate as admin |
| POST | `/api/logout` | End admin session |
| GET | `/api/session` | Check current session status |

### Admin only

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/stock` | Update daily stock limits |
| POST | `/api/stock/reset-daily` | Reset today's sales count |
| GET | `/api/sales` | Retrieve all transactions |
| GET | `/api/cashflow` | Retrieve cashflow ledger |
| POST | `/api/cashflow` | Add a cashflow entry |
| GET | `/api/backup` | Full JSON export |

## 🔒 Privacy

- **100% self-hosted** — no data is sent to any external server.
- **No tracking, no analytics, no ads.**
- **All data** lives in the `data/` folder on your own machine.
- **No cloud dependency** — the shop can run entirely on a local network.

## ⚠️ Security Notes

This project was written as a self-hosted tool for a single trusted shop owner. Before exposing it to the public internet, please consider:

- Passwords are stored in plaintext in `server.js`. Replace with hashed credentials (bcrypt) for production.
- Sessions are stored in a JSON file. For multi-instance deployments, use Redis or a database-backed session store.
- No HTTPS by default. Put a reverse proxy (Caddy, Nginx) in front if serving over a network.
- No rate limiting on the login endpoint.
- No CSRF protection on state-changing endpoints.

These are known limitations, not oversights. Contributions are welcome.

## 🗺 Roadmap

- [ ] Hashed passwords with bcrypt
- [ ] Optional PostgreSQL backend
- [ ] Receipt printing support
- [ ] Multi-user accounts with roles
- [ ] Analytics dashboard with date range filters
- [ ] Progressive Web App (offline frontend)

## 📜 License

MIT License. See the `LICENSE` file for details.

## 👥 Credits

- **Lead Developer:** Ezrohell
- **Idea Giver:** Hans

## 🤝 Contributing

Pull requests and issues are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📞 Contact

- GitHub: Ezrohell
- Number: +62 822-2975-3236

Built with ❤️ for shop owners who want to own their tools.
