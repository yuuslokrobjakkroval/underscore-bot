const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} = require('discord.js');
const { formatTime } = require('../../utils/formatters');
const metadata = require('../../utils/metadata');
const resolver = require('../../utils/resolver');
const logger = require('../../utils/logger');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'search',
    description: 'Search and pick a song to play',
    data: new SlashCommandBuilder()
        .setName("search")
        .setDescription("Search for music on YouTube")
        .addStringOption(option =>
            option.setName("query")
                .setDescription("The song to search for")
                .setRequired(true)
        ),

    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const query = isInteraction ? message.options.getString('query') : args.join(' ');
        const user = isInteraction ? message.user : message.author;
        const channel = message.channel;
        const member = message.member;

        if (!query) {
            return message.reply({ content: "Please provide a search query!", flags: MessageFlags.Ephemeral });
        }

        if (isInteraction) await message.deferReply();

        let result;
        try {
            result = await client.manager.search(query, { requester: user });
        } catch (e) {

            logger.error(`Search command failed: ${e.message || JSON.stringify(e)}`);
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} **Search Failed:** The music server is currently unavailable.`));
            return isInteraction ? message.editReply({ components: [err.toJSON()], flags: MessageFlags.IsComponentsV2 }) : message.reply({ components: [err.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const tracks = result?.tracks || [];
        let page = 0;
        const multiple = 5;

        if (tracks.length === 0) {
            const noRes = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} **No results found for \`${query}\`**`));
            return isInteraction ? message.editReply({ components: [noRes.toJSON()], flags: MessageFlags.IsComponentsV2 }) : message.reply({ components: [noRes.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const generateContainer = (p) => {
            const container = new ContainerBuilder();
            const start = p * multiple;
            const currentBatch = tracks.slice(start, start + multiple);
            const totalPages = Math.ceil(tracks.length / multiple);

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojis.music} Search Results\n-# Showing results for: \`${metadata.truncate(query, 30)}\``));
            container.addSeparatorComponents(new SeparatorBuilder());

            currentBatch.forEach((track, i) => {
                const index = start + i + 1;
                const duration = formatTime(track.length || 0);
                const authorName = metadata.cleanAuthor(track.author);
                const title = metadata.cleanTitle(track.title);

                const section = new SectionBuilder();
                section.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${index}.** [${metadata.truncate(title, 60)}](${track.uri})`),
                    new TextDisplayBuilder().setContent(`-# ${authorName} • ${duration}`)
                );

                const addButton = new ButtonBuilder().setCustomId(`search_add_${index - 1}`).setEmoji('➕').setStyle(ButtonStyle.Secondary);
                section.setButtonAccessory(addButton);
                container.addSectionComponents(section);
            });

            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Page ${p + 1}/${totalPages} • Use buttons below to navigate or add all.`));

            return container;
        };

        const generateButtons = (p) => {
            const totalPages = Math.ceil(tracks.length / multiple);
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('search_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('search_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(p === totalPages - 1),
                new ButtonBuilder().setCustomId('search_all').setLabel('Queue All').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('search_close').setLabel('Close').setStyle(ButtonStyle.Danger)
            );
        };

        const responseData = {
            components: [generateContainer(page).toJSON(), generateButtons(page)],
            flags: MessageFlags.IsComponentsV2
        };

        const responseMsg = isInteraction ? await message.editReply(responseData) : await message.reply(responseData);

        const collector = responseMsg.createMessageComponentCollector({ filter: (i) => i.user.id === user.id, time: 300000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'search_close') { 
                collector.stop(); 
                return isInteraction ? message.deleteReply().catch(() => { }) : responseMsg.delete().catch(() => { }); 
            }

            if (i.customId === 'search_prev') { page = Math.max(0, page - 1); }
            else if (i.customId === 'search_next') { page = Math.min(Math.ceil(tracks.length / multiple) - 1, page + 1); }
            else if (i.customId.startsWith('search_add_')) {
                const index = parseInt(i.customId.split('_')[2]);
                const track = tracks[index];
                if (track) {
                    if (!member.voice.channel) return i.reply({ content: "You need to be in a voice channel!", flags: MessageFlags.Ephemeral });
                    
                    let player = client.manager.players.get(member.guild.id);

                    // Instant Premium & Queue Limit Check (Zero Latency)
                    const isPremium = client.db.isPremium(member.guild.id, user.id) || client.config.owners.includes(user.id);

                    const QUEUE_LIMIT = 50;
                    if (player && !isPremium && player.queue.length >= QUEUE_LIMIT) {
                        return i.reply({ 
                            content: `### ✨ Premium Required\n> The queue has reached the limit of **${QUEUE_LIMIT}** tracks.\n> Upgrade to **Premium** for an unlimited queue!`, 
                            flags: MessageFlags.Ephemeral 
                        });
                    }

                    if (!player) {
                        player = await client.manager.createPlayer({
                            guildId: member.guild.id,
                            voiceId: member.voice.channel.id,
                            textId: channel.id,
                            deaf: true,
                        });
                    }
                    
                    await resolver.washTrack(track);
                    player.queue.add(track);
                    
                    const success = new ContainerBuilder().addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.check} Added [${track.title}](${track.uri}) to queue.`))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(metadata.getMediumThumbnail(track.thumbnail)))
                    );
                    
                    await i.reply({ components: [success.toJSON()], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    if (!player.playing && !player.paused) await player.play();
                    return;
                }
            } else if (i.customId === 'search_all') {
                if (!member.voice.channel) return i.reply({ content: "You need to be in a voice channel!", flags: MessageFlags.Ephemeral });
                
                let player = client.manager.players.get(member.guild.id);

                // Instant Premium & Queue Limit Check (Zero Latency)
                const isPremium = client.db.isPremium(member.guild.id, user.id) || client.config.owners.includes(user.id);

                const QUEUE_LIMIT = 50;
                if (!isPremium && ((player?.queue?.length || 0) + tracks.length) > QUEUE_LIMIT) {
                    return i.reply({ 
                        content: `### ✨ Premium Required\n> Adding all results would exceed the **${QUEUE_LIMIT}** track limit.\n> Upgrade to **Premium** for an unlimited queue!`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                if (!player) {
                    player = await client.manager.createPlayer({
                        guildId: member.guild.id,
                        voiceId: member.voice.channel.id,
                        textId: channel.id,
                        deaf: true,
                    });
                }
                
                // Fast Regex Clean for all tracks
                tracks.forEach(t => {
                    t.title = metadata.cleanTitle(t.title);
                    t.author = metadata.cleanAuthor(t.author);
                });

                // Add all to queue immediately
                tracks.forEach(t => player.queue.add(t));
                
                const success = new ContainerBuilder().addSectionComponents(
                    new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.check} Added all **${tracks.length}** results to queue.`))
                );
                
                await i.reply({ components: [success.toJSON()], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                if (!player.playing && !player.paused) await player.play();
                return;
            }

            await i.update({ components: [generateContainer(page).toJSON(), generateButtons(page)], flags: MessageFlags.IsComponentsV2 });
        });

        collector.on('end', () => {
            if (isInteraction) {
                message.editReply({ components: [generateContainer(page).toJSON()] }).catch(() => { });
            } else {
                responseMsg.edit({ components: [generateContainer(page).toJSON()] }).catch(() => { });
            }
        });
    },
};
