type TelemetryMode = 'off' | 'sheets' | 'telegram' | 'both';

const MODE = (import.meta.env.VITE_TELEMETRY_MODE || 'off') as TelemetryMode;
const SHEETS_WEBAPP_URL = (import.meta.env.VITE_SHEETS_WEBAPP_URL || '') as string;
const TELEMETRY_SECRET = (import.meta.env.VITE_TELEMETRY_SECRET || '') as string;

// Telegram (optional)
const TELEGRAM_BOT_TOKEN = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '') as string;
const TELEGRAM_CHAT_ID = (import.meta.env.VITE_TELEGRAM_CHAT_ID || '') as string;

export type TelemetryEventType =
  | 'page_view'
  | 'profile_update'
  | 'status_refresh'
  | 'admin_login_success'
  | 'admin_login_fail'
  | 'admin_commit';

export interface TelemetryPayload {
  // app/user data
  userId?: string;
  name?: string;
  missionName?: string;
  progress?: number;
  status?: string;

  // event data
  event: TelemetryEventType;
  timestamp: string;

  // device-ish (non-creepy, no IP)
  userAgent?: string;
  platform?: string;
  language?: string;
  timezoneOffsetMin?: number;
  screen?: string;
  referrer?: string;
  path?: string;
}

const buildBase = (): Omit<TelemetryPayload, 'event'> => ({
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  timezoneOffsetMin: new Date().getTimezoneOffset(),
  screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
  referrer: document.referrer || '',
  path: window.location.pathname,
});

async function postToSheets(payload: TelemetryPayload) {
  if (!SHEETS_WEBAPP_URL || !TELEMETRY_SECRET) return;
  try {
    await fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: TELEMETRY_SECRET, ...payload }),
    });
  } catch (e) {
    // swallow errors; telemetry should never break UX
    console.warn('Telemetry (Sheets) failed', e);
  }
}

async function postToTelegram(payload: TelemetryPayload) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const text = [
      `🛰️ *${payload.event}*`,
      `🕒 ${payload.timestamp}`,
      payload.name ? `👤 ${payload.name}` : '',
      payload.missionName ? `🎯 ${payload.missionName}` : '',
      typeof payload.progress === 'number' ? `📈 ${payload.progress}%` : '',
      payload.status ? `📡 ${payload.status}` : '',
      payload.path ? `🔗 ${payload.path}` : '',
    ].filter(Boolean).join('\n');

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.warn('Telemetry (Telegram) failed', e);
  }
}

export async function sendTelemetry(event: TelemetryEventType, partial: Omit<TelemetryPayload, 'event' | 'timestamp'> = {}) {
  if (MODE === 'off') return;

  const payload: TelemetryPayload = {
    ...buildBase(),
    ...partial,
    event,
    timestamp: new Date().toISOString(),
  };

  if (MODE === 'sheets') return postToSheets(payload);
  if (MODE === 'telegram') return postToTelegram(payload);
  // both
  await Promise.all([postToSheets(payload), postToTelegram(payload)]);
}
