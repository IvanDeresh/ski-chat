import fs from "fs";

export function loadConfig() {
    const CONFIG_FILE = "../config.json";

    if (!fs.existsSync(CONFIG_FILE)) {
        const baseConfig = {
            enabled: false,
            chatId: null,

            keywords: [
                "snowboard",
                "snowboarding",
                "learn snowboard",
                "learn snowboarding",
                "snowboard lessons",
                "snowboard instructor",
                "snowboard coach",
                "beginner snowboard",
                "first time snowboarding",
                "go snowboarding",
            ],

            templates: [
                "Hi! 👋 I noticed your message in the chat. I'm a snowboard instructor 🏂 and offer private lessons. Feel free to message me 🙂",

                "Hey! ❄️ Saw that you're interested in snowboarding. I help beginners and improve technique. Happy to answer questions!",

                "Hi there! 🏂 I work as a snowboard coach and do private lessons. Let me know if you'd like details!",

                "Hey! If you're looking to learn or improve your snowboarding, I can help 🙂",
            ],

            dailyLimit: 10,
            delay: {
                min: 30000,
                max: 60000,
            },
        };

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(baseConfig, null, 2));
        return baseConfig;
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}
