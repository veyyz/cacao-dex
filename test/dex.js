const { expectRevert } = require("@openzeppelin/test-helpers");

// Our dEx will interact with several tokens already deployed to the network.
// To simulate this we will deploy mock tokens to our network to test our dEx.
// 0. Import our dEx contract
const Dex = artifacts.require("Dex.sol");
// 1. Import our mock token contracts
const Dai = artifacts.require("mocks/Dai.sol");
const Bat = artifacts.require("mocks/Bat.sol");
const Rep = artifacts.require("mocks/Rep.sol");
const Zrx = artifacts.require("mocks/Zrx.sol");

// 1.1 Store ticker symbols as bytes32 for passing as arguments
const [DAI, BAT, REP, ZRX] = ["DAI", "BAT", "REP", "ZRX"].map((_symbol) =>
  web3.utils.fromAscii(_symbol)
);

// 2. Define our test block and hooks
contract("Dex", (accounts) => {
  let dai, bat, rep, zrx;
  // Setup before each test
  // 3. Deploy fresh mock token contracts
  // 4. Deploy a fresh dEx contract
  beforeEach(async () => {
    [dai, bat, rep, zrx, dex] = await Promise.all([
      Dai.new(),
      Bat.new(),
      Rep.new(),
      Zrx.new(),
      Dex.new(),
    ]);

    // 5. Approve mock tokens for trading on Dex
    await Promise.all([
      dex.addToken(DAI, dai.address),
      dex.addToken(BAT, bat.address),
      dex.addToken(REP, rep.address),
      dex.addToken(ZRX, zrx.address),
    ]);

    const seedTraderWallets = async (trader, token) => {
      // 6. Allocate initial balances of ERC20 tokens to 'traders' accounts
      await token.faucet(trader, 100000);
      // 7. Approve Dex contract to transact on behalf of 'traders'
      await token.approve(dex.address, 100000, { from: trader });
    };

    await Promise.all([
      seedTraderWallets(accounts[0], dai),
      seedTraderWallets(accounts[1], bat),
      seedTraderWallets(accounts[2], rep),
      seedTraderWallets(accounts[3], zrx),
    ]);

    // deposit token balances to the dex wallet
    // Test 8.1 verifies the deposit was successful
    await Promise.all([
      dex.deposit(100000, DAI, { from: accounts[0] }),
      dex.deposit(100000, BAT, { from: accounts[1] }),
      dex.deposit(100000, REP, { from: accounts[2] }),
      dex.deposit(100000, ZRX, { from: accounts[3] }),
    ]);
  });

  // Wallet Tests
  // 8. Deposit
  // 8.1 Should deposit tokens that are approved for trading on dEx.
  it("should accept deposit of approved ERC20 tokens", async () => {
    let balances = [];
    try {
      balances = await Promise.all([
        dex.balances(accounts[0], DAI),
        dex.balances(accounts[1], BAT),
        dex.balances(accounts[2], REP),
        dex.balances(accounts[3], ZRX),
      ]);
    } catch (e) {
      console.log(e.message);
      assert(false);
    }

    balances.map((balance) => assert(balance.toString() === "100000"));
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
      dex.withdraw(100001, DAI, { from: accounts[0] }),
      "insufficient funds"
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
    await dex.createLimitOrder(BAT, 1, 1, 1, { from: accounts[1] });
    await dex.createMarketOrder(BAT, 1, 0, { from: accounts[0] });

    const afterOrders = await dex.getOrders(BAT, 1);
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
  it("Should not create market order if token does not exist", async () => {
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
  it("Should not create market order to buy or sell DAI", async () => {
    await expectRevert(
      dex.createMarketOrder(DAI, 1, 0, { from: accounts[0] }),
      "DAI not approved for trading"
    );
  });
  // 11.4 Should not create market order if account insufficient DAI.
  it("Should not create market order if account insufficient DAI", async () => {
    await dex.createLimitOrder(BAT, 1, 100001, 1, { from: accounts[1] });
    await expectRevert(
      dex.createMarketOrder(BAT, 1, 0, { from: accounts[0] }),
      "insufficient funds"
    );
  });
  // 11.5 Should not create market order if account insufficient Token.
  it("Should not create market order if account insufficient Token", async () => {
    await expectRevert(
      dex.createMarketOrder(BAT, 1, 1, { from: accounts[0] }),
      "insufficient funds"
    );
  });
});
