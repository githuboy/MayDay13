var express = require('express');
var router = express.Router();
var async = require('async');
var utils = require("ethereumjs-util");

router.get('/verify', function(req, res, next) {  
  res.render('verifySignature');
});

router.post('/verify', function(req, res, next) {
  var okcAddress = req.body.okcereumAddress.toLowerCase().replace("0x", "");
  var message = req.body.message;
  var signature = req.body.signature;
  
  if (!okcAddress) {
    res.render('verifySignature', { result: { error: "Invalid okc Address"}, message: message, signature: signature, okcAddress: okcAddress });
    return;
  }
  if (!message) {
    res.render('verifySignature', { result: { error: "Invalid Message"}, message: message, signature: signature, okcAddress: okcAddress });
    return;
  }
  if (!signature) {
    res.render('verifySignature', { result: { error: "Invalid Signature"}, message: message, signature: signature, okcAddress: okcAddress });
    return;
  }
  
  try {
    var msgSha = utils.sha3(message);
    var sigDecoded = utils.fromRpcSig(signature);
    var recoveredPub = utils.ecrecover(msgSha, sigDecoded.v, sigDecoded.r, sigDecoded.s);
    var recoveredAddress = utils.pubToAddress(recoveredPub).toString("hex");

    if (okcAddress === recoveredAddress) {
      res.render('verifySignature', { result: { ok: "Signature is valid!"}, message: message, signature: signature, okcAddress: okcAddress });
      return;
    } else {
      res.render('verifySignature', { result: { error: "Signature is not valid!"}, message: message, signature: signature, okcAddress: okcAddress });
      return;
    }
  } catch (e) {
    res.render('verifySignature', { result: { error: "Error during signature verification: " + e}, message: message, signature: signature, okcAddress: okcAddress });
    return;
  }
});

module.exports = router;
