const { EmbedBuilder } = require('discord.js');
let { settings } = require('./settings');

const defaultNumTeas = 10;

const boundaries = {
  pointsMin: 1,
  pointsMax: 100,
  timeMin: 3,
  timeMax: 50,
  hskMin: 1,
  hskMax: 6,
};

const hibiTeaEmbed = new EmbedBuilder()
.setColor(0x0099FF)
.setTitle('The Chrysanthemum Teaword will start!')
.setDescription('To participate, **react** on ✅')
.addFields(
  { name: '\u200B',
  // needs to be one line
  value: `**Goal:** Be the fastest to write an English definition for the word in Chinese.\n\n\n Settings during this cooldown:\n$pts <number> to redefine the number of points to reach (between ${boundaries.pointsMin} and ${boundaries.pointsMax}. Current: ${settings.pointsToWin})\n$time <number> to redefine the minimum response time, in seconds (between ${boundaries.timeMin} and ${boundaries.timeMax}. Current: 10)\n$hsk <number> to redefine the set of words used by the dictionary, with higher being more difficult (between ${boundaries.hskMin} and ${boundaries.hskMax}. Current: ${settings.hsk})\n\n\n You can stop the game for everyone with $exitgame`},
);

const reactionFilter = (reaction, user) => {
  return reaction.emoji.name === '✅' && !user.bot;
};


module.exports = {
  boundaries,
  defaultNumTeas,
  hibiTeaEmbed,
  settings,
  reactionFilter,
};