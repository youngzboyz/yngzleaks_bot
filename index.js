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
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;

// 🔥 POSTGRES (RAILWAY)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🔥 SUPABASE
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// BOT
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

  if (command === 'kick') return handleKick(message, args);
  if (command === 'ban') return handleBan(message, args);
  if (command === 'mute') return handleMute(message, args);
  if (command === 'warn') return handleWarn(message, args);
  if (command === 'unban') return handleUnban(message, args);
  if (command === 'unmute') return handleUnmute(message, args);
  if (command === 'setupticketpanel') return setupTicketPanel(message);
  if (command === 'modlogs') return showModLogs(message, args);
});

// (👉 aquí dejas tus funciones tal cual las tienes, no están rotas en lo que enviaste)

client.login(process.env.DISCORD_TOKEN);