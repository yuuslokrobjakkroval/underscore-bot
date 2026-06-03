const Guild = require("../database/models/guild");
const User = require("../database/models/user");
const { isOwner } = require("./botAccess");

function getBotId(client) {
  return String(client.user?.id || client.config.clientId || "global");
}

function isActiveGrant(grant) {
  return !!(
    grant?.enabled &&
    (!grant.until || new Date(grant.until).getTime() > Date.now())
  );
}

function findGrant(grants = [], botId) {
  return grants.find((grant) => String(grant.botId) === String(botId));
}

async function getUser(userId) {
  return User.findOne({ userId: String(userId) });
}

async function getGuild(guildId) {
  if (!guildId) return null;
  return Guild.findOne({ guildId: String(guildId) });
}

async function hasUserPremium(client, userId, userData = null) {
  if (isOwner(client, userId)) return true;
  const user = userData || (await getUser(userId));
  return isActiveGrant(findGrant(user?.botPremiums, getBotId(client)));
}

async function hasGuildPremium(client, guildId, guildData = null) {
  const guild = guildData || (await getGuild(guildId));
  return isActiveGrant(findGrant(guild?.botPremiums, getBotId(client)));
}

async function hasPremium(client, guildId, userId, data = {}) {
  if (isOwner(client, userId)) return true;
  const [guildPremium, userPremium] = await Promise.all([
    hasGuildPremium(client, guildId, data.guildData),
    hasUserPremium(client, userId, data.userData),
  ]);
  return guildPremium || userPremium;
}

async function hasNoPrefix(client, userId, userData = null) {
  if (isOwner(client, userId)) return true;
  const user = userData || (await getUser(userId));
  return (
    isActiveGrant(findGrant(user?.botNoPrefixes, getBotId(client))) ||
    isActiveGrant(findGrant(user?.botPremiums, getBotId(client)))
  );
}

async function setUserGrant(userId, field, botId, enabled, until = null) {
  const user = await User.findOneAndUpdate(
    { userId: String(userId) },
    { $setOnInsert: { userId: String(userId) } },
    { upsert: true, new: true },
  );
  const grants = user[field] || [];
  const existing = findGrant(grants, botId);

  if (existing) {
    existing.enabled = enabled;
    existing.until = until;
  } else {
    grants.push({ botId: String(botId), enabled, until });
  }

  user[field] = grants;
  await user.save();
  return user;
}

async function setGuildPremium(guildId, botId, enabled, until = null, by = null) {
  const guild = await Guild.findOneAndUpdate(
    { guildId: String(guildId) },
    { $setOnInsert: { guildId: String(guildId) } },
    { upsert: true, new: true },
  );
  const grants = guild.botPremiums || [];
  const existing = findGrant(grants, botId);

  if (existing) {
    existing.enabled = enabled;
    existing.until = until;
    existing.by = by;
  } else {
    grants.push({ botId: String(botId), enabled, until, by });
  }

  guild.botPremiums = grants;
  await guild.save();
  return guild;
}

module.exports = {
  findGrant,
  getBotId,
  hasGuildPremium,
  hasNoPrefix,
  hasPremium,
  hasUserPremium,
  isActiveGrant,
  setGuildPremium,
  setUserGrant,
};
