import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  Collection
} from 'discord.js';

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// SUPABASE
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['CHANNEL'],
});

const GIF_URL = 'https://cdn-longterm.mee6.xyz/plugins/welcome/images/1014210083955163197/da9da3b39a05bc51b1d3bd75b6e4ec40da3b7a81c43e3263a996c2201ba192aa.gif';
const RED_COLOR = 0xFF0000;

// Track banned users' info: userId => { guildId, guildName, reason, moderatorId, moderatorTag, bannedAt }
const bannedUsersInfo = new Collection();
// Track appeal channels: userId => channelId
const appealChannels = new Collection();

// Bot owner ID
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

// Slash Commands Definition
const commands = [
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send the announcement')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the announcement')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement message')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Color hex (e.g., #FF0000 for red)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Image URL to include')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages from the channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)),

  new SlashCommandBuilder()
    .setName('setupticket')
    .setDescription('Setup the ticket panel in this channel'),

  new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Show all active tickets'),

  new SlashCommandBuilder()
    .setName('closeticket')
    .setDescription('Close the current ticket')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for closing')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show server information'),

  new SlashCommandBuilder()
    .setName('stealemojis')
    .setDescription('Steal emojis from another server')
    .addStringOption(option =>
      option.setName('emojis')
        .setDescription('Emojis to steal (separated by space)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('closeappeal')
    .setDescription('Close an appeal channel')
    .addStringOption(option =>
      option.setName('channelid')
        .setDescription('ID of the appeal channel to close (optional)')
        .setRequired(false)),
].map(command => command.toJSON());

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  
  try {
    console.log('Registering slash commands...');
    const existingCommands = await rest.get(Routes.applicationCommands(client.user.id));
    const toDeleteNames = ['anuncio', 'setup_tickets'];
    const clearCmds = existingCommands.filter(cmd => cmd.name === 'clear');
    const infoCmds = existingCommands.filter(cmd => cmd.name === 'info');
    const toDelete = existingCommands.filter(cmd => {
      if (toDeleteNames.includes(cmd.name)) return true;
      if (cmd.name === 'clear' && clearCmds.length > 1) return clearCmds.indexOf(cmd) !== 0;
      if (cmd.name === 'info' && infoCmds.length > 1) return infoCmds.indexOf(cmd) !== 0;
      return false;
    });
    for (const cmd of toDelete) {
      await rest.delete(Routes.applicationCommands(client.user.id) + '/' + cmd.id);
      console.log('Eliminado /' + cmd.name);
    }
    if (toDelete.length > 0) console.log('Eliminados ' + toDelete.length + ' comandos viejos.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

function hasAdminPermission(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function successMessage(text) {
  return `*:verificado1: ${text} applied correctly*`;
}

async function getBotOwnerId() {
  if (BOT_OWNER_ID) return BOT_OWNER_ID;
  try {
    const app = await client.application.fetch();
    return app.owner?.id || null;
  } catch {
    return null;
  }
}

// SLASH COMMAND HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    if (interaction.isButton()) {
      return handleButtonInteraction(interaction);
    }
    if (interaction.isModalSubmit()) {
      return handleModalSubmit(interaction);
    }
    return;
  }

  if (!hasAdminPermission(interaction.member)) {
    return interaction.reply({
      content: '*Only users with Administrator permissions can use this bot*',
      ephemeral: true
    });
  }

  if (maintenanceMode) {
    return interaction.reply({
      content: '*🟡 El bot está en modo mantenimiento. Los comandos están desactivados temporalmente.*',
      ephemeral: true
    });
  }

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'announce':
        await handleAnnounce(interaction);
        break;
      case 'clear':
        await handleClear(interaction);
        break;
      case 'setupticket':
        await handleSetupTicket(interaction);
        break;
      case 'tickets':
        await handleTickets(interaction);
        break;
      case 'closeticket':
        await handleCloseTicket(interaction);
        break;
      case 'info':
        await handleInfo(interaction);
        break;
      case 'stealemojis':
        await handleStealEmojis(interaction);
        break;
      case 'warn':
        await handleWarn(interaction);
        break;
      case 'closeappeal':
        await handleCloseAppeal(interaction);
        break;
    }
  } catch (error) {
    console.error(`Error executing ${commandName}:`, error);
    const errorMsg = { content: '*An error occurred while executing the command*', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg);
    } else {
      await interaction.reply(errorMsg);
    }
  }
});

