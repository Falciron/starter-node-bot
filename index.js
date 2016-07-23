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

controller.hears('\[(.*?)\]', ['message_received'], function(bot, message) {
	console.log('Beep');
	console.log(message);
	// Zero index is the entire message, so start at one.
	for (var index = 0; index < message.match.length; index++){
		console.log('Beep Boop');
		bot.reply(message,getCardImage(message.match[index]));
	}
});

function getCardImage(searchTerm) {
	request('https://api.magicthegathering.io/v1/cards?' + querystring.stringify({name: searchTerm}), function (err, res, body) {
		if (!err && res.statusCode === 200){
			var cards = JSON.parse(body);
			if (cards.cards.length === 0){
				return 'The card "' + searchTerm + '" could not be found.';
			} else {
				var exactMatchFound = false;
				var firstImageFound = false;
				var firstImageIndex = 0;
				var cardCounter = 0;
				while (cardCounter < cards.cards.length){
					var evalResult = evaluateCard(cards.cards[cardCounter],searchTerm);
					if (evalResult === 'ExactMatch'){
						return cards.cards[cardCounter].imageUrl;
					} else if (evalResult === 'Candidate'){
						firstImageIndex = cardCounter;
						firstImageFound = true;
					}
					cardCounter++;
				}
				if (firstImageFound){
					return cards.cards[firstImageIndex].imageUrl;
				} else {
					return 'No card image could be found.';
				}
			}
		} else {
			return 'Something went wrong. Please try again later.';
		}
	});
}