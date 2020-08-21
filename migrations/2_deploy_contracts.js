var Dex = artifacts.require("./Dex.sol");
var Dai = artifacts.require("./mocks/Dai.sol");
var Bat = artifacts.require("./mocks/Bat.sol");
var Rep = artifacts.require("./mocks/Rep.sol");
var Zrx = artifacts.require("./mocks/Zrx.sol");

module.exports = function (deployer) {
  deployer.deploy(Dex);
  deployer.deploy(Dai);
  deployer.deploy(Bat);
  deployer.deploy(Rep);
  deployer.deploy(Zrx);
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
