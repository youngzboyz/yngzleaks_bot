require('dotenv').config();

const express = require('express');
const app = express();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');

// ================= DEBUG =================
console.log("🚀 INICIO BOT");
console.log("TOKEN OK:", !!process.env.TOKEN);

if (!process.env.TOKEN) {
    console.log("❌ TOKEN no encontrado");
    process.exit(1);
}

// ================= WEB =================
app.get('/', (req, res) => res.send('Bot online'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🌐 Web OK en puerto", PORT));

// ================= BOT =================
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

// ================= LOGS =================
async function sendLog(guild, title, desc, color = 0xff0000) {
    const channel = guild.channels.cache.find(c => c.name === "logs");
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(color)
        .setTimestamp();

    channel.send({ embeds: [embed] });
}

// ================= INTERACTIONS (UNIFICADO + FIX REAL) =================
client.on("interactionCreate", async (interaction) => {

    try {

        // ================= SLASH COMMANDS =================
        if (interaction.isChatInputCommand()) {

            const cmd = interaction.commandName;

            // 🏓 PING
            if (cmd === "ping") {
                return await interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
            }

            // 👢 KICK
            if (cmd === "kick") {
                const user = interaction.options.getUser("user");
                const member = await interaction.guild.members.fetch(user.id);

                await member.kick();
                await sendLog(interaction.guild, "👢 Kick", `${user.tag} expulsado por ${interaction.user.tag}`);

                return interaction.reply(`👢 ${user.tag} expulsado`);
            }

            // 🔨 BAN
            if (cmd === "ban") {
                const user = interaction.options.getUser("user");
                const member = await interaction.guild.members.fetch(user.id);

                await member.ban();
                await sendLog(interaction.guild, "🔨 Ban", `${user.tag} baneado por ${interaction.user.tag}`);

                return interaction.reply(`🔨 ${user.tag} baneado`);
            }

            // ⚠️ WARN
            if (cmd === "warn") {
                const user = interaction.options.getUser("user");
                const reason = interaction.options.getString("reason");

                await sendLog(
                    interaction.guild,
                    "⚠️ Warn",
                    `${user.tag} advertido por ${interaction.user.tag}\nMotivo: ${reason}`
                );

                return interaction.reply(`⚠️ ${user.tag} advertido`);
            }

            // 📢 ANNOUNCE
            if (cmd === "announce") {

                const titulo = interaction.options.getString("titulo");
                const mensaje = interaction.options.getString("mensaje");

                const embed = new EmbedBuilder()
                    .setTitle(`📢 ${titulo}`)
                    .setDescription(mensaje)
                    .setColor(0x000000);

                await interaction.channel.send({ embeds: [embed] });

                return interaction.reply({ content: "📢 Anuncio enviado", ephemeral: true });
            }

            // 🎫 TICKET PANEL
            if (cmd === "ticketpanel") {

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("create_ticket")
                        .setLabel("🎫 Crear Ticket")
                        .setStyle(ButtonStyle.Primary)
                );

                await interaction.channel.send({
                    content: "🎫 Sistema de tickets",
                    components: [row]
                });

                return interaction.reply({ content: "Panel creado", ephemeral: true });
            }
        }

        // ================= BUTTONS =================
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
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages
                            ]
                        }
                    ]
                });

                return interaction.reply({
                    content: `🎫 Ticket creado: ${channel}`,
                    ephemeral: true
                });
            }
        }

    } catch (err) {
        console.error("INTERACTION ERROR:", err);

        if (!interaction.replied) {
            return interaction.reply("❌ Error ejecutando comando");
        }
    }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);