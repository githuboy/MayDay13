var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');
var abi = require('ethereumjs-abi');
var abiDecoder = require('abi-decoder');

router.get('/pending', function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  
  async.waterfall([
    function(callback) {
    //  web3.parity.pendingTransactions(function(err, result) {
    //    callback(err, result);
    //  });
        web3.okc.getBlock("pending",function(err, result) {
	   if(err)
	   {
		console.log("penging error");
	   }
	   else
	   {	
		console.log(result.transactions);
                callback(null, result.transactions);
	   }
        });
	

    }
  ], function(err, txs) {
    if (err) {
      return next(err);
    }
    
    res.render('tx_pending', { txs: txs });
  });
});


router.get('/submit', function(req, res, next) {  
  res.render('tx_submit', { });
});

router.post('/submit', function(req, res, next) {
  if (!req.body.txHex) {
    return res.render('tx_submit', { message: "No transaction data specified"});
  }
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  async.waterfall([
    function(callback) {
      web3.okc.sendRawTransaction(req.body.txHex, function(err, result) {
        callback(err, result);
      });
    }
  ], function(err, hash) {
    if (err) {
      res.render('tx_submit', { message: "Error submitting transaction: " + err });
    } else {
      res.render('tx_submit', { message: "Transaction submitted. Hash: " + hash });
    }
  });
});

router.get('/:tx', function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  var db = req.app.get('db');
  
  async.waterfall([
    function(callback) {
      web3.okc.getTransaction(req.params.tx, function(err, result) {
        callback(err, result);
      });
    }, function(result, callback) {
      
      if (!result || !result.hash) {
        return callback({ message: "Transaction hash not found" }, null);
      }
      
      web3.okc.getTransactionReceipt(result.hash, function(err, receipt) {
        callback(err, result, receipt);
      });
    }
  ], function(err, tx, receipt) {

    if (err) {
      return next(err);
    }
 
    var trace_result = {
      address:"",
    }

    var trace_action = {
          author:"",
          from:"",
          to:"",
          value:0
        }


    var trace = {
        type  :"unknow",
        blockNumber:0,
        blockHash:"0x00000000000",
        transactionHash:"0x00000000000",
        err:0,
        result:trace_result,
        action:trace_action
    };

    trace.type = "call";
    trace.action.from = tx.from;

    console.log(tx.to);
    if(tx.to == null){
      trace.action.to = receipt.contractAddress;
      tx.contractAddress =  receipt.contractAddress;
    }
    else{
      trace.action.to = tx.to;
    }
    
    trace.action.value = tx.value;
    trace.transactionHash = tx.hash;    
    trace.blockNumber = tx.blockNumber;
    trace.err = receipt.gasUsed;

    tx.traces = [];
    tx.failed = false;
    tx.gasUsed = receipt.gasUsed;
    tx.traces.push(trace);
   
    res.render('tx', { tx: tx});  
});

});

router.get('/raw/:tx', function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  async.waterfall([
    function(callback) {
      web3.okc.getTransaction(req.params.tx, function(err, result) {
        callback(err, result);
      });
    }
  ], function(err, tx) {
    if (err) {
      return next(err);
    }
    
    tx.traces = [];

    res.render('tx_raw', { tx: tx });
  });
});

module.exports = router;
