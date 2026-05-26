const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'invite',
    description: 'Get the invite link for Feather',
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the invite link for Feather'),
    async execute(client, message, args) {
        const invite = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${emojis.feather} Invite Feather\n> Add me to your server to enjoy high-quality music!`)
        ).addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Invite Now')
                    .setURL(invite)
                    .setStyle(ButtonStyle.Link)
            )
        );

        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
