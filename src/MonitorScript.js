/*
akombalabs.com

This script allows a Monitor to:
- listen to HomeChain withdraws
- check if a HomeChain withdraw conflicts with transfers on ForeignChain
- get chain of custody of particular tokenId on ForeignChain TokenContract
- submit chain of custody to HomeChain DepositContract in a challenge

*/

//require dependencies
var ethers = require('ethers');
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
var withdrawMethodId = '0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a';
var tokenIdHex = '0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba';
var tokenIdInt = '68420091402644995921492871103118945056506363385934839950840550634224801461946';

async function withdrawHistory(_tokenIdHex) {
	var filter = {
		fromBlock: 3788780,
		toBlock: 'latest',
		topics: [
		withdrawMethodId,
		null,null,
		_tokenIdHex
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
//Retrieving transfer history of a tokenId

var transferMethodId = '0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a';

async function getTokenId(_txHash) {
  var transactionReceipt = await provider.getTransactionReceipt(_txHash);
  var tokenIdHex = await transactionReceipt['logs'][0]['topics'][0]
  var tokenIdDec = utils.bigNumberify(tokenIdHex).toString()
  console.log('tokenIdHex: '+tokenIdHex);
  console.log('tokenIdDec: '+tokenIdDec);
}

async function transferHistory(tokenId) {
	var filter = {
		fromBlock: 3788780,
		toBlock: 'latest',
		topics: [
		transferMethodId,
		null,null,
		tokenId
		]
	}
	var transferEvents = provider.getLogs(filter)
	transferEvents.then(function(result){
	   console.log(result);
	});
}

//--------------------------------------------------------------------------------
//Submitting transfer history of a tokenId in a challenge
var transferMethodId = '0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a';
var tokenIdHex = '0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba';
var tokenIdInt = '68420091402644995921492871103118945056506363385934839950840550634224801461946';

// transferHistory('0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba');
