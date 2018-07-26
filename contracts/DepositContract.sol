pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./RLP.sol";

contract DepositContract {
  using SafeMath for uint256;
  using RLP for RLP.RLPItem;
  using RLP for RLP.Iterator;
  using RLP for bytes;

  string contractState = "preStaked";
  address tokenContract;
  address custodian;
  address custodianETC;
  uint256 stakedAmount;
  uint256 depositCap;
  uint256 depositedAmount;
  mapping (address => uint256) deposits;
  mapping (bytes32 => uint8) public txLog;

  struct Transaction {
    uint nonce;
    uint gasPrice;
    uint gasLimit;
    address to;
    uint value;
    bytes data;
    uint8 v;
    bytes32 r;
    bytes32 s;
    address from;
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
  event Parsed(bytes data, address to, address from);

  function setTokenContract(address _tokenContract) onlyCustodian statePreStaked public {
    tokenContract = _tokenContract;
  }

  function finalizeStake () onlyCustodian statePreStaked public {
    stakedAmount = address(this).balance;
    depositCap = address(this).balance.div(2);
    depositedAmount = 0;
    contractState = "staked";
  }

  function deposit() payable public {
    deposits[msg.sender] += msg.value;
  }

  Transaction public testTx;

  function submitFraud(bytes rawTx, bytes32 msgHash) public {
    Transaction memory parsedTx = parse(rawTx, msgHash);
    require(keccak256(parsedTx.from) == keccak256(custodian));
    require(keccak256(parsedTx.to) == keccak256(tokenContract));
    require(txLog[msgHash] == 0);
    //penalise custodian, possibly change to transfer against reentrancy
    msg.sender.send(100);
  }


  function parse(bytes rawTx, bytes32 msgHash) public returns (Transaction transaction) {
    RLP.RLPItem[] memory list = rawTx.toRLPItem().toList();

    // can potentially insert: if (signedTransaction.length !== 9) { throw new Error('invalid transaction'); } items()
    transaction.nonce = list[0].toUint();
    transaction.gasPrice = list[1].toUint();
    transaction.gasLimit = list[2].toUint();
    transaction.to = list[3].toAddress();
    //if value is 0, will revert
    if (!list[4].isEmpty()) {
      transaction.value = list[4].toUint();
    }
    //also can fail
    if (!list[5].isEmpty()) {
      transaction.data = list[5].toData();
    }
    transaction.v = uint8(list[6].toUint());
    transaction.r = list[7].toBytes32(); 
    transaction.s = list[8].toBytes32();
    transaction.from = ecrecover(msgHash, 28, transaction.r, transaction.s);
    emit Parsed(transaction.data, transaction.to, transaction.from);
    //fordebbugging
    testTx = transaction;
    return transaction;
  }

  function bytesToBytes32(bytes b, uint offset) private pure returns (bytes32) {
    bytes32 out;
    for (uint i = 0; i < 32; i++) {
      out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
    }
    return out;
  }

  function stringToBytes( string s) internal returns (bytes memory b3){
    b3 = bytes(s);
    return b3;
  }

  function ecrecovery(bytes32 hash, bytes sig) public returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;

    if (sig.length != 65) {
      return 0;
    }

    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))
      v := and(mload(add(sig, 65)), 255)
    }

    // https://github.com/ethereum/go-ethereum/issues/2053
    if (v < 27) {
      v += 27;
    }

    if (v != 27 && v != 28) {
      return 0;
    }

    /* prefix might be needed for geth only
     * https://github.com/ethereum/go-ethereum/issues/3731
     */
    // bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    // hash = sha3(prefix, hash);

    return ecrecover(hash, v, r, s);
  }

  function ecverify(bytes32 hash, bytes sig, address signer) public returns (bool) {
    return signer == ecrecovery(hash, sig);
  }


}
