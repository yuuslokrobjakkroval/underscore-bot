const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'recommend',
    description: 'Get song recommendations based on the current track',
    data: new SlashCommandBuilder()
        .setName('recommend')
        .setDescription('Get song recommendations based on the current track'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const user = isInteraction ? message.user : message.author;
        const player = client.manager.players.get(guildId);
        const createErr = (text) => ({ 
            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${emojis.error} ${text}`)).toJSON()],
            flags: MessageFlags.IsComponentsV2 
        });

        if (!player || !player.queue.current) {
            return message.reply(createErr('Play something first to get recommendations.'));
        }

        const track = player.queue.current;
        const videoId = track.uri.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];

        if (!videoId) {
            return message.reply(createErr('Recommendations only work for YouTube tracks.'));
        }

        const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
        const result = await client.manager.search(mixUrl, { requester: user });

        if (!result || !result.tracks || result.tracks.length < 2) {
            return message.reply(createErr('No recommendations found.'));
        }

        let recText = `### ✨ Recommendations for you\n> *Based on: ${track.title.substring(0, 30)}*\n\n`;
        result.tracks.slice(1, 6).forEach((t, i) => {
            recText += `> \`${i + 1}.\` **${t.title.substring(0, 45)}** · \`${t.author}\`\n`;
        });
        recText += `\n*To play one, use \`.play <song name>\`*`;

        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(recText)
        );

        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
