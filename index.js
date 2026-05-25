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

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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

const softBannedUsers = new Collection();
const appealChannels = new Collection();
const pendingBans = new Collection();
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to send the announcement').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('Title of the announcement').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('Announcement message').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('Color hex (e.g., #FF0000)').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('Image URL').setRequired(false)),
  new SlashCommandBuilder().setName('clear').setDescription('Delete messages').addIntegerOption(o => o.setName('amount').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName('setupticket').setDescription('Setup ticket panel'),
  new SlashCommandBuilder().setName('tickets').setDescription('Show active tickets'),
  new SlashCommandBuilder().setName('closeticket').setDescription('Close ticket').addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('info').setDescription('Server info'),
  new SlashCommandBuilder().setName('stealemojis').setDescription('Steal emojis').addStringOption(o => o.setName('emojis').setDescription('Emojis to steal').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder().setName('closeappeal').setDescription('Close an appeal channel').addStringOption(o => o.setName('channelid').setDescription('Channel ID').setRequired(false)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  try {
    const existingCommands = await rest.get(Routes.applicationCommands(client.user.id));
    const toDeleteNames = ['anuncio', 'setup_tickets'];
    const toDelete = existingCommands.filter(cmd => {
      if (toDeleteNames.includes(cmd.name)) return true;
      const filtered = existingCommands.filter(c => c.name === cmd.name);
      if (filtered.length > 1) return filtered.indexOf(cmd) !== 0;
      return false;
    });
    for (const cmd of toDelete) {
      await rest.delete(Routes.applicationCommands(client.user.id) + '/' + cmd.id);
    }
    if (toDelete.length > 0) console.log('Deleted ' + toDelete.length + ' old commands.');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Commands registered!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

function hasAdminPermission(member) {
  if (!member || !member.permissions) return false;

  try {
    if (typeof member.permissions.has === 'function') {
      return member.permissions.has(PermissionsBitField.Flags.Administrator);
    }

    return new PermissionsBitField(BigInt(member.permissions)).has(PermissionsBitField.Flags.Administrator);
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

function successMessage(text) {
  return `*:verificado1: ${text} applied correctly*`;
}

async function getBotOwnerId() {
  if (BOT_OWNER_ID) return BOT_OWNER_ID;
  try {
    const app = await client.application.fetch();
    return app.owner?.id || null;
  } catch { return null; }
}

async function applySoftBan(guild, userId, excludedChannelIds = []) {
  const channels = await guild.channels.fetch();
  const modifiedChannels = [];
  const excluded = new Set(excludedChannelIds);
  for (const channel of channels.values()) {
    if (channel.type === ChannelType.GuildCategory || channel.type === ChannelType.GuildVoice) continue;
    if (excluded.has(channel.id)) continue;
    try {
      const existingOverwrite = channel.permissionOverwrites.cache.get(userId);
      let originalOverwrite = null;
      if (existingOverwrite) {
        originalOverwrite = { allow: existingOverwrite.allow.bitfield.toString(), deny: existingOverwrite.deny.bitfield.toString() };
      }
      await channel.permissionOverwrites.create(userId, { ViewChannel: false });
      modifiedChannels.push({ channelId: channel.id, hadOverwrite: !!existingOverwrite, originalOverwrite });
    } catch (err) {}
  }
  return modifiedChannels;
}

async function removeSoftBan(guild, userId, channelList) {
  for (const entry of channelList) {
    try {
      const channel = guild.channels.cache.get(entry.channelId);
      if (!channel) continue;
      if (entry.hadOverwrite && entry.originalOverwrite) {
        await channel.permissionOverwrites.create(userId, {
          allow: BigInt(entry.originalOverwrite.allow || '0'),
          deny: BigInt(entry.originalOverwrite.deny || '0'),
        });
      } else {
        const overwrite = channel.permissionOverwrites.cache.get(userId);
        if (overwrite) {
          if (overwrite.deny.bitfield === PermissionsBitField.Flags.ViewChannel) {
            await overwrite.delete();
          } else {
            await channel.permissionOverwrites.edit(userId, { ViewChannel: null });
          }
        }
      }
    } catch (err) {}
  }
}

async function persistSoftBan(guildId, userId, moderatorId, reason, channels) {
  try {
    await supabase.from('soft_bans').upsert({
      guild_id: guildId,
      target_user_id: userId,
      moderator_id: moderatorId,
      reason,
      channel_snapshot: channels,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guild_id,target_user_id' });
  } catch (error) {
    console.error('Could not persist soft ban:', error);
  }
}

async function deleteSoftBanRecord(guildId, userId) {
  try {
    await supabase.from('soft_bans').delete().eq('guild_id', guildId).eq('target_user_id', userId);
  } catch (error) {
    console.error('Could not delete soft ban record:', error);
  }
}

async function persistAppealChannel(guildId, userId, channelId) {
  try {
    await supabase.from('appeal_channels').upsert({
      guild_id: guildId,
      target_user_id: userId,
      channel_id: channelId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guild_id,target_user_id' });
  } catch (error) {
    console.error('Could not persist appeal channel:', error);
  }
}

async function deleteAppealChannelRecord(guildId, userId) {
  try {
    await supabase.from('appeal_channels').delete().eq('guild_id', guildId).eq('target_user_id', userId);
  } catch (error) {
    console.error('Could not delete appeal channel record:', error);
  }
}

async function getSoftBanInfo(userId) {
  const memoryBan = softBannedUsers.get(userId);
  if (memoryBan) return memoryBan;

  try {
    const { data: bans } = await supabase
      .from('soft_bans')
      .select('*')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (bans && bans.length > 0) {
      const ban = bans[0];
      return {
        guildId: ban.guild_id,
        guildName: 'the server',
        reason: ban.reason || 'No reason provided',
        moderatorId: ban.moderator_id,
        moderatorTag: 'a moderator',
        bannedAt: ban.created_at,
        channels: ban.channel_snapshot || [],
      };
    }
  } catch (error) {
    console.error('Could not load soft ban record:', error);
  }

  try {
    const { data: banLogs } = await supabase
      .from('moderation_logs').select('*').eq('target_user_id', userId).eq('action', 'ban')
      .order('created_at', { ascending: false }).limit(1);
    if (banLogs && banLogs.length > 0 && banLogs[0].reason?.startsWith('[SOFTBAN]')) {
      return {
        guildId: banLogs[0].guild_id,
        guildName: 'the server',
        reason: banLogs[0].reason.replace('[SOFTBAN] ', ''),
        moderatorId: banLogs[0].moderator_id,
        moderatorTag: 'a moderator',
      };
    }
  } catch (error) {
    console.error('Could not load moderation log:', error);
  }

  return null;
}

async function getExistingAppealChannel(guild, userId) {
  const memoryChannelId = appealChannels.get(userId);
  if (memoryChannelId) {
    const channel = guild.channels.cache.get(memoryChannelId);
    if (channel) return channel;
    appealChannels.delete(userId);
  }

  try {
    const { data: rows } = await supabase
      .from('appeal_channels')
      .select('*')
      .eq('guild_id', guild.id)
      .eq('target_user_id', userId)
      .limit(1);

    if (rows && rows.length > 0) {
      const channel = guild.channels.cache.get(rows[0].channel_id) || await guild.channels.fetch(rows[0].channel_id).catch(() => null);
      if (channel) {
        appealChannels.set(userId, channel.id);
        return channel;
      }
    }
  } catch (error) {
    console.error('Could not load appeal channel:', error);
  }

  return null;
}

async function ensureAppealChannel(guild, user, banInfo, initialMessage = null) {
  const existingChannel = await getExistingAppealChannel(guild, user.id);
  if (existingChannel) return existingChannel;

  let appealCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('appeals'));
  if (!appealCategory) {
    appealCategory = await guild.channels.create({
      name: 'BAN APPEALS',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }],
    });
  }

  const safeName = user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20) || user.id;
  const appealChannel = await guild.channels.create({
    name: `appeal-${safeName}`,
    type: ChannelType.GuildText,
    parent: appealCategory.id,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
    ],
  });

  guild.members.cache.forEach(member => {
    if (hasAdminPermission(member) && !member.user.bot) {
      appealChannel.permissionOverwrites.create(member.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
    }
  });

  appealChannels.set(user.id, appealChannel.id);
  await persistAppealChannel(guild.id, user.id, appealChannel.id);

  const appealHeaderEmbed = new EmbedBuilder().setColor(0xFFA500).setTitle('New Ban Appeal')
    .setDescription(`**User:** ${user.tag} (${user.id})\n**Original Reason:** ${banInfo.reason}\n**Banned by:** ${banInfo.moderatorTag}\n**Status:** Soft-banned\n\n${initialMessage ? `**Appeal Message:**\n${initialMessage}\n\n` : '**Appeal Message:** Waiting for the user to write here or DM the bot.\n\n'}**Instructions:**\nMessages from the user appear in this channel.\nStaff can answer here. Use \`!unbanappeal ${user.id}\` to restore access, or close this appeal.`)
    .setTimestamp();

  const closeButton = new ButtonBuilder().setCustomId(`close_appeal_${user.id}`).setLabel('Close Appeal').setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(closeButton);

  await appealChannel.send({ content: `New appeal channel for ${user}`, embeds: [appealHeaderEmbed], components: [row] });
  return appealChannel;
}

// Main message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // DM from soft-banned user
  if (message.channel.type === ChannelType.DM) return handleAppealMessage(message);

  // Messages in appeal channels - forward to banned user
  let appealUserId = null;
  for (const [userId, chId] of appealChannels) {
    if (chId === message.channel.id) { appealUserId = userId; break; }
  }
  if (appealUserId) {
    if (message.author.id === appealUserId) return;
    if (message.content.startsWith('!') || message.content.startsWith('/')) return;
    try {
      const bannedUser = await client.users.fetch(appealUserId);
      if (bannedUser) {
        await bannedUser.send(`**${message.member?.displayName || message.author.username}:** ${message.content}`);
        await message.react('✅');
      }
    } catch (error) {
      await message.reply('*Could not forward by DM. The user can still read this appeal channel.*');
    }
    return;
  }

  // !ban command
  if (!message.content.startsWith('!ban')) return;
  if (!hasAdminPermission(message.member)) return message.reply('*Admin only*');

  const args = message.content.split(' ').slice(1);
  const user = message.mentions.users.first();
  const reason = args.slice(1).join(' ') || 'No reason provided';

  if (!user) return message.reply('*Example: `!ban @user reason`*');
  if (user.id === message.author.id) return message.reply('*You cannot ban yourself*');

  try {
    const member = await message.guild.members.fetch(user.id);
    if (!member) return message.reply('*User not in server*');

    pendingBans.set(message.author.id, { user, member, guild: message.guild, reason, channel: message.channel });

    const confirmEmbed = new EmbedBuilder()
      .setColor(RED_COLOR).setTitle('⚖️ Ban Confirmation')
      .setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n\nChoose the type of ban:`)
      .setTimestamp();

    const softBanButton = new ButtonBuilder().setCustomId(`ban_soft_${message.author.id}`).setLabel('🔇 Soft Ban (with appeal)').setStyle(ButtonStyle.Success);
    const hardBanButton = new ButtonBuilder().setCustomId(`ban_hard_${message.author.id}`).setLabel('🔨 Hard Ban (no appeal)').setStyle(ButtonStyle.Danger);
    const cancelButton = new ButtonBuilder().setCustomId(`ban_cancel_${message.author.id}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(softBanButton, hardBanButton, cancelButton);

    await message.reply({ embeds: [confirmEmbed], components: [row] });
  } catch (error) {
    message.reply('*Failed to process ban*');
  }
});

// !unbanappeal command
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!unbanappeal')) return;
  if (!hasAdminPermission(message.member)) return message.reply('*Admin only*');

  const args = message.content.split(' ').slice(1);
  let userId = null;
  if (message.mentions.users.size > 0) {
    userId = message.mentions.users.first().id;
  } else if (args[0]) {
    const possibleId = args[0].replace(/[^0-9]/g, '');
    if (possibleId.length >= 15 && possibleId.length <= 20) userId = possibleId;
  }
  if (!userId) return message.reply('*Provide user ID or mention*');

  let user;
  try { user = await client.users.fetch(userId); } catch (e) { return message.reply(`*User ${userId} not found*`); }

  let banInfo = await getSoftBanInfo(userId);
  let restoredCount = 0;

  if (!banInfo || !banInfo.channels?.length) {
    try {
      const guild = message.guild;
      const channels = await guild.channels.fetch();
      let foundAny = false;
      for (const channel of channels.values()) {
        if (channel.type === ChannelType.GuildCategory || channel.type === ChannelType.GuildVoice) continue;
        const overwrite = channel.permissionOverwrites.cache.get(userId);
        if (overwrite && overwrite.deny.has(PermissionsBitField.Flags.ViewChannel, false)) {
          foundAny = true;
          await overwrite.delete();
          restoredCount++;
        }
      }
      if (!foundAny && !banInfo) return message.reply(`*${user.tag} does not have restricted access*`);
    } catch (err) { return message.reply('*Failed to scan channels*'); }
  } else {
    try {
      if (banInfo.channels && banInfo.channels.length > 0) await removeSoftBan(message.guild, userId, banInfo.channels);
      restoredCount = banInfo.channels?.length || 0;
    } catch (err) {}
  }

  try {
    softBannedUsers.delete(userId);
    appealChannels.delete(userId);
    await deleteSoftBanRecord(message.guild.id, userId);
    await deleteAppealChannelRecord(message.guild.id, userId);
    try {
      await user.send({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('✅ Access Restored')
        .setDescription(`**Server:** ${message.guild.name}\nYour access has been restored by ${message.author.tag}\n\nYou can now see all channels again.`).setTimestamp()] });
    } catch (e) {}

    await message.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('✅ Access Restored')
      .setDescription(`**User:** ${user.tag} (${userId})\n**Restored by:** ${message.author.tag}\n**Restored:** ${restoredCount} channels\n\nAll permissions restored.`).setTimestamp()] });

    await supabase.from('moderation_logs').insert({
      guild_id: message.guild.id, action: 'unban', moderator_id: message.author.id, target_user_id: userId, reason: 'Appeal accepted'
    });
  } catch (error) { message.reply('*Failed to restore*'); }
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  const commandName = interaction.commandName || interaction.customId || 'unknown';

  try {
  if (!interaction.isChatInputCommand()) {
    if (interaction.isButton()) return handleButtonInteraction(interaction);
    if (interaction.isModalSubmit()) return handleModalSubmit(interaction);
    return;
  }

  if (!interaction.inGuild()) {
    return interaction.reply({ content: '*This command can only be used in a server*', ephemeral: true });
  }

  if (!hasAdminPermission(interaction.member)) return interaction.reply({ content: '*Admin only*', ephemeral: true });
  if (maintenanceMode) return interaction.reply({ content: '*🟡 Maintenance mode*', ephemeral: true });

    switch (commandName) {
      case 'announce': await handleAnnounce(interaction); break;
      case 'clear': await handleClear(interaction); break;
      case 'setupticket': await handleSetupTicket(interaction); break;
      case 'tickets': await handleTickets(interaction); break;
      case 'closeticket': await handleCloseTicket(interaction); break;
      case 'info': await handleInfo(interaction); break;
      case 'stealemojis': await handleStealEmojis(interaction); break;
      case 'warn': await handleWarn(interaction); break;
      case 'closeappeal': await handleCloseAppeal(interaction); break;
      default: await interaction.reply({ content: '*Unknown command*', ephemeral: true }); break;
    }
  } catch (error) {
    console.error(`Error ${commandName}:`, error);
    const msg = { content: '*Error*', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
    else await interaction.reply(msg);
  }
});

