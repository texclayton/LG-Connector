var express           = require('express');
var router            = express.Router();
const configUtil      = require('../../util/config');
const auth            = require('../index');
const deviceManager   = require('../../service/manager');
const wol             = require('wol');

/* GET home page. */
router.get('/', auth.isAuthenticated, function(req, res, next) {
  res.render('list', { list: deviceManager.tvList() });
});

router.post('/control', (req, res, next)=>{
  var address = req.body.id;
  var command = req.body.cmd;
  var data    = req.body.data;
  var tvDevice = deviceManager.getDevice(address);

  //console.log("[" + address + "] " + command + " >> " + data);

  if(tvDevice){
    switch(command){
    case "power":
      tvDevice.power(data);
      break;
    case "volume":
      tvDevice.volume(data);
      break;
    case "mute":
      tvDevice.mute(data);
      break;
    case "channelUp":
      tvDevice.channelUp();
      break;
    case "channelDown":
      tvDevice.channelDown();
      break;
    case "channel":
      tvDevice.setChannel(data);
      break;
    case "input":
      tvDevice.setApp(data);
      break;
    case "play":
      tvDevice.play();
      break;
    case "stop":
      tvDevice.stop();
      break;
    case "pause":
      tvDevice.pause();
      break;
    case "web":
      tvDevice.web(data);
      break;
    case "message":
      tvDevice.sendMessage(data);
      break;
    }
  }

  res.send(JSON.stringify({"result":true}));
});

router.post('/:address/power/:status', async function(req, res, next){
  var status = req.params.status == "on" ? true : false;
  var result = JSON.stringify({"result":processTVPower(req.params.address, status, req.query.mac)});
  res.send(result);
});

router.get('/:address/power/:status', async function(req, res, next){
  var status = req.params.status == "on" ? true : false;
  var result = JSON.stringify({"result":processTVPower(req.params.address, status, req.query.mac)});
  res.send(result);
});

router.post('/:address/service/:id', async function(req, res, next){
  var result = JSON.stringify({"result":processTVService(req.params.address, req.params.id)});
  res.send(result);
});

router.get('/:address/service/:id', async function(req, res, next){
  var result = JSON.stringify({"result":processTVService(req.params.address, req.params.id)});
  res.send(result);
});

router.get('/:address/service', async function(req, res, next){
  var tvDevice = deviceManager.getDevice(req.params.address);
  var data = null;
  if(tvDevice){
    tvDevice.getService().then(_data => {
      data = _data.services;
      var result = JSON.stringify({"result":_data.result, "data":data});
      res.send(result);
    })
  }else{
    var result = JSON.stringify({"result":false});
    res.send(result);
  }
});

router.get('/:address/app', async function(req, res, next){
  var tvDevice = deviceManager.getDevice(req.params.address);
  if(tvDevice){
    tvDevice.getApps().then(_data => {
      var result = JSON.stringify({"result":_data.result, "data":_data});
      res.send(result);
    })
  }else{
    var result = JSON.stringify({"result":false});
    res.send(result);
  }
});

router.get('/:address/app/:id', async function(req, res, next){
  var result = JSON.stringify({"result":processTVApp(req.params.address, req.params.id)});
  res.send(result);
});

router.post('/:address/app/:id', async function(req, res, next){
  var result = JSON.stringify({"result":processTVApp(req.params.address, req.params.id)});
  res.send(result);
});

router.get('/:address/volume/:volume', async function(req, res, next){
  var result = JSON.stringify({"result":processTVVolume(req.params.address, req.params.volume)});
  res.send(result);
});

router.post('/:address/volume/:volume', async function(req, res, next){
  var result = JSON.stringify({"result":processTVVolume(req.params.address, req.params.volume)});
  res.send(result);
});

router.get('/:address/volumeUp', async function(req, res, next){
  var result = JSON.stringify({"result":processTVVolumeUp(req.params.address)});
  res.send(result);
});

router.post('/:address/volumeUp', async function(req, res, next){
  var result = JSON.stringify({"result":processTVVolumeUp(req.params.address)});
  res.send(result);
});

router.get('/:address/volumeDown', async function(req, res, next){
  var result = JSON.stringify({"result":processTVVolumeDown(req.params.address)});
  res.send(result);
});

router.post('/:address/volumeDown', async function(req, res, next){
  var result = JSON.stringify({"result":processTVVolumeDown(req.params.address)});
  res.send(result);
});

router.get('/:address/mute', async function(req, res, next){
  var result = JSON.stringify({"result":processMute(req.params.address, true)});
  res.send(result);
});

router.post('/:address/mute', async function(req, res, next){
  var result = JSON.stringify({"result":processMute(req.params.address, true)});
  res.send(result);
});

router.get('/:address/unMute', async function(req, res, next){
  var result = JSON.stringify({"result":processMute(req.params.address, false)});
  res.send(result);
});

router.post('/:address/unMute', async function(req, res, next){
  var result = JSON.stringify({"result":processMute(req.params.address, false)});
  res.send(result);
});

function processTVPower(address, status, mac){
  var tvDevice = deviceManager.getDevice(address);
  if(tvDevice){
    if(status){
      tvDevice.powerOn(mac);
      return true;
    }else{
      tvDevice.powerOff();
      return true;
    }
  }else{
    if(status){
      wol.wake(mac.toUpperCase());
      return true;
    }
  }
  return false;
}

function processTVService(address, id){
  var tvDevice = deviceManager.getDevice(address);
  if(tvDevice){
    tvDevice.setService(id);
    return true;
  }
  return false;
}

function processTVApp(address, id){
  var tvDevice = deviceManager.getDevice(address);
  if(tvDevice){
    tvDevice.setApp(id);
    return true;
  }
  return false;
}

function processTVVolume(address, volume){
  var tvDevice = deviceManager.getDevice(address);
  if(tvDevice){
    tvDevice.volume(volume);
    return true;
  }
  return false;
}

function processTVVolumeUp(address){
  var tvDevice = deviceManager.getDevice(address);
  if(tvDevice){
    tvDevice.volumeUp();
    return true;
  }
  return false;
}

function processTVVolumeDown(address){
  var tvDevice = deviceManager.getDevice(address);
  if(tvDevice){
    tvDevice.volumeDown();
    return true;
  }
  return false;
}

function processMute(address, isMute){
  var tvDevice = deviceManager.getDevice(address);
  if(tvDevice){
    tvDevice.mute(isMute);
    return true;
  }
  return false;
}


module.exports = router;
