import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedEncryptedDAO = await deploy("EncryptedDAO", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptedDAO contract: `, deployedEncryptedDAO.address);
};
export default func;
func.id = "deploy_encryptedDAO"; // id required to prevent reexecution
func.tags = ["EncryptedDAO"];

