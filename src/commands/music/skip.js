const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

const createMsg = (text) => ({
    components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text)).toJSON()],
    flags: MessageFlags.IsComponentsV2
});

module.exports = {
    name: 'skip',
    aliases: ['s'],
    description: 'Skip the current song',
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    async execute(client, message, args) {
        try {
            const isInteraction = !!message.options;
            const guildId = isInteraction ? message.guildId : message.guild.id;
            const member = message.member;

            const player = client.manager.players.get(guildId);
            if (!player) {
                const res = createMsg(`> ${emojis.error} There is no music playing.`);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            const vc = member.voice.channel;
            if (!vc || vc.id !== player.voiceId) {
                const res = createMsg(`> ${emojis.error} You need to be in the same voice channel as the bot.`);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            player.skip();
            const res = createMsg(`> ${emojis.check} Skipped the current song.`);
            return isInteraction ? message.reply(res) : message.reply(res);
        } catch (err) {
            client.logger.error(`Skip Command Error: ${err.stack}`);
        }
    }
};
