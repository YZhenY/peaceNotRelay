# peaceBridge

*Authors: Ben, Zhen, Ying Tong ([Akomba Labs](http://akomba.com/)).*

*We thank Dave Appleton (Akomba Labs), Anthony Lusardi (ETC Cooperative), and Loi Luu and Desmond (Kyber Network) for helpful discussions.*

Building off Loi Luu's BTC - ETH relay-less bridge described in "[Bringing Bitcoin to Ethereum](https://blog.kyber.network/bringing-bitcoin-to-ethereum-7bf29db88b9a)",  **Peace Bridge** is an ETC - ETH bridge that uses co-signed chains of custody to verify transactions across the two chains. By introducing a challenge game and imposing staking requirements, our design addresses the high gas cost issues and employs a trustless **Custodian**. 

The **Peace Bridge** is best illustrated through example. Consider, without loss of generality, a transfer in the ETC → ETH direction:

![](https://cdn-images-1.medium.com/max/1200/1*iv60priMWXBtE2Jbkfk1EQ.png)

*Staking, minting, and depositing on the Peace Bridge.* Alice mints TETC-A on the foreign Ethereum chain and deposits an equivalent amount of real ETC on her home Ethereum Classic chain.

## Staking, Minting, and Depositing

The **peaceBridge** is initiated by a **Custodian** who sets up `DepositContract` on the home chain (here, Ethereum Classic) and `TokenContract` on the foreign chain (here, Ethereum).

1a. **Custodian** stakes `α` ETC in `DepositContract` on the Ethereum Classic chain. `DepositContract` is where users will deposit home currency (here, ETC) in order to transact on the foreign chain. `α` will define `depositCap`, a limit on the amount of ETC that can be deposited in `DepositContract`. 
1b. **Custodian** sets up `TokenContract` on the Ethereum chain, where users can mint ERC721 TETC tokens. Each separate mint will produce an ERC721 token with a unique `tokenId` that *cannot be split*.

Once both `DepositContract` and `TokenContract` are set up, and `depositCap` is established, exchanges from ETC to TETC may begin.

Each user of the bridge mints on `TokenContract` simultaneously or prior to depositing on `DepositContract`. This prevents malicious actors from stealing someone else's publicly published deposit and using it to mint tokens they didn't pay for. The process of minting and depositing is detailed as below:

2a. **Alice** wishes to exchange `X` ETC for TETC tokens to be used on the ETH main chain. To do so, she mints `X` `TETC-A` in `TokenContract` (on the ETH chain). Note that `TETC-A` is an ERC721 token that has a unique `tokenId` and cannot be split.

2b. **Alice** deposits `X` ETC in `DepositContract` (on the ETC chain) claiming her mint. 

## Transferring, Co-signing, and Chain of Custody

![](https://cdn-images-1.medium.com/max/1200/1*G0JkbxZXvSsDIlFlLDet8w.png)

1. **Alice** puts in a request to `TokenContract` to transfer her `TETC-A` token to **Bob**, with `declaredNonce` = 1. If her transfer is approved, the `transferNonce` of `TETC-A` will be updated from 0 to 1.  A token's `transferNonce` begins at 0 at time of minting, and increases by +1 with each approved transfer, thus establishing chronology in the chain of custody. 
2. **Custodian** approves **Alice**'s transfer request, thus co-signing the transfer of `TETC-A` at `transferNonce` = 1. 
3. Ownership of `TETC-A` is successfully transferred to Bob. `transferNonce` of `TETC-A` is incremented by 1, signifying that `TETC-A` has undergone one transfer.

In the time before **Custodian** approves **Alice**'s transfer request, **Alice** is free to revert the transaction, should she change her mind about transferring her `TETC-A` to **Bob**.

## Withdrawing and Challenging
![](https://cdn-images-1.medium.com/max/1200/1*7pv0kc40H87kPTLmSb1pqQ.png)

A **Withdrawer** can use `TETC-A` to `withdraw()` from `DepositContract` , i.e. withdraw **Alice**'s original ETC deposit. She does this by submitting the following information to `DepositContract`:

`uint256 _tokenId`, the unique tokenId of the `TETC-A` token she is trying to redeem
`bytes32[] _rawTxBundle`,  a bundle containing information about `_withdrawalTx`, 
                                                       `_lastTx`, `_custodianTx`
`bytes32[] _txMsgHashes`, the hashes of the values in `_rawTxBundle`
`uint256 _declaredNonce`, the number of transfers of `TETC-A`

If the withdrawal request is signed by the **Custodian** and the penultimate owner of the token, `DepositContract` opens up a challenge period, during which anyone can submit a proof that the **Withdrawer** is making a fraudulent withdrawal. A successful **Challenger** is rewarded with the **Withdrawer**'s stake.

We can reason about the possible fraudulent withdrawals and their corresponding challenge responses by considering the chronology of the withdrawal's `declaredNonce`:

![Fraudulent withdraw & challenge response](https://cdn-images-1.medium.com/max/1200/1*kAmiqy5NM0JSxcglNFt82A.png)

To initiate a challenge, a **Challenger** is required to stake a value equivalent to 20% of **Withdrawer**'s stake, on top of covering the gas costs borne by the **Withdrawer** in responding to the challenge. This prevents griefing attacks and trigger-happy challenges that slow down the bridge.

## Penalising Custodian's double-sign

At any point, the existence of more than one **Custodian**-signed transaction at the same nonce and for the same token can be submitted to `DepositContract` to prove the **Custodian**'s illegal double-sign. The punishment is as such:

For a token, say `TETC-A`, with corresponding deposit `X`, we slash `TETC-A`'s deposit as well as `X`-equivalent ETC from the **Custodian**'s stake. Here, the **Custodian**'s penalty increases as a linear function of discovered double-signing instances, thus disincentivising him from double-signing.

## Tests
To run truffle tests:
npm i
ganache-cli -p 7545 -s=something
truffle test