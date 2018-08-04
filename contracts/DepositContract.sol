pragma solidity ^0.4.24;
// pragma experimental ABIEncoderV2;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./RLP.sol";
import "./BytesLib.sol";

contract DepositContract {
  using SafeMath for uint256;
  using RLP for RLP.RLPItem;
  using RLP for RLP.Iterator;
  using RLP for bytes;
  using BytesLib for bytes;

  string contractState = "preStaked";
  address tokenContract;
  address custodian;
  address custodianETC;
  uint256 stakedAmount;
  uint256 depositCap;
  uint256 depositedAmount;
  mapping (uint256 => uint256) public mintHashToAmount;


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
  
  event Deposit(address indexed depositer, uint256 amount, uint256 mintHash);
  event Challenge(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber);
  event ChallangeResolved(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber, bytes signedTx); 
  event Refund(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Withdrawal(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Parsed(bytes data, address to, address from);

  bytes4 mintSignature = 0xe32e7aff;
  bytes4 withdrawSignature = 0x2e1a7d4d;
  bytes4 transferFromSignature = 0x23b872dd;
  bytes4 custodianApproveSignature = 0xeae02892;


  function setTokenContract(address _tokenContract) onlyCustodian statePreStaked public {
    tokenContract = _tokenContract;
  }

  function finalizeStake () onlyCustodian statePreStaked public {
    stakedAmount = address(this).balance;
    depositCap = address(this).balance.div(2);
    depositedAmount = 0;
    contractState = "staked";
  }

  function deposit(uint256 _mintHash) payable public {
    depositedAmount += msg.value;
    mintHashToAmount[_mintHash] = mintHashToAmount[_mintHash].add(msg.value);
    emit Deposit(msg.sender, msg.value, _mintHash);
  }

  // mintHashToTimestamp
  mapping (uint256 => uint256) challengeTime;
  // mintHashToAddress
  mapping (uint256 => address) challengeAddress;

  function withdraw(address _to, uint256 _mintHash, bytes _withdrawalTx, bytes _lastTx, bytes _custodianTx) public {
    // Transaction withdrawalTx = parse(_withdrawalTx);
    // Transaction lastTx = parse(_lastTx);
    // // Transaction custodianTx = parse(_custodianTx);
    // require(withdrawalTx.from == lastTx.to);
    // //TODO: compare custodianTx and lastTx token_ids here
    // //start challenge
    // challengeTime[_mintHash] = now + 10 minutes;
    // challengeAddress[_mintHash] = _to;
  }


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

  /* Util functions --------------------------------------------------*/
  function parse(bytes _rawTx, bytes32 _msgHash) public returns (    
    uint nonce,
    uint gasPrice,
    uint gasLimit,
    address to,
    uint value,
    bytes data,
    uint8 v,
    bytes32 r,
    bytes32 s,
    address from
    ) {
    RLP.RLPItem[] memory list = _rawTx.toRLPItem().toList();
    // can potentially insert: if (signedTransaction.length !== 9) { throw new Error('invalid transaction'); } items()
    nonce = list[0].toUint();
    gasPrice = list[1].toUint();
    gasLimit = list[2].toUint();
    to = list[3].toAddress();
    if (!list[4].isEmpty()) {
      value = list[4].toUint();
    }
    if (!list[5].isEmpty()) {
      data = list[5].toData();
    }
    v = uint8(list[6].toUint());
    r = list[7].toBytes32(); 
    s = list[8].toBytes32();
    from = ecrecover(_msgHash, 28, r, s);
    emit Parsed(data, to, from);
    return (
    nonce,
    gasPrice,
    gasLimit,
    to,
    value,
    data,
    v,
    r,
    s,
    from);
  }

  //hashes appropriate data then verifies against depositLog
  // function verifyMintTxParams(bytes data) public returns (uint8) {
  //   assert(data.slice(0,10).equal(mintSignature));
  //   // return depositLog[keccak256(data.slice(10, 266))];
  // }

  //NEEDS TESTING
  // function parseXYZ(bytes data) public returns (uint X, address Y, uint Z, uint txNonce) {
  //   require(data.slice(0,10).equal(mintSignature));
  //   X = data.slice(10, 74).toUint(0);
  //   Y = data.slice(74, 138).toAddress(0);
  //   Z = data.slice(138, 202).toUint(0);
  //   txNonce = data.slice(202, 266).toUint(0);
  //   return (X, Y, Z, txNonce);
  // }

  event Test(bytes signature, bytes firstArg);


  function parseData(bytes data, uint256 i) internal returns (bytes) {
    if (i == 0) {
      return data.slice(0,5);
    } else {
      return data.slice(5 + i * 32,32);
    }
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
