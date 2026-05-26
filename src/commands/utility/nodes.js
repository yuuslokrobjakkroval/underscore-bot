const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'nodes',
    description: 'Check Lavalink node status',
    data: new SlashCommandBuilder()
        .setName('nodes')
        .setDescription('Check Lavalink node status'),
    async execute(client, message, args) {
        const nodes = client.manager.shoukaku.nodes;
        let nodeInfo = `### ${emojis.heart} Lavalink Nodes\n`;

        nodes.forEach((node, name) => {
            const status = node.state === 1 ? '🟢 Online' : '🔴 Offline';
            nodeInfo += `> **${name}:** ${status} · \`${node.stats?.players || 0}\` players\n`;
        });

        const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(nodeInfo)
        );

        return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
    }
};
