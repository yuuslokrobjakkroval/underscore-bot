const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

module.exports = async (client) => {
    const commands = [];
    const commandFolders = fs.readdirSync(path.join(__dirname, '../commands'));

    for (const folder of commandFolders) {
        const folderPath = path.join(__dirname, `../commands/${folder}`);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            if (command.name) {
                command.category = command.category || folder;
                client.commands.set(command.name, command);
                
                // Collect Slash Command data for deployment
                if (command.data) {
                    commands.push(command.data.toJSON());
                }
            } else {
                logger.warn(`Command ${file} is missing a name.`);
            }
        }
    }

    logger.info(`Loaded ${client.commands.size} commands.`);

    // Auto-Deploy Slash Commands
    if (commands.length > 0) {
        const rest = new REST().setToken(process.env.TOKEN);
        try {
            const route = process.env.GUILD_ID
                ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
                : Routes.applicationCommands(process.env.CLIENT_ID);

            const data = await rest.put(route, { body: commands });

            logger.info(`Auto-Deploy: Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            logger.error(`Auto-Deploy Error: ${error.stack}`);
        }
    }
};
