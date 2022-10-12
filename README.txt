Language minigame bot for discord, similar to mudae's tea games

Functions:

 - Type a word in a language and give translations from a dictionary database (wiktitonary, jisho) 
 - supported languages (japanese, chinese)

 For Devs:
 Run with "node bot.js"
 run "node deploy-commands.js" whenever you want to update commands
 Requires node v16.6 or higher for discord api

 Using zhlib dictionary based on CC-Cedict, https://github.com/patarapolw/zhlib/blob/master/zhlib/dict.db, will have to download separately.
 
 Additionally, you'll need to create a config.json with the following:

 {
  "token": "<ask for token>",
  "clientId": "<ask for cID>",
	"guildId": "687718497903443989"
}
 