// ======================
// BAN + APPEAL SYSTEM
// ======================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Handle DM messages from users (ban appeals)
  if (message.channel.type === ChannelType.DM) {
    return handleAppealMessage(message);
  }

  if (!message.content.startsWith('!ban')) return;

  if (!hasAdminPermission(message.member)) {
    return message.reply('*Only users with Administrator permissions can use this bot*');
  }

  const args = message.content.split(' ').slice(1);
  const user = message.mentions.users.first();
  const reason = args.slice(1).join(' ') || 'No reason provided';

  if (!user) {
    return message.reply('*Please mention a user to ban*');
  }

  try {
    const member = await message.guild.members.fetch(user.id);

    // --- FIRST: Send DM to user BEFORE banning ---
    const firstGuild = client.guilds.cache.first();
    let dmSent = false;
    try {
      const appealEmbed = new EmbedBuilder()
        .setColor(RED_COLOR)
        .setTitle('🔨 You have been banned')
        .setDescription(
          `**Server:** ${message.guild.name}\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${message.author.tag}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**🔄 Want to appeal your ban?**\n\n` +
          `Send a message to this bot and your appeal will be reviewed.\n` +
          `Explain your situation and we will consider it.`
        )
        .setImage(GIF_URL)
        .setTimestamp();

      await user.send({ embeds: [appealEmbed] });
      dmSent = true;
      console.log(`Ban DM sent to ${user.tag}`);
    } catch (dmError) {
      console.log(`Could not DM ${user.tag} about ban: ${dmError.message}`);
    }

    // --- SECOND: Execute the ban ---
    await member.ban({ reason });

    const embed = new EmbedBuilder()
      .setColor(RED_COLOR)
      .setTitle('User Banned')
      .setDescription(
        `**User:** ${user.tag}\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${message.author.tag}\n` +
        `${dmSent ? '' : '\n⚠️ **Could not send DM to user** (they may have DMs disabled)'}`
      )
      .setImage(GIF_URL)
      .setTimestamp();

    await message.reply({ content: successMessage('Ban'), embeds: [embed] });

    // Log to database
    await supabase.from('moderation_logs').insert({
      guild_id: message.guild.id,
      action: 'ban',
      moderator_id: message.author.id,
      target_user_id: user.id,
      reason: reason
    });

    // Store ban info in memory for appeal system
    bannedUsersInfo.set(user.id, {
      guildId: message.guild.id,
      guildName: message.guild.name,
      reason: reason,
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      bannedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error banning user:', error);
    message.reply('*Failed to ban user*');
  }
});

