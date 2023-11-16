import Meta from "./meta"; // Flipper
import * as dotenv from "dotenv"; // Env vars
import { logger } from "./utils/logger"; // Logging
import { promptVerifyContinue } from './utils/prompt';
import { TraitChecker } from "./meta/traitChecker";
import ReadData from "./meta/readData";
const shouldContinue = promptVerifyContinue(
  "Continue? (true/false)"
);
// Setup env
dotenv.config();

(async () => {
  // Collect environment variables
  const rpcURL: string | undefined = process.env.RPC;
  const IPFSGateway: string | undefined = process.env.IPFS;
  const contractAddress: string | undefined = process.env.CONTRACT;

  // If missing env vars
  if (!rpcURL || !IPFSGateway || !contractAddress) {
    // Throw error and exit
    logger.error("Missing required parameters, update .env");
    process.exit(1);
  }

  // Setup meta and process
  const meta = new Meta(rpcURL, IPFSGateway, contractAddress);
/* const addresses = await meta.readAddressesFromJSON();
  logger.info(`${JSON.stringify(addresses, null, 2)}`)
  */
/*   const data = await meta.readAddressTokenIdsFromJSON();
  const data2 = await meta.readParsedAddressTokenIdsFromJSON();

  logger.info(`
  readAddressTokenIdsFromJSON: ${data2}
  readParsedAddressTokenIdsFromJSON: ${JSON.stringify(data2, null, 2)}`
  ) */

  await meta.processAddresses();

  await meta.createAddressTokenIdsMap();

/*   await meta.process();
  shouldContinue;
  const read = new ReadData();
  logger.info(`Read & Extract`)
  await read.readCollectedData()
  shouldContinue; */
    logger.info(`Trait Checker`)
  const traitChecker = new TraitChecker();
  traitChecker.runChecker();
  //await meta.createAddressTokenMetadata();
  shouldContinue;
   try {
    // Now you can log or handle the result as needed
    const claimableAddresses = await traitChecker.readExistingClaimableAddresses();
    logger.info('Claimable Addresses:', claimableAddresses);
  } catch (error) {
    logger.error(`ERROR: ${error}`)

  }

  //await meta.process();

})();
