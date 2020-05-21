'use strict';

const logger      = require('../util/log').log;
const TVDiscover  = require('./tv/tv-discover');
const TVDevice    = require('./tv/tv');
const configUtil  = require('../util/config');
const request     = require('request');
const Smartthinq  = require('./smartthinq/finder');

class LGDeviceManager {

  constructor( opts ) {

    this.devices = {};
    this.reservation = {};

    this.smartthinq = new Smartthinq();
    this.smartthinq.on("notify", (data)=>{
    //  logger.info("Notify >> " + JSON.stringify(data) + "\n");
      this._notifyDataToST(data.id, "total", JSON.stringify(data.data));
    });
    this.smartthinq.on("find", (data)=>{
      logger.info("Find >> " + data.info.alias + " [" + data.info.macAddress + "]");
      var type = this.smartthinq.getTypeName(data.info.deviceType);
      this.reservation[data.info.macAddress] = type;
      this.devices[data.info.macAddress] = {"target":data.target, "type":type, "info":data.info};
    });

  var tempTimer = setInterval(()=>{
    if(this._configIsLoaded()){
      this._init();
      clearTimeout(tempTimer);
    }
  }, 1000);

  }

  _configIsLoaded(){
    return configUtil.getConfig()["system"] != undefined ? true : false
  }

  async _init(){
    /**
    * Register Device to ST
    */
    setInterval(async ()=>{
      var keyList = Object.keys(this.reservation);
      for (var i=0; i<keyList.length; i++) {
        var result = await this._registerDeviceToST(keyList[i], this.reservation[keyList[i]]);
        delete this.reservation[keyList[i]];
        break;
      }
    }, 1000 * 10);

    /**
    * Init TV
    */
    setTimeout(()=>{
      this._initTVList();
      this._tvScan();
    }, 3000);

    setTimeout(async ()=>{
      await this._initSmartthinq();
    }, 1000);
  }

  async _initSmartthinq(){
    var qConfig = configUtil.getConfig().smartthinq;
    if(qConfig.auth_base != "" && qConfig.api_root != "" && qConfig.oauth_root != "" && qConfig.refresh_token != ""){
      await this.smartthinq.setPrivateData(qConfig.auth_base, qConfig.api_root, qConfig.oauth_root, qConfig.refresh_token);
      await this.smartthinq.find();
    }
  }

  /**
  * TV Init
  */
  _initTVList(){
    logger.info("Iitialize TV Devices....");
    var list = configUtil.getConfig().devices.list;
    for(var i=0; i<list.length; i++){
      var item = list[0];
      switch(item.type){
      case "tv":
        logger.info("[" + item.ip + "] TV is activated.");
        var tv = new TVDevice({"address":item.ip, "mac":item.mac});
        this.reservation[item.ip] = "tv";
        this._registerTVListener(tv, item.ip);
        this.devices[item.ip] = {"target":tv, "type":"tv", "info":{"mac":item.mac}};
        break;
      }
    }
  }

  _tvScan(){
    logger.info("TV Scan....");
    const tvDiscover = new TVDiscover();
    tvDiscover.on("find", (device)=>{
      logger.info("[ TV ] Find >> " + JSON.stringify(device));
      if(!this.devices[device.address]){
        var tv = new TVDevice(device);
        this._registerTVListener(tv, device.address);
        this.devices[device.address] = {"target":tv, "type":"tv", "info":device};
        this.reservation[device.address] = "tv";
      }else{
        logger.info("[ TV ] " + device.address + " is already registered");
      }
    });
    tvDiscover.scan();
  }

  list(type){
    var list = [];
    var keyList = Object.keys(this.devices);
    for (var i=0; i<keyList.length; i++) {
      var item = this.devices[keyList[i]];
      var obj = new Object();
      obj.ip = keyList[i];
      obj.type = item.type;
      obj.info = item.info;
      if(!type){
         list.push(obj);
      }else if(type && type == obj.type){
         list.push(obj);
      }
    }
    return list;
  }

  addDevice(data){
    var address = data.ip;
    var type = data.type;
    if(!this.devices[address]){
      switch(type){
      case "tv":
        var tv = new TVDevice({"address":address, "mac":data.mac});
        this._registerTVListener(tv, address);
        this.devices[address] = {"target":tv, "type":"tv", "info":{"mac":data.mac}};
        break;
      }
    }
    logger.warn("[" + address + "] " + type.toUpperCase() + " is already init.");
  }

