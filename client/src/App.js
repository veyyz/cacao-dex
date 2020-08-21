import React, { useEffect, useState } from "react";
import { useWeb3Context } from "web3-react";

import Dex from "./contracts/Dex.json";
import Dai from "./contracts/Dai.json";
import Bat from "./contracts/Bat.json";
import Rep from "./contracts/Rep.json";
import Zrx from "./contracts/Zrx.json";

import "./App.css";

const initialBalances = Object.freeze({
  dai: 0,
  bat: 0,
  rep: 0,
  zrx: 0,
});

const App = () => {
  // contract reference and state
  const [dex, setDex] = useState(undefined);
  const [approvedTickers, setApprovedTickers] = useState([]);
  const [currTicker, setCurrTicker] = useState(undefined);
  // order book
  const [currSide, setCurrSide] = useState("Limit");
  const [currBuys, setCurrBuys] = useState([]);
  const [currSells, setCurrSells] = useState([]);

  const [localBalances, setLocalBalances] = useState({ ...initialBalances });
  const [dexBalances, setDexBalances] = useState({ ...initialBalances });

  // token contracts
  const [dai, setDai] = useState(undefined);
  const [bat, setBat] = useState(undefined);
  const [rep, setRep] = useState(undefined);
  const [zrx, setZrx] = useState(undefined);

  const context = useWeb3Context();
  const {
    account,
    library,
    networkId,
    setFirstValidConnector,
    error,
  } = context;

  useEffect(() => {
    setFirstValidConnector(["MetaMask", "Infura"]);
  }, []);

  useEffect(() => {
    const LoadContracts = async () => {
      if (
        error &&
        (error.code === "UNSUPPORTED_NETWORK" ||
          error.code === "ALL_CONNECTORS_INVALID")
      ) {
        return (
          <div className="App">
            Infura service unavailable. Please connect an injected wallet
            provider such as MetaMask
          </div>
        );
      }

      if (!networkId) return null;

      try {
        // context.networkId is actually the chainId
        // so need to get networkId from library
        const netId = await library.eth.net.getId();
        const deployedDex = Dex.networks[netId];
        const deployedDai = Dai.networks[netId];
        const deployedBat = Bat.networks[netId];
        const deployedRep = Rep.networks[netId];
        const deployedZrx = Zrx.networks[netId];

        // instantiate contract refs
        const contractDex = new library.eth.Contract(
          Dex.abi,
          deployedDex && deployedDex.address
        );
        setDex(contractDex);

        const contractDai = new library.eth.Contract(
          Dai.abi,
          deployedDai && deployedDai.address
        );
        setDai(contractDai);

        const contractBat = new library.eth.Contract(
          Bat.abi,
          deployedBat && deployedBat.address
        );
        setBat(contractBat);

        const contractRep = new library.eth.Contract(
          Rep.abi,
          deployedRep && deployedRep.address
        );
        setRep(contractRep);

        const contractZrx = new library.eth.Contract(
          Zrx.abi,
          deployedZrx && deployedZrx.address
        );
        setZrx(contractZrx);
      } catch (error) {
        alert(`Failed to load contracts. Check console for error details.`);
        console.error(error);
      }
    };
    LoadContracts();
  }, [context]);

  // check dex contract is loaded to get list of approved tokens
  // delay balance updates until all token contracts are loaded
  useEffect(() => {
    const effect = async () => {
      if (dex && dex.options.address != 0) await getApprovedTokens();
      if (dai && bat && rep && zrx) await updateBalances();
    };
    effect();
  }, [library, account, dex, dai, bat, rep, zrx]);

  // update orderbook when currTicker changes
  useEffect(() => {
    if (dex && dex.options.address != 0) updateOrderBook();
  }, [currTicker]);

  // admin only method - run on dex initialization only
  async function approveTokens() {
    try {
      await Promise.all(
        dex.methods
          .addToken(library.utils.fromAscii("DAI"), dai.options.address)
          .send({ from: account }),
        dex.methods
          .addToken(library.utils.fromAscii("BAT"), bat.options.address)
          .send({ from: account }),
        dex.methods
          .addToken(library.utils.fromAscii("REP"), rep.options.address)
          .send({ from: account }),
        dex.methods
          .addToken(library.utils.fromAscii("ZRX"), zrx.options.address)
          .send({ from: account })
      );
    } catch (e) {
      console.log("ignore: ", e.message);
    }
  }

  // called on app initialization to get approved trading pairs and set current
  async function getApprovedTokens() {
    const _approvedTickers = [];
    const _tickers = await dex.methods.getTokenList().call();
    // console.log(_tickers);
    _tickers.map((_ticker) =>
      _approvedTickers.push(
        library.utils.toAscii(_ticker[0]).replace(/\u0000/g, "")
      )
    );
    setApprovedTickers([..._approvedTickers]);
    setCurrTicker(_approvedTickers[0]);
  }

  async function updateBalances() {
    let _balances = { ...initialBalances };
    let _dexBalances = { ...initialBalances };
    try {
      // set wallet balances
      _balances.dai = (await dai.methods.balanceOf(account).call()).toString();
      _balances.bat = (await bat.methods.balanceOf(account).call()).toString();
      _balances.rep = (await rep.methods.balanceOf(account).call()).toString();
      _balances.zrx = (await zrx.methods.balanceOf(account).call()).toString();

      // set dex balances
      _dexBalances.dai = (
        await dex.methods
          .balances(account, library.utils.fromAscii("DAI"))
          .call()
      ).toString();
      _dexBalances.bat = (
        await dex.methods
          .balances(account, library.utils.fromAscii("BAT"))
          .call()
      ).toString();
      _dexBalances.rep = (
        await dex.methods
          .balances(account, library.utils.fromAscii("REP"))
          .call()
      ).toString();
      _dexBalances.zrx = (
        await dex.methods
          .balances(account, library.utils.fromAscii("ZRX"))
          .call()
      ).toString();
    } catch (e) {
      console.log(e.message);
    }
    setLocalBalances({ ..._balances });
    setDexBalances({ ..._dexBalances });
  }

  // fund local wallet with 1000 tokens from token faucet and update balances
  async function fundWallet(_ticker, e) {
    e.preventDefault();
    switch (_ticker) {
      case "dai":
        // console.log(dai.options.address);
        await dai.methods.faucet(account, 1000).send({ from: account });
        break;
      case "bat":
        await bat.methods.faucet(account, 1000).send({ from: account });
        break;
      case "rep":
        await rep.methods.faucet(account, 1000).send({ from: account });
        break;
      case "zrx":
        await zrx.methods.faucet(account, 1000).send({ from: account });
        break;
      default:
        break;
    }
    updateBalances();
  }

  // approve dex contract to deposit token balance to itself and update balances
  async function approveTransfer(_ticker, e) {
    e.preventDefault();
    switch (_ticker) {
      case "dai":
        await dai.methods
          .approve(dex.options.address, localBalances.dai)
          .send({ from: account });
        break;
      case "bat":
        await bat.methods
          .approve(dex.options.address, localBalances.bat)
          .send({ from: account });
        break;
      case "rep":
        await rep.methods
          .approve(dex.options.address, localBalances.rep)
          .send({ from: account });
        break;
      case "zrx":
        await zrx.methods
          .approve(dex.options.address, localBalances.zrx)
          .send({ from: account });
        break;
      default:
        break;
    }
    updateBalances();
  }

  // initiate dex transfer of local funds to dex smart contract and update balances
  async function depositTokens(_ticker, e) {
    e.preventDefault();
    switch (_ticker) {
      case "dai":
        await dex.methods
          .deposit(localBalances.dai, library.utils.fromAscii("DAI"))
          .send({ from: account });
        break;
      case "bat":
        await dex.methods
          .deposit(localBalances.bat, library.utils.fromAscii("BAT"))
          .send({ from: account });
        break;
      case "rep":
        await dex.methods
          .deposit(localBalances.rep, library.utils.fromAscii("REP"))
          .send({ from: account });
        break;
      case "zrx":
        await dex.methods
          .deposit(localBalances.zrx, library.utils.fromAscii("ZRX"))
          .send({ from: account });
        break;
      default:
        break;
    }
    updateBalances();
  }

  // initiate withdraw of dex funds to local wallet and update balances
  async function withdrawTokens(_ticker, e) {
    e.preventDefault();
    switch (_ticker) {
      case "dai":
        await dex.methods
          .withdraw(dexBalances.dai, library.utils.fromAscii("DAI"))
          .send({ from: account });
        break;
      case "bat":
        await dex.methods
          .withdraw(dexBalances.bat, library.utils.fromAscii("BAT"))
          .send({ from: account });
        break;
      case "rep":
        await dex.methods
          .withdraw(dexBalances.rep, library.utils.fromAscii("REP"))
          .send({ from: account });
        break;
      case "zrx":
        await dex.methods
          .withdraw(dexBalances.zrx, library.utils.fromAscii("ZRX"))
          .send({ from: account });
        break;
      default:
        break;
    }
    updateBalances();
  }

  // create limit order on order book
  async function createLimitOrder(e) {
    e.preventDefault();
    const side = e.target.elements[0].value;
    const amount = e.target.elements[1].value;
    const price = e.target.elements[2].value;
    await dex.methods
      .createLimitOrder(
        library.utils.fromAscii(currTicker),
        amount,
        price,
        side
      )
      .send({ from: account });

    await updateBalances();
    await updateOrderBook();
  }

  // create market order on order book
  // potentially fulfills a limit order in which case:
  // ---> market order will not show in ui
  // ---> limit order will be removed from ui
  // ---> balances will be updated to reflect transfer
  async function createMarketOrder(e) {
    e.preventDefault();
    const side = e.target.elements[0].value;
    const amount = e.target.elements[1].value;
    await dex.methods
      .createMarketOrder(library.utils.fromAscii(currTicker), amount, side)
      .send({ from: account });

    await updateBalances();
    await updateOrderBook();
  }

  async function updateOrderBook() {
    const _currBuys = await dex.methods
      .getOrders(library.utils.fromAscii(currTicker), 0)
      .call();
    const _currSells = await dex.methods
      .getOrders(library.utils.fromAscii(currTicker), 1)
      .call();
    // console.log("currBuys", _currBuys);
    // console.log("currSells", _currSells);
    setCurrBuys(_currBuys);
    setCurrSells(_currSells);
  }

  return !context ? (
    <div>Loading Web3, accounts, and contract...</div>
  ) : (
    <div className="container">
      <h1 className="text-center" style={{ margin: "10px 0 0 5px" }}>
        Cacao Dex
      </h1>
      {approvedTickers && approvedTickers.length > 0 ? (
        approvedTickers.map((_ticker) => (
          <a
            style={
              currTicker == _ticker
                ? {
                    textDecoration: "underline",
                    fontWeight: "bold",
                    marginLeft: "10px",
                  }
                : { marginLeft: "10px" }
            }
            key={_ticker}
            onClick={() => setCurrTicker(_ticker)}
          >
            {_ticker}
          </a>
        ))
      ) : (
        <div>
          <button
            onClick={approveTokens}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Approve Tokens
          </button>{" "}
          <button
            onClick={getApprovedTokens}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Update List
          </button>
        </div>
      )}
      <p style={{ paddingLeft: "10px" }}>
        <span style={{ fontSize: "larger", fontWeight: "bold" }}>Account:</span>
        {account
          ? `${account.substring(0, 7)}...${account.substring(37, 42)}`
          : null}
      </p>
      <p style={{ paddingLeft: "10px", margin: "0px" }}>
        <span style={{ fontSize: "larger", fontWeight: "bold" }}>
          Balances:
        </span>
        <button
          onClick={updateBalances}
          style={{ border: "1px solid #aaa", borderRadius: "10px" }}
        >
          Update
        </button>
      </p>
      <ul style={{ paddingLeft: "10px" }}>
        <li style={{ listStyle: "none" }}>
          Dai: {localBalances.dai} / {dexBalances.dai}{" "}
          <button
            onClick={(e) => fundWallet("dai", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Fund
          </button>{" "}
          <button
            onClick={(e) => approveTransfer("dai", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Approve
          </button>{" "}
          <button
            onClick={(e) => depositTokens("dai", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Deposit
          </button>{" "}
          <button
            onClick={(e) => withdrawTokens("dai", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Withdraw
          </button>
        </li>
        <li style={{ listStyle: "none" }}>
          Bat: {localBalances.bat} / {dexBalances.bat}{" "}
          <button
            onClick={(e) => fundWallet("bat", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Fund
          </button>{" "}
          <button
            onClick={(e) => approveTransfer("bat", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Approve
          </button>{" "}
          <button
            onClick={(e) => depositTokens("bat", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Deposit
          </button>{" "}
          <button
            onClick={(e) => withdrawTokens("bat", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Withdraw
          </button>
        </li>
        <li style={{ listStyle: "none" }}>
          Rep: {localBalances.rep} / {dexBalances.rep}{" "}
          <button
            onClick={(e) => fundWallet("rep", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Fund
          </button>{" "}
          <button
            onClick={(e) => approveTransfer("rep", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Approve
          </button>{" "}
          <button
            onClick={(e) => depositTokens("rep", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Deposit
          </button>{" "}
          <button
            onClick={(e) => withdrawTokens("rep", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Withdraw
          </button>
        </li>
        <li style={{ listStyle: "none" }}>
          Zrx: {localBalances.zrx} / {dexBalances.zrx}{" "}
          <button
            onClick={(e) => fundWallet("zrx", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Fund
          </button>{" "}
          <button
            onClick={(e) => approveTransfer("zrx", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Approve
          </button>{" "}
          <button
            onClick={(e) => depositTokens("zrx", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Deposit
          </button>{" "}
          <button
            onClick={(e) => withdrawTokens("zrx", e)}
            style={{ border: "1px solid #aaa", borderRadius: "10px" }}
          >
            Withdraw
          </button>
        </li>
      </ul>

      {currTicker && currTicker != "DAI" ? (
        <div className="row" style={{ paddingLeft: "10px" }}>
          <div className="col-sm-6">
            <span style={{ marginBottom: "0px" }}>
              <span>
                <a
                  onClick={() => setCurrSide("Limit")}
                  style={
                    currSide === "Limit"
                      ? { fontSize: "larger", fontWeight: "bold" }
                      : { color: "#999", textDecoration: "underline" }
                  }
                >
                  Limit Order
                </a>{" "}
                /
                <a
                  onClick={() => setCurrSide("Market")}
                  style={
                    currSide === "Limit"
                      ? { color: "#999", textDecoration: "underline" }
                      : { fontSize: "larger", fontWeight: "bold" }
                  }
                >
                  Market Order
                </a>
              </span>
            </span>{" "}
            <form
              onSubmit={(e) =>
                currSide === "Limit"
                  ? createLimitOrder(e)
                  : createMarketOrder(e)
              }
            >
              <div className="form-group">
                <select id="limit-side">
                  <option value="0">BUY</option>
                  <option value="1">SELL</option>
                </select>
              </div>
              <div className="form-group">
                <input
                  id="limit-amount"
                  placeholder="Amount:"
                  type="number"
                  className="form-control"
                  style={{ border: "1px solid #aaa" }}
                />
              </div>
              <div
                className="form-group"
                style={
                  currSide === "Limit"
                    ? { display: "block" }
                    : { display: "none" }
                }
              >
                <input
                  id="limit-price"
                  placeholder="Price:"
                  type="number"
                  className="form-control"
                  style={{ border: "1px solid #aaa" }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ border: "1px solid #aaa", borderRadius: "10px" }}
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {currTicker && currTicker != "DAI" ? (
        <div style={{ marginTop: "1em", paddingLeft: "10px" }}>
          <span style={{ fontSize: "larger", fontWeight: "bold" }}>
            Order Book{" "}
            <button
              onClick={updateOrderBook}
              style={{ border: "1px solid #aaa", borderRadius: "10px" }}
            >
              Update
            </button>
          </span>
          <div
            className="row"
            style={{ display: "flex", justifyContent: "space-around" }}
          >
            <div
              className="col-sm-6"
              style={{
                display: "flex",
                flexFlow: "column nowrap",
                justifyContent: "start",
                width: "100%",
              }}
            >
              <span style={{ fontSize: "larger", paddingBottom: "5px" }}>
                Buy Side
              </span>
              {currBuys && currBuys.length > 0
                ? currBuys.map((order) =>
                    order.amount - order.filled > 0 ? (
                      <div key={order.date} style={{ fontSize: "smaller" }}>
                        {order.amount - order.filled}
                        {currTicker} @ {order.price}DAI
                      </div>
                    ) : null
                  )
                : null}
            </div>
            <div
              className="col-sm-6"
              style={{
                display: "flex",
                flexFlow: "column nowrap",
                justifyContent: "start",
                width: "100%",
              }}
            >
              <span style={{ fontSize: "larger", paddingBottom: "5px" }}>
                Sell Side
              </span>
              {currSells && currSells.length > 0
                ? currSells.map((order) =>
                    order.amount - order.filled > 0 ? (
                      <div key={order.date} style={{ fontSize: "smaller" }}>
                        {order.amount - order.filled}
                        {currTicker} @ {order.price}DAI
                      </div>
                    ) : null
                  )
                : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default App;
