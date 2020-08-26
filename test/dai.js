const { expectRevert } = require("@openzeppelin/test-helpers");

const Dai = artifacts.require("mocks/Dai.sol");

contract("Dai", async (accounts) => {
  let dai;

  beforeEach(async () => {
    dai = await Dai.deployed();
  });

  it("should deploy to the network and have an address", async () => {
    assert(
      web3.utils.isAddress(dai.address),
      "Contract does not have a valid address"
    );
  });

  it("should return token name, symbol, and decimals", async () => {
    const name = await dai.name();
    const symbol = await dai.symbol();
    const decimals = await dai.decimals();

    assert(name === "Dai Stablecoin", "Name not set properly");
    assert(symbol === "DAI", "Symbol not set properly");
    assert(decimals == 18, "Decimals not set properly");
  });

  it("should mint new tokens and send to a given address", async () => {
    await dai.faucet(accounts[0], "100000");
    const balance = await dai.balanceOf(accounts[0]);
    // returns BN {
    //   negative: 0,
    //   words: [ 100000, <1 empty item> ],
    //   length: 1,
    //   red: null
    // }
    assert(balance.toString() === "100000");
  });

  it("should allow an account to transfer its balance to another account", async () => {
    const _balance0 = await dai.balanceOf(accounts[0]);
    const _balance1 = await dai.balanceOf(accounts[1]);

    await dai.transfer(accounts[1], _balance0.toString(), {
      from: accounts[0],
    });

    const balance0 = await dai.balanceOf(accounts[0]);
    const balance1 = await dai.balanceOf(accounts[1]);

    // console.log("_balance0", _balance0.toString());
    // console.log("_balance1", _balance1.toString());
    // console.log("balance0", balance0.toString());
    // console.log("balance1", balance1.toString());

    assert(balance1.toString() === _balance0.toString());
  });

  it("should allow an account to approve another account to spend its balance", async () => {
    const _balance0 = await dai.balanceOf(accounts[0]);
    const _balance1 = await dai.balanceOf(accounts[1]);

    await dai.approve(accounts[0], _balance1.toString(), { from: accounts[1] });
    await dai.transferFrom(accounts[1], accounts[0], _balance1.toString(), {
      from: accounts[0],
    });

    const balance0 = await dai.balanceOf(accounts[0]);
    const balance1 = await dai.balanceOf(accounts[1]);

    // console.log("_balance0", _balance0.toString());
    // console.log("_balance1", _balance1.toString());
    // console.log("balance0", balance0.toString());
    // console.log("balance1", balance1.toString());

    assert(_balance1.toString() === balance0.toString());
  });

  it("should NOT allow an account to spend another accounts balance without approval", async () => {
    const _balance0 = await dai.balanceOf(accounts[0]);
    const _balance1 = await dai.balanceOf(accounts[1]);

    await expectRevert(
      dai.transferFrom(accounts[0], accounts[1], _balance0.toString(), {
        from: accounts[1],
      }),
      "transfer amount exceeds allowance"
    );

    const balance0 = await dai.balanceOf(accounts[0]);
    const balance1 = await dai.balanceOf(accounts[1]);

    // console.log("_balance0", _balance0.toString());
    // console.log("_balance1", _balance1.toString());
    // console.log("balance0", balance0.toString());
    // console.log("balance1", balance1.toString());

    assert(_balance0.toString() === balance0.toString());
  });
});
