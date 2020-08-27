pragma solidity >=0.6.3 <0.7.0;
pragma experimental ABIEncoderV2;

/// OpenZeppellin library to prevent buffer over/underruns
import "@openzeppelin/contracts/math/SafeMath.sol";

/** @title Proxy Contract Cacao/io Decentralized Exchange */
contract Proxy {
    using SafeMath for uint256;

    /// NOTE: It's EXTREMELY IMPORTANT to keep `delegate` and `admin` as the first two variables
    /// declared in the contract. Declaring any new variables before or between the two will cause
    /// the contract's memory layout to lose sync with the proxy contract and cause SERIOUS PROBLEMS.

    /** DO NOT DECLARE ANY NEW VARIABLES HERE ********************************************************/

    /// @dev \var placeholder to keep memory layout in sync with the proxy contract
    address public delegate;

    /** DO NOT DECLARE ANY NEW VARIABLES HERE ********************************************************/

    /// @dev \var administrative account
    /// \fn By default Solidity exposes public getter function with the same name as public variables
    address public admin;

    /** DO NOT DECLARE ANY NEW VARIABLES HERE (JUST TO BE CAREFUL) ***********************************/

    /// @dev Constructor that initializes admin to the creator of the contract
    constructor() public {
        admin = msg.sender;
    }

    /** OK TO START DECLARING NEW VARIABLES AFTER THIS COMMENT ***************************************/

    function upgradeDelegate(address newDelegateAddress) public {
        require(msg.sender == admin);
        uint256 size;
        assembly {
            size := extcodesize(newDelegateAddress)
        }
        require(size > 0, "No contract found at provided address.");
        delegate = newDelegateAddress;
    }

    fallback() external payable {
        address _target = delegate;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
}
