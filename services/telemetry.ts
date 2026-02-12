const SHEETS_WEBAPP_URL = (import.meta.env.VITE_SHEETS_WEBAPP_URL || '') as string;
const TELEMETRY_SECRET = (import.meta.env.VITE_TELEMETRY_SECRET || '') as string;

const TELEGRAM_FUNCTION_URL = '/api/log';
const SESSION_ID_KEY = 'sessionId';

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
  sessionId?: string;

  // device-ish (non-creepy, no IP)
  userAgent?: string;
  platform?: string;
  language?: string;
  timezone?: string;
  timezoneOffsetMin?: number;
  dpr?: number;
  cores?: number;
  memoryGB?: number | null;
  connection?: string;
  referrer?: string;
  path?: string;
  url?: string;
  screenW?: number;
  screenH?: number;
  viewportW?: number;
  viewportH?: number;
  prefersDark?: boolean;
  netType?: string | null;
  downlink?: number | null;
  rtt?: number | null;
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = createSessionId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

const buildBase = (): Omit<TelemetryPayload, 'event'> => {
  const connection = (navigator as any).connection;
  return {
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffsetMin: new Date().getTimezoneOffset(),
    dpr: window.devicePixelRatio || 1,
    cores: navigator.hardwareConcurrency,
    memoryGB: (navigator as any).deviceMemory ?? null,
    connection: connection?.effectiveType,
    referrer: document.referrer || '',
    path: window.location.pathname,
    url: window.location.href,
    screenW: window.screen?.width || 0,
    screenH: window.screen?.height || 0,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    prefersDark: window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false,
    netType: connection?.effectiveType ?? null,
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
  };
};

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
        url: payload.url || '',
        referrer: payload.referrer || '',
        ts: payload.timestamp,
        sessionId: payload.sessionId || '',
        userAgent: payload.userAgent || '',
        platform: payload.platform || '',
        language: payload.language || '',
        timezone: payload.timezone || '',
        dpr: payload.dpr,
        screenW: payload.screenW,
        screenH: payload.screenH,
        viewportW: payload.viewportW,
        viewportH: payload.viewportH,
        prefersDark: payload.prefersDark,
        cores: payload.cores,
        memoryGB: payload.memoryGB,
        netType: payload.netType,
        downlink: payload.downlink,
        rtt: payload.rtt,
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
