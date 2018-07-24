pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./RLP.sol";

contract DepositContract {
  using SafeMath for uint256;
  using RLP for RLP.RLPItem;
  using RLP for RLP.Iterator;
  using RLP for bytes;

  string contractState = 'preStaked';
  address tokenContract;
  address custodian;
  address custodianETC;
  uint256 stakedAmount;
  uint256 depositCap;
  uint256 depositedAmount;
  mapping (address => uint256) deposits;

  struct Transaction {
    uint nonce;
    uint gasPrice;
    uint gasLimit;
    address to;
    uint value;
    bytes data;
  }

  constructor (address _custodian) {
    custodian = _custodian;
  }


  
  modifier onlyCustodian() {
    if (custodian == msg.sender) {
      _;
    }
  }

  modifier statePreStaked () {
    if (keccak256(contractState) == keccak256("preStaked"))  {
      _;
    }
  }

  modifier stateStaked () {
    if (keccak256(contractState) == keccak256("staked"))  {
      _;
    }
  }
  
  event Deposit(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber);
  event Challenge(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber);
  event ChallangeResolved(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber, bytes signedTx); 
  event Refund(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Withdrawal(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);

  function finalizeStake () onlyCustodian statePreStaked public {
    stakedAmount = address(this).balance;
    depositCap = address(this).balance.div(2);
    depositedAmount = 0;
    contractState = "staked";
  }

  function deposit() payable public {
    deposits[msg.sender] += msg.value;
  }
  
  bytes public print;
  Transaction public transaction;
  RLP.RLPItem[] public rlpItem;

  function parse(bytes txString) public {

    // bytes memory something = stringToBytes(txString);
    // print = something;
    RLP.RLPItem[] memory list = txString.toRLPItem().toList();
    transaction.gasPrice = list[1].toUint();
    transaction.gasLimit = list[2].toUint();
    transaction.to = address(list[3].toUint());
    transaction.value = list[4].toUint();
    /*
    transaction.gasPrice = list[1].toUint();
    transaction.gasLimit = list[2].toUint();
    transaction.to = address(list[3].toUint());
    transaction.value = list[4].toUint();

    //Ugly hard coding for now. Can only parse burn transaction.
    transaction.data = new bytes(36);
    for (uint i = 0; i < 36; i++) {
      transaction.data[i] = something[something.length - 103 + i];
    }
    */
  }

  function stringToBytes( string s) internal returns (bytes memory b3){
    b3 = bytes(s);
    return b3;
  }
}
