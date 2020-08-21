pragma solidity >=0.6.3 <0.7.0;

// OpenZeppellin interface to interact with external ERC20 token contracts
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract Rep is ERC20 {
    constructor() public ERC20("Augur Token", "REP") {}

    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
