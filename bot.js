// Require the necessary discord.js classes
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');
const sqlite3 = require('sqlite3').verbose();
const path =  require('path');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, 
                                      GatewayIntentBits.GuildMessages, 
                                      GatewayIntentBits.MessageContent, 
                                      GatewayIntentBits.GuildMessageReactions] });
let db;

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
  db = new sqlite3.Database(path.join(__dirname, 'jmdict.sqlite'), sqlite3.OPEN_READONLY, () => {
    console.log('database loaded');
  });
});

// TODO: add readings and conjugations for kanji as separate optional parameters
function getMeaningsForKanji(kanji) {
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

function getMeaningsForKana(kana) {
  let meanings = [];
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM 'kanas' WHERE kana='${kana}'`, (err, row) => {
      if (err || !row) {
        reject('Error looking up kana')
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

function delay(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}


client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;


  switch (commandName) {
    case 'kanji':
      let kanji = options.getString('kanji');
      try {
        let meanings = await getMeaningsForKanji(kanji);
        await interaction.reply(`**Definitions for ${kanji}:**\n${meanings.join('\n')}`);
      } catch (e) {
        await interaction.reply(`Could not find meanings for the kanji: ${kanji}`)
      }
      break;
    case 'kana':
      let kana = options.getString('kana');
      try {
        let meanings = await getMeaningsForKana(kana);
        await interaction.reply(`**Definitions for ${kana}:**\n${meanings.join('\n')}`);
      } catch (e) {
        await interaction.reply(`Could not find meanings for the kana: ${kana}`)
      }
      break;
    case 'test':
      let usersInPlay = [];
      const exampleEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('The Hibiscus Teaword will start!')
      .setDescription('To participate, **react** on ✅')
      .addFields(
        { name: '\u200B',
        // needs to be one line
        value: `**Goal:** Be the fastest to write the kanji for the definition.\n\n\n Settings during this cooldown:\n$pts <number> to redefine the number of points to reach (between 1 and 100. Current: 5)\n$time <number> to redefine the minimum response time, in seconds (between 3 and 50. Current: 10)\n\n\n You can stop the game for everyone with $exitgame`},
      );

      // reply with embed and wait for reactions
      const message = await interaction.reply({ embeds: [exampleEmbed], fetchReply: true });
      message.react('✅');
      const filter = (reaction, user) => {
        return reaction.emoji.name === '✅' && !user.bot;
      };
      const collector = message.createReactionCollector({ filter, time: 15000 });
      collector.on('collect', (reaction, user) => {
        console.log(`Collected ${reaction.emoji.name} from ${user.id}`);
        usersInPlay.push(user.id);
      });

      // send another message afterward and constantly update it
      const channel = client.channels.cache.get(interaction.channelId)
      let numTeas = 12;
      let teaMsg;
      channel.send(':tea:'.repeat(numTeas))
        .then(async msg => {
          while (numTeas > 0) {
            await delay(2000);
            numTeas -= 2;
            teaMsg = ':tea:'.repeat(numTeas) + '<:empty:1028438609520508980>'.repeat(12 - numTeas)
            await msg.edit(teaMsg)
          }
        })
        .then(async () => {
          await delay(2000);
          if (!usersInPlay.length) {
            channel.send('No participants... I would have had time to prepare a fabulous tea.');
          } else {
            channel.send('Starting!')
          }
          collector.stop();
          const msgFilter = (msg) => {
            /* For some reason, the bot's messages come as the user who sent the initial command but with bot set to true*/
            return usersInPlay.includes(msg.author.id) && !msg.author.bot;
          }
          const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter })

          msgCollector.on('collect', (msg) => {
            if (msg.content === '$exitgame') {
              channel.send('All that for this...');
              msgCollector.stop();
            } else {
              // Do game
              console.log(`Collected ${msg.content}`)
            }
          })
        })
      break;
    }

})

client.login(token);

