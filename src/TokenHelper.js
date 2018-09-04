//------------------------------------------------------------------------------
/*
This script provides helper functions for testing TokenContract.sol
*/

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var web3Utils = require('web3').utils;
var fs = require('fs');
var solc = require('solc');

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
    var tokenContract = new Promise(resolve => {resolve(contractInstance);});
    await console.log("TokenContract instantiated");
    return tokenContract;
  },

  getTokenIdFromMint: async function(_mintTxHash, _provider) {
    var transactionReceipt = await _provider.getTransactionReceipt(_mintTxHash);
    var tokenIdHex = await transactionReceipt['logs'][0]['topics'][3]
    var tokenIdDec = utils.bigNumberify(tokenIdHex).toString()
    console.log('tokenIdHex: '+tokenIdHex);
    console.log('tokenIdDec: '+tokenIdDec);
    return tokenIdHex;
  },

  getNonceFromTransferRequest: async function(_txHash, _provider){
    var transactionReceipt = await _provider.getTransactionReceipt(_txHash);
    var nonce = await transactionReceipt['logs'][0]['data'][65];
    await console.log("Nonce: " + nonce);
    return nonce;
  },

  //------------------------------------------------------------------------------
  //Interacting with TokenContract instance

  mintCall: async function(_amt, _publicAddress, _contractInstance) {
      var result = await _contractInstance.mint(_amt, _publicAddress);
      var txHash = await module.exports.getTxHash(result);
      await console.log('mint() txHash: ' + txHash);
      return txHash;
  },

  custodianApproveCall: async function(_tokenId, _declaredNonce, _contractInstance){
    var result = await _contractInstance.custodianApprove(_tokenId, _declaredNonce);
    var txHash = await module.exports.getTxHash(result);
    await console.log('Transfer approved at tx: ' + txHash);
    return txHash;
  },

  ownerOfCall: async function(_tokenId, _contractInstance) {
      var result = await _contractInstance.ownerOf(_tokenId);
      console.log(result+ " is owner of tokenId " + _tokenId);
  },

  transferCall: async function(_from, _to, _tokenId, _declaredNonce, _contractInstance) {
    var tx = await _contractInstance.transferFrom(_from, _to, _tokenId, _declaredNonce);
    var txHash = await module.exports.getTxHash(tx);
    await console.log("tokenId " + _tokenId + " transferred from address " +
                      _from + " to address " + _to + " in transaction " + txHash);
    return txHash;
  }

}
