require('dotenv').config();

console.log("BOT INSTANCE STARTED");

// 🔒 evita doble instancia
if (global.botStarted) {
    console.log("⚠️ Bot ya iniciado, saliendo...");
    process.exit(0);
}
global.botStarted = true;

const express = require('express');
const app = express();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

// ================= DEBUG =================
console.log("🚀 INICIO BOT");
console.log("TOKEN EXISTE:", !!process.env.TOKEN);

if (!process.env.TOKEN) {
    console.log("❌ TOKEN no encontrado, cerrando...");
    process.exit(1);
}

// ================= MIDDLEWARE WEB =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= WEB PANEL =================
app.get('/', (req, res) => {
    res.send(`
        <h1>🤖 Bot Panel</h1>

        <h2>📢 Anuncio</h2>

        <form method="POST" action="/api/announce">
            <input name="titulo" placeholder="Título"><br><br>
            <textarea name="mensaje" placeholder="Mensaje"></textarea><br><br>
            <button type="submit">Enviar</button>
        </form>
    `);
});

// ================= API PANEL =================
app.post("/api/announce", async (req, res) => {
    try {
        const { titulo, mensaje } = req.body;

        const guild = client.guilds.cache.first();
        if (!guild) return res.status(400).send("No guild");

        const channel = guild.channels.cache.find(c => c.name === "general");
        if (!channel) return res.status(400).send("No channel");

        const embed = new EmbedBuilder()
            .setTitle(`📢 ${titulo}`)
            .setDescription(mensaje)
            .setColor(0x000000);

        await channel.send({ embeds: [embed] });

        res.json({ ok: true });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error");
    }
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Web server activo en puerto ${PORT}`);
});

// ================= CLIENT =================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ================= READY =================
client.once("ready", () => {
    console.log("✅ BOT ONLINE:", client.user.tag);
});

// ================= LOG SYSTEM =================
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

// ================= INTERACTIONS (FIX PRO) =================
client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {

        const cmd = interaction.commandName;

        try {

            await interaction.deferReply().catch(() => {});

            switch (cmd) {

                case "kick": {
                    const user = interaction.options.getUser("user");
                    const member = await interaction.guild.members.fetch(user.id);

                    await member.kick();
                    await sendLog(interaction.guild, "👢 Kick", `${user.tag}`);

                    return interaction.editReply(`👢 ${user.tag} expulsado`);
                }

                case "ban": {
                    const user = interaction.options.getUser("user");
                    const member = await interaction.guild.members.fetch(user.id);

                    await member.ban();
                    await sendLog(interaction.guild, "🔨 Ban", `${user.tag}`);

                    return interaction.editReply(`🔨 ${user.tag} baneado`);
                }

                case "warn": {
                    const user = interaction.options.getUser("user");
                    const reason = interaction.options.getString("reason");

                    await sendLog(interaction.guild, "⚠️ Warn", `${user.tag}\n${reason}`);

                    return interaction.editReply(`⚠️ ${user.tag} advertido`);
                }

                case "announce": {
                    const titulo = interaction.options.getString("titulo");
                    const mensaje = interaction.options.getString("mensaje");

                    const embed = new EmbedBuilder()
                        .setTitle(`📢 ${titulo}`)
                        .setDescription(mensaje)
                        .setColor(0x000000);

                    await interaction.channel.send({ embeds: [embed] });

                    return interaction.editReply("📢 enviado");
                }

                case "ticketpanel": {
                    const button = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("create_ticket")
                            .setLabel("🎫 Crear Ticket")
                            .setStyle(ButtonStyle.Primary)
                    );

                    await interaction.channel.send({
                        content: "🎫 Sistema de tickets",
                        components: [button]
                    });

                    return interaction.editReply("panel creado");
                }
            }

        } catch (err) {
            console.error("COMMAND ERROR:", err);

            if (!interaction.replied) {
                return interaction.reply({
                    content: "❌ Error ejecutando comando",
                    ephemeral: true
                });
            }
        }
    }

    // ================= BUTTON TICKETS =================
    if (interaction.isButton()) {

        if (interaction.customId === "create_ticket") {

            const existing = interaction.guild.channels.cache.find(
                c => c.name === `ticket-${interaction.user.id}`
            );

            if (existing) {
                return interaction.reply({
                    content: "Ya tienes un ticket abierto",
                    ephemeral: true
                });
            }

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
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

            return interaction.reply({
                content: `🎫 Ticket creado: ${channel}`,
                ephemeral: true
            });
        }
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