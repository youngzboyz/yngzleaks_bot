require('dotenv').config();

const express = require('express');
const app = express();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ChannelType
} = require('discord.js');

// ================= DEBUG =================
console.log("🚀 INICIO BOT");
console.log("TOKEN EXISTE:", !!process.env.TOKEN);

// ❌ EVITA CRASH SI NO HAY TOKEN (MUY IMPORTANTE EN RAILWAY)
if (!process.env.TOKEN) {
    console.log("❌ TOKEN no encontrado, cerrando...");
    process.exit(1);
}

// ================= SERVER =================
app.get('/', (req, res) => {
    res.send('Bot online');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌐 Web server activo en puerto ${PORT}`);
});

// ================= CLIENT =================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= LOGS DEBUG =================
client.on('debug', console.log);
client.on('error', console.error);
client.on('warn', console.warn);

// ================= READY (ARREGLADO) =================
// ❌ antes tenías clientReady (incorrecto para discord.js v14)
client.once("clientReady", () => {
    console.log("✅ BOT ONLINE:", client.user.tag);
});

// ================= LOG FUNCTION =================
async function sendLog(guild, title, description, color = 0xff0000) {
    const logChannel = guild.channels.cache.find(c => c.name === "logs");
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    logChannel.send({ embeds: [embed] });
}

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'kick') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        await member.kick();
        await sendLog(interaction.guild, "👢 Kick", `${user.tag} expulsado por ${interaction.user.tag}`);
        return interaction.reply(`👢 ${user.tag} expulsado`);
    }

    if (commandName === 'ban') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        await member.ban();
        await sendLog(interaction.guild, "🔨 Ban", `${user.tag} baneado por ${interaction.user.tag}`);
        return interaction.reply(`🔨 ${user.tag} baneado`);
    }

    if (commandName === 'warn') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        await sendLog(interaction.guild, "⚠️ Warn", `${user.tag} advertido por ${interaction.user.tag}\nMotivo: ${reason}`);
        return interaction.reply(`⚠️ ${user.tag} advertido`);
    }

    if (commandName === 'announce') {
        const msg = interaction.options.getString('message');

        const embed = new EmbedBuilder()
            .setTitle('📢 Anuncio')
            .setDescription(msg)
            .setColor(0x3498db);

        await interaction.channel.send({ embeds: [embed] });

        await sendLog(interaction.guild, "📢 Anuncio", `${interaction.user.tag}: ${msg}`, 0x3498db);

        return interaction.reply({ content: "📢 Anuncio enviado", ephemeral: true });
    }

    if (commandName === 'ticket') {

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages']
                }
            ]
        });

        await sendLog(interaction.guild, "🎫 Ticket", `${interaction.user.tag} abrió un ticket`);

        return interaction.reply({
            content: `🎫 Ticket creado: ${channel}`,
            ephemeral: true
        });
    }
});

// ================= LOGIN =================
console.log("🔐 INICIANDO LOGIN...");

client.login(process.env.TOKEN?.trim())
    .then(() => console.log("LOGIN OK ✔️"))
    .catch(err => {
        console.error("LOGIN ERROR ❌", err);
        process.exit(1);
    });