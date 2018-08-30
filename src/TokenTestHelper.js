//------------------------------------------------------------------------------
/*
This script provides helper functions for testing TokenContract.sol
*/

//------------------------------------------------------------------------------
//Set parameters
var network = 'rinkeby';
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

  getAddr: async function(_txHash){
    var tx = await provider.getTransactionReceipt(_txHash);
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
    await console.log("Contract instantiated");
    return tokenContract;
  },

  getTokenIdFromMint: async function(_mintTxHash) {
    var transactionReceipt = await provider.getTransactionReceipt(_mintTxHash);
    var tokenIdHex = await transactionReceipt['logs'][0]['topics'][3]
    var tokenIdDec = utils.bigNumberify(tokenIdHex).toString()
    console.log('tokenIdHex: '+tokenIdHex);
    console.log('tokenIdDec: '+tokenIdDec);
    return tokenIdHex;
  },

  getNonceFromTransferRequest: async function(_txHash){
    var transactionReceipt = await provider.getTransactionReceipt(_txHash);
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