// ====== DM HANDLER: Banned user messages ======
async function handleAppealMessage(message) {
  const banInfo = await getSoftBanInfo(message.author.id);

  if (!banInfo) {
    return message.author.send({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('Bot Support')
      .setDescription('This bot handles support and moderation.\n\nIf you were restricted and want to appeal, ensure this bot issued it.').setTimestamp()] });
  }

  const guild = client.guilds.cache.get(banInfo.guildId);
  if (!guild) return message.author.send({ content: '*Error processing appeal*' });

  try {
    const appealChannel = await ensureAppealChannel(guild, message.author, banInfo, message.content);
    await appealChannel.send(`**${message.author.username}:** ${message.content}`);
    await message.react('\u2705');

    await message.author.send({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('Appeal Submitted')
      .setDescription('Your appeal has been sent.\n\n**Keep sending messages here** and they will be reviewed.\n\nPlease be patient.').setTimestamp()] });
  } catch (error) {
    console.error('Error creating appeal channel:', error);
    await message.author.send({ content: '*Error creating appeal*' });
  }
}

// ====== BUTTON HANDLER ======
async function handleButtonInteraction(interaction) {
  const { customId } = interaction;

  // Soft ban
  if (customId.startsWith('ban_soft_')) {
    const modId = customId.replace('ban_soft_', '');
    const pending = pendingBans.get(modId);
    if (!pending) return interaction.reply({ content: '*Expired*', ephemeral: true });
    if (interaction.user.id !== modId) return interaction.reply({ content: '*Not your ban*', ephemeral: true });

    await interaction.deferReply();
    pendingBans.delete(modId);

    try {
      const banInfo = { guildId: pending.guild.id, guildName: pending.guild.name, reason: pending.reason, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, bannedAt: new Date().toISOString(), channels: [] };
      const appealChannel = await ensureAppealChannel(pending.guild, pending.user, banInfo);
      let dmSent = false;

      try {
        const appealEmbed = new EmbedBuilder().setColor(RED_COLOR).setTitle('You have been restricted')
          .setDescription(`**Server:** ${pending.guild.name}\n**Reason:** ${pending.reason}\n**Moderator:** ${interaction.user.tag}\n\n**You can appeal!**\n\nYou can write in ${appealChannel} or send a DM to this bot. Your messages will be reviewed by staff.`)
          .setImage(GIF_URL).setTimestamp();
        await pending.user.send({ embeds: [appealEmbed] });
        dmSent = true;
      } catch (e) {}

      await appealChannel.send({ content: `${pending.user}, you can appeal here. Staff can read and reply in this channel.` }).catch(() => {});

      const modifiedChannels = await applySoftBan(pending.guild, pending.user.id, [appealChannel.id]);
      banInfo.channels = modifiedChannels;
      softBannedUsers.set(pending.user.id, banInfo);
      await persistSoftBan(pending.guild.id, pending.user.id, interaction.user.id, pending.reason, modifiedChannels);

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('User Soft-Banned')
        .setDescription(`**User:** ${pending.user.tag}\n**Reason:** ${pending.reason}\n**Moderator:** ${interaction.user.tag}\n**Channels hidden:** ${modifiedChannels.length}\n**Appeal channel:** ${appealChannel}\n**DM sent:** ${dmSent ? 'Yes' : 'No - user probably has DMs closed'}\n\nUse \`!unbanappeal ${pending.user.id}\` to restore`)
        .setImage(GIF_URL).setTimestamp()], components: [] });

      await supabase.from('moderation_logs').insert({ guild_id: pending.guild.id, action: 'ban', moderator_id: interaction.user.id, target_user_id: pending.user.id, reason: `[SOFTBAN] ${pending.reason}` });
    } catch (error) {
      console.error('Soft ban failed:', error);
      await interaction.editReply({ content: '*Failed*', components: [] });
    }
    return;
  }

  // Hard ban
  if (customId.startsWith('ban_hard_')) {
    const modId = customId.replace('ban_hard_', '');
    const pending = pendingBans.get(modId);
    if (!pending) return interaction.reply({ content: '*Expired*', ephemeral: true });
    if (interaction.user.id !== modId) return interaction.reply({ content: '*Not your ban*', ephemeral: true });

    await interaction.deferReply();
    pendingBans.delete(modId);

    try {
      let dmSent = false;
      try {
        await pending.user.send({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('🔨 You have been banned')
          .setDescription(`**Server:** ${pending.guild.name}\n**Reason:** ${pending.reason}\n**Moderator:** ${interaction.user.tag}`).setImage(GIF_URL).setTimestamp()] });
        dmSent = true;
      } catch (e) {}

      await pending.member.ban({ reason: pending.reason });
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('User Banned')
        .setDescription(`**User:** ${pending.user.tag}\n**Reason:** ${pending.reason}\n**Moderator:** ${interaction.user.tag}${dmSent ? '' : '\n⚠️ Could not DM user'}`)
        .setImage(GIF_URL).setTimestamp()], components: [] });

      await supabase.from('moderation_logs').insert({ guild_id: pending.guild.id, action: 'ban', moderator_id: interaction.user.id, target_user_id: pending.user.id, reason: pending.reason });
    } catch (error) {
      await interaction.editReply({ content: '*Failed*', components: [] });
    }
    return;
  }

  // Cancel ban
  if (customId.startsWith('ban_cancel_')) {
    const modId = customId.replace('ban_cancel_', '');
    if (interaction.user.id !== modId) return interaction.reply({ content: '*Not your ban*', ephemeral: true });
    pendingBans.delete(modId);
    await interaction.update({ content: '*Cancelled*', embeds: [], components: [] });
    return;
  }

  // Create ticket
  if (customId === 'create_ticket') {
    const { data: existingTickets } = await supabase.from('tickets').select('*').eq('guild_id', interaction.guild.id).eq('creator_id', interaction.user.id).eq('status', 'open');
    if (existingTickets && existingTickets.length > 0) return interaction.reply({ content: '*You already have an open ticket*', ephemeral: true });

    const modal = new ModalBuilder().setCustomId('ticket_modal').setTitle('Create New Ticket');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_subject').setLabel('Subject').setStyle(TextInputStyle.Short).setPlaceholder('e.g., Server issue').setRequired(true).setMaxLength(100)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setPlaceholder('Describe your issue...').setRequired(true).setMaxLength(1000))
    );
    await interaction.showModal(modal);
  }

  // Close appeal
  if (customId.startsWith('close_appeal_')) {
    const userId = customId.replace('close_appeal_', '');
    await interaction.deferReply();
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('🔒 Appeal Closed').setDescription(`Closed by ${interaction.user.tag}`).setTimestamp()] });
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
        appealChannels.delete(userId);
        await deleteAppealChannelRecord(interaction.guild.id, userId);
      } catch (e) {}
    }, 5000);
  }

  // Claim ticket
  if (customId === 'claim_ticket') {
    if (!hasAdminPermission(interaction.member)) return interaction.reply({ content: '*Staff only*', ephemeral: true });
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(RED_COLOR)
      .setDescription(interaction.message.embeds[0].description.replace('**Status:** 🟢 Open', `**Status:** 🟡 In Progress\n**Claimed by:** ${interaction.user}`));
    await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
    await interaction.channel.send(successMessage(`${interaction.user} claimed this ticket`));
  }

  // Close ticket button
  if (customId === 'close_ticket_btn') {
    if (!hasAdminPermission(interaction.member)) return interaction.reply({ content: '*Staff only*', ephemeral: true });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('⚠️ Confirm').setDescription('Close this ticket?\nChannel will be deleted in 10 seconds.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_close').setLabel('✅ Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_close').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
      )], ephemeral: true
    });
  }

  // Confirm close
  if (customId === 'confirm_close') {
    await interaction.deferReply();
    try {
      await supabase.from('tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('channel_id', interaction.channel.id);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('🔒 Ticket Closed').setDescription(`Closed by ${interaction.user.tag}`).setTimestamp()] });
      setTimeout(async () => { try { await interaction.channel.delete(); } catch (e) {} }, 5000);
    } catch (e) { await interaction.editReply({ content: '*Failed*' }); }
  }

  // Cancel close
  if (customId === 'cancel_close') {
    await interaction.update({ content: '*Cancelled*', embeds: [], components: [] });
  }
}