// ====== DM HANDLER: When a banned user sends a message to the bot ======
async function handleAppealMessage(message) {
  // Check in-memory cache first
  let banInfo = bannedUsersInfo.get(message.author.id);

  // If not in memory, check database
  if (!banInfo) {
    const { data: banLogs } = await supabase
      .from('moderation_logs')
      .select('*')
      .eq('target_user_id', message.author.id)
      .eq('action', 'ban')
      .order('created_at', { ascending: false })
      .limit(1);

    if (banLogs && banLogs.length > 0) {
      banInfo = {
        guildId: banLogs[0].guild_id,
        guildName: 'the server',
        reason: banLogs[0].reason || 'No reason provided',
        moderatorId: banLogs[0].moderator_id,
        moderatorTag: 'a moderator'
      };
    }
  }

  // Check if an appeal channel already exists for this user
  const existingChannelId = appealChannels.get(message.author.id);
  if (existingChannelId) {
    // Channel exists - post the message there
    const guild = client.guilds.cache.get(banInfo?.guildId || client.guilds.cache.firstKey());
    if (guild) {
      const channel = guild.channels.cache.get(existingChannelId);
      if (channel) {
        const msgEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
          .setDescription(message.content || '*empty message*')
          .setTimestamp();

        await channel.send({ embeds: [msgEmbed] });
        await message.react('✅');
        return;
      }
    }
    // If channel not found, remove from cache so it re-creates
    appealChannels.delete(message.author.id);
  }

  if (!banInfo) {
    // No ban record found
    const helpEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 Bot Support')
      .setDescription(
        'This bot handles support tickets and moderation.\n\n' +
        'If you have been banned from a server and want to appeal, ' +
        'please make sure the ban was issued by this bot.'
      )
      .setTimestamp();

    await message.author.send({ embeds: [helpEmbed] });
    return;
  }

  // This user IS banned - create an appeal channel in the guild
  const guild = client.guilds.cache.get(banInfo.guildId);
  if (!guild) {
    console.error(`Cannot create appeal channel: Guild ${banInfo.guildId} not found`);
    await message.author.send({
      content: '*There was an error processing your appeal. Please try again later.*'
    });
    return;
  }

  try {
    // Find or create a category for appeals
    let appealCategory = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('appeals')
    );
    if (!appealCategory) {
      appealCategory = await guild.channels.create({
        name: '🔔 BAN APPEALS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });
    }

    // Create a private appeal channel
    const safeName = message.author.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
    const appealChannel = await guild.channels.create({
      name: `appeal-${safeName}`,
      type: ChannelType.GuildText,
      parent: appealCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ],
    });

    // Grant access to all members with Administrator permission
    guild.members.cache.forEach(member => {
      if (hasAdminPermission(member) && !member.user.bot) {
        appealChannel.permissionOverwrites.create(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(() => {});
      }
    });

    // Store channel reference
    appealChannels.set(message.author.id, appealChannel.id);

    // Send initial appeal info
    const appealHeaderEmbed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('🔄 New Ban Appeal')
      .setDescription(
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**User:** ${message.author.tag} (${message.author.id})\n` +
        `**Original Reason:** ${banInfo.reason}\n` +
        `**Banned by:** ${banInfo.moderatorTag}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**Appeal Message:**\n${message.content}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**📝 Instructions:**\n` +
        `• All messages from ${message.author.tag} will appear here automatically\n` +
        `• Use \`/closeappeal\` to close this appeal when resolved\n` +
        `• To respond to the user, use \`/respondappeal\` (not available yet)`
      )
      .setTimestamp();

    const closeButton = new ButtonBuilder()
      .setCustomId(`close_appeal_${message.author.id}`)
      .setLabel('✅ Close Appeal')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await appealChannel.send({
      content: `🔔 **New ban appeal from ${message.author.tag}**`,
      embeds: [appealHeaderEmbed],
      components: [row]
    });

    // Confirm to the appealing user
    const confirmationEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Appeal Submitted')
      .setDescription(
        'Your ban appeal has been sent to the server staff.\n\n' +
        '**How it works:**\n' +
        '• Simply **keep sending messages here** and they will be reviewed.\n' +
        '• Staff will review your appeal.\n\n' +
        'Please be patient and respectful.'
      )
      .setTimestamp();

    await message.author.send({ embeds: [confirmationEmbed] });
    
  } catch (error) {
    console.error('Error creating appeal channel:', error);
    await message.author.send({
      content: '*There was an error creating your appeal. Please try again later.*'
    });
  }
}

// ====== CLOSE APPEAL COMMAND ======
async function handleCloseAppeal(interaction) {
  const channelId = interaction.options.getString('channelid') || interaction.channel.id;

  await interaction.deferReply();

  // Find the user ID associated with this channel
  let targetUserId = null;
  for (const [userId, chId] of appealChannels) {
    if (chId === channelId) {
      targetUserId = userId;
      break;
    }
  }

  const embed = new EmbedBuilder()
    .setColor(RED_COLOR)
    .setTitle('🔒 Appeal Closed')
    .setDescription(`Appeal closed by ${interaction.user.tag}`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  // Delete the channel after 5 seconds
  setTimeout(async () => {
    try {
      const channel = interaction.guild.channels.cache.get(channelId);
      if (channel) await channel.delete();
      if (targetUserId) appealChannels.delete(targetUserId);
    } catch (error) {
      console.error('Error deleting appeal channel:', error);
    }
  }, 5000);
}

// ====== WARN COMMAND ======
async function handleWarn(interaction) {
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');

  await interaction.deferReply({ ephemeral: true });

  try {
    await supabase.from('moderation_logs').insert({
      guild_id: interaction.guild.id,
      action: 'warn',
      moderator_id: interaction.user.id,
      target_user_id: targetUser.id,
      reason: reason
    });

    const { data: warns } = await supabase
      .from('moderation_logs')
      .select('*')
      .eq('guild_id', interaction.guild.id)
      .eq('target_user_id', targetUser.id)
      .eq('action', 'warn');

    const warnCount = warns ? warns.length : 1;

    const warnEmbed = new EmbedBuilder()
      .setColor(RED_COLOR)
      .setTitle('⚠️ User Warned')
      .setDescription(
        `**User:** ${targetUser.tag}\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${interaction.user.tag}\n` +
        `**Total Warnings:** ${warnCount}`
      )
      .setTimestamp();

    await interaction.channel.send({ embeds: [warnEmbed] });

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ You have been warned')
        .setDescription(
          `**Server:** ${interaction.guild.name}\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.tag}\n\n` +
          `Please follow the server rules to avoid further action.`
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      console.log(`Could not DM ${targetUser.tag} about warn: ${dmError.message}`);
    }

    await interaction.editReply({ content: successMessage(`Warn on ${targetUser.tag} (${warnCount} total warns)`) });
  } catch (error) {
    console.error('Error warning user:', error);
    await interaction.editReply({ content: '*Failed to warn user*' });
  }
}

// ====== EXISTING COMMANDS (unchanged) ======
async function handleAnnounce(interaction) {
  const channel = interaction.options.getChannel("channel");
  const title = interaction.options.getString("title");
  const message = interaction.options.getString("message");
  const colorStr = interaction.options.getString("color") || "#FF0000";
  const imageUrl = interaction.options.getString("image") || null;

  let color = 0xFF0000;
  try {
    if (colorStr.startsWith("#")) color = parseInt(colorStr.slice(1), 16);
    else if (!isNaN(parseInt(colorStr))) color = parseInt(colorStr);
  } catch (e) {}

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(message)
    .setFooter({ text: `Announced by ${interaction.user.tag}` })
    .setTimestamp();

  if (imageUrl) embed.setImage(imageUrl);
  else embed.setImage(GIF_URL);

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: successMessage("Announcement"), ephemeral: true });
}

