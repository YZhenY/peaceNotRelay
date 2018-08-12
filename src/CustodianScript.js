/*
akombalabs.com

This script allows a Custodian to:
- deploy a HomeChain DepositContract;
- stake on a HomeChain DepositContract;
- deploy a ForeignChain TokenContract;
- listen for Transfers on a ForeignChain TokenContract;
- co-sign a transaction on a ForeignChain TokenContract;

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

//specify TokenContract
var tokenContractAddress = '0xF22999d07Bf99C75112C292AB1B399423Cb770ce';
var jsonFile = '../Contracts/tokenContract.json';
var parsed = JSON.parse(fs.readFileSync(jsonFile));
//var abi = parsed.abi
var bytecodeFile = '../Contracts/tokenContract.txt';
var bytecode = fs.readFileSync(bytecodeFile, "utf-8");

var tokenContract = new ethers.Contract(tokenContractAddress, parsed, wallet);

//listen for Transfer events
var transferMethodID = '0xb22781db7a1c1a87b86b7215e93e2ad8791bb8cc984291af99060086f14f0b4a';
var tokenIDHex = '0x9744663e9ce4a436cbd897d62862050ac115b19e8069f51b444cafc7b756b6ba';
var tokenIDInt = '68420091402644995921492871103118945056506363385934839950840550634224801461946';

// provider.on([ transferMethodID ], function(log) {
//     console.log('Event Log');
//     console.log(log);
// });

async function transferHistory(_tokenIDHex) {
	var filter = {
		fromBlock: 3788780,
		toBlock: 'latest',
		topics: [
		transferMethodID,
		null,null,
		_tokenIDHex
		]
	}
	var transferEvents = provider.getLogs(filter)
	transferEvents.then(function(result){
	   console.log(result);
	});
}

//Approve transfers on the TokenContract
async function custodianApproveCall(_tokenIDInt) {
	var result = await tokenContract.custodianApprove(_tokenIDInt);
    console.log(result);
}

async function ownerOfCall(_tokenIDInt) {
	var result = await tokenContract.ownerOf(_tokenIDInt);
    console.log(result);
}

custodianApproveCall('56064289943568641797652870540193695909662562700408150778951987980509060591558')
//send signed transfers to TokenContract
