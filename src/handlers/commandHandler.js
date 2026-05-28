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
    if (process.env.AUTO_DEPLOY_COMMANDS === 'false') {
        logger.info('Auto-Deploy: Skipped because AUTO_DEPLOY_COMMANDS=false.');
        return;
    }

    if (commands.length > 0) {
        if (!process.env.TOKEN || !process.env.CLIENT_ID) {
            logger.warn('Auto-Deploy: Skipped because TOKEN or CLIENT_ID is missing.');
            return;
        }

        const rest = new REST().setToken(process.env.TOKEN);
        const guildId = process.env.GUILD_ID;
        try {
            const route = guildId
                ? Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
                : Routes.applicationCommands(process.env.CLIENT_ID);

            const data = await rest.put(route, { body: commands });

            logger.info(`Auto-Deploy: Successfully reloaded ${data.length} ${guildId ? `guild (${guildId})` : 'global'} application (/) commands.`);
        } catch (error) {
            if (error.code === 50001 && guildId) {
                logger.warn(
                    `Auto-Deploy: Missing access to guild ${guildId}. ` +
                    'Make sure GUILD_ID is correct and the bot is invited there with the applications.commands scope, or remove GUILD_ID to deploy globally.'
                );
                return;
            }

            logger.error(`Auto-Deploy Error: ${error.stack}`);
        }
    }
};
