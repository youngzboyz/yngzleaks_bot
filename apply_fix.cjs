const fs = require('fs');
const path = 'C:/Users/ldlsl/OneDrive/Documentos/discord bot/index.js';
let c = fs.readFileSync(path, 'utf8');

const start = c.indexOf('async function handleStealEmojis');
const end = c.indexOf('// BUTTON HANDLER', start);
const oldFunc = c.substring(start, end);

const bt = String.fromCharCode(96);

const newFunc = [
'async function handleStealEmojis(interaction) {',
'  const emojisStr = interaction.options.getString(\u0022emojis\u0022);',
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
'      const animated = match.groups.animated === \u0022a\u0022;',
'      const url = animated',
'        ? ' + bt + 'https://cdn.discordapp.com/emojis/\u0024{id}.gif' + bt,
'        : ' + bt + 'https://cdn.discordapp.com/emojis/\u0024{id}.png' + bt + ';',
'',
'      try {',
'        await interaction.guild.emojis.create({',
'          attachment: url,',
'          name: name',
'        });',
'        added++;',
'      } catch (e) {',
'        console.error(' + bt + 'Error adding emoji \u0024{name}: \u0024{e.message}' + bt + ');',
'        errors++;',
'      }',
'    }',
'',
'    if (added === 0 && errors === 0) {',
'      return interaction.editReply(\u0022*No se encontraron emojis. Copia emojis de otro servidor y pegalos aqui.*\u0022);',
'    }',
'',
'    let reply = ' + bt + '\\u2705 Se anadieron \u0024{added} emoji(s) al servidor.' + bt + ';',
'    if (errors > 0) reply += ' + bt + '\\n\\u274c \u0024{errors} emoji(s) fallaron (limite alcanzado o sin permisos).' + bt + ';',
'    await interaction.editReply(reply);',
'  } catch (e) {',
'    console.error(\u0022Error in stealemojis:\u0022, e);',
'    await interaction.editReply(\u0022*Error al procesar emojis.*\u0022);',
'  }',
'}'
].join(String.fromCharCode(13,10));

c = c.replace(oldFunc, newFunc);
fs.writeFileSync(path, c);
console.log('OK - handleStealEmojis function reemplazada completamente');
