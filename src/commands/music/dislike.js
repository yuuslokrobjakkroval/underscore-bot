const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const User = require('../../database/models/user');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'dislike',
    aliases: ['unfav', 'remfav'],
    description: 'Remove a song from your favorites',
    data: new SlashCommandBuilder()
        .setName('dislike')
        .setDescription('Remove a song from your favorites')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The song name to remove')
                .setRequired(false)),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const player = client.manager.players.get(guildId);
        const user = isInteraction ? message.user : message.author;
        const query = isInteraction ? message.options.getString('query') : args.join(' ');

        if (query) {
            // Remove by name
            await User.findOneAndUpdate(
                { userId: user.id },
                { $pull: { likedSongs: { title: new RegExp(query, 'i') } } }
            );
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> 💔 Removed matching songs from your favorites.`)
            );
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        if (!player || !player.queue.current) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} No music playing to dislike (or provide a name).`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const track = player.queue.current;

        try {
            await User.findOneAndUpdate(
                { userId: user.id },
                { $pull: { likedSongs: { identifier: track.identifier } } }
            );

            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> 💔 Removed **${track.title.substring(0, 50)}** from your favorites.`)
            );
            return message.reply({ 
                components: [container.toJSON()], 
                flags: MessageFlags.IsComponentsV2 
            });
        } catch (error) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Failed to remove track.`)
            );
            return message.reply({ 
                components: [errContainer.toJSON()], 
                flags: MessageFlags.IsComponentsV2 
            });
        }
    }
};
