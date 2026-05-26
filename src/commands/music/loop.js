const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'loop',
    description: 'Toggle loop mode for current track or queue',
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('The loop mode to set')
                .addChoices(
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' },
                    { name: 'Off', value: 'off' }
                )),
    async execute(client, message, args) {
        try {
            const isInteraction = !!message.options;
            const guildId = isInteraction ? message.guildId : message.guild.id;
            const member = message.member;

            const player = client.manager.players.get(guildId);

            const createResponse = (text, isError = false) => {
                const container = new ContainerBuilder().addSectionComponents(
                    new SectionBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${isError ? `> ${emojis.error} ` : `> ${emojis.loop} `}${text}`)
                    )
                );
                return { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
            };

            if (!player) {
                const res = createResponse('${emojis.blacklist} There is no music playing.', true);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            const vc = member.voice.channel;
            if (!vc || vc.id !== player.voiceId) {
                const res = createResponse('${emojis.blacklist} You need to be in the same voice channel as the bot.', true);
                return isInteraction ? message.reply(res) : message.reply(res);
            }

            const mode = isInteraction ? message.options.getString('mode') : args[0]?.toLowerCase();

            if (mode === 'track' || mode === 'song') {
                player.setLoop('TRACK');
                const res = createResponse('Looping the current **track**.');
                return isInteraction ? message.reply(res) : message.reply(res);
            } else if (mode === 'queue' || mode === 'all') {
                player.setLoop('QUEUE');
                const res = createResponse('Looping the entire **queue**.');
                return isInteraction ? message.reply(res) : message.reply(res);
            } else if (mode === 'off' || mode === 'none') {
                player.setLoop('NONE');
                const res = createResponse('Looping is now **disabled**.');
                return isInteraction ? message.reply(res) : message.reply(res);
            } else {
                // Cycle through modes if no arg provided
                let res;
                if (player.loop === 'NONE') {
                    player.setLoop('TRACK');
                    res = createResponse('Looping the current **track**.');
                } else if (player.loop === 'TRACK') {
                    player.setLoop('QUEUE');
                    res = createResponse('Looping the entire **queue**.');
                } else {
                    player.setLoop('NONE');
                    res = createResponse('Looping is now **disabled**.');
                }
                return isInteraction ? message.reply(res) : message.reply(res);
            }
        } catch (err) {
            client.logger.error(`Loop Command Error: ${err.stack}`);
        }
    }
};
