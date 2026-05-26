const User = require('../../database/models/user');
const helpUI = require('../../ui/helpUI');
const emojis = require('../../utils/emojis');
const noPrefixCache = new Map();

const event = {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot || !message.guild) return;

        // Mention Response & Prefix Logic
        const mentionRegex = new RegExp(`^<@!?${client.user.id}>`);
        const mentionMatch = message.content.match(mentionRegex);

        if (mentionMatch) {
            // If it's ONLY a mention, show help
            if (message.content.trim() === mentionMatch[0]) {
                const helpData = await helpUI.mentionHelp(client, message.author);
                return message.reply(helpData);
            }
        }

        const prefix = client.config.prefix;
        let commandName = '';
        let args = [];

        // Check Prefix (Standard or Mention)
        if (mentionMatch) {
            args = message.content.slice(mentionMatch[0].length).trim().split(/ +/);
            commandName = args.shift().toLowerCase();
        } else if (message.content.startsWith(prefix)) {
            args = message.content.slice(prefix.length).trim().split(/ +/);
            commandName = args.shift().toLowerCase();
        } else {
            // Check No-Prefix
            let hasNoPrefix = noPrefixCache.get(message.author.id);

            if (hasNoPrefix === undefined) {
                const userData = await User.findOne({ userId: message.author.id });
                const isOwner = client.config.owners.includes(message.author.id);
                const isPremiumUser = userData?.premium && (!userData.premiumUntil || userData.premiumUntil > Date.now());

                if (isOwner) {
                    hasNoPrefix = userData?.noPrefix || false;
                } else {
                    hasNoPrefix = isPremiumUser || userData?.noPrefix || false;
                }

                if (userData?.noPrefix && userData.noPrefixUntil && userData.noPrefixUntil < Date.now()) {
                    userData.noPrefix = false;
                    userData.noPrefixUntil = null;
                    await userData.save();
                    if (!isPremiumUser && !isOwner) hasNoPrefix = false;
                }

                noPrefixCache.set(message.author.id, hasNoPrefix);
                setTimeout(() => noPrefixCache.delete(message.author.id), 300000);
            }

            if (hasNoPrefix) {
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

        // Premium Check
        if (command.premium) {
            const Guild = require('../../database/models/guild');
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            const userData = await User.findOne({ userId: message.author.id });

            const isOwner = client.config.owners.includes(message.author.id);
            const isGuildPremium = guildData?.premium && (!guildData.premiumUntil || guildData.premiumUntil > Date.now());
            const isUserPremium = (userData?.premium && (!userData.premiumUntil || userData.premiumUntil > Date.now())) || isOwner;

            if (!isGuildPremium && !isUserPremium) {
                const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ✨ Premium Feature\n> This command is restricted to **Premium Users** or **Premium Guilds**.\n> \`/premium status\` to check your status.`)
                );
                return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
            }
        }

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
