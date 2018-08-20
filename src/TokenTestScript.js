/*
This script deploys and interacts with TokenContract.sol, using Monitor account.
*/

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';
var provider = new ethers.providers.InfuraProvider(network='rinkeby',
               apiAccessToken=infuraAPI);
var fs = require('fs');
var solc = require('solc');

//------------------------------------------------------------------------------
//Compile Solidity contract
var input = {
    language: "Solidity",
    sources: {
        'TokenContract_flat.sol':
        fs.readFileSync('../contracts/TokenContract_flat.sol','utf8')
    }
}

var output = solc.compile(input, 1)
const bytecode = output.contracts['TokenContract_flat.sol:TokenContract']
                       .bytecode;
const abi = JSON.parse(output.contracts['TokenContract_flat.sol:TokenContract']
                .interface);

//------------------------------------------------------------------------------
//Specify Monitor's account
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc' +
                 '23eea64ab11eaf348a2fd775ba71a31cc';
var publicAddress = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var publicAddress2 = '0x754eC60c051dF8524F9775712f8e46f36293Da9d';
var wallet = new ethers.Wallet(privateKey, provider);

//------------------------------------------------------------------------------
//Interacting with blockchain
function contractInstance(_addr, _abi, _wallet){
  var contractInstance = new ethers.Contract(_addr, _abi, _wallet);
  return contractInstance
}

async function deployContract(_bytecode, _abi, _publicAddress){
  var deployTransaction = ethers.Contract.getDeployTransaction("0x"+_bytecode,
                          _abi, _publicAddress);
  var tx = await wallet.sendTransaction(deployTransaction)
  var txHash = tx['hash']
  console.log('txHash: ' + txHash)
  return txHash
}

async function getAddr(_txHash){
    var tx = await provider.getTransactionReceipt(_txHash)
    var addr = await tx['contractAddress']
    return addr
}

async function getTokenID(_txHash) {
  var transactionReceipt = await provider.getTransactionReceipt(_txHash);
  var tokenIDHex = await transactionReceipt['logs'][0]['topics'][3]
  var tokenIDDec = utils.bigNumberify(tokenIDHex).toString()
  console.log('tokenIDHex: '+tokenIDHex);
  console.log('tokenIDDec: '+tokenIDDec);
}

async function getTransactionReceipt(_txHash) {
    var transactionReceipt = await provider.getTransactionReceipt(_txHash);
    console.log(transactionReceipt);
}


//------------------------------------------------------------------------------
//Interacting with contract instance

async function mintCall(_amt, _publicAddress, _contractInstance) {
    var result = await _contractInstance.mint(_amt, _publicAddress);
    var txHash = (result['hash']);
    console.log('mint() txHash: ' + txHash);
    return txHash
}


async function ownerOfCall(_tokenIDInt, _contractInstance) {
    var result = await _contractInstance.ownerOf(_tokenIDInt);
    console.log(result);
}

async function transferCall(_from, _to, _tokenId, _nonce, _contractInstance) {
  var result = await _contractInstance.transferFrom(
    _from,
    _to,
    _tokenId,
    _nonce
  );
  console.log(result);
}

//----------------------------------------------------------------------------------
//Testing functions

async function test(){
  var deployTxHash = await deployContract(bytecode, abi, publicAddress)
  //wait 30 seconds to read address of contract
  setTimeout(async function() {
    var contractAddr = await getAddr(deployTxHash)
    await console.log("Contract deployed at address " + contractAddr)
    var tokenContract = await contractInstance(contractAddr, abi, wallet)
    await console.log("Contract instance created")
    await mintCall(10000, publicAddress, tokenContract)
  }, 40000);
}

// getTokenID('0xb6a6f225c2e0c78b37a7ec101b8f2806b35cf3b01f8e92e940c74de2594057e5')

var contractAddr = "0x93DBC7AFAbF7bd1E3c726D69215e319b5F61a3aA"
var tokenContract = contractInstance(contractAddr, abi, wallet)
// mintCall(10000, publicAddress, tokenContract)

transferCall(publicAddress, publicAddress2,
  '0x65b4424b82a7a387fc4dbff605b6059c60a14efc7edf40104c79adedfb99d9d2', 1,
  tokenContract)


// getTokenID('0x87136973e73006f6435af353bda0e1f42b39eeb7825d586c1f07d6b9de0c8298')


// ownerOfCall('56064289943568641797652870540193695909662562700408150778951987980509060591558')
// ownerOfCall(tokenIDInt);
