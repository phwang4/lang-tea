const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');

// Configure logger settings

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot

const bot = new Discord.Client({
  token: auth.token,
  autorun: true
});

bot.on('ready', function (evt) {
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
});


function sendMessage(channelID, message) {
  bot.sendMessage({
    to: channelID,
    message
  });
}

bot.on('message', function (user, userID, channelID, message, evt) {
  if (message.substring(0,1) === '!') {

    var args = message.substring(1).split(' ');
    var cmd = args[0];

    args = args.splice(1);
    switch(cmd) {
      case 'ping':
        console.log(`user ${user}, message: ${message}, channelId ${channelID} `);
        sendMessage(channelID, 'Pong!');
        break;
    }
  }
});