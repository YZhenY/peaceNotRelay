//------------------------------------------------------------------------------
/*
This script automates deployment of TokenContract and includes some test
functions interacting with the contract
*/

//------------------------------------------------------------------------------
//Set parameters
var network = 'rinkeby';
var blockTimeDelay = 50000;
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc' + 
                 '23eea64ab11eaf348a2fd775ba71a31cc';
var publicAddress = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var publicAddress2 = '0x754eC60c051dF8524F9775712f8e46f36293Da9d';
var tokenContract; 
var tokenContractAddress; //to be set after deploying contract 

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var provider = new ethers.providers.InfuraProvider(network = network, 
                                                   apiAccessToken = infuraAPI);
var fs = require('fs');
var solc = require('solc');

//------------------------------------------------------------------------------
//Set wallet
var wallet = new ethers.Wallet(privateKey, provider);

//------------------------------------------------------------------------------
//Write tests
async function testFunctions(_contractInstance){
  var txHash = await mintCall(10000, publicAddress, _contractInstance);
  setTimeout(async function() {
    var tokenId = await getTokenId(txHash);
    setTimeout(async function() {
      var tokenId = await getTokenId(txHash);
      setTimeout(async function() {
        transferCall(publicAddress, publicAddress2, tokenId, 0, _contractInstance);
      }, blockTimeDelay)
    }, blockTimeDelay)
  }, blockTimeDelay)
}

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
//Interacting with blockchain

function resolveAfterBlockTimeDelay(_promise) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(_promise);
    }, blockTimeDelay + 50);
  });
}

async function getAddr(_txHash){
    var tx = await provider.getTransactionReceipt(_txHash)
    var addr = await tx['contractAddress']
    return addr
}

async function deployContract(_bytecode, _abi, _publicAddress){
  var deployTransaction = ethers.Contract.getDeployTransaction("0x"+_bytecode, 
                                                               _abi, 
                                                               _publicAddress);
  deployTransaction.gasLimit = 3500000;
  var tx = await wallet.sendTransaction(deployTransaction);
  var txHash = await tx['hash'];
  await console.log('Created deployment transaction ' + txHash);
  return txHash;
}

async function instantiateContract(_addr, _abi, _wallet){
  console.log(_addr);
  var contractInstance = await new ethers.Contract(_addr, _abi, _wallet);
  await console.log("Contract instantiated");
  var tokenContract = await resolveAfterBlockTimeDelay(contractInstance);
  return tokenContract;
}

async function getTokenId(_txHash) {
  var transactionReceipt = await provider.getTransactionReceipt(_txHash);
  var tokenIdHex = await transactionReceipt['logs'][0]['topics'][3]
  var tokenIdDec = utils.bigNumberify(tokenIdHex).toString()
  console.log('tokenIdHex: '+tokenIdHex);
  console.log('tokenIdDec: '+tokenIdDec);
  return tokenIdHex;
}

async function getTransactionReceipt(_txHash) {
    var transactionReceipt = await provider.getTransactionReceipt(_txHash);
    console.log(transactionReceipt);
}

//------------------------------------------------------------------------------
//Interacting with contract instance

async function mintCall(_amt, _publicAddress, _contractInstance) {
    var result = await _contractInstance.mint(_amt, _publicAddress);
    var txHash = await (result['hash']);
    await console.log('mint() txHash: ' + txHash);
    return txHash
}

async function ownerOfCall(_tokenIdInt, _contractInstance) {
    var result = await _contractInstance.ownerOf(_tokenIdInt);
    console.log(result);
}

async function transferCall(_from, _to, _tokenId, _nonce, _contractInstance) {
  var tx = await _contractInstance.transferFrom(
    _from,
    _to,
    _tokenId,
    _nonce
  );
  var txHash = await tx['hash'];
  await console.log("tokenId " + _tokenId + "transferred from " + _from + "to " + _to 
                    + "in transaction " + txHash);
}

// ----------------------------------------------------------------------------------
// Testing functions

async function deployContractAndTest(_testFunctions){
  var txHash = await deployContract(bytecode, abi, publicAddress);
  setTimeout(async function() {
    var contractAddr = await getAddr(txHash);
    await console.log("Contract deployed at address " + contractAddr);
    tokenContractAddress = await contractAddr;
    tokenContract = await instantiateContract(contractAddr, abi, wallet);
    await _testFunctions(tokenContract)
  }, blockTimeDelay);
}

deployContractAndTest(testFunctions)




