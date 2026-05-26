const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const util = require('util');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'eval',
    description: 'Evaluate JavaScript code (Developer Only)',
    async execute(client, message, args) {
        if (!client.config.owners.includes(message.author.id)) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} This command is restricted to bot developers.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        const code = args.join(' ');
        if (!code) {
            const errContainer = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> ${emojis.error} Please provide code to evaluate.`)
            );
            return message.reply({ components: [errContainer.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            let evaled = eval(code);
            if (evaled instanceof Promise) evaled = await evaled;

            let output = util.inspect(evaled, { depth: 0 });
            
            // Mask token
            output = output.replace(client.token, '「 MASKED TOKEN 」');

            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.config} Eval Output\n\`\`\`js\n${output.substring(0, 3000)}\n\`\`\``)
            );

            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const container = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.error} Eval Error\n\`\`\`js\n${error.message}\n\`\`\``)
            );
            return message.reply({ components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
