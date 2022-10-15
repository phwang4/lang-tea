const { REST, SlashCommandBuilder, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder()
    .setName('kanji')
    .setDescription('Replies with the definitions for that kanji.')
    .addStringOption(option => 
      option.setName('kanji')
        .setDescription('The kanji to look up')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('kana')
    .setDescription('Replies with the definitions for a word written in kana.')
    .addStringOption(option => 
      option.setName('kana')
        .setDescription('The kana to look up')
        .setRequired(true)),
  new SlashCommandBuilder()
      .setName('randm')
      .setDescription('Replies with a random meaning.'),
  new SlashCommandBuilder()
      .setName('randr')
      .setDescription('Replies with a random reading.'),
  new SlashCommandBuilder()
      .setName('wordgames')
      .setDescription('Mudae tea-like game for Japanese-English definitions')
      .addSubcommand(subCommand => 
        subCommand
          .setName('hibitea')
          .setDescription('Find a right meaning for the word'))
      .addSubcommand(subCommand => 
        subCommand
          .setName('reading')
          .setDescription('Find a right reading for the word'))
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);