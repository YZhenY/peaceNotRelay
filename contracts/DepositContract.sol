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
  mapping (uint256 => address) public mintHashToMinter;

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
  
  event Deposit(address indexed depositer, uint256 amount, uint256 mintHash, address minter);
  event Challenge(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber);
  event ChallangeResolved(address indexed depositer, address indexed depositedTo, uint256 amount, uint256 indexed blockNumber, bytes signedTx); 
  event Refund(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Withdrawal(address indexed withdrawer, uint256 amount, uint256 indexed blockNumber);
  event Parsed(bytes data, address to, address from);

  bytes4 mintSignature = 0xe32e7aff;
  bytes4 withdrawSignature = 0x2e1a7d4d;
  bytes4 transferFromSignature = 0xfe99049a;
  bytes4 custodianApproveSignature = 0x6e3c045e;


  function setTokenContract(address _tokenContract) onlyCustodian statePreStaked public {
    tokenContract = _tokenContract;
  }


  function setCustodianETC(address _custodianETC) onlyCustodian statePreStaked public {
    custodianETC = _custodianETC;
  }

  function finalizeStake () onlyCustodian statePreStaked public {
    stakedAmount = address(this).balance;
    depositCap = address(this).balance.div(2);
    depositedAmount = 0;
    contractState = "staked";
  }

  function deposit(uint256 _mintHash, address _minter) payable public {
    depositedAmount += msg.value;
    mintHashToAmount[_mintHash] = mintHashToAmount[_mintHash].add(msg.value);
    mintHashToMinter[_mintHash] = _minter;
    emit Deposit(msg.sender, msg.value, _mintHash, _minter);
  }

  // mintHashToTimestamp
  mapping (uint256 => uint256) challengeTime;
  // mintHashToAddress
  mapping (uint256 => address) challengeAddress;
  // mintHashToAddress
  mapping (uint256 => address) challengeRecipient;
  //mintToStake 
  mapping (uint256 => uint256) challengeStake;
  //mintToNonce/depth
  mapping (uint256 => uint256) challengeNonce;

 /*
  /**
   * @dev Initiates a withdrawal process. Starts the challenge period 
   * Requires the msg sender to stake a payment (payable function)
   // TODO: check amount to stake, decern challenge time
   * @param _to address to send withdrawal 
   * @param _mintHash uint256 ID of token on TokenContract
   * @param _rawTxBundle bytes bundle that takes in concatination of bytes _withdrawalTx, bytes _lastTx, bytes _custodianTx
   * @param _txLengths lengths of transactions in rawTxBundle, used for efficiency purposes
   * @param _txMsgHashes msghashes of transactions in bundle
   + @param _declaredNonce depth of chain of custody from token contract. IMPORTANT TO BE HONEST
  */

  // function withdraw(address _to, uint256 _mintHash, bytes _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes, uint256 _declaredNonce) payable external {
  event Test(bytes tx1, bytes tx2, bytes tx3);
  event Trace(bytes out);
  event TraceAddress(address out);
  event Trace32(bytes32 out);
  function withdraw(address _to, uint256 _mintHash, bytes32[] _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes, uint256 _declaredNonce) public payable  {
    // TODO: check amount to stake, decern challenge time, require that a challenge has not started

    // splits bundle into individual rawTxs
    bytes[] rawTxList;
    splitTxBundle(_rawTxBundle, _txLengths, rawTxList);

    RLP.RLPItem[] memory withdrawTx = rawTxList[0].toRLPItem().toList();
    RLP.RLPItem[] memory lastTx = rawTxList[1].toRLPItem().toList();
    RLP.RLPItem[] memory custodianTx = rawTxList[2].toRLPItem().toList();

    checkTransferTxAndCustodianTx(lastTx, custodianTx, _txMsgHashes[2]);

    address lastCustody = parseData(lastTx[5].toData(), 2).toAddress(12);
    require(withdrawTx[3].toAddress() == tokenContract);
    require(lastCustody == ecrecover(_txMsgHashes[0], uint8(withdrawTx[6].toUint()), withdrawTx[7].toBytes32(), withdrawTx[8].toBytes32()), "WithdrawalTx not signed by lastTx receipient");

    //start challenge
    challengeTime[_mintHash] = now + 10 minutes;
    challengeNonce[_mintHash] = _declaredNonce;
    challengeAddress[_mintHash] = lastCustody;
    challengeRecipient[_mintHash] = _to;
    challengeStake[_mintHash] = msg.value;
  }

  //honest withdrawal
  function claim(uint256 _mintHash) public {
    require(challengeTime[_mintHash] != 0);
    require(challengeTime[_mintHash] < now);
    
    challengeRecipient[_mintHash].send((mintHashToAmount[_mintHash] ) + challengeStake[_mintHash]);

    mintHashToAmount[_mintHash] = 0;
    resetChallenge(_mintHash);
  }

  function challengeWithFutureCustody(address _to, uint256 _mintHash, bytes32[] _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes) public { 
    require(challengeTime[_mintHash] != 0);
    require(challengeTime[_mintHash] > now);

    // splits bundle into individual rawTxs
    bytes[] rawTxList;
    splitTxBundle(_rawTxBundle, _txLengths, rawTxList);

    // RLP.RLPItem[] memory lastTx = rawTxList[0].toRLPItem().toList();
    // RLP.RLPItem[] memory custodianTx = rawTxList[1].toRLPItem().toList();
    // bytes4 lastTxFuncSig = bytesToBytes4(parseData(lastTx[5].toData(), 0), 0);
    // bytes4 custodianTxFuncSig = bytesToBytes4(parseData(custodianTx[5].toData(), 0), 0);
    // address lastCustody = parseData(lastTx[5].toData(), 2).toAddress(12);

    // require(lastTx[3].toAddress() == tokenContract);
    // require(custodianTx[3].toAddress() == tokenContract);
    // require(lastTxFuncSig == transferFromSignature, "lastTx is not transferFrom function");
    // require(custodianTxFuncSig == custodianApproveSignature, "custodianTx is not custodianApproval");
    // require(custodianETC == ecrecover(_txMsgHashes[2], uint8(custodianTx[6].toUint()), custodianTx[7].toBytes32(), custodianTx[8].toBytes32()), "custodianTx should be signed by custodian");
    // require(lastCustody == ecrecover(_txMsgHashes[0], uint8(withdrawTx[6].toUint()), withdrawTx[7].toBytes32(), withdrawTx[8].toBytes32()), "WithdrawalTx not signed by lastTx receipient");
    // //TODO: which is more efficient, checking parameters or hash?
    // require(parseData(lastTx[5].toData(),3).equal(parseData(custodianTx[5].toData(),1)), "token_ids do not match");
    // require(parseData(lastTx[5].toData(),4).equal(parseData(custodianTx[5].toData(),2), "nonces do not match");

    
  }

  function checkTransferTxAndCustodianTx(RLP.RLPItem[] _transferTx, RLP.RLPItem[] _custodianTx, bytes32 _custodianTxMsgHash) internal {
    require(_transferTx[3].toAddress() == tokenContract);
    require(_custodianTx[3].toAddress() == tokenContract);
    require(bytesToBytes4(parseData(_transferTx[5].toData(), 0), 0) == transferFromSignature, "_transferTx is not transferFrom function");
    require(bytesToBytes4(parseData(_custodianTx[5].toData(), 0), 0) == custodianApproveSignature, "_custodianTx is not custodianApproval");
    require(custodianETC == ecrecover(_custodianTxMsgHash, uint8(_custodianTx[6].toUint()), _custodianTx[7].toBytes32(), _custodianTx[8].toBytes32()), "_custodianTx should be signed by custodian");
    //TODO: which is more efficient, checking parameters or hash?
    require(parseData(_transferTx[5].toData(),3).equal(parseData(_custodianTx[5].toData(),1)), "token_ids do not match");
    require(parseData(_transferTx[5].toData(),4).equal(parseData(_custodianTx[5].toData(),2)), "nonces do not match");
  }



  function splitTxBundle(bytes32[] _rawTxBundle, uint256[] _txLengths, bytes[] storage _rawTxList) internal {
    uint256 txStartPosition = 0;
    for (uint i = 0; i < _txLengths.length; i++) {
      _rawTxList[i] = sliceBytes32Arr(_rawTxBundle, txStartPosition, _txLengths[i]);
      txStartPosition = txStartPosition.add(_txLengths[i]);
      txStartPosition = txStartPosition + (64 - txStartPosition % 64);
    }
  }


  //TODO: MAKE MORE EFFICENT 
  function sliceBytes32Arr(bytes32[] _bytes32ArrBundle, uint256 _startPosition, uint256 _length) internal returns (bytes) {
    bytes memory out;
    uint256 i = _startPosition.div(64);
    uint256 endPosition = _startPosition.add(_length);
    uint256 z = endPosition.div(64);
    for (i ; i < z; i++) {
      out = out.concat(bytes32ToBytes(_bytes32ArrBundle[i]));
    }
    out = out.concat(bytes32ToBytes(_bytes32ArrBundle[z]).slice(0, (endPosition % 64 / 2) - 1));
    return out;
  }

  function resetChallenge(uint256 _mintHash) internal {
    challengeStake[_mintHash] = 0;
    challengeRecipient[_mintHash] = 0;
    challengeAddress[_mintHash] = 0;
    challengeNonce[_mintHash] = 0;
    challengeTime[_mintHash] = 0; 
  }

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
  // function splitRawTxBundle(bytes _rawTxBundle, uint256 _start, uint256 _end) public returns ()
  Transaction public testTx;

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

  function parseData(bytes data, uint256 i) internal returns (bytes) {
    if (i == 0) {
      return data.slice(0,5);
    } else {
      return data.slice(4 + ((i-1) * 32), 32);
    }
  }

  //https://ethereum.stackexchange.com/questions/40920/convert-bytes32-to-bytes
  //TODO: Look for more efficient method
  function bytes32ToBytes(bytes32 _data) internal pure returns (bytes) {
    return abi.encodePacked(_data);
  }



  function bytesToBytes32(bytes b, uint offset) private pure returns (bytes32) {
    bytes32 out;
    for (uint i = 0; i < 32; i++) {
      out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
    }
    return out;
  }

  function bytesToBytes4(bytes b, uint offset) private pure returns (bytes4) {
    bytes4 out;
    for (uint i = 0; i < 4; i++) {
      out |= bytes4(b[offset + i] & 0xFF) >> (i * 8);
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
