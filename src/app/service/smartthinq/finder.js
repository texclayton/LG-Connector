const Base 						= require('./base');
const urljoin 				= require('url-join');
const urlUtil 				= require('url');
const base64 					= require('base-64');
const CryptoJS 				= require("crypto-js");
const moment 					= require('moment');
const Monitor 				= require('./monitor');
const Refrigerator 		= require('./refrigerator');
const Washer					= require('./washer');
const AC							= require('./ac');
const Dryer						= require('./dryer');
const Styler          = require('./styler');
const AirPuriFier     = require('./air-purifier');
const DishWasher      = require('./dish-washer');
const Dehumidifier    = require('./dehumidifier');
const DefaultDevice   = require('./default-device');
const KimchiRefrigerator = require('./kimchi-refrigerator');
const RobotCleaner = require('./robot-cleaner');
const logger    			= require('../../util/log').log;
const configUtil      = require('../../util/config');

class Finder extends Base{

  constructor(){
    super();

    this.auth_base 		= null;
    this.api_root 		= null;
    this.oauth_root 	= null;
    this.session_id		= null;
    this.refresh_token 	= null;
    this.access_token	= null;
    this.list 			= {};
    this._locked		= false;
    this.pollTimer  = null;
    this._timerMinuteCount = 0;

    this._POLL_TIME_SECOND			= 1*60;
    this._REFRESH_TIME_SECOND		= 5*60;
    this._REFRESH_TIME_AUTH_SECOND	= 60*30;
  /*
    setInterval(async()=>{
      this.refreshAuth();
    }, 1000 * 60 * 20);

    setInterval(async()=>{
    await this.reInit();
    }, 1000 * 60 * 5);
    */

    var tempTimer = setInterval(()=>{
      if(configUtil.getConfig()["pollingTime"] != undefined){
        try{
          this._POLL_TIME_SECOND = configUtil.getConfig().pollingTime * 60;
          logger.info("Polling Time: " + configUtil.getConfig().pollingTime + "Mins");
        }catch(err){
          logger.error(err);
        }
        clearTimeout(tempTimer);
      }
    }, 100);



  }

  async initPollTimer(){
    if(this.pollTimer != null){
      return;
    }

//    this._POLL_TIME_SECOND = 10;
//    this.pollProcessor();
    this.pollTimer = setInterval(async()=>{
      this.pollProcessor();

/*
      try{
        if(this._timerSecondCount % this._POLL_TIME_SECOND == 0){
          console.log(",,,,,,,,,,," + this._timerSecondCount);
          console.log(this.pollTimer);
          var existPollFail = await this._processTimerPolling();
          if(existPollFail){
            skipReInit = true;
          }
        }
        if((this._timerSecondCount > 0 && this._timerSecondCount % this._REFRESH_TIME_SECOND == 0) || !skipReInit){
           await this.reInit();
        }
        if(this._timerSecondCount > 0 && (this._timerSecondCount % this._REFRESH_TIME_AUTH_SECOND == 0)){
           await this.refreshAuth();
        }
      }catch(err){
        logger.error(JSON.stringify(err));
      }
*/

    }, 1000 * this._POLL_TIME_SECOND);
  }

  async pollProcessor(){
    var skipReInit = true;
    try{
      var existPollFail = await this._processTimerPolling();
      if(existPollFail){
        skipReInit = true;
      }

      if((this._timerMinuteCount > 0 && this._timerMinuteCount % (this._REFRESH_TIME_SECOND/60) == 0) || !skipReInit){
         await this.reInit();
      }
      if(this._timerMinuteCount > 0 && (this._timerMinuteCount % (this._REFRESH_TIME_AUTH_SECOND/60) == 0)){
         await this.refreshAuth();
      }
    }catch(err){
      logger.error(JSON.stringify(err));
    }
    this._timerMinuteCount++;
  }

  async _processTimerPolling(){
    var failed = false;
    var list = this._getDeviceList();
    for(var i=0; i<list.length; i++){
      var device = list[i];
      var result = await device._poll2();
      if(!result){
        failed = true;
      }
    }
    if(failed){
      await this.reInit();
      for(var i=0; i<list.length; i++){
        var device = list[i];
        await device.reInit();
      }
    }
    return failed;
  }

