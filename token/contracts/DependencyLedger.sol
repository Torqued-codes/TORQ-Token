// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DependencyLedger
/// @notice On-chain "known-good" registry of package name/version -> SHA-256 hash.
///         Only the contract owner (e.g. a CI/CD signing key or multisig) may
///         register or update entries. Anyone can read/verify entries.
contract DependencyLedger is Ownable {
    struct PackageRecord {
        bytes32 hash;       // SHA-256 digest of the package directory
        uint256 registeredAt;
        uint256 updatedAt;
        bool exists;
    }

    // keccak256(abi.encodePacked(name, version)) => record
    mapping(bytes32 => PackageRecord) private ledger;

    event PackageRegistered(string indexed name, string version, bytes32 hash, uint256 timestamp);
    event PackageUpdated(string indexed name, string version, bytes32 oldHash, bytes32 newHash, uint256 timestamp);
    event PackageRevoked(string indexed name, string version, uint256 timestamp);

    error PackageNotFound(string name, string version);
    error PackageAlreadyExists(string name, string version);
    error EmptyHash();
    error EmptyName();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function _key(string calldata name, string calldata version) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(name, "@", version));
    }

    /// @notice Register a brand-new package hash. Reverts if it already exists
    ///         (use updatePackage for intentional version bumps).
    function registerPackage(
        string calldata name,
        string calldata version,
        bytes32 hash
    ) external onlyOwner {
        if (bytes(name).length == 0) revert EmptyName();
        if (hash == bytes32(0)) revert EmptyHash();

        bytes32 key = _key(name, version);
        if (ledger[key].exists) revert PackageAlreadyExists(name, version);

        ledger[key] = PackageRecord({
            hash: hash,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        emit PackageRegistered(name, version, hash, block.timestamp);
    }

    /// @notice Update an existing package's known-good hash (e.g. a patched release).
    function updatePackage(
        string calldata name,
        string calldata version,
        bytes32 newHash
    ) external onlyOwner {
        if (newHash == bytes32(0)) revert EmptyHash();

        bytes32 key = _key(name, version);
        PackageRecord storage record = ledger[key];
        if (!record.exists) revert PackageNotFound(name, version);

        bytes32 oldHash = record.hash;
        record.hash = newHash;
        record.updatedAt = block.timestamp;

        emit PackageUpdated(name, version, oldHash, newHash, block.timestamp);
    }

    /// @notice Revoke a package entry (e.g. known-compromised release).
    function revokePackage(string calldata name, string calldata version) external onlyOwner {
        bytes32 key = _key(name, version);
        if (!ledger[key].exists) revert PackageNotFound(name, version);
        delete ledger[key];
        emit PackageRevoked(name, version, block.timestamp);
    }

    /// @notice Public read access — anyone can verify a hash against the ledger.
    function getPackageHash(string calldata name, string calldata version)
        external
        view
        returns (bytes32 hash, uint256 registeredAt, uint256 updatedAt)
    {
        bytes32 key = _key(name, version);
        PackageRecord memory record = ledger[key];
        if (!record.exists) revert PackageNotFound(name, version);
        return (record.hash, record.registeredAt, record.updatedAt);
    }

    function packageExists(string calldata name, string calldata version) external view returns (bool) {
        return ledger[_key(name, version)].exists;
    }
}