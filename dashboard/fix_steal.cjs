const fs = require('fs');
const path = 'C:/Users/ldlsl/OneDrive/Documentos/discord bot/index.js';
let c = fs.readFileSync(path, 'utf8');

const start = c.indexOf('async function handleStealEmojis');
const end = c.indexOf('// BUTTON HANDLER', start);
const oldFunc = c.substring(start, end);

const newFunc = [
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
'    let reply = \u2705 Se anadieron  emoji(s) al servidor.;',
'    if (errors > 0) reply += \n\u274c  emoji(s) fallaron (limite alcanzado o sin permisos).;',
'    await interaction.editReply(reply);',
'  } catch (e) {',
'    console.error("Error in stealemojis:", e);',
'    await interaction.editReply("*Error al procesar emojis.*");',
'  }',
'}'
].join(String.fromCharCode(13,10));

c = c.replace(oldFunc, newFunc);
fs.writeFileSync(path, c);
console.log('OK - handleStealEmojis fixed');
