const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const lyricsFinder = require('lyrics-finder');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'lyrics',
    aliases: ['ly'],
    description: 'Get lyrics for the current song or a specific query',
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get lyrics for a song')
        .addStringOption(option => option.setName('query').setDescription('The song to search lyrics for')),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const player = client.manager.players.get(isInteraction ? message.guildId : message.guild.id);
        let query = isInteraction ? message.options.getString('query') : args.join(' ');

        if (!query && player && player.queue.current) {
            query = player.queue.current.title;
        }

        if (!query) {
            const p = client.config.prefix;
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Missing Song Name!**\n> **Correct Usage:** \`${p}lyrics <song name>\` (or play a song first)`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        if (isInteraction) await message.deferReply();

        try {
            const lyrics = await lyricsFinder('', query) || 'No lyrics found for this song.';
            const title = player?.queue.current?.title || query;

            const container = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${emojis.lyrics} Lyrics: ${title.substring(0, 50)}`),
                            new TextDisplayBuilder().setContent(lyrics.length > 3000 ? lyrics.substring(0, 3000) + '...' : lyrics)
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

            const res = { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
            return isInteraction ? message.editReply(res) : message.reply(res);
        } catch (error) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Failed to fetch lyrics.`)
            );
            const res = { components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 };
            return isInteraction ? message.editReply(res) : message.reply(res);
        }
    }
};
