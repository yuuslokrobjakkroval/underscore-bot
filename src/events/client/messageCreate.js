const User = require('../../database/models/user');
const helpUI = require('../../ui/helpUI');
const emojis = require('../../utils/emojis');
const { resolveCommandBot } = require('../../utils/botCoordinator');
const { isOwner, isPrivate } = require('../../utils/botAccess');
const { getBotId, hasNoPrefix, hasPremium } = require('../../utils/entitlements');
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { logMessageCommand } = require('../../utils/commandUsageLogger');
const noPrefixCache = new Map();

const event = {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot || !message.guild) return;

        // Mention Response & Prefix Logic
        const mentionRegex = new RegExp(`^<@!?${client.user.id}>`);
        const mentionMatch = message.content.match(mentionRegex);
        const prefix = client.config.prefix;

        if (isPrivate(client) && !isOwner(client, message.author.id) && (mentionMatch || message.content.startsWith(prefix))) {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} This bot is currently **private**. Only bot owners can use commands.`)
            );
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
        }

        if (mentionMatch) {
            // If it's ONLY a mention, show help
            if (message.content.trim() === mentionMatch[0]) {
                const helpData = await helpUI.mentionHelp(client, message.author);
                return message.reply(helpData);
            }
        }

        let commandName = '';
        let args = [];
        let isDirectMention = false;

        // Check Prefix (Standard or Mention)
        if (mentionMatch) {
            isDirectMention = true;
            args = message.content.slice(mentionMatch[0].length).trim().split(/ +/);
            commandName = args.shift().toLowerCase();
        } else if (message.content.startsWith(prefix)) {
            args = message.content.slice(prefix.length).trim().split(/ +/);
            commandName = args.shift().toLowerCase();
        } else {
            // Check No-Prefix
            const noPrefixCacheKey = `${message.author.id}:${getBotId(client)}`;
            let hasNoPrefixValue = noPrefixCache.get(noPrefixCacheKey);

            if (hasNoPrefixValue === undefined) {
                const userData = await User.findOne({ userId: message.author.id });
                hasNoPrefixValue = await hasNoPrefix(client, message.author.id, userData);

                noPrefixCache.set(noPrefixCacheKey, hasNoPrefixValue);
                setTimeout(() => noPrefixCache.delete(noPrefixCacheKey), 300000);
            }

            if (hasNoPrefixValue) {
                args = message.content.trim().split(/ +/);
                commandName = args.shift().toLowerCase();
                const exists = client.commands.has(commandName) ||
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

                if (exists) {
                    client.logger.info(`[No-Prefix] User ${message.author.username} triggered command: ${commandName}`);
                } else {
                    commandName = '';
                }
            }
        }

        if (!commandName) return;

        const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command) return;

        if (isPrivate(client) && !isOwner(client, message.author.id)) {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} This bot is currently **private**. Only bot owners can use commands.`)
            );
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
        }

        const botCheck = await resolveCommandBot(client, message, { command, isDirectMention });
        if (!botCheck.allowed) {
            if (botCheck.silent) return;
            return message.reply(botCheck.reason).catch(() => { });
        }

        // Premium Check
        if (command.premium) {
            const Guild = require('../../database/models/guild');
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            const userData = await User.findOne({ userId: message.author.id });

            const authorIsOwner = isOwner(client, message.author.id);
            const isPremiumUserOrGuild = await hasPremium(client, message.guild.id, message.author.id, { guildData, userData }) || authorIsOwner;

            if (!isPremiumUserOrGuild) {
                const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ✨ Premium Feature\n> This command is restricted to **Premium Users** or **Premium Guilds**.\n> \`/premium status\` to check your status.`)
                );
                return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
            }
        }

        logMessageCommand(client, message, command, args).catch((error) => {
            client.logger.warn(`Failed to send command usage log: ${error.message}`);
        });

        try {
            const response = await command.execute(client, message, args);
            if (response && typeof response === 'object' && !response.id) {
                await message.reply(response).catch(() => { });
            }
        } catch (error) {
            client.logger.error(error);
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${emojis.error} Command Error\n> \`\`\`js\n> ${(error.message || 'Unknown Internal Error').split('\n')[0]}\n> \`\`\``)
                );
            message.reply({
                content: null,
                embeds: [],
                components: [container.toJSON()],
                flags: MessageFlags.IsComponentsV2
            }).catch(() => { });
        }
    }
};

module.exports = event;
module.exports.noPrefixCache = noPrefixCache;
