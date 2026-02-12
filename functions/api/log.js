const TELEGRAM_API_BASE = "https://api.telegram.org";

function parseUserAgent(ua = "") {
  let os = "Unknown";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  const deviceType = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "Mobile" : "Desktop";

  return { os, browser, deviceType };
}

function truncate(text, max = 160) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatNumber(value, suffix = "") {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${value}${suffix}`;
}

function buildMessage(data, ip, istTimestamp) {
  const ua = data.userAgent || "";
  const { os, browser, deviceType } = parseUserAgent(ua);

  const screen = `${formatNumber(data.screenW)}x${formatNumber(data.screenH)}`;
  const viewport = `${formatNumber(data.viewportW)}x${formatNumber(data.viewportH)}`;
  const dpr = formatNumber(data.dpr);
  const darkMode = data.prefersDark ? "yes" : "no";

  const cores = formatNumber(data.cores);
  const memory = formatNumber(data.memoryGB, "GB");
  const netType = data.netType || "n/a";
  const rtt = formatNumber(data.rtt, "ms");
  const downlink = formatNumber(data.downlink, "Mbps");

  const lines = [
    "📌 SSC Countdown Log",
    `🕒 IST: ${istTimestamp}`,
    `👤 Name: ${data.name || "n/a"}`,
    `🔔 Event: ${data.event}`,
    data.details ? `📝 Details: ${data.details}` : "",
    "",
    "Context:",
    `🌐 URL: ${data.url || "n/a"}`,
    `📍 Path: ${data.path || "n/a"}`,
    `↩️ Referrer: ${data.referrer || "n/a"}`,
    `🧭 TZ / Lang: ${data.timezone || "n/a"} / ${data.language || "n/a"}`,
    data.sessionId ? `🆔 Session: ${data.sessionId}` : "",
    "",
    "Device:",
    `💻 OS / Browser / Type: ${os} / ${browser} / ${deviceType}`,
    `🧾 UA: ${truncate(ua) || "n/a"}`,
    `🖥️ Screen: ${screen} | Viewport: ${viewport} | DPR: ${dpr} | Dark: ${darkMode}`,
    "",
    "Hardware/Network:",
    `🧠 Cores: ${cores} | Memory: ${memory}`,
    `📶 Net: ${netType} | RTT: ${rtt} | Downlink: ${downlink}`,
    `📍 IP: ${ip}`,
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

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  const istTimestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const text = buildMessage(data, ip, istTimestamp);

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
