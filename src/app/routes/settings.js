var express = require('express');
var router = express.Router();
var config = require('../util/config');
var ip = require('ip');
const logger = require('../util/log').log;
const webLog = require('../util/log').webLog;
var auth = require('./index');
var manager = require('../service/manager');

router.get('/', auth.isAuthenticated, function(req, res, next) {
  var networkMap = require('os').networkInterfaces();
  var networkList = [];
  Object.keys(networkMap).forEach(function (ifname) {
  var alias = 0;
    networkMap[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      networkList.push(iface.address);
    });
  });

  res.render('settings', {"data": config.getConfig(),  "ip":ip.address(), "networkList":networkList});
});

router.get('/getToken', auth.isAuthenticated, async function(req, res, next) {
  var data = await manager.getSmartthinqLoginData();
  res.send( JSON.stringify(data) );
});


router.post('/preset', auth.isAuthenticated, function(req, res, next) {
  var obj = new Object();
  try{
    var configData = config.getConfig();
    configData.preset.country = req.body.country;
    configData.preset.language = req.body.language;
    config.saveConfig(configData);
    obj['result'] = 'success';
    obj['msg'] = res.__('RESULT-Settings_Preset_Register_Success');
  }catch(err){
    obj['result'] = 'failed';
    obj['msg'] = res.__('RESULT-Settings_Preset_Register_Fail');
    logger.error("Register Smartthinq Setting Failed!!! " + e);
  }
  res.send( JSON.stringify(obj) );
});

router.post('/smartthinq', auth.isAuthenticated, function(req, res, next) {
  var obj = new Object();
  try{
    var configData = config.getConfig();

    configData.smartthinq.refresh_token = req.body.refresh_token;
    configData.smartthinq.auth_base = req.body.auth_base;
    configData.smartthinq.api_root = req.body.api_root;
    configData.smartthinq.oauth_root = req.body.oauth_root;

    config.saveConfig(configData);

    obj['result'] = 'success';
    obj['msg'] = res.__('RESULT-Settings_Smartthinq_Register_Success');
  }catch(e){
    obj['result'] = 'failed';
    obj['msg'] = res.__('RESULT-Settings_Smartthinq_Register_Fail');
    logger.error("Register Smartthinq Setting Failed!!! " + e);
  }
  res.send( JSON.stringify(obj) );
});

router.post('/system', auth.isAuthenticated, function(req, res, next) {
  var obj = new Object();

  try{
    var configData = config.getConfig();

    configData.system.address = req.body.network;
    configData.system.port = req.body.port;

    config.saveConfig(configData);

    obj['result'] = 'success';
    obj['msg'] = res.__('RESULT-Settings_System_Register_Success');
  }catch(e){
    obj['result'] = 'failed';
    obj['msg'] = res.__('RESULT-Settings_System_Register_Fail');
    logger.error("Register System Setting Failed!!! " + e);
  }

  res.send( JSON.stringify(obj) );
});

router.post('/user', auth.isAuthenticated, function(req, res, next) {
  var obj = new Object();

  try{
    var configData = config.getConfig();

    configData.user.name = req.body.username;
    configData.user.password = req.body.password;

    config.saveConfig(configData);

    obj['result'] = 'success';
    obj['msg'] = res.__('RESULT-Settings_User_Register_Success');
  }catch(e){
    obj['result'] = 'failed';
    obj['msg'] = res.__('RESULT-Settings_User_Register_Fail');
    logger.error("Register User Setting Failed!!! " + e);
  }

  res.send( JSON.stringify(obj) );
});

router.post('/smartthings', function(req, res, next) {
  var obj = new Object();
  try{
    var configData = config.getConfig();
    configData.st.app_url = req.body.app_url;
    configData.st.app_id = req.body.app_id;
    configData.st.access_token = req.body.access_token;
    config.saveConfig(configData);

    obj['result'] = 'success';
    obj['msg'] = res.__('RESULT-Settings_ST_Register_Success');

    logger.info("Set ST App Info from a GH-Connector Smartapp");
  }catch(e){
    logger.error("Register ST Setting Failed!!! " + e);
    obj['result'] = 'failed';
    obj['msg'] = res.__('RESULT-Settings_ST_Register_Fail');
  }

  res.send( JSON.stringify(obj) );
});

module.exports = router;