// ====== MODAL HANDLER ======
async function handleModalSubmit(interaction) {
  if (interaction.customId !== 'ticket_modal') return;
  await interaction.deferReply({ ephemeral: true });

  const subject = interaction.fields.getTextInputValue('ticket_subject');
  const description = interaction.fields.getTextInputValue('ticket_description');

  try {
    const { data: lastTicket } = await supabase.from('tickets').select('ticket_number').order('ticket_number', { ascending: false }).limit(1);
    const ticketNumber = lastTicket && lastTicket.length > 0 ? lastTicket[0].ticket_number + 1 : 1;

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${String(ticketNumber).padStart(4, '0')}-${interaction.user.username}`, type: ChannelType.GuildText, parent: interaction.channel.parent,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
      ],
    });

    await supabase.from('tickets').insert({ ticket_number: ticketNumber, guild_id: interaction.guild.id, channel_id: ticketChannel.id, creator_id: interaction.user.id, status: 'open', subject });

    const ticketEmbed = new EmbedBuilder().setColor(RED_COLOR).setTitle(`🎫 Ticket #${String(ticketNumber).padStart(4, '0')}`)
      .setDescription(`**Subject:** ${subject}\n\n**Description:**\n${description}\n\n**Status:** 🟢 Open\n**Created by:** ${interaction.user}\n**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`)
      .setImage(GIF_URL).setFooter({ text: 'A staff member will assist you soon' }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('👤 Claim').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `${interaction.user} | Welcome to your support ticket.`, embeds: [ticketEmbed], components: [row] });
    await interaction.editReply({ content: successMessage(`Ticket created: ${ticketChannel}`), ephemeral: true });

    const staffRoles = interaction.guild.roles.cache.filter(r => r.permissions.has(PermissionsBitField.Flags.Administrator));
    if (staffRoles.size > 0) await ticketChannel.send(`📢 ${staffRoles.map(r => r.toString()).join(' ')} - New ticket created`);
  } catch (error) {
    await interaction.editReply({ content: '*Failed*' });
  }
}

