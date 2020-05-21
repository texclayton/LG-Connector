const Monitor 			   = require('./monitor');
const logger    	     = require('../../util/log').log;

class Refrigerator  extends Monitor {

  constructor(name, device_id, mac, deviceType, api_root, access_token, session_id){
		super(name, device_id, mac, deviceType, api_root, access_token, session_id);

    this.AIR_FRESH_MODE_OFF     = "1";
    this.AIR_FRESH_MODE_AUTO    = "2";
    this.AIR_FRESH_MODE_POWER   = "3";
    this.AIR_FRESH_MODE = [this.AIR_FRESH_MODE_OFF, this.AIR_FRESH_MODE_AUTO, this.AIR_FRESH_MODE_POWER];

  }

  /**
  * 냉장실 온도
  */
  async setTemp(temp){
    var key = this._getItemKey(this.data.Value.TempRefrigerator.option, temp);
    if(key != null){
      var result = await this._control(this._makeControlData("Control", "Set", {"RETM":key}))
      return result;
    }else{
      throw new Error("Refrigerator Wrong Value >> " + temp);
    }
  }

  /**
  * 냉동실 온도
  */
  async setFreezerTemp(temp){
    var key = this._getItemKey(this.data.Value.TempFreezer.option, temp);
    if(key != null){
      var result = await this._control(this._makeControlData("Control", "Set", {"REFT":key}))
      return result;
    }else{
      throw new Error("Refrigerator Wrong Value >> " + temp);
    }
  }

  /**
  * 특급냉동
  */
  async setIcePlus(power){
    var result = await this._control(this._makeControlData("Control", "Set", {"REIP":(power == "on" ? "2" : "1")}))
    return result;
  }

  /**
  * 제균탈취
  */
  async setFreshAirFilter(mode){
    if(this.AIR_FRESH_MODE.includes(mode)){
      var result = await this._control(this._makeControlData("Control", "Set", {"REHF":mode}))
      return result;
    }else{
      throw new Error("Refrigerator Wrong Value >> " + mode);
    }
  }

  /**
  *
  */
  async setActiveSaving(mode){
    if(0 <= mode && mode <=3){
      var result = await this._control(this._makeControlData("Control", "Set", {"REAS":mode}))
      return result;
    }else{
      throw new Error("Refrigerator Wrong Value >> " + mode);
    }
  }

}

module.exports = Refrigerator;
