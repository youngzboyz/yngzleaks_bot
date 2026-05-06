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