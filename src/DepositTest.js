//------------------------------------------------------------------------------
/*
This script automates deployment of TokenContract and includes some test
functions interacting with the contract
*/

//------------------------------------------------------------------------------
//Set parameters
var network = 'kovan'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
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
var fs = require('fs');
var solc = require('solc');
var provider = new ethers.providers.InfuraProvider(network = network,
                                                   apiAccessToken = infuraAPI);
const depositTestHelper = require('./DepositTestHelper.js');
const tokenTestHelper = require('./TokenTestHelper.js');

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
var tokenContractAddr = '0xEdD915279BeA923815D89cE5edDDca3fcC4167e0';
var tokenIdDec = 16118818340691892296820170890762028606357708147991905105415102369943739718021
var tokenIdHex = '0x23a2ed894fa2aa535bd368dac20708426157125cf901ad4d16ca2d9f90045985'

//------------------------------------------------------------------------------
//Write tests
async function testFunctions(_contractInstance){
  var setTokenContractTxHash = await depositTestHelper.setTokenContractCall(tokenContractAddr, _contractInstance);
  var setCustodianForeignTxHash = await depositTestHelper.setCustodianForeignCall(publicAddress, _contractInstance);
  setTimeout(async function() {
    tokenId = await depositTestHelper.finalizeStakeCall(_contractInstance);
  }, blockTimeDelay)
}

async function deployContractAndTest(_testFunctions){
  var txHash = await depositTestHelper.deployContract(bytecode,
                                                      abi,
                                                      publicAddress,
                                                      wallet);
  setTimeout(async function() {
    var contractAddr = await depositTestHelper.getAddr(txHash, provider);
    var depositContract = await depositTestHelper.instantiateContract(contractAddr, abi, wallet);
    _testFunctions(depositContract);
  }, blockTimeDelay);
}

//Deploy tests

deployContractAndTest(testFunctions);
// depositTestHelper.deployContract(bytecode, abi, publicAddress, wallet, 1000000000)
// depositContract = new ethers.Contract('0x6CD6426010AD55B9DF621887A1948e11522933b1', abi, wallet)
// depositContract.finalizeStake().then(function(value){console.log(value)});
// depositContract.setTokenContract('0xEdD915279BeA923815D89cE5edDDca3fcC4167e0').then(function(value){console.log(value)});
