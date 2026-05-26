const autoplay = require('../../systems/autoplay');
const logger = require('../../utils/logger');
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'playerEmpty', // Kazagumo event when queue is empty
    async execute(client, player) {
        logger.info(`Queue ended in guild: ${player.guildId}`);

        // Cleanup current player message
        const message = player.data.message;
        if (message && message.deletable) {
            message.delete().catch(() => { });
            player.data.message = null;
        }

        // Handle Autoplay immediately if enabled (VIORA Style)
        if (player.data.autoplay) {
            const track = await autoplay.handleAutoplay(client, player);
            if (track) {
                logger.info(`Autoplay: Starting next track "${track.title}"`);
                return player.play(track);
            }
        }

        // If no autoplay or fallback failed
        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            const endMsg = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.blacklist} **Queue Finished.** Disconnecting soon due to inactivity.`)
            );
            channel.send({
                components: [endMsg.toJSON()],
                flags: MessageFlags.IsComponentsV2
            }).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 10000);
            }).catch(() => { });
        }

        // Auto-destroy player after 30 seconds of inactivity
        setTimeout(() => {
            if (!player.playing && player.queue.length === 0) {
                player.destroy();
                logger.info(`Player destroyed in ${player.guildId} (Inactivity)`);
            }
        }, 30000);
    }
};