async function handleClear(interaction) {
  const amount = interaction.options.getInteger('amount');
  await interaction.deferReply({ ephemeral: true });

  try {
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    await interaction.channel.bulkDelete(messages, true);
    await interaction.editReply({ content: successMessage(`Cleared ${messages.size} messages`) });
  } catch (error) {
    console.error('Error clearing messages:', error);
    await interaction.editReply({ content: '*Failed to clear messages*' });
  }
}

async function handleSetupTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const embed = new EmbedBuilder()
      .setColor(RED_COLOR)
      .setTitle(':lion: YL Ticket System')
      .setDescription(
        'Our support team will assist you as soon as possible.\n\n' +
        'Please describe your issue in detail.'
      )
      .setImage(GIF_URL)
      .setFooter({ text: 'Ticket System' })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('📩 Create Ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    const panelMessage = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await supabase
      .from('ticket_panels')
      .upsert({
        guild_id: interaction.guild.id,
        message_id: panelMessage.id,
        channel_id: interaction.channel.id,
        title: ':lion: YL Ticket System',
        description: 'Our support team will assist you as soon as possible. Please describe your issue in detail.',
        button_label: '📩 Create Ticket'
      }, { onConflict: 'guild_id' });

    await interaction.editReply({ content: successMessage('Ticket panel setup') });
  } catch (error) {
    console.error('Error setting up ticket panel:', error);
    await interaction.editReply({ content: '*Failed to setup ticket panel*' });
  }
}

