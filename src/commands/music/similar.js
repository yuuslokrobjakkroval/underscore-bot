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
} = require("discord.js");
const { formatTime } = require('../../utils/formatters');
const metadata = require('../../utils/metadata');
const resolver = require('../../utils/resolver');
const logger = require('../../utils/logger');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'similar',
    description: 'Show tracks similar to the current song',
    data: new SlashCommandBuilder()
        .setName("similar")
        .setDescription("Show similar tracks to the currently playing song"),

    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const user = isInteraction ? message.user : message.author;
        const channel = message.channel;
        const member = message.member;

        const player = client.manager.players.get(member.guild.id);
        if (!player || !player.queue.current) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} **Play a song first to see similar tracks.**`));
            const res = { components: [err.toJSON()], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
            return isInteraction ? message.reply(res) : message.reply(res);
        }

        if (isInteraction) await message.deferReply();

        const currentTrack = player.queue.current;
        const query = `${metadata.cleanTitle(currentTrack.title)} ${metadata.cleanAuthor(currentTrack.author)} related`;
        
        let result;
        try {
            result = await client.manager.search(query, { requester: user });
        } catch (e) {
            logger.error(`Similar command failed: ${e.message || JSON.stringify(e)}`);
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} **Search Failed:** The music server is currently unavailable.`));
            return isInteraction ? message.editReply({ components: [err.toJSON()], flags: MessageFlags.IsComponentsV2 }) : message.reply({ components: [err.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const tracks = result?.tracks || [];
        let page = 0;
        const multiple = 5;
        const totalPages = Math.ceil(tracks.length / multiple);

        if (tracks.length === 0) {
            const noRes = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error} **Could not find any similar tracks.**`));
            return isInteraction ? message.editReply({ components: [noRes.toJSON()], flags: MessageFlags.IsComponentsV2 }) : message.reply({ components: [noRes.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const generateContainer = (p) => {
            const container = new ContainerBuilder();
            const start = p * multiple;
            const currentBatch = tracks.slice(start, start + multiple);

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojis.music} Similar Tracks\n-# Based on: \`${metadata.truncate(currentTrack.title, 30)}\``));
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

                const addButton = new ButtonBuilder().setCustomId(`sim_add_${index - 1}`).setEmoji('➕').setStyle(ButtonStyle.Secondary);
                section.setButtonAccessory(addButton);
                container.addSectionComponents(section);
            });

            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Page ${p + 1}/${totalPages} • Use buttons below to navigate.`));

            return container;
        };

        const generateButtons = (p) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sim_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('sim_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(p === totalPages - 1),
                new ButtonBuilder().setCustomId('sim_all').setLabel('Queue All').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('sim_close').setLabel('Close').setStyle(ButtonStyle.Danger)
            );
        };

        const responseData = {
            components: [generateContainer(page).toJSON(), generateButtons(page)],
            flags: MessageFlags.IsComponentsV2
        };

        const responseMsg = isInteraction ? await message.editReply(responseData) : await message.reply(responseData);

        const collector = responseMsg.createMessageComponentCollector({ filter: (i) => i.user.id === user.id, time: 300000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'sim_close') { 
                collector.stop(); 
                return isInteraction ? message.deleteReply().catch(() => { }) : responseMsg.delete().catch(() => { }); 
            }

            if (i.customId === 'sim_prev') { page = Math.max(0, page - 1); }
            else if (i.customId === 'sim_next') { page = Math.min(totalPages - 1, page + 1); }
            else if (i.customId.startsWith('sim_add_')) {
                const index = parseInt(i.customId.split('_')[2]);
                const track = tracks[index];
                if (track) {
                    // Instant Premium & Queue Limit Check (Zero Latency)
                    const isPremium = client.db.isPremium(member.guild.id, user.id) || client.config.owners.includes(user.id);

                    const QUEUE_LIMIT = 50;
                    if (player && !isPremium && player.queue.length >= QUEUE_LIMIT) {
                        return i.reply({ 
                            content: `### ✨ Premium Required\n> The queue has reached the limit of **${QUEUE_LIMIT}** tracks.\n> Upgrade to **Premium** for an unlimited queue!`, 
                            flags: MessageFlags.Ephemeral 
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
            } else if (i.customId === 'sim_all') {
                // Instant Premium & Queue Limit Check (Zero Latency)
                const isPremium = client.db.isPremium(member.guild.id, user.id) || client.config.owners.includes(user.id);

                const QUEUE_LIMIT = 50;
                if (!isPremium && (player.queue.length + tracks.length) > QUEUE_LIMIT) {
                    return i.reply({ 
                        content: `### ✨ Premium Required\n> Adding all results would exceed the **${QUEUE_LIMIT}** track limit.\n> Upgrade to **Premium** for an unlimited queue!`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                // Fast Regex Clean
                tracks.forEach(t => {
                    t.title = metadata.cleanTitle(t.title);
                    t.author = metadata.cleanAuthor(t.author);
                });

                // Add to queue immediately
                tracks.forEach(t => player.queue.add(t));
                
                const success = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.check} Added all **${tracks.length}** similar tracks to queue.`)
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