// ====== CLOSE APPEAL ======
async function handleCloseAppeal(interaction) {
  const channelId = interaction.options.getString('channelid') || interaction.channel.id;
  await interaction.deferReply();
  let targetUserId = null;
  for (const [userId, chId] of appealChannels) { if (chId === channelId) { targetUserId = userId; break; } }
  await interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('🔒 Appeal Closed').setDescription(`Closed by ${interaction.user.tag}`).setTimestamp()] });
  setTimeout(async () => {
    try {
      const ch = interaction.guild.channels.cache.get(channelId);
      if (ch) await ch.delete();
      if (targetUserId) {
        appealChannels.delete(targetUserId);
        await deleteAppealChannelRecord(interaction.guild.id, targetUserId);
      }
    } catch (e) {}
  }, 5000);
}

// ====== WARN ======
async function handleWarn(interaction) {
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  await interaction.deferReply({ ephemeral: true });
  try {
    await supabase.from('moderation_logs').insert({ guild_id: interaction.guild.id, action: 'warn', moderator_id: interaction.user.id, target_user_id: targetUser.id, reason });
    const { data: warns } = await supabase.from('moderation_logs').select('*').eq('guild_id', interaction.guild.id).eq('target_user_id', targetUser.id).eq('action', 'warn');
    const warnCount = warns ? warns.length : 1;

    await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('⚠️ User Warned')
      .setDescription(`**User:** ${targetUser.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}\n**Total Warnings:** ${warnCount}`).setTimestamp()] });

    try {
      await targetUser.send({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle('⚠️ You have been warned')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}\n\nPlease follow the rules.`).setTimestamp()] });
    } catch (e) {}

    await interaction.editReply({ content: successMessage(`Warn on ${targetUser.tag} (${warnCount} total)`) });
  } catch (e) { await interaction.editReply({ content: '*Failed*' }); }
}

// ====== ANNOUNCE ======
async function handleAnnounce(interaction) {
  const channel = interaction.options.getChannel('channel');
  const title = interaction.options.getString('title');
  const msg = interaction.options.getString('message');
  const colorStr = interaction.options.getString('color') || '#FF0000';
  const imageUrl = interaction.options.getString('image') || null;
  let color = 0xFF0000;
  try { if (colorStr.startsWith('#')) color = parseInt(colorStr.slice(1), 16); } catch (e) {}
  const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(msg).setFooter({ text: `Announced by ${interaction.user.tag}` }).setTimestamp();
  if (imageUrl) embed.setImage(imageUrl); else embed.setImage(GIF_URL);
  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: successMessage('Announcement'), ephemeral: true });
}

// ====== CLEAR ======
async function handleClear(interaction) {
  const amount = interaction.options.getInteger('amount');
  await interaction.deferReply({ ephemeral: true });
  try {
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    await interaction.channel.bulkDelete(messages, true);
    await interaction.editReply({ content: successMessage(`Cleared ${messages.size} messages`) });
  } catch (e) { await interaction.editReply({ content: '*Failed*' }); }
}

// ====== SETUP TICKET ======
async function handleSetupTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const embed = new EmbedBuilder().setColor(RED_COLOR).setTitle(':lion: YL Ticket System')
      .setDescription('Our support team will assist you as soon as possible.\n\nPlease describe your issue in detail.')
      .setImage(GIF_URL).setFooter({ text: 'Ticket System' }).setTimestamp();
    const button = new ButtonBuilder().setCustomId('create_ticket').setLabel('📩 Create Ticket').setStyle(ButtonStyle.Primary);
    const panelMessage = await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
    await supabase.from('ticket_panels').upsert({
      guild_id: interaction.guild.id, message_id: panelMessage.id, channel_id: interaction.channel.id,
      title: ':lion: YL Ticket System', description: 'Our support team will assist you as soon as possible. Please describe your issue in detail.',
      button_label: '📩 Create Ticket'
    }, { onConflict: 'guild_id' });
    await interaction.editReply({ content: successMessage('Ticket panel setup') });
  } catch (e) { await interaction.editReply({ content: '*Failed*' }); }
}

// ====== TICKETS ======
async function handleTickets(interaction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const { data: tickets } = await supabase.from('tickets').select('*').eq('guild_id', interaction.guild.id).eq('status', 'open').order('created_at', { ascending: false });
    if (!tickets || tickets.length === 0) return interaction.editReply({ content: '*No active tickets*' });
    const embed = new EmbedBuilder().setColor(RED_COLOR).setTitle('🎫 Active Tickets').setDescription(`Total: **${tickets.length}**\n\n`).setTimestamp();
    for (const ticket of tickets.slice(0, 10)) {
      const channel = interaction.guild.channels.cache.get(ticket.channel_id);
      embed.addFields({ name: `Ticket #${String(ticket.ticket_number).padStart(4, '0')}`, value: `**Subject:** ${ticket.subject}\n**Channel:** ${channel ? channel.toString() : 'Not found'}\n**Created:** <t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:R>`, inline: false });
    }
    if (tickets.length > 10) embed.setFooter({ text: `Showing 10 of ${tickets.length} tickets` });
    await interaction.editReply({ embeds: [embed] });
  } catch (e) { await interaction.editReply({ content: '*Failed*' }); }
}

