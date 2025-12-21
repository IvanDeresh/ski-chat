import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import input from "input";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const SESSION_FILE = "./session.txt";
const DB_FILE = "./contacted.json";

const KEYWORDS = [
    "snowboard",
    "snowboarding",
    "learn snowboarding",
    "learn snowboard",
    "snowboard lessons",
    "snowboard instructor",
    "snowboard coach",
    "beginner snowboard",
    "first time snowboarding",
    "go snowboarding",
];

const DAILY_LIMIT = 10;
const MIN_DELAY = 30 * 1000;
const MAX_DELAY = 60 * 1000;

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
    const msg = event.message;
    if (!msg?.text) return;

    const text = msg.text.toLowerCase();
    console.log("💬 Message:", text);

    if (!KEYWORDS.some((k) => text.includes(k))) return;

    const sender = await msg.getSender();
    if (!sender || sender.bot) return;

    const userId = sender.id.value;

    if (sender.self) return;

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
    const templates = [
        `Hi${name ? ", " + name : ""}! 👋
I noticed your message in the chat.
I'm a snowboard instructor 🏂
I offer private snowboard lessons.
Feel free to message me if you're interested 🙂`,

        `Hey!
Saw that you're interested in snowboarding ❄️
I'm a coach and help with learning and technique.
Happy to answer questions or do a lesson 😉`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
}

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
