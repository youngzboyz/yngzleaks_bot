
const express = require('express');
const app = express();

const { Client, GatewayIntentBits } = require('discord.js');

// ================= ENV CHECK =================
console.log("🚀 INICIO BOT");
console.log("TOKEN EXISTE:", !!process.env.TOKEN);

// ================= KEEP ALIVE (RENDER) =================
app.get('/', (req, res) => {
    res.send('Bot online');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌐 Web server activo en puerto ${PORT}`);
});

// ================= DISCORD CLIENT =================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Debug útil
client.on('debug', console.log);
client.on('error', console.error);
client.on('warn', console.warn);

// ================= READY =================

client.once('ready', () => {
    console.log("✅ BOT ONLINE:", client.user.tag);
});

// ================= LOGIN =================

console.log("🔐 INICIANDO LOGIN...");

client.login(process.env.TOKEN)
    .then(() => {
        console.log("✅ LOGIN OK");
    })
    .catch(err => {
        console.error("❌ LOGIN ERROR:", err);
    });