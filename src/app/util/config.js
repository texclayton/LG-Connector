var jsonfile = require('jsonfile')
var fs   = require('fs');
const logger = require('./log').log;
var cmd = require('node-cmd');
const lgUtil = require('./lgUtil');

class ConfigUtil {

  constructor(){
    this.configPath = "/config/lg-config.json";
    this.config = {};
  }

  getConfig(){
    return this.config;
  }

  loadConfig(){
    return new Promise(function(resolve, reject) {
      if (!fs.existsSync(this.configPath)) {
        logger.warn("Non exist config file");
        cmd.get(
            'cp ' + __dirname + '/../lg-config.json ' + '/config/lg-config.json' ,
            function(err, data, stderr){
              if(err){
                logger.error(err);
              }
              logger.info("Copy lg-config file to config folder");

              this._load()
              .then(()=>{
                resolve();
              })
              .catch(err=>{
                reject(err);
              });
            }.bind(this)
        );
      }else{
        this._load()
        .then(()=>{
          resolve();
        })
        .catch(err=>{
          reject(err);
        });
      }
    }.bind(this));
  }

  saveConfig(config){
    logger.info("Save Config >> " + JSON.stringify(config));

    return new Promise(function(resolve, reject) {
      jsonfile.writeFile(this.configPath, config, {spaces: 2, EOL: '\r\n'}, function (err) {
        if(err){
          reject("Save Config File Error!!!! >> " + err);
        }else{
          this.config = config;
        }
        resolve();
      }.bind(this));
    }.bind(this));
  }

  _load(){
    return new Promise(function(resolve, reject) {
      jsonfile.readFile(this.configPath, function(err, obj) {
        if(err){
          reject("Read Config File Error!!!!! >> " + err);
          return;
        }
        var hasToSaveConfig = false;
        this.config = obj;
        logger.info(JSON.stringify(this.config));

        if(!this.config.st){
          this.config.st = {};
          hasToSaveConfig = true;
        }

        if(!this.config.user){
          this.config.user = {};
          this.config.user.name = "admin";
          this.config.user.password = "12345";
          hasToSaveConfig = true;
        }

        if(!this.config.smartthinq){
          this.config.smartthinq = {};
          this.config.smartthinq.refresh_token = "";
          this.config.smartthinq.auth_base = "";
          this.config.smartthinq.api_root = "";
          this.config.smartthinq.oauth_root = "";
          hasToSaveConfig = true;
        }

        if(!this.config.preset){
          this.config.preset = {};
          this.config.preset.country = "KR";
          this.config.preset.language = "ko-KR";
          hasToSaveConfig = true;
        }

        if(!this.config.devices){
          this.config.devices = {};
          this.config.devices.list = [];
          hasToSaveConfig = true;
        }

        if(!this.config.pollingTime){
          this.config.pollingTime = 1;
          hasToSaveConfig = true;
        }

        if(!this.config.token || this.config.token == ''){
          lgUtil.makeToken()
          .then(token=>{
            this.config.token = token;
            this.saveConfig(this.config);
          })
        }

        if(hasToSaveConfig){
          this.saveConfig(this.config);
        }
        resolve();
      }.bind(this));
    }.bind(this));
  }
}

module.exports = new ConfigUtil();
