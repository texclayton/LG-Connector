var express = require('express');
var router = express.Router();
const configUtil = require('../util/config');
var auth = require('./index');
var manager = require('../service/manager');

/* GET home page. */
router.get('/', auth.isAuthenticated, (req, res, next)=> {
  res.render('devices', { list: configUtil.getConfig().devices.list });
});

router.get('/property', auth.isAuthenticated, (req, res, next)=> {
  res.render('property', {id: req.query.id});
});

router.get('/property/:id', auth.isAuthenticated, (req, res, next)=> {
  var data = manager.getDeviceProperty(req.params.id);
  res.send(data);
});

router.get('/langProperty/:id', auth.isAuthenticated, (req, res, next)=> {
  var data = manager.getDeviceLangProperty(req.params.id);
  res.send(data);
});

router.post('/add', (req, res, next)=> {
  try{
    var ip = req.body.ip;

    var configData = configUtil.getConfig();
    var list = configData.devices.list;
    var resultList = [];
    var exist = false;
    for(var i=0; i<list.length; i++){
      var item = list[i];
      if(item.ip == ip){
        exist = true;
      }
      resultList.push(item);
    }
    if(exist){
      res.send(__('RESULT-Devices_LG_Devices_Add_Fail'));
      return;
    }
    resultList.push(req.body);
    configData.devices.list = resultList;
    configUtil.saveConfig(configData);

    manager.addDevice(req.body);

    res.send(__('RESULT-Devices_LG_Devices_Add_Success'));
  }catch(e){
    res.send(__('RESULT-Devices_LG_Devices_Add_Fail'));
  }

});

router.delete('/delete', function(req, res, next) {
  try{
    var ip = req.body.ip;

    var configData = configUtil.getConfig();
    var list = configData.devices.list;
    var resultList = [];
    var exist = false;
    for(var i=0; i<list.length; i++){
      var item = list[i];
      if(item.ip == ip){
        exist = true;
      }else{
        resultList.push(item);
      }
    }

    if(exist){
      manager.deleteDevice(ip);
      configData.devices.list = resultList;
      configUtil.saveConfig(configData);
    }

    res.send(__('RESULT-Devices_LG_Devices_Delete_Success'));
  }catch(e){
    console.log(e);
    res.send(__('RESULT-Devices_LG_Devices_Delete_Fail'));
  }

});
/*
router.post('/control/:address', function(req, res, next) {

  var address = req.params.address;
  var method = req.body.method;
  var params = req.body.params;

  var result = manager.controlSmartthinq(address, method, params);
  res.send(JSON.stringify({"result":result}));

});*/

router.post('/control2', async (req, res, next) =>{

  var id = req.body.id;
  var method = req.body.command;
  var value = req.body.value;

  var result = await manager.controlSmartthinq(id, method, value);
  res.send(JSON.stringify({"result":result}));

});

router.post('/control', async (req, res, next) =>{

  var id = req.body.id;
  var method = req.body.command;
  var value = req.body.value;

  var result = await manager.controlSmartthinqByCustom(id, method, value);
  res.send(JSON.stringify({"result":result}));

});

module.exports = router;
