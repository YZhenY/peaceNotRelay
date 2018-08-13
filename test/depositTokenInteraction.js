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
var assertRevert = require('../utils/assertRevert.js');

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





web3.eth.sendRawTransaction = Promise.promisify(web3.eth.sendRawTransaction);
web3.eth.getBalance = Promise.promisify(web3.eth.getBalance);
web3.currentProvider.send = Promise.promisify(web3.currentProvider.send);

var dummyMintHash = new BN('0xd9f48f06cfd7a657aec67d94e17e2e921df7ef2fa4d29ff2c0ec6bb3271a28dc');
var dummyAddress = "0xc40b249a7cde0fca8fadcf4eba8dea933b460bd7";

contract('Deposit-Token Contract Interactions', async (accounts) => {
  beforeEach(async () => {
    // account[0] deposit custodian address, account[1] token custodian address
    tokenContract = await TokenContract.new(accounts[1]);
    depositContract = await DepositContract.new(accounts[0]);
    await depositContract.setTokenContract(tokenContract.address);
    await depositContract.setCustodianETC(accounts[1]);

    gasPerChallenge = 206250;
    //Will be wrong unless explicitly stated in transaction details
    //https://ethereum.stackexchange.com/questions/39173/what-is-the-actual-gasprice-used-in-a-truffle-ganache-environment?rq=1
    gasPrice = 500;
    tokenValue = 10000;
    stakeValue = gasPrice * gasPerChallenge;

  })

  it("should  mint() and then deposit()", async () => {
    var result = await tokenContract.mint(tokenValue, accounts[2]);
    assert(result.logs[1].event === "Mint", "should emit event mint");
    
    var mintHash = result.logs[1].args.mintHash;
    result = await depositContract.deposit(mintHash, accounts[2]);
    assert(result.logs[0].event === "Deposit", "should emit event deposit");
    assert(result.logs[0].args.minter === accounts[2], "should emit event with minter ");
    assert(result.logs[0].args.mintHash.eq(mintHash), "should emit event with mintHash");

  })

  it("should be able to transfer and claim back home currency", async () => {
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
      tokenContract.transferFrom.request(accounts[2], accounts[3], mintHash.toString(), 0).params[0].data
    )
    result = await web3.eth.sendRawTransaction('0x' + rawTransferFrom.rawTx.toString('hex'));

    var rawCustodianApprove = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString(), 0).params[0].data
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

    var bytes32Bundle = [];
    // console.log("RAW: ", [rawWithdrawal.rawTx.toString('hex'), rawTransferFrom.rawTx.toString('hex'), rawCustodianApprove.rawTx.toString('hex')]);
    [rawWithdrawal.rawTx.toString('hex'), rawTransferFrom.rawTx.toString('hex'), rawCustodianApprove.rawTx.toString('hex')].forEach((value) => {
      var tempBundle = toBytes32BundleArr(value);
      tempBundle.forEach(value => bytes32Bundle.push(value));
    })
    var txLengths = [rawWithdrawal.rawTx.toString('hex').length + 2, rawTransferFrom.rawTx.toString('hex').length + 2, rawCustodianApprove.rawTx.toString('hex').length + 2 ];
    var txMsgHashes = [rawWithdrawal.msgHash, rawTransferFrom.msgHash, rawCustodianApprove.msgHash];
    // console.log("BUNDLE: ", bytes32Bundle);
    // console.log("txLENGHTS: ", txLengths);
    // console.log("HashShit: ", txMsgHashes);
    result = await depositContract.withdraw(accounts[4], mintHash, bytes32Bundle, txLengths, txMsgHashes, 1, {gasPrice: gasPrice, value:stakeValue});
    console.log(`withdraw() gas used: ${result.receipt.gasUsed}`);

    //Time Travel Forward
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [605], id: 0});
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0});

    var startAmount = await web3.eth.getBalance(accounts[4]);    
    result = await depositContract.claim(mintHash);
    var newBalance = await web3.eth.getBalance(accounts[4]);
    var withdrawnAmount = newBalance.sub(startAmount);
    assert(withdrawnAmount.eq(tokenValue + stakeValue), `should withdraw ${tokenValue + stakeValue} , instead ${withdrawnAmount}`);

  })

  it("should revert claim() if attempted too early", async () => {
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
      tokenContract.transferFrom.request(accounts[2], accounts[3], mintHash.toString(), 0).params[0].data
    )
    result = await web3.eth.sendRawTransaction('0x' + rawTransferFrom.rawTx.toString('hex'));

    var rawCustodianApprove = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString(), 0).params[0].data
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
    // console.log("RAW: ", [rawWithdrawal.rawTx.toString('hex'), rawTransferFrom.rawTx.toString('hex'), rawCustodianApprove.rawTx.toString('hex')]);
    [rawWithdrawal.rawTx.toString('hex'), rawTransferFrom.rawTx.toString('hex'), rawCustodianApprove.rawTx.toString('hex')].forEach((value) => {
      var tempBundle = toBytes32BundleArr(value);
      tempBundle.forEach(value => bytes32Bundle.push(value));
    })
    var txLengths = [rawWithdrawal.rawTx.toString('hex').length + 2, rawTransferFrom.rawTx.toString('hex').length + 2, rawCustodianApprove.rawTx.toString('hex').length + 2 ];
    var txMsgHashes = [rawWithdrawal.msgHash, rawTransferFrom.msgHash, rawCustodianApprove.msgHash];
    // console.log("BUNDLE: ", bytes32Bundle);
    // console.log("txLENGHTS: ", txLengths);
    // console.log("HashShit: ", txMsgHashes);
    result = await depositContract.withdraw(accounts[4], mintHash, bytes32Bundle, txLengths, txMsgHashes, 1, {gasPrice: gasPrice, value:stakeValue});

    assertRevert(depositContract.claim(mintHash));


  })

  //TODO: ISSUE NEED TO IMPLEMENT HALT OF TRANSFERS ON TOKEN CONTRACT
  it("should be able to handle early withdrawal attack", async () => {
    var result = await tokenContract.mint(tokenValue, accounts[2]);
    var mintHash = result.logs[1].args.mintHash;
    result = await depositContract.deposit(mintHash, accounts[2], {value: tokenValue});
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[2], `token should have transfered to ${accounts[2]}, instead ${result}`);

    //FIRST TRANSFER
    var rawTransferFrom = await generateRawTxAndMsgHash(
      accounts[2],
      privKeys[2],
      tokenContract.address,
      0,
      tokenContract.transferFrom.request(accounts[2], accounts[3], mintHash.toString(), 0).params[0].data
    )
    result = await web3.eth.sendRawTransaction('0x' + rawTransferFrom.rawTx.toString('hex'));
    var rawCustodianApprove = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString(), 0).params[0].data
    )

    result = await web3.eth.sendRawTransaction('0x' + rawCustodianApprove.rawTx.toString('hex'));
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[3], `token should have transfered to ${accounts[3]}, instead ${result}`);
    

    //SECOND TRANSFER
    var rawTransferFrom2 = await generateRawTxAndMsgHash(
      accounts[3],
      privKeys[3],
      tokenContract.address,
      0,
      tokenContract.transferFrom.request(accounts[3], accounts[4], mintHash.toString(), 0).params[0].data
    )
    result = await web3.eth.sendRawTransaction('0x' + rawTransferFrom2.rawTx.toString('hex'));
    var rawCustodianApprove2 = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString(), 0).params[0].data
    )

    result = await web3.eth.sendRawTransaction('0x' + rawCustodianApprove2.rawTx.toString('hex'));
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[4], `token should have transfered to ${accounts[4]}, instead ${result}`);
    
    //CREATE EARLY WITHDRAWAL
    var rawWithdrawal = await generateRawTxAndMsgHash(
      accounts[3],
      privKeys[3],
      tokenContract.address,
      0,
      tokenContract.withdraw.request(mintHash.toString()).params[0].data
    )

    //STARTING CHALLENGE
    var withdrawArgs = formBundleLengthsHashes([rawWithdrawal, rawTransferFrom, rawCustodianApprove]);
    result = await depositContract.withdraw(accounts[4], mintHash, withdrawArgs.bytes32Bundle, withdrawArgs.txLengths, withdrawArgs.txMsgHashes, 1, {gasPrice: gasPrice, value:stakeValue});

    var startAmount = await web3.eth.getBalance(accounts[5]);    

    var challengeArgs = formBundleLengthsHashes([rawTransferFrom2, rawCustodianApprove2]);
    result = await depositContract.challengeWithFutureCustody(accounts[5], mintHash, challengeArgs.bytes32Bundle, challengeArgs.txLengths, challengeArgs.txMsgHashes);
    console.log(`challengeWithFutureCustody() gas used: ${result.receipt.gasUsed}`);
    var newBalance = await web3.eth.getBalance(accounts[5]);
    var withdrawnAmount = newBalance.sub(startAmount);
    assert(withdrawnAmount.eq(stakeValue), `should withdraw ${tokenValue + stakeValue} , instead ${withdrawnAmount}`);

  })

  it("should be able to prove past custody", async () => {
    var result = await tokenContract.mint(tokenValue, accounts[2]);
    var mintHash = result.logs[1].args.mintHash;
    result = await depositContract.deposit(mintHash, accounts[2], {value: tokenValue});
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[2], `token should have transfered to ${accounts[2]}, instead ${result}`);

    //FIRST TRANSFER
    var rawTransferFrom = await generateRawTxAndMsgHash(
      accounts[2],
      privKeys[2],
      tokenContract.address,
      0,
      tokenContract.transferFrom.request(accounts[2], accounts[3], mintHash.toString(), 0).params[0].data
    )
    result = await web3.eth.sendRawTransaction('0x' + rawTransferFrom.rawTx.toString('hex'));
    var rawCustodianApprove = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString(), 0).params[0].data
    )

    result = await web3.eth.sendRawTransaction('0x' + rawCustodianApprove.rawTx.toString('hex'));
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[3], `token should have transfered to ${accounts[3]}, instead ${result}`);
    

    // FUTURE FRAUDULENT TRANSFER
    var rawTransferFrom2 = await generateRawTxAndMsgHash(
      accounts[6],
      privKeys[6],
      tokenContract.address,
      0,
      tokenContract.transferFrom.request(accounts[6], accounts[7], mintHash.toString(), 0).params[0].data
    )
    var rawCustodianApprove2 = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString(), 0).params[0].data
    )
    
    //CREATE FUTURE FRAUDULENT WITHDRAWAL
    var rawWithdrawal = await generateRawTxAndMsgHash(
      accounts[7],
      privKeys[7],
      tokenContract.address,
      0,
      tokenContract.withdraw.request(mintHash.toString()).params[0].data
    )

    //STARTING FRAUDULENT CHALLENGE
    var withdrawArgs = formBundleLengthsHashes([rawWithdrawal, rawTransferFrom2, rawCustodianApprove2]);
    result = await depositContract.withdraw(accounts[8], mintHash, withdrawArgs.bytes32Bundle, withdrawArgs.txLengths, withdrawArgs.txMsgHashes, 1, {gasPrice: gasPrice, value:stakeValue});

    var challengeArgs = formBundleLengthsHashes([rawTransferFrom, rawCustodianApprove]);
    result = await depositContract.challengeWithPastCustody(accounts[5], mintHash, challengeArgs.bytes32Bundle, challengeArgs.txLengths, challengeArgs.txMsgHashes);
    console.log(`challengeWithPastCustody() gas used: ${result.receipt.gasUsed}`);
    //Time Travel Forward
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [605], id: 0});
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0});
    
    assertRevert(depositContract.claim(mintHash));
  })

  it("should be able to prove long chains of custody using challengeWithPastCustody()", async () => {
    var result = await tokenContract.mint(tokenValue, accounts[2]);
    var mintHash = result.logs[1].args.mintHash;
    result = await depositContract.deposit(mintHash, accounts[2], {value: tokenValue});
    result = await tokenContract.ownerOf(mintHash);
    assert(result === accounts[2], `token should have transfered to ${accounts[2]}, instead ${result}`);

    var rawTxs = []
    
    //CREATE CHAIN i LONG
    for (var i = 0; i < 10; i ++) {
      var sender = (i % 2 === 0) ? 2 : 3;
      var recipient = (i % 2 === 1) ? 2 : 3;
      var rawTransferFrom = await generateRawTxAndMsgHash(
        accounts[sender],
        privKeys[sender],
        tokenContract.address,
        0,
        tokenContract.transferFrom.request(accounts[sender], accounts[recipient], mintHash.toString(), i).params[0].data
      )
      result = await web3.eth.sendRawTransaction('0x' + rawTransferFrom.rawTx.toString('hex'));
      var rawCustodianApprove = await generateRawTxAndMsgHash(
        accounts[1],
        privKeys[1],
        tokenContract.address,
        0,
        tokenContract.custodianApprove.request(mintHash.toString(), i).params[0].data
      )
      result = await web3.eth.sendRawTransaction('0x' + rawCustodianApprove.rawTx.toString('hex'));
      result = await tokenContract.ownerOf(mintHash);
      assert(result === accounts[recipient], `token should have transfered to ${accounts[recipient]}, instead ${result}`);
      rawTxs.push(rawTransferFrom);
      rawTxs.push(rawCustodianApprove);
    }
    

    // FUTURE FRAUDULENT TRANSFER
    var rawTransferFrom2 = await generateRawTxAndMsgHash(
      accounts[6],
      privKeys[6],
      tokenContract.address,
      0,
      tokenContract.transferFrom.request(accounts[6], accounts[7], mintHash.toString(), 20).params[0].data
    )
    var rawCustodianApprove2 = await generateRawTxAndMsgHash(
      accounts[1],
      privKeys[1],
      tokenContract.address,
      0,
      tokenContract.custodianApprove.request(mintHash.toString(), 20).params[0].data
    )
    
    //CREATE FUTURE FRAUDULENT WITHDRAWAL
    var rawWithdrawal = await generateRawTxAndMsgHash(
      accounts[7],
      privKeys[7],
      tokenContract.address,
      0,
      tokenContract.withdraw.request(mintHash.toString()).params[0].data
    )

    //STARTING FRAUDULENT CHALLENGE
    var withdrawArgs = formBundleLengthsHashes([rawWithdrawal, rawTransferFrom2, rawCustodianApprove2]);
    result = await depositContract.withdraw(accounts[8], mintHash, withdrawArgs.bytes32Bundle, withdrawArgs.txLengths, withdrawArgs.txMsgHashes, 20, {gasPrice: gasPrice, value:stakeValue});

    var challengeArgs = formBundleLengthsHashes(rawTxs);
    result = await depositContract.challengeWithPastCustody(accounts[5], mintHash, challengeArgs.bytes32Bundle, challengeArgs.txLengths, challengeArgs.txMsgHashes);
    console.log(`long challengeWithPastCustody() gas used: ${result.receipt.gasUsed}`);
    //Time Travel Forward
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [605], id: 0});
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0});
    
    assertRevert(depositContract.claim(mintHash));
  })
})

var formBundleLengthsHashes = function(rawTxArr) {
  var bundleArr = [];
  var txLengths = [];
  var txMsgHashes = [];
  rawTxArr.forEach((value, i) => {
    bundleArr[i] = value.rawTx.toString('hex');
    txLengths[i] = value.rawTx.toString('hex').length + 2;
    txMsgHashes[i] = value.msgHash;
  })
  var bytes32Bundle = txsToBytes32BundleArr(bundleArr);
  return {bytes32Bundle: bytes32Bundle, txLengths: txLengths, txMsgHashes: txMsgHashes};
}

var txsToBytes32BundleArr = function (rawTxStringArr) {
  var bytes32Bundle = [];
  rawTxStringArr.forEach(value => {
    var tempBundle = toBytes32BundleArr(value);
    tempBundle.forEach(value => bytes32Bundle.push(value));
  })
  return bytes32Bundle;
}

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