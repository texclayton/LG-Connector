const Monitor 			   = require('./monitor');
const logger    	     = require('../../util/log').log;

class Dryer  extends Monitor {

  constructor(name, device_id, mac, deviceType, api_root, access_token, session_id){
    super(name, device_id, mac, deviceType, api_root, access_token, session_id);
  }

  async control(command, value){
    return await super.control(command, value);
  }

}

module.exports = Dryer;
