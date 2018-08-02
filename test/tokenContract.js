var TokenContract = artifacts.require("TokenContract");
var ERC721 = artifacts.require("ERC721BasicToken.sol");
var testHelpers = require('../utils/testHelpers')(web3);
var dummyTx = require('../utils/dummyRawTx.json');
var web3Utils = require('web3').utils;
const BN = web3Utils.BN;
var ethers = require('ethers');
var Wallet = ethers.Wallet;
const EthereumTx = require('ethereumjs-tx')
const privateKey = Buffer.from('2387a5730d394074ed23d1cb79c3fa2c4e11832439cdd40104ee6a7da7c1cfb9', 'hex')

var transactionFields = [ 'nonce',
'gasPrice',
'gasLimit',
'to',
'value',
'data',
'v',
'r',
's',
'from' ]

const txParams = {
  nonce: '0x00',
  gasPrice: '0x09184e72a000', 
  gasLimit: '0x2710',
  to: '0x0000000000000000000000000000000000000000', 
  value: '0x00', 
  data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
}
const tx = new EthereumTx(txParams)
tx.sign(privateKey)
console.log(tx);
const serializedTx = tx.serialize()
console.log(serializedTx.toString());

var depositContract = "0xc40b249a7cde0fca8fadcf4eba8dee933b460bd7";

contract('Token Contract Test', async (accounts) => {
  beforeEach(async () => {
    tokenContract = await TokenContract.new(accounts[0]);
  })

  it("should mint()", async() => {
   
  })

})