  _getDeviceList(){
    var list = [];
    var keyList = Object.keys(this.list);
    for (var i=0; i<keyList.length; i++) {
      var item = this.list[keyList[i]];
      list.push(item);
    }
    return list;
  }

  isLocked(){
     return this._locked;
  }

  async requestRefreshSession(){
    logger.error("Request a refresh session to Manager.");
    return this.reInit();
  }

  async reInit(){
    logger.info("Refresh a sesion....");
//    this._locked = true;
    this.session_id = null;
    await this.refreshSession();
    await this.getDeviceList();

    var list = this._getDeviceList();
    for(var i=0; i<list.length; i++){
      var device = list[i];
      await device.reInit();
    }
//    this._locked = false;
    return;
  }

  async refreshAuth(){
    logger.info("Refresh a auth....");
    var data = await this.refresh_auth();
    var keyList = Object.keys(this.list);
    for (var i=0; i<keyList.length; i++) {
      var item = this.list[keyList[i]];
      item.setPrivateData(data.session_id, data.access_token);
    }
    return;
  }

  async refreshSession(){
    var session_id = await this._makeSession();
    var keyList = Object.keys(this.list);
    for (var i=0; i<keyList.length; i++) {
      var item = this.list[keyList[i]];
      item.setPrivateData(session_id, this.getAccessToken());
    }
  }

  getAccessToken(){
    return this.access_token;
  }

  getSessionID(){
    return this.session_id;
  }

  deleteDevice(id){
    delete this.list[id];
  }

