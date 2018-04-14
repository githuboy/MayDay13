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
    }, function(tx, receipt, callback) {  
    	var blk = tx.blockNumber;
    	if(tx.blockNumber < 10)
    	{
    		blk = tx.blockNumber;
    	}
    	else
    	{
    		blk = 10;
    	}
    	
      
      var traces;

    	for(;blk > 0;blk--)
    	{
    	   web3.okc.getBlock(blk,function(err, blk_result) {
			   if(err)
			   {
				 console.log("penging error");
			   }
			   else
			   {	
				   blk_result.transactions.forEach(function(txHash){
						   web3.okc.getTransactionReceipt(txHash, function(err, tx_result) 
						   {
							    if(tx_result.from == tx.from || tx_result.from == tx.to || tx_result.from == tx.to || tx_result.to == tx.from)
							    	{
							    		traces.push(tx_result);
							    	}
						    });
					   });
			   }
	        });
    	}
    	//}
//      web3.trace.transaction(tx.hash, function(err, traces) {
          //callback(err, tx, receipt, traces);
//      });
        callback(null, tx, receipt, traces);
    }, function(tx, receipt, traces, callback) {

      db.get(tx.to, function(err,  value) {
        callback(null, tx, receipt, traces,value);
      });
    }
  ], function(err, tx, receipt, traces, source) {
    if (err) {
      return next(err);
    }
   

     var callsource;

    // Try to match the tx to a solidity function call if the contract source is available
    if (source) {
      tx.source = JSON.parse(source);

      try {
        var jsonAbi = JSON.parse(tx.source.abi);

        abiDecoder.addABI(jsonAbi);
        tx.logs = abiDecoder.decodeLogs(receipt.logs);
        tx.callInfo = abiDecoder.decodeMethod(tx.input);
      } catch (e) {
        console.log("Error parsing ABI:", tx.source.abi, e);
      }
    }
    tx.traces = [];
    tx.failed = false;
    tx.gasUsed = 0;
    if (traces != null) {
    traces.forEach(function(trace) {
        tx.traces.push(trace);
        if (trace.error) {
          tx.failed = true;
          tx.error = trace.error;
        }
        if (trace.gasUsed) {
          tx.gasUsed += parseInt(trace.gasUsed, 16);
        }
      });
    }
    // console.log(tx.traces);    
    res.render('tx', { tx: tx});
    res.render('traces', { traces: traces});
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
//    }, function(result, callback) {
//      web3.trace.replayTransaction(result.hash, ["trace", "stateDiff", "vmTrace"], function(err, traces) {
//        callback(err, result, traces);
//      });
    }
  ], function(err, tx) {
    if (err) {
      return next(err);
    }
    
  //  tx.traces = traces;

    res.render('tx_raw', { tx: tx });
    res.render('traces', { traces: traces});
  });
});

module.exports = router;
