const Base 				= require('./base');
const uuidv1 			= require('uuid/v1');
const urljoin 		= require('url-join');
const request 		= require("request");
const replaceall  = require("replaceall");
const JSON5       = require('json5')
const logger    	= require('../../util/log').log;

class Monitor extends Base {

  constructor(name, device_id, mac, deviceType, api_root, access_token, session_id){
    super();

    this.name = name;
    this.finder = null;
    this.api_root = api_root;
    this.device_id = device_id;
    this.mac = mac;
    this.access_token = access_token;
    this.session_id = session_id;
    this.work_id = null;
    this.timer = null;
    this.deviceType = deviceType;

    this.langPack = null;
    this.data = null;
    this.monitor = {"count":0, "power":"init"};

    this.pollingTime = 3000;
    this._failCount = 0;
    this._pollCount = 0;
    this._skipCountToPoll = 0;
    this.SKIP_POLL_COUNT__WHEN_REFRESH_SESSION = 3;

  }

  setPrivateData(session_id, access_token){
    this.session_id = session_id;
    this.access_token = access_token;
  }

  setFinder(finder){
    this.finder = finder;
  }

  setPollingTime(second){
    this.pollingTime = second * 1000;
  }

  _request(url){
    return new Promise( (resolve, reject)=> {
      request({url:url}, (error, response, body)=> {
        if(error){
          reject(error);
        }else{
          resolve(JSON5.parse( body ));
        }
      });
    });
  }

  async setData(data){
    this.data = await this._request(data.modelJsonUrl);
    this.langPack = await this._request(data.langPackProductTypeUri);

/*
    var keyList = Object.keys(this.data.Value);
    for (var i=0; i<keyList.length; i++) {
      try{
        var _title = keyList[i];
        var _target = this.data.Value[keyList[i]];
        if(_target.option){
          var optKeyList = Object.keys(_target.option);
          for (var m=0; m<optKeyList.length; m++) {
            var _subValue = _target.option[optKeyList[m]];
            if(!Array.isArray(_subValue) && isNaN(_subValue) && _subValue.substring(0, 1) == "@"){
              if(this.langPack.pack[_subValue] != undefined){
                _target.option[optKeyList[m]] = this.langPack.pack[_subValue]
            //    console.log("new value >> " + this.langPack.pack[_subValue]);
              }
            }
          }
        }
      }catch(err){
        console.log(err);
      }
    }
*/
  }

  getMac(){
    return this.mac;
  }

  async init(){
    try{
//      await this.finder.refreshSession();
      await this._requestMonitorStart(true);
      await this._requestMonitorStart(true);
      await this.deletePermition();
      await this.deletePermition();
    }catch(err){
      console.log(err);
      this._notifyPowerOff();
    }

//    this._initTimer();
  }

  _initTimer(){
    if(!this.timer){
        this.timer = setInterval(async ()=>{
          try{
            await this._poll();
          }catch(err){
            if(err.code == "0106"){
              this._notifyPowerOff();
            }
          }
        }, this.pollingTime);
      }
  }

  async reInit(){
    await this._requestMonitorStart(true);
    await this._requestMonitorStart(true);
    await this.deletePermition();
    await this.deletePermition();
  }

  async _failProcess(){
  logger.error("[" + this.name + "] Fail to get data.");
  if(!this.find.isLocked()){
    await this.find.requestRefreshSession();
    await this.reInit();
  }

/*
  await this.finder.refreshSession();
  await this.finder.getDeviceList();
  await this._requestMonitorStart(true);
  await this._requestMonitorStart(true);
  await this.deletePermition();
  await this.deletePermition();
*/
  }

  /**
  * Get the result of a monitoring task.
  * `work_id` is a string ID retrieved from `monitor_start`. Return
  * a status result, which is a bytestring, or None if the
  * monitoring is not yet ready.
  * May raise a `MonitorError`, in which case the right course of
  * action is probably to restart the monitoring task.
  */
  async _poll(){
    if(this._skipCountToPoll > 0){
      this._skipCountToPoll--;
      if(this._skipCountToPoll < 0){
        this._skipCountToPoll = 0;
      }
      return;
    }
    if(this.work_id == null){
      await this._failProcess();
      this._skipCountToPoll = this.SKIP_POLL_COUNT__WHEN_REFRESH_SESSION;
      return;
    }

    try{
      var work_list = [{'deviceId': this.device_id, 'workId': this.work_id}]
      var res = await this._post('rti/rtiResult', {'workList': work_list});
      if(res){
     //   logger.info("[" + this.name + "] returnCd(" + res.returnCd + "), returnMsg(" + res.returnMsg + ")");
      if(res['workList'] == undefined){
        logger.error("[" + this.name + "] is error to get monitor data #1. No Data >> " + JSON.stringify(res));
        this.work_id = null;
        return;
      }
      res = res['workList'];
    //    logger.info("[" + this.name + "] devState(" + res.deviceState + "), returnCode(" + res.returnCode + "), stateCode(" + res.stateCode + "), workId(" + res.workId + ")");

        // Check for errors.
        var code = res.returnCode;  // returnCd can be missing.
        if(code == undefined || !(code == '0000' || code == '0100')){
          logger.error("[" + this.name + "] is error to get monitor data #2. CODE(" + code + ") >> " + (res.msg != undefined ? res.msg : JSON.stringify(res)));
          this.work_id = null;
          return;
        }
        // The return data may or may not be present, depending on the
        // monitoring task status.
        if(res.returnData){
          // The main response payload is base64-encoded binary data in
          // the `returnData` field. This sometimes contains JSON data
          // and sometimes other binary data.
          var monitorData = res['returnData'];
          this.parsingData(monitorData);
          this._failCount = 0;
    //      logger.info("[" + this.name + "] body: " + monitorData.substring(0, 30) + "...\n");
        }
      }else{
      logger.error("[" + this.name + "] post is null....");
      }

    }catch(err){
      this.work_id = null;
      logger.error("[" + this.name + "] is error to get monitor data. >> " + JSON.stringify(err));
    }
  }

  async _poll2(){
    try{
      var work_list = [{'deviceId': this.device_id, 'workId': this.work_id}]
      var res = await this._post('rti/rtiResult', {'workList': work_list});
      if(res){
        if(res['workList'] == undefined){
          if([this.WASHER, this.DRYER].includes(this.deviceType)){
            this._notifyPowerOff();
            return true;
          }
          logger.error("[" + this.name + "] is error to get monitor data #1. No Data >> " + JSON.stringify(res));
          this.work_id = null;
          return false;
        }
        res = res['workList'];

        var code = res.returnCode;  // returnCd can be missing.
        if(res.returnData){
          var monitorData = res['returnData'];
          this.parsingData(monitorData);
        }else{
          if(code == "0106"){
            logger.warn("[" + this.name + "] is error to get monitor data CODE(0106) >> " + JSON.stringify(res));
            return true;
          }

          if(code == undefined || !(code == '0000' || code == '0100' || code == '9003')){
            logger.error("[" + this.name + "] is error to get monitor data #2. CODE(" + code + ") >> " + (res.msg != undefined ? res.msg : JSON.stringify(res)));
            this.work_id = null;
            return false;
          }
        }
      }
    }catch(err){
      logger.error(err);
      this.work_id = null;
      /*
      if(err.code != undefined && err.code == "0102"){
        await this.finder._makeSession();
        await this.finder.getDeviceList();
      }
      */
      return false;
    }
    return true;
  }

  async control(command, value){
    logger.info("Control >> " + command  + " [ " + value + " ]");
    var target = this.data.ControlWifi.action[command];
    var val = value;


    if(this.data.ControlWifi.type == "BINARY(BYTE)"){

    }else if(this.data.ControlWifi.type == "JSON"){
      try{
        val = JSON.parse(value);
      }catch(err){
        val = value
      }
    }

    try{
      var result = await this._control(this._makeControlData(target.cmd, target.cmdOpt, val));
      setTimeout(()=>{
        this._poll2();
      }, 2000);
      return result;
    }catch(err){
      console.log(err);
      if(err.code != undefined && err.code == "0102"){
        await this.finder.reInit();
      }
      return err;
    }

/*
    if(target.cmdOpt == "Set"){
      var name = command.substring(3, command.length);

      var putValue = value;

      if(typeof value != "number" && value.substring(0,1) == "@"){
        putValue = this._getItemKey(this.data.Value[name].option, value);
      }

      var dataObj = {};
      dataObj[name] = (putValue == null ? value : putValue);
      var result = await this._control(this._makeControlData(target.cmd, target.cmdOpt, dataObj));
      return result;
    }else{
      var name = command.substring(3, command.length);
      var putValue = value;
      if(value.substring(0,1) == "@"){
        putValue = this._getItemKey(this.data.Value[name].option, value);
      }
      if(target != undefined){
        var result = await this._control(this._makeControlData(target.cmd, target.cmdOpt, (putValue == null ? value : putValue)));
        return result;
      }
    }*/
    return null;
  }

  toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
  }

  async _control(options){
    var data = await this._post('rti/rtiControl', options);
    return data;
  }

  async deletePermition(){
    try{
      var data = await this._post('rti/delControlPermission', {'deviceId': this.device_id});
      return data;
    }catch(err){
      console.log(err);
      return null;
    }
  }

  parsingData(data){
    this._processParsingData(data);
  }

  _processParsingData(data){
    var baseData = this.data["Monitoring"];
    var notifyData = {};
    var isChanedValue = false;

    var dataTarget;
    if(baseData.type == "BINARY(BYTE)"){
      dataTarget = Buffer.from(data, 'base64').toString('hex');
    }else if(baseData.type == "JSON"){
      dataTarget = JSON.parse(Buffer.from(data, 'base64').toString('ascii'));
    }

    var tmp = dataTarget;

    this.monitor["count"]++;
    for(var i=0; i<baseData.protocol.length; i++){
      var item = baseData.protocol[i];
      var title = item.value;
      var value;
      if(baseData.type == "BINARY(BYTE)"){
        value = parseInt(dataTarget.substring(item.startByte*2, item.startByte*2 + item.length*2), 16);
      }else if(baseData.type == "JSON"){
        value = dataTarget[title];
      }

      if(value == undefined){
        continue;
      }

      var strValue = null;
      var realValue = value;
      try{
        var type = this.data["Value"][title]["type"];
        if(type == "Range"){
        }else if(type == "Reference"){
        }else if(type == "Enum"){
          realValue = this.data["Value"][title]["option"][value.toString()];
      //    console.log(title + " >> " + realValue);
      //    if(realValue == undefined){
      //      continue;
      //    }
          if(!Number.isInteger(realValue)){
            if(realValue.substring(0, 1) == "@" && realValue != undefined){
              strValue = this.langPack.pack[realValue] == undefined ? null : this.langPack.pack[realValue];
            }
          }
        }else{
        }
      }catch(err){
        realValue = value;
      }
      delete tmp[title];

      if(realValue != undefined){
        if(this.monitor[title] == undefined || (this.monitor[title] != realValue)){
          isChanedValue = true;
        }
      }

      notifyData[title] = {"value":value, "rValue":realValue};
      if(strValue != null){
        notifyData[title]['sValue'] = strValue;
      }
      this.monitor[title] = realValue;
    }

    // Monitor 에서 누락된 것.
    var keyList = Object.keys(tmp);
    for (var i=0; i<keyList.length; i++) {
      var _title = keyList[i];
      var _value = tmp[keyList[i]];
      var _realValue = _value;
      if(_value == "NS"){
        continue;
      }

      try{
        var _type = this.data["Value"][_title]["type"];
        if(type == "Enum"){
          var _tmp = this.data["Value"][_title]["option"][_title.toString()];
          if(_tmp != undefined){
            _realValue = _tmp;
            if(!Number.isInteger(_realValue)){
              if(_realValue.substring(0, 1) == "@" && _realValue != undefined){
                _realValue = this.langPack.pack[_realValue] == undefined ? _realValue : this.langPack.pack[_realValue];
              }
            }
          }
        }
        this.monitor[_title] = _realValue;
        notifyData[_title] = {"value":_value, "rValue":_realValue};
      }catch(err){
    //    console.log(err);
    //    console.log("_realValue >> " + _realValue);
      }
    }

/*
    if(this.monitor["count"] % 50 == 0){
      this.monitor["count"] == 0;
      isChanedValue = true;
    }
*/
    isChanedValue = true;
    try{
      if(isChanedValue){
        notifyData["power"] = "on";
        this.monitor["power"] = "on";
        this.emit("notify", { "id":this.mac, "type":this.deviceType, "data":notifyData});
      }
    }catch(err){
      logger.error(err);
    }

  }

  async _requestMonitorStart(start){
    try{
      var data = await this._post('rti/rtiMon', {
        'cmd': 'Mon',
        'cmdOpt': start ? 'Start' : 'Stop',
        'deviceId': this.device_id,
        'workId': uuidv1(),
      });
      this.work_id = data.workId;
    }catch(err){
      // this.work_id = null;
      logger.error("[" + this.name + "] Error to request monitor start >> " + JSON.stringify(err));
    }
    return this.work_id;
  }

  async _requestTest(){
    try{
      var data = await this._post('rti/rtiControl', {
        'deviceId': this.device_id,
        'workId': uuidv1(),
        'cmd': 'Config',
        'cmdOpt': 'Get',
        'value': 'OutTotalInstantPower',
      });
      console.log(data);
      let buff = new Buffer(data.returnData, 'base64');
    let text = buff.toString('ascii');
      console.log(text);
      return data;
    }catch(err){
      return null;
    }
  }

  async _requestMonitorStart2(){
    try{

      var data = await this._post('rti/rtiControl', {
        'deviceId': this.device_id,
        'workId': uuidv1(),
        'cmd': 'Config',
        'cmdOpt': 'Set',
        'value': 'SensorMon',
        'data': Buffer.from(JSON.stringify({'SensorMon' : '1'})).toString('base64'),
      });
      console.log(data);
      this.work_id = data.workId;
      return data;
    }catch(err){
      console.log(err);
      return null;
    }
  }

  async _requestMonitorStop2(){
    try{

      var data = await this._post('rti/rtiControl', {
        'deviceId': this.device_id,
        'workId': uuidv1(),
        'cmd': 'Config',
        'cmdOpt': 'Set',
        'value': 'SensorMon',
        'data': Buffer.from(JSON.stringify({'SensorMon' : '0'})).toString('base64'),
      });

      if(data.code == '0009'){
        this.finder.deleteDevice(this.device_id);
      }else{
      this.work_id = data.workId;
      }
      return data;
    }catch(err){
      console.log(err);
      return null;
    }
  }

  /**
  * Make a POST request to the API server.
  * This is like `lgedm_post`, but it pulls the context for the
  * request from an active Session.
  */
  _post(path, data=null){
    var url = urljoin(this.api_root + '/', path)
    return this.lgedm_post(url, data, this.access_token, this.session_id);
  }

  _makeControlData(cmd, cmdOpt, value){
    return {
      'cmd': cmd,
      'cmdOpt': cmdOpt,
      'value': value,
      'deviceId': this.device_id,
      'workId': uuidv1()
    }
  }

  _getItemKey(target, value){
    var keyList = Object.keys(target);
    for (var i=0; i<keyList.length; i++) {
      var item = target[keyList[i]];
      if(item == value){
        return keyList[i];
      }
    }
    return  null;
  }

  _notifyPowerOff(){
    if(this.monitor["power"] == "on" || this.monitor["power"] == "init"){
      this.monitor["power"] = "off";
      this.emit("notify", { "id":this.mac, "type":this.deviceType, "data":{"State":{"value":"0"}}});
    }
  }

}
module.exports = Monitor;
