var Proxy = artifacts.require("./Proxy.sol");
var Delegate = artifacts.require("./Dex.sol");
var Dai = artifacts.require("./mocks/Dai.sol");
var Bat = artifacts.require("./mocks/Bat.sol");
var Rep = artifacts.require("./mocks/Rep.sol");
var Zrx = artifacts.require("./mocks/Zrx.sol");

const [DAI, BAT, REP, ZRX] = ["DAI", "BAT", "REP", "ZRX"].map((_symbol) =>
  web3.utils.fromAscii(_symbol)
);

module.exports = async function (deployer, _, accounts) {
  let delegate, proxy, dai, bat, rep, zrx;

  await Promise.all([
    deployer.deploy(Delegate),
    deployer.deploy(Proxy),
    deployer.deploy(Dai),
    deployer.deploy(Bat),
    deployer.deploy(Rep),
    deployer.deploy(Zrx),
  ]);

  [delegate, proxy, dai, bat, rep, zrx] = await Promise.all([
    Delegate.deployed(),
    Proxy.deployed(),
    Dai.deployed(),
    Bat.deployed(),
    Rep.deployed(),
    Zrx.deployed(),
  ]);

  // delegate = await Delegate.deployed(); /// get deployed instance of delegate contract (Dex.sol)
  // proxy = await Proxy.deployed(); /// create a new proxy instance
  await proxy.upgradeDelegate(delegate.address); /// initialize proxy to delegateCalls to delegate contract (Dex.sol)
  const proxyDex = await Delegate.at(proxy.address); /// create a refernce to delegate contract using the proxy's address

  /// initialize dex here
  await Promise.all([
    proxyDex.addToken(BAT, bat.address, { from: accounts[0] }),
    proxyDex.addToken(REP, rep.address, { from: accounts[0] }),
    proxyDex.addToken(ZRX, zrx.address, { from: accounts[0] }),
    proxyDex.addToken(DAI, dai.address, { from: accounts[0] }),
  ]);
};

/*var Multisig = artifacts.require(
  "./Multisig.sol"
);

module.exports = function (deployer) {
  deployer.deploy(
    Multisig,
    3,
    [
      "0x5816bEFF8444e2Ff8d3a4F4605d4BFf5E0F807Ed",
      "0xd560FBA313BfE952B12c809c4fd02cB963700D18",
      "0x9BC2FAC74bEF15BFdE6f9c61017c541CB59B7760",
    ],
    { value: "10000000000000000" }
  );
};*/
