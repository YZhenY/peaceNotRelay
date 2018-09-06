//------------------------------------------------------------------------------
/*
This script automates deployment of TokenContract and includes some test
functions interacting with the contract
*/

//------------------------------------------------------------------------------
//Set parameters
var network = 'kovan'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
var blockTimeDelay = 50000;
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

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var web3Utils = require('web3').utils;
var fs = require('fs');
var solc = require('solc');
var provider = new ethers.providers.InfuraProvider(network = network,
                                                   apiAccessToken = infuraAPI);
const tokenHelper = require('./TokenHelper.js');

//------------------------------------------------------------------------------
//Set wallets
var wallet = new ethers.Wallet(privateKey, provider);
var wallet2 = new ethers.Wallet(privateKey2, provider);
var wallet3 = new ethers.Wallet(privateKey3, provider);

//------------------------------------------------------------------------------
//Compile contract
var input = {
    language: "Solidity",
    sources: {
      'TokenContract_flat.sol':
      fs.readFileSync('../contracts/TokenContract_flat.sol','utf8')
    }
}
var output = solc.compile(input, 1);
const bytecode = output.contracts['TokenContract_flat.sol:TokenContract'].
                 bytecode;
const abi = JSON.parse(output.contracts['TokenContract_flat.sol:TokenContract'].
                       interface);

//------------------------------------------------------------------------------
//Write tests
async function testFunctions(_contractInstance, _contractInstance2){
  var mintTxHash = await tokenHelper.mintCall(10000, publicAddress, _contractInstance);
  var tokenId;
  var transferTxHash;
  var nonce;
  setTimeout(async function() {
    tokenId = await tokenHelper.getTokenIdFromMint(mintTxHash, provider);
  }, blockTimeDelay)
  setTimeout(async function() {
    await tokenHelper.ownerOfCall(tokenId, _contractInstance);
    transferTxHash = await tokenHelper.transferCall(publicAddress,
                                                        publicAddress2,
                                                        tokenId,
                                                        0,
                                                        _contractInstance);
  }, blockTimeDelay*2)
  setTimeout(async function() {
    nonce = await tokenHelper.getNonceFromTransferRequest(transferTxHash, provider);
  }, blockTimeDelay*3)
  setTimeout(async function() {
    await tokenHelper.custodianApproveCall(tokenId, nonce, _contractInstance);
  }, blockTimeDelay*4)
  setTimeout(async function() {
    await tokenHelper.ownerOfCall(tokenId, _contractInstance);
    transferTxHash2 = await tokenHelper.transferCall(publicAddress2,
                                                         publicAddress3,
                                                         tokenId,
                                                         nonce + 1,
                                                         _contractInstance2);
  }, blockTimeDelay*5)
  setTimeout(async function() {
    await tokenHelper.ownerOfCall(tokenId, _contractInstance);
    nonce2 = await tokenHelper.getNonceFromTransferRequest(transferTxHash2, provider);
  }, blockTimeDelay*6)
  setTimeout(async function() {
    await tokenHelper.custodianApproveCall(tokenId, nonce2, _contractInstance);
  }, blockTimeDelay*7)
  setTimeout(async function() {
    await tokenHelper.ownerOfCall(tokenId, _contractInstance);
  }, blockTimeDelay*8)
}

async function deployContractAndTest(_testFunctions){
  var txHash = await tokenHelper.deployContract(bytecode, abi, publicAddress, wallet);
  // setTimeout(async function() {
  //   var contractAddr = await tokenHelper.getAddr(txHash, provider);
  //   var tokenContract = await tokenHelper.instantiateContract(contractAddr, abi, wallet);
  //   var tokenContract2 = await tokenHelper.instantiateContract(contractAddr, abi, wallet2);
  //   _testFunctions(tokenContract, tokenContract2)
  // }, blockTimeDelay);
}

//Deploy tests
deployContractAndTest(testFunctions);
