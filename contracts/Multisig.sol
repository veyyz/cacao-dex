pragma solidity >=0.6.0 <0.7.0;


contract Multisig {
    address[] public approvers;
    uint256 public quorum;

    struct Transfer {
        uint256 id;
        uint256 amount;
        address payable recipient;
        uint256 approvals;
        bool sent;
    }

    mapping(uint256 => Transfer) public transfers;
    mapping(address => mapping(uint256 => bool)) public approvals;
    uint256 public nextId;

    // [√] It should create a multisig wallet with a list of approvers
    constructor(uint256 _quorum, address[] memory _approvers) public payable {
        quorum = _quorum;
        approvers = _approvers;
    }

    // [√] It should allow any of the approvers to create a transfer
    // [√] It should NOT allow a non approver to create a transfer
    modifier onlyApprovers() {
        bool isApprover = false;
        for (uint256 i = 0; i < approvers.length; i++) {
            if (msg.sender == approvers[i]) isApprover = true;
        }
        require(
            isApprover,
            "Only approvers allowed to create and approve transfers."
        );
        _;
    }

    function createTransfer(uint256 _amount, address payable _recipient)
        external
        payable
        onlyApprovers()
    {
        transfers[nextId] = (
            Transfer({
                id: nextId,
                amount: _amount,
                recipient: _recipient,
                approvals: 0,
                sent: false
            })
        );
        nextId++;
    }

    // [√] It should allow any of the approvers to approve a transfer
    // [√] It should NOT allow a non-approver to approve a transfer
    // [√] It should NOT attempt to transfer if the contract has insufficient balance
    // [√] It should send the transfer when enough approvers have approved
    // [√] It should NOT send the transfer if it's already been sent
    // [√] It should NOT allow the same account to approve more than once
    function approveTransfer(uint256 _id) external onlyApprovers() {
        require(!transfers[_id].sent, "Transfer already sent.");
        require(
            address(this).balance >= transfers[_id].amount,
            "Insufficient funds"
        );

        require(
            approvals[msg.sender][_id] == false,
            "Sender has already approved."
        );
        approvals[msg.sender][_id] = true;
        transfers[_id].approvals++;

        if (transfers[_id].approvals >= quorum) {
            transfers[_id].sent = true;
            transfers[_id].recipient.transfer(transfers[_id].amount);
        }
    }
}
