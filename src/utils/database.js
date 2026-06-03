const mongoose = require('mongoose');
const Guild = require('../database/models/guild');
const User = require('../database/models/user');
const logger = require('./logger');

/**
 * 🚀 High-Speed Database Manager
 * Caches premium and settings in memory for 0ms lookup latency.
 */
class DatabaseManager {
    constructor() {
        this.guildCache = new Map();
        this.userCache = new Map();
        this.isReady = false;
    }

    async connect() {
        if (this.isReady) return;
        
        try {
            // Preload caches
            const guilds = await Guild.find({});
            const users = await User.find({});
            
            guilds.forEach(g => this.guildCache.set(g.guildId, g));
            users.forEach(u => this.userCache.set(u.userId, u));
            
            this.isReady = true;
            logger.info(`Database cache initialized: ${this.guildCache.size} guilds, ${this.userCache.size} users.`);
        } catch (err) {
            logger.error(`Database cache error: ${err.message}`);
        }
    }

    getGuild(guildId) {
        return this.guildCache.get(guildId) || { guildId };
    }

    getUser(userId) {
        return this.userCache.get(userId) || { userId };
    }

    isPremium(guildId, userId, botId = 'global') {
        const guild = this.getGuild(guildId);
        const user = this.getUser(userId);

        const isActive = (grant) => !!(grant?.enabled && (!grant.until || new Date(grant.until).getTime() > Date.now()));
        const guildPremium = isActive((guild.botPremiums || []).find(grant => String(grant.botId) === String(botId)));
        const userPremium = isActive((user.botPremiums || []).find(grant => String(grant.botId) === String(botId)));
        
        return !!(guildPremium || userPremium);
    }

    // Refresh cache periodically or on update
    async refresh(guildId, userId) {
        if (guildId) {
            const g = await Guild.findOne({ guildId });
            if (g) this.guildCache.set(guildId, g);
        }
        if (userId) {
            const u = await User.findOne({ userId });
            if (u) this.userCache.set(userId, u);
        }
    }
}

module.exports = new DatabaseManager();
