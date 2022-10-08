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
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);