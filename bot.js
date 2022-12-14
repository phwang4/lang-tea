// Require the necessary discord.js classes
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const sqlite3 = require('sqlite3').verbose();
const path =  require('path');
const stringSimilarity = require("string-similarity");
const {
  boundaries,
  defaultNumTeas, 
  hibiTeaEmbed,
  readingEmbed,
  reactionFilter,
} = require('./constants');

let { 
  settings
} = require('./settings');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, 
                                      GatewayIntentBits.GuildMessages, 
                                      GatewayIntentBits.MessageContent, 
                                      GatewayIntentBits.GuildMessageReactions] });

/* For keeping track of things.*/
let addPoint;
let currentPoints;
let solutions = [];
let usersInPlay;
let idToNameMap;
let word;
let hasStarted;
let answerTime;

let db;

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
  db = new sqlite3.Database(path.join(__dirname, 'jmdict.sqlite'), sqlite3.OPEN_READONLY, () => {
    console.log('database loaded');
  });
});


function delay(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
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
        const {solutions, word} = await getRandomMeaningFromDict();
        await interaction.reply(`Here is a random word with meanings: ${word} - ${solutions.join(', ')}`);
      } catch (e) {
        await interaction.reply(`Could not find a random meaning. ${e.message}`)
      }
      break;
    case 'randr':
      try {
        const {solutions, word} = await getRandomReadingFromDict();
        await interaction.reply(`Here is a random word with readings: ${word} - ${solutions.join(', ')}`);
      } catch (e) {
        await interaction.reply(`Could not find a random reading. ${e.message}`)
      }
      break;
    case 'wordgames':
      let embed;
      let lookupFunc;
      let similarityMinimum;
      let gameMsg;
      switch(subCommand) {
        case 'hibitea':
          embed = hibiTeaEmbed;
          lookupFunc = getRandomMeaningFromDict;
          similarityMinimum = 0.75;
          gameMsg = `Find one meaning for the word: `;
          break;
        case 'reading':
          embed = readingEmbed;
          lookupFunc = getRandomReadingFromDict;
          similarityMinimum = .9;
          gameMsg = `Find one reading for the word: `
          break;
      }
      usersInPlay = new Map();
      idToNameMap = new Map();
      hasStarted = false;
      addPoint = [];
      currentPoints = 0;
      const channel = client.channels.cache.get(interaction.channelId)

      // reply with embed and wait for reactions
      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      message.react('???');
      const collector = message.createReactionCollector({ reactionFilter, time: defaultNumTeas * 1000 });

      collector.on('collect', (reaction, user) => {
        console.log(`Collected ${reaction.emoji.name} from ${user.id}`);
        if (!user.bot) { // initial react gets past the filter for some reason
          usersInPlay.set(user.id, 0);
          idToNameMap.set(user.id, user.username);
        }
      });

      const msgFilter = (msg) => {
        return usersInPlay.has(msg.author.id) && !msg.author.bot;
      }
      const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter })

      collectMessages(msgCollector, channel, similarityMinimum);

      // send another message afterward and constantly update it
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
          if (!usersInPlay.size) {
            channel.send('No participants... I would have had time to prepare a fabulous tea.');
            collector.stop();
            return;
          } else {
            channel.send('Starting!');
            // TODO: put names of users in game
            hasStarted = true;
            console.log(`Users are ${[...usersInPlay.entries()]}`);
          }
          collector.stop();

          // do game until msgCollector stops or maxPoints reached
          await playTeaGame(channel, gameMsg, lookupFunc);

          msgCollector.stop();
          let max = Math.max(...usersInPlay.values());
          let winners = [];
          for (let id of usersInPlay.keys()) {
            if (usersInPlay.get(id) === max) {
              winners.push(idToNameMap.get(id));
            }
          }
          channel.send(`**Congratulations, ${winners.join(', ')}. You win with ${max} points!!!**`);
        });
      break;
    }
});

async function playTeaGame(channel, msg, lookupFunc) {
  let teaMsg;
  while (currentPoints < settings.pointsToWin) {
    addPoint = [];
    answerTime = settings.answerTime;
    ({ solutions, word} = await lookupFunc(settings.commonness));
    let timerMsg = await channel.send(':tea:'.repeat(answerTime))
    channel.send(msg + word)
    while (answerTime > 0) {
      await delay(1000);
      if (answerTime != 0) {
        answerTime -= 1;
      }
      teaMsg = ':tea:'.repeat(answerTime) + '<:empty:1028438609520508980>'.repeat(settings.answerTime - answerTime)
      await timerMsg.edit(teaMsg)
    }
    if (addPoint.length) {
      // only want to give point to the first person who responded
      addPoint.sort((a, b) => { a.time > b.time ? 1 : -1 });
      addPoint[0].msg.react('????');
      let userId = addPoint[0].userId;
      let pointsForUser = usersInPlay.get(userId);
      usersInPlay.set(userId, ++pointsForUser);
      currentPoints = Math.max(currentPoints, pointsForUser);
      channel.send(`good job, ${addPoint[0].name}! You now have ${pointsForUser} points`); // also send potential solutions
    }
    channel.send(`**All meanings are:** \n${solutions.join('\n')}`);
    await delay(3000); // give some time for users to see the meanings
  }
}

