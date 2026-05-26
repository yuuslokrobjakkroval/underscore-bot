const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'reload',
    description: 'Reload a specific command (Developer Only)',
    async execute(client, message, args) {
        if (!client.config.owners.includes(message.author.id)) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} This command is restricted to bot developers.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const commandName = args[0]?.toLowerCase();
        if (!commandName) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Please provide a command name to reload (or \`all\`).`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        if (commandName === 'all') {
            try {
                const commandFolders = fs.readdirSync(path.join(__dirname, '../../commands'));
                let count = 0;

                for (const folder of commandFolders) {
                    const folderPath = path.join(__dirname, `../../commands/${folder}`);
                    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
                    
                    for (const file of files) {
                        const filePath = `../${folder}/${file}`;
                        const absolutePath = require.resolve(filePath);
                        delete require.cache[absolutePath];
                        const newCommand = require(filePath);
                        client.commands.set(newCommand.name, newCommand);
                        count++;
                    }
                }

                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> ${emojis.check} Successfully reloaded **${count}** commands.`)
                );
                return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
            } catch (error) {
                client.logger.error(`Reload all error: ${error.stack}`);
                const errContainer = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> ${emojis.error} Failed to reload all commands: \`${error.message}\``)
                );
                return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
            }
        }

        const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Command \`${commandName}\` not found.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        // Find the folder it's in
        const commandFolders = fs.readdirSync(path.join(__dirname, '../../commands'));
        let folderName;
        let fileName;

        for (const folder of commandFolders) {
            const folderPath = path.join(__dirname, `../../commands/${folder}`);
            const files = fs.readdirSync(folderPath);
            if (files.includes(`${command.name}.js`)) {
                folderName = folder;
                fileName = `${command.name}.js`;
                break;
            }
        }

        if (!folderName) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Could not locate command file.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const filePath = `../${folderName}/${fileName}`;
        const absolutePath = require.resolve(filePath);

        try {
            delete require.cache[absolutePath];
            const newCommand = require(filePath);
            client.commands.set(newCommand.name, newCommand);

            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.check} Successfully reloaded command: **${newCommand.name}**`)
            );
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            client.logger.error(`Reload error: ${error.stack}`);
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Failed to reload command: \`${error.message}\``)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