// ====== CLOSE TICKET ======
async function handleCloseTicket(interaction) {
  const reason = interaction.options.getString('reason') || 'No reason provided';
  await interaction.deferReply();
  try {
    const { data: ticket } = await supabase.from('tickets').select('*').eq('channel_id', interaction.channel.id).eq('status', 'open').single();
    if (!ticket) return interaction.editReply({ content: '*Not a valid ticket channel*' });
    await supabase.from('tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', ticket.id);
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED_COLOR).setTitle('🔒 Ticket Closed').setDescription(`**Reason:** ${reason}\n**Closed by:** ${interaction.user.tag}`).setImage(GIF_URL).setTimestamp()] });
    setTimeout(async () => { try { await interaction.channel.delete(); } catch (e) {} }, 10000);
  } catch (e) { await interaction.editReply({ content: '*Failed*' }); }
}

// ====== INFO ======
async function handleInfo(interaction) {
  const guild = interaction.guild;
  const embed = new EmbedBuilder().setColor(RED_COLOR).setTitle(`📊 ${guild.name} Information`).setThumbnail(guild.iconURL())
    .addFields(
      { name: 'ID', value: guild.id, inline: true }, { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: 'Members', value: guild.memberCount.toString(), inline: true }, { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
      { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true }, { name: 'Boosts', value: guild.premiumSubscriptionCount.toString(), inline: true }
    ).setImage(GIF_URL).setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

// ====== STEAL EMOJIS ======
async function handleStealEmojis(interaction) {
  const emojisStr = interaction.options.getString('emojis');
  await interaction.deferReply({ ephemeral: true });
  try {
    const regex = /<(?<animated>a)?:(?<name>[a-zA-Z0-9_]+):(?<id>\d+)>/g;
    let match; let added = 0; let errors = 0;
    while ((match = regex.exec(emojisStr)) !== null) {
      const name = match.groups.name; const id = match.groups.id; const animated = match.groups.animated === 'a';
      const url = animated ? `https://cdn.discordapp.com/emojis/${id}.gif` : `https://cdn.discordapp.com/emojis/${id}.png`;
      try { await interaction.guild.emojis.create({ attachment: url, name }); added++; } catch (e) { errors++; }
    }
    if (added === 0 && errors === 0) return interaction.editReply('*No emojis found*');
    await interaction.editReply(`\u2705 Added ${added} emoji(s).${errors > 0 ? `\n\u274c ${errors} failed.` : ''}`);
  } catch (e) { await interaction.editReply('*Error*'); }
}

// ====== EXPRESS API ======
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
  let totalUsers = 0, totalChannels = 0;
  client.guilds.cache.forEach(g => { totalUsers += g.memberCount || 0; totalChannels += g.channels.cache.size || 0; });
  res.json({ online: true, maintenance: maintenanceMode, username: client.user.username, discriminator: client.user.discriminator, id: client.user.id, guilds: client.guilds.cache.size, users: totalUsers, channels: totalChannels, uptime: formatUptime(Date.now() - startTime), latency: client.ws.ping });
});

