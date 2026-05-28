const Guild = require("../../database/models/guild");

module.exports = {
  name: "guildMemberUpdate",

  async execute(client, oldMember, newMember) {
    if (newMember.id !== client.user.id) return;
    if (oldMember.nickname === newMember.nickname) return;

    const guildData = await Guild.findOne({ guildId: newMember.guild.id });
    if (!guildData?.settings?.botNicknameLocked) return;

    const lockedNickname = guildData.settings.botNickname || null;

    if (newMember.nickname === lockedNickname) return;

    await newMember
      .setNickname(lockedNickname, "Bot nickname lock is enabled")
      .catch((error) => {
        client.logger.warn(
          `[NICKLOCK] Failed to restore nickname in ${newMember.guild.id}: ${error.message}`,
        );
      });
  },
};
