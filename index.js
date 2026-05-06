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

// ================= SERVER =================
app.get('/', (req, res) => res.send('Bot online'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Web server activo en puerto ${PORT}`);
});

// ================= CLIENT =================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= READY (FIX REAL) =================
client.once("ready", () => {
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

    // ================= SLASH COMMANDS =================
    if (interaction.isChatInputCommand()) {

        const { commandName } = interaction;

        // 👢 KICK (FIX)
        if (commandName === 'kick') {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (!member) return interaction.reply({ content: "Usuario no encontrado", ephemeral: true });

            await member.kick();
            await sendLog(interaction.guild, "👢 Kick", `${user.tag} expulsado por ${interaction.user.tag}`);
            return interaction.reply(`👢 ${user.tag} expulsado`);
        }

        // 🔨 BAN (FIX)
        if (commandName === 'ban') {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (!member) return interaction.reply({ content: "Usuario no encontrado", ephemeral: true });

            await member.ban();
            await sendLog(interaction.guild, "🔨 Ban", `${user.tag} baneado por ${interaction.user.tag}`);
            return interaction.reply(`🔨 ${user.tag} baneado`);
        }

        // ⚠️ WARN (FIX ESTABLE)
        if (commandName === 'warn') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');

            if (!user) {
                return interaction.reply({ content: "Usuario inválido", ephemeral: true });
            }

            await sendLog(
                interaction.guild,
                "⚠️ Warn",
                `${user.tag} advertido por ${interaction.user.tag}\nMotivo: ${reason}`
            );

            return interaction.reply(`⚠️ ${user.tag} advertido`);
        }

        // 📢 ANNOUNCE (CLEAN)
        if (commandName === 'announce') {

            const titulo = interaction.options.getString('titulo');
            const mensaje = interaction.options.getString('mensaje');

            const embed = new EmbedBuilder()
                .setTitle(`📢 ${titulo}`)
                .setDescription(mensaje)
                .setColor(0x000000);

            await interaction.channel.send({ embeds: [embed] });

            return interaction.reply({ content: "📢 Anuncio enviado", ephemeral: true });
        }

        // 🎫 TICKET PANEL (PRO FIX)
        if (commandName === 'ticketpanel') {

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('🎫 Crear Ticket')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({
                content: "🎫 Sistema de tickets",
                components: [button]
            });

            return interaction.reply({ content: "Panel creado", ephemeral: true });
        }
    }

    // ================= BUTTON TICKETS =================
    if (interaction.isButton()) {

        if (interaction.customId === 'create_ticket') {

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