var FB = require('fb');
var schedule = require('node-schedule');
var request = require('request');
var winston = require('winston');

FB.setAccessToken('EAALvNCLGsB4BAIcflbUCjdvdY5osUTJesJBBHeERPlDhkBUomYwHFpbfCeF0N5NXsdM07os9m4BHTO0Edg23Sva8neOl8SPsq2XmQuHAwA072cOLmhL5pNNQynlBc4ZBMKBPQWOA5SUGyP3kpmoxUoOxDs9UZD');

var apiTarget = '100618296960419/feed';

var dowAPI = "https://www.quandl.com/api/v3/datasets/YAHOO/INDEX_DJI.json";

winston.add(winston.transports.File, { filename: 'itlogs.log' });

function postTrivia() {
    request({
        baseUrl: dowAPI,
        uri: '?api_key=-ugtDdDfEr4UH_yS2MJh&column_index=4&end_date=2016-07-29&start_date=2016-07-29',
        json: true
    }, function(err, res, body) { 
        if (!err && res.statusCode === 200) {
            console.log(body);
        FB.api(apiTarget, 'post', { message: "DOW JONES INDUSTRIAL AVERAGE for July 29, 2016" +  body.dataset.data[0][1] }, function (res) {
            console.log(body.dataset.data[0][1]);
          if(!res || res.error) {
              winston.log('error', !res ? 'error occurred' : res.error);
              return;
          }
          winston.log('info', 'Post successful at: ' + res.id);
        });
        }
    });
}

/*
schedule.scheduleJob('0 * * * *', function() {
    winston.log('info', 'Posting trivia');
    postTrivia();
});
*/
console.log('app started');
postTrivia();
