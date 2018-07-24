module.exports = web3 => {

  var jsonrpc = '2.0'
  var id = 0
  var send = (method, params = []) => web3.currentProvider.send({ id, jsonrpc, method, params });
  var toEthDecimal = (eth) => {
    return eth * 1000000000000000000;
  }

  return {
    send: send,
  
    sendEth:(sender, receiver, amount) => {
      return web3.eth.sendTransaction({from: sender,to:receiver, value:web3.toWei(amount, "ether")})
    },

    timeTravel: async seconds => {
      await send('evm_increaseTime', [seconds]);
      await send('evm_mine');
    },

    toEthDecimal: toEthDecimal,

    adjustForPrecision: (number, precision) => {
      //to cater for precision factor in contract
      var adjustmentFactor = 10 ** (18 - precision - 2);
      return Math.round(number/ adjustmentFactor) * adjustmentFactor;
    },
  }
}

