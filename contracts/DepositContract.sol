pragma solidity ^0.4.24;
// pragma experimental ABIEncoderV2;

import "./dependencies/SafeMath.sol";
import "./dependencies/Ownable.sol";
import "./dependencies/RLP.sol";
import "./dependencies/BytesLib.sol";

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
  event ChallengeResolved(uint256 mintHash); 
  event Withdrawal(address indexed withdrawer, uint256 indexed mintHash, uint256 stakedAmount);

  bytes4 mintSignature = 0xe32e7aff;
  bytes4 withdrawSignature = 0x2e1a7d4d;
  bytes4 transferFromSignature = 0xfe99049a;
  bytes4 custodianApproveSignature = 0x6e3c045e;
  uint256 gasPerChallenge = 206250;

  function setTokenContract(address _tokenContract) onlyCustodian statePreStaked public {
    tokenContract = _tokenContract;
  }


  function setCustodianETC(address _custodianETC) onlyCustodian statePreStaked public {
    custodianETC = _custodianETC;
  }

  function finalizeStake () onlyCustodian statePreStaked public {
    stakedAmount = address(this).balance;
    depositCap = address(this).balance;
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
  mapping (uint256 => address) challengeAddressClaim;
  // mintHashToAddress
  mapping (uint256 => address) challengeRecipient;
  //mintToStake 
  mapping (uint256 => uint256) challengeStake;
  //mintToEndNonce/depth
  mapping (uint256 => uint256) challengeEndNonce;
  //mintHashToNonce
  mapping (uint256 => uint256) challengeNonce;
  //mintHashToChallengerAddress
  mapping (uint256 => address) challenger;

  //For Debugging purposes
  event Test(bytes tx1, bytes tx2, bytes tx3);
  event Trace(bytes out);
  event TraceAddress(address out);
  event Trace32(bytes32 out);
  event TraceUint256(uint256 out);
  /*
  /**
   * @dev Initiates a withdrawal process. Starts the challenge period 
   * Requires the msg sender to stake a payment (payable function)
   // TODO: check amount to stake, decern challenge time
   * @param _to address to send withdrawal 
   * @param _mintHash uint256 ID of token on TokenContract
   * @param _rawTxBundle bytes32[] bundle that takes in concatination of bytes _withdrawalTx, bytes _lastTx, bytes _custodianTx
   * @param _txLengths lengths of transactions in rawTxBundle, used for efficiency purposes
   * @param _txMsgHashes msghashes of transactions in bundle
   + @param _declaredNonce depth of chain of custody from token contract. IMPORTANT TO BE HONEST
  */
  function withdraw(address _to, uint256 _mintHash, bytes32[] _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes, uint256 _declaredNonce) public payable  {
    // TODO:  decern challenge time, 
    //check amount to stake
    require(msg.value >= gasPerChallenge.mul(tx.gasprice).mul(_declaredNonce));
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

    //require that a challenge has not started
    require(challengeTime[_mintHash] == 0);
    //start challenge
    challengeTime[_mintHash] = now + 10 minutes;
    challengeEndNonce[_mintHash] = _declaredNonce;
    challengeAddressClaim[_mintHash] = lastCustody;
    challengeRecipient[_mintHash] = _to;
    challengeStake[_mintHash] = msg.value;
    emit Withdrawal(_to, _mintHash, msg.value);
  }

  /*
  /**
   * @dev For withdrawee to claims honest withdrawal
   * @param _mintHash uint256 ID of token on TokenContract
  */
  function claim(uint256 _mintHash) public {
    require(challengeTime[_mintHash] != 0);
    require(challengeTime[_mintHash] < now);
    require(challengeNonce[_mintHash] == challengeEndNonce[_mintHash] || challengeNonce[_mintHash] == 0, "either a challenge has started, or has not been proven to endNonce");
    
    challengeRecipient[_mintHash].send((mintHashToAmount[_mintHash] ) + challengeStake[_mintHash]);

    mintHashToAmount[_mintHash] = 0;
    resetChallenge(_mintHash);
  }

  /*
  /**
   * @dev For challenger to claim stake on fradulent challenge (challengeWithPastCustody())
   * @param _mintHash uint256 ID of token on TokenContract
  */
  function claimStake(uint256 _mintHash) public {
    require(challengeTime[_mintHash] != 0);
    require(challengeTime[_mintHash] < now);
    require(challengeNonce[_mintHash] != challengeEndNonce[_mintHash] && challengeNonce[_mintHash] != 0, "challenge not initated/withdrawal is honest");
    
    challengeRecipient[_mintHash].send(challengeStake[_mintHash]);
    
    resetChallenge(_mintHash);
  }
  /*
  /**
   * @dev Challenges with future custody using a transaction proving transfer of token
   * once future custody is proven, it ends pays the challenger
   * @param _to address to send stake given success
   * @param _mintHash uint256 ID of token on TokenContract
   * @param _rawTxBundle bytes32[] bundle that takes in concatination of bytes _transactionTx, bytes _custodianTx
   * @param _txLengths lengths of transactions in rawTxBundle, used for efficiency purposes
   * @param _txMsgHashes msghashes of transactions in bundle
  */
  function challengeWithFutureCustody(address _to, uint256 _mintHash, bytes32[] _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes) public { 
    require(challengeTime[_mintHash] != 0);
    require(challengeTime[_mintHash] > now);

    // splits bundle into individual rawTxs
    bytes[] rawTxList;
    splitTxBundle(_rawTxBundle, _txLengths, rawTxList);

    RLP.RLPItem[] memory transferTx = rawTxList[0].toRLPItem().toList();
    RLP.RLPItem[] memory custodianTx = rawTxList[1].toRLPItem().toList();

    //TODO: NEED TO CHECK NONCE 
    checkTransferTxAndCustodianTx(transferTx, custodianTx, _txMsgHashes[1]);
    require(challengeAddressClaim[_mintHash] == parseData(transferTx[5].toData(), 1).toAddress(12), "token needs to be transfered from last proven custody");
    require(_mintHash == parseData(transferTx[5].toData(), 3).toUint(0), "needs to refer to the same mintHash");
    
    _to.send(challengeStake[_mintHash]);
    resetChallenge(_mintHash);
  }

/*
  /**
   * @dev Initiates a challenge with past custody using a chain of custody leading to the declared nonce
   * once challenge period ends. It should be designed such that it punishes challenging an honest withdrawal and incentivises challenging a fradulent one
   * requires challenger to stake.
   // TODO: extend challenge period when called
   * @param _to address to send stake given success
   * @param _mintHash uint256 ID of token on TokenContract
   * @param _rawTxBundle bytes32[] bundle that takes in concatination of bytes _transactionTx, bytes _custodianTx
   * @param _txLengths lengths of transactions in rawTxBundle, used for efficiency purposes
   * @param _txMsgHashes msghashes of transactions in bundle
  */
  function initiateChallengeWithPastCustody(address _to, uint256 _mintHash, bytes32[] _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes) payable public {
    require(challengeTime[_mintHash] != 0);
    require(challengeTime[_mintHash] > now);
    require(msg.value >= gasPerChallenge.mul(tx.gasprice).mul(challengeEndNonce[_mintHash]).div(5));

    // splits bundle into individual rawTxs
    bytes[] rawTxList;
    splitTxBundle(_rawTxBundle, _txLengths, rawTxList);

    RLP.RLPItem[] memory transferTx = rawTxList[0].toRLPItem().toList();
    RLP.RLPItem[] memory custodianTx = rawTxList[1].toRLPItem().toList();

    checkTransferTxAndCustodianTx(transferTx, custodianTx, _txMsgHashes[1]);
    //TODO: save on require statement by not including _mintHash in arguments
    require(_mintHash == parseData(transferTx[5].toData(), 3).toUint(0), "needs to refer to the same mintHash");
    require(mintHashToMinter[_mintHash] == parseData(transferTx[5].toData(), 1).toAddress(12), "token needs to be transfered from last proven custody");
    //moves up root mint referecce to recipient address
    mintHashToMinter[_mintHash] = parseData(transferTx[5].toData(), 2).toAddress(12);

    challengeStake[_mintHash] += msg.value;
    challenger[_mintHash] = _to;
    challengeNonce[_mintHash] = 1;
  }

  /*
  /**
   * @dev Add to the chain of custody leading to the declared nonce
   * once challenge period ends claim funds through claimStake()
   // TODO: remove loops (less efficient then single calls)
   * @param _to address to send stake given success
   * @param _mintHash uint256 ID of token on TokenContract
   * @param _rawTxBundle bytes32[] bundle that takes in concatination of bytes _transactionTx, bytes _custodianTx
   * @param _txLengths lengths of transactions in rawTxBundle, used for efficiency purposes
   * @param _txMsgHashes msghashes of transactions in bundle
  */
  function challengeWithPastCustody(address _to, uint256 _mintHash, bytes32[] _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes) public { 
    require(challengeTime[_mintHash] != 0);
    require(challengeTime[_mintHash] > now);
    require(challengeNonce[_mintHash] > 0);

    // splits bundle into individual rawTxs
    bytes[] rawTxList;
    splitTxBundle(_rawTxBundle, _txLengths, rawTxList);

    //get rid of loops
    for (uint i = 0; i < _txLengths.length; i +=2) {
      RLP.RLPItem[] memory transferTx = rawTxList[i].toRLPItem().toList();
      RLP.RLPItem[] memory custodianTx = rawTxList[i + 1].toRLPItem().toList();

      checkTransferTxAndCustodianTx(transferTx, custodianTx, _txMsgHashes[i+1]);
      //TODO: save on require statement by not including _mintHash in arguments
      require(_mintHash == parseData(transferTx[5].toData(), 3).toUint(0), "needs to refer to the same mintHash");
      require(mintHashToMinter[_mintHash] == parseData(transferTx[5].toData(), 1).toAddress(12), "token needs to be transfered from last proven custody");
      //moves up root mint referecce to recipient address
      mintHashToMinter[_mintHash] = parseData(transferTx[5].toData(), 2).toAddress(12);
    }
  }

  /*
  /**
   * @dev In the existance of two mintHashes with the same nonce indicates the presence of double spending
   * Burn the custodian for a double spend
   // TODO: how much to punish custodian??? can we pay out the stake instead of just burning it, pause contract??
   * @param _to address to send stake given success
   * @param _mintHash uint256 ID of token on TokenContract
   * @param _rawTxBundle bytes32[] bundle that takes in concatination of bytes _transactionTx, bytes _custodianTx
   * @param _txLengths lengths of transactions in rawTxBundle, used for efficiency purposes
   * @param _txMsgHashes msghashes of transactions in bundle
  */
  function submitCustodianDoubleSign(address _to, uint256 _mintHash, bytes32[] _rawTxBundle, uint256[] _txLengths, bytes32[] _txMsgHashes) public {
    
    bytes[] rawTxList;
    splitTxBundle(_rawTxBundle, _txLengths, rawTxList);

    RLP.RLPItem[] memory transferTx = rawTxList[0].toRLPItem().toList();
    RLP.RLPItem[] memory custodianTx = rawTxList[1].toRLPItem().toList();
    RLP.RLPItem[] memory transferTx2 = rawTxList[2].toRLPItem().toList();
    RLP.RLPItem[] memory custodianTx2 = rawTxList[3].toRLPItem().toList();

    checkTransferTxAndCustodianTx(transferTx, custodianTx, _txMsgHashes[1]);
    checkTransferTxAndCustodianTx(transferTx2, custodianTx2, _txMsgHashes[3]);
    require(_mintHash == parseData(transferTx[5].toData(), 3).toUint(0), "needs to refer to the same mintHash");
    require(_mintHash == parseData(transferTx2[5].toData(), 3).toUint(0), "needs to refer to the same mintHash");
    require(parseData(transferTx2[5].toData(), 4).toUint(0) == parseData(transferTx[5].toData(), 4).toUint(0), "needs to refer to the same nonce");

    //TODO: how much to punish custodian??? can we pay out the stake instead of just burning it, pause contract??
    stakedAmount = 0;
    depositCap = 0;
  }

  /*
  /**
   * @dev Check the validity of the transfer and custodian transaction
   * @param  _transferTx RLP item array representing transferTx
   * @param _mintHash RLP item array representing corresponding custodianTx
   * @param _rawTxBundle bytes32 _custodianTx msgHash
  */
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

  /*
  /**
   * @dev Splits a rawTxBundle received to its individual transactions. 
   * Necessary due to limitation in amount of data transferable through solidity arguments
   * @param  _transferTx RLP item array representing transferTx
   * @param _mintHash RLP item array representing corresponding custodianTx
   * @param _rawTxBundle bytes32 _custodianTx msgHash
  */
  function splitTxBundle(bytes32[] _rawTxBundle, uint256[] _txLengths, bytes[] storage _rawTxList) internal {
    uint256 txStartPosition = 0;
    for (uint i = 0; i < _txLengths.length; i++) {
      _rawTxList[i] = sliceBytes32Arr(_rawTxBundle, txStartPosition, _txLengths[i]);
      txStartPosition = txStartPosition.add(_txLengths[i]);
      txStartPosition = txStartPosition + (64 - txStartPosition % 64);
    }
  }

  /*
  /**
   * @dev Splits a rawTxBundle received to its individual transactions. 
   * Necessary due to limitation in amount of data transferable through solidity arguments
   * @param  _transferTx RLP item array representing transferTx
   * @param _mintHash RLP item array representing corresponding custodianTx
   * @param _rawTxBundle bytes32 _custodianTx msgHash
  */
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
    challengeAddressClaim[_mintHash] = 0;
    challengeEndNonce[_mintHash] = 0;
    challengeTime[_mintHash] = 0; 
    challengeNonce[_mintHash] = 0;
    emit ChallengeResolved(_mintHash);
  }

  /* Util functions --------------------------------------------------*/

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
