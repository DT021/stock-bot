var FB = require('fb');
var schedule = require('node-schedule');
var request = require('request');
var winston = require('winston');
var moment = require('moment');
var async = require('async');

// multiple async calls source: http://stackoverflow.com/questions/34436455/calling-multiple-http-requests-in-a-single-http-request-in-node-js


FB.setAccessToken('EAALvNCLGsB4BAIcflbUCjdvdY5osUTJesJBBHeERPlDhkBUomYwHFpbfCeF0N5NXsdM07os9m4BHTO0Edg23Sva8neOl8SPsq2XmQuHAwA072cOLmhL5pNNQynlBc4ZBMKBPQWOA5SUGyP3kpmoxUoOxDs9UZD');

var stockGroupFeed = '100618296960419/feed';

var urls = [
	"https://www.quandl.com/api/v3/datasets/YAHOO/INDEX_DJI.json?api_key=-ugtDdDfEr4UH_yS2MJh&column_index=4&start_date=2016-01-01", // DOW Jones
	"https://www.quandl.com/api/v3/datasets/CME/GCZ2016.json?api_key=-ugtDdDfEr4UH_yS2MJh&start_date=2016-03-29", // Gold Futures, December 2016
	"https://www.quandl.com/api/v3/datasets/CME/CLU2016.json?api_key=-ugtDdDfEr4UH_yS2MJh&start_date=2016-07-05", // Crude Oil Futures, September 2016
];

winston.add(winston.transports.File, { filename: 'itlogs.log' });

function percentChange(past, present) {
	return ((present - past) / past) * 100;
}

function getHTTP(url, callback) {
	var options = {
		url: url,
		json: true
	};
	
	request(options, function(err, res, body) {
		callback(err, body)
	});;
}

function postToFeed(message, feed) {
	var messageObj = {
		message: message
		//message: moment().format('MMMM DD, YYYY') + "\n\nGood morning traders! <...> \n\nMarket Summary:\n" + DJIAString + "\n" // change message
	}
	
	FB.api(feed, 'post', messageObj, function (res) {
	  if(!res || res.error) {
		  winston.log('error', !res ? 'error occurred' : res.error);
		  return;
	  }
	  winston.log('info', 'Post successful at: ' + res.id);
	});
}

function handleDOW(data) {
	var latestDJIDate = moment(data[0][0]).format('MMMM DD, YYYY');
	var latestDJI = parseFloat(data[0][1]).toFixed(2);
	var previousDJI = parseFloat(data[1][1]).toFixed(2)
	
	return "DJIA for " +  latestDJIDate + ": " + latestDJI + " (" + percentChange(previousDJI, latestDJI).toFixed(2) + "%)"
}

function handleGold(data) {
	var latestGoldDate = moment(data[0][0]).format('MMMM DD, YYYY');
	var lastGold = parseFloat(data[0][4]).toFixed(2);
	var previousGold = parseFloat(data[1][4]).toFixed(2);
	
	return "Gold for " + latestGoldDate + ": " + lastGold + " (" + percentChange(previousGold, lastGold).toFixed(2) + "%)";
}

function handleCrude(data) {
	
}

async.map(urls, getHTTP, function(err, res) {
	if (err) return winston.log('error', err);
	var dataArray = res.map(function(val, i, array) {
		return val.dataset.data;
	});
	
	// data array has DOW on index 0, Gold on index 1
	var messageArray = [];
	
	messageArray.push(handleDOW(dataArray[0]));
	messageArray.push(handleGold(dataArray[1]));
	messageArray.push(handleCrude(dataArray[2]));
	
	console.log(messageArray.join("\n"));
});

console.log('app started');
