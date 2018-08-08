/*
akombalabs.com

This script allows a Monitor to:
- view chain of custody of particular tokenID on ForeignChain TokenContract
- be alerted of conflicts on HomeChain withdraws
- submit chain of custody to HomeChain DepositContract in a challenge
- withdraw from DepositContract

*/

//require dependencies
var ethers = require('ethers');
var provider = new ethers.providers.InfuraProvider(network='ropsten', apiAccessToken='9744d40b99e34a57850802d4c6433ab8');
var fs = require('fs');
var BigNumber = require('bignumber.js')

//specify Monitor's account
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc23eea64ab11eaf348a2fd775ba71a31cc';
var publicAddress = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var wallet = new ethers.Wallet(privateKey, provider);

//specify TokenContract
var tokenContractAddress = '0xF22999d07Bf99C75112C292AB1B399423Cb770ce';
var jsonFile = '../Contracts/tokenContract.json';
var parsed = JSON.parse(fs.readFileSync(jsonFile));
//var abi = parsed.abi
var bytecodeFile = '../Contracts/tokenContract.txt';
var bytecode = fs.readFileSync(bytecodeFile, "utf-8");

var tokenContract = new ethers.Contract(tokenContractAddress, parsed, wallet);

// var deployTransaction = ethers.Contract.getDeployTransaction(bytecode, parsed, '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4');
// var sendPromise = wallet.sendTransaction(deployTransaction);
// sendPromise.then(function(transaction) {
//     console.log(transaction);
// });

//--------------------------------------------------------------------------------
//Minting, transferring, and interacting with TokenContract

async function mintCall() {
    var result = await tokenContract.mint(10000, '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4');
    var transactionHash = (result['hash']);
    console.log(transactionHash);
}

async function getTransactionReceipt(transactionHash) {
	var transactionReceipt = await provider.getTransactionReceipt(transactionHash);
	console.log(transactionReceipt);
}

async function ownerOfCall(tokenID) {
	var result = await tokenContract.ownerOf(tokenID);
    console.log(result)
}

async function transferCall() {
    var result = await tokenContract.transferFromTokenContract(
    	'0x754eC60c051dF8524F9775712f8e46f36293Da9d',
    	'0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4', 
    	'68420091402644995921492871103118945056506363385934839950840550634224801461946'
    	);
    console.log(result)
}

//--------------------------------------------------------------------------------
//Minting, transferring, and interacting with TokenContract
async function transferHistory(tokenID) {
	var filter = {
		fromBlock: 3788780,
		toBlock: 'latest',
		topics: [
		'0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a',
		null,null,
		tokenID
		]
	}
	var transferEvents = provider.getLogs(filter)
	transferEvents.then(function(result){
	   console.log(result);
	});

ownerOfCall('68420091402644995921492871103118945056506363385934839950840550634224801461946')
transferHistory('0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba')
















