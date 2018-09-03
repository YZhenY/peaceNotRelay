//------------------------------------------------------------------------------
/*
This script simulates a user interacting with TokenContract and DepositContract
*/

//------------------------------------------------------------------------------
//Set parameters
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';

var foreignNetwork = 'rinkeby'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
var foreignCustPrivateKey = '0x13410a539b4fdb8dabde37ff8d687cc23eea64ab11eaf348a2fd775ba71a31cc';
var foreignCustPublicAddr = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var foreignPrivateKey = '0x2b847e2e99d7600ab0fbae23643a6a81d009aaf0573e887b41079b614f61e450';
var foreignPublicAddr = '0x9677044a39550cEbB01fa79bEC04Cf54E162d0C3';
var foreignPrivateKey2 = '0x546a0806a2d0240d50797f7f7b0120a6af0d6e8bfa5b4620365f5e8af9eb6fe7';
var foreignPublicAddr2 = '0x942BbcCde96bEc073e1DCfc50bc661c21a674d63';
var foreignBlockTimeDelay = 55000;

var homeNetwork = 'kovan'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
var homeCustPrivateKey = '0x13410a539b4fdb8dabde37ff8d687cc23eea64ab11eaf348a2fd775ba71a31cc';
var homeCustPublicAddr = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var homePrivateKey = '0x2b847e2e99d7600ab0fbae23643a6a81d009aaf0573e887b41079b614f61e450';
var homePublicAddr = '0x9677044a39550cEbB01fa79bEC04Cf54E162d0C3';
var homeBlockTimeDelay = 55000;

var tokenContractAddr = '0x352246304ff47F2458775Cd9a4989f02E50f2Ec6';
var depositContractAddr = '0x93DBC7AFAbF7bd1E3c726D69215e319b5F61a3aA';

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var fs = require('fs');
var solc = require('solc');
var foreignProvider = new ethers.providers.InfuraProvider(network = foreignNetwork,
                                                          apiAccessToken = infuraAPI);
var homeProvider = new ethers.providers.InfuraProvider(network = homeNetwork,
                                                       apiAccessToken = infuraAPI);
const depositHelper = require('./DepositHelper.js');
const tokenHelper = require('./TokenHelper.js');

//------------------------------------------------------------------------------
//Set wallets
var custForeignWallet = new ethers.Wallet(foreignCustPrivateKey, foreignProvider);
var foreignWallet = new ethers.Wallet(foreignPrivateKey, foreignProvider);
var foreignWallet2 = new ethers.Wallet(foreignPrivateKey2, foreignProvider);
var homeWallet = new ethers.Wallet(homePrivateKey, homeProvider);

//------------------------------------------------------------------------------
//Get contract ABIs
var tokenContractInput = {
   language: "Solidity",
   sources: {
     'TokenContract_flat.sol':
     fs.readFileSync('../contracts/TokenContract_flat.sol','utf8')
   }
}
var tokenContractOutput = solc.compile(tokenContractInput, 1);
const tokenContractAbi = JSON.parse(tokenContractOutput.contracts['TokenContract_flat.sol:TokenContract'].
                      interface);

var depositContractInput = {
    language: "Solidity",
    sources: {
      'DepositContract_flat.sol':
      fs.readFileSync('../contracts/DepositContract_flat.sol','utf8')
    }
}
var depositContractOutput = solc.compile(depositContractInput, 1);
const depositContractAbi = JSON.parse(depositContractOutput.contracts['DepositContract_flat.sol:DepositContract'].
                       interface);

//------------------------------------------------------------------------------
//Interacting with contract instances

async function userTest(_custTokenContractInstance,
                        _tokenContractInstance,
                        _tokenContractInstance2,
                        _depositContractInstance){
  //1. Alice mints on TokenContract
  var tokenId;
  var transferTxHash;
  var nonce;
  var mintTxHash = await tokenHelper.mintCall(10000,
                                              foreignPublicAddr,
                                              _tokenContractInstance);
  //2. Alice deposits on DepositContract
  setTimeout(async function() {
    tokenId = await tokenHelper.getTokenIdFromMint(mintTxHash, foreignProvider);
    var depositTxHash = await depositHelper.depositCall(10000,
                                                        tokenId,
                                                        foreignPublicAddr,
                                                        _depositContractInstance);
  }, foreignBlockTimeDelay)

  //3. Alice makes a transfer to Bob on TokenContract
  setTimeout(async function() {
    transferTxHash = await tokenHelper.transferCall(foreignPublicAddr,
                                                        foreignPublicAddr2,
                                                        tokenId,
                                                        0,
                                                        _tokenContractInstance);
  }, foreignBlockTimeDelay + homeBlockTimeDelay)

  //4. Custodian approves transfer on TokenContract
  setTimeout(async function() {
    nonce = await tokenHelper.getNonceFromTransferRequest(transferTxHash, foreignProvider);
  }, foreignBlockTimeDelay*2 + homeBlockTimeDelay)

  setTimeout(async function() {
    await tokenHelper.custodianApproveCall(tokenId, nonce, _custTokenContractInstance);
  }, foreignBlockTimeDelay*3 + homeBlockTimeDelay)

  //5. Bob withdraws from DepositContract

}


//3. transfer on TokenContract

//------------------------------------------------------------------------------
//Run tests

async function instantiateAndTest(){
  var custTokenContract = await tokenHelper.instantiateContract(tokenContractAddr,
                                                      tokenContractAbi,
                                                      custForeignWallet);
  var tokenContract = await tokenHelper.instantiateContract(tokenContractAddr,
                                                      tokenContractAbi,
                                                      foreignWallet);
  var tokenContract2 = await tokenHelper.instantiateContract(tokenContractAddr,
                                                      tokenContractAbi,
                                                      foreignWallet2);
  var depositContract = await depositHelper.instantiateContract(depositContractAddr,
                                                          depositContractAbi,
                                                          homeWallet);
  await userTest(custTokenContract, tokenContract, tokenContract2, depositContract)
}

instantiateAndTest()
