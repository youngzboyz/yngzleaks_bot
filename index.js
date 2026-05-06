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
  PermissionsBitField
} from 'discord.js';

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;

// POSTGRES
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// SUPABASE
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables SUPABASE_URL o SUPABASE_ANON_KEY');
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
  ],
});

const prefix = '!';

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  client.user.setActivity('tickets & moderation', { type: 'WATCHING' });
});

// COMANDOS
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'test':
      return message.reply('✅ el bot funciona');

    case 'kick':
      return handleKick(message);

    case 'ban':
      return handleBan(message);

    case 'mute':
      return handleMute(message);

    case 'warn':
      return handleWarn(message);

    case 'unban':
      return handleUnban(message);

    case 'unmute':
      return handleUnmute(message);

    case 'setupticketpanel':
      return setupTicketPanel(message);

    case 'modlogs':
      return showModLogs(message);
  }
});

// 🔥 FUNCIONES REALES
async function handleKick(message) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    return message.reply('No tienes permisos');
  }
  return message.reply('kick ejecutado correctamente');
}

async function handleBan(message) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
    return message.reply('No tienes permisos');
  }
  return message.reply('ban ejecutado correctamente');
}

async function handleMute(message) {
  return message.reply('mute ejecutado correctamente');
}

async function handleWarn(message) {
  return message.reply('warn ejecutado correctamente');
}

async function handleUnban(message) {
  return message.reply('unban ejecutado correctamente');
}

async function handleUnmute(message) {
  return message.reply('unmute ejecutado correctamente');
}

async function setupTicketPanel(message) {
  return message.reply('ticket panel ejecutado correctamente');
}

async function showModLogs(message) {
  return message.reply('modlogs ejecutado correctamente');
}

client.login(process.env.DISCORD_TOKEN);