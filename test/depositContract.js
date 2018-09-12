var DepositContract = artifacts.require("DepositContract.sol");
var testHelpers = require('../utils/testHelpers')(web3);
var dummyTx = require('../utils/dummyRawTx.json');
var web3Utils = require('web3').utils;
const BN = web3Utils.BN;
var ethers = require('ethers');
var Wallet = ethers.Wallet;
var Promise = require("bluebird");
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
const serializedTx = tx.serialize()

var dummyCustodianApprove = { hash: '0x7861c15ac1ba7e2b9a9b3b520c18885770e50b03276016ccda5ed794083242e4',
  nonce: 15,
  blockHash: '0xb6c9df15c96727e3f2171767931c6a752aa1173c4593a82d0bb7f3e20d0203fe',
  blockNumber: 17,
  transactionIndex: 0,
  from: '0x6f4df877c984c6f424afcbb5539d0b2c3a5e371c',
  to: '0x7800ea70e1d0978ac2f266e3de7866b973c34329',
  value: new BN (0),
  gas: 6721975,
  gasPrice: new BN (100000000000),
  input: '0xeae02892a84a5e2b3a330196103a96052098bae69756c0feb9996273b1732353a9c8a4d3',
  v: '0x1c',
  r: '0x13cbb536fa75f914489165d7730a926134ed4eaa23d16ba097912d8e5798e3fd',
  s: '0x27ee9b917d505d8e792709af46156bc8efad0f363aed25c15b8222f073f0fe2b' }

var dummyTransferFrom = { hash: '0xdcad6b20594fac1e294bae57e2c3b900f4de78914492d92445fefb6442b9980c',
nonce: 0,
blockHash: '0xc7de4efb8bf99df8ff19ec69e348543f62cfd5c2a4d722f7f1f787e7ad59b9dc',
blockNumber: 16,
transactionIndex: 0,
from: '0x9d4056ab0220fa68fc4a27764772c8aa40b513b0',
to: '0x7800ea70e1d0978ac2f266e3de7866b973c34329',
value: new BN (0),
gas: 6721975,
gasPrice: new BN (100000000000),
input: '0x23b872dd0000000000000000000000009d4056ab0220fa68fc4a27764772c8aa40b513b000000000000000000000000004b48bb583ac57671ee71dd6605a8992a2fede61a84a5e2b3a330196103a96052098bae69756c0feb9996273b1732353a9c8a4d3',
v: '0x1c',
r: '0xd0ec4edab9f88619d9c48cd64e45a3da1a4d7e13a20db69033a234e68a3e64cd',
s: '0x56e492a2834e706d462d37db5ca85363c44775387e6a139781101e6c57431bd7' }

var dummyTokenId = '0xd9f48f06cfd7a657aec67d94e17e2e921df7ef2fa4d29ff2c0ec6bb3271a28dc';

var tokenContract = "0xc40b249a7cde0fca8fadcf4eba8dee933b460bd7";
var dummyAddress = "0xc40b249a7cde0fca8fadcf4eba8dea933b460bd7";

contract('Deposit Contract', async (accounts) => {
  beforeEach(async () => {
    depositContract = await DepositContract.new(accounts[0]);
    await depositContract.setTokenContract(tokenContract);
  })

  it("should  deposit()", async () => {
    var result = await depositContract.deposit(dummyTokenId, dummyAddress);
  })
})
