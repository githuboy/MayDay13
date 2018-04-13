var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');

router.get('/:offset?', function(req, res, next) {
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  async.waterfall([
    function(callback) {
//      web3.personal.listAccounts(20, req.params.offset, function(err, result) {
//        callback(err, result);
//      });
  // 	web3.okc.traceBlockInfos(20, function(err, result) {
  //        callback(err, result);
  //      });
   
     // var tstcoinbase = web3.okc.coinbase;
	/*web3.okc.getCoinbase(function(error,resp){
		var tstcoinbase = resp;	
		console.log(tstcoinbase); 
	})*/
	//web3.okc.getCoinbase(console.log);
	//web3.okc.getAccounts(console.log);       
 
      var	result = 0;
      //callback(null, result);
      web3.okc.getAccounts(function(error,response){
    	  console.log(response);
    	  accounts = response;
    	  callback(null,response);
//	if(!error){
//		console.log(response);
//		accounts = response;
//		callback(err,accounts);
//		defaultAccount = accounts[0];
//	   }else{
//		console.error(error);		
//		}	
	})
	 // var result = web3.okc.traceBlockInfo;
     // console.log("test end");
    }, function(accounts, callback) {
      var data = {};
      
      if (!accounts) {
        return callback({name:"FatDBDisabled", message: "okc FatDB system is not enabled. Please restart Parity with the --fat-db=on parameter."});
      }
      
      if (accounts.length === 0) {
        return callback({name:"NoAccountsFound", message: "Chain contains no accounts."});
      }
      
      var lastAccount = accounts[accounts.length - 1];
      
      async.eachSeries(accounts, function(account, eachCallback) {
        web3.okc.getCode(account, function(err, code) {
          if (err) {
            return eachCallback(err);trace
          }
          data[account] = {};
          data[account].address = account;
          data[account].type = code.length > 2 ? "Contract" : "Account";
          
          web3.okc.getBalance(account, function(err, balance) {
            if (err) {
              return eachCallback(err);
            }
            data[account].balance = balance;
            eachCallback();
          });
        });
      }, function(err) {
        callback(err, data, lastAccount);
      });
    }
  ], function(err, accounts, lastAccount) {
    if (err) {
      return next(err);
    }
    
    res.render("accounts", { accounts: accounts, lastAccount: lastAccount });
  });
});

module.exports = router;
