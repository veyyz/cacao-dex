pragma solidity >=0.6.3 <0.7.0;
pragma experimental ABIEncoderV2;

// OpenZeppellin interface to interact with external ERC20 token contracts
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/** @title Cacao/io Decentralized Exchange */
contract Dex {
    using SafeMath for uint256;

    /// @dev \enum to differentiate BUY and SELL Limit Orders
    enum Side {BUY, SELL}

    /// @dev \struct to store symbol and address of approved token
    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }

    /// @dev \struct to store orders in an orderbook.
    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 filled;
        uint256 price;
        uint256 date;
    }

    /// @dev \var Mapping of all tokens approved to be traded on Dex
    /// indexed by bytes32 ticker symbol
    mapping(bytes32 => Token) public tokens;

    /// @dev \var Iterator for `tokens` mapping, bytes32 ticker symbols
    bytes32[] public tickers;

    /// @dev \var User wallets mapping, used to track token balances sent to contract
    mapping(address => mapping(bytes32 => uint256)) public balances;

    /// @dev \var Mapping to store all orders, indexed by ticker symbols
    /// inner mapping is sorted by BUY and SELL (enum cast to uint)
    /// Order array is sorted by price/time priority (best prices and oldest first)
    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;

    /// @dev \var index for next new order
    uint256 public nextOrderId;

    /// @dev \var index  for next new trade
    uint256 public nextTradeId;

    /// @dev \var constant representation of DAI ticker for comparison (optimization)
    bytes32 constant DAI = bytes32("DAI");

    /// @dev \var administrative account
    /// \fn By default Solidity exposes public getter function with the same name as public variables
    address public admin;

    /// @dev access control modifier for admin only functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    /// @dev modifier validates token is approved for trading
    /// @param _ticker Token symbol to be traded
    modifier tokenExists(bytes32 _ticker) {
        require(
            tokens[_ticker].tokenAddress != address(0),
            "token not approved for trading"
        );
        _;
    }

    /// @dev modifier verifies that token to be traded is not DAI
    /// @param _ticker Token symbol to be traded
    modifier tokenNotDai(bytes32 _ticker) {
        require(_ticker != DAI, "DAI not approved for trading");
        _;
    }

    /// @dev Output of order matching process is to create a new trade
    /// @param _tradeId Trade Id
    /// @param _orderId Order Id
    /// @param _ticker Symbol of token being traded
    /// @param _trader1 Trader address
    /// @param _trader2 Trader address
    /// @param _amount Amount of token being traded
    /// @param _price Exchange rate for token (in DAI)
    /// @param _date Time and date of trade
    event NewTrade(
        uint256 _tradeId,
        uint256 _orderId,
        bytes32 indexed _ticker,
        address indexed _trader1,
        address indexed _trader2,
        uint256 _amount,
        uint256 _price,
        uint256 _date
    );

    /// @dev Constructor that initializes admin to the creator of the contract
    constructor() public {
        admin = msg.sender;
    }

    /// @dev Gets the orderbook for display on the frontend
    /// @param _ticker Symbol of token
    /// @param _side BUY or SELL side of the orderbook
    /// @return Array of orders given a ticker symbol and order side for front end
    function getOrders(bytes32 _ticker, Side _side)
        external
        view
        returns (Order[] memory)
    {
        return orderBook[_ticker][uint256(_side)];
    }

    /// @dev Gets approved list of tokens for display on the frontend
    /// @return Array of tokens approved for trading on the dex
    function getTokenList() external view returns (Token[] memory) {
        Token[] memory _tokens = new Token[](tickers.length);
        for (uint256 i = 0; i <= tickers.length - 1; i++) {
            _tokens[i] = Token(
                tokens[tickers[i]].ticker,
                tokens[tickers[i]].tokenAddress
            );
        }
        return _tokens;
    }

    /// @dev Approves a token to be traded on Dex
    /// @param _ticker Symbol of token to be traded
    /// @param _tokenAddress Contract address of token to be traded
    function addToken(bytes32 _ticker, address _tokenAddress)
        external
        onlyAdmin()
    {
        /// require token hasn't already been approved
        /// to-do: check that tokenAddress is a valid contract address
        require(
            tokens[_ticker].tokenAddress == address(0),
            "token already approved for trading"
        );
        tokens[_ticker] = Token(_ticker, _tokenAddress);
        tickers.push(_ticker);
    }

    /// @dev Transfers a user's funds from their local account (wallet) to the Dex
    /// @param _amount Amount to transfer
    /// @param _ticker Symbol of token to transfer
    function deposit(uint256 _amount, bytes32 _ticker)
        external
        tokenExists(_ticker)
    {
        IERC20(tokens[_ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        balances[msg.sender][_ticker] = _amount.add(
            balances[msg.sender][_ticker]
        );
    }

    /// @dev Withdraw user's funds from Dex to their local account (wallet)
    /// @param _amount Amount to transfer
    /// @param _ticker Symbol of token to transfer
    function withdraw(uint256 _amount, bytes32 _ticker)
        external
        tokenExists(_ticker)
    {
        /// require that the amount being withdrawn is <= the user's balance
        require(_amount <= balances[msg.sender][_ticker], "insufficient funds");
        balances[msg.sender][_ticker] = balances[msg.sender][_ticker].sub(
            _amount
        );
        IERC20(tokens[_ticker].tokenAddress).transfer(msg.sender, _amount);
    }

    /// @dev Creates a LIMIT order and adds it to the order book
    /// @param _ticker Symbol of the token being traded
    /// @param _amount Amount of token being traded
    /// @param _price Exchange rate for the token (in DAI)
    /// BUY orders specify a maximum price
    /// SELL order specify a minimum price
    function createLimitOrder(
        bytes32 _ticker,
        uint256 _amount,
        uint256 _price,
        Side _side
    ) external tokenExists(_ticker) tokenNotDai(_ticker) {
        if (_side == Side.SELL) {
            /// if creating a sell order require account has sufficient tokens to sell
            require(
                balances[msg.sender][_ticker] >= _amount,
                "insufficient funds"
            );
            /// subtract token balance prior to order filled
            balances[msg.sender][_ticker] = balances[msg.sender][_ticker].sub(
                _amount
            );
        } else {
            /// (_side == Side.BUY)
            /// if creating a buy order require account has sufficient DAI to fund purchase
            require(
                balances[msg.sender][DAI] >= _amount.mul(_price),
                "insufficient DAI balance"
            );
            /// subtract DAI balance prior to order filled
            balances[msg.sender][DAI] = balances[msg.sender][DAI].sub(
                _amount.mul(_price)
            );
        }

        /// get storage pointer to orderbook and push order onto the end
        Order[] storage orders = orderBook[_ticker][uint256(_side)];
        orders.push(
            Order(
                nextOrderId,
                msg.sender,
                _side,
                _ticker,
                _amount,
                0,
                _price,
                now
            )
        );

        /// bubble sort orders descending for BUY orders and ascending for SELL orders
        uint256 i = orders.length > 0 ? orders.length - 1 : 0;
        while (i > 0) {
            if (_side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break;
            } else if (
                _side == Side.SELL && orders[i - 1].price < orders[i].price
            ) {
                break;
            }

            /// swap position of orders in array if no breaking conditions are met
            Order memory order = orders[i - 1];
            orders[i - 1] = orders[i];
            orders[i] = order;
            i = i.sub(1);
        }

        /// increment nextOrderId
        nextOrderId = nextOrderId.add(1);

        matchOrders(_ticker, _amount, _side, false, _price, i);
    }

    /// @dev Creates a MARKET order and adds it to the order book
    /// @param _ticker Symbol of the token being traded
    /// @param _amount Amount of token being traded
    /// @param _price Exchange rate for the token (in DAI)
    function createMarketOrder(
        bytes32 _ticker,
        uint256 _amount,
        Side _side
    ) external tokenNotDai(_ticker) tokenExists(_ticker) {
        if (_side == Side.SELL) {
            /// if creating a sell order require account has sufficient tokens to sell
            require(
                balances[msg.sender][_ticker] >= _amount,
                "insufficient funds"
            );
            /// if MARKET BUY order we need to check the price of each SELL order during order matching
            /// to verify the account has sufficient Dai to cover the transaction
        }

        matchOrders(_ticker, _amount, _side, true, 0, 0);
    }

    /// @dev Compares a new order to the order book to find a match to execute against
    /// @param _ticker Symbol of the token being traded
    /// @param _amount Amount of token being traded
    /// @param _side Specifies a BUY or SELL order
    /// @param _isMarket Specifies a MARKET order
    /// @param _price Exchange rate for the token (in DAI)
    /// @param _limitOrderId Specifies Id for the order if it is a LIMIT order
    function matchOrders(
        bytes32 _ticker,
        uint256 _amount,
        Side _side,
        bool _isMarket,
        uint256 _price,
        uint256 _limitOrderId
    ) internal {
        /// get a storage pointer to the corresponding orders that can fill the trade
        Order[] storage orders = orderBook[_ticker][uint256(
            _side == Side.BUY ? Side.SELL : Side.BUY
        )];
        uint256 i;

        /// track reamining amount of order to be filled (if unable to be filled by a single order)
        uint256 remaining = _amount;

        /// iterate through orders
        while (i < orders.length && remaining > 0) {
            /// if LIMIT order, check prices match (this works bcs orderbook is sorted by price)
            /// else order is for best market price and sufficient balance was required in calling function
            if (!_isMarket) {
                if (_side == Side.BUY && orders[i].price > _price) break;
                if (_side == Side.SELL && orders[i].price < _price) break;
            }

            /// calculate available liquidity
            uint256 available = orders[i].amount.sub(orders[i].filled);
            /// calculate amount of liquidity
            uint256 matched = (remaining > available) ? available : remaining;
            /// update filled amounts of orders
            orders[i].filled = orders[i].filled.add(matched);
            /// if filling a limit order update filled amount for limit order
            if (!_isMarket) {
                /// (_price > 0) {
                Order storage otherOrder = orderBook[_ticker][uint256(
                    _side
                )][_limitOrderId];
                otherOrder.filled = otherOrder.filled.add(matched);
            }
            /// update remaining
            remaining = remaining.sub(matched);

            /// emit NewTrade event
            emit NewTrade(
                nextTradeId,
                orders[i].id,
                _ticker,
                orders[i].trader,
                msg.sender,
                matched,
                orders[i].price,
                now
            );

            if (_side == Side.SELL) {
                /// update sellers balances
                if (_isMarket) {
                    /// if MARKET SELL: sender token balance was verified in createMarketOrder()
                    /// deduct token balance from sender's balance
                    balances[msg.sender][_ticker] = balances[msg
                        .sender][_ticker]
                        .sub(matched);
                }

                /// MARKET SELL: add DAI to sender's DAI balance
                balances[msg.sender][DAI] = balances[msg.sender][DAI].add(
                    matched.mul(orders[i].price)
                );

                /// MARKET SELL: add token to buyer's balance
                balances[orders[i].trader][_ticker] = balances[orders[i]
                    .trader][_ticker]
                    .add(matched);

                /// if MARKET SELL: buyer must have created a LIMIT BUY order
                /// limit orders have balance deducted prior to order fulfillment
                /// balances[orders[i].trader][DAI] = balances[orders[i]
                ///      .trader][DAI]
                ///      .sub(matched.mul(orders[i].price));
            } else {
                /// (_side == Side.BUY)
                if (_isMarket) {
                    /// if MARKET BUY: require sender has sufficient DAI balance
                    require(
                        balances[msg.sender][DAI] >=
                            matched.mul(orders[i].price),
                        "buyer insufficient funds"
                    );
                    /// if MARKET BUY: deduct DAI from sender's balance
                    /// limit orders have balance deducted prior to order fulfillment
                    balances[msg.sender][DAI] = balances[msg.sender][DAI].sub(
                        matched.mul(orders[i].price)
                    );
                }

                /// MARKET BUY: add tokens to sender's balance
                balances[msg.sender][_ticker] = balances[msg.sender][_ticker]
                    .add(matched);

                /// if MARKET BUY then seller must have placed a LIMIT SELL order
                /// limit orders have balance deducted prior to order fulfillment
                /// balances[orders[i].trader][_ticker] = balances[orders[i]
                ///     .trader][_ticker]
                ///     .sub(matched);

                /// MARKET Buy: add DAI to seller's balance
                balances[orders[i].trader][DAI] = balances[orders[i]
                    .trader][DAI]
                    .add(matched.mul(orders[i].price));
            }

            /// increment iterators
            nextTradeId = nextTradeId.add(1);
            i = i.add(1);
        }

        i = 0;
        /// prune orderBook of fulfilled orders
        while (i < orders.length && orders[i].filled == orders[i].amount) {
            for (uint256 j = i; j < orders.length - 1; j++) {
                orders[j] = orders[j + 1];
            }
            orders.pop();
            i = i.add(1);
        }
    }
}
