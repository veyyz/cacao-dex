pragma solidity >=0.6.3 <0.7.0;

// OpenZeppellin interface to interact with external ERC20 token contracts
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract Dex {
    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }
    // collection of all tokens approved to be traded on Dex indexed by bytes32 ticker symbol
    mapping(bytes32 => Token) public tokens;
    // list of bytes32 ticker symbols to iterate through the tokens collection
    bytes32[] public tickers;
    // mapping to represent users wallets and store token balances
    mapping(address => mapping(bytes32 => uint256)) public balances;
    // administrative account
    address public admin;

    // constructor
    constructor() public {
        admin = msg.sender;
    }

    // method to add/approve tokens to be traded on Dex
    function addToken(bytes32 _ticker, address _tokenAddress)
        external
        onlyAdmin()
    {
        tokens[_ticker] = Token(_ticker, _tokenAddress);
        tickers.push(_ticker);
    }

    // access control modifier for admin only functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
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
        balances[msg.sender][_ticker] += _amount;
    }

    // allow users to withdraw funds from their wallet on the Dex
    function withdraw(uint256 _amount, bytes32 _ticker)
        external
        tokenExists(_ticker)
    {
        require(_amount <= balances[msg.sender][_ticker], "insufficient funds");
        balances[msg.sender][_ticker] -= _amount;
        IERC20(tokens[_ticker].tokenAddress).transfer(msg.sender, _amount);
    }

    // modifier that validates trading of approved tokens
    modifier tokenExists(bytes32 _ticker) {
        require(
            tokens[_ticker].tokenAddress != address(0),
            "token not approved for trading"
        );
        _;
    }
    // enum to differentiate BUY and SELL Limit Orders
    enum Side {BUY, SELL}
    // struct to define the fields of a Limit Order
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
    // maping to store all orders indexed by ticker symbols
    // inner mapping is sorted by BUY and SELL (enum cast to uint)
    // Order array is sorted by price/time priority (best prices and oldest first)
    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;
    uint256 public nextOrderId;
    uint256 public nextTradeId;
    bytes32 constant DAI = bytes32("DAI");

    // CREATE LIMIT ORDER
    // BUY (maximum price)
    //SELL (minimum price)
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
                balances[msg.sender][DAI] >= _amount * _price,
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
        uint256 i = orders.length - 1;
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
            i--;
        }

        // increment nextOrderId
        nextOrderId++;
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
        // get o storage pointer to the corresponding orders that can fill the trade
        Order[] storage orders = orderBook[_ticker][uint256(
            _side == Side.BUY ? Side.SELL : Side.BUY
        )];
        uint256 i;
        // track reamining amount of order to be filled (if unable to be filled by a single order)
        uint256 remaining = _amount;

        // order matching
        while (i < orders.length && remaining > 0) {
            // calculate available liquidity
            uint256 available = orders[i].amount - orders[i].filled;
            // calculate amount of liquidity
            uint256 matched = (remaining > available) ? available : remaining;
            // update filled amounts of orders
            orders[i].filled += matched;
            // update remaining
            remaining -= matched;
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
                balances[msg.sender][_ticker] -= matched;
                balances[msg.sender][DAI] += matched * orders[i].price;
                // update buyers balances
                balances[orders[i].trader][_ticker] += matched;
                balances[orders[i].trader][DAI] -= matched * orders[i].price;
            } else {
                require(
                    balances[msg.sender][DAI] >= matched * orders[i].price,
                    "buyer insufficient funds"
                );
                // update buyers balances
                balances[msg.sender][_ticker] += matched;
                balances[msg.sender][DAI] -= matched * orders[i].price;
                // update sellers balances
                balances[orders[i].trader][_ticker] -= matched;
                balances[orders[i].trader][DAI] += matched * orders[i].price;
            }
            // increment iterators
            nextTradeId++;
            i++;
        }

        // prune orderBook of fulfilled orders
        while (i < orders.length && orders[i].filled == orders[i].amount) {
            for (uint256 j = i; j < orders.length - 1; j++) {
                orders[j] = orders[j + 1];
            }
            orders.pop();
            i++;
        }
    }

    modifier tokenNotDai(bytes32 _ticker) {
        require(_ticker != DAI, "DAI not approved for trading");
        _;
    }
}
