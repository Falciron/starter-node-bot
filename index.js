'use strict';

var Botkit = require('botkit')
var querystring = require('querystring');
var request = require('request');
require('q');

var token = process.env.SLACK_TOKEN

var controller = Botkit.slackbot({
  // reconnect to Slack RTM when connection goes bad
  retry: Infinity,
  debug: false
})

// Assume single team mode if we have a SLACK_TOKEN
if (token) {
  console.log('Starting in single-team mode')
  controller.spawn({
    token: token
  }).startRTM(function (err, bot, payload) {
    if (err) {
      throw new Error(err)
    }

    console.log('Connected to Slack RTM')
  })
// Otherwise assume multi-team mode - setup beep boop resourcer connection
}

// Capitalize the search phrase in order to better match Gatherer's format.
function titleCase(str){
	return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
}

// Determine if a) the card has an image and b) the card's name matches the search phrase exactly.
function evaluateCard(card,searchTerm){
	if (card.hasOwnProperty('imageUrl')){
		return (card.name === searchTerm) ? 'ExactMatch' : 'Candidate';
	}
  else return false;
}

controller.on('message_received', function(bot, message) {
  var bracketRegex = /\[(.*?)\]/g;
  if (message !== null) {
    var searchTermList = message.map(function (message) {
      var tempMessage = message;
      tempMessage = tempMessage.replace(/\[|\]/g, '');
      return tempMessage;
    });
    for (index = 0; index < searchTermList.length; index++){
      getCardImage(searchTermList[index],message);
    }
  }
});

function getCardImage(searchTerm,message) {
	searchTerm = searchTerm.replace(/\w\S*/g, titleCase);
	searchTerm = querystring.stringify({name: searchTerm});
	request('https://api.magicthegathering.io/v1/cards?' + searchTerm, function (err, res, body) {
		if (!err && res.statusCode === 200){
			var cards = JSON.parse(body);
			if (cards.cards.length === 0){
				bot.reply(message, 'The card "' + element + '" could not be found.');
			} else {
				var exactMatchFound = false;
				var firstImageFound = false;
				var firstImageIndex = 0;
				var bestMatchIndex = 0;
				var cardCounter = 0;
				while (!exactMatchFound && cardCounter < cards.cards.length){
					var evalResult = evaluateCard(cards.cards[cardCounter],element);
					if (evalResult === 'ExactMatch'){
						bestMatchIndex = cardCounter;
						exactMatchFound = true;
					} else if (evalResult === 'Candidate'){
						firstImageIndex = cardCounter;
						firstImageFound = true;
					}
					cardCounter++;
				}
				if (exactMatchFound){
					bot.reply(message, cards.cards[bestMatchIndex].imageUrl);
				} else if (firstImageFound){
					bot.reply(message, cards.cards[firstImageIndex].imageUrl);
				}
			}
		}
	});
}