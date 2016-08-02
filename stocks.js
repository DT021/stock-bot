var FB = require('fb');
var schedule = require('node-schedule');
var request = require('request');
var winston = require('winston');
var moment = require('moment');
var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs');

// multiple async calls source: http://stackoverflow.com/questions/34436455/calling-multiple-http-requests-in-a-single-http-request-in-node-js
var myToken = "EAALvNCLGsB4BAIcflbUCjdvdY5osUTJesJBBHeERPlDhkBUomYwHFpbfCeF0N5NXsdM07os9m4BHTO0Edg23Sva8neOl8SPsq2XmQuHAwA072cOLmhL5pNNQynlBc4ZBMKBPQWOA5SUGyP3kpmoxUoOxDs9UZD";
var bluChipToken = "EAALvNCLGsB4BACD7bpGPVBlCLcN4NhjJKpo544U78gONZBk593o7RPIeh73B5dT3UVs2OASDJmyfloQZC4eZAVpDmsBX0YtDhTnIMuvUgLQ7cSu2jEUSsMiok44RDieV7oZBWizBIYfrGZCqYU7FqxwnhqwOnZAhwZD";
FB.setAccessToken(bluChipToken);

var testFeed = '100618296960419/feed';

var urls = [
	"https://www.google.com/finance?cid=983582", // Google Finance URL for Dow Jones
	"https://www.quandl.com/api/v3/datasets/YAHOO/INDEX_DJI.json?api_key=-ugtDdDfEr4UH_yS2MJh&column_index=4&start_date=2016-01-01", // DOW Jones
	"https://www.quandl.com/api/v3/datasets/CME/GCZ2016.json?api_key=-ugtDdDfEr4UH_yS2MJh&start_date=2016-03-29", // Gold Futures, December 2016
	"https://www.quandl.com/api/v3/datasets/CME/CLU2016.json?api_key=-ugtDdDfEr4UH_yS2MJh&start_date=2016-07-05", // Crude Oil Futures, September 2016
	"https://www.quandl.com/api/v3/datasets/LME/PR_NI.json?api_key=-ugtDdDfEr4UH_yS2MJh", // Nickel Prices, LME
];

winston.add(winston.transports.File, { filename: 'itlogs.log' });

function getHTTP(url, callback) {
	var options = {
		url: url,
		json: ( url.includes('google') ? false : true )
	};

	console.log(options.json);
	
	request(options, function(err, res, body) {
		callback(err, body)
	});;
}

function formatValue(valueString) {
	return parseFloat(valueString).toLocaleString("en");
}

function postToFeed(message, feed) {
	var defaultGreeting = moment().format('MMMM DD, YYYY') + "\n\nGood morning traders! <...> \n\nMarket Summary (in USD):\n"
	var messageObj = {
		message: defaultGreeting + message
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
	var dowObj = { price: "", percentChange: "" }
	var price, percentChange;

	var $ = cheerio.load(data);
	$('.pr').filter(function() {
		var data = $(this);

		price = data.children().first().text();
		dowObj.price = price;
	});

	$('.id-price-change').filter(function() {
		var data = $(this);
		
		percentChange = data.children().children().last().text();
		dowObj.percentChange = percentChange;
	})
	/*

	Right now, Quandl data is rejected in favor of Google Finance Scraping.

	var latestDJIDate = moment(data[0][0]).format('MMMM DD, YYYY');
	var latestDJI = parseFloat(data[0][1]).toFixed(2);
	var previousDJI = parseFloat(data[1][1]).toFixed(2);
	
	*/

	return "DJIA for " +  moment().add(-1, 'days').format('MMMM DD, YYYY') + ": " + dowObj.price + " " +  dowObj.percentChange;
}

function handleGold(data) {
	var latestGoldDate = moment(data[0][0]).format('MMMM DD, YYYY');
	var lastGold = parseFloat(data[0][4]).toFixed(2);
	var previousGold = parseFloat(data[1][4]).toFixed(2);
	
	return "Gold for " + latestGoldDate + ": " + formatValue(lastGold) + " (" + percentChange(previousGold, lastGold).toFixed(2) + "%)";
}

function handleCrude(data) {
	var latestCrudeDate = moment(data[0][0]).format('MMMM DD, YYYY');
	var lastCrude = parseFloat(data[0][4]).toFixed(2);
	var previousCrude = parseFloat(data[1][4]).toFixed(2);
	
	return "Crude Oil for " + latestCrudeDate + ": " + formatValue(lastCrude) + " (" + percentChange(previousCrude, lastCrude).toFixed(2) + "%)";
}

function handleNickel(data) {
	var latestNickelDate = moment(data[0][0]).format('MMMM DD, YYYY');
	var lastNickel = parseFloat(data[0][1]).toFixed(2);
	var previousNickel = parseFloat(data[1][1]).toFixed(2);
	
	return "Nickel for " + latestNickelDate + ": " + formatValue(lastNickel) + " (" + percentChange(previousNickel, lastNickel).toFixed(2) + "%)";
}

function percentChange(past, present) {
	return ((present - past) / past) * 100;
}

function getAndPost() {
	async.map(urls, getHTTP, function(err, res) {
		if (err) return winston.log('error', err);
		var dataArray = res.slice(1,5).map(function(val, i, array) {
			return val.dataset.data;
		});
		// data array has DOW on index 0, Gold on index 1
		var messageArray = [];
		
		messageArray.push(handleDOW(res[0]));
		messageArray.push(handleGold(dataArray[1]));
		messageArray.push(handleCrude(dataArray[2]));
		messageArray.push(handleNickel(dataArray[3]));
		
		console.log(messageArray.join("\n"));
		//postToFeed(messageArray.join("\n"), testFeed);
	});
}

console.log('app started');
//schedule.scheduleJob('30 8,12 * * 1-5', getAndPost);

getAndPost();