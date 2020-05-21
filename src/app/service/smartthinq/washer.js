const Monitor 			   = require('./monitor');
const logger    	     = require('../../util/log').log;

class Washer extends Monitor {

  constructor(name, device_id, mac, deviceType, api_root, access_token, session_id){
    
		super(name, device_id, mac, deviceType, api_root, access_token, session_id);

  }

  /**
  * 냉장실 온도
  */
  async test(temp){
    var key = this._getItemKey(this.data.Value.TempRefrigerator.option, temp);
    if(key != null){
      var result = await this.control(this._makeControlData({"RETM":key}))
      return result;
    }else{
      throw new Error("Refrigerator Wrong Value >> " + temp);
    }
  }

}

module.exports = Washer;
