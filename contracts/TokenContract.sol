pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./RLP.sol";
import "./BytesLib.sol";
import "./StandardToken.sol";

contract TokenContract is StandardToken {
  using SafeMath for uint256;
  using RLP for RLP.RLPItem;
  using RLP for RLP.Iterator;
  using RLP for bytes;
  using BytesLib for bytes;

  string contractState = "preStaked";
  address depositContract;
  address custodian;
  address custodianETH;
  uint256 stakedAmount;
  uint256 mintCap;
  uint256 mintedAmount;
  mapping (bytes32 => uint8) public mintLog;
  mapping (bytes32 => uint8) public burnLog;


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
  
  event Mint(uint256 amount, address indexed depositedTo, uint256 indexed blockNumber, uint256 ETCBlockNumber,  uint256 nonce);
  event Challenge(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber);
  event ChallangeResolved(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber, bytes signedTx); 
  event Refund(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Withdrawal(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Parsed(bytes data, address to, address from);

  function setDepositContract(address _depositContract) onlyCustodian statePreStaked public {
    depositContract = _depositContract;
  }

  function finalizeStake () onlyCustodian statePreStaked public {
    stakedAmount = address(this).balance;
    mintCap = address(this).balance.div(2);
    totalSupply_ = 0;
    contractState = "staked";
  }

  //TODO: ADD only when staked
  function mint(uint256 _X, address _Y, uint256 _Z, uint256 _nonce) onlyCustodian public {
    totalSupply_ += _X;
    balance[_Y] += _X;
    emit Mint(_X, _Y, _Z, block.number, _nonce);
  }


  //for DEBUGGING
  Transaction public testTx;

  //ADD ONLY WHEN STAKED
  // function submitFraud(bytes rawTx, bytes32 msgHash) public {
  //   Transaction memory parsedTx = parse(rawTx, msgHash);
  //   require(keccak256(parsedTx.from) == keccak256(custodian));
  //   require(keccak256(parsedTx.to) == keccak256(tokenContract));
  //   require(verifyMintTxParams(parsedTx.data) == 0);
  //   //penalise custodian, possibly change to transfer against reentrancy
  //   msg.sender.send(100);
  // }


  function parse(bytes rawTx, bytes32 msgHash) public returns (Transaction transaction) {
    RLP.RLPItem[] memory list = rawTx.toRLPItem().toList();
    // can potentially insert: if (signedTransaction.length !== 9) { throw new Error('invalid transaction'); } items()
    transaction.nonce = list[0].toUint();
    transaction.gasPrice = list[1].toUint();
    transaction.gasLimit = list[2].toUint();
    transaction.to = list[3].toAddress();
    if (!list[4].isEmpty()) {
      transaction.value = list[4].toUint();
    }
    if (!list[5].isEmpty()) {
      transaction.data = list[5].toData();
    }
    transaction.v = uint8(list[6].toUint());
    transaction.r = list[7].toBytes32(); 
    transaction.s = list[8].toBytes32();
    transaction.from = ecrecover(msgHash, 28, transaction.r, transaction.s);
    emit Parsed(transaction.data, transaction.to, transaction.from);
    //for debbugging
    testTx = transaction;
    return transaction;
  }

  bytes mintSignature = "0xe32e7aff";


  //hashes appropriate data then verifies against txLog
  // function verifyMintTxParams(bytes data) public returns (uint8) {
  //   assert(data.slice(0,10).equal(mintSignature));
  //   return txLog[keccak256(data.slice(10, 266))];
  // }

  //NEEDS TESTING
  function parseXYZ(bytes data) public returns (uint X, address Y, uint Z, uint txNonce) {
    require(data.slice(0,10).equal(mintSignature));
    X = data.slice(10, 74).toUint(0);
    Y = data.slice(74, 138).toAddress(0);
    Z = data.slice(138, 202).toUint(0);
    txNonce = data.slice(202, 266).toUint(0);
    return (X, Y, Z, txNonce);
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

  // Nick Johnson https://ethereum.stackexchange.com/questions/4170/how-to-convert-a-uint-to-bytes-in-solidity
  function uint256ToBytes(uint256 x) internal returns (bytes b) {
    b = new bytes(32);
    assembly { mstore(add(b, 32), x) }
  }

  // Tjaden Hess https://ethereum.stackexchange.com/questions/884/how-to-convert-an-address-to-bytes-in-solidity
  function addressToBytes(address a) internal returns (bytes b) {
    assembly {
        let m := mload(0x40)
        mstore(add(m, 20), xor(0x140000000000000000000000000000000000000000, a))
        mstore(0x40, add(m, 52))
        b := m
    }
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
