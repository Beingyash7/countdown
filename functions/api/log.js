const TELEGRAM_API_BASE = "https://api.telegram.org";

function buildMessage(data, timestamp) {
  const lines = [
    `Timestamp (UTC): ${timestamp}`,
    data.event ? `Event: ${data.event}` : "Event: (missing)",
    data.name ? `Name: ${data.name}` : "",
    data.details ? `Details: ${data.details}` : "",
    data.path ? `Path: ${data.path}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function onRequestPost({ request, env }) {
  let data = {};
  try {
    data = await request.json();
  } catch (err) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!data || typeof data.event !== "string" || data.event.trim() === "") {
    return new Response("Missing event", { status: 400 });
  }

  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return new Response("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID", {
      status: 500,
    });
  }

  const timestamp = new Date().toISOString();
  const text = buildMessage(data, timestamp);

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Telegram API error: ${response.status} ${errorText}`, {
        status: 500,
      });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response(`Error: ${err?.message || "Unknown error"}`, {
      status: 500,
    });
  }
}
