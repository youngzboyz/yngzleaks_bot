require('dotenv').config();

console.log("BOT INSTANCE STARTED");

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

// ================= CLIENT (FIX IMPORTANTE) =================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers // 🔥 ESTO ES LO QUE TE FALTABA
    ]
});

// ================= READY =================
client.once("ready", () => {
    console.log("✅ BOT ONLINE:", client.user.tag);
});

// ================= LOG =================
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

        // 🔥 DEFER PARA EVITAR "NO RESPONDE"
        await interaction.deferReply({ ephemeral: false }).catch(() => {});

        try {

            // ================= KICK =================
            if (commandName === 'kick') {
                const user = interaction.options.getUser('user');
                const member = await interaction.guild.members.fetch(user.id);

                await member.kick();
                await sendLog(interaction.guild, "👢 Kick", `${user.tag} expulsado por ${interaction.user.tag}`);

                return interaction.editReply(`👢 ${user.tag} expulsado`);
            }

            // ================= BAN =================
            if (commandName === 'ban') {
                const user = interaction.options.getUser('user');
                const member = await interaction.guild.members.fetch(user.id);

                await member.ban();
                await sendLog(interaction.guild, "🔨 Ban", `${user.tag} baneado por ${interaction.user.tag}`);

                return interaction.editReply(`🔨 ${user.tag} baneado`);
            }

            // ================= WARN =================
            if (commandName === 'warn') {
                const user = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason');

                await sendLog(
                    interaction.guild,
                    "⚠️ Warn",
                    `${user.tag} advertido por ${interaction.user.tag}\nMotivo: ${reason}`
                );

                return interaction.editReply(`⚠️ ${user.tag} advertido`);
            }

            // ================= ANNOUNCE (FIX FINAL) =================
            if (commandName === 'announce') {

                const titulo = interaction.options.getString('titulo');
                const mensaje = interaction.options.getString('mensaje');

                const embed = new EmbedBuilder()
                    .setTitle(`📢 ${titulo}`)
                    .setDescription(mensaje)
                    .setColor(0x000000);

                await interaction.channel.send({ embeds: [embed] });

                return interaction.editReply("📢 Anuncio enviado");
            }

            // ================= TICKET PANEL =================
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

                return interaction.editReply("Panel creado");
            }

        } catch (err) {
            console.error(err);
            return interaction.editReply("❌ Error ejecutando comando");
        }
    }

    // ================= BUTTONS =================
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