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

// var deployTransaction = ethers.Contract.getDeployTransaction(bytecode, parsed, '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4');
// var sendPromise = wallet.sendTransaction(deployTransaction);
// sendPromise.then(function(transaction) {
//     console.log(transaction);
// });

var tokenContract = new ethers.Contract(tokenContractAddress, parsed, wallet);
// async function mintCall() {
//     var result = await tokenContract.mint(10000, '0xF22999d07Bf99C75112C292AB1B399423Cb770ce');
//     var transactionHash = (result['hash'])
// 	var transactionReceipt = provider.getTransactionReceipt(transactionHash).then(function(transactionReceipt) {
// 	    console.log(transactionReceipt);
// 	});
// }

// mintCall()

// var bn = BigNumber('93118777076508557655027028791478819579761877397809444865514027257674540416586')
// console.log(bn)
// async function ownerOfCall() {
// 	var result = await tokenContract.ownerOf('93118777076508557655027028791478819579761877397809444865514027257674540416586');
//     console.log(result)
// }
// ownerOfCall()


async function transferCall() {
    var result = await tokenContract.transferFromTokenContract('0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4',
    	'0x754eC60c051dF8524F9775712f8e46f36293Da9d', 
    	'0xcddf5c2ec44aa57a0afb3680db9aea2ea0e360e8a01cb86976fefd34ddca7e4a'
    	// '93118777076508557655027028791478819579761877397809444865514027257674540416586'
    	);
    console.log(result)
}

transferCall()
