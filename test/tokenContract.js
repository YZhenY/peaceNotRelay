var TokenContract = artifacts.require("TokenContract");



contract('Token Contract Test', async (accounts) => {

  beforeEach(async () => {
    tokenContract = await TokenContract.new(accounts[0]);
  })

  it("should mint()", async() => {
    var result = await tokenContract.mint(10000, accounts[1]);
    assert(result.logs[1].event === "Mint", "should emit event mint");
    console.log(accounts[0],accounts[1],accounts[2])
  })

  it("should transferFrom() and custodianApprove()", async() => {
    var result = await tokenContract.mint(10000, accounts[1]);
    assert(result.logs[1].event === "Mint", "should emit event mint");
    
    var token =  result.logs[0].args._tokenId;
    console.log("TOKEN", token);
    result = await tokenContract.transferFromTokenContract(accounts[1], accounts[2], token, {from: accounts[1]});
    assert(result.logs[0].args._tokenId.eq(token), `should token shoudl equal token, ${token} instead ${result.logs[0].args._tokenId}`);
    assert(result.logs[0].event === "TransferRequest", "should emit event TransferRequest");

    result = await tokenContract.custodianApprove(token, {from: accounts[0]});
    result = await tokenContract.ownerOf(token);
    assert(result === accounts[2], `token should have transfered to ${accounts[2]}, instead ${result}`);
  })

})