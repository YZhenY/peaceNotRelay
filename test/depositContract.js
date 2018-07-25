var DepositContract = artifacts.require("DepositContract");
var testHelpers = require('../utils/testHelpers')(web3);
var dummyTx = require('../utils/dummyRawTx.json');
var web3Utils = require('web3').utils;
const BN = web3Utils.BN;
var ethers = require('ethers');
var Wallet = ethers.Wallet;

var transactionFields = [ 'nonce',
'gasPrice',
'gasLimit',
'to',
'value',
'data',
'v',
'r',
's',
'from' ]



contract('Parser Test', async (accounts) => {

  beforeEach(async () => {
    depositContract = await DepositContract.new(accounts[0]);
  })

  it("should parse a transaction", async() => {
    console.log("HEX STRING", dummyTx.rawTxHex);
    var actualDummyParams = Wallet.parseTransaction(dummyTx.rawTxHex);
    console.log("PARAMS:", actualDummyParams);

    var result = await depositContract.parse(dummyTx.rawTxHex, dummyTx.msgHash);
    console.log("RESULT: ", result);
    var print = await depositContract.print();
    console.log("PRINT: ", print);
    var byte32Tx = await depositContract.byte32Tx();
    console.log("byte32Tx: ", byte32Tx);
    var parsedTx = await depositContract.transaction();
    console.log('transaction:', parsedTx);
    console.log('account0: ', accounts[0]);

    for (var i = 0; i < transactionFields.length; i ++) {
      var parsedTxValue = parsedTx[i];
      var actualDummyParam = actualDummyParams[transactionFields[i]];
      var test = false;
      if (parsedTxValue.toNumber !== undefined) {
        parsedTxValue = new BN(parsedTxValue.toNumber());
        if (actualDummyParam._bn === undefined || actualDummyParam._bn.toNumber === undefined) {
          actualDummyParam = new BN (actualDummyParam);
        } else {
          actualDummyParam = actualDummyParam._bn;
        }
        test = parsedTxValue.eq(actualDummyParam);
      } else {
        test = parsedTxValue.toLowerCase() === actualDummyParam.toLowerCase();
      }
      console.log(test, `for ${transactionFields[i]}: ${parsedTxValue} should be ${actualDummyParam}`);
    }
  })

})