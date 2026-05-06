console.log("TOKEN:", process.env.TOKEN);
console.log("CLIENT_ID:", process.env.CLIENT_ID);
console.log("GUILD_ID:", process.env.GUILD_ID);

require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [

    // ================= KICK =================
    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Expulsar usuario")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Usuario")
                .setRequired(true)
        ),

    // ================= BAN =================
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Banear usuario")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Usuario")
                .setRequired(true)
        ),

    // ================= WARN =================
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

    // ================= ANNOUNCE PRO =================
    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Enviar anuncio en embed")
        .addStringOption(option =>
            option.setName("titulo")
                .setDescription("Título del anuncio")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("mensaje")
                .setDescription("Mensaje del anuncio")
                .setRequired(true)
        ),

    // ================= TICKET PANEL =================
    new SlashCommandBuilder()
        .setName("ticketpanel")
        .setDescription("Crear panel de tickets con botón")

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