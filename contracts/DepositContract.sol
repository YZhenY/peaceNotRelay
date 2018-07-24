pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./Ownable.sol";

contract DepositContract {
  using SafeMath for uint256;


  string contractState = 'preStaked';
  address tokenContract;
  address custodian;
  address custodianETC;
  uint256 stakedAmount;
  uint256 depositCap;
  uint256 depositedAmount;
  mapping (address => uint256) deposits;

  constructor (address _tokenContract, address _custodian) {
    tokenContract = _tokenContract;
  }
  
  modifier onlyCustodian() {
    if (custodian == msg.sender) {
      _;
    }
  }

  modifier statePreStaked () {
    if ( keccak256(contractState) == keccak256('preStaked'))  {
      _;
    }
  }

    modifier stateStaked () {
    if (keccak256(contractState) == keccak256('staked'))  {
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
    contractState = 'staked';
  }

  function deposit() payable public {
    deposits[msg.sender] += msg.value;
  }
  

  
}
