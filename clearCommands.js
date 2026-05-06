require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Expulsar usuario")
        .addUserOption(o => o.setName("user").setDescription("usuario").setRequired(true)),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Banear usuario")
        .addUserOption(o => o.setName("user").setDescription("usuario").setRequired(true)),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn usuario")
        .addUserOption(o => o.setName("user").setDescription("usuario").setRequired(true))
        .addStringOption(o => o.setName("reason").setDescription("motivo").setRequired(true)),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Anuncio")
        .addStringOption(o => o.setName("titulo").setRequired(true))
        .addStringOption(o => o.setName("mensaje").setRequired(true)),

    new SlashCommandBuilder()
        .setName("ticketpanel")
        .setDescription("Panel tickets")

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {

        console.log("🧹 limpiando comandos...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: [] } // 🔥 borra todo primero
        );

        console.log("🔄 registrando nuevos...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✔ comandos OK");

    } catch (e) {
        console.error(e);
    }
})();