
require('dotenv').config();

const express = require('express');
const app = express();

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const fs = require('fs');

// ================= DEBUG ENV =================
console.log("TOKEN OK:", !!process.env.TOKEN);
console.log("CLIENT_ID:", process.env.CLIENT_ID);
console.log("GUILD_ID:", process.env.GUILD_ID);

// ================= KEEP ALIVE =================
app.get('/', (req, res) => {
    res.send('Bot online');
});

app.listen(3000, () => {
    console.log('Keep alive activo en puerto 3000');
});

// ================= CLIENT =================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= COMMANDS =================

const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Pong!'),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsar usuario')
        .addUserOption(opt =>
            opt.setName('user').setDescription('Usuario').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banear usuario')
        .addUserOption(opt =>
            opt.setName('user').setDescription('Usuario').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advertir usuario')
        .addUserOption(opt =>
            opt.setName('user').setDescription('Usuario').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Razón').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Borrar mensajes')
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Cantidad').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Anuncio')
        .addStringOption(opt =>
            opt.setName('message').setDescription('Mensaje').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Abrir ticket')
].map(c => c.toJSON());

// ================= REST =================

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// ================= READY =================

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);

    try {
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log('Comandos registrados');
    } catch (err) {
        console.error("ERROR registrando comandos:", err);
    }
});

// ================= EVENTS =================

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        return interaction.reply('🏓 Pong!');
    }

    if (commandName === 'kick') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        await member.kick();
        return interaction.reply(`👢 ${user.tag} expulsado`);
    }

    if (commandName === 'ban') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        await member.ban();
        return interaction.reply(`🔨 ${user.tag} baneado`);
    }

    if (commandName === 'warn') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        let data = {};
        if (fs.existsSync('./warnings.json')) {
            data = JSON.parse(fs.readFileSync('./warnings.json'));
        }

        if (!data[user.id]) data[user.id] = [];
        data[user.id].push(reason);

        fs.writeFileSync('./warnings.json', JSON.stringify(data, null, 2));

        return interaction.reply(`⚠️ ${user.tag} advertido`);
    }

    if (commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        const msgs = await interaction.channel.bulkDelete(amount);
        return interaction.reply({ content: `🧹 ${msgs.size} mensajes borrados`, ephemeral: true });
    }

    if (commandName === 'announce') {
        const msg = interaction.options.getString('message');

        const embed = new EmbedBuilder()
            .setTitle('📢 Anuncio')
            .setDescription(msg)
            .setColor(0x3498db);

        return interaction.channel.send({ embeds: [embed] });
    }

    if (commandName === 'ticket') {
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 0
        });

        return interaction.reply({
            content: `🎫 Ticket creado: ${channel}`,
            ephemeral: true
        });
    }
});

// ================= LOGIN (DEBUG REAL) =================

client.login(process.env.TOKEN)
    .then(() => console.log("LOGIN OK ✔️"))
    .catch(err => console.error("LOGIN ERROR ❌", err));