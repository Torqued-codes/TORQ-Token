import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying DependencyLedger with owner: ${deployer.address}`);

  const Ledger = await ethers.getContractFactory("DependencyLedger");
  const ledger = await Ledger.deploy(deployer.address);
  await ledger.waitForDeployment();

  const address = await ledger.getAddress();
  console.log(`DependencyLedger deployed to: ${address}`);

  // Convenience: append/update .env with the deployed address
  const envPath = ".env";
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  if (envContent.includes("LEDGER_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(/LEDGER_CONTRACT_ADDRESS=.*/g, `LEDGER_CONTRACT_ADDRESS=${address}`);
  } else {
    envContent += `\nLEDGER_CONTRACT_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env with LEDGER_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});