//------------------------------------------------------------------------------
/*
This script provides helper functions for testing DepositContract.sol
*/

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var EthereumTx = require('ethereumjs-tx');
var ethJsUtils = require('ethereumjs-util');
var fs = require('fs');
var solc = require('solc');
var fs = require('fs');
var solc = require('solc');
var RLP = require('rlp');

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
      var tempBundle = module.exports.toBytes32BundleArr(value);
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

  generateRawTxAndMsgHash: async function(_txHash, _web3Provider) {
    var txParams = {};
    var tx = await _web3Provider.eth.getTransaction(_txHash);
    txParams.nonce = await _web3Provider.utils.toHex(tx['nonce']);
    txParams.gasPrice = await _web3Provider.utils.toHex(tx['gasPrice']);
    txParams.gasLimit = await _web3Provider.utils.toHex(tx['gas']);
    txParams.to = await tx['to'];
    txParams.value = await _web3Provider.utils.toHex(tx['value']);
    // txParams.value = _web3Provider.utils.toHex(0x0)
    txParams.data = await tx['input'];
    txParams.v = await tx['v'].toString('hex');
    txParams.r = await tx['r'].toString('hex');
    txParams.s = await tx['s'].toString('hex');

    var tx = new EthereumTx(txParams)
    const rawTx = tx.serialize();

    // //Form msgHash
    var decoded = RLP.decode('0x' + rawTx.toString('hex'));
    var txArrParams = []
    for (var i = 0; i < 6; i ++) {
      txArrParams.push('0x' + decoded[i].toString('hex'));
    }
    var msgHash = _web3Provider.utils.sha3('0x' + RLP.encode(txArrParams).toString('hex'));
    console.log(_web3Provider.eth.accounts.recover(msgHash, txParams.v, txParams.r, txParams.s, true))
    console.log(_web3Provider.eth.accounts.recoverTransaction('0x' + rawTx.toString('hex')))

    console.log(msgHash, txParams.v, txParams.r, txParams.s)

    // return {rawTx: rawTx, msgHash: msgHash};
    return


  }

}
