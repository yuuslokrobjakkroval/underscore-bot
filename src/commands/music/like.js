const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const User = require('../../database/models/user');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'like',
    aliases: ['fav', 'favorite'],
    description: 'Add the current song to your favorites',
    data: new SlashCommandBuilder()
        .setName('like')
        .setDescription('Add the current song to your favorites'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const player = client.manager.players.get(guildId);
        const user = isInteraction ? message.user : message.author;
        if (!player || !player.queue.current) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} No music playing.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const track = player.queue.current;

        try {
            const Guild = require('../../database/models/guild');
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            let userData = await User.findOne({ userId: user.id });

            const isGuildPremium = guildData?.premium && (!guildData.premiumUntil || guildData.premiumUntil > Date.now());
            const isUserPremium = userData?.premium && (!userData.premiumUntil || userData.premiumUntil > Date.now());
            const isPremium = isGuildPremium || isUserPremium || client.config.owners.includes(user.id);

            const LIKED_LIMIT = 20;

            if (!isPremium && userData?.likedSongs?.length >= LIKED_LIMIT) {
                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ✨ Premium Required\n> You've reached the limit of **${LIKED_LIMIT}** liked songs.\n> Upgrade to **Premium** to save unlimited songs!`)
                );
                return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
            }

            // Check if already liked to prevent duplicates
            const isAlreadyLiked = userData?.likedSongs?.some(s => s.identifier === track.identifier);

            if (isAlreadyLiked) {
                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> ❤️ **${track.title.substring(0, 50)}** is already in your favorites!`)
                );
                return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
            }

            await User.findOneAndUpdate(
                { userId: user.id },
                { $push: { likedSongs: {
                    title: track.title,
                    author: track.author,
                    uri: track.uri,
                    identifier: track.identifier,
                    thumbnail: track.thumbnail,
                    length: track.length
                } } },
                { upsert: true, returnDocument: 'after' }
            );

            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ❤️ Added **${track.title.substring(0, 50)}** to your favorites!`)
            );
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            client.logger.error(`Like command error: ${error.stack}`);
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Failed to save track.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
