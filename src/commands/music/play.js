const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionFlagsBits
} = require('discord.js');
const metadata = require('../../utils/metadata');
const resolver = require('../../utils/resolver');
const { formatTime } = require('../../utils/formatters');
const logger = require('../../utils/logger');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'play',
    aliases: ['p'],
    description: 'Play a song with clean elite metadata',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song in your voice channel')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The song name or link to play')
                .setRequired(true)),

    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const query = (isInteraction ? message.options.getString('query') : args.join(' ')).trim();
        const user = isInteraction ? message.user : message.author;
        const channel = message.channel;
        const member = message.member;

        const createError = (text) => ({
            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${emojis.error} ${text}`)).toJSON()],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });

        if (!query) return message.reply(createError('Please provide a song name or link.'));

        const vc = member.voice.channel;
        if (!vc) return message.reply(createError('You need to be in a voice channel first.'));

        if (!message.guild.members.me.permissionsIn(vc).has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
            return message.reply(createError("I don't have permissions to join or speak in your channel."));
        }

        if (isInteraction) await message.deferReply();

        let player = client.manager.players.get(member.guild.id);

        // Instant Premium & Queue Limit Check (Zero Latency)
        const isPremium = client.db.isPremium(member.guild.id, user.id) || client.config.owners.includes(user.id);

        const QUEUE_LIMIT = 50;
        if (player && !isPremium && player.queue.length >= QUEUE_LIMIT) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ✨ Premium Required\n> The queue has reached the limit of **${QUEUE_LIMIT}** tracks.\n> Upgrade to **Premium** for an unlimited queue!`)
            );
            const res = { components: [err.toJSON()], flags: MessageFlags.IsComponentsV2 };
            return isInteraction ? message.editReply(res) : message.reply(res);
        }

        if (!player) {
            player = await client.manager.createPlayer({
                guildId: member.guild.id,
                voiceId: vc.id,
                textId: channel.id,
                deaf: true,
            });
        }

        if (player.voiceId !== vc.id) {
            return isInteraction ? message.editReply(createError("I'm already playing in another voice channel.")) : message.reply(createError("I'm already playing in another voice channel."));
        }

        let result;
        try {
            if (!client.manager.shoukaku.nodes.size || !Array.from(client.manager.shoukaku.nodes.values()).some(node => node.state === 1)) {
                return isInteraction 
                    ? message.editReply(createError('The music server is still connecting. Please wait a moment...')) 
                    : message.reply(createError('The music server is still connecting. Please wait a moment...'));
            }

            result = await client.manager.search(query, { 
                requester: user
            });
        } catch (e) {
            logger.error(`Search failed: ${e.message || JSON.stringify(e)}`);
            return isInteraction ? message.editReply(createError('The music server is currently unavailable.')) : message.reply(createError('The music server is currently unavailable.'));
        }

        if (!result || !result.tracks || !result.tracks.length) {
            return isInteraction ? message.editReply(createError('No results found for your query.')) : message.reply(createError('No results found for your query.'));
        }

        const isPlaylist = result.type === 'PLAYLIST';
        const tracks = isPlaylist ? result.tracks : [result.tracks[0]];

        // Fast Regex Clean for all tracks to ensure immediate results are readable
        tracks.forEach(track => {
            track.title = metadata.cleanTitle(track.title);
            track.author = metadata.cleanAuthor(track.author);
        });

        if (!isPlaylist) {
            // High-fidelity wash only for single tracks to maintain zero-latency
            await resolver.washTrack(tracks[0]);
        }

        // Add to queue (trackStart will handle washing for subsequent tracks)
        tracks.forEach(track => player.queue.add(track));

        const successContainer = new ContainerBuilder();
        if (isPlaylist) {
            successContainer.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${emojis.check} Playlist Added`),
                        new TextDisplayBuilder().setContent(`> [**${result.playlistName}**](${query}) with \`${tracks.length}\` tracks\n> -# Queued by \` ${user.username} \``)
                    )
            );
        } else {
            const track = tracks[0];
            const position = player.queue.length;
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${emojis.check} Track Added`),
                    new TextDisplayBuilder().setContent(
                        `> [**${metadata.truncate(track.title, 35)}**](${track.uri}) by \` ${metadata.cleanAuthor(track.author)} \`\n` +
                        `> -# Position \` #${position} \` · Duration \` ${formatTime(track.length)} \` · By \` ${user.username} \``
                    )
                );
            
            const thumb = metadata.getHighResThumbnail(track.thumbnail);
            if (thumb) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb));
            successContainer.addSectionComponents(section);

            if (position > 0) {
                successContainer.addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`remove_${track.identifier}`).setLabel('Remove').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId(`playnext_${track.identifier}`).setLabel('Play Next').setStyle(ButtonStyle.Secondary)
                    )
                );
            }
        }

        const responseMsg = isInteraction 
            ? await message.editReply({ components: [successContainer.toJSON()], flags: MessageFlags.IsComponentsV2 })
            : await message.reply({ components: [successContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });

        if (!player.playing && !player.paused) await player.play();
    }
};

