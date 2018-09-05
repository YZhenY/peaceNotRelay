//------------------------------------------------------------------------------
/*
This script provides helper functions for testing DepositContract.sol
*/

//------------------------------------------------------------------------------
//Set parameters
var network = 'kovan';
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc' +
                 '23eea64ab11eaf348a2fd775ba71a31cc';
var publicAddress = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var privateKey2 = '0x34a1c7257c8a0f6e44b991370d3bd22' +
                  'd761cdc07d106ff0ff59191e66fa31081';
var publicAddress2 = '0x754eC60c051dF8524F9775712f8e46f36293Da9d';
var privateKey3 = '0xe850b670f1ed2225708c2700c085d4d' +
                  'a3bea80d221fe8c34eb0672e88e2e9e79';
var publicAddress3 = '0x8CCd089c3208C9D6cd171dddEEbBa6bA185Ab5A9';
var tokenContractAddress; //to be set after deploying contract

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var web3Utils = require('web3').utils;
const EthereumTx = require('ethereumjs-tx');
var fs = require('fs');
var solc = require('solc');
var provider = new ethers.providers.InfuraProvider(network = network,
                                                   apiAccessToken = infuraAPI);

module.exports = {
  //------------------------------------------------------------------------------
  //Interacting with blockchain

  getTxHash: async function(_tx){
    var txHash = await _tx['hash'];
    return txHash;
  },

  getAddr: async function(_txHash, _provider){
    var tx = await _provider.getTransactionReceipt(_txHash);
    var addr = await tx['contractAddress'];
    await console.log("Contract deployed at: " + addr);
    return addr
  },

  deployContract: async function(_bytecode, _abi, _publicAddress, _wallet){
    var deployTransaction = ethers.Contract.getDeployTransaction("0x"+_bytecode,
                                                                 _abi,
                                                                 _publicAddress);
    deployTransaction.gasLimit = 3500000;
    var tx = await _wallet.sendTransaction(deployTransaction);
    var txHash = await module.exports.getTxHash(tx);
    await console.log('Created deployment transaction ' + txHash);
    return txHash;
  },

  instantiateContract: async function(_addr, _abi, _wallet){
    var contractInstance = await new ethers.Contract(_addr, _abi, _wallet);
    var depositContract = new Promise(resolve => {resolve(contractInstance);});
    await console.log("DepositContract instantiated");
    return depositContract;
  },

  stakeCall: async function(_addr, _etherString, _wallet){
    var transaction = {
      to: _addr,
      value: ethers.utils.parseEther(_etherString)
    };
    var tx = await _wallet.sendTransaction(transaction);
    var txHash = await module.exports.getTxHash(tx);
    await console.log('Sent ' + _etherString + ' to ' + _addr + ' at tx ' + txHash);
    return txHash;
  },

  //--------------------------------------------------------------------------------
  //Interacting with DepositContract instance

  setTokenContractCall: async function(_addr, _contractInstance){
    var result = await _contractInstance.setTokenContract(_addr);
    var txHash = await module.exports.getTxHash(result);
    await console.log('TokenContract set to contract at address ' + _addr +
                      ' in transaction ' + txHash);
    return txHash;
  },

  setCustodianForeignCall: async function(_addr, _contractInstance){
    var result = await _contractInstance.setCustodianForeign(_addr);
    var txHash = await module.exports.getTxHash(result);
    await console.log('TokenContract custodian set to address ' + _addr +
                      ' in transaction ' + txHash);
    return txHash;
  },

  finalizeStakeCall: async function(_contractInstance){
    var result = await _contractInstance.finalizeStake();
    var txHash = await module.exports.getTxHash(result);
    await console.log('Stake finalized at transaction: ' + txHash);
    return txHash;
  },

  depositCall: async function(_amt, _tokenId, _minter, _contractInstance) {
    var result = await _contractInstance.deposit(_tokenId, _minter, {value: _amt});
    var txHash = await module.exports.getTxHash(result);
    await console.log('deposit() txHash: ' + txHash);
    return txHash;
  },

  withdrawCall: async function(_to, _tokenId, _rawTxBundle,
                               _txLengths, _txMsgHashes,
                               _declaredNonce, _contractInstance){
     var result = await _contractInstance.withdraw(_to, _tokenId, _rawTxBundle,
                                                   _txLengths, _txMsgHashes,
                                                   _declaredNonce);
     var txHash = await module.exports.getTxHash(result);
     await console.log('withdraw() txHash: ' + txHash);
     return txHash;
  },

  formBundleLengthsHashes: function(rawTxArr) {
    var bundleArr = [];
    var txLengths = [];
    var txMsgHashes = [];
    rawTxArr.forEach((value, i) => {
      bundleArr[i] = value.rawTx.toString('hex');
      txLengths[i] = value.rawTx.toString('hex').length + 2;
      txMsgHashes[i] = value.msgHash;
    })
    var bytes32Bundle = module.exports.txsToBytes32BundleArr(bundleArr);
    return {bytes32Bundle: bytes32Bundle,
            txLengths: txLengths,
            txMsgHashes: txMsgHashes};
  },

  txsToBytes32BundleArr: function (rawTxStringArr) {
    var bytes32Bundle = [];
    rawTxStringArr.forEach(value => {
      var tempBundle = toBytes32BundleArr(value);
      tempBundle.forEach(value => bytes32Bundle.push(value));
    })
    return bytes32Bundle;
  },

  toBytes32BundleArr: function (rawBundle) {
    var bytes32Bundle = [];
    for (var i = 0; i < rawBundle.length; i ++) {
      bytes32Bundle[Math.floor(i / 64)] = (bytes32Bundle[Math.floor(i / 64)]) ?
                                           bytes32Bundle[Math.floor(i / 64)] +
                                           rawBundle[i] : rawBundle[i] ;
    }
    bytes32Bundle.forEach((value, index) => {
      bytes32Bundle[index] = '0x' + bytes32Bundle[index];
    })
    return bytes32Bundle;
  },

  generateRawTxAndMsgHash: async function(_pubK, _privK, _to, _value, _data,
                                          _provider, _wallet) {
    var txParams = {};
    txParams.nonce = await _provider.getTransactionCount(_wallet.address);
    txParams.gasPrice = web3Utils.toHex(500);
    txParams.gasLimit = web3Utils.toHex(6721975);
    txParams.to = _to;
    txParams.value = web3Utils.toHex(_value);
    txParams.data = _data;

    var tx = new EthereumTx(txParams)
    tx.sign(new Buffer.from(_privK, 'hex'));
    console.log("tx ", tx)
    const rawTx = tx.serialize();
    console.log(rawTx)

    // //Form msgHash
    var decoded = utils.RLP.decode('0x' + rawTx.toString('hex'));
    var txArrParams = []
    for (var i = 0; i < 6; i ++) {
      txArrParams.push(decoded[i].toString('hex'));
    }
    var msgHash = utils.keccak256(utils.RLP.encode(txArrParams).toString('hex'));

    return {rawTx: rawTx, msgHash: msgHash};
  }

}
