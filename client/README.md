# OtaExpress

A mobile-first React app for produce delivery vendors — tracks sales, buyers, payments, and price lists. Phone OTP login via Twilio Verify (SMS by default, WhatsApp ready when business verification clears).

## Quick start

You'll run two processes in parallel: the Express backend on `:3001` and the Vite dev server on `:5173`.

```bash
# 1. Frontend deps
npm install

# 2. Backend deps
cd server
npm install
cp .env.example .env

# 3. Edit server/.env — at minimum set JWT_SECRET. Twilio creds are optional
#    for first-run dev mode (see "Dev mode" below).
```

Then in two terminals:

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
npm run dev
```

Open <http://localhost:5173>. The app gates everything behind `/login`.

## SMS OTP — Twilio Verify setup (today)

This is the default. No business verification, works the moment you have a Twilio account.

1. Create a free Twilio account at <https://twilio.com>.
2. From the Twilio Console **Account Info** panel, copy your **Account SID** and **Auth Token** into `server/.env`.
3. **Buy a Twilio phone number**: Console → Phone Numbers → Buy a Number. Pick any number; SMS-capable numbers cost ~$1/month and trial credit covers it. This is what shows as the sender on the recipient's phone.
4. Go to **Verify → Services → Create new service**, name it "OtaExpress", and save. Copy the **Service SID** (starts with `VAxxxx`) into `server/.env` as `TWILIO_VERIFY_SERVICE_SID`.
5. Leave `OTP_CHANNEL=sms` in `.env` (the default).
6. Restart the backend.

When real credentials are present the console logs `✓ Twilio Verify enabled.` on boot. Send-otp now delivers a real SMS to the phone the user typed in.

## Switching to WhatsApp later

When you've completed Meta business verification through Twilio (Senders → WhatsApp Senders → Create new, then wait days-to-weeks for Meta approval):

1. Inside your Verify Service, toggle the **WhatsApp** channel on and pick your approved Sender.
2. In `server/.env`, change `OTP_CHANNEL=sms` to `OTP_CHANNEL=whatsapp`.
3. Restart the backend.

That's it — no code changes. The same UI, the same JWT flow, the same endpoint; only the channel that delivers the code changes.

If you want both at once (try WhatsApp first, fall back to SMS for users who don't have WhatsApp), open an issue / ask and we'll wire the fallback path. Twilio doesn't do this automatically.

## Dev mode (no Twilio account)

If you leave the Twilio variables blank, the backend boots in **dev mode**: it pretends to send the code and accepts `123456` for every phone. This lets you build out UI without creating a Twilio account first. The login screen shows a yellow banner when dev mode is active. Set `ALLOW_DEV_MODE=false` in `.env` to disable this and force real Twilio.

## Supported countries

- **Canada (+1)** — primary. 10-digit numbers. Twilio SMS works out of the box for Canadian recipients.
- **India (+91)** — testing only. Will be removed before launch. Note: Twilio SMS to Indian numbers is subject to India's DLT (Distributed Ledger Technology) registration regime. Trial accounts can deliver to "verified" numbers added under Phone Numbers → Manage → Verified Caller IDs, but production traffic to India requires DLT registration.

To restrict to Canada only, edit the `SUPPORTED` map in `server/utils/phone.js` and the `COUNTRIES` array in `src/pages/LoginPage.jsx` — two short edits.

## How auth works

- Frontend asks the backend to send a code via `POST /api/auth/send-otp { phone, country }`.
- Backend hands the request to Twilio Verify (or fakes it in dev mode), using the channel set by `OTP_CHANNEL`.
- User receives a 6-digit code and submits it via `POST /api/auth/verify-otp { phone, country, code }`.
- On success the backend returns a signed JWT. The frontend stores it in `localStorage` under the key `ota_auth_token` and sends it as `Authorization: Bearer …` on subsequent requests.
- `ProtectedRoute` redirects unauthenticated users to `/login`; the `Sign out` button on the **More** tab clears the token.

The user store (`server/utils/users.js`) is an **in-memory Map** today — fine for a prototype but resets on every restart. Replace it with a real database (Postgres, SQLite) when you're ready.

## Project layout

```
.
├── src/                    # React app
│   ├── context/
│   │   ├── AuthContext.jsx # login state + JWT
│   │   └── AppContext.jsx  # existing business state (buyers, sales, etc.)
│   ├── pages/
│   │   ├── LoginPage.jsx   # phone → OTP flow
│   │   └── …
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   └── utils/
│       └── api.js          # fetch wrapper that attaches JWT
└── server/                 # Express backend
    ├── index.js
    ├── routes/auth.js      # send-otp, verify-otp, me
    ├── middleware/auth.js  # JWT signing + verification
    └── utils/
        ├── twilio.js       # Twilio Verify wrapper (+ dev mode, channel-agnostic)
        ├── phone.js        # E.164 normalization
        └── users.js        # in-memory user store
```

## Security notes

- JWTs in `localStorage` are vulnerable to XSS — if you accept user-generated content in this app, switch to httpOnly cookies.
- The backend rate-limits OTP sends to 3/min and verifies to 10/5min per IP. Tune in `server/routes/auth.js`.
- Don't commit `server/.env` — it's already in `.gitignore`.

## Production

- Build the frontend with `npm run build`; serve `dist/` from any static host.
- Deploy the backend separately (Fly.io, Render, Railway, a VPS — anything that runs Node). Update CORS_ORIGINS in production.
- Replace the in-memory user store with a real database before you have more than one box.
