var FB = require('fb');
var schedule = require('node-schedule');
var request = require('request');
var winston = require('winston');
var moment = require('moment');
var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs');

// multiple async calls source: http://stackoverflow.com/questions/34436455/calling-multiple-http-requests-in-a-single-http-request-in-node-js
var myToken = "";
var bluChipToken = "";
FB.setAccessToken(bluChipToken);

var testFeed = '100618296960419/feed';

var urls = [
	"https://www.google.com/finance?cid=983582", // Google Finance URL for Dow Jones
	"https://www.quandl.com/api/v3/datasets/YAHOO/INDEX_DJI.json?api_key=&column_index=4&start_date=2016-01-01", // DOW Jones
	"https://www.quandl.com/api/v3/datasets/CME/GCZ2016.json?api_key=&start_date=2016-03-29", // Gold Futures, December 2016
	"https://www.quandl.com/api/v3/datasets/CME/CLU2016.json?api_key=&start_date=2016-07-05", // Crude Oil Futures, September 2016
	"http://www.investing.com/commodities/nickel?cid=959208", // Nickel Prices, LME
];

winston.add(winston.transports.File, { filename: 'itlogs.log' });

function getHTTP(url, callback) {
	var options = {
		url: url,
		json: ( (url.includes('google') || url.includes('investing')) ? false : true ), // json is true for quandl API calls
		headers: ( (url.includes('investing')) ? {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36"
		} : undefined ) // Work-around for forbidden access with Investing.com
	};
	
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
	var dowObj = { date: "", price: "", percentChange: "" }

	var $ = cheerio.load(data);
	var pricePanel = $("#market-data-div").children().first();
    
	// If this part looks confusing, just visit the google finance page for a visual guide
	dowObj.price = pricePanel.children().first().children().first().text().trim();
    dowObj.date = pricePanel.children().last().children().first().text().trim().substring(0, 5);
    var parsedDate = new Date(dowDate + ", " + new Date().getFullYear()); // DJIA doesn't have a year on google finance web page

	// didn't bother to change the price change part
	$('.id-price-change').filter(function() {
		var data = $(this);
		
		percentChange = data.children().children().last().text();
		dowObj.percentChange = percentChange;
	});

	return "DJIA for " +  dowObj.date +  ": " + dowObj.price + " " +  dowObj.percentChange;
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
	var nickelPrice = "";
	var nickelPercentChange = "";

	var $ = cheerio.load(data);
	nickelPrice = $('#quotes_summary_current_data').children().children().last().children().children().first().text();
	// I know html traversing isn't beautiful but it works.
	nickelPercentChange = $('#quotes_summary_current_data').children().children().last().children().children().filter(':nth-child(4)').first().text();
	return "Nickel: " + nickelPrice + " (" + nickelPercentChange +  ")";
	/*
	Quandl doesn't update Nickel prices in time for posting. So, we scrape!
	
	var latestNickelDate = moment(data[0][0]).format('MMMM DD, YYYY');
	var lastNickel = parseFloat(data[0][1]).toFixed(2);
	var previousNickel = parseFloat(data[1][1]).toFixed(2);
	
	return "Nickel for " + latestNickelDate + ": " + formatValue(lastNickel) + " (" + percentChange(previousNickel, lastNickel).toFixed(2) + "%)";
	*/
}

function percentChange(past, present) {
	return ((present - past) / past) * 100;
}

function getAndPost() {
	async.map(urls, getHTTP, function(err, res) {
		if (err) return winston.log('error', err);
		var dataArray = res.slice(1,4).map(function(val, i, array) {
			return val.dataset.data;
		});
		// data array has DOW on index 0, Gold on index 1
		var messageArray = [];
		
		messageArray.push(handleDOW(res[0]));
		messageArray.push(handleGold(dataArray[1]));
		messageArray.push(handleCrude(dataArray[2]));
		messageArray.push(handleNickel(res[4]));

		postToFeed(messageArray.join("\n"), testFeed);
	});
}

console.log('app started');
getAndPost();

//schedule.scheduleJob('20 * * * 1-5', getAndPost);
