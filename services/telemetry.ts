const SHEETS_WEBAPP_URL = (import.meta.env.VITE_SHEETS_WEBAPP_URL || '') as string;
const TELEMETRY_SECRET = (import.meta.env.VITE_TELEMETRY_SECRET || '') as string;

const TELEGRAM_FUNCTION_URL = '/.netlify/functions/log';

export type TelemetryEventType =
  | 'page_view'
  | 'profile_update'
  | 'status_refresh'
  | 'admin_login_success'
  | 'admin_login_fail'
  | 'admin_commit'
  | 'name_submit';

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

function buildTelegramDetails(payload: TelemetryPayload): string {
  return [
    payload.missionName ? `mission=${payload.missionName}` : '',
    typeof payload.progress === 'number' ? `progress=${payload.progress}%` : '',
    payload.status ? `status=${payload.status}` : '',
  ].filter(Boolean).join(' | ');
}

async function postToTelegram(payload: TelemetryPayload) {
  try {
    const response = await fetch(TELEGRAM_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: payload.event,
        name: payload.name || '',
        details: buildTelegramDetails(payload),
        path: payload.path || '',
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Telemetry (Telegram) failed', response.status, errorText);
    }
  } catch (e) {
    console.warn('Telemetry (Telegram) failed', e);
  }
}

export async function sendTelemetry(event: TelemetryEventType, partial: Omit<TelemetryPayload, 'event' | 'timestamp'> = {}) {
  const payload: TelemetryPayload = {
    ...buildBase(),
    ...partial,
    event,
    timestamp: new Date().toISOString(),
  };

  await Promise.all([postToSheets(payload), postToTelegram(payload)]);
}

export function logEvent(event: TelemetryEventType, name?: string) {
  return sendTelemetry(event, { name });
}
