var express = require('express');
const expressLayouts = require('express-ejs-layouts');

var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var devicesPage = require('./routes/devices');
var settingPage = require('./routes/settings');
var tvPage = require('./routes/tv/tv');

var i18n = require('i18n');

const configUtil = require('./util/config');
const logger = require('./util/log').log;

var passport = require('passport') //passport module add
  , LocalStrategy = require('passport-local').Strategy;
var cookieSession = require('cookie-session');
var flash = require('connect-flash');

var app = express();


/**
* Password Setup
*/
app.use(cookieSession({
  keys: ['lg-connector-login'],
  cookie: {
    maxAge: 1000 * 60 * 60 // 유효기간 1시간
  }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());

i18n.configure({
  // setup some locales - other locales default to en silently
  locales: ['en', 'kr'],

  // you may alter a site wide default locale
  defaultLocale: 'en',

  // sets a custom cookie name to parse locale settings from
  cookie: 'lang',

  queryParameter: 'lang',

  register: global,

  // where to store json files - defaults to './locales'
  directory: __dirname + '/messages'
});
// i18n init parses req for language headers, cookies, etc.
app.use(i18n.init);

app.get('/lang/:language', function(req, res, next) {
  res.cookie('lang', req.params.language, { maxAge: 900000, httpOnly: true });
  var backURL = req.header('Referer') || '/';
  res.redirect(backURL);
});

// ejs-layouts setting
app.set('layout', 'layout');
app.set("layout extractScripts", true);
app.use(expressLayouts);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/lang/:language', function(req, res, next) {
  res.cookie('lang', req.params.language, { maxAge: 900000, httpOnly: true });
  var backURL = req.header('Referer') || '/';
  res.redirect(backURL);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const appVersion = require('./package.json').version;
const minorVersion = "16";

var myLogger = function (req, res, next) {
  res.locals.appVersion = appVersion + "." + minorVersion;
  next();
};

app.use(myLogger);

app.use('/', index);
app.use('/devices', devicesPage);
app.use('/tv', tvPage);
app.use('/settings', settingPage);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


/**
 * Handle unexpected errors in promises
 */
process.on('unhandledRejection', function(reason, promise) {
  var realErr = reason;
  if (realErr.err) {
    logger.error("unhandled Rejection: " + reason.err + "\nStack trace: "+ reason.err.stack);
  } else {
    logger.error("unhandled Rejection: " + JSON.stringify(reason)); }
});




module.exports = app;
