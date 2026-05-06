console.log("TOKEN:", process.env.TOKEN);
console.log("CLIENT_ID:", process.env.CLIENT_ID);
console.log("GUILD_ID:", process.env.GUILD_ID);

const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Expulsar usuario")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Usuario")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Banear usuario")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Usuario")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Advertir usuario")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Usuario")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Motivo")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Enviar anuncio")
        .addStringOption(option =>
            option.setName("message")
                .setDescription("Mensaje")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Crear ticket")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("🔄 Registrando comandos...");

         await rest.put(
    Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
    ),
    { body: commands } 
        );

        console.log("✔ comandos registrados correctamente");
    } catch (error) {
        console.error(error);
    }
})();