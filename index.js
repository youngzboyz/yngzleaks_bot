require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');

require('dotenv').config();
const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= COMMANDS =================

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('🏓 Pong!'),

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
        .setDescription('Anuncio del servidor')
        .addStringOption(opt =>
            opt.setName('message').setDescription('Mensaje').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Abrir ticket de soporte')
].map(c => c.toJSON());

// ================= REGISTER COMMANDS =================

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);

    await rest.put(
        Routes.applicationGuildCommands(client.user.id, '1014210083955163197'),
        { body: commands }
    );

    console.log('Comandos registrados');
});

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // PING
    if (commandName === 'ping') {
        return interaction.reply('🏓 Pong!');
    }

    // KICK
    if (commandName === 'kick') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        await member.kick();
        return interaction.reply(`👢 ${user.tag} expulsado`);
    }

    // BAN
    if (commandName === 'ban') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        await member.ban();
        return interaction.reply(`🔨 ${user.tag} baneado`);
    }

    // WARN
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

        return interaction.reply(`⚠️ ${user.tag} advertido: ${reason}`);
    }

    // CLEAR
    if (commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        const messages = await interaction.channel.bulkDelete(amount);
        return interaction.reply({ content: `🧹 ${messages.size} mensajes borrados`, ephemeral: true });
    }

    // ANNOUNCE
    if (commandName === 'announce') {
        const msg = interaction.options.getString('message');

        const embed = new EmbedBuilder()
            .setTitle('📢 Anuncio')
            .setDescription(msg)
            .setColor('Blue');

        return interaction.channel.send({ embeds: [embed] });
    }

    // TICKET
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

client.login(TOKEN);