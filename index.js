
const { Client, GatewayIntentBits } = require('discord.js');

console.log("🚀 INICIO BOT");
console.log("TOKEN EXISTE:", !!process.env.TOKEN);

// CLIENTE
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// DEBUG REAL
client.on('debug', console.log);
client.on('error', console.error);
client.on('warn', console.warn);

// READY
client.once('ready', () => {
    console.log("✅ BOT ONLINE:", client.user.tag);
});

// LOGIN
console.log("🔐 INICIANDO LOGIN...");

client.login(process.env.TOKEN)
    .then(() => {
        console.log("✅ LOGIN OK");
    })
    .catch((err) => {
        console.error("❌ LOGIN ERROR:", err);
    });