const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('./emojis');

/**
 * Standard CV2 Response Generator
 * Utilizes VIORA's strict .toJSON() requirement and blockquote indentation for a premium look.
 * Note: ContainerBuilder handles pure text without requiring SectionBuilder/Accessory.
 */
const createCV2Response = (content) => {
    try {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(content || '...')
            );

        return {
            components: [container.toJSON()],
            flags: MessageFlags.IsComponentsV2
        };
    } catch (error) {
        console.error('Error creating CV2 response:', error);
        return { content: content || 'Error creating response' };
    }
};

module.exports = {
    music: (content) => createCV2Response(`> ${emojis.music} Music | ${content}`),
    success: (content) => createCV2Response(`> ${emojis.check} | ${content}`),
    error: (content) => createCV2Response(`> ${emojis.error} Error | ${content}`)
};
