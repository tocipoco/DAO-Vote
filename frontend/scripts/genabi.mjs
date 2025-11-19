import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "EncryptedDAO";

// <root>/DAO/backend
const rel = "../backend";

// <root>/DAO/frontend/abi
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting DAO/${dirname}${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");
// if (!fs.existsSync(deploymentsDir)) {
//   console.error(
//     `${line}Unable to locate 'deployments' directory.\n\n1. Goto '${dirname}' directory\n2. Run 'npx hardhat deploy --network ${chainName}'.${line}`
//   );
//   process.exit(1);
// }

function deployOnHardhatNode() {
  if (process.platform === "win32") {
    // Not supported on Windows
    return;
  }
  try {
    execSync(`./deploy-hardhat-node.sh`, {
      cwd: path.resolve("./scripts"),
      stdio: "inherit",
    });
  } catch (e) {
    console.error(`${line}Script execution failed: ${e}${line}`);
    process.exit(1);
  }
}

function readDeployment(chainName, chainId, contractName, optional) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);

  if (!fs.existsSync(chainDeploymentDir) && chainId === 31337) {
    // Try to auto-deploy the contract on hardhat node!
    deployOnHardhatNode();
  }

  if (!fs.existsSync(chainDeploymentDir)) {
    if (!optional) {
      console.error(
        `${line}Unable to locate '${chainDeploymentDir}' directory.\n\n1. Goto '${dirname}' directory\n2. Run 'npx hardhat deploy --network ${chainName}'.${line}`
      );
      process.exit(1);
    }
    // For optional deployments, silently return undefined to skip
    return undefined;
  }

  const deploymentFile = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(deploymentFile)) {
    if (!optional) {
      console.error(
        `${line}Unable to locate deployment file '${deploymentFile}'.\n\n1. Goto '${dirname}' directory\n2. Run 'npx hardhat deploy --network ${chainName}'.${line}`
      );
      process.exit(1);
    }
    // For optional deployments, silently return undefined to skip
    return undefined;
  }

  const jsonString = fs.readFileSync(deploymentFile, "utf-8");

  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;

  return obj;
}

// Auto deployed on Linux/Mac (will fail on windows)
const deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME, true /* optional */);

// Sepolia is optional - automatically skip if not deployed
const deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME, true /* optional */);

// Resolve ABI source: prefer any deployment ABI, otherwise read from artifacts
let contractABI;
if (deployLocalhost && deployLocalhost.abi) {
  contractABI = deployLocalhost.abi;
} else if (deploySepolia && deploySepolia.abi) {
  contractABI = deploySepolia.abi;
} else {
  // Try to read ABI from Hardhat artifacts
  const artifactFile = path.join(dir, "artifacts", "contracts", `${CONTRACT_NAME}.sol`, `${CONTRACT_NAME}.json`);
  if (fs.existsSync(artifactFile)) {
    const artifactJson = JSON.parse(fs.readFileSync(artifactFile, "utf-8"));
    contractABI = artifactJson.abi;
  }
}

if (!contractABI) {
  console.error(
    `${line}Unable to determine ABI. Please compile backend or deploy at least on one network.${line}`
  );
  process.exit(1);
}

// Verify ABI consistency if both deployments exist
if (deploySepolia) {
  if (JSON.stringify(contractABI) !== JSON.stringify(deploySepolia.abi)) {
    console.error(
      `${line}Deployments on localhost and Sepolia differ. Can't use the same abi on both networks. Consider re-deploying the contracts on both networks.${line}`
    );
    process.exit(1);
  }
  console.log(`✓ Sepolia deployment found at ${deploySepolia.address}`);
} else {
  console.log(`⚠️  Sepolia deployment not found. Skipping chainId 11155111 in address mapping.`);
}


const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: contractABI }, null, 2)} as const;
\n`;

// Build addresses object dynamically
const addresses = {};
if (deployLocalhost) {
  addresses["31337"] = { address: deployLocalhost.address, chainId: 31337, chainName: "hardhat" };
}

// Only add Sepolia if it's actually deployed
if (deploySepolia) {
  addresses["11155111"] = { address: deploySepolia.address, chainId: 11155111, chainName: "sepolia" };
}

const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses: Record<string, { address: ` + "`0x${string}`" + `; chainId: number; chainName: string }> = ${JSON.stringify(addresses, null, 2)} as const;
`;

console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);
console.log(tsAddresses);

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);
