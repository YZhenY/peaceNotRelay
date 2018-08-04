pragma solidity ^0.4.24;

import "../DepositContract.sol";

contract DepositContractMock is DepositContract {
  constructor(address _custodian) public
    DepositContract(custodian)
  { }

  function _parseData(bytes _data, uint256 _i) public {
    super.parseData(_data, _i);
  }

  // function _parseData(bytes _data, uint256 _i) public {
  //   super.parseData(_data, _i);
  // }


}