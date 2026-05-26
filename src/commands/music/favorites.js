const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const User = require('../../database/models/user');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'favorites',
    aliases: ['favs', 'liked'],
    description: 'Show your favorite songs',
    data: new SlashCommandBuilder()
        .setName('favorites')
        .setDescription('Show your favorite songs'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const user = isInteraction ? message.user : message.author;
        const userData = await User.findOne({ userId: user.id });

        if (!userData || !userData.likedSongs || userData.likedSongs.length === 0) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} You haven't liked any songs yet!`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        let favText = `### ❤️ Your Favorites\n`;
        userData.likedSongs.slice(0, 10).forEach((t, i) => {
            favText += `> \`${i + 1}.\` **${t.title.substring(0, 45)}** · \`${t.author}\`\n`;
        });

        if (userData.likedSongs.length > 10) {
            favText += `\n-# ...and ${userData.likedSongs.length - 10} more tracks`;
        }

        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(favText)
        );

        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
