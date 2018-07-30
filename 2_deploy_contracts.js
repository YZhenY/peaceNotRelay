
var network = process.env.NETWORK;


if (network === "ROP" || network === "DEV1") {
    var DepositContract = artifacts.require("./DepositContract.sol");

    module.exports = function(deployer) {
      deployer.deploy(DepositContract, "0xC896F608b294a8E45E742403A4C0354bE69F43ED");
    };
}

//REPLACE WITH TOKEN CONTRACT
if (network === "RINK" || network === "DEV2") {
    var DepositContract = artifacts.require("./DepositContract.sol");

    module.exports = function(deployer) {
      deployer.deploy(DepositContract);
    };
}




