const { REST, Routes } = require("discord.js");
require("dotenv").config();

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    console.log("🧹 borrando comandos del servidor...");

    await rest.put(
        Routes.applicationGuildCommands(
            process.env.CLIENT_ID,
            process.env.GUILD_ID
        ),
        { body: [] }
    );

    console.log("✔ servidor limpio");
})();