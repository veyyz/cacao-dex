pragma solidity >=0.6.3 <0.7.0;
pragma experimental ABIEncoderV2;

// OpenZeppellin interface to interact with external ERC20 token contracts
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract Dex {
    using SafeMath for uint256;
    // enum to differentiate BUY and SELL Limit Orders
    enum Side {BUY, SELL}

    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }

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

    // collection of all tokens approved to be traded on Dex
    // indexed by bytes32 ticker symbol
    mapping(bytes32 => Token) public tokens;

    // list of bytes32 ticker symbols to iterate through the tokens collection
    bytes32[] public tickers;

    // mapping to represent users wallets and store token balances
    mapping(address => mapping(bytes32 => uint256)) public balances;

    // maping to store all orders indexed by ticker symbols
    // inner mapping is sorted by BUY and SELL (enum cast to uint)
    // Order array is sorted by price/time priority (best prices and oldest first)
    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;
    uint256 public nextOrderId;
    uint256 public nextTradeId;

    // constant representation of DAI ticker for comparison (optimization)
    bytes32 constant DAI = bytes32("DAI");

    // administrative account
    address public admin;

    // access control modifier for admin only functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    // modifier that validates trading of approved tokens
    modifier tokenExists(bytes32 _ticker) {
        require(
            tokens[_ticker].tokenAddress != address(0),
            "token not approved for trading"
        );
        _;
    }

    modifier tokenNotDai(bytes32 _ticker) {
        require(_ticker != DAI, "DAI not approved for trading");
        _;
    }

    // CREATE MARKET ORDER
    // output of order matching process is to create a new trade
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

    event DebugStatement(uint256 _value, string _description);

    // constructor
    constructor() public {
        admin = msg.sender;
    }

    // returns array of orders given a ticker symbol and order side for front end
    function getOrders(bytes32 _ticker, Side _side)
        external
        view
        returns (Order[] memory)
    {
        return orderBook[_ticker][uint256(_side)];
    }

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

    // method to add/approve tokens to be traded on Dex
    function addToken(bytes32 _ticker, address _tokenAddress)
        external
        onlyAdmin()
    {
        require(
            tokens[_ticker].tokenAddress == address(0),
            "token already approved for trading"
        );
        tokens[_ticker] = Token(_ticker, _tokenAddress);
        tickers.push(_ticker);
    }

    // allow users to deposit funds to a wallet on the Dex
    function deposit(uint256 _amount, bytes32 _ticker)
        external
        tokenExists(_ticker)
    {
        // transfer traders erc20 tokens to the Dex contract
        IERC20(tokens[_ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        balances[msg.sender][_ticker] = _amount.add(
            balances[msg.sender][_ticker]
        );
    }

    // allow users to withdraw funds from their wallet on the Dex
    function withdraw(uint256 _amount, bytes32 _ticker)
        external
        tokenExists(_ticker)
    {
        require(_amount <= balances[msg.sender][_ticker], "insufficient funds");
        balances[msg.sender][_ticker] = balances[msg.sender][_ticker].sub(
            _amount
        );
        IERC20(tokens[_ticker].tokenAddress).transfer(msg.sender, _amount);
    }

    // CREATE LIMIT ORDER
    // BUY orders specify a maximum price
    // SELL order specify a minimum price
    function createLimitOrder(
        bytes32 _ticker,
        uint256 _amount,
        uint256 _price,
        Side _side
    ) external tokenExists(_ticker) tokenNotDai(_ticker) {
        if (_side == Side.SELL) {
            // if creating a sell order require account has sufficient tokens to sell
            require(
                balances[msg.sender][_ticker] >= _amount,
                "insufficient funds"
            );
        } else {
            // if creating a buy order require account has sufficient DAI to fund purchase
            require(
                balances[msg.sender][DAI] >= _amount.mul(_price),
                "insufficient DAI balance"
            );
        }

        // get storage pointer to orderbook and push order onto the end
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

        // bubble sort orders descending for BUY orders and ascending for SELL orders
        uint256 i = orders.length > 0 ? orders.length - 1 : 0;
        while (i > 0) {
            if (_side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break;
            } else if (
                _side == Side.SELL && orders[i - 1].price < orders[i].price
            ) {
                break;
            }

            // swap position of orders in array if no breaking conditions are met
            Order memory order = orders[i - 1];
            orders[i - 1] = orders[i];
            orders[i] = order;
            i = i.sub(1);
        }

        // increment nextOrderId
        nextOrderId = nextOrderId.add(1);

        matchOrders(_ticker, _amount, _side, _price, i);
    }

    function createMarketOrder(bytes32 _ticker, uint256 _amount, Side _side)
        external
        tokenNotDai(_ticker)
        tokenExists(_ticker)
    {
        if (_side == Side.SELL) {
            // if creating a sell order require account has sufficient tokens to sell
            require(
                balances[msg.sender][_ticker] >= _amount,
                "insufficient funds"
            );
            // if creating a buy order we need to check the price of each SELL order during order matching
            // to verify the account has sufficient Dai to cover the transaction
        }

        matchOrders(_ticker, _amount, _side, 0, 0);
    }

    function matchOrders(
        bytes32 _ticker,
        uint256 _amount,
        Side _side,
        uint256 _price,
        uint256 _limitOrderId
    ) internal {
        // get o storage pointer to the corresponding orders that can fill the trade
        Order[] storage orders = orderBook[_ticker][uint256(
            _side == Side.BUY ? Side.SELL : Side.BUY
        )];
        uint256 i;

        // track reamining amount of order to be filled (if unable to be filled by a single order)
        uint256 remaining = _amount;

        // order matching
        while (i < orders.length && remaining > 0) {
            // if limit order check prices match (this only works bcs orderbook is sorted by price)
            // else order is for best market price and sufficient balance was required in calling function
            if (_price > 0) {
                if (_side == Side.BUY && orders[i].price > _price) break;
                if (_side == Side.SELL && orders[i].price < _price) break;
            }

            // calculate available liquidity
            uint256 available = orders[i].amount.sub(orders[i].filled);
            // calculate amount of liquidity
            uint256 matched = (remaining > available) ? available : remaining;
            // update filled amounts of orders
            orders[i].filled = orders[i].filled.add(matched);
            // if filling a limit order update filled amount for limit order
            if (_price > 0) {
                Order storage otherOrder = orderBook[_ticker][uint256(
                    _side
                )][_limitOrderId];
                otherOrder.filled = otherOrder.filled.add(matched);
            }
            // update remaining
            remaining = remaining.sub(matched);
            // emit NewTrade event
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
            // update trader account balance
            if (_side == Side.SELL) {
                // update sellers balances
                balances[msg.sender][_ticker] = balances[msg.sender][_ticker]
                    .sub(matched);
                balances[msg.sender][DAI] = balances[msg.sender][DAI].add(
                    matched.mul(orders[i].price)
                );
                // update buyers balances
                balances[orders[i].trader][_ticker] = balances[orders[i]
                    .trader][_ticker]
                    .add(matched);
                balances[orders[i].trader][DAI] = balances[orders[i]
                    .trader][DAI]
                    .sub(matched.mul(orders[i].price));
            } else {
                require(
                    balances[msg.sender][DAI] >= matched.mul(orders[i].price),
                    "buyer insufficient funds"
                );
                // update buyers balances
                balances[msg.sender][_ticker] = balances[msg.sender][_ticker]
                    .add(matched);
                balances[msg.sender][DAI] = balances[msg.sender][DAI].sub(
                    matched.mul(orders[i].price)
                );
                // update sellers balances
                balances[orders[i].trader][_ticker] = balances[orders[i]
                    .trader][_ticker]
                    .sub(matched);
                balances[orders[i].trader][DAI] = balances[orders[i]
                    .trader][DAI]
                    .add(matched.mul(orders[i].price));
            }
            // increment iterators
            nextTradeId = nextTradeId.add(1);
            i = i.add(1);
            emit DebugStatement(i, "inside while loop");
        }

        i = 0;
        emit DebugStatement(i, "should == 0");
        // prune orderBook of fulfilled orders
        while (i < orders.length && orders[i].filled == orders[i].amount) {
            for (uint256 j = i; j < orders.length - 1; j++) {
                orders[j] = orders[j + 1];
            }
            orders.pop();
            i = i.add(1);
        }
    }
}
