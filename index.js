'use strict';

const Botkit = require('botkit');
const mtg = require('mtgsdk');

// Default Botkit connection code.
var token = process.env.SLACK_TOKEN;

var controller = Botkit.slackbot({
	retry: Infinity,
	debug: false
});

if (token) {
	controller.spawn({
		token: token
	}).startRTM(function (err) {
		if (err) {
			throw new Error(err);
		}
	});
}

// Determine if a) the card has an image and b) the card's name matches the search phrase exactly.
function evaluateCard(card,searchTerm){
	if (card.hasOwnProperty('imageUrl')){
		return (card.name === searchTerm) ? 'ExactMatch' : 'Candidate';
	}
	else return false;
}

controller.hears([/\[(.*?)\]/g], ['direct_mention','direct_message','mention','ambient'], function(bot, message) {
	for (var index = 0; index < message.match.length; index++){
		var searchTerm = message.match[index].replace(/[[\]]/g,'');
		var notSoSmartTerm = searchTerm.replace(/\u2019/g, "'");
		getCardImage(notSoSmartTerm,bot,message);
	}
});

function getCardImage(searchTerm,bot,message){
	mtg.card.where({name: searchTerm})
		.then(function(cards){
			if (cards.length === 0){
				console.log(searchTerm);
				bot.reply(message,'The card "' + searchTerm + '" could not be found.');
			} else {
				var firstImageFound = false;
				var firstImageIndex = 0;
				var cardCounter = 0;
				while (cardCounter < cards.length){
					var evalResult = evaluateCard(cards[cardCounter],searchTerm);
					if (evalResult === 'ExactMatch'){
						bot.reply(message,cards[cardCounter].imageUrl);
						return;
					} else if (evalResult === 'Candidate'){
						firstImageIndex = cardCounter;
						firstImageFound = true;
					}
					cardCounter++;
				}
				if (firstImageFound){
					bot.reply(message,cards[firstImageIndex].imageUrl);
				} else {
					bot.reply(message,'No card image could be found.');
				}
			}
		})
		.catch(function(){
			bot.reply(message,'Something went wrong. Please try again later.');
		});
}