var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');
var abi = require('abi');
var abiDecoder = require('abi-decoder');

router.get('/pending', function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  
  async.waterfall([
    function(callback) {
     web3.okc.getBlock("pending",true,function(err, block) {
           if(err){
                    return next(err);
           }else{
                    console.log(block.transactions);
              callback(null, block);
           }
        });


    }
  ], function(err, block) {
    if (err) {
      return next(err);
    }


    var txs = [];

      block.transactions.forEach(function(tx) {
        txs.push(tx);
      });

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
    },function(tx, receipt,callback){
       db.get(tx.to, function(err, value){
            callback(null,tx ,receipt,value);
       });
    }
  ], function(err, tx, receipt,source) {

    if (err || receipt == null) {
      return next(err);
    }


    if(source){
       tx.source = JSON.parse(source);
       try{
         var jsonAbi = JSON.parse(tx.source.abi);
         abiDecoder.addABI(jsonAbi);
         tx.logs = abiDecoder.decodeLogs(receipt.logs);

         //console.log("tx.logs:"+tx.logs);
         tx.callInfo = abiDecoder.decodeMethod(tx.input);

         //console.log("tx.callInfo:",tx.callInfo);
       }catch(e){
        console.log("Err parse ABI:",tx.source.abi,e);
       }
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

    //console.log(tx.to);
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
