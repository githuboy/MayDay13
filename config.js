var web3 = require('web3');
var net = require('net');

var config = function () {
  
  this.logFormat = "combined";
  this.ipcPath = "";
  this.provider = new web3.providers.IpcProvider(this.ipcPath, net);
  
  this.bootstrapUrl = "https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/yeti/bootstrap.min.css";
  
  this.names = {
   
  }
  
}

module.exports = config;
