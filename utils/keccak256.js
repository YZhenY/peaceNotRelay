const Web3 = require('web3');
const web3 = new Web3();
const leftPad = require('./leftpad.js');

module.exports = function() {
  let args = Array.prototype.slice.apply(arguments);
  args = args.map(arg => {
    if (typeof arg === 'string') {
      if (arg.substring(0, 2) === '0x') {
          return arg.slice(2)
      } else {
          return web3.utils.toHex(arg).slice(2)
      }
    }

    if (typeof arg === 'number') {
      return leftPad((arg).toString(16), 64, 0)
    } else {
      return ''
    }
  })

  args = args.join('')

  return web3.utils.sha3(args, { encoding: 'hex' })
}