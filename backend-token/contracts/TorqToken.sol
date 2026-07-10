// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TorqToken (TQ)
/// @notice A real ERC-20 token with an on-chain "mining" mechanic:
///         any wallet can call mine() to receive a pseudo-random reward,
///         subject to a per-wallet cooldown. Transfers use the standard
///         ERC-20 transfer(), which is atomic by construction — a send
///         either fully succeeds or fully reverts, so balances can never
///         duplicate or vanish mid-transaction.
contract TorqToken is ERC20, Ownable {
    uint256 public constant MIN_REWARD = 1 * 10 ** 18;    // 1 TQ
    uint256 public constant MAX_REWARD = 100 * 10 ** 18;  // 100 TQ
    uint256 public constant MINE_COOLDOWN = 10 seconds;   // matches "10-25s per mine" UI

    mapping(address => uint256) public lastMinedAt;

    event Mined(address indexed miner, uint256 amount, uint256 timestamp);

    error MiningOnCooldown(uint256 secondsRemaining);

    constructor(address initialOwner) ERC20("Torq", "TQ") Ownable(initialOwner) {}

    /// @notice Mine a pseudo-random amount of TQ (1-100), subject to a
    ///         per-wallet cooldown. NOTE: block-based randomness is
    ///         predictable/miner-influenceable, which is an accepted
    ///         limitation for a demo/testnet token. For a production
    ///         mainnet deployment with real economic value, replace this
    ///         with a verifiable randomness source (e.g. Chainlink VRF).
    function mine() external returns (uint256 reward) {
        uint256 elapsed = block.timestamp - lastMinedAt[msg.sender];
        if (lastMinedAt[msg.sender] != 0 && elapsed < MINE_COOLDOWN) {
            revert MiningOnCooldown(MINE_COOLDOWN - elapsed);
        }

        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    msg.sender,
                    _getAndIncrementNonce(msg.sender)
                )
            )
        );
        reward = MIN_REWARD + (rand % (MAX_REWARD - MIN_REWARD + 1));

        lastMinedAt[msg.sender] = block.timestamp;
        _mint(msg.sender, reward);

        emit Mined(msg.sender, reward, block.timestamp);
    }

    /// @notice Seconds remaining before an address can mine again (0 if ready now).
    function cooldownRemaining(address miner) external view returns (uint256) {
        uint256 elapsed = block.timestamp - lastMinedAt[miner];
        if (lastMinedAt[miner] == 0 || elapsed >= MINE_COOLDOWN) return 0;
        return MINE_COOLDOWN - elapsed;
    }
    // --- internal nonce to reduce same-block replay predictability ---
    mapping(address => uint256) private _nonces;

    function _getAndIncrementNonce(address who) private returns (uint256) {
        return _nonces[who]++;
    }
}