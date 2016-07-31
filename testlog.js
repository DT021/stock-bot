var winston = require('winston');

winston.add(winston.transports.File, { filename: 'itlogs.log' });

winston.log('error', 'this is a sample error message');

