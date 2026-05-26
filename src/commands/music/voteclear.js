const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'voteclear',
    description: 'Vote to clear the current queue',
    data: new SlashCommandBuilder()
        .setName('voteclear')
        .setDescription('Vote to clear the current queue'),
    async execute(client, message, args) {
        const isInteraction = !!message.options;
        const guildId = isInteraction ? message.guildId : message.guild.id;
        const user = isInteraction ? message.user : message.author;
        const player = client.manager.players.get(guildId);
        const createErr = (text) => ({
            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${emojis.error} ${text}`)).toJSON()],
            flags: MessageFlags.IsComponentsV2
        });

        if (!player) return message.reply(createErr('No music playing.'));

        const vc = message.member.voice.channel;
        if (!vc || vc.id !== player.voiceId) return message.reply(createErr('Join the bot\'s VC first.'));

        const members = vc.members.filter(m => !m.user.bot).size;
        const required = Math.ceil(members / 2);

        let votes = player.data.clearVotes || [];
        if (votes.includes(user.id)) return message.reply(createErr('Already voted!'));

        votes.push(user.id);
        player.data.clearVotes = votes;

        if (votes.length >= required) {
            player.queue.clear();
            player.data.clearVotes = [];
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${emojis.check} Queue clear vote passed! Queue has been emptied.`));
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        } else {
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> 🗳️ Clear vote added: \`${votes.length}/${required}\``));
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
