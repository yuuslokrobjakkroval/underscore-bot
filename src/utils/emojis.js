/**
 * Centralized emoji registry for Feather Bot.
 * All Discord custom emojis are defined here — edit IDs in one place.
 */
const emojis = {
  // ── Player Controls ──────────────────────────────────────────────────────
  backward: "<a:backwardsParrot:1508854537522384931> ",
  play: "<:icons_play:1500920780312285386>",
  pause: "<:pause:1500921090187202761>",
  stop: "<:stop:1500921641826258958>",
  forward: "<:e_blackforward:1500921177613537362>",
  loop: "<:black_update:1500921989248979115>",
  shuffle: "<:shuffle:1500931193300844795>",
  volume: "<:Black_Volume:1500931980014129225>",
  vinyl: "<a:black_vinyl:1500920467379191990>", // animated spinning vinyl

  // ── Status / Feedback ────────────────────────────────────────────────────
  check: "<:check_black:1500924675511812208>",
  error: "<:wrong:1500917527918678147>",
  blacklist: "<:blacklist:1500921270378959000>",
  delete: "<:Delete:1500925771437314099>",

  // ── Branding / Navigation ────────────────────────────────────────────────
  feather: "<a:peachy:1459255820431921387>",
  music: "<:music:1500923048646152284>",
  navigation: "<:icons_navigation:1500937486107410542>",
  search: "<:search:1500924349878632509>",
  lyrics: "<:lyrics:1500943407827128372>",

  // ── Admin / Config ───────────────────────────────────────────────────────
  admin: "<:admin:1500924079857864724>",
  config: "<:black_config:1500924211437371602>",

  // ── Stats (three distinct emoji IDs) ────────────────────────────────────
  statsDev: "<:stats:1500932574539944039>", // developer tier badge in /profile
  statsBot: "<:stats:1500932679275909224>", // bot info header in /stats
  statsSec: "<:stats:1500933201433067520>", // statistics section header in /stats

  // ── Social / Profile ─────────────────────────────────────────────────────
  heart: "<a:r_heart_black_1:1500923805244063786>",
  file: "<:file:1505918548977909851>",
  agHeart: "<:ag_black_heart:1505919003774816417>",
  hpBar: "<a:hs_blackhp:1505919340158128288>",
  musicAnim: "<a:music:1505920391519010977>", // animated music note (different from static)
  nowPlaying: "<a:hizumi_playing:1500920010300719124>",
  vibe: "<a:vibe:1505923405420167178>",

  // ── Animated / Effects ───────────────────────────────────────────────────
  thunder: "<a:Black_Thunder:1500932956632383548>",
  blackdot: "<a:blackdot:1500917796140351578>",
  rebooting: "<a:black_update:1500921989248979115>", // animated loop used in reboot text

  // ── Ranks ────────────────────────────────────────────────────────────────
  rankBronze: "<:Bronze:1505922764551360632>",
  rankSilver: "<:silver:1505922786785230878>",
  rankGold: "<:GoldRank:1505922805567455363>",
  rankDiamond: "<:diamond_rank:1505922821304352819>",
};

module.exports = emojis;
