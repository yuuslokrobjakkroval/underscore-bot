const mongoose = require('mongoose');

const BotAssignmentSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    voiceId: { type: String, required: true },
    botId: { type: String, required: true },
    botTag: { type: String, default: null },
    expiresAt: { type: Date, required: true },
}, {
    timestamps: true
});

BotAssignmentSchema.index({ guildId: 1, voiceId: 1 }, { unique: true });
BotAssignmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BotAssignment', BotAssignmentSchema);
