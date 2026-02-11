# Countdown Dashboard (Class Share)

This is a front-end-only countdown dashboard meant to be shared via a link.

Important:
- No external AI API keys are used (safer for sharing).
- Optional telemetry can send events to your Google Sheet and/or Telegram.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Optional) Create `.env.local` for admin/telemetry (see below). The app runs without it.
3. Run:
   `npm run dev`

## Build

1. Create a production build:
   `npm run build`
2. Build output is in `dist/`.

## Deploy (Vercel)

1. Push this project to GitHub
2. Import it in Vercel
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy -> share the link with classmates

## Admin Panel

- Admin route is controlled via `VITE_ADMIN_PATH` (default: `/website/admin-yash`)
- Admin password is controlled via `VITE_ADMIN_PASSWORD` (default: `yash2701`)

## Telemetry (Google Sheets + Telegram)

Telemetry is optional. It records non-sensitive events (no IP, no accounts):
- page_view, profile_update, status_refresh, admin login attempts, admin commits

### A) Google Sheets (recommended)

1. Create a Google Sheet -> Extensions -> Apps Script
2. Paste this code:

```js
const SECRET = "change_this_secret";

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) {
    return ContentService.createTextOutput("no").setMimeType(ContentService.MimeType.TEXT);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Responses") || ss.insertSheet("Responses");

  sheet.appendRow([
    new Date(),
    body.event || "",
    body.name || "",
    body.missionName || "",
    typeof body.progress === "number" ? body.progress : "",
    body.status || "",
    body.userAgent || "",
    body.platform || "",
    body.language || "",
    body.screen || "",
    body.path || "",
    body.referrer || ""
  ]);

  return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
}
```

3. Deploy -> New deployment -> Web app
   - Execute as: Me
   - Who has access: Anyone
4. Copy the deployment URL

### B) Telegram (optional)

1. Create a bot via BotFather
2. Get your chat ID
3. Put bot token + chat id in env vars

### Env vars (.env.local or host settings)

All env vars are optional. Defaults are used when they are not set.

```env
VITE_ADMIN_PATH=/website/admin-yash
VITE_ADMIN_PASSWORD=your_password

VITE_TELEMETRY_MODE=sheets  # off | sheets | telegram | both
VITE_TELEMETRY_SECRET=change_this_secret
VITE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/...../exec

VITE_TELEGRAM_BOT_TOKEN=123456:ABC...
VITE_TELEGRAM_CHAT_ID=123456789
```