function collectMessages(msgCollector, channel, similarityMinimum) {
  msgCollector.on('collect', async (msg) => {
    if (hasStarted) {
      if (msg.content === '$exitgame') {
        channel.send('All that for this...');
        msgCollector.stop();
        currentPoints = settings.pointsToWin;
        answerTime = 0;
      } else {
        let similarity = 0;
        let maxSimilarityMap = {max: 0, word: ''};
        for (meaning of solutions) {
          similarity = stringSimilarity.compareTwoStrings(meaning.toLowerCase(), msg.content.toLowerCase())
          if (similarity >= similarityMinimum) {
            addPoint.push({userId: msg.author.id, time: Date.now(), name: msg.author.username, msg});
            /* will end the round in playHibiscusTea's while loop */
            answerTime = 0;
            break;
          }
        }
      }
    } else {
      let args = msg.content.split(' ')
      let cmd = args[0];
      switch(cmd) {
        case '$pts':
          if (args[1] && args[1] >= boundaries.pointsMin && args[1] <= boundaries.pointsMax) {
            settings.pointsToWin = args[1];
            channel.send(`Number of points needed to win is now: ${args[1]}`);
          }
          break;
        case '$time':
          if (args[1] && args[1] >= boundaries.timeMin && args[1] <= boundaries.timeMax) {
            settings.answerTime = args[1];
            channel.send(`You will have ${args[1]} seconds to answer the questions.`);
          }
          break;
        case '$cmn':
          if (args[1] && args[1] >= boundaries.commonnessMin && args[1] <= boundaries.commonnessMax) {
            settings.commonness = args[1];
            channel.send(`Will now only be using kanji with commonness of: ${args[1]} or more`);
          }
          break;
      }
    }
  })
}


client.login(token);




// =================================================================================================
// Database Functions
// =================================================================================================

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
        } else {
          resolve(meanings);
        }
      });
    });
  })
}

function getMeaningsForEntSeq(ent_seq) {
  let meanings = [];
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM 'meanings' WHERE ent_seq=${ent_seq} AND lang=0`, (err1, rows) => {
      for (let row of rows) {
        meanings.push(row.meaning)
      }
      if (err1 || !rows) {
        reject(`Error looking up meaning`);
      } else {
        resolve(meanings);
      }
    });
  })
}

function getKanaIdsForId(id) {
  let ids = [];
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM 'kanji_readings' WHERE kanji_id=${id}`, (err, rows) => {
      for (let row of rows) {
        ids.push(row.kana_id)
      }
      if (err || !rows) {
        reject(`Error looking up reading`);
        return;
      }
      resolve(ids);
    });
  })
}

function getReadingsForKanaIds(ids) {
  let readings = [];
  return new Promise((resolve, reject) => {
    let sqlCmd = `SELECT * FROM 'kanas' WHERE `;
    let first = true;
    for (let id of ids) {
      if (first) {
        sqlCmd += `_id=${id}`;
        first = false;
      }
      else {
        sqlCmd += ` OR _id=${id}`
      }
    }
    db.all(sqlCmd, (err, rows) => {
      if (!rows) {
        reject(`Could not find readings with cmd ${sqlCmd} and ids ${ids}`);
        return;
      }
      for (let row of rows) {
        readings.push(row.romaji.toLowerCase())
      }
      if (!readings) {
        reject(`Could not find readings for ${ids}`);
        return;
      }
      resolve(readings);
    });
  });
}

function getRandomMeaningFromDict(commonness = settings.commonness) {
  let solutions;
  return new Promise((resolve, reject) => {
    if (Math.random() > 0) {
      db.get(`SELECT * FROM 'kanjis' WHERE commonness > ${commonness} ORDER BY RANDOM()`, async (err, row) => {
        if (err || !row) {
          reject('Error looking up kanji')
          return;
        } 
        try {
          solutions = await getMeaningsForEntSeq(row.ent_seq);
          // row.id -> kanji_readings.kanji_id -> kanji_readings.kana_id??
          resolve({word: row.kanji, solutions});
        } catch(e) {
          reject(e)
        }


      });
    } else { // Not reached atm, some ent_seq are in both kana and kanji dict in which case we only want the kanji version
      db.get(`SELECT * FROM 'kanas' WHERE commonness > ${commonness} ORDER BY RANDOM()`, async (err, row) => {
        if (err || !row) {
          reject('Error looking up kana')
          return;
        } 
        try {
          solutions = await getMeaningsForEntSeq(row.ent_seq);
          resolve({word: row.kana, solutions});
        } catch(e) {
          reject(e)
        }
      });
    }
  });
}

function getRandomReadingFromDict(commonness = settings.commonness) {
  let solutions;
  return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM 'kanjis' WHERE commonness > ${commonness} ORDER BY RANDOM()`, async (err, row) => {
        if (err || !row) {
          reject('Error looking up kanji')
          return;
        } 
        try {
          let ids = await getKanaIdsForId(row._id);
          solutions = await getReadingsForKanaIds(ids);
          resolve({word: row.kanji, solutions});
        } catch(e) {
          reject(e);
        }
      });
  });
}

