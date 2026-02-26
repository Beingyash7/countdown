const TELEGRAM_API_BASE = 'https://api.telegram.org';

function parseUserAgent(ua = '') {
  let os = 'Unknown';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  const deviceType = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'Mobile' : 'Desktop';

  return { os, browser, deviceType };
}

function buildMessage({ event, name, details, path, timestamp, deviceInfo, meta, ip }) {
  const lines = [
    `Timestamp (IST): ${timestamp}`,
    event ? `Event: ${event}` : 'Event: (missing)',
    name ? `Name: ${name}` : '',
    details ? `Details: ${details}` : '',
    path ? `Path: ${path}` : '',
    ip ? `IP: ${ip}` : '',
    deviceInfo ? `Device: ${deviceInfo}` : '',
    meta ? `Meta: ${meta}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

exports.handler = async (netlifyEvent) => {
  if (netlifyEvent.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { statusCode: 500, body: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
  }

  let payload = {};
  try {
    payload = JSON.parse(netlifyEvent.body || '{}');
  } catch (err) {
    return { statusCode: 500, body: 'Invalid JSON body' };
  }

  const headers = netlifyEvent.headers || {};
  const ip =
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    '';

  const {
    event,
    name,
    details,
    path,
    userAgent,
    platform,
    language,
    screen,
    dpr,
    timezone,
    cores,
    memory,
    connection,
    referrer,
  } = payload || {};
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const { os, browser, deviceType } = parseUserAgent(userAgent || '');
  const deviceInfo = [deviceType, os, browser].filter(Boolean).join(' | ');
  const metaParts = [
    platform ? `platform=${platform}` : '',
    language ? `lang=${language}` : '',
    screen ? `screen=${screen}` : '',
    dpr ? `dpr=${dpr}` : '',
    timezone ? `tz=${timezone}` : '',
    Number.isFinite(cores) ? `cores=${cores}` : '',
    Number.isFinite(memory) ? `mem=${memory}GB` : '',
    connection ? `net=${connection}` : '',
    referrer ? `ref=${referrer}` : '',
  ].filter(Boolean);
  const meta = metaParts.join(' | ');

  const text = buildMessage({ event, name, details, path, timestamp, deviceInfo, meta, ip });

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 500,
        body: `Telegram API error: ${response.status} ${errorText}`,
      };
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err?.message || 'Unknown error'}` };
  }
};
