pragma solidity ^0.4.24;

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
  bytes32 public byte32Tx;
  Transaction public transaction;
  RLP.RLPItem[] public rlpItem;

  function parse(bytes txString, bytes32 msgHash) public {

    
    print = txString;
    byte32Tx = keccak256(txString);
    

    RLP.RLPItem[] memory list = txString.toRLPItem().toList();

    // can potentially insert: if (signedTransaction.length !== 9) { throw new Error('invalid transaction'); } items()
    transaction.nonce = list[0].toUint();
    transaction.gasPrice = list[1].toUint();
    transaction.gasLimit = list[2].toUint();
    transaction.to = address(list[3].toUint());

    //if value is 0, will revert

    // transaction.value = list[4].toUint();

    //also can fail
    // transaction.data = list[5].toBytes();

    transaction.data = new bytes(36);
    for (uint i = 0; i < 36; i++) {
      transaction.data[i] = txString[txString.length - 103 + i];
    }

    // transaction.from = ecrecovery(keccak256(txString), txString);
    

    transaction.v = uint8(list[6].toUint());
    transaction.r = list[7].toBytes32();
    transaction.s = list[8].toBytes32();
    // transaction.from = ecrecover(keccak256(txString), uint8(list[6].toUint()), list[7].toBytes32(), list[8].toBytes32());
    // bytes32 blank = bytesToBytes32(new bytes(32), 0);
    transaction.from = ecrecover(msgHash, 28, transaction.r, transaction.s);

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

  // function rlpEncode (RLP.RLPItem[] RLPList) internal returns (bytes memory RLPEncoded) {
  //   for (uint i = 0; i < 6; i++) {

  //   }
  // }

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
