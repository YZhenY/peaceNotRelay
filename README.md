# peaceNotRelay

This is a bridge establishing interoperability between Ethereum and Ethereum Classic in a trustless, low-cost way. The one-way bridge architecture consists of five main components, which are simply symmetrically replicated to get a two-way bridge.
1. `DepositContract`. This is a smart contract deployed on the home chain by the `Custodian`. This contract serves the following purposes:
    - locking in deposits in home currency from users who wish to get equivalent tokens on the foreign chain;
    - locking in the `Custodian`'s stake in home currency, and slashing it when the `Custodian` is proven to have misbehaved; and
    - allowing `withdraw`s of home currency to anyone who burned equivalent tokens on the foreign chain.
2. `TokenContract`. This is a smart contract deployed on the foreign chain by the `Custodian`. This contract serves the following purposes:
    - minting equivalent tokens on the foreign chain to match deposits on the home chain; and
    - burning equivalent tokens on the foreign chain to allow for withdraws on the home chain.
3. `Custodian`. This is a trustless signatory of transactions who communicates messages between the two chains. Only messages signed by the `Custodian` can call the `withdraw` function in `DepositContract` and the `mint` function in `TokenContract`. The Custodian must stake deposits on both chains, which will be slashed upon discovery of wrongdoing. The respective Contracts will be capped in proportion to the `Custodian`'s stake (see below).
4. `Monitors`. `Monitors` watch transactions on both chains and report wrongdoing in return for a part of the `Custodian`'s deposit. They can either: 
    - report over-staking or under-staking by the `Custodian` to the Contract on the appropriate chain; or 
    - report false `mint` requests submitted to `TokenContract` (on the foreign chain) to `DepositContract`, which can itself verify the report against local transactions on the home chain.
5. `User`. The `User` deposits currency on the home chain in exchange for equivalent tokens on the foreign chain. They can trade or transfer the tokens just like any other token on the foreign chain. Anyone who owns these tokens can burn them on the `TokenContract` to withdraw the original deposit on the home chain.


Collaborators:
- Akomba Labs (https://akombalabs.com)
- Kyber Network (https://kyber.network/)
- Ethereum Foundation (https://ethereum.org/)
