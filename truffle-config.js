const path = require("path");
const provider = require("@truffle/hdwallet-provider");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    kovan: {
      provider: () =>
        new provider(
          [
            process.env.address0pk,
            process.env.address1pk,
            process.env.address2pk,
          ],
          "https://kovan.infura.io/v3/7c39de7d94824ae7bd7b45c9f67093bc",
          0,
          3
        ),
      network_id: 42,
    },
    development: {
      // default with truffle unbox is 7545, but we can use develop to test changes, ex. truffle migrate --network develop
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    test: {
      // default with truffle unbox is 7545, but we can use develop to test changes, ex. truffle migrate --network develop
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "0.6.6",
    },
  },
};
