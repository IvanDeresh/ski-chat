import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import path from "path";
import { fileURLToPath } from "url";
import input from "input";
import fs from "fs";
import { loadConfig as lc } from "./loadConfig.js";
import dotenv from "dotenv";
dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, "../config.json");
const SESSION_FILE = path.join(__dirname, "../session.txt");
const DB_FILE = path.join(__dirname, "../contacted.json");

function loadConfig() {
    lc();
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}

let config = loadConfig();
const chatId = BigInt(config.chatId);
if (!config.enabled) {
    console.log("⛔ Worker disabled. Waiting...");
    throw new Error("Worker disabled. Waiting.");
}

const KEYWORDS = config.keywords;
const DAILY_LIMIT = Number(config.dailyLimit);
const MIN_DELAY = Number(config.delay.min);
const MAX_DELAY = Number(config.delay.max);

const stringSession = new StringSession(
    fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE, "utf8") : ""
);

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

let contacted = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};

if (!fs.existsSync(SESSION_FILE)) {
    console.log("🔐 First login");
    await client.start({
        phoneNumber: () => input.text("📱 Phone: "),
        password: () => input.text("🔒 2FA (if any): "),
        phoneCode: () => input.text("🔑 Code: "),
    });

    fs.writeFileSync(SESSION_FILE, client.session.save());

    console.log("✅ Session saved");
} else {
    await client.connect();

    console.log("✅ Session loaded");
}

console.log("👂 Listening ski chats...");

client.addEventHandler(async (event) => {
    config = loadConfig();
    if (!config.enabled) return;

    const msg = event.message;
    if (!msg?.text) return;

    const peer = msg.peerId;

    if (peer.className === "PeerChat") {
        if (peer.chatId.value !== chatId) return;
    } else if (peer.className === "PeerChannel") {
        if (peer.channelId.value !== chatId) return;
    }

    // console.log(peer.className);
    // console.log(peer?.chatId?.value, chatId);
    // console.log(peer?.channelId?.value, chatId);

    const text = msg.text.toLowerCase();
    console.log("💬 Message:", text);

    if (!KEYWORDS.some((k) => text.includes(k))) return;

    const sender = await msg.getSender();
    if (!sender || sender.bot || sender.self) return;

    const userId = sender.id.value;

    if (contacted[userId]) {
        console.log("⏭ Already contacted:", userId);
        return;
    }

    const today = new Date().toDateString();
    const todayCount = Object.values(contacted).filter((v) => v.date === today).length;

    if (todayCount >= DAILY_LIMIT) {
        console.log("⛔ Daily limit reached");
        return;
    }

    const delayMs = random(MIN_DELAY, MAX_DELAY);
    console.log(`⏳ Waiting ${Math.round(delayMs / 1000)}s before DM`);
    await delay(delayMs);

    try {
        await client.sendMessage(sender, {
            message: getTemplate(sender.firstName),
        });

        contacted[userId] = { date: today };
        fs.writeFileSync(DB_FILE, JSON.stringify(contacted, null, 2));

        console.log("✅ DM sent to", sender.firstName || userId);
    } catch (e) {
        console.error("❌ Send error:", e.message);
    }
}, new NewMessage({}));

function getTemplate(name = "") {
    const templates = config?.templates;

    return templates[Math.floor(Math.random() * templates.length)];
}

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
