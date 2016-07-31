var FB = require('fb');
var schedule = require('node-schedule');
var request = require('request');
var winston = require('winston');

FB.setAccessToken('EAALvNCLGsB4BAIcflbUCjdvdY5osUTJesJBBHeERPlDhkBUomYwHFpbfCeF0N5NXsdM07os9m4BHTO0Edg23Sva8neOl8SPsq2XmQuHAwA072cOLmhL5pNNQynlBc4ZBMKBPQWOA5SUGyP3kpmoxUoOxDs9UZD');

var apiTarget = '100618296960419/feed';

winston.add(winston.transports.File, { filename: 'itlogs.log' });

function postTrivia() {
    request('http://numbersapi.com/random/trivia', function(err, res, body) { 
        if (!err && res.statusCode === 200) {
            FB.api(apiTarget, 'post', { message: "Number fact of the day: " + body, link: "http://numbersapi.com/" }, function (res) {
               if(!res || res.error) {
              winston.log('error', !res ? 'error occurred' : res.error);
              return;
          }
          winston.log('info', 'Post successful at: ' + res.id);
        });
        }
    });
}

schedule.scheduleJob('0 * * * *', function() {
    winston.log('info', 'Posting trivia');
    postTrivia();
});

console.log('app started');
