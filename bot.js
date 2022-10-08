const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const sqlite3 = require('sqlite3').verbose();
const path =  require('path');

// Configure logger settings

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';
let db;

// Initialize Discord Bot

const bot = new Discord.Client({
  token: auth.token,
  autorun: true
});

bot.on('ready', function (evt) {
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
  db = new sqlite3.Database(path.join(__dirname, 'jmdict.sqlite'), sqlite3.OPEN_READONLY, () => {
    console.log('database loaded');
  });
});


function sendMessage(channelID, message) {
  bot.sendMessage({
    to: channelID,
    message
  });
}

function getMeanings(kanji) {
  let meanings = [];
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM 'kanjis' WHERE kanji='${kanji}'`, (err, row) => {
      console.log(row.ent_seq);
      db.all(`SELECT * FROM 'meanings' WHERE ent_seq=${row.ent_seq} AND lang=0`, (err1, rows) => {
        for (let row of rows) {
          meanings.push(row.meaning)
        }
        console.log(meanings);
        if (err || err1) {
          reject(`Error in getMeanings`);
        } else {
          resolve(meanings);
        }
      });
    });
  })

}

bot.on('message', async function (user, userID, channelID, message, evt) {
  if (message.substring(0,1) === '!') {

    var args = message.substring(1).split(' ');
    var cmd = args[0];

    args = args.splice(1);
    switch(cmd) {
      case 'kanji':
        console.log(`user ${user}, message: ${message}, channelId ${channelID} `);
        let meanings = await getMeanings(args[0]);
        console.log(meanings);
        sendMessage(channelID, meanings);
        break;
    }
  }
});