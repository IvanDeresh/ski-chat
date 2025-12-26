import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { loadConfig } from "./loadConfig.js";

dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const BOT_TOKEN = process.env.CONTROL_BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID || !apiId || !apiHash) {
    console.error("❌ Missing environment variables");
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, "../config.json");

const stringSession = new StringSession("");
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

await client.start({
    botAuthToken: BOT_TOKEN,
});

console.log("🤖 Control bot started");

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

client.addEventHandler(async (event) => {
    const msg = event.message;
    if (!msg?.text) return;

    const sender = await msg.getSender();
    if (!sender || sender.id.value !== BigInt(ADMIN_ID)) return;

    const text = msg.text.toLowerCase();
    const config = loadConfig();

    if (text.startsWith("/start")) {
        await client.sendMessage(sender, {
            message: `🤖 Control Bot Ready

Commands:
/on – enable worker
/off – disable worker
/status – show config
/setchat <chatId>
/keywords a, b, c
/templates – set templates
/help - help`,
        });
    }

    if (text.startsWith("/on")) {
        config.enabled = true;
        saveConfig(config);
        await client.sendMessage(sender, { message: "✅ Worker ENABLED" });
    }

    if (text.startsWith("/off")) {
        config.enabled = false;
        saveConfig(config);
        await client.sendMessage(sender, { message: "⛔ Worker DISABLED" });
    }

    if (text.startsWith("/status")) {
        await client.sendMessage(sender, {
            message: `📊 Status

Enabled: ${config.enabled}
Chat ID: ${config.chatId}
Daily limit: ${config.dailyLimit}

Keywords: ${config.keywords.join(", ") || "—"}
Templates: ${config.templates.length}`,
        });
    }

    if (text.startsWith("/setchat")) {
        const chatId = msg.text.split(" ")[1];
        config.chatId = chatId;
        saveConfig(config);
        await client.sendMessage(sender, { message: `✅ Chat ID set to ${chatId}` });
    }

    if (text.startsWith("/keywords")) {
        const list = msg.text
            .split(" ")
            .slice(1)
            .join(" ")
            .split(",")
            .map((k) => k.trim().toLowerCase())
            .filter(Boolean);

        config.keywords = list;
        saveConfig(config);
        await client.sendMessage(sender, { message: `✅ Keywords updated (${list.length})` });
    }

    if (text.startsWith("/templates")) {
        config.templates = [];
        saveConfig(config);
        await client.sendMessage(sender, {
            message: "✏️ Send templates, each message = one template. Send /done when finished.",
        });
    }

    if (text.startsWith("/done")) {
        await client.sendMessage(sender, { message: "✅ Templates saved" });
    }

    if (!text.startsWith("/") && config.templates !== undefined) {
        config.templates.push(msg.text);
        saveConfig(config);
        await client.sendMessage(sender, { message: "➕ Template added" });
    }
}, new NewMessage({}));
