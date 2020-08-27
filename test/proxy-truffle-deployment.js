const { expectRevert } = require("@openzeppelin/test-helpers");

const Proxy = artifacts.require("Proxy.sol");
const Delegate = artifacts.require("Dex.sol");
const Dai = artifacts.require("mocks/Dai.sol");
const Bat = artifacts.require("mocks/Bat.sol");
const Rep = artifacts.require("mocks/Rep.sol");
const Zrx = artifacts.require("mocks/Zrx.sol");

// 1.1 Store ticker symbols as bytes32 for passing as arguments
const [DAI, BAT, REP, ZRX] = ["DAI", "BAT", "REP", "ZRX"].map((_symbol) =>
  web3.utils.fromAscii(_symbol)
);

const seedTraderWallets = async (trader, token, dex) => {
  await token.faucet(trader, 100000);
  await token.approve(dex.address, 100000, { from: trader });
};

contract("Dex (Proxied)", async (accounts) => {
  let proxy, delegate, dex, dai, bat, rep, zrx;

  // before(() => {
  //   console.log(
  //     "NOTE: Tests assume that contract deployment and initialization were handled successfully in `2_deploy_contracts.js`. When writing future tests keep in mind that they do not run in cleanroom/isolation so wallet balances will reflect the actions taken in previous tests."
  //   );
  // });

  beforeEach(async () => {
    delegate = await Delegate.deployed(); /// get deployed instance of delegate contract (Dex.sol)
    proxy = await Proxy.deployed(); /// create a new proxy instance
    // await proxy.upgradeDelegate(delegate.address); /// initialize proxy to delegateCalls to delegate contract (Dex.sol)
    dex = await Delegate.at(proxy.address); /// create a refernce to delegate contract using the proxy's address

    /// get deployed instances of mock ERC20 contracts
    [dai, bat, rep, zrx] = await Promise.all([
      Dai.deployed(),
      Bat.deployed(),
      Rep.deployed(),
      Zrx.deployed(),
    ]);
  });

  it("should deploy to the network and have an address", async () => {
    assert(
      web3.utils.isAddress(proxy.address),
      "Contract does not have a valid address"
    );
    assert(
      web3.utils.isAddress(delegate.address),
      "Contract does not have a valid address"
    );
  });

  it("should update the delegate contract address", async () => {
    const _delegate = await proxy.delegate();
    assert(_delegate === delegate.address, "Delegate not set");
  });

  it("should approve tokens for trading", async () => {
    const tokens = await dex.getTokenList();
    assert(
      tokens.length == 4,
      `Expected tokens.length == 4 and got tokens.length == ${tokens.length}`
    );
  });

  it("should accept deposit of approved ERC20 tokens", async () => {
    await Promise.all([
      seedTraderWallets(accounts[0], dai, dex),
      seedTraderWallets(accounts[1], bat, dex),
      seedTraderWallets(accounts[2], rep, dex),
      seedTraderWallets(accounts[3], zrx, dex),
    ]);

    await Promise.all([
      dex.deposit(100000, DAI, { from: accounts[0] }),
      dex.deposit(100000, BAT, { from: accounts[1] }),
      dex.deposit(100000, REP, { from: accounts[2] }),
      dex.deposit(100000, ZRX, { from: accounts[3] }),
    ]);

    const balances = await Promise.all([
      dex.balances(accounts[0], DAI),
      dex.balances(accounts[1], BAT),
      dex.balances(accounts[2], REP),
      dex.balances(accounts[3], ZRX),
    ]);

    balances.map((balance, index) =>
      assert(
        balance.toString() === "100000",
        `Unexpected result: balances${index} == ${balance}`
      )
    );
  });

  // 8.2 Should not deposit tokens that are not approved for trading on dEx.
  it("should NOT accept deposit of UN-approved ERC20 tokens", async () => {
    await expectRevert(
      dex.deposit(100000, web3.utils.fromAscii("DOES-NOT-EXIST-TOKEN"), {
        from: accounts[0],
      }),
      "token not approved for trading"
    );
  });

  // 8.3 Should not deposit tokens if account has insufficient funds.
  it("should NOT accept deposit if insufficient funds", async () => {
    await expectRevert(
      dex.deposit(100001, DAI, { from: accounts[0] }),
      "ERC20: transfer amount exceeds balance"
    );
  });

  // 9. Withdrawl
  // 9.1 Should withdraw tokens.
  it("should withdraw tokens for an account with sufficient balance", async () => {
    await dex.withdraw(100000, DAI, { from: accounts[0] });
    const afterWithdrawBalance = await dai.balanceOf(accounts[0]);
    assert(afterWithdrawBalance.toString() === "100000");
  });

  // 9.2 Should not withdraw tokens if insufficient funds.
  it("should NOT withdraw tokens for an account with insufficient balance", async () => {
    // withdraw tokens but expect revert because none were deposited
    await expectRevert(
      dex.withdraw(1, DAI, { from: accounts[0] }),
      "insufficient funds"
    );

    // reseed dex wallet for remaining tests
    await dai.approve(dex.address, 100000, { from: accounts[0] });
    dex.deposit(100000, DAI, { from: accounts[0] });
    const balance = await dex.balances(accounts[0], DAI);
    assert(
      balance.toString() === "100000",
      `Unexpected result: dex.balances(accounts[0]) == ${balance}`
    );
  });

  // Create Limit Order Tests
  // 10.1 Should successfully create a limit order given a valid:
  //      ticker symbol, amount, and account with sufficient funds.
  it("should create a limit order for an approved ticker symbol for an account with sufficient funds", async () => {
    const beforeOrderId = await dex.nextOrderId();
    const beforeOrders = await dex.getOrders(BAT, 1);
    await dex.createLimitOrder(BAT, 1, 1, 1, { from: accounts[1] });
    const afterOrderId = await dex.nextOrderId();
    const afterOrders = await dex.getOrders(BAT, 1);

    assert(afterOrderId > beforeOrderId);
    assert(afterOrders.length > beforeOrders.length);
  });
  // 10.2 Should not create a limit order for a non-approved token.
  it("should NOT create a limit order for an un-approved ticker symbol", async () => {
    await expectRevert(
      dex.createLimitOrder(
        web3.utils.fromAscii("DOES-NOT-EXIST-TOKEN"),
        1,
        1,
        1,
        { from: accounts[0] }
      ),
      "token not approved for trading"
    );
  });
  // 10.3 Should not create a limit order to BUY or SELL Dai token.
  it("should NOT create a limit order for DAI token", async () => {
    await expectRevert(
      dex.createLimitOrder(DAI, 1, 1, 1, { from: accounts[0] }),
      "DAI not approved for trading"
    );
  });
  // 10.4 Should not create a limit order if payment token balance too low.
  it("should NOT create a SELL limit order if insufficient token balance", async () => {
    await expectRevert(
      dex.createLimitOrder(BAT, 100001, 1, 1, { from: accounts[1] }),
      "insufficient funds"
    );
  });
  // 10.5 Should not create a limit order if Dai token balance too low.
  it("should NOT create a BUY limit order if insufficient DAI balance", async () => {
    await expectRevert(
      dex.createLimitOrder(BAT, 100001, 1, 0, { from: accounts[0] }),
      "insufficient DAI balance"
    );
  });

  // Create Market Order Tests
  // 11.1 Should create a market order & match against existing limit order.
  it("Should create a market order & match against existing limit order", async () => {
    // Step executed in 10.1
    // await dex.createLimitOrder(BAT, 1, 1, 1, { from: accounts[1] });
    await dex.createMarketOrder(BAT, 1, 0, { from: accounts[0] });

    const daiTrader0 = await dex.balances(accounts[0], DAI);
    const batTrader0 = await dex.balances(accounts[0], BAT);
    const daiTrader1 = await dex.balances(accounts[1], DAI);
    const batTrader1 = await dex.balances(accounts[1], BAT);

    assert(daiTrader0.toString() === "99999");
    assert(batTrader0.toString() === "1");
    assert(daiTrader1.toString() === "1");
    assert(batTrader1.toString() === "99999");
  });

  // 11.2 Should not create market order if token does not exist.
  it("Should NOT create market order if token does not exist", async () => {
    await expectRevert(
      dex.createMarketOrder(
        web3.utils.fromAscii("DOES-NOT-EXIST-TOKEN"),
        1,
        0,
        { from: accounts[0] }
      ),
      "token not approved for trading"
    );
  });
  // 11.3 Should not create market order to buy or sell DAI.
  it("Should NOT create market order to buy or sell DAI", async () => {
    await expectRevert(
      dex.createMarketOrder(DAI, 1, 0, { from: accounts[0] }),
      "DAI not approved for trading"
    );
  });
  // 11.4 Should not create MARKET order if account insufficient DAI.
  // Explicit design decision to reject MARKET orders with insufficient balance
  it("Should not create market order if account insufficient DAI", async () => {
    // create limit order with impossibly high price
    await dex.createLimitOrder(BAT, 1, 100001, 1, { from: accounts[1] });

    // buyer doesn't have balance to fill limit order so is rejected
    await expectRevert(
      dex.createMarketOrder(BAT, 1, 0, { from: accounts[0] }),
      "buyer insufficient funds"
    );
  });

  // 11.5 Should not create market order if account insufficient Token.
  it("Should NOT create market order if account insufficient Token", async () => {
    // trader balance 1 BAT, so MARKET SELL 3 order will get rejected
    await expectRevert(
      dex.createMarketOrder(BAT, 3, 1, { from: accounts[0] }),
      "insufficient funds"
    );
  });

  // 12.0 Should NOT accept deposit if circuit breaker has been activated.
  it("Should NOT accept deposit if circuit breaker has been activated", async () => {
    await dai.faucet(accounts[0], 100000);
    await dai.approve(dex.address, 100000, { from: accounts[0] });
    const _balance0 = await dai.balanceOf(accounts[0]);

    await dex.toggleCircuitBreaker();
    await expectRevert(
      dex.deposit(100000, DAI, { from: accounts[0] }),
      "Contract paused."
    );
    // await dex.toggleCircuitBreaker();

    const balance0 = await dai.balanceOf(accounts[0]);

    assert(_balance0.toString() === balance0.toString());
  });
});

/*
const transferAmount = web3.utils
      .toBN(afterRecipientBalance)
      .sub(web3.utils.toBN(prevRecipientBalance))
      .toString();
    assert(
      transferAmount === "10000000000000000" && _sent == true,
      "Transfer not executed."
    );
*/
