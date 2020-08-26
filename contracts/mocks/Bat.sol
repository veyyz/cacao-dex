pragma solidity >=0.6.3 <0.7.0;

// OpenZeppellin interface to interact with external ERC20 token contracts
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** @title Mock BAT Contract */
contract Bat is ERC20 {
    /// @dev Initializes ERC20 token contract
    constructor() public ERC20("Basic Attention Token", "BAT") {
        // Number of decimal places the token can be subdivided into
        _setupDecimals(18);
    }

    /// @dev Mints new tokens and sends them to the given address
    /// @param to Address to send newly minted tokens to
    /// @param amount Amount to tokens to create and send
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
