const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { resolveMusicBot } = require('../../utils/botCoordinator');

module.exports = {
    name: 'join',
    description: 'Join your voice channel',
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join your voice channel'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const member = message.member;
        const vc = member.voice.channel;

        const createResponse = (text, isError = false) => {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : `> ${emojis.check} `}${text}`)
            );
            return { content: null, embeds: [], components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
        };

        if (!vc) return message.reply(createResponse('You need to be in a voice channel.', true));

        const botCheck = await resolveMusicBot(client, message);
        if (!botCheck.allowed) {
            if (botCheck.silent) return null;
            return message.reply(createResponse(botCheck.reason, true));
        }

        let player = client.manager.players.get(message.guild.id);
        if (player) return message.reply(createResponse('I am already in a voice channel.', true));

        player = await client.manager.createPlayer({
            guildId: message.guild.id,
            voiceId: vc.id,
            textId: message.channel.id,
            deaf: true
        });

        message.reply(createResponse(`Joined **${vc.name}**.`));
    }

};
