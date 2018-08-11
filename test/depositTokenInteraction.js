var DepositContract = artifacts.require("DepositContract.sol");
var TokenContract = artifacts.require("TokenContract");
// use npm run ganache
var privKeys = require('../utils/ganacheTestKeys.json');
var testHelpers = require('../utils/testHelpers')(web3);
var dummyTx = require('../utils/dummyRawTx.json');
var web3Utils = require('web3').utils;
const BN = web3Utils.BN;
var ethers = require('ethers');
var Wallet = ethers.Wallet;
var Promise = require("bluebird");
const EthereumTx = require('ethereumjs-tx')
var RLP = require('rlp');
var keccak256 = require('../utils/keccak256.js');



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

var getNonce = Promise.promisify(function getNonce(address, callback) {
  web3.eth.getTransactionCount(address, function(error, result) {
      var txnsCount = result;
      web3.currentProvider.sendAsync({
          method: "txpool_content",
          params: [],
          jsonrpc: "2.0",
          id: new Date().getTime()
      }, function(error, result) {
          if (result.result) {
            if (result.result.pending) {
                if (result.result.pending[address]) {
                    txnsCount = txnsCount +
                        Object.keys(result.result.pending[address]).length;
                    callback(null, txnsCount);
                } else {
                    callback(null, txnsCount);
                }
            } else {
                callback(null, txnsCount);
            }
          } else {
            callback(null, txnsCount);
        }
      })
  })
})

web3.eth.sendRawTransaction = Promise.promisify(web3.eth.sendRawTransaction);


var dummyMintHash = new BN('0xd9f48f06cfd7a657aec67d94e17e2e921df7ef2fa4d29ff2c0ec6bb3271a28dc');
var dummyAddress = "0xc40b249a7cde0fca8fadcf4eba8dea933b460bd7";

contract('Deposit-Token Contract Interactions', async (accounts) => {
  beforeEach(async () => {
    // account[0] deposit custodian address, account[1] token custodian address
    tokenContract = await TokenContract.new(accounts[1]);
    depositContract = await DepositContract.new(accounts[0]);
    await depositContract.setTokenContract(tokenContract.address);
  })

  it("should  mint() and then deposit()", async () => {
    var tokenValue = 10000;
    var result = await tokenContract.mint(tokenValue, accounts[2]);
    assert(result.logs[1].event === "Mint", "should emit event mint");
    
    var mintHash = result.logs[1].args.mintHash;
    result = await depositContract.deposit(mintHash, accounts[2]);
    assert(result.logs[0].event === "Deposit", "should emit event deposit");
    assert(result.logs[0].args.minter === accounts[2], "should emit event with minter ");
    assert(result.logs[0].args.mintHash.eq(mintHash), "should emit event with mintHash");

  })

  it("should  transferFrom() and custodianApprove()", async () => {
    var tokenValue = 10000;
    var result = await tokenContract.mint(tokenValue, accounts[2]);
    var mintHash = result.logs[1].args.mintHash;
    result = await depositContract.deposit(mintHash, accounts[2], {value: tokenValue});
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[2], `token should have transfered to ${accounts[2]}, instead ${result}`);


    var rawTransferFrom = await generateRawTxAndMsgHash(
      accounts[2],
      privKeys[2],
      tokenContract.address,
      0,
      tokenContract.transferFrom.request(accounts[2], accounts[3], mintHash.toString()).params[0].data
    )
    result = await web3.eth.sendRawTransaction('0x' + rawTransferFrom.rawTx.toString('hex'));
    result = await tokenContract.transferRequest(mintHash);
    assert(result === accounts[3], `token transfer request should be to ${accounts[3]}, instead ${result}`);

    var rawCustodianApprove = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString()).params[0].data
    )

    result = await web3.eth.sendRawTransaction('0x' + rawCustodianApprove.rawTx.toString('hex'));
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[3], `token should have transfered to ${accounts[3]}, instead ${result}`);
    
    var rawWithdrawal = await generateRawTxAndMsgHash(
      accounts[3],
      privKeys[3],
      tokenContract.address,
      0,
      tokenContract.withdraw.request(mintHash.toString()).params[0].data
    )

    //bundle takes in bytes _withdrawalTx, bytes _lastTx, bytes _custodianTx
    //address _to, uint256 _mintHash, bytes _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes, uint256 _declaredNonce
    var bytes32Bundle = [];
    console.log("RAW: ", [rawWithdrawal.rawTx.toString('hex'), rawTransferFrom.rawTx.toString('hex'), rawCustodianApprove.rawTx.toString('hex')]);
    [rawWithdrawal.rawTx.toString('hex'), rawTransferFrom.rawTx.toString('hex'), rawCustodianApprove.rawTx.toString('hex')].forEach((value) => {
      var tempBundle = toBytes32BundleArr(value);
      tempBundle.forEach(value => bytes32Bundle.push(value));
    })
    var txLengths = [rawWithdrawal.rawTx.toString('hex').length + 2, rawTransferFrom.rawTx.toString('hex').length + 2, rawCustodianApprove.rawTx.toString('hex').length + 2 ];
    var txMsgHashes = [rawWithdrawal.msgHash, rawTransferFrom.msgHash, rawCustodianApprove.msgHash];
    console.log("BUNDLE: ", bytes32Bundle);
    console.log("txLENGHTS: ", txLengths);
    console.log("HashShit: ", txMsgHashes);
    console.log()
    result = await depositContract.withdraw(accounts[3], mintHash, bytes32Bundle, txLengths, txMsgHashes, 1, {value:1000});


    for (var i = 0; i < result.logs.length; i ++) {
      console.log(`${result.logs[i].event}: `,result.logs[i].args )
    }
    console.log(accounts[3]);
  })
})

var toBytes32BundleArr = function (rawBundle) {
  var bytes32Bundle = [];
  for (var i = 0; i < rawBundle.length; i ++) {
    bytes32Bundle[Math.floor(i / 64)] = (bytes32Bundle[Math.floor(i / 64)]) ? bytes32Bundle[Math.floor(i / 64)] + rawBundle[i] : rawBundle[i] ;
  }
  bytes32Bundle.forEach((value, index) => {
    bytes32Bundle[index] = '0x' + bytes32Bundle[index];
  })
  return bytes32Bundle;
}

var generateRawTxAndMsgHash = async function(pubK, privK, to, value, data) {
  var txParams = {};
  txParams.nonce = await getNonce(pubK);
  txParams.gasPrice = web3Utils.toHex(500);
  txParams.gasLimit = web3Utils.toHex(6721975);
  txParams.to = to;
  txParams.value = web3Utils.toHex(value);
  txParams.data = data;
  var tx = new EthereumTx(txParams)
  tx.sign(new Buffer.from(privK, 'hex'));
  const rawTx = tx.serialize();

  //Form msgHash
  var decoded = RLP.decode('0x' + rawTx.toString('hex'));
  var txArrParams = []
  for (var i = 0; i < 6; i ++) {
    txArrParams.push('0x' + decoded[i].toString('hex'));
  }
  var msgHash = web3Utils.sha3('0x' + RLP.encode(txArrParams).toString('hex'));

  return {rawTx: rawTx, msgHash: msgHash};
}