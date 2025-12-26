import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import dotenv from "dotenv";
import { loadConfig } from "./loadConfig.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const BOT_TOKEN = process.env.CONTROL_BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.resolve(__dirname, "../config.json");

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error("❌ CONTROL_BOT_TOKEN or ADMIN_ID missing");
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function isAdmin(msg) {
    return msg.from.id === ADMIN_ID;
}

bot.onText(/\/start/, (msg) => {
    if (!isAdmin(msg)) return;

    bot.sendMessage(
        msg.chat.id,
        `🤖 Control Bot Ready

Commands:
/on – enable worker
/off – disable worker
/status – show config
/setchat <chatId>
/keywords a, b, c
/templates – set templates
/help - help
`
    );
});

bot.onText(/\/on/, (msg) => {
    if (!isAdmin(msg)) return;

    const config = loadConfig();
    config.enabled = true;
    saveConfig(config);

    bot.sendMessage(msg.chat.id, "✅ Worker ENABLED");
});

bot.onText(/\/off/, (msg) => {
    if (!isAdmin(msg)) return;
    const config = loadConfig();
    config.enabled = false;
    saveConfig(config);

    bot.sendMessage(msg.chat.id, "⛔ Worker DISABLED");
});

bot.onText(/\/status/, (msg) => {
    if (!isAdmin(msg)) return;

    const config = loadConfig();

    bot.sendMessage(
        msg.chat.id,
        `📊 Status

Enabled: ${config.enabled}
Chat ID: ${config.chatId}
Daily limit: ${config.dailyLimit}

Keywords:
${config.keywords.join(", ") || "—"}

Templates:
${config.templates.length}
`
    );
});

bot.onText(/\/setchat (.+)/, (msg, match) => {
    if (!isAdmin(msg)) return;

    const chatId = match[1].trim();
    const config = loadConfig();
    config.chatId = chatId;
    saveConfig(config);

    bot.sendMessage(msg.chat.id, `✅ Chat ID set to ${chatId}`);
});

bot.onText(/\/keywords (.+)/, (msg, match) => {
    if (!isAdmin(msg)) return;

    const list = match[1]
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

    const config = loadConfig();
    config.keywords = list;
    saveConfig(config);

    bot.sendMessage(msg.chat.id, `✅ Keywords updated (${list.length})`);
});

let waitingForTemplates = false;

bot.onText(/\/templates/, (msg) => {
    if (!isAdmin(msg)) return;

    waitingForTemplates = true;
    bot.sendMessage(
        msg.chat.id,
        `✏️ Send templates.
Each message = one template.
Send /done when finished.`
    );
});

bot.onText(/\/done/, (msg) => {
    if (!isAdmin(msg)) return;
    if (!waitingForTemplates) return;

    waitingForTemplates = false;
    bot.sendMessage(msg.chat.id, "✅ Templates saved");
});

bot.on("message", (msg) => {
    if (!isAdmin(msg)) return;
    if (!waitingForTemplates) return;
    if (msg.text.startsWith("/")) return;

    const config = loadConfig();
    config.templates.push(msg.text);
    saveConfig(config);

    bot.sendMessage(msg.chat.id, "➕ Template added");
});

console.log("🤖 Control bot started");
