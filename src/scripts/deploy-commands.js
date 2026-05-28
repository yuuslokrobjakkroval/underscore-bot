const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }
}

(async () => {
    if (!process.env.TOKEN || !process.env.CLIENT_ID) {
        console.warn('Deploy skipped: TOKEN or CLIENT_ID is missing.');
        return;
    }

    const rest = new REST().setToken(process.env.TOKEN);
    const guildId = process.env.GUILD_ID;

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const route = guildId
            ? Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
            : Routes.applicationCommands(process.env.CLIENT_ID);

        const data = await rest.put(route, { body: commands });

        console.log(`Successfully reloaded ${data.length} ${guildId ? `guild (${guildId})` : 'global'} application (/) commands.`);
    } catch (error) {
        if (error.code === 50001 && guildId) {
            console.warn(
                `Missing access to guild ${guildId}. ` +
                'Make sure GUILD_ID is correct and the bot is invited there with the applications.commands scope, or remove GUILD_ID to deploy globally.'
            );
            return;
        }

        console.error(error);
    }
})();
