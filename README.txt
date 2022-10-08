Language minigame bot for discord, similar to mudae's tea games

Functions:

 - Type a word in a language and give translations from a dictionary database (wiktitonary, jisho) 
 - supported languages (japanese, chinese)

 For Devs:
 Run with "node bot.js"
 run "node deploy-commands.js" whenever you want to update commands
 Requires node v16.6 or higher for discord api

 jmdict is too large so you'll have to download it manually from https://github.com/PSeitz/japanese-dictionary/releases/tag/1.0
 Additionally, you'll need to create a config.json with the following:

 {
  "token": "<ask patrick for token>",
  "clientId": "1028344278851797114",
	"guildId": "687718497903443989"
}
 