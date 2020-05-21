 'use strict';

const events		= require('events');
const wol       = require('wol');
const logger    = require('../../util/log').log;

class TVDevice extends events.EventEmitter{

  constructor( info ) {
    super();

    this.info = info;
    this.appList = [];
    this.powerIsOn = false;

    this.EVENT_GET_AUDIO = "ssap://audio/getStatus";
    this.EVENT_GET_VOLUME = "ssap://audio/getVolume";
    this.EVENT_SET_MUTE = "ssap://audio/setMute";
    this.EVENT_SET_VOLUME = "ssap://audio/setVolume";
    this.EVENT_SET_VOLUME_UP = "ssap://audio/volumeUp";
    this.EVENT_SET_VOLUME_DOWN = "ssap://audio/volumeDown";

    this.EVENT_SEND_NOTIFY = "ssap://system.notifications/createToast";

    this.EVENT_SET_3D_ON = "ssap://com.webos.service.tv.display/set3DOn";
    this.EVENT_SET_3D_OFF = "ssap://com.webos.service.tv.display/set3DOff";

    this.EVENT_SET_MEDIA_PLAY = "ssap://media.controls/play";
    this.EVENT_SET_MEDIA_STOP = "ssap://media.controls/stop";
    this.EVENT_SET_MEDIA_PAUSE = "ssap://media.controls/pause";
    this.EVENT_SET_MEDIA_REWIND = "ssap://media.controls/rewind";
    this.EVENT_SET_MEDIA_FORWARD = "ssap://media.controls/fastForward";
    this.EVENT_SET_MEDIA_CLOSE = "ssap://media.viewer/close";

    this.EVENT_GET_TV_CHHANNEL_LIST = "ssap://tv/getChannelList";
    this.EVENT_SET_TV_CHANNEL_UP = "ssap://tv/channelUp";
    this.EVENT_SET_TV_CHANNEL_DOWN = "ssap://tv/channelDown";
    this.EVENT_SET_TV_CHANNEL = "ssap://tv/openChannel";
    this.EVENT_GET_TV_CHANNEL_INFO = "ssap://tv/getChannelProgramInfo";
    this.EVENT_GET_TV_CHANNEL = "ssap://tv/getCurrentChannel";

    this.EVENT_GET_INPUT_LIST = "ssap://tv/getExternalInputList";
    this.EVENT_SET_INPUT = "ssap://tv/switchInput";
    this.EVENT_GET_CURRENT_INPUT = "ssap://com.webos.applicationManager/getForegroundAppInfo";

    this.EVENT_GET_APP_LIST = "ssap://com.webos.applicationManager/listLaunchPoints";
    this.EVENT_SET_APP = "ssap://com.webos.applicationManager/launch";

    this.EVENT_GET_SERVICE_LIST = "ssap://api/getServiceList";
    this.EVENT_SET_SERVICE = "ssap://system.launcher/launch";

    this.EVENT_GET_SOFTWARE_INFO = "ssap://com.webos.service.update/getCurrentSWInformation";

    this.EVENT_OPEN_WEB = "ssap://system.launcher/open";
    this.EVENT_CLOSE_WEB = "ssap://webapp/closeWebApp";

    this.EVENT_POWER_OFF = "ssap://system/turnOff";

    this._init();
    this._polling();
  }

  _init(){
    this.lgtv = require("lgtv2")({
        url: 'ws://' + this.info.address + ':3000',
        reconnect: 5000,
        timeout: 15000,
  //      keyFile: '/root/keyfile'
    });
    this.lgtv.on('error',  (err)=> {
      console.log("TV error...");
      this.emit('notify', {"type":"connection", "data": false});
      logger.error(err);
    });

    this.lgtv.on('connect', ()=> {
      this.emit('notify', {"type":"connection", "data": true});
      this._registerListener();
    });

    this.lgtv.on('connecting', ()=>{
      // console.log("TV Re Connect.....");
    })

    this.lgtv.on('close', ()=> {
      console.log("TV close...");
      this.emit('notify', {"type":"connection", "data": false});
    });
  }

