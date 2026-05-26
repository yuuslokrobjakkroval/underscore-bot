const playerUI = require('../../ui/playerUI');
const metadata = require('../../utils/metadata');
const resolver = require('../../utils/resolver');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'playerStart', // Kazagumo event name
    async execute(client, player, track) {
        client.logger.info(`Track started: ${track.title} in guild ${player.guildId}`);
        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        // Elite Metadata Wash before UI display
        await resolver.washTrack(track);

        // Set VC Status
        const voiceChannel = client.channels.cache.get(player.voiceId);
        if (voiceChannel && typeof voiceChannel.setStatus === 'function') {
            voiceChannel.setStatus(`${emojis.feather} Playing: ${track.title}`).catch(() => { });
        }

        // Store for autoplay reference
        player.data.lastTrack = track;
        // ... (rest of file)

        // Learn Taste: Update History & Top Charts (Atomic Updates)
        const User = require('../../database/models/user');
        const Guild = require('../../database/models/guild');
        const requesterId = track.requester?.id;

        if (requesterId) {
            // Update User Taste
            User.findOneAndUpdate(
                { userId: requesterId },
                { 
                    $push: { history: { $each: [{ title: track.title, author: track.author, uri: track.uri }], $slice: -10 } },
                    $inc: { [`topArtists.${track.author.replace(/\./g, '_')}`]: 1 } // Mongo keys can't have dots
                },
                { upsert: true }
            ).catch(err => client.logger.error(`User History Error: ${err.message || JSON.stringify(err)}`));
        }

        // Update Guild Taste
        Guild.findOneAndUpdate(
            { guildId: player.guildId },
            { $inc: { [`topArtists.${track.author.replace(/\./g, '_')}`]: 1 } },
            { upsert: true }
        ).catch(err => client.logger.error(`Guild History Error: ${err.message || JSON.stringify(err)}`));

        const ui = playerUI.createPlayerEmbed(player);
        const oldMessage = player.data.message;

        try {
            // Delete old message in background to avoid blocking the new UI
            if (oldMessage && oldMessage.deletable) {
                oldMessage.delete().catch(() => { });
            }

            // Send new UI immediately
            const newMsg = await channel.send(ui);
            player.data.message = newMsg;
        } catch (error) {
            client.logger.error(`Error handling player message: ${error.message || JSON.stringify(error)}`);
        }
    }
};
