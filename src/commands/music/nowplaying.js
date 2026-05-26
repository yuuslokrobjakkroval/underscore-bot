const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder
} = require('discord.js');
const { formatTime } = require('../../utils/formatters');
const metadata = require('../../utils/metadata');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'nowplaying',
    aliases: ['nop'],
    description: 'Show the currently playing track with an elite banner UI',
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing track with an elite banner UI'),
    async execute(client, message, args) {
        try {
            const isInteraction = !!message.options;
            const guildId = isInteraction ? message.guildId : message.guild.id;

            const player = client.manager.players.get(guildId);
            if (!player || !player.queue.current) {
                const container = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> ${emojis.error} There is no music playing.`)
                );
                const res = { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            const track = player.queue.current;
            const currentPos = player.position;
            const total = track.length;

            const title = metadata.cleanTitle(track.title);
            const author = metadata.cleanAuthor(track.author);
            const thumb = metadata.getMediumThumbnail(track.thumbnail);
            const requester = track.requester || { displayName: 'System', username: 'System', id: '0' };
            const paused = !player.playing;

            const container = new ContainerBuilder()
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(thumb)
                    )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${emojis.vinyl} [${title}](${track.uri})`),
                    new TextDisplayBuilder().setContent(
                        `> \` ${author} \` · \` ${formatTime(currentPos)} / ${formatTime(total)} \``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('previous').setEmoji(emojis.backward).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('play_pause').setEmoji(paused ? emojis.play : emojis.pause).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('stop').setEmoji(emojis.stop).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('skip').setEmoji(emojis.forward).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('loop').setEmoji(emojis.loop).setStyle(ButtonStyle.Secondary)
                    )
                );

            const res = {
                components: [container.toJSON()],
                flags: MessageFlags.IsComponentsV2
            };

            return isInteraction ? message.reply(res) : message.reply(res);
        } catch (err) {
            client.logger.error(`NP Command Error: ${err.stack}`);
            return message.reply({ content: 'An error occurred while displaying the current track.', ephemeral: true });
        }
    }
};
