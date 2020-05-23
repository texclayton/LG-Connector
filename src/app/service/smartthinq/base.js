const request         = require("request");
const EventEmitter    = require('events');
const xmlParse        = require('xml-parser');
const configUtil      = require('../../util/config');
const logger          = require('../../util/log').log;

class Base extends EventEmitter{

  constructor(){
    super();

    this.REFRIGERATOR = 101
    this.KIMCHI_REFRIGERATOR = 102
    this.WATER_PURIFIER = 103
    this.WASHER = 201
    this.DRYER = 202
    this.STYLER = 203
    this.DISHWASHER = 204
    this.OVEN = 301
    this.MICROWAVE = 302
    this.COOKTOP = 303
    this.HOOD = 304
    this.AC = 401  // Includes heat pumps, etc., possibly all HVAC devices.
    this.AIR_PURIFIER = 402
    this.DEHUMIDIFIER = 403
    this.ROBOT_KING = 501  // Robotic vacuum cleaner?
    this.ARCH = 1001
    this.MISSG = 3001
    this.SENSOR = 3002
    this.SOLAR_SENSOR = 3102
    this.IOT_LIGHTING = 3003
    this.IOT_MOTION_SENSOR = 3004
    this.IOT_SMART_PLUG = 3005
    this.IOT_DUST_SENSOR = 3006
    this.EMS_AIR_STATION = 4001
    this.AIR_SENSOR = 4003

    this.GATEWAY_URL = 'https://kic.lgthinq.com:46030/api/common/gatewayUriList'
    this.APP_KEY = 'wideq'
    this.SECURITY_KEY = 'nuts_securitykey'
    this.DATA_ROOT = 'lgedmRoot'

    this.COUNTRY = 'KR';
    this.LANGUAGE = 'ko-KR';
    this.SVC_CODE = 'SVC202'//'SVC202'; //SVC710, SVC301, SVC609
    this.CLIENT_ID = 'LGAO221A02'//'LGAO702A02'//'LGAO221A02'
    this.OAUTH_SECRET_KEY = 'c053c2a6ddeb7ad97cb0eed0dcb31cf8'
    this.OAUTH_CLIENT_KEY = 'LGAO221A02'
    this.DATE_FORMAT = 'ddd, DD MMM GGGG HH:mm:ss +0000';

    var tempTimer = setInterval(()=>{
      if(configUtil.getConfig()["preset"] != undefined){
        try{
          this.COUNTRY = configUtil.getConfig().preset.country;
          this.LANGUAGE = configUtil.getConfig().preset.language;
        }catch(err){
          logger.error(err);
        }
        clearTimeout(tempTimer);
      }
    }, 100);
  }


  /**
  * Make an HTTP request in the format used by the API servers.
  * In this format, the request POST data sent as JSON under a special
  * key; authentication sent in headers. Return the JSON data extracted
  * from the response.
  * The `access_token` and `session_id` are required for most normal,
  * authenticated requests. They are not required, for example, to load
  * the gateway server data or to start a session.
  */
  lgedm_post(url, data=null, access_token=null, session_id=null){
    return new Promise( (resolve, reject)=> {

      var headers = {}

      if(access_token){
        headers['x-thinq-token'] = access_token
      }
      if(session_id){
        headers['x-thinq-jsessionId'] = session_id
      }

      var options = {
        url: url,
        method: 'POST',
        headers: headers,
        json: {"lgedmRoot":data}
      };

      request(options,(err, httpResponse, body)=>{
        try{
          if(body == undefined){
            reject({"name":this.name, "err":err});
          }
          var data = body.lgedmRoot;
          // Check for API errors.
          if(data.returnCd){
            var code = data.returnCd;
            if(code != '0000'){
              var message = data.returnMsg;
              if(code == "0106"){
              }else{
                reject({"code":code, "msg":message, "name":this.name});
              }
            }
          }
          resolve(data);
        }catch(err){
          reject({"name":this.name, "err":err, "body": body});
        }
      });
    });
  }

  lgedm_post2(url, data=null, headers=null){
    return new Promise( (resolve, reject)=> {

      var options = {
        url: url,
        method: 'POST',
        headers: headers,
        form: data
      };

      request(options,(err, httpResponse, body)=>{
        resolve(body);
      });
    });
  }

  lgedm_post3(url, data=null, access_token=null, session_id=null){
    return new Promise( (resolve, reject)=> {

      var headers = {
        'x-thinq-application-key': this.APP_KEY,
        'x-thinq-security-key': this.SECURITY_KEY,
        'Accept': 'application/json'
      }

      if(access_token){
        headers['x-thinq-token'] = access_token
      }
      if(session_id){
        headers['x-thinq-jsessionId'] = session_id
      }

      var options = {
        url: url,
        method: 'POST',
        headers: headers,
        json: {"lgedmRoot":data}
      };

      request(options,(err, httpResponse, body)=>{
        try{
          if(body == undefined){
            reject({"name":this.name, "err":err});
          }
          var data = body.lgedmRoot;
          // Check for API errors.
          if(data.returnCd){
            var code = data.returnCd;
            if(code != '0000'){
              var message = data.returnMsg;
              if(code == "0102"){
                reject({"code":code, "msg":message, "name":this.name});
              }else{
                reject({"code":code, "msg":message, "name":this.name});
              }
            }
          }
          resolve(data);
        }catch(err){
          reject({"name":this.name, "err":err, "body": body});
        }
      });
    });
  }

  getTimeStamp(){
    return new Promise( (resolve, reject)=> {
      request.get("https://kr.lgeapi.com/datetime", (err, httpResponse, body)=>{
        resolve(xmlParse(body).root.attributes.date);
      });
    });
  }

  getTypeName(type){
    var name = "";
    switch(type){
    case 101:
      name = "REFRIGERATOR";
      break;
    case 102:
      name = "KIMCHI_REFRIGERATOR";
      break;
    case 103:
      name = "WATER_PURIFIER";
      break;
    case 201:
      name = "WASHER";
      break;
    case 202:
      name = "DRYER";
      break;
    case 203:
      name = "STYLER";
      break;
    case 204:
      name = "DISHWASHER";
      break;
    case 301:
      name = "OVEN";
      break;
    case 302:
      name = "MICROWAVE";
      break;
    case 303:
      name = "COOKTOP";
      break;
    case 304:
      name = "HOOD";
      break;
    case 401:
      name = "AC";
      break;
    case 402:
      name = "AIR_PURIFIER";
      break;
    case 403:
      name = "DEHUMIDIFIER";
      break;
    case 501:
      name = "ROBOT_CLEANER";
      break;
    case 1001:
      name = "ARCH";
      break;
    case 3001:
      name = "MISSG";
      break;
    case 3002:
      name = "SENSOR";
      break;
    case 3003:
      name = "IOT_LIGHTING";
      break;
    case 3004:
      name = "IOT_MOTION_SENSOR";
      break;
    case 3005:
      name = "IOT_SMART_PLUG";
      break;
    case 3006:
      name = "IOT_DUST_SENSOR";
      break;
    case 4001:
      name = "EMS_AIR_STATION";
      break;
    case 4003:
      name = "AIR_SENSOR";
      break;
    }
    return name.toLowerCase();

  }

  _bin2string(array){
    var result = "";
    for(var i = 0; i < array.length; ++i){
      result+= (String.fromCharCode(array[i]));
    }
    return result;
  }
}

module.exports = Base;
