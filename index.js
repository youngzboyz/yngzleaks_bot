
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
} from 'discord.js';

import pg from 'pg';
const { Pool } = pg;

// 🔥 CONEXIÓN SQL RAILWAY
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const prefix = '!';

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  client.user.setActivity('tickets & moderation', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'kick') {
    await handleKick(message, args);
  } else if (command === 'ban') {
    await handleBan(message, args);
  } else if (command === 'mute') {
    await handleMute(message, args);
  } else if (command === 'warn') {
    await handleWarn(message, args);
  } else if (command === 'unban') {
    await handleUnban(message, args);
  } else if (command === 'unmute') {
    await handleUnmute(message, args);
  } else if (command === 'setupticketpanel') {
    await setupTicketPanel(message);
  } else if (command === 'modlogs') {
    await showModLogs(message, args);
  }
});

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
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const prefix = '!';

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  client.user.setActivity('tickets & moderation', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'kick') {
    await handleKick(message, args);
  } else if (command === 'ban') {
    await handleBan(message, args);
  } else if (command === 'mute') {
    await handleMute(message, args);
  } else if (command === 'warn') {
    await handleWarn(message, args);
  } else if (command === 'unban') {
    await handleUnban(message, args);
  } else if (command === 'unmute') {
    await handleUnmute(message, args);
  } else if (command === 'setupticketpanel') {
    await setupTicketPanel(message);
  } else if (command === 'modlogs') {
    await showModLogs(message, args);
  }
});

