const { EmbedBuilder } = require('discord.js');
let { settings } = require('./settings');

const defaultNumTeas = 10;

const boundaries = {
  pointsMin: 1,
  pointsMax: 100,
  timeMin: 3,
  timeMax: 50,
  commonnessMin: 0,
  commonnessMax: 40,
};

const hibiTeaEmbed = new EmbedBuilder()
.setColor(0x0099FF)
.setTitle('The Hibiscus Teaword will start!')
.setDescription('To participate, **react** on ✅')
.addFields(
  { name: '\u200B',
  // needs to be one line
  value: `**Goal:** Be the fastest to write a meaning for the kanji.\n\n\n Settings during this cooldown:\n$pts <number> to redefine the number of points to reach (between ${boundaries.pointsMin} and ${boundaries.pointsMax}. Current: ${settings.pointsToWin})\n$time <number> to redefine the minimum response time, in seconds (between ${boundaries.timeMin} and ${boundaries.timeMax}. Current: 10)\n$cmn <number> to redefine the commonness of words used by the dictionary (between ${boundaries.commonnessMin} and ${boundaries.commonnessMax}. Current: ${settings.commonness})\n\n\n You can stop the game for everyone with $exitgame`},
);

const readingEmbed = new EmbedBuilder()
.setColor(0x0099FF)
.setTitle('The Reading Word Game will start!')
.setDescription('To participate, **react** on ✅')
.addFields(
  { name: '\u200B',
  // needs to be one line
  value: `**Goal:** Be the fastest to write a reading for the kanji.\n\n\n Settings during this cooldown:\n$pts <number> to redefine the number of points to reach (between ${boundaries.pointsMin} and ${boundaries.pointsMax}. Current: ${settings.pointsToWin})\n$time <number> to redefine the minimum response time, in seconds (between ${boundaries.timeMin} and ${boundaries.timeMax}. Current: 10)\n$cmn <number> to redefine the commonness of words used by the dictionary (between ${boundaries.commonnessMin} and ${boundaries.commonnessMax}. Current: ${settings.commonness})\n\n\n You can stop the game for everyone with $exitgame`},
);

const reactionFilter = (reaction, user) => {
  return reaction.emoji.name === '✅' && !user.bot;
};


module.exports = {
  boundaries,
  defaultNumTeas,
  hibiTeaEmbed,
  readingEmbed,
  settings,
  reactionFilter,
};