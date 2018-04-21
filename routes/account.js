var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');

router.get('/:account', function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  var db = req.app.get('db');
  
  var data = {};
 

  async.waterfall([
    function(callback) {
      web3.okc.getBlock("latest", false, function(err, result) {
        callback(err, result);
      });
    }, function(lastBlock, callback) {
      data.lastBlock = lastBlock.number;
      //limits the from block to -1000 blocks ago if block count is greater than 1000
      if (data.lastBlock > 0x3E8) {
        data.fromBlock = data.lastBlock - 0x3e8;
      } else {
        data.fromBlock = 0x00;
      }
      web3.okc.getBalance(req.params.account, function(err, balance) {
        callback(err, balance);
      });
    }, function(balance, callback) {
      data.balance = balance;
      web3.okc.getCode(req.params.account, function(err, code) {
        callback(err, code);
      });
    }, function(code, callback) {
      data.code = code;
      if (code !== "0x") {
        data.isContract = true;
      }
      
      db.get(req.params.account.toLowerCase(), function(err, value) {
        callback(null, value);
      });
    }, function(source, callback) {
      
      if (source) {
        data.source = JSON.parse(source);
        
        data.contractState = [];
        if (!data.source.abi) {
          return callback();
        }
        var abi = JSON.parse(data.source.abi);
        var contract = web3.okc.contract(abi).at(req.params.account);
        
        
        async.eachSeries(abi, function(item, eachCallback) {
          if (item.type === "function" && item.inputs.length === 0 && item.constant) {
            try {
              contract[item.name](function(err, result) {
                data.contractState.push({ name: item.name, result: result });
                eachCallback();
              });
            } catch(e) {
              console.log(e);
              eachCallback();
            }
          } else {
            eachCallback();
          }
        }, function(err) {
          callback(err);
        });
        
      } else {
        callback();
      }
      
      
    }, function(callback) {

      var blockCount = 100;
      if(blockCount > data.lastBlock)
      {
        blockCount = data.lastBlock + 1;
      }

      async.times(blockCount, function(n, next) {

        web3.okc.getBlock(data.lastBlock - n, true, function(err, block) {
          next(err, block);
        });

      }, function(err, blocks) {
        callback(err, blocks);
      });
    }],function(err, blocks) {

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

        var traceblocks = {};
        var trace = {
            type  :"",
            blockNumber:0,
            blockHash:"",
            transactionHash:"",
            err:0,
            result:trace_result,
            action:trace_action
        };

        data.blocks = [];
        data.txCounter = 0;

    var txs = [];
    blocks.forEach(function(block) {
      block.transactions.forEach(function(txx) {
                if (txs.length === 100) {
                  return;
                }

               if (!traceblocks[block.blockNumber]) {
                    traceblocks[block.blockNumber] = [];
                }
                                
             console.log("txx.from:"+txx.from + "  txx.to:"+ txx.to);
             if(txx.from === req.params.account || txx.to === req.params.account){                              
                      if(txx.to == "New Contract"){
                                 trace.type = "create";
                                  trace.result.address = "New Contract";
                      }
                      else{
                                trace.type = "call";
                      }

                        trace.action.from = txx.from;
                        trace.action.to = txx.to;
                        trace.action.value = txx.value;
                        trace.transactionHash = txx.hash;
                        trace.blockNumber = block.blockNumbe;
                        trace.err = 0

                        console.log("trace.type:"+trace.type);
                        traceblocks[block.blockNumber].push(trace);
                        data.blocks.push(traceblocks[block.blockNumber]);

                }     


        txs.push(txx);
      });
    });



      blocks.forEach(function(block) {

            if (!traceblocks[block.blocNumber]) {
              traceblocks[block.blockNumber] = [];
            }

            //console.log("tempblock.miner:"+block.miner+" ||| "+req.params.account);

                if(block.miner == req.params.account){
                  trace.type = "reward"
                  trace.action.author = block.miner;
                  trace.blockNumber = block.blockNumber;
                  trace.action.value = 1000000000000000;
                  trace.blockHash = block.hash;

                 // console.log("trace.type:"+trace.type+" trace.action.author:"+trace.action.author);
                  traceblocks[block.blockNumber].push(trace);
                  data.blocks.push(traceblocks[block.blockNumber]);
                  //data.txCounter++;
                 // console.log("txCounter: "+data.txCounter);
                }  
    });


    data.tracesSent = null;
    data.tracesReceived = null;
    data.address = req.params.account;
    
    
    if (data.source) {
      data.name = data.source.name;
    } else if (config.names[data.address]) {
      data.name = config.names[data.address];
    }
    
    data.blocks = data.blocks.reverse().splice(0, 100);
    
    //console.log("data.address:"+ data.address + " | "+data.txCounter);
   // });
    res.render('account', { account: data });
  });
  
});

module.exports = router;
