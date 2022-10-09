// Require the necessary discord.js classes
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');
const sqlite3 = require('sqlite3').verbose();
const path =  require('path');
const stringSimilarity = require("string-similarity");

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, 
                                      GatewayIntentBits.GuildMessages, 
                                      GatewayIntentBits.MessageContent, 
                                      GatewayIntentBits.GuildMessageReactions] });
const defaultNumTeas = 4; // lower when debugging
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

function getRandomMeaningFromDict() {
  let solution;
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM 'meanings' WHERE lang=0 ORDER BY RANDOM()`, (err, row) => {
      if (err || !row) {
        reject('Error looking up kana')
        return;
      } 
      db.get(`SELECT * FROM 'kanjis' WHERE ent_seq=${row.ent_seq}`, async (err1, kanjiRow) => {
        if (err1) {
          reject(`Error looking up meaning in kanji. ${solution}`);
          return;
        } else if (!kanjiRow) {
          db.get(`SELECT * FROM 'kanas' WHERE ent_seq=${row.ent_seq}`, async (err1, kanaRow) => {
            if (err1) {
              reject(`Error looking up meaning in kana. ${solution}`);
              return;
            } else {
              solution = await getMeaningsForKana(kanaRow.kana);
              resolve({word: kanaRow.kana, solution});
            }
          });
        } else {
          solution = await getMeaningsForKanji(kanjiRow.kanji);
          resolve({word: kanjiRow.kanji, solution});
        }
      });
    });
  })
}


client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;
  const subCommand = options._subcommand;

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
    case 'randm':
      try {
        const {solution, word} = await getRandomMeaningFromDict();
        await interaction.reply(`Here is a random word with one meaning: ${word} - ${solution.join(', ')}`);
      } catch (e) {
        await interaction.reply(`Could not find a random meaning. ${e.message}`)
      }
      break;
    case 'wordgames':
      if (subCommand === 'hibitea') {} // wrap this whole thing when u make another game
      let usersInPlay = [];
      let word, solutions;
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
      let numTeas = defaultNumTeas;
      let teaMsg;
      channel.send(':tea:'.repeat(numTeas))
        .then(async msg => {
          while (numTeas > 0) {
            await delay(2000);
            numTeas -= 2;
            teaMsg = ':tea:'.repeat(numTeas) + '<:empty:1028438609520508980>'.repeat(defaultNumTeas - numTeas)
            await msg.edit(teaMsg)
          }
        })
        .then(async () => {
          await delay(2000);
          if (!usersInPlay.length) {
            channel.send('No participants... I would have had time to prepare a fabulous tea.');
            collector.stop();
            return;
          } else {
            channel.send('Starting!')
          }
          collector.stop();
          const msgFilter = (msg) => {
            /* For some reason, the bot's messages come as the user who sent the initial command but with bot set to true*/
            return usersInPlay.includes(msg.author.id) && !msg.author.bot;
          }
          const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter })

          let answers = [];
          msgCollector.on('collect', async (msg) => {
            if (msg.content === '$exitgame') {
              channel.send('All that for this...');
              msgCollector.stop();
            } else {
              console.log(`Collected ${msg.content}, solution is ${solutions}`)
              let similarity = 0;
              let maxSimilarityMap = {max: 0, word: ''};
              for (meaning of solutions) {
                similarity = stringSimilarity.compareTwoStrings(meaning.toLowerCase(), msg.content.toLowerCase())
                if (similarity >= .75) {
                  points++;
                  channel.send(`good job!`); // also send potential solutions
                  console.log(`We thought you said ${meaning} at similarity ${similarity}`)
                              // TODO: react to msg and give points to correct person
                  channel.send(`**All meanings are:** \n${solutions.join('\n')}`);
                  time = 1; // don't want to catch it while it's decrementing
                  await delay(3000); // give some time for users to see the meanings
                  break;
                } else { // for logging
                  if (similarity > maxSimilarityMap.max) {
                    maxSimilarityMap.max = similarity;
                    maxSimilarityMap.word = msg.content;
                  }
                }
              }
              if (maxSimilarityMap.max)
              // channel.send(`similarity is ${maxSimilarityMap.max}`);
            }
          })
          let points = 0;
          let time = 10;

          // do game until msgCollector stops or maxPoints reached
          while (points < 5) {
            time = 10;
            let temp = await getRandomMeaningFromDict();
            word = temp.word;
            solutions = temp.solution;
            let timerMsg = await channel.send(':tea:'.repeat(time))
            channel.send(`Find one meaning for the word: ${word}`)
            while (time > 0) {
              await delay(1000);
              time -= 1;
              teaMsg = ':tea:'.repeat(time) + '<:empty:1028438609520508980>'.repeat(10 - time)
              await timerMsg.edit(teaMsg)
            }
          }
          msgCollector.stop();
          channel.send(`You did it!`);
        });
      break;
    }
});

client.login(token);