async function handleTickets(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('guild_id', interaction.guild.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!tickets || tickets.length === 0) {
      return interaction.editReply({ content: '*No active tickets at the moment*' });
    }

    const embed = new EmbedBuilder()
      .setColor(RED_COLOR)
      .setTitle('🎫 Active Tickets')
      .setDescription(`Total open tickets: **${tickets.length}**\n\n`)
      .setTimestamp();

    for (const ticket of tickets.slice(0, 10)) {
      const channel = interaction.guild.channels.cache.get(ticket.channel_id);
      const channelMention = channel ? channel.toString() : 'Channel not found';
      
      embed.addFields({
        name: `Ticket #${String(ticket.ticket_number).padStart(4, '0')}`,
        value: `**Subject:** ${ticket.subject}\n**Channel:** ${channelMention}\n**Created:** <t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:R>`,
        inline: false
      });
    }

    if (tickets.length > 10) {
      embed.setFooter({ text: `Showing 10 of ${tickets.length} tickets` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    await interaction.editReply({ content: '*Failed to fetch tickets*' });
  }
}

async function handleCloseTicket(interaction) {
  const reason = interaction.options.getString('reason') || 'No reason provided';
  await interaction.deferReply();

  try {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('channel_id', interaction.channel.id)
      .eq('status', 'open')
      .single();

    if (!ticket) {
      return interaction.editReply({ content: '*This is not a valid ticket channel or the ticket is already closed*' });
    }

    await supabase
      .from('tickets')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', ticket.id);

    const embed = new EmbedBuilder()
      .setColor(RED_COLOR)
      .setTitle('🔒 Ticket Closed')
      .setDescription(`**Reason:** ${reason}\n**Closed by:** ${interaction.user.tag}`)
      .setImage(GIF_URL)
      .setTimestamp();

    await interaction.editReply({ content: successMessage('Ticket closed'), embeds: [embed] });

    setTimeout(async () => {
      try { await interaction.channel.delete(); } catch (error) { console.error('Error deleting channel:', error); }
    }, 10000);
  } catch (error) {
    console.error('Error closing ticket:', error);
    await interaction.editReply({ content: '*Failed to close ticket*' });
  }
}

async function handleInfo(interaction) {
  const guild = interaction.guild;

  const embed = new EmbedBuilder()
    .setColor(RED_COLOR)
    .setTitle(`📊 ${guild.name} Information`)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: 'Server ID', value: guild.id, inline: true },
      { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: 'Members', value: guild.memberCount.toString(), inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
      { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
      { name: 'Boosts', value: guild.premiumSubscriptionCount.toString(), inline: true }
    )
    .setImage(GIF_URL)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleStealEmojis(interaction) {
  const emojisStr = interaction.options.getString("emojis");
  await interaction.deferReply({ ephemeral: true });

  try {
    const emojiRegex = /<(?<animated>a)?:(?<name>[a-zA-Z0-9_]+):(?<id>\d+)>/g;
    let match;
    let added = 0;
    let errors = 0;

    while ((match = emojiRegex.exec(emojisStr)) !== null) {
      const name = match.groups.name;
      const id = match.groups.id;
      const animated = match.groups.animated === "a";
      const url = animated ? `https://cdn.discordapp.com/emojis/${id}.gif` : `https://cdn.discordapp.com/emojis/${id}.png`;

      try {
        await interaction.guild.emojis.create({ attachment: url, name: name });
        added++;
      } catch (e) {
        console.error(`Error adding emoji ${name}: ${e.message}`);
        errors++;
      }
    }

    if (added === 0 && errors === 0) {
      return interaction.editReply("*No se encontraron emojis. Copia emojis de otro servidor y pegalos aqui.*");
    }

    let reply = `\u2705 Se anadieron ${added} emoji(s) al servidor.`;
    if (errors > 0) reply += `\n\u274c ${errors} emoji(s) fallaron (limite alcanzado o sin permisos).`;
    await interaction.editReply(reply);
  } catch (e) {
    console.error("Error in stealemojis:", e);
    await interaction.editReply("*Error al procesar emojis.*");
  }
}

// BUTTON HANDLER
async function handleButtonInteraction(interaction) {
  const { customId } = interaction;

  if (customId === 'create_ticket') {
    const { data: existingTickets } = await supabase
      .from('tickets')
      .select('*')
      .eq('guild_id', interaction.guild.id)
      .eq('creator_id', interaction.user.id)
      .eq('status', 'open');

    if (existingTickets && existingTickets.length > 0) {
      return interaction.reply({
        content: '*You already have an open ticket. Please close it before creating a new one.*',
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('Create New Ticket');

    const subjectInput = new TextInputBuilder()
      .setCustomId('ticket_subject')
      .setLabel('Ticket Subject')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., Server issue')
      .setRequired(true)
      .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('ticket_description')
      .setLabel('Detailed Description')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Describe your issue in detail...')
      .setRequired(true)
      .setMaxLength(1000);

    const firstRow = new ActionRowBuilder().addComponents(subjectInput);
    const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
    modal.addComponents(firstRow, secondRow);

    await interaction.showModal(modal);
  }

  // Handle close appeal buttons
  if (customId.startsWith('close_appeal_')) {
    const userId = customId.replace('close_appeal_', '');
    const channelId = appealChannels.get(userId);
    
    await interaction.deferReply();
    
    const embed = new EmbedBuilder()
      .setColor(RED_COLOR)
      .setTitle('🔒 Appeal Closed')
      .setDescription(`Appeal closed by ${interaction.user.tag}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    setTimeout(async () => {
      try {
        await interaction.channel.delete();
        appealChannels.delete(userId);
      } catch (error) {
        console.error('Error deleting appeal channel:', error);
      }
    }, 5000);
  }

  if (customId === 'claim_ticket') {
    return handleClaimTicket(interaction);
  }

  if (customId === 'close_ticket_btn') {
    return handleCloseTicketButton(interaction);
  }
}

// MODAL HANDLER
async function handleModalSubmit(interaction) {
  if (interaction.customId !== 'ticket_modal') return;

  await interaction.deferReply({ ephemeral: true });

  const subject = interaction.fields.getTextInputValue('ticket_subject');
  const description = interaction.fields.getTextInputValue('ticket_description');

  try {
    const { data: lastTicket } = await supabase
      .from('tickets')
      .select('ticket_number')
      .order('ticket_number', { ascending: false })
      .limit(1);

    const ticketNumber = lastTicket && lastTicket.length > 0 ? lastTicket[0].ticket_number + 1 : 1;

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${String(ticketNumber).padStart(4, '0')}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: interaction.channel.parent,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
      ],
    });

    await supabase.from('tickets').insert({
      ticket_number: ticketNumber,
      guild_id: interaction.guild.id,
      channel_id: ticketChannel.id,
      creator_id: interaction.user.id,
      status: 'open',
      subject: subject
    });

    const ticketEmbed = new EmbedBuilder()
      .setColor(RED_COLOR)
      .setTitle(`🎫 Ticket #${String(ticketNumber).padStart(4, '0')}`)
      .setDescription(
        `**Subject:** ${subject}\n\n**Description:**\n${description}\n\n**Status:** 🟢 Open\n**Created by:** ${interaction.user}\n**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setImage(GIF_URL)
      .setFooter({ text: 'A staff member will assist you soon' })
      .setTimestamp();

    const claimButton = new ButtonBuilder().setCustomId('claim_ticket').setLabel('👤 Claim').setStyle(ButtonStyle.Success);
    const closeButton = new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

    await ticketChannel.send({ content: `${interaction.user} | Welcome to your support ticket.`, embeds: [ticketEmbed], components: [row] });
    await interaction.editReply({ content: successMessage(`Ticket created: ${ticketChannel}`), ephemeral: true });

    const staffRoles = interaction.guild.roles.cache.filter(role => role.permissions.has(PermissionsBitField.Flags.Administrator));
    if (staffRoles.size > 0) {
      const staffMentions = staffRoles.map(role => role.toString()).join(' ');
      await ticketChannel.send(`📢 ${staffMentions} - New ticket created`);
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    await interaction.editReply({ content: '*Failed to create ticket*' });
  }
}

async function handleClaimTicket(interaction) {
  if (!hasAdminPermission(interaction.member)) {
    return interaction.reply({ content: '*Only staff can claim tickets*', ephemeral: true });
  }

  const originalMessage = interaction.message;
  const originalEmbed = originalMessage.embeds[0];
  const updatedEmbed = EmbedBuilder.from(originalEmbed)
    .setColor(RED_COLOR)
    .setDescription(originalEmbed.description.replace('**Status:** 🟢 Open', `**Status:** 🟡 In Progress\n**Claimed by:** ${interaction.user}`));

  await interaction.update({ embeds: [updatedEmbed], components: originalMessage.components });
  await interaction.channel.send(successMessage(`${interaction.user} has claimed this ticket`));
}

async function handleCloseTicketButton(interaction) {
  if (!hasAdminPermission(interaction.member)) {
    return interaction.reply({ content: '*Only staff can close tickets*', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(RED_COLOR)
    .setTitle('⚠️ Confirm Ticket Closure')
    .setDescription('Are you sure you want to close this ticket?\n\nThe channel will be deleted in 10 seconds after confirmation.');

  const confirmButton = new ButtonBuilder().setCustomId('confirm_close').setLabel('✅ Confirm').setStyle(ButtonStyle.Danger);
  const cancelButton = new ButtonBuilder().setCustomId('cancel_close').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ========================
// EXPRESS API SERVER
// ========================
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_PORT = process.env.API_PORT || process.env.PORT || 3456;
const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'dashboard')));

let startTime = Date.now();
let maintenanceMode = false;

app.get('/api/status', (req, res) => {
  if (!client.isReady()) return res.json({ online: false });

  let totalUsers = 0;
  let totalChannels = 0;
  client.guilds.cache.forEach(g => {
    totalUsers += g.memberCount || 0;
    totalChannels += g.channels.cache.size || 0;
  });

  res.json({
    online: true,
    maintenance: maintenanceMode,
    username: client.user.username,
    discriminator: client.user.discriminator,
    id: client.user.id,
    guilds: client.guilds.cache.size,
    users: totalUsers,
    channels: totalChannels,
    uptime: formatUptime(Date.now() - startTime),
    latency: client.ws.ping
  });
});

app.post('/api/shutdown', (req, res) => {
  if (!client.isReady()) return res.json({ success: false, message: 'Bot no conectado' });
  maintenanceMode = true;
  res.json({ success: true, message: '🟡 Bot en modo mantenimiento. Sigue conectado pero no responde comandos.' });
});

app.post('/api/restart', (req, res) => {
  maintenanceMode = false;
  res.json({ success: true, message: '🟢 Bot en modo activo. Comandos operativos.' });
});

app.post('/api/start', (req, res) => {
  maintenanceMode = false;
  res.json({ success: true, message: '🟢 Bot activo. Comandos operativos.' });
});

app.post('/api/setname', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: false, message: 'Nombre requerido' });
  if (!client.isReady()) return res.json({ success: false, message: 'Bot no conectado' });
  try {
    await client.user.setUsername(name);
    res.json({ success: true, message: `Nombre cambiado a "${name}"` });
  } catch (e) {
    res.json({ success: false, message: `Error: ${e.message}` });
  }
});

app.post('/api/setdescription', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.json({ success: false, message: 'Descripción requerida' });
  if (!client.isReady()) return res.json({ success: false, message: 'Bot no conectado' });
  try {
    await client.user.setActivity(description);
    res.json({ success: true, message: 'Descripción/estado actualizado' });
  } catch (e) {
    res.json({ success: false, message: `Error: ${e.message}` });
  }
});

app.post('/api/setavatar', async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.json({ success: false, message: 'URL de avatar requerida' });
  if (!client.isReady()) return res.json({ success: false, message: 'Bot no conectado' });
  try {
    await client.user.setAvatar(avatar);
    res.json({ success: true, message: 'Avatar actualizado' });
  } catch (e) {
    res.json({ success: false, message: `Error: ${e.message}` });
  }
});

app.post('/api/ticketpanel', async (req, res) => {
  const { title, description, button_label } = req.body;
  if (!client.isReady()) return res.json({ success: false, message: 'Bot no conectado' });
  try {
    await supabase.from('ticket_panels').upsert({
      guild_id: 'dashboard',
      title: title || '🎫 Support Ticket System',
      description: description || 'Need help? Click below.',
      button_label: button_label || '📩 Create Ticket'
    }, { onConflict: 'guild_id' });
    res.json({ success: true, message: 'Panel de tickets actualizado' });
  } catch (e) {
    res.json({ success: false, message: `Error: ${e.message}` });
  }
});

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

app.listen(API_PORT, () => {
  console.log(`API Server running on http://localhost:${API_PORT}`);
});

client.login(process.env.DISCORD_TOKEN);