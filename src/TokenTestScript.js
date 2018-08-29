//------------------------------------------------------------------------------
/*
This script automates deployment of TokenContract and includes some test
functions interacting with the contract
*/

//------------------------------------------------------------------------------
//Set parameters
var network = 'rinkeby';
var blockTimeDelay = 40000;
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc' +
                 '23eea64ab11eaf348a2fd775ba71a31cc';
var publicAddress = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var publicAddress2 = '0x754eC60c051dF8524F9775712f8e46f36293Da9d';
var publicAddress3 = '0x8CCd089c3208C9D6cd171dddEEbBa6bA185Ab5A9';
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
async function testFunctions(_contractInstance){
  var mintTxHash = await mintCall(10000, publicAddress, _contractInstance);
  var tokenId;
  var transferTxHash;
  var nonce;
  setTimeout(async function() {
    tokenId = await getTokenIdFromMint(mintTxHash);
  }, blockTimeDelay)
  setTimeout(async function() {
    ownerOfCall(tokenId, _contractInstance);
  }, blockTimeDelay*2)
  setTimeout(async function() {
    transferTxHash = await transferCall(publicAddress, publicAddress2,
                                        tokenId, 0, _contractInstance);
  }, blockTimeDelay*3)
  setTimeout(async function() {
    nonce = await getNonceFromTransferRequest(transferTxHash);
  }, blockTimeDelay*4)
  setTimeout(async function() {
    custodianApproveCall(tokenId, nonce, _contractInstance);
  }, blockTimeDelay*5)
  setTimeout(async function() {
    ownerOfCall(tokenId, _contractInstance);
  }, blockTimeDelay*6)
  setTimeout(async function() {
    transferTxHash2 = await transferCall(publicAddress2, publicAddress3,
                                         tokenId, 1, _contractInstance);
  }, blockTimeDelay*7)
  setTimeout(async function() {
    ownerOfCall(tokenId, _contractInstance);
  }, blockTimeDelay*8)
  setTimeout(async function() {
    nonce2 = await getNonceFromTransferRequest(transferTxHash2);
  }, blockTimeDelay*9)
  setTimeout(async function() {
    custodianApproveCall(tokenId, nonce2, _contractInstance);
  }, blockTimeDelay*10)
  setTimeout(async function() {
    ownerOfCall(tokenId, _contractInstance);
  }, blockTimeDelay*11)
}

async function deployContractAndTest(_testFunctions){
  var txHash = await deployContract(bytecode, abi, publicAddress);
  setTimeout(async function() {
    var contractAddr = await getAddr(txHash);
    tokenContractAddress = await contractAddr;
    tokenContract = await instantiateContract(contractAddr, abi, wallet);
    _testFunctions(tokenContract)
  }, blockTimeDelay);
}

//Deploy tests
deployContractAndTest(testFunctions);

//------------------------------------------------------------------------------
//Interacting with blockchain

async function getNonceFromTransferRequest(_txHash){
  var transactionReceipt = await provider.getTransactionReceipt(_txHash);
  var nonce = await transactionReceipt['logs'][0]['data'][0];
  await console.log("Nonce: " + nonce);
  return nonce;
}

async function getTxHash(_tx){
  var txHash = await _tx['hash'];
  return txHash;
}

async function getAddr(_txHash){
  var tx = await provider.getTransactionReceipt(_txHash);
  var addr = await tx['contractAddress'];
  await console.log("Contract deployed at: " + addr);
  return addr
}

async function getTokenIdFromMint(_mintTxHash) {
  var transactionReceipt = await provider.getTransactionReceipt(_mintTxHash);
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

async function deployContract(_bytecode, _abi, _publicAddress){
  var deployTransaction = ethers.Contract.getDeployTransaction("0x"+_bytecode,
                                                               _abi,
                                                               _publicAddress);
  deployTransaction.gasLimit = 3500000;
  var tx = await wallet.sendTransaction(deployTransaction);
  var txHash = await getTxHash(tx);
  await console.log('Created deployment transaction ' + txHash);
  return txHash;
}

async function instantiateContract(_addr, _abi, _wallet){
  var contractInstance = await new ethers.Contract(_addr, _abi, _wallet);
  var tokenContract = new Promise(resolve => {resolve(contractInstance);});
  await console.log("Contract instantiated");
  return tokenContract;
}

//------------------------------------------------------------------------------
//Interacting with contract instance

async function custodianApproveCall(_tokenId, _declaredNonce, _contractInstance){
  var result = await _contractInstance.custodianApprove(_tokenId, _declaredNonce);
  var txHash = await getTxHash(result);
  await console.log('Transfer approved at tx: ' + txHash);
  return txHash;
}

async function mintCall(_amt, _publicAddress, _contractInstance) {
    var result = await _contractInstance.mint(_amt, _publicAddress);
    var txHash = await getTxHash(result);
    await console.log('mint() txHash: ' + txHash);
    return txHash;
}

async function ownerOfCall(_tokenId, _contractInstance) {
    var result = await _contractInstance.ownerOf(_tokenId);
    console.log(result+ " is owner of tokenId " + _tokenId);
}

async function transferCall(_from, _to, _tokenId, _declaredNonce, _contractInstance) {
  var tx = await _contractInstance.transferFrom(_from, _to, _tokenId, _declaredNonce);
  var txHash = await getTxHash(tx);
  await console.log("tokenId " + _tokenId + " transferred from address " +
                    _from + " to address " + _to + " in transaction " + txHash);
  return txHash;
}
