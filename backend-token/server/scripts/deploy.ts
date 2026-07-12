import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying TorqToken with owner: ${deployer.address}`);

  const Torq = await ethers.getContractFactory("TorqToken");
  const torq = await Torq.deploy(deployer.address);
  await torq.waitForDeployment();

  const address = await torq.getAddress();
  console.log(`TorqToken deployed to: ${address}`);

  const envPath = "server/.env";
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  if (envContent.includes("TORQ_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(/TORQ_CONTRACT_ADDRESS=.*/g, `TORQ_CONTRACT_ADDRESS=${address}`);
  } else {
    envContent += `\nTORQ_CONTRACT_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log("Updated server/.env with TORQ_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});