var RLP = require('rlp');
var dummyTx = require('../utils/dummyRawTx.json');
var web3Utils = require('web3').utils;
var ethers = require('ethers');
const EthereumTx = require('ethereumjs-tx')
var Wallet = ethers.Wallet;
var actualDummyParams = Wallet.parseTransaction(dummyTx.rawTxHex);
var keccak256 = require('../utils/keccak256.js');
    // console.log("PARAMS:", actualDummyParams);

dummyRLP = '0xf8678202e4847735940082943d94d4b36aadb0d90a32dbc15537db6e3054c52a3f6280b844a9059cbb0000000000000000000000009498f180620977eb5a6c1c07b0c68c370bd2e534000000000000000000000000000000000000000000000004e1003b28d9280000';


var generateRawTxAndMsgHash = async function(pubK, to, value, data, _nonce) {
  var txParams = {};
  // txParams.nonce = web3Utils.toHex(_nonce);
  txParams.nonce = '0x02e4';
  // txParams.gasPrice = web3Utils.toHex(500);
  // txParams.gasLimit = web3Utils.toHex(6721975);
  txParams.gasPrice = web3Utils.toHex(actualDummyParams.gasPrice);
  txParams.gasLimit = web3Utils.toHex(actualDummyParams.gasLimit);
  txParams.to = to;
  // txParams.value = (value === 0) ? '0x' :web3Utils.toHex(value);
  txParams.value = '0x';
  txParams.data = data;
  var arr = [txParams.nonce, txParams.gasPrice, txParams.gasLimit, txParams.to, txParams.value, txParams.data];
  var encoded = RLP.encode(arr);
  console.log('RLP TEST', '0x' + encoded.toString('hex') === dummyRLP);
  var hashed = keccak256('0x' + encoded.toString('hex'));
  console.log('arr: ', arr);
  console.log(encoded.toString('hex'))
  console.log('HASHED: ', hashed);
  var tx = new EthereumTx(txParams)
  // tx.sign(new Buffer.from(privK, 'hex'));
  const rawTx = tx.serialize();

  var decoded = RLP.decode('0x' +rawTx.toString('hex'));
  console.log(decoded)
  var arr2 = []
  for (var i = 0; i < 6; i ++) {
    arr2.push('0x' + decoded[i].toString('hex'));
  }
  console.log(arr2);
  var encoded2 = RLP.encode(arr2);
  console.log('RLP TEST', '0x' + encoded2.toString('hex') === dummyRLP);
  console.log('HASHED2', web3Utils.sha3('0x' + encoded2.toString('hex')));

  // console.log('RLP TEST', '0x' + encoded.toString('hex') === dummyRLP);

  return [rawTx, encoded];
}

generateRawTxAndMsgHash(actualDummyParams.from, actualDummyParams.to, actualDummyParams.value, actualDummyParams.data, actualDummyParams.nonce).then (res => {

  console.log(res[1].toString('hex'));
})