  deleteDevice(address){
    if(this.devices[address]){
      this.devices[address].target.destroy();
      delete this.devices[address];
    }
  }

  getDevice(address){
    var data = this.devices[address];
    if(data){
      return data.target;
    }else{
      return null;
    }
  }

  getDeviceProperty(address){
    var target = this.getDevice(address);
    if(target){
      return target.data;
    }
    return {}
  }

  getDeviceLangProperty(address){
    var target = this.getDevice(address);
    if(target){
      return target.langPack;
    }
    return {}
  }

  getSmartthinqLoginData(){
    return this.smartthinq.getLoginData();
  }

  async controlSmartthinq(address, command, param){
    var target = this.getDevice(address);
    if(target){
      try{
        var result = await target[command](param);
        return result;
      }catch(err){
        logger.error(JSON.stringify(err));
      }
    }
    return false;
  }

  async controlSmartthinqByCustom(address, command, value){
    var target = this.getDevice(address);
    if(target){
      try{
        var result = await target.control(command, value)
        return result;
      }catch(err){
        logger.error(JSON.stringify(err));
      }
    }
    return false;
  }

  _makeNotifyData(address, key, data){
    return {
      id: address,
      cmd: "notify",
      key: key,
      data: data
    }
  }

  _notifyDataToST(address, type, data){
  //  logger.info('[' + address + '] ' + type + ' >> ' + JSON.stringify(data));

    var data = this._makeNotifyData(address, type, data);
    var url = this._makeUpdateURL();
    if(url){
      request.post({url:url, body: data, json:true}, (err,httpResponse,body)=>{
        if(err){
          logger.error("Notify >> Error!! " + err + "\n" + new Error().stack);
        }
      });
    }
  }

  _makeUpdateURL(){
    var stInfo = configUtil.getConfig().st;
    if(stInfo.app_url == "" || stInfo.app_id == "" || stInfo.access_token == ""){
      return null;
    }

    return stInfo.app_url + stInfo.app_id + "/update?access_token=" + stInfo.access_token;
  }


  _registerTVListener(device, address){
    device.on("notify", (data)=>{
//      logger.info("[" + address + "] TV Notify >> " + JSON.stringify(data));
      this._notifyDataToST(address, data.type, data.data);
    });
  }

  _registerDeviceToST(address, type){
    return new Promise((resolve, reject)=> {
      this._stDeviceList()
      .then(list=>{
        if(list.includes(address)){
          resolve(false);
          return;
        }

        var stInfo = configUtil.getConfig().st;
        if(stInfo.app_url == ""){
          resolve(false);
          return;
        }

        var url = stInfo.app_url + stInfo.app_id + "/add?access_token=" + stInfo.access_token;
        var data = {'address':address, 'type':type};
        request.post({'url':url, 'form': data}, (err,httpResponse,body)=>{
          var json = JSON.parse(body);
          if(json.result == "nonExist" || json.result == "fail"){
              var content = ( json.result == "nonExist" ? ("ST Smartpapps does not support DTH!!!") : ("ST Smartapps couldn't add this id=" + id + ", address=" + address + "!!!") );
              logger.warn(content);
          }
          if(err){
            logger.error("Failed to register device Address(" + address + ")\n" + err + "\n" + new Error().stack);
          }else{
            logger.info("Success to register device Address(" + address + ")");
          }
          resolve(true);
        });
      })
      .catch(err=>{
        resolve(false);
      });
    });
  }

  _stDeviceList(){
    return new Promise((resolve, reject)=>{
      var stInfo = configUtil.getConfig().st;
      if(stInfo.app_url == ""){
        resolve(false);
        return;
      }
      var url = stInfo.app_url + stInfo.app_id + "/list?access_token=" + stInfo.access_token;
      request.get(url ,function(err,res,body){
        if(err){
          reject();
        }
        var data;
        try{
          data = JSON.parse(body);
          if(data.list == null){
            reject();
          }
          resolve(data.list);
        }catch(e){
          logger.error("Get Data from ST is failed....");
          reject("Get Data from ST is failed....");
        }

      });
    });
  }


}

module.exports = new LGDeviceManager();
