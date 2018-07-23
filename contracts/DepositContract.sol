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

  constructor (address _tokenContract, address custodian) {
    tokenContract = _tokenContract;
  }
  
  modifier onlyCustodian() {
    if (custodian == msg.sender) {
      _;
    }
  }

  modifier statePreStaked () {
    if (contractState = 'preStaked')  {
      _;
    }
  }

    modifier stateStaked () {
    if (contractState = 'staked')  {
      _;
    }
  }
  
  event Deposit(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber);
  event Challenge(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber);
  event ChallangeResolved(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber, bytes signedTx); 
  event Refund(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Withdrawal(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);

  function finalizeStake () onlyCustodian statePreStaked public {
    stakedAmount = this.balance;
    depositCap = div(this.balance, 2);
    depositedAmount = 0;
    contractState = 'staked';

  }

  function deposit() payable public {
    deposits[msg.sender] += msg.value;
  }
  

  
}
