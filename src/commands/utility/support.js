const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'support',
    description: 'Get the link to the support server',
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Get the link to the support server'),
    async execute(client, message, args) {
        const support = `https://discord.gg/89zjNQHehR`;
        
        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${emojis.navigation} Support Server\n> Need help or have suggestions? Join our community!`)
        ).addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Join Support')
                    .setURL(support)
                    .setStyle(ButtonStyle.Link)
            )
        );

        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