  async find(){
    logger.info("Find LG Devices....");
    var result = await this.getDeviceList();
    var deviceList = result.item;
    if(!Array.isArray(deviceList)){
      var tmp = [];
      tmp.push(deviceList);
      deviceList = tmp;
    }
    for(var i=0; i<deviceList.length; i++){
      var item = deviceList[i];
      if(item == undefined){
        logger.error("No device....");
        return;
      }
      if(this.list[item.deviceId] == undefined){
        var monitor = null;
        switch(item.deviceType){
        case this.REFRIGERATOR:
          monitor = new Refrigerator(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.WASHER:
          monitor = new Washer(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.AC:
          monitor = new AC(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.DRYER:
          monitor = new Dryer(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.STYLER:
          monitor = new Styler(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.AIR_PURIFIER:
          monitor = new AirPuriFier(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.DishWasher:
          monitor = new DishWasher(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.DEHUMIDIFIER:
          monitor = new Dehumidifier(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.KIMCHI_REFRIGERATOR:
          monitor = new KimchiRefrigerator(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        case this.ROBOT_KING:
          monitor = new RobotCleaner(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        default:
          monitor = new DefaultDevice(item.alias, item.deviceId, item.macAddress, item.deviceType, this.api_root, this.getAccessToken(), this.getSessionID());
          break;
        }

        if(monitor){
          monitor.setData(item);
          monitor.setFinder(this);
          await monitor.init();
          monitor.on("notify", (data)=>{
            this.emit("notify", data);
          });

          this.emit("find", {"target":monitor, "info":item});
          this.list[item.deviceId] = monitor;
        }

      }
    }
    this.initPollTimer();
    return;
  }

  setPrivateData(auth_base, api_root, oauthUri, refreshToken){
    this.auth_base 		= auth_base;
    this.api_root 		= api_root;
    this.oauth_root 	= oauthUri;
    this.refresh_token	= refreshToken;
    return this.refresh_auth();
  }

  /**
  * Parse the URL to which an OAuth login redirected to obtain two
    * tokens: an access token for API credentials, and a refresh token for
    * getting updated access tokens.
    */
  parseOauthURL(url){
    var url_parts = urlUtil.parse(url, true);
    var access_token = url_parts.query.access_token;
    var refresh_token = url_parts.query.refresh_token;
    return {'access_token':access_token, 'refresh_token':refresh_token};
  }

  /**
  * Get the base64-encoded SHA-1 HMAC digest of a string, as used in
    * OAauth2 request signatures.
    * Both the `secret` and `message` are given as text strings. We use
    * their UTF-8 equivalents.
    */
  oauth2_signature(message, secret){
  //	var hashed = CryptoJS.HmacSHA1(message, secret)
  //	return base64.encode(hashed)
    var encrypted = CryptoJS.HmacSHA1(message, secret);
    return CryptoJS.enc.Base64.stringify(encrypted);
  }

    /**
  * Load information about the hosts to use for API interaction.
    */
  async getLoginData(){
    try{
      var data = await this.lgedm_post3(this.GATEWAY_URL, {'countryCode': this.COUNTRY, 'langCode': this.LANGUAGE});

      if(data.empUri){
        this.auth_base = data.empUri;
      }
      if(data.thinqUri){
        this.api_root = data.thinqUri;
      }
      if(data.oauthUri){
        this.oauth_root = data.oauthUri;
      }

      return {"url":this._oauthURL(), "auth_base":data.empUri, "api_root":data.thinqUri, "oauth_root":data.oauthUri};
    }catch(err){
      console.log(err);
    }
    return null;
  }

  /**
  * Construct the URL for users to log in (in a browser) to start an
    * authenticated session.
    */
  _oauthURL(){
    var query = '?authSvr=oauth2&svcCode=' + this.SVC_CODE + '&division=ha&client_id=' + 'LGAO221A02' + '&grant_type=password&language=' + this.LANGUAGE + '&country=' + this.COUNTRY;
    var url = urljoin(this.auth_base, 'login/sign_in', query);
    return url;
  }



  async _makeSession(){
    var data = await this._login(this.access_token);
    this.session_id = data['jsessionId'];
    return this.session_id;
  }

  async getDeviceList(){
    var session_id = this.session_id;
    if(!session_id){
      session_id = await this._makeSession();
    }
    var url = urljoin(this.api_root + '/', 'device/deviceList');
    return this.lgedm_post(url, null, this.access_token, session_id);
  }

  /**
  * Use an access token to log into the API and obtain a session and
    * return information about the session.
    */
  _login(access_token){
    var url = urljoin(this.api_root + '/', 'member/login');
    var data = {
      'countryCode': this.COUNTRY,
      'langCode': this.LANGUAGE,
      'loginType': 'EMP',
      'token': access_token,
    };
    return this.lgedm_post(url, data);
  }

  /**
  * Get a new access_token using a refresh_token.
    * May raise a `TokenError`.
    */
  async refresh_auth(){
    var token_url = urljoin(this.oauth_root, '/oauth2/token');
    var data = {
      'grant_type': 'refresh_token',
      'refresh_token': this.refresh_token,
    }

    // The timestamp for labeling OAuth requests can be obtained
    // through a request to the date/time endpoint:
    // https://us.lgeapi.com/datetime
    // But we can also just generate a timestamp.
  //	var timestamp = moment().format(this.DATE_FORMAT);
    var timestamp = await this.getTimeStamp();

    // The signature for the requests is on a string consisting of two
    // parts: (1) a fake request URL containing the refresh token, and (2)
    // the timestamp.
    var req_url = ('/oauth2/token?grant_type=refresh_token&refresh_token=' + this.refresh_token);
    var sig = this.oauth2_signature(req_url + "\n" + timestamp, this.OAUTH_SECRET_KEY);

    var headers = {
      'lgemp-x-app-key': this.OAUTH_CLIENT_KEY,
      'lgemp-x-signature': sig,
      'lgemp-x-date': timestamp,
      'Accept': 'application/json',
      'Authorization': ''
    }

    var result = await this.lgedm_post2(token_url, data, headers);
    var resultObj = JSON.parse(result);
    if(resultObj['status'] != 1){
      logger.error("Token Error");
    }
    this.access_token = resultObj['access_token'];
    var sessionID = await this._makeSession(this.access_token);
    return {"session_id":sessionID, "access_token":this.access_token};
  }


}

module.exports = Finder;
