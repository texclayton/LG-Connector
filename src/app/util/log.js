// Logging
var moment = require('moment');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, simple } = format;
const dateFormat = require('dateformat');

var logForWeb = [];

const tsFormat = printf(info => {
  var time = moment().format('YYYY-MM-DD hh:mm:ss').trim()
  return `${time} [${info.label}] ${info.level}: ${info.message}`;
});

const logger = createLogger({
  format: combine(
    label({ label: 'LG-Connector' }),
    timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    tsFormat
  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
//    new transports.File({ filename: 'connector-error.log', level: 'error' }),
    new transports.File({
      filename: '/config/lg-connector.log',
      level: 'info' ,
      maxsize: 10000000,
      maxFiles: 10
    }),
    new transports.Console({
      format: combine(
        printf(info => {
          var time = moment().format('YYYY-MM-DD hh:mm:ss').trim()
          return `${time} [${info.level}]: ${info.message}`;
        })
      )
    })
  ]
});

function saveLogForWeb(type, msg){
	var now = dateFormat(now, "yyyy-mm-dd	HH:MM:ss");
	logForWeb.unshift({'type':type, 'msg':msg, 'date':now});
	if(logForWeb.length > 500){
		logForWeb.pop();
	}
}

function webLogList(){
  return logForWeb;
}


module.exports.log = logger;
module.exports.webLog = saveLogForWeb;
module.exports.webLogList = webLogList;
