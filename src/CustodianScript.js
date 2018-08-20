/*
akombalabs.com

This script allows a Custodian to:
- listen for Transfers on a ForeignChain TokenContract;
- co-sign a transaction on a ForeignChain TokenContract;
- deploy a HomeChain DepositContract;
- stake on a HomeChain DepositContract;
- deploy a ForeignChain TokenContract;
*/

//--------------------------------------------------------------------------------
//require dependencies
var ethers = require('ethers');
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';
var provider = new ethers.providers.InfuraProvider(network='rinkeby',
							 apiAccessToken=infuraAPI);
var fs = require('fs');

//specify Custodian's account
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc23eea64ab11eaf348a2fd775ba71a31cc';
var publicAddress = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var wallet = new ethers.Wallet(privateKey, provider);

//--------------------------------------------------------------------------------
//Interacting with blockchain

//--------------------------------------------------------------------------------
//listen for Transfer events
var transferMethodId = '0x3517824e5a48d0c22613c30dda31e0b0ea678f70dee970267c3a56c170dbcd16';
var tokenIdHex = '0x65b4424b82a7a387fc4dbff605b6059c60a14efc7edf40104c79adedfb99d9d2';

async function transferHistory(_tokenIdHex) {
	var filter = {
		fromBlock: 2800000,
		toBlock: 'latest',
		topics: [
		transferMethodId,
		null,null,
		null
		]
	}
	var transferEvents = provider.getLogs(filter)
	transferEvents.then(function(result){
	   console.log(result);
	});
}

transferHistory(tokenIdHex)

//--------------------------------------------------------------------------------
//Approve transfers on the TokenContract
async function custodianApproveCall(_tokenIdInt) {
	var result = await tokenContract.custodianApprove(_tokenIdInt);
    console.log(result);
}

async function ownerOfCall(_tokenIdInt) {
	var result = await tokenContract.ownerOf(_tokenIdInt);
    console.log(result);
}

// custodianApproveCall('56064289943568641797652870540193695909662562700408150778951987980509060591558')
