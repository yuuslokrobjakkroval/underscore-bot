const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const Spotify = require('kazagumo-spotify');
const logger = require('../utils/logger');
const db = require('../utils/database');
const config = require('../config/bot');
const nodes = require('../config/lavalink');
const spotifyConfig = require('../config/spotify');
const { syncClientAccess } = require('../utils/botAccess');
const path = require('path');
const fs = require('fs');

class FeatherClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates
            ],
            presence: {
                status: 'idle'
            }
        });

        this.config = config;
        this.commands = new Collection();
        this.logger = logger;
        this.db = db;

        this.manager = new Kazagumo({
            defaultSearchEngine: 'youtube_music',
            plugins: [
                new Spotify({
                    clientId: spotifyConfig.clientId,
                    clientSecret: spotifyConfig.clientSecret
                })
            ],
            send: (guildId, payload) => {
                const guild = this.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
        }, new Connectors.DiscordJS(this), nodes);

        this.manager.shoukaku.on('ready', (name) => this.logger.info(`[LAVALINK] Node "${name}" is ready.`));
        this.manager.shoukaku.on('error', (name, error) => this.logger.error(`[LAVALINK] Node "${name}" encountered an error: ${error}`));
        this.manager.shoukaku.on('close', (name, code, reason) => this.logger.warn(`[LAVALINK] Node "${name}" closed. Code: ${code}, Reason: ${reason}`));
        this.manager.shoukaku.on('disconnect', (name, players, moved) => this.logger.warn(`[LAVALINK] Node "${name}" disconnected. Players: ${players.length}, Moved: ${moved}`));
        this.manager.shoukaku.on('debug', (name, info) => {
            if (info.includes('Failed to connect')) this.logger.error(`[LAVALINK] Node "${name}" debug: ${info}`);
        });
    }

    async initHandlers() {
        // Use for...of to correctly await async handlers (like commandHandler with auto-deploy)
        const handlers = ['commandHandler', 'eventHandler'];
        for (const handler of handlers) {
            await require(`../handlers/${handler}`)(this);
        }
    }

    async start() {
        await require('../database/connection')();
        await syncClientAccess(this);
        await this.initHandlers(); // Load commands and deploy slash commands
        await this.login(this.config.token);
    }
}

module.exports = FeatherClient;
