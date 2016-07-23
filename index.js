'use strict';

var Botkit = require('botkit');
var querystring = require('querystring');
var request = require('request');
require('q');

// Default Botkit connection code.
var token = process.env.SLACK_TOKEN;

var controller = Botkit.slackbot({
  retry: Infinity,
  debug: false
});

if (token) {
  controller.spawn({
    token: token
  }).startRTM(function (err, bot, payload) {
    if (err) {
      throw new Error(err);
    }
  });
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

controller.hears('\[(.*?)\]', function(bot, message) {
	// Zero index is the entire message, so start at one.
	for (var index = 1; index < message.match.length; index++){
		getCardImage(message.match[index], bot, message);
	}
});

function getCardImage(searchTerm, bot, message) {
	request('https://api.magicthegathering.io/v1/cards?' + querystring.stringify({name: searchTerm}), function (err, res, body) {
		if (!err && res.statusCode === 200){
			var cards = JSON.parse(body);
			if (cards.cards.length === 0){
				bot.reply(message, 'The card "' + searchTerm + '" could not be found.');
			} else {
				var exactMatchFound = false;
				var firstImageFound = false;
				var firstImageIndex = 0;
				var bestMatchIndex = 0;
				var cardCounter = 0;
				while (!exactMatchFound && cardCounter < cards.cards.length){
					var evalResult = evaluateCard(cards.cards[cardCounter],searchTerm);
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