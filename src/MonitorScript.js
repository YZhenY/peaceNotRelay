/*
akombalabs.com

This script allows a Monitor to:
- listen to HomeChain withdraws
- check if a HomeChain withdraw conflicts with transfers on ForeignChain
- get chain of custody of particular tokenID on ForeignChain TokenContract
- submit chain of custody to HomeChain DepositContract in a challenge

*/

//require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';
var provider = new ethers.providers.InfuraProvider(network='rinkeby', apiAccessToken=infuraAPI);
var fs = require('fs');

//specify Monitor's account
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc23eea64ab11eaf348a2fd775ba71a31cc';
var publicAddress = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var wallet = new ethers.Wallet(privateKey, provider);

var tokenContractAddress = '0x8Bb11D6d516085A8AEA14208796eA115A379B1f6'
var tokenContract = new ethers.Contract(tokenContractAddress, abi, wallet);

//--------------------------------------------------------------------------------
//Listen to HomeChain withdraws
var withdrawMethodID = '0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a';
var tokenIDHex = '0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba';
var tokenIDInt = '68420091402644995921492871103118945056506363385934839950840550634224801461946';

async function withdrawHistory(_tokenIDHex) {
	var filter = {
		fromBlock: 3788780,
		toBlock: 'latest',
		topics: [
		withdrawMethodID,
		null,null,
		_tokenIDHex
		]
	}
	var withdrawEvents = provider.getLogs(filter)
	withdrawEvents.then(function(result){
	   console.log(result);
	});
}

//--------------------------------------------------------------------------------
//Check if HomeChain withdraw conflicts with transfers on TokenContract



//--------------------------------------------------------------------------------
//Retrieving transfer history of a tokenID

var transferMethodID = '0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a';

async function getTokenID(_txHash) {
  var transactionReceipt = await provider.getTransactionReceipt(_txHash);
  var tokenIDHex = await transactionReceipt['logs'][0]['topics'][0]
  var tokenIDDec = utils.bigNumberify(tokenIDHex).toString()
  console.log('tokenIDHex: '+tokenIDHex);
  console.log('tokenIDDec: '+tokenIDDec);
}

async function transferHistory(tokenID) {
	var filter = {
		fromBlock: 3788780,
		toBlock: 'latest',
		topics: [
		transferMethodID,
		null,null,
		tokenID
		]
	}
	var transferEvents = provider.getLogs(filter)
	transferEvents.then(function(result){
	   console.log(result);
	});
}

//--------------------------------------------------------------------------------
//Submitting transfer history of a tokenID in a challenge
var transferMethodID = '0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a';
var tokenIDHex = '0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba';
var tokenIDInt = '68420091402644995921492871103118945056506363385934839950840550634224801461946';

// transferHistory('0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba');
