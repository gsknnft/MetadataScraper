import Meta from "./meta"; // Flipper
import * as dotenv from "dotenv"; // Env vars
import { logger } from "./utils/logger"; // Logging
import { promptVerifyContinue } from './utils/prompt';

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

  // Setup flipper and process
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

  //await meta.processAddresses();
  const shouldContinue = await promptVerifyContinue(
    "Continue? (true/false)"
  );
  await meta.doIt();
  shouldContinue;

  //await meta.process();

  //await meta.createAddressTokenIdsMap();
  shouldContinue;
  //await meta.createAddressTokenMetadata();

})();
