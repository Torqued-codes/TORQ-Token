import { expect } from "chai";
import { ethers } from "hardhat";

describe("TorqToken", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Torq = await ethers.getContractFactory("TorqToken");
    const torq = await Torq.deploy(owner.address);
    await torq.waitForDeployment();
    return { torq, owner, alice, bob };
  }

  it("mints a reward within bounds on mine()", async function () {
    const { torq, alice } = await deployFixture();
    const before = await torq.balanceOf(alice.address);
    await torq.connect(alice).mine();
    const after = await torq.balanceOf(alice.address);
    const reward = after - before;

    expect(reward).to.be.gte(ethers.parseUnits("1", 18));
    expect(reward).to.be.lte(ethers.parseUnits("100", 18));
  });

  it("enforces the mining cooldown", async function () {
    const { torq, alice } = await deployFixture();
    await torq.connect(alice).mine();
    await expect(torq.connect(alice).mine()).to.be.revertedWithCustomError(
      torq,
      "MiningOnCooldown"
    );
  });

  it("allows mining again after cooldown elapses", async function () {
    const { torq, alice } = await deployFixture();
    await torq.connect(alice).mine();
    await ethers.provider.send("evm_increaseTime", [11]);
    await ethers.provider.send("evm_mine", []);
    await expect(torq.connect(alice).mine()).to.not.be.reverted;
  });

  it("transfers atomically between wallets", async function () {
    const { torq, alice, bob } = await deployFixture();
    await torq.connect(alice).mine();
    const aliceBalance = await torq.balanceOf(alice.address);

    await torq.connect(alice).transfer(bob.address, aliceBalance / 2n);

    expect(await torq.balanceOf(bob.address)).to.equal(aliceBalance / 2n);
    expect(await torq.balanceOf(alice.address)).to.equal(aliceBalance - aliceBalance / 2n);
  });

  it("reverts a transfer that exceeds balance", async function () {
    const { torq, alice, bob } = await deployFixture();
    await expect(
      torq.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))
    ).to.be.reverted;
  });
});