const TELEGRAM_API_BASE = 'https://api.telegram.org';

function buildMessage({ event, name, details, path, timestamp }) {
  const lines = [
    `Timestamp (IST): ${timestamp}`,
    event ? `Event: ${event}` : 'Event: (missing)',
    name ? `Name: ${name}` : '',
    details ? `Details: ${details}` : '',
    path ? `Path: ${path}` : '',
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

  const { event, name, details, path } = payload || {};
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

  const text = buildMessage({ event, name, details, path, timestamp });

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
