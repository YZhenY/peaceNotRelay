//------------------------------------------------------------------------------
/*
This script simulates a user interacting with TokenContract and DepositContract
*/

//------------------------------------------------------------------------------
//Set parameters
var infuraAPI = '9744d40b99e34a57850802d4c6433ab8';

var foreignNetwork = 'kovan'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
var foreignCustPrivateKey = '0x13410a539b4fdb8dabde37ff8d687cc'+
                            '23eea64ab11eaf348a2fd775ba71a31cc';
var foreignCustPublicAddr = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var foreignPrivateKey = '0x2b847e2e99d7600ab0fbae23643a6a8'+
                        '1d009aaf0573e887b41079b614f61e450';
var foreignPublicAddr = '0x9677044a39550cEbB01fa79bEC04Cf54E162d0C3';
var foreignPrivateKey2 = '0x546a0806a2d0240d50797f7f7b0120a'+
                         '6af0d6e8bfa5b4620365f5e8af9eb6fe7';
var foreignPublicAddr2 = '0x942BbcCde96bEc073e1DCfc50bc661c21a674d63';
var foreignBlockTimeDelay = 55000;

var homeNetwork = 'ropsten'; //'rinkeby', 'ropsten', 'kovan', 'homestead'
var homeCustPrivateKey = '0x13410a539b4fdb8dabde37ff8d687cc'+
                         '23eea64ab11eaf348a2fd775ba71a31cc';
var homeCustPublicAddr = '0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4';
var homePrivateKey = '0x2b847e2e99d7600ab0fbae23643a6a8'+
                     '1d009aaf0573e887b41079b614f61e450';
var homePublicAddr = '0x9677044a39550cEbB01fa79bEC04Cf54E162d0C3';
var homeBlockTimeDelay = 55000;

var tokenContractAddr = '0x43F2649C9D3DC9d733B3A753e02a870f284477A7';
var depositContractAddr = '0x0e34f07C16f3504F6E21688347F0Fda2D2c5D48A';

//------------------------------------------------------------------------------
//Require dependencies
var ethers = require('ethers');
var utils = require('ethers').utils;
var Web3 = require("web3");
var EthereumTx = require('ethereumjs-tx');
var fs = require('fs');
var solc = require('solc');

const depositHelper = require('./DepositHelper.js');
const tokenHelper = require('./TokenHelper.js');

//------------------------------------------------------------------------------
//Set wallets and providers
var web3ForeignProvider = new Web3(new Web3.providers.HttpProvider("https://" +
                                   foreignNetwork + ".infura.io/" + infuraAPI));
var web3HomeProvider = new Web3(new Web3.providers.HttpProvider("https://" +
                                   homeNetwork + ".infura.io/" + infuraAPI));
var foreignProvider = new ethers.providers.InfuraProvider(network = foreignNetwork,
                                                          apiAccessToken = infuraAPI);
var homeProvider = new ethers.providers.InfuraProvider(network = homeNetwork,
                                                       apiAccessToken = infuraAPI);

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
const tokenContractAbi = JSON.parse(tokenContractOutput.contracts[
                         'TokenContract_flat.sol:TokenContract'].interface);
var depositContractInput = {
    language: "Solidity",
    sources: {
      'DepositContract_flat.sol':
      fs.readFileSync('../contracts/DepositContract_flat.sol','utf8')
    }
}
var depositContractOutput = solc.compile(depositContractInput, 1);
const depositContractAbi = JSON.parse(depositContractOutput.contracts[
                           'DepositContract_flat.sol:DepositContract'].interface);

//------------------------------------------------------------------------------
//Interacting with contract instances

async function userTest(_custTokenContractInstance,
                        _tokenContractInstance,
                        _tokenContractInstance2,
                        _depositContractInstance){
  //1. Alice mints on TokenContract
  var tokenId;
  var transferTxHash;
  var custodianApproveTxHash;
  var withdrawalTxHash;
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
    custodianApproveTxHash = await tokenHelper.custodianApproveCall(tokenId,
                                   nonce, _custTokenContractInstance);
  }, foreignBlockTimeDelay*3 + homeBlockTimeDelay)

  //5. Bob withdraws from DepositContract
  setTimeout(async function(){
    withdrawalTxHash = await tokenHelper.withdrawCall(tokenId, _tokenContractInstance2)
  }, foreignBlockTimeDelay*4 + homeBlockTimeDelay)

  setTimeout(async function(){
    var rawTransferFrom = await depositHelper.generateRawTxAndMsgHash(transferTxHash,
                                                                      web3ForeignProvider)
    var rawCustodianApprove = await depositHelper.generateRawTxAndMsgHash(custodianApproveTxHash,
                                                                          web3ForeignProvider)
    var rawWithdrawal = await depositHelper.generateRawTxAndMsgHash(withdrawalTxHash,
                                                                    web3ForeignProvider)
    var withdrawArgs = await depositHelper.formBundleLengthsHashes([rawWithdrawal, rawTransferFrom, rawCustodianApprove]);

    result = await depositHelper.withdrawCall(206250*10000000000,
                                              foreignPublicAddr2,
                                              tokenId,
                                              withdrawArgs.bytes32Bundle,
                                              withdrawArgs.txLengths,
                                              withdrawArgs.txMsgHashes,
                                              1, _depositContractInstance);
  }, foreignBlockTimeDelay*5 + homeBlockTimeDelay)
}

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

transferTxHash = '0x5b4d15a45ff70292c135cbc3fe8c627de04bf8f1394a7955c1770dc0c9bc8555'
custodianApproveTxHash = '0xed8775b9f0f6e8530de6b035c6a8e7aef7025e1d96386b2f400664a7d7279184'
withdrawalTxHash = '0xfa10ead8c0fa65d6d31dabbc385f46f3ac07b018dfd366e5c6c31171e34b0330'

async function withdrawTest(){
  var rawTransferFrom = await depositHelper.generateRawTxAndMsgHash(transferTxHash,
                                                                    web3ForeignProvider)
  // console.log(rawTransferFrom)
  var rawCustodianApprove = await depositHelper.generateRawTxAndMsgHash(custodianApproveTxHash,
                                                                        web3ForeignProvider)
  // console.log(rawCustodianApprove)
  var rawWithdrawal = await depositHelper.generateRawTxAndMsgHash(withdrawalTxHash,
                                                                  web3ForeignProvider)
  // console.log(rawWithdrawal)
  var withdrawArgs = await depositHelper.formBundleLengthsHashes([rawWithdrawal, rawTransferFrom, rawCustodianApprove]);
  console.log("rawTxArr: ",[rawWithdrawal, rawTransferFrom, rawCustodianApprove])

}
// withdrawTest()
