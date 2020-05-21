var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var manager = require('../service/manager');

const configUtil = require('../util/config');

var isAuthenticated = function (req, res, next) {
  var serverAddr = configUtil.getConfig().system.address.split("\\.");
  var fromAddr = req.headers.host.split(":")[0].split("\\.");

  if ((serverAddr[0] == fromAddr[0] && serverAddr[1] == fromAddr[1] && serverAddr[2] == fromAddr[2]) || req.isAuthenticated())
    return next();
  res.redirect('/login');
};

var isAuthenticatedByToken = function (req, res, next) {
  if (req.headers['token'] == "")
    return next();
  res.redirect('/login');
};

/* GET home page. */
router.get('/', isAuthenticated, function(req, res, next) {
  res.render('dashboard', { mode: configUtil.getConfig().system.mode, list: manager.list() });
});

router.get('/login', function(req, res, next) {
  res.render('login', { layout: false });
});

router.post('/login', passport.authenticate('local', {failureRedirect: '/login', failureFlash: true}), // 인증 실패 시 401 리턴, {} -> 인증 스트레티지
  function (req, res) {
    res.redirect('/');
  }
);

router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true //인증을 수행하는 인증 함수로 HTTP request를 그대로  전달할지 여부를 결정한다
}, function (req, username, password, done) {
  if(username === configUtil.getConfig().user.name && password === configUtil.getConfig().user.password){
    return done(null, {
      'user_id': username,
    });
  }else{
    return done(false, null)
  }
}));

passport.serializeUser(function (user, done) {
  done(null, user)
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

module.exports = router;
module.exports.isAuthenticated = isAuthenticated;
module.exports.isAuthenticatedByToken = isAuthenticatedByToken;
