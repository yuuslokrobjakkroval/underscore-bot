const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const User = require('../../database/models/user');
const emojis = require('../../utils/emojis');
const { hasPremium } = require('../../utils/entitlements');

module.exports = {
    name: 'playliked',
    description: 'Play all your liked songs',
    data: new SlashCommandBuilder()
        .setName('playliked')
        .setDescription('Play all your liked songs'),
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

        const Guild = require('../../database/models/guild');
        const guildData = await Guild.findOne({ guildId: message.guild.id });

        const isPremium = await hasPremium(client, message.guild.id, user.id, { guildData, userData }) || client.config.owners.includes(user.id);

        const LIKED_LIMIT = 20;
        let tracksToPlay = userData.likedSongs;
        let limitApplied = false;

        if (!isPremium && tracksToPlay.length > LIKED_LIMIT) {
            tracksToPlay = tracksToPlay.slice(0, LIKED_LIMIT);
            limitApplied = true;
        }

        const vc = message.member.voice.channel;
        if (!vc) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} You need to be in a voice channel.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        let player = client.manager.players.get(message.guild.id);
        if (!player) {
            player = await client.manager.createPlayer({
                guildId: message.guild.id,
                voiceId: vc.id,
                textId: message.channel.id,
                deaf: true
            });
        }

        let addedCount = 0;
        for (const trackData of tracksToPlay) {
            try {
                // Strategy 1: Search by URI (Precise)
                let result = await client.manager.search(trackData.uri, { requester: user });

                // Strategy 2: Fallback to Title + Author search if URI fails
                if (!result || !result.tracks || result.tracks.length === 0) {
                    const query = `${trackData.title} ${trackData.author}`;
                    result = await client.manager.search(query, { requester: user });
                }

                if (result && result.tracks && result.tracks.length > 0) {
                    player.queue.add(result.tracks[0]);
                    addedCount++;
                }
            } catch (err) {
                client.logger.error(`Failed to resolve liked track "${trackData.title}": ${err.message}`);
            }
        }

        if (addedCount > 0 && player.queue.length > 0) {
            if (!player.playing && !player.paused) player.play();
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> ${emojis.feather} Successfully queued **${addedCount}** liked songs.\n` +
                    (limitApplied ? `> ✨ *Premium required for more than **${LIKED_LIMIT}** songs.*` : '')
                )
            );
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        } else {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Could not resolve any of your liked songs for playback.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
