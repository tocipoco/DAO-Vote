// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted DAO Governance Contract
/// @notice A privacy-preserving DAO governance system using FHEVM
/// @dev All voting data is encrypted, only aggregated results are decrypted
contract EncryptedDAO is SepoliaConfig {
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        euint32 encryptedYesVotes; // Encrypted count of yes votes (1)
        euint32 encryptedNoVotes;  // Encrypted count of no votes (0)
        uint256 totalVoters;
    }

    // Member structure
    struct Member {
        bool isMember;
        uint256 joinTime;
    }

    // Mapping: proposalId => Proposal
    mapping(uint256 => Proposal) public proposals;

    // Mapping: proposalId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Mapping: address => Member
    mapping(address => Member) public members;

    // Proposal counter
    uint256 public proposalCounter;

    // Member counter
    uint256 public memberCounter;

    // Minimum voting duration (in seconds)
    uint256 public constant MIN_VOTING_DURATION = 1 days;

    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event ProposalExecuted(uint256 indexed proposalId, bool result);
    event MemberAdded(address indexed member);
    event VoteResultsDecrypted(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes, bool result);

    // Modifiers
    modifier onlyMember() {
        require(members[msg.sender].isMember, "Not a DAO member");
        _;
    }

    modifier validProposal(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCounter, "Invalid proposal ID");
        _;
    }

    /// @notice Initialize the DAO with the deployer as the first member
    constructor() {
        members[msg.sender] = Member({
            isMember: true,
            joinTime: block.timestamp
        });
        memberCounter = 1;
    }

    /// @notice Join the DAO (self-registration)
    /// @notice Anyone can call this function to become a member
    function joinDAO() external {
        require(!members[msg.sender].isMember, "Already a member");
        members[msg.sender] = Member({
            isMember: true,
            joinTime: block.timestamp
        });
        memberCounter++;
        emit MemberAdded(msg.sender);
    }

    /// @notice Add a new member to the DAO (by existing member)
    /// @param newMember The address to add as a member
    function addMember(address newMember) external onlyMember {
        require(!members[newMember].isMember, "Already a member");
        members[newMember] = Member({
            isMember: true,
            joinTime: block.timestamp
        });
        memberCounter++;
        emit MemberAdded(newMember);
    }

    /// @notice Create a new governance proposal
    /// @param description The proposal description
    /// @param votingDuration The duration of the voting period in seconds
    function createProposal(
        string memory description,
        uint256 votingDuration
    ) external onlyMember returns (uint256) {
        require(votingDuration >= MIN_VOTING_DURATION, "Voting duration too short");
        require(bytes(description).length > 0, "Description cannot be empty");

        proposalCounter++;
        uint256 proposalId = proposalCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + votingDuration;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            startTime: startTime,
            endTime: endTime,
            executed: false,
            encryptedYesVotes: FHE.asEuint32(0),
            encryptedNoVotes: FHE.asEuint32(0),
            totalVoters: 0
        });

        emit ProposalCreated(proposalId, msg.sender, description, startTime, endTime);
        return proposalId;
    }

    /// @notice Cast an encrypted vote on a proposal
    /// @param proposalId The ID of the proposal
    /// @param encryptedVote The encrypted vote (externalEuint32): 1 = yes, 0 = no
    /// @param voteProof The proof for the encrypted vote
    function castVote(
        uint256 proposalId,
        externalEuint32 encryptedVote,
        bytes calldata voteProof
    ) external validProposal(proposalId) onlyMember {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");

        // Convert external encrypted vote to internal type
        euint32 vote = FHE.fromExternal(encryptedVote, voteProof);

        // Check if vote is 0 or 1 (binary vote)
        // Note: In production, proper range checks should be implemented
        ebool isYesBool = FHE.eq(vote, FHE.asEuint32(1));
        ebool isNoBool = FHE.eq(vote, FHE.asEuint32(0));
        euint32 isYes = FHE.select(isYesBool, FHE.asEuint32(1), FHE.asEuint32(0));
        euint32 isNo = FHE.select(isNoBool, FHE.asEuint32(1), FHE.asEuint32(0));

        // Add to yes votes if vote == 1
        proposal.encryptedYesVotes = FHE.add(
            proposal.encryptedYesVotes,
            isYes
        );

        // Add to no votes if vote == 0
        proposal.encryptedNoVotes = FHE.add(
            proposal.encryptedNoVotes,
            isNo
        );

        // Update total voters
        proposal.totalVoters++;

        // Mark as voted
        hasVoted[proposalId][msg.sender] = true;

        // Allow decryption by the contract and voter
        FHE.allowThis(proposal.encryptedYesVotes);
        FHE.allow(proposal.encryptedYesVotes, msg.sender);
        FHE.allowThis(proposal.encryptedNoVotes);
        FHE.allow(proposal.encryptedNoVotes, msg.sender);

        emit VoteCast(proposalId, msg.sender);
    }

    /// @notice Get proposal information
    /// @param proposalId The ID of the proposal
    /// @return id The proposal ID
    /// @return proposer The address of the proposer
    /// @return description The proposal description
    /// @return startTime The start time of voting
    /// @return endTime The end time of voting
    /// @return executed Whether the proposal has been executed
    /// @return totalVoters The total number of voters
    function getProposal(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (
            uint256 id,
            address proposer,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            uint256 totalVoters
        )
    {
        Proposal memory proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.totalVoters
        );
    }

    /// @notice Get encrypted vote counts (returns handles for decryption)
    /// @param proposalId The ID of the proposal
    /// @return encryptedYesVotes Handle for encrypted yes votes
    /// @return encryptedNoVotes Handle for encrypted no votes
    function getEncryptedVotes(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (euint32 encryptedYesVotes, euint32 encryptedNoVotes)
    {
        Proposal memory proposal = proposals[proposalId];
        return (proposal.encryptedYesVotes, proposal.encryptedNoVotes);
    }

    /// @notice Grant decryption access for the caller if they are a DAO member
    /// @dev This function authorizes the caller to decrypt the aggregated vote results
    /// @param proposalId The ID of the proposal for which to grant access
    function grantDecryptionAccess(uint256 proposalId)
        external
        validProposal(proposalId)
        onlyMember
    {
        Proposal storage proposal = proposals[proposalId];
        // Allow current caller (a DAO member) to decrypt the two aggregated counters
        FHE.allow(proposal.encryptedYesVotes, msg.sender);
        FHE.allow(proposal.encryptedNoVotes, msg.sender);
    }

    /// @notice Check if voting period has ended
    /// @param proposalId The ID of the proposal
    /// @return Whether voting has ended
    function isVotingEnded(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (bool)
    {
        return block.timestamp > proposals[proposalId].endTime;
    }

    /// @notice Check if a user has voted on a proposal
    /// @param proposalId The ID of the proposal
    /// @param voter The address of the voter
    /// @return Whether the voter has voted
    function checkHasVoted(uint256 proposalId, address voter)
        external
        view
        validProposal(proposalId)
        returns (bool)
    {
        return hasVoted[proposalId][voter];
    }

    /// @notice Check if an address is a member
    /// @param addr The address to check
    /// @return Whether the address is a member
    function isMember(address addr) external view returns (bool) {
        return members[addr].isMember;
    }

    /// @notice Get the total number of proposals
    /// @return The total number of proposals
    function getProposalCount() external view returns (uint256) {
        return proposalCounter;
    }

    /// @notice Get the total number of members
    /// @return The total number of members
    function getMemberCount() external view returns (uint256) {
        return memberCounter;
    }
}

