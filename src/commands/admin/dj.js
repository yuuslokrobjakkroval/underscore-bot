const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const Guild = require('../../database/models/guild');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'dj',
    description: 'Manage the DJ system',
    async execute(client, message, args) {
        const createResponse = (text, isError = false) => {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${isError ? `### ${emojis.error} Error\n> ` : `### ${emojis.config} DJ System\n> `}${text}`)
            );
            return { components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 };
        };

        if (!message.member.permissions.has('Administrator')) {
            return message.reply(createResponse('You need **Administrator** permissions to use this command.', true));
        }

        const sub = args[0]?.toLowerCase();

        if (sub === 'add' || sub === 'set') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            if (!role) return message.reply(createResponse('Please mention a role or provide a valid Role ID.', true));

            await Guild.findOneAndUpdate(
                { guildId: message.guild.id },
                { djRole: role.id },
                { upsert: true }
            );

            message.reply(createResponse(`Successfully set the DJ role to ${role}.`));
        } else if (sub === 'remove' || sub === 'reset') {
            await Guild.findOneAndUpdate(
                { guildId: message.guild.id },
                { $unset: { djRole: "" } }
            );
            message.reply(createResponse('Successfully removed the DJ role requirement.'));
        } else if (sub === 'list') {
            const data = await Guild.findOne({ guildId: message.guild.id });
            const currentRole = data?.djRole ? `<@&${data.djRole}>` : '`None`';
            message.reply(createResponse(`### ${emojis.admin} DJ Role List\n> **Primary Role:** ${currentRole}`));
        } else if (sub === 'mode') {
            message.reply(createResponse(`### ${emojis.admin} DJ Mode\n> DJ Mode is currently set to **Standard**. (Toggle coming soon)`));
        } else {
            const data = await Guild.findOne({ guildId: message.guild.id });
            const currentRole = data?.djRole ? `<@&${data.djRole}>` : '`None`';

            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${emojis.config} DJ System Status\n` +
                    `> **Current DJ Role:** ${currentRole}\n\n` +
                    `> **Commands:**\n` +
                    `╰ \`${client.config.prefix}dj set @Role\`\n` +
                    `╰ \`${client.config.prefix}dj reset\``
                )
            );
            message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