  _polling(){
    setInterval(async ()=>{
      try{
         var tmp = await this.getInputList();
      }catch(err){}
    }, 10000);
  }

  destroy(){
    logger.info("[" + this.info.address + "] TV is destroy.....");
    this.lgtv.disconnect();
  }

  /**
  * Power
  */
  powerOn(mac){
    logger.info("[" + this.info.address + "] TV Command(Power On)");
    var _mac = mac || this.info.mac
    if(_mac){
      wol.wake(_mac.toUpperCase(), function(err, res){
        if(err){
          logger.error("[" + this.info.address + "] TV Command(Power On) >> " + err );
        }
      });
    }
  }

  powerOff(){
    logger.info("[" + this.info.address + "] TV Command(Power Off)");
    this.lgtv.request(this.EVENT_POWER_OFF);
  }

  power(status){
    if(status == "on"){
      this.powerOn();
    }else{
      this.powerOff();
    }
  }

  /**
  * Audio
  */
  mute(mute){
    logger.info("[" + this.info.address + "] TV Command(Mute " + (mute ? "Mute" : "UnMute") + ")");
    this.lgtv.request(this.EVENT_SET_MUTE, {mute: mute});
  }

  volume(volume){
    logger.info("[" + this.info.address + "] TV Command(Volume:" + volume + ")");
    this.lgtv.request(this.EVENT_SET_VOLUME, {volume: parseInt(volume)});
  }

  volumeUp(){
    logger.info("[" + this.info.address + "] TV Command(Volume Up)");
    this.lgtv.request(this.EVENT_SET_VOLUME_UP);
  }

  volumeDown(){
    logger.info("[" + this.info.address + "] TV Command(Volume Down)");
    this.lgtv.request(this.EVENT_SET_VOLUME_DOWN);
  }

  /**
  * TV Channel
  */
  channelUp(){
    logger.info("[" + this.info.address + "] TV Command(Channel Up)");
    this.lgtv.request(this.EVENT_SET_TV_CHANNEL_UP);
  }

  channelDown(){
    logger.info("[" + this.info.address + "] TV Command(Channel Down)");
    this.lgtv.request(this.EVENT_SET_TV_CHANNEL_DOWN);
  }

  setChannel(number){
    logger.info("[" + this.info.address + "] TV Command(Channel:" + number + ")");
    this.lgtv.request(this.EVENT_SET_TV_CHANNEL, {channelId: number});
  }

  getCurrentChannelInfo(){
    return new Promise( (resolve, reject)=> {
      this.lgtv.request(this.EVENT_GET_TV_CHANNEL_INFO, (err, res)=>{
        if(err){
          reject(err);
        }else{
          console.log(res);
          resolve(res);
        }
      });
    });
  }

  getCurrentChannel(){
    return new Promise( (resolve, reject)=> {
      this.lgtv.request(this.EVENT_GET_TV_CHANNEL, (err, res)=>{
        if(err){
          reject(err);
        }else{
          resolve(res);
        }
      });
    });
  }

  /**
  * Message
  */
  sendMessage(message){
    logger.info("[" + this.info.address + "] TV Command(Message:" + message + ")");
    this.lgtv.request(this.EVENT_SEND_NOTIFY, {message: message});
  }

  /**
  * Apps
  */
  getApps(){
    return new Promise( (resolve, reject)=> {
      this.lgtv.request(this.EVENT_GET_APP_LIST, (err, res)=>{
        if(err){
          reject(err);
        }else{
          resolve(res);
        }
      });
    });
  }

  setApp(id, param){
    logger.info("[" + this.info.address + "] TV Command(App:" + id + ")");
    var data = {id:id};
    if(param){
      data['params'] = param;
    }
    this.lgtv.request(this.EVENT_SET_APP, data);
  }

