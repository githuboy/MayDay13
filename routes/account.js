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
       // console.log("@@"+data.source +"@1");
        data.contractState = [];
        //console.log("@abi@"+data.source.abi +"@1");
        if (!data.source.abi) {
          return callback();
        }
        var abi = JSON.parse(data.source.abi);
       // console.log("@###abi@"+abi +"@1");
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

      var blockCount = 500;
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


    data.blocks = [];
    data.txCounter = 0;

    for(var i = 0; i < blocks.length ;i++){
        for(var j = 0; j < blocks[i].transactions.length;j++){
             var txx = blocks[i].transactions[j];

             if(txx.from === req.params.account || txx.to === req.params.account){      

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

                        
                        trace.blockNumber = blocks[i].number;
                        trace.err = 0;
                        data.blocks.push(trace);

                }  
        }
    }

    data.tracesSent = null;
    data.tracesReceived = null;
    data.address = req.params.account;
    
    
    if (data.source) {
      data.name = data.source.name;
    } else if (config.names[data.address]) {
      data.name = config.names[data.address];
    }


    data.blocks = data.blocks.reverse().splice(0, 100);

    res.render('account', { account: data });
  });
  
});

module.exports = router;
