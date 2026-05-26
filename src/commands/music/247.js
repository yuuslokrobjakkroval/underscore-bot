const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: '247',
    description: 'Toggle 24/7 mode for the player.',
    premium: true,
    category: 'music',
    aliases: ['24/7', 'alwayson'],
    async execute(client, message, args) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) return;

        // Check if user is in the same VC
        const vc = message.member.voice.channel;
        if (!vc || vc.id !== player.voiceId) {
            return message.reply({ 
                content: 'You must be in the same voice channel as the bot to use this command!',
                ephemeral: true 
            });
        }

        // Toggle 24/7 mode
        player.data.twentyFourSeven = !player.data.twentyFourSeven;
        
        // Clear any existing leave timeout if 24/7 is enabled
        if (player.data.twentyFourSeven && player.data.leaveTimeout) {
            clearTimeout(player.data.leaveTimeout);
            player.data.leaveTimeout = null;
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> ${emojis.vinyl} **24/7 Mode:** ${player.data.twentyFourSeven ? 'Enabled' : 'Disabled'}\n` +
                    `> The bot will ${player.data.twentyFourSeven ? 'now stay in the voice channel forever.' : 'now leave automatically if alone.'}`
                )
            );

        return message.reply({
            content: null,
            components: [container.toJSON()],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
