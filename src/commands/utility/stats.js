const { SlashCommandBuilder, version, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags, ThumbnailBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'stats',
    aliases: ['botinfo', 'info', 'ping'],
    description: 'Show real-time bot statistics and exact latency',
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show real-time bot statistics and exact latency'),
    async execute(client, message, args) {
        try {
            const isInteraction = !!message.options;
            const user = isInteraction ? message.user : message.author;

            // 1. Exact Latency Calculation
            const latency = isInteraction ? Date.now() - message.createdTimestamp : Date.now() - message.createdTimestamp;
            const apiLatency = Math.round(client.ws.ping);

            // 2. Real-Time Uptime using Discord Timestamp
            const startTimeSeconds = Math.floor((Date.now() - client.uptime) / 1000);
            const uptimeText = `<t:${startTimeSeconds}:R>`;

            const guilds = client.guilds.cache.size;
            const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const nodeVersion = process.version;

            const container = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${emojis.statsBot} Feather Information`),
                            new TextDisplayBuilder().setContent(
                                `### ${emojis.thunder} Performance\n` +
                                `> **Latency:** \`${latency}ms\`\n` +
                                `> **API Latency:** \`${apiLatency}ms\`\n` +
                                `> **Online Since:** ${uptimeText}\n\n` +
                                `### ${emojis.statsSec} Statistics\n` +
                                `> **Guilds:** \`${guilds.toLocaleString()}\`\n` +
                                `> **Users:** \`${users.toLocaleString()}\`\n` +
                                `> **Memory:** \`${memory} MB\`\n` +
                                `> **Engine:** \`Node.js ${nodeVersion}\` · \`D.JS v${version}\``
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL()))
                );

            const res = {
                components: [container.toJSON()],
                flags: MessageFlags.IsComponentsV2
            };

            isInteraction ? message.reply(res) : message.reply(res);
        } catch (error) {
            client.logger.error(`Stats command error: ${error.stack}`);
        }
    }
};
