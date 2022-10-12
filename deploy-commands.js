const { REST, SlashCommandBuilder, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder()
    .setName('hanzi')
    .setDescription('Replies with the definitions for the hanzi.')
    .addStringOption(option => 
      option.setName('hanzi')
        .setDescription('The hanzi to look up')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('bruh')
    .setDescription('WIP')
    .addStringOption(option => 
      option.setName('pinyin')
        .setDescription('The pinyin to look up')
        .setRequired(true)),
  new SlashCommandBuilder()
      .setName('randzw')
      .setDescription('Replies with a random character.'),
  new SlashCommandBuilder()
      .setName('wordgames')
      .setDescription('WIP Mudae tea-like game')
      .addSubcommand(subCommand => 
        subCommand
          .setName('juhuatea')
          .setDescription('WIP Mudae tea-like game'))
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);