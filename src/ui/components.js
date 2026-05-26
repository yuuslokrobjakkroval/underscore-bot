const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const emojis = require('../utils/emojis');

module.exports = {
    playerButtons: (paused = false) => {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setEmoji(emojis.backward)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('play_pause')
                    .setEmoji(paused ? emojis.play : emojis.pause)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setEmoji(emojis.stop)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setEmoji(emojis.forward)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop')
                    .setEmoji(emojis.loop)
                    .setStyle(ButtonStyle.Secondary)
            );
    }
};
