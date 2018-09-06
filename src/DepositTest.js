//------------------------------------------------------------------------------
/*
This script automates deployment of TokenContract and includes some test
functions interacting with the contract
*/

//------------------------------------------------------------------------------
//Set parameters
var network = 'ropsten'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
var blockTimeDelay = 55000;
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
const depositHelper = require('./DepositHelper.js');

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
      'DepositContract_flat.sol':
      fs.readFileSync('../contracts/DepositContract_flat.sol','utf8')
    }
}
var output = solc.compile(input, 1);
const bytecode = output.contracts['DepositContract_flat.sol:DepositContract'].
                 bytecode;
const abi = JSON.parse(output.contracts['DepositContract_flat.sol:DepositContract'].
                       interface);
//------------------------------------------------------------------------------
//Specify TokenContract parameters
var tokenContractAddr = '0x2f5CB8ad4701Cca7557ac30414215a99101F5193';
var tokenContractNetwork = 'kovan'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
//------------------------------------------------------------------------------
//Write tests
async function testFunctions(_contractInstance, _contractAddr){
  var setTokenContractTxHash = await depositHelper.setTokenContractCall(tokenContractAddr, _contractInstance);
  setTimeout(async function() {
    var setCustodianForeignTxHash = await depositHelper.setCustodianForeignCall(publicAddress, _contractInstance);
  }, blockTimeDelay)
  setTimeout(async function() {
    var stakeTxHash = await depositHelper.stakeCall(_contractAddr, "0.1", wallet);
  }, blockTimeDelay*2)
  setTimeout(async function() {
    tokenId = await depositHelper.finalizeStakeCall(_contractInstance);
  }, blockTimeDelay*3)
}

async function deployContractAndTest(_testFunctions){
  var txHash = await depositHelper.deployContract(bytecode,
                                                      abi,
                                                      publicAddress,
                                                      wallet);
  setTimeout(async function() {
    var contractAddr = await depositHelper.getAddr(txHash, provider);
    var depositContract = await depositHelper.instantiateContract(contractAddr, abi, wallet);
    _testFunctions(depositContract, contractAddr);
  }, blockTimeDelay);
}

//Deploy tests

deployContractAndTest(testFunctions);
