
var network = process.env.NETWORK;


// if (network === "ROP" || network === "DEV1") {
    var DepositContract = artifacts.require("./DepositContract.sol");
    var TokenContract = artifacts.require("./TokenContract.sol");
    module.exports = function(deployer) {
      deployer.deploy(DepositContract, "0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4");
      deployer.deploy(TokenContract, "0xC33Bdb8051D6d2002c0D80A1Dd23A1c9d9FC26E4");
    };
// }

// //REPLACE WITH TOKEN CONTRACT
// if (network === "RINK" || network === "DEV2") {
//     var DepositContract = artifacts.require("./DepositContract.sol");

//     module.exports = function(deployer) {
//       deployer.deploy(DepositContract);
//     };
// }