async function handleKick(message, args) {
  if (!message.member.permissions.has('KickMembers')) {
    return message.reply('You need permission to kick members.');
  }

  const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
  if (!target) return message.reply('Please specify a user to kick.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await target.kick(reason);
    await logModeration(message.guild.id, 'kick', message.author.id, target.id, reason);

    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('Member Kicked')
      .addFields(
        { name: 'User', value: `<@${target.id}>`, inline: true },
        { name: 'Moderator', value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logToChannel(message.guild, embed);
  } catch (error) {
    console.error(error);
    message.reply('Failed to kick member.');
  }
}

async function handleBan(message, args) {
  if (!message.member.permissions.has('BanMembers')) {
    return message.reply('You need permission to ban members.');
  }

  const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
  if (!target) return message.reply('Please specify a user to ban.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await target.ban({ reason });
    await logModeration(message.guild.id, 'ban', message.author.id, target.id, reason);

    const embed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('Member Banned')
      .addFields(
        { name: 'User', value: `<@${target.id}>`, inline: true },
        { name: 'Moderator', value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logToChannel(message.guild, embed);
  } catch (error) {
    console.error(error);
    message.reply('Failed to ban member.');
  }
}

async function handleMute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply('You need permission to mute members.');
  }

  const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
  if (!target) return message.reply('Please specify a user to mute.');

  const duration = parseInt(args[1]) || 60;
  const reason = args.slice(2).join(' ') || 'No reason provided';

  try {
    await target.timeout(duration * 60 * 1000, reason);
    await logModeration(message.guild.id, 'mute', message.author.id, target.id, reason, duration);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Member Muted')
      .addFields(
        { name: 'User', value: `<@${target.id}>`, inline: true },
        { name: 'Duration', value: `${duration} minutes`, inline: true },
        { name: 'Moderator', value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logToChannel(message.guild, embed);
  } catch (error) {
    console.error(error);
    message.reply('Failed to mute member.');
  }
}

async function handleWarn(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply('You need permission to warn members.');
  }

  const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
  if (!target) return message.reply('Please specify a user to warn.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await logModeration(message.guild.id, 'warn', message.author.id, target.id, reason);

    const dmEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('Warning Received')
      .addFields(
        { name: 'Server', value: message.guild.name },
        { name: 'Reason', value: reason }
      );

    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('Member Warned')
      .addFields(
        { name: 'User', value: `<@${target.id}>`, inline: true },
        { name: 'Moderator', value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logToChannel(message.guild, embed);
  } catch (error) {
    console.error(error);
    message.reply('Failed to warn member.');
  }
}

async function handleUnban(message, args) {
  if (!message.member.permissions.has('BanMembers')) {
    return message.reply('You need permission to unban members.');
  }

  const userId = args[0];
  if (!userId) return message.reply('Please specify a user ID to unban.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await message.guild.bans.remove(userId, reason);
    await logModeration(message.guild.id, 'unban', message.author.id, userId, reason);

    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('Member Unbanned')
      .addFields(
        { name: 'User ID', value: userId, inline: true },
        { name: 'Moderator', value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logToChannel(message.guild, embed);
  } catch (error) {
    console.error(error);
    message.reply('Failed to unban member.');
  }
}

async function handleUnmute(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply('You need permission to unmute members.');
  }

  const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
  if (!target) return message.reply('Please specify a user to unmute.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  try {
    await target.timeout(null, reason);
    await logModeration(message.guild.id, 'unmute', message.author.id, target.id, reason);

    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('Member Unmuted')
      .addFields(
        { name: 'User', value: `<@${target.id}>`, inline: true },
        { name: 'Moderator', value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logToChannel(message.guild, embed);
  } catch (error) {
    console.error(error);
    message.reply('Failed to unmute member.');
  }
}

async function setupTicketPanel(message) {
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('You need administrator permission to set up ticket panels.');
  }

  const panelEmbed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Support Tickets')
    .setDescription('Click the button below to open a support ticket. Our team will respond as soon as possible.')
    .setThumbnail('https://images.pexels.com/photos/3407256/pexels-photo-3407256.jpeg?auto=compress&cs=tinysrgb&w=400');

  const ticketButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Open Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  try {
    const panelMessage = await message.channel.send({
      embeds: [panelEmbed],
      components: [ticketButton],
    });

    const { error } = await supabase.from('ticket_panels').upsert({
      guild_id: message.guild.id,
      message_id: panelMessage.id,
      channel_id: message.channel.id,
      title: 'Support Tickets',
      description: 'Click the button below to open a support ticket. Our team will respond as soon as possible.',
      button_label: 'Open Ticket',
    });

    if (error) throw error;

    const confirmEmbed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('Ticket Panel Created')
      .setDescription(`Ticket panel announced in <#${message.channel.id}>`)
      .setTimestamp();

    message.reply({ embeds: [confirmEmbed] });
  } catch (error) {
    console.error(error);
    message.reply('Failed to create ticket panel.');
  }
}

async function showModLogs(message, args) {
  if (!message.member.permissions.has('ModerateMembers')) {
    return message.reply('You need permission to view moderation logs.');
  }

  try {
    const { data: logs, error } = await supabase
      .from('moderation_logs')
      .select('*')
      .eq('guild_id', message.guild.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!logs || logs.length === 0) {
      return message.reply('No moderation logs found.');
    }

    const logsEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Recent Moderation Logs')
      .setDescription(
        logs
          .map(
            (log, i) =>
              `**${i + 1}.** \`${log.action.toUpperCase()}\` - <@${log.target_user_id}>\n` +
              `By: <@${log.moderator_id}> | Reason: ${log.reason || 'No reason'}`
          )
          .join('\n\n')
      )
      .setTimestamp();

    message.reply({ embeds: [logsEmbed] });
  } catch (error) {
    console.error(error);
    message.reply('Failed to fetch moderation logs.');
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('Create Support Ticket');

    const subjectInput = new TextInputBuilder()
      .setCustomId('ticket_subject')
      .setLabel('Ticket Subject')
      .setPlaceholder('Brief description of your issue')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('ticket_description')
      .setLabel('Detailed Description')
      .setPlaceholder('Provide more details about your issue')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(subjectInput),
      new ActionRowBuilder().addComponents(descriptionInput)
    );

    await interaction.showModal(modal);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === 'ticket_modal') {
    const subject = interaction.fields.getTextInputValue('ticket_subject');
    const description = interaction.fields.getTextInputValue('ticket_description');

    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          guild_id: interaction.guild.id,
          channel_id: interaction.channel.id,
          creator_id: interaction.user.id,
          subject,
          status: 'open',
        })
        .select('ticket_number')
        .single();

      if (ticketError) throw ticketError;

      const ticketNumber = ticketData.ticket_number;
      const ticketChannelName = `ticket-${ticketNumber}`;

      const ticketChannel = await interaction.guild.channels.create({
        name: ticketChannelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ['ViewChannel'],
          },
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Support Ticket #${ticketNumber}`)
        .addFields(
          { name: 'Creator', value: `<@${interaction.user.id}>` },
          { name: 'Subject', value: subject },
          { name: 'Description', value: description },
          { name: 'Status', value: 'Open' }
        )
        .setTimestamp();

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_ticket_${ticketNumber}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });

      await interaction.reply({
        content: `Your ticket has been created! <#${ticketChannel.id}>`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'Failed to create ticket.',
        ephemeral: true,
      });
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('close_ticket_')) {
    const ticketNumber = interaction.customId.split('_')[2];

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'closed', closed_at: new Date() })
        .eq('ticket_number', parseInt(ticketNumber));

      if (error) throw error;

      await interaction.reply({
        content: 'Ticket has been closed. This channel will be deleted shortly.',
        ephemeral: true,
      });

      setTimeout(() => {
        interaction.channel.delete();
      }, 3000);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'Failed to close ticket.',
        ephemeral: true,
      });
    }
  }
});

async function logModeration(guildId, action, moderatorId, targetUserId, reason, duration = null) {
  try {
    await supabase.from('moderation_logs').insert({
      guild_id: guildId,
      action,
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      reason,
      duration,
    });
  } catch (error) {
    console.error('Failed to log moderation action:', error);
  }
}

async function logToChannel(guild, embed) {
  try {
    const modLogChannel = guild.channels.cache.find(
      (ch) => ch.name === 'mod-logs' && ch.isTextBased()
    );
    if (modLogChannel) {
      await modLogChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Failed to log to channel:', error);
  }
}

client.login(process.env.DISCORD_TOKEN);
 facf94c23d6b8e35add4f91dbf1795748987afdf
