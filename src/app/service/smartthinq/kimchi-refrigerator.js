const Monitor 			   = require('./monitor');
const logger    	     = require('../../util/log').log;

class KimchiRefrigerator  extends Monitor {

  constructor(name, device_id, mac, deviceType, api_root, access_token, session_id){
    super(name, device_id, mac, deviceType, api_root, access_token, session_id);

  }


}

module.exports = KimchiRefrigerator;
