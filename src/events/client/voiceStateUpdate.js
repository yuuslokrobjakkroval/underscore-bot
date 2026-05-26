const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        const guildId = oldState.guild.id;
        const player = client.manager.players.get(guildId);
        if (!player) return;

        const textChannel = client.channels.cache.get(player.textId);

        // 1. Handling Bot's Own State Changes (Disconnects/Moves)
        if (oldState.member.id === client.user.id) {
            // Manual Disconnection (Bot left or was kicked)
            if (!newState.channelId) {
                // Clear VC Status regardless
                const voiceChannel = client.channels.cache.get(oldState.channelId);
                if (voiceChannel && typeof voiceChannel.setStatus === 'function') {
                    voiceChannel.setStatus('').catch(() => { });
                }

                if (player.data.twentyFourSeven) {
                    client.logger.info(`24/7 Mode Active: Rejoining VC in ${oldState.guild.name}.`);
                    // Create a new player/connection to rejoin
                    await client.manager.createPlayer({
                        guildId: guildId,
                        voiceId: oldState.channelId,
                        textId: player.textId,
                        deaf: true
                    });
                    if (textChannel) {
                        textChannel.send({
                            content: null,
                            components: [new ContainerBuilder().addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`> ${emojis.vinyl} **24/7 Mode:** Rejoined vc automatically.`)
                            ).toJSON()],
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => { });
                    }
                } else {
                    client.logger.info(`Bot manually disconnected from VC in ${oldState.guild.name}. Destroying player.`);
                    player.destroy().catch(() => { });
                }
                return;
            }
        }

        // 2. Handling Member Count (Alone Logic)
        const botChannelId = player.voiceId;
        const botChannel = newState.guild.channels.cache.get(botChannelId);

        if (botChannel) {
            const humans = botChannel.members.filter(m => !m.user.bot);

            if (humans.size === 0) {
                // Bot is alone
                if (!player.paused) {
                    player.pause(true);
                    player.data.pausedByAlone = true;
                    if (textChannel) {
                        textChannel.send({
                            content: null,
                            components: [new ContainerBuilder().addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`> ${emojis.pause} **Alone in VC:** Music paused.`)
                            ).toJSON()],
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => { });
                    }
                }

                // Start 60s timeout if not 24/7
                if (!player.data.twentyFourSeven && !player.data.leaveTimeout) {
                    player.data.leaveTimeout = setTimeout(async () => {
                        const currentPlayer = client.manager.players.get(guildId);
                        if (currentPlayer && currentPlayer.voiceId === botChannelId) {
                            const stillAlone = botChannel.members.filter(m => !m.user.bot).size === 0;
                            if (stillAlone) {
                                if (textChannel) {
                                    textChannel.send({
                                        content: null,
                                        components: [new ContainerBuilder().addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(`> ${emojis.error} **Auto-Leave:** Left voice channel as no one joined again.`)
                                        ).toJSON()],
                                        flags: MessageFlags.IsComponentsV2
                                    }).catch(() => { });
                                }
                                currentPlayer.destroy().catch(() => { });
                            }
                        }
                    }, 60000);
                }
            } else {
                // Humans joined
                if (player.paused && player.data.pausedByAlone) {
                    player.pause(false);
                    player.data.pausedByAlone = false;
                    if (textChannel) {
                        textChannel.send({
                            content: null,
                            components: [new ContainerBuilder().addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`> ${emojis.play} **Welcome Back:** Resuming music.`)
                            ).toJSON()],
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => { });
                    }
                }

                // Clear leave timeout if humans joined
                if (player.data.leaveTimeout) {
                    clearTimeout(player.data.leaveTimeout);
                    player.data.leaveTimeout = null;
                }
            }
        }
    }
};
