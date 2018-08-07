/*
akombalabs.com

This script allows a Custodian to:
- make a HomeChain DepositContract;
- stake on a HomeChain DepositContract;
- make a ForeignChain TokenContract;
- listen for Transfers on a ForeignChain TokenContract;
- co-sign a transaction on a ForeignChain TokenContract;

*/

//require dependencies
var ethers = require('ethers');
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';
var provider = new ethers.providers.InfuraProvider(network='homestead', apiAccessToken=infuraAPI);
var fs = require('fs');

//specify Custodian's account
var privateKey = '0x13410a539b4fdb8dabde37ff8d687cc23eea64ab11eaf348a2fd775ba71a31cc';
var wallet = new ethers.Wallet(privateKey, provider);

//specify TokenContract address
var cryptoFightersContractAddress = '0x87d598064c736dd0C712D329aFCFAA0Ccc1921A1';

//listen for Transfer events
transferID = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

provider.on([ transferID ], function(log) {
    console.log('Event Log');
    console.log(log);
});

//sign transfers 

//send signed transfers to TokenContract