  /**
  * Input
  */
  getInputList(){
    return new Promise( (resolve, reject)=> {
      this.lgtv.request(this.EVENT_GET_INPUT_LIST, (err, res)=>{
        if(err){
          reject(err);
        }else{
          resolve(res);
        }
      });
    });
  }

  setInput(id){
    logger.info("[" + this.info.address + "] TV Command(Input:" + id + ")");
    this.lgtv.request(this.EVENT_SET_INPUT, {inputId: id});
  }

  /**
  * Media
  */
  play(){
    logger.info("[" + this.info.address + "] TV Command(Play)");
    this.lgtv.request(this.EVENT_SET_MEDIA_PLAY);
  }

  pause(){
    logger.info("[" + this.info.address + "] TV Command(Pause)");
    this.lgtv.request(this.EVENT_SET_MEDIA_PAUSE);
  }

  stop(){
    logger.info("[" + this.info.address + "] TV Command(Stop)");
    this.lgtv.request(this.EVENT_SET_MEDIA_STOP);
  }

  rewind(){
    logger.info("[" + this.info.address + "] TV Command(Rewind)");
    this.lgtv.request(this.EVENT_SET_MEDIA_REWIND);
  }

  forward(){
    logger.info("[" + this.info.address + "] TV Command(Forward)");
    this.lgtv.request(this.EVENT_SET_MEDIA_FORWARD);
  }

  /**
  * Service
  */
  getService(){
    return new Promise( (resolve, reject)=> {
      this.lgtv.request(this.EVENT_GET_SERVICE_LIST, (err, res)=>{
        if(err){
          reject(err);
        }else{
          resolve(res);
        }
      });
    });
  }

  setService(id){
    this.lgtv.request(this.EVENT_SET_SERVICE, {id:id});
  }

  getSystemSofrwareInfo(){
    return new Promise( (resolve, reject)=> {
      this.lgtv.request(this.EVENT_GET_SOFTWARE_INFO
        , (err, res)=>{
        if(err){
          reject(err);
        }else{
          resolve(res);
        }
      });
    });
  }

  /**
  * Web
  */
  web(url){
    logger.info("[" + this.info.address + "] TV Command(Web:" + url + ")");
    this.lgtv.request(this.EVENT_OPEN_WEB, {target:url});
  }

  webClose(){
    this.lgtv.request(this.EVENT_CLOSE_WEB);
  }

  _registerListener(){
    this.lgtv.subscribe(this.EVENT_GET_VOLUME, (err, res)=> {
        if (res.changed.indexOf('volume') !== -1) {
          this.emit('notify', {"type":"volume", "data":res.volume});
        }
        if (res.changed.indexOf('muted') !== -1) {
          this.emit('notify', {"type":"mute", "data":res.muted});
        }
    });

    this.lgtv.subscribe(this.EVENT_GET_AUDIO, (err, res)=> {
    //  console.log("Audio >> ");
    //    console.log(res);
    });

    this.lgtv.subscribe(this.EVENT_GET_CURRENT_INPUT, (err, res)=> {
      if(res.appId){
        if(!this.powerIsOn){
          this.emit('notify', {"type":"power", "data":"on"});
          this.powerIsOn = true;
        }
        this.emit('notify', {"type":"input", "data":res.appId});
      }else{
        this.emit('notify', {"type":"power", "data":"off"});
        this.powerIsOn = false;
      }
    //    console.log(res);
    });

    this.lgtv.subscribe(this.EVENT_GET_TV_CHANNEL, (err, res)=> {
      this.emit('notify', {"type":"channelNumber", "data":res.channelNumber});
      this.emit('notify', {"type":"channelName", "data":res.channelName});
    });


    this.getApps().then(list=>{
      this.appList = list.launchPoints;
      for(var i=0; i<this.appList.length; i++){
        var item = this.appList[i];
      }
    })

  }

}

module.exports = TVDevice;
