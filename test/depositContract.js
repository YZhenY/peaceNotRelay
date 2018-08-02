var DepositContract = artifacts.require("DepositContract");
var testHelpers = require('../utils/testHelpers')(web3);
var dummyTx = require('../utils/dummyRawTx.json');
var web3Utils = require('web3').utils;
const BN = web3Utils.BN;
var ethers = require('ethers');
var Wallet = ethers.Wallet;
const EthereumTx = require('ethereumjs-tx')
const privateKey = Buffer.from('2387a5730d394074ed23d1cb79c3fa2c4e11832439cdd40104ee6a7da7c1cfb9', 'hex')

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

const txParams = {
  nonce: '0x00',
  gasPrice: '0x09184e72a000', 
  gasLimit: '0x2710',
  to: '0x0000000000000000000000000000000000000000', 
  value: '0x00', 
  data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
}
const tx = new EthereumTx(txParams)
tx.sign(privateKey)
console.log(tx);
const serializedTx = tx.serialize()
console.log(serializedTx.toString());

var tokenContract = "0xc40b249a7cde0fca8fadcf4eba8dee933b460bd7";

contract('Deposit Contract', async (accounts) => {
  beforeEach(async () => {
    depositContract = await DepositContract.new(accounts[0]);
    await depositContract.setTokenContract(tokenContract);
  })

  it("should parse a transaction", async() => {
    console.log("HEX STRING", dummyTx.rawTxHex);
    var actualDummyParams = Wallet.parseTransaction(dummyTx.rawTxHex);
    console.log("PARAMS:", actualDummyParams);

    var result = await depositContract.parse(dummyTx.rawTxHex, dummyTx.msgHash);
    console.log("RESULT: ", result);
    var parsedTx = await depositContract.testTx();
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