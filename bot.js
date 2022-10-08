// Require the necessary discord.js classes
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const sqlite3 = require('sqlite3').verbose();
const path =  require('path');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let db;

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
  db = new sqlite3.Database(path.join(__dirname, 'jmdict.sqlite'), sqlite3.OPEN_READONLY, () => {
    console.log('database loaded');
  });
});

function getMeanings(kanji) {
  let meanings = [];
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM 'kanjis' WHERE kanji='${kanji}'`, (err, row) => {
      if (err || !row) {
        reject('Error looking up kanji')
        return;
      }
      db.all(`SELECT * FROM 'meanings' WHERE ent_seq=${row.ent_seq} AND lang=0`, (err1, rows) => {
        for (let row of rows) {
          meanings.push(row.meaning)
        }
        if (err1 || !rows) {
          reject(`Error looking up meaning`);
          return;
        } else {
          resolve(meanings);
        }
      });
    });
  })
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;
  // console.log(interaction);
  console.log(options.getString('kanji'));

  if (commandName === 'kanji') {
    let kanji = options.getString('kanji');
    try {
      let meanings = await getMeanings(kanji);
      await interaction.reply(`**Definitions for ${kanji}:**\n${meanings.join('\n')}`);
    } catch (e) {
      await interaction.reply(`Could not find meanings for the kanji: ${kanji}`)
    }
  }
})

client.login(token);

