const fs = require('fs');
const path = 'C:/Users/ldlsl/OneDrive/Documentos/discord bot/index.js';
let c = fs.readFileSync(path, 'utf8');

// Reemplazos directos para template literals
const bt = String.fromCharCode(96);

c = c.replace('? https://cdn.discordapp.com/emojis/.gif', '? ' + bt + 'https://cdn.discordapp.com/emojis/\.gif' + bt);
c = c.replace(': https://cdn.discordapp.com/emojis/.png;', ': ' + bt + 'https://cdn.discordapp.com/emojis/\.png' + bt + ';');
c = c.replace('console.error(Error adding emoji : );', 'console.error(' + bt + 'Error adding emoji \: \' + bt + ');');
c = c.replace('let reply = \u2764. Se anadieron  emoji(s) al servidor.;', 'let reply = ' + bt + '\u2705 Se anadieron \ emoji(s) al servidor.' + bt + ';');
c = c.replace('reply += \n\u274c  emoji(s) fallaron (limite alcanzado o sin permisos).;', 'reply += ' + bt + '\n\u274c \ emoji(s) fallaron (limite alcanzado o sin permisos).' + bt + ';');

fs.writeFileSync(path, c);
console.log('CORREGIDO');
