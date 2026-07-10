import { expect } from "chai";
import { ethers } from "hardhat";

describe("DependencyLedger", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();
    const Ledger = await ethers.getContractFactory("DependencyLedger");
    const ledger = await Ledger.deploy(owner.address);
    await ledger.waitForDeployment();
    return { ledger, owner, other };
  }

  const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("test-package-contents"));

  it("allows the owner to register a package", async function () {
    const { ledger } = await deployFixture();
    await expect(ledger.registerPackage("left-pad", "1.3.0", fakeHash))
      .to.emit(ledger, "PackageRegistered");

    const [hash] = await ledger.getPackageHash("left-pad", "1.3.0");
    expect(hash).to.equal(fakeHash);
  });

  it("rejects registration from non-owner accounts", async function () {
    const { ledger, other } = await deployFixture();
    await expect(
      ledger.connect(other).registerPackage("left-pad", "1.3.0", fakeHash)
    ).to.be.revertedWithCustomError(ledger, "OwnableUnauthorizedAccount");
  });

  it("reverts when querying an unregistered package", async function () {
    const { ledger } = await deployFixture();
    await expect(ledger.getPackageHash("ghost-pkg", "0.0.1")).to.be.revertedWithCustomError(
      ledger,
      "PackageNotFound"
    );
  });

  it("prevents duplicate registration and supports explicit updates", async function () {
    const { ledger } = await deployFixture();
    await ledger.registerPackage("chalk", "5.3.0", fakeHash);

    await expect(ledger.registerPackage("chalk", "5.3.0", fakeHash)).to.be.revertedWithCustomError(
      ledger,
      "PackageAlreadyExists"
    );

    const newHash = ethers.keccak256(ethers.toUtf8Bytes("patched-contents"));
    await expect(ledger.updatePackage("chalk", "5.3.0", newHash)).to.emit(ledger, "PackageUpdated");

    const [hash] = await ledger.getPackageHash("chalk", "5.3.0");
    expect(hash).to.equal(newHash);
  });
});