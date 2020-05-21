const www = require('../bin/www');
const config = require('../util/config');
const request = require('request');
const logger = require('../util/log').log;
const fs = require('fs');

const ip = require('ip');
const WebSocketServer = require('websocket').server;


class WebSockerProcessor {

  constructor(options) {
    logger.info("WebSocket init");
    this.wsServer = null;
    this.clients = {};
  }

  /**
  * Notify Message to websocket clients.
  */
  notify(data){
    try{
      var keyList = Object.keys(this.clients);
      for (var i=0; i<keyList.length; i++) {
        var connection = this.clients[keyList[i]];
        connection.sendUTF(JSON.stringify({'cmd':'notify', 'data':data}));
      }
    }catch(err){
    }
  }

  init(){
    this.wsServer = new WebSocketServer({
      httpServer: www.getServer()
    });

    this.wsServer.on('request', function(request) {
      const addr = request.origin;
      var connection = request.accept(null, addr);
      this.clients[addr] = connection;

      connection.on('message', function(message) {
        this._processMessage(connection, message);
      }.bind(this));
      connection.on('close', function() {
        delete this.clients[addr];
      }.bind(this));

    }.bind(this));
  }


  _processMessage(connection, message){
    if (message.type === 'utf8') {
      var json = JSON.parse(message.utf8Data);
      if(json.cmd == "volume"){

      }
    }
  }
}

module.exports = new WebSockerProcessor();
