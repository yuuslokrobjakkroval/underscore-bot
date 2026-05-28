const BotSettings = require("../database/models/botSettings");

const GLOBAL_KEY = "global";
const VALID_MODES = ["public", "private"];

const normalizeOwners = (owners = []) =>
  [...new Set(owners.map((id) => String(id).trim()).filter(Boolean))];

async function getSettings(seedOwners = []) {
  let settings = await BotSettings.findOne({ key: GLOBAL_KEY });
  const owners = normalizeOwners(seedOwners);

  if (!settings) {
    settings = await BotSettings.create({
      key: GLOBAL_KEY,
      mode: "public",
      owners,
    });
  } else if (!settings.owners?.length && owners.length) {
    settings.owners = owners;
    await settings.save();
  }

  return settings;
}

async function syncClientAccess(client) {
  const envOwners = normalizeOwners(client.config.envOwners || client.config.owners);
  const settings = await getSettings(envOwners);
  const mergedOwners = normalizeOwners([...envOwners, ...(settings.owners || [])]);

  if (mergedOwners.length !== normalizeOwners(settings.owners).length) {
    settings.owners = mergedOwners;
    await settings.save();
  }

  client.config.owners = mergedOwners;
  client.config.botMode = settings.mode;
  return settings;
}

function isOwner(client, userId) {
  return client.config.owners.includes(String(userId));
}

function isPrivate(client) {
  return client.config.botMode === "private";
}

async function setMode(client, mode) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid bot mode: ${mode}`);
  }

  const settings = await getSettings(client.config.envOwners || client.config.owners);
  settings.mode = mode;
  await settings.save();
  await syncClientAccess(client);
  return settings;
}

async function addOwner(client, userId) {
  const settings = await getSettings(client.config.envOwners || client.config.owners);
  const owners = normalizeOwners([...settings.owners, userId]);
  settings.owners = owners;
  await settings.save();
  await syncClientAccess(client);
  return settings;
}

async function removeOwner(client, userId) {
  const targetId = String(userId);
  const envOwners = normalizeOwners(client.config.envOwners || []);
  if (envOwners.includes(targetId)) {
    throw new Error("Owners from OWNER_ID cannot be removed with this command.");
  }

  const settings = await getSettings(envOwners.length ? envOwners : client.config.owners);
  const owners = normalizeOwners(settings.owners).filter((id) => id !== targetId);

  if (owners.length === normalizeOwners(settings.owners).length) {
    return { settings, removed: false };
  }

  if (owners.length === 0) {
    throw new Error("You cannot remove the last bot owner.");
  }

  settings.owners = owners;
  await settings.save();
  await syncClientAccess(client);
  return { settings, removed: true };
}

module.exports = {
  addOwner,
  getSettings,
  isOwner,
  isPrivate,
  removeOwner,
  setMode,
  syncClientAccess,
  VALID_MODES,
};
