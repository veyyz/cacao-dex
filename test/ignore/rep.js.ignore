const { expectRevert } = require("@openzeppelin/test-helpers");

const Rep = artifacts.require("mocks/Rep.sol");

contract("Rep", async (accounts) => {
  let rep;

  beforeEach(async () => {
    rep = await Rep.deployed();
  });

  it("should deploy to the network and have an address", async () => {
    assert(
      web3.utils.isAddress(rep.address),
      "Contract does not have a valid address"
    );
  });

  it("should return token name, symbol, and decimals", async () => {
    const name = await rep.name();
    const symbol = await rep.symbol();
    const decimals = await rep.decimals();

    assert(name === "Augur Token", "Name not set properly");
    assert(symbol === "REP", "Symbol not set properly");
    assert(decimals == 18, "Decimals not set properly");
  });

  it("should mint new tokens and send to a given address", async () => {
    await rep.faucet(accounts[0], "100000");
    const balance = await rep.balanceOf(accounts[0]);
    // returns BN {
    //   negative: 0,
    //   words: [ 100000, <1 empty item> ],
    //   length: 1,
    //   red: null
    // }
    assert(balance.toString() === "100000");
  });

  it("should allow an account to transfer its balance to another account", async () => {
    const _balance0 = await rep.balanceOf(accounts[0]);
    const _balance1 = await rep.balanceOf(accounts[1]);

    await rep.transfer(accounts[1], _balance0.toString(), {
      from: accounts[0],
    });

    const balance0 = await rep.balanceOf(accounts[0]);
    const balance1 = await rep.balanceOf(accounts[1]);

    // console.log("_balance0", _balance0.toString());
    // console.log("_balance1", _balance1.toString());
    // console.log("balance0", balance0.toString());
    // console.log("balance1", balance1.toString());

    assert(balance1.toString() === _balance0.toString());
  });

  it("should allow an account to approve another account to spend its balance", async () => {
    const _balance0 = await rep.balanceOf(accounts[0]);
    const _balance1 = await rep.balanceOf(accounts[1]);

    await rep.approve(accounts[0], _balance1.toString(), { from: accounts[1] });
    await rep.transferFrom(accounts[1], accounts[0], _balance1.toString(), {
      from: accounts[0],
    });

    const balance0 = await rep.balanceOf(accounts[0]);
    const balance1 = await rep.balanceOf(accounts[1]);

    // console.log("_balance0", _balance0.toString());
    // console.log("_balance1", _balance1.toString());
    // console.log("balance0", balance0.toString());
    // console.log("balance1", balance1.toString());

    assert(_balance1.toString() === balance0.toString());
  });

  it("should NOT allow an account to spend another accounts balance without approval", async () => {
    const _balance0 = await rep.balanceOf(accounts[0]);
    const _balance1 = await rep.balanceOf(accounts[1]);

    await expectRevert(
      rep.transferFrom(accounts[0], accounts[1], _balance0.toString(), {
        from: accounts[1],
      }),
      "transfer amount exceeds allowance"
    );

    const balance0 = await rep.balanceOf(accounts[0]);
    const balance1 = await rep.balanceOf(accounts[1]);

    // console.log("_balance0", _balance0.toString());
    // console.log("_balance1", _balance1.toString());
    // console.log("balance0", balance0.toString());
    // console.log("balance1", balance1.toString());

    assert(_balance0.toString() === balance0.toString());
  });
});
