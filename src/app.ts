import Meta from "./meta"; // Flipper
import * as dotenv from "dotenv"; // Env vars
import { logger } from "./utils/logger"; // Logging

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
  const addresses = meta.readAddressesFromJSON();
  await meta.createAddressTokenIdsMap();
  await meta.createAddressTokenMetadata();
/*   const { addresses2, tokenIds } = meta.readFromJSON();
  logger.info(`READ Parsed ${addresses2} and ${tokenIds}`); */

/*   if (addresses.length !== 0) {
   // for (const address of addresses) {
      await meta.scrapeOriginalTokensForAddresses(addresses);
   // }
  }
   */
  await meta.process();
})();
