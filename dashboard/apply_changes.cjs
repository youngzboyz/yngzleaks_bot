const fs = require('fs');
const p = 'C:/Users/ldlsl/OneDrive/Documentos/discord bot/index.js';
let c = fs.readFileSync(p, 'utf8');

// Step 4: Replace handleAnnounce
const start = c.indexOf('async function handleAnnounce(interaction)');
const end = c.indexOf('// CLEAR COMMAND', start);
const oldFunc = c.substring(start, end);

const newFunc = [
"async function handleAnnounce(interaction) {",
'  const channel = interaction.options.getChannel("channel");',
'  const title = interaction.options.getString("title");',
'  const message = interaction.options.getString("message");',
'  const colorStr = interaction.options.getString("color") || "#FF0000";',
'  const imageUrl = interaction.options.getString("image") || null;',
'',
'  let color = 0xFF0000;',
'  try {',
'    if (colorStr.startsWith("#")) color = parseInt(colorStr.slice(1), 16);',
'    else if (!isNaN(parseInt(colorStr))) color = parseInt(colorStr);',
'  } catch (e) {}',
'',
'  const embed = new EmbedBuilder()',
'    .setColor(color)',
'    .setTitle(title)',
'    .setDescription(message)',
'    .setFooter({ text: Announced by  })',
'    .setTimestamp();',
'',
'  if (imageUrl) embed.setImage(imageUrl);',
'  else embed.setImage(GIF_URL);',
'',
'  await channel.send({ embeds: [embed] });',
'  await interaction.reply({ content: successMessage("Announcement"), ephemeral: true });',
'}'
].join(String.fromCharCode(13,10));

c = c.replace(oldFunc, newFunc);
console.log('Step 4 done: handleAnnounce updated');

// Step 5: Add handleStealEmojis before // BUTTON HANDLER
const btnIdx = c.indexOf('// BUTTON HANDLER');
const stealFn = [
'',
'',
'// STEAL EMOJIS COMMAND',
'async function handleStealEmojis(interaction) {',
'  const emojisStr = interaction.options.getString("emojis");',
'',
'  await interaction.deferReply({ ephemeral: true });',
'',
'  try {',
'    const emojiRegex = /<(?<animated>a)?:(?<name>[a-zA-Z0-9_]+):(?<id>\\d+)>/g;',
'    let match;',
'    let added = 0;',
'    let errors = 0;',
'',
'    while ((match = emojiRegex.exec(emojisStr)) !== null) {',
'      const name = match.groups.name;',
'      const id = match.groups.id;',
'      const animated = match.groups.animated === "a";',
'      const url = animated',
'        ? https://cdn.discordapp.com/emojis/.gif',
'        : https://cdn.discordapp.com/emojis/.png;',
'',
'      try {',
'        await interaction.guild.emojis.create({',
'          attachment: url,',
'          name: name',
'        });',
'        added++;',
'      } catch (e) {',
'        console.error(Error adding emoji : );',
'        errors++;',
'      }',
'    }',
'',
'    if (added === 0 && errors === 0) {',
'      return interaction.editReply("*No se encontraron emojis. Copia emojis de otro servidor y pegalos aqui.*");',
'    }',
'',
'    let reply = ✅ Se anadieron  emoji(s) al servidor.;',
'    if (errors > 0) reply += \\n❌  emoji(s) fallaron (limite alcanzado o sin permisos).;',
'    await interaction.editReply(reply);',
'  } catch (e) {',
'    console.error("Error in stealemojis:", e);',
'    await interaction.editReply("*Error al procesar emojis.*");',
'  }',
'}'
].join(String.fromCharCode(13,10));

c = c.substring(0, btnIdx) + stealFn + c.substring(btnIdx);

fs.writeFileSync(p, c);
console.log('Step 5 done: handleStealEmojis added');
console.log('All changes applied successfully!');