app.post('/api/shutdown', (req, res) => { if (!client.isReady()) return res.json({ success: false }); maintenanceMode = true; res.json({ success: true }); });
app.post('/api/restart', (req, res) => { maintenanceMode = false; res.json({ success: true }); });
app.post('/api/start', (req, res) => { maintenanceMode = false; res.json({ success: true }); });

app.post('/api/setname', async (req, res) => {
  const { name } = req.body;
  if (!name || !client.isReady()) return res.json({ success: false });
  try { await client.user.setUsername(name); res.json({ success: true }); } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/setdescription', async (req, res) => {
  const { description } = req.body;
  if (!description || !client.isReady()) return res.json({ success: false });
  try { await client.user.setActivity(description); res.json({ success: true }); } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/setavatar', async (req, res) => {
  const { avatar } = req.body;
  if (!avatar || !client.isReady()) return res.json({ success: false });
  try { await client.user.setAvatar(avatar); res.json({ success: true }); } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/ticketpanel', async (req, res) => {
  const { title, description, button_label } = req.body;
  if (!client.isReady()) return res.json({ success: false });
  try { await supabase.from('ticket_panels').upsert({ guild_id: 'dashboard', title, description, button_label }, { onConflict: 'guild_id' }); res.json({ success: true }); } catch (e) { res.json({ success: false, error: e.message }); }
});

function formatUptime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h ${m % 60}m` : h > 0 ? `${h}h ${m % 60}m ${s % 60}s` : m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

app.listen(API_PORT, () => console.log(`API on http://localhost:${API_PORT}`));
client.login(process.env.DISCORD_TOKEN);
