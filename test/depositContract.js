var DepositContract = artifacts.require("DepositContract");
var testHelpers = require('../utils/testHelpers')(web3);
var dummyTx = require('../utils/dummyRawTx.json');
var ethers = require('ethers');
var Wallet = ethers.Wallet;



contract('Parser Test', async (accounts) => {

  beforeEach(async () => {
    depositContract = await DepositContract.new(accounts[0]);
  })

  it("should parse a transaction", async() => {
    console.log("HEX STRING", dummyTx.rawTxHex);
    var actualDummyParams = Wallet.parseTransaction(dummyTx.rawTxHex);
    console.log(actualDummyParams);

    var result = await depositContract.parse(dummyTx.rawTxHex);
    console.log("RESULT: ", result);
    var print = await depositContract.print();
    console.log("PRINT: ", print);
    var trans = await depositContract.transaction();
    console.log('transaction:', trans);
  })

})