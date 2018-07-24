const HDWalletProvider = require("truffle-hdwallet-provider");
const private = require('./private.json');
const mnemonic = private.funds;
const infuraKey = private.infura;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development1: {
       host: 'localhost',
       port: 7545,
       network_id: '*', // Match any network id
       gas: 3500000,
     },
     development2: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 3500000,
    },
    ropsten: {
       provider: new HDWalletProvider(mnemonic, `https://ropsten.infura.io/${infuraKey}`),
       network_id: '*',
       gas: 3500000,
       gasPrice: 50000000000, // 50 gwei, this is very high
     },
     rinkeby: {
        provider: new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/${infuraKey}`),
        network_id: '*',
        gas: 3500000,
        gasPrice: 5000000000, // 50 gwei, this is very high
      },
   },
};
