const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: '8d',
    description: 'Toggle 8D filter',
    premium: true,
    data: new SlashCommandBuilder()
        .setName('8d')
        .setDescription('Toggle 8D filter'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const player = client.manager.players.get(guildId);
        if (!player) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} No music playing.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const current = player.data['8d'] || false;
        player.data['8d'] = !current;

        if (!current) {
            player.shoukaku.setFilters({
                rotation: { rotationHz: 0.2 }
            });
        } else {
            player.shoukaku.setFilters({});
        }

        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${emojis.check} 8D effect has been **${!current ? 'enabled' : 'disabled'}**.`)
        );
        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
