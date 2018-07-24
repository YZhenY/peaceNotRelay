#!/bin/bash

echo Setting up....
ganache-cli -p 7545 > /dev/null &
sleep 5
NETWORK=DEV1 truffle migrate --network development1 