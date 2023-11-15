import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { ethers } from 'ethers';
import { logger } from './utils/logger';
import { ERC721ABI } from './utils/constants';
import { promptVerifyContinue } from './utils/prompt';
import { collectURILocation, URILocation } from './utils/metadata';
import { Alchemy, Network } from 'alchemy-sdk';
import { Address } from '@thirdweb-dev/sdk';
import _default from 'vuex';
import { isDeepStrictEqual } from 'util';

async function deepEqual(obj1: any, obj2: any): Promise<boolean> {

  try {
    isDeepStrictEqual(obj1, obj2);
    return true;
  } catch (error) {
    return false;
  }
}

interface TokenMetadata {
  metadata: Record<string, any>;
}

interface AddressMetadata {
  ownerTokens: AddressTokenIdsMap;
  metadata: Record<number, TokenMetadata>;
}

interface AllAddressesMetadata {
  [address: Address]: AddressMetadata;
}

interface AddressTokenIdsMap {
  [address: Address]: number[];
}


export default class MetaNew {
  IPFSGateway: string;
  contract: ethers.Contract;
  collectionName: string = '';
  collectionSupply: number = 0;
  lastScrapedToken: number = 0;
  allAddressTokenMetadata: AllAddressesMetadata = {};

  constructor(rpcURL: string, IPFSGateway: string, index: string) {
    this.IPFSGateway = IPFSGateway;
    this.contract = new ethers.Contract(
      index,
      ERC721ABI,
      new ethers.providers.StaticJsonRpcProvider(rpcURL)
    );
  }

  async collectCollectionDetails(): Promise<void> {
    this.collectionName = await this.contract.name();
    this.collectionSupply = await this.contract.totalSupply();
  }

  async readAddressesFromJSON(): Promise<Address[]> {
    try {
      const addressesJSON = await fs.promises.readFile('src/utils/addresses.json', 'utf-8');
      const parseAdd: Address[] = JSON.parse(addressesJSON);
      return parseAdd;
    } catch (error) {
      logger.error("Error reading addresses from 'addresses.json':", error);
      return [];
    }
  }

  async readSanitizedAddressesFromJSON(): Promise<Address[]> {
    try {
      const addressesJSON = await fs.promises.readFile('src/utils/addresses.json', 'utf-8');
      const addresses: Address[] = JSON.parse(addressesJSON);
      
      // Ensure each element in the array is treated as a string
      const sanitizedAddresses = addresses.map(address => String(address).toLowerCase());
  
      return sanitizedAddresses;
    } catch (error) {
      logger.error("Error reading addresses from 'addresses.json':", error);
      return [];
    }
  }
  

  async readIndexedAddressesFromJSON(): Promise<{ index: number; address: Address }[]> {
    try {
      const addressesJSON = await fs.promises.readFile('src/utils/addresses.json', 'utf-8');
      const addresses: Address[] = JSON.parse(addressesJSON);
  
      // Create an array of objects with index and address
      const indexedAddresses = addresses.map((address, index) => ({
        index,
        address: String(address).toLowerCase(),
      }));
  
      return indexedAddresses;
    } catch (error) {
      logger.error("Error reading addresses from 'addresses.json':", error);
      return [];
    }
  }

  async readSanitizedIndexedAddressesFromJSON(): Promise<{ index: number; address: Address }[]> {
    try {
      const addresses: Address[] = await this.readSanitizedAddressesFromJSON();
  
      // Create an array of objects with index and address
      const indexedAddresses = addresses.map((address, index) => ({
        index,
        address: String(address).toLowerCase(),
      }));
  
      return indexedAddresses;
    } catch (error) {
      logger.error("Error reading addresses from 'addresses.json':", error);
      return [];
    }
  }
  
  async processAddresses(outputFilePath: string = './output/processedAddresses.json'): Promise<void> {
    try {
      const addresses: Address[] = await this.readAddressesFromJSON();
      const addressesIndexed = await this.readIndexedAddressesFromJSON();
      const addressesSanitized = await this.readSanitizedAddressesFromJSON();
      const addressTokens = await this.readAddressTokenIdsFromJSON();
      const addressTokensIndexed = await this.readIndexedAddressTokenIdsFromJSON();

      const processedData = {
        addressTokens,
        addressTokensIndexed,
        originalAddresses: addresses,
        indexedAddresses: addressesIndexed,
        sanitizedAddresses: addressesSanitized,
      };

      // Convert the processed data to a JSON string
      const jsonData = JSON.stringify(processedData, null, 2);

      // Write the JSON data to the specified output file
      await fs.writeFileSync(outputFilePath, JSON.stringify(jsonData, null, 2));

      console.log(`Processed data written to ${outputFilePath}`);
    } catch (error) {
      // Handle errors
      console.error('Error processing addresses:', error);
    }
  }
  

  async processAddress() {
    try {
      const addresses: Address[] = await this.readAddressesFromJSON();
      const addressesIndexed = await this.readIndexedAddressesFromJSON();
      const addressesSanitized = await this.readSanitizedAddressesFromJSON();
      const addressTokens = await this.readAddressTokenIdsFromJSON();
      const addressTokensIndexed = await this.readIndexedAddressTokenIdsFromJSON();

      console.log('Processing addressTokens:', addressTokens);
      console.log('Processing addressTokensIndexed:', addressTokensIndexed);

      // Now 'addresses' is an array of string addresses that you can iterate over.
      for (const address of addressTokensIndexed) {
        console.log('Processing addressTokensIndexed address:', JSON.stringify(address, null, 2));
        
        // Placeholder: Do something with each address
        console.log('Processing addressTokens address:', JSON.stringify(address, null, 2));
      }
      // Now 'addresses' is an array of string addresses that you can iterate over.
      for (const address of addresses) {
        // Placeholder: Do something with each address
        console.log('Processing original address:', address);
      }
      console.log('Processing indexedAddress:', addressesIndexed);
      for (const { index, address } of addressesIndexed) {
        // Placeholder: Do something with each indexed address
        console.log(`Processing indexed address at index ${index}:`, address);
      }
      console.log('Processing sanitizedAddress:', addressesSanitized);

      for (const sanitizedAddress of addressesSanitized) {
        // Placeholder: Do something with each sanitized address
        console.log('Processing sanitized address:', sanitizedAddress);
      }

    } catch (error) {
      // Handle errors
      console.error('Error processing addresses:', error);
    }
  }
  
  async readIndexedAddressTokenIdsFromJSON(): Promise<[Address, number[]][]> {
    try {
      const addressTokenIdsJSON = await fs.promises.readFile('addressTokenIds.json', 'utf-8');
      // Parse the content as JSON, which results in an object
      const parsedObject: AddressTokenIdsMap = JSON.parse(addressTokenIdsJSON);
      // Convert the object to an array of key-value pairs
      const keyValueArray: [Address, number[]][] = Object.entries(parsedObject);
  
      // Return the array of key-value pairs, or an empty array if parsing fails
      return keyValueArray || [];
    } catch (error) {
      // Handle errors, log them, and return an empty array
      logger.error("Error reading data from 'addressTokenIds.json':", error);
      return [];
    }
  }

  async readIndexedAddressTokenIdsFromJSON2(): Promise<AddressTokenIdsMap> {
    try {
      const addressTokenIdsJSON = await fs.promises.readFile('addressTokenIds.json', 'utf-8');
      const parsedObject: AddressTokenIdsMap = JSON.parse(addressTokenIdsJSON);
      return parsedObject;
    } catch (error) {
      logger.error("Error reading data from 'addressTokenIds.json':", error);
      return {};
    }
  }
  

  readAddressTokenIdsFromJSON(): string[] {
    try {
      const addressTokenIdsJSON = fs.readFileSync("addressTokenIds.json", "utf-8");
      const array = Array(JSON.stringify(addressTokenIdsJSON, null, 2));
      const addressTokenIds: Address[] = array;
      return addressTokenIds;
    } catch (error) {
      logger.error("Error reading addressTokenIds from 'addressTokenIds.json':", error);
      return [];
    }
  }
  
  readParsedAddressTokenIdsFromJSON(): AddressTokenIdsMap {
    try {
      const addressTokenIdsJSON = fs.readFileSync("addressTokenIds.json", "utf-8");
      const addressTokenIds: AddressTokenIdsMap = JSON.parse(addressTokenIdsJSON);
      return addressTokenIds;
    } catch (error) {
      logger.error("Error reading addressTokenIds from 'addressTokenIds.json':", error);
      return {};
    }
  }
  
 
  getDirectoryPath(folder: string): string {
    return path.join(__dirname, `../output/${this.contract.address}/${folder}`);
  }

  setupDirectoryByType(type: string): number {
    const metadataFolder = this.getDirectoryPath(type);
    const metadataImagesFolder = path.join(metadataFolder, 'images');

    if (!fs.existsSync(metadataImagesFolder)) {
      fs.mkdirSync(metadataImagesFolder, { recursive: true });
      logger.info(`Initializing new ${type} metadata + images folder`);
      return 0;
    } else {
      const folderFilenames: string[] = fs.readdirSync(metadataFolder);
      const tokenIds: number[] = folderFilenames
        .filter((filename: string) => filename.endsWith('.json'))
        .map((filename: string) => Number(filename.slice(0, -5)));

      if (tokenIds.length > 0) {
        const maxTokenId: number = Math.max(...tokenIds);
        logger.info(`${type} metadata folder exists till token #${maxTokenId}`);
        return maxTokenId;
      } else {
        logger.info(`${type} metadata folder exists but is empty`);
        return 0;
      }
    }
  }
  

  async getOwnedNFTs(addresses: Address[]): Promise<void> {
    try {
      const api = process.env.API_KEY || '';
      if (!api) {
        throw new Error("API key not set");
      }      
      const config = {
        apiKey: `${api}`,
        network: Network.ETH_MAINNET,
      };
    
      const alchemy = new Alchemy(config);
      const contractAddy = "0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3";
      
      for (let i = 0; i < addresses.length; i++) {
        const ownerAddress = addresses[i];
        try {
          const nftsResponse = await alchemy.nft.getNftsForOwner(ownerAddress, {
            contractAddresses: [contractAddy],
          });
    
          // Parse output
          const numNfts = nftsResponse["totalCount"];
          const nftList = nftsResponse["ownedNfts"];
    
          logger.info(`${ownerAddress} owns ${numNfts} MWB NFTs. NFT List: ${nftList}`);
          
          // Create a subfolder for each address
          const addressFolder = path.resolve('./output/', ownerAddress.toLowerCase());
          if (!fs.existsSync(addressFolder)) {
            fs.mkdirSync(addressFolder, { recursive: true });
          }
  
          // Write all owned NFTs to a single JSON file
          const ownedNFTsPath = path.resolve(addressFolder, 'ownedMWB.json');
          fs.writeFileSync(ownedNFTsPath, JSON.stringify(nftList, null, 2));
  
          logger.info(`List of owned NFTs written to ${ownedNFTsPath}`);
        } catch (error) {
          logger.error(`Error fetching NFTs for address ${addresses[i]}: ${error}`);
        }
      }
    } catch (error) {
      logger.error(`Error: ${error}`);
      // You might want to rethrow the error or handle it in a way that makes sense for your application.
    }
  }
  

  private async getHTTPMetadata(uri: string): Promise<Record<string, any>> {
    try {
      const response = await axios.get(uri);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching metadata from ${uri}: ${error}`);
      throw error; // Propagate the error to handle it in the calling function
    }
  }

  async scrapeOriginalToken(tokenId: number): Promise<void> {
    if (tokenId >= this.collectionSupply) {
      logger.info('Finished scraping original metadata');
      return;
    }

    const URI: string = await this.contract.tokenURI(tokenId);
    const { loc, URI: formattedURI } = collectURILocation(URI);

    let metadata: Record<string, any> = {};
    switch (loc) {
      case URILocation.IPFS:
        metadata = await this.getHTTPMetadata(`${this.IPFSGateway}${formattedURI}`);
        break;
      case URILocation.HTTPS:
        metadata = await this.getHTTPMetadata(formattedURI);
        break;
    }

    const baseFolder: string = this.getDirectoryPath('original');
    const tokenMetadataPath: string = `${baseFolder}/${tokenId}.json`;

    await fs.promises.writeFile(tokenMetadataPath, JSON.stringify(metadata, null, 2));
    logger.info(`Retrieved token #${tokenId}`);
    await this.scrapeOriginalToken(tokenId + 1);
  }

  async getMeta(tokenId: number): Promise<TokenMetadata> {
    
    const URI: string = await this.contract.tokenURI(tokenId);
    const { loc, URI: formattedURI } = collectURILocation(URI);
  
    let metadata: Record<string, any> = {};
    switch (loc) {
      case URILocation.IPFS:
        metadata = await this.getHTTPMetadata(`${this.IPFSGateway}${formattedURI}`);
        break;
      case URILocation.HTTPS:
        metadata = await this.getHTTPMetadata(formattedURI);
        break;
    }
  
    return {
      metadata
    };
  }
  

  async scrapeTokenMetadataForAddress(address: Address, tokenIds: number[]): Promise<Record<number, TokenMetadata>> {
    const metadata: Record<number, TokenMetadata> = {};
  
    for (const tokenId of tokenIds) {
      try {
        const tokenMetadata: TokenMetadata = await this.getMeta(tokenId);
        metadata[tokenId] = tokenMetadata;
      } catch (error) {
        logger.error(`Error fetching metadata for token #${tokenId} and address ${address}: ${error}`);
      }
    }
  
    return metadata;
  }
  
  async fetchTokenMetadata(address: Address, tokenId: number): Promise<TokenMetadata> {
    const URI: string = await this.contract.tokenURI(tokenId);
    const { loc, URI: formattedURI } = collectURILocation(URI);

    const metadata: Record<string, any> = await this.getHTTPMetadata(
      loc === URILocation.IPFS ? `${this.IPFSGateway}${formattedURI}` : formattedURI
    );

    return {
      metadata
    };
  }

  async fetchMetadataForAddress(address: Address, tokenIds: number[]): Promise<AddressMetadata> {
    const metadata: Record<number, TokenMetadata> = {};
  
    for (const tokenId of tokenIds) {
      try {
        const tokenMetadata = await this.fetchTokenMetadata(address, tokenId);
        metadata[tokenId] = tokenMetadata;
      } catch (error) {
        logger.error(`Error fetching metadata for token #${tokenId} and address ${address}: ${error}`);
      }
    }
  
    return {
      ownerTokens: { [address]: tokenIds },
      metadata,
    };
  }
  
  async createAddressTokenMetadata(): Promise<void> {
    try {
      const name = this.collectionName.toLowerCase();
      const nameWithoutSpaces: string = name.replace(/\s/g, "");
      const addresses: Address[] = await this.readSanitizedAddressesFromJSON();
      const addressTokenIds = await this.readIndexedAddressTokenIdsFromJSON();
      const contractAddress: Address = `${process.env.CONTRACT}` || `0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3`;
      const agglomeratedData: Record<string, Record<string, AddressMetadata>> = {};
      const shouldContinue = await promptVerifyContinue("Continue? (true/false)");
      const collectionFolder = path.resolve(__dirname, `${nameWithoutSpaces}_newStruct`);
      const addressFolder = path.resolve(collectionFolder, 'addressesNewMeta');
      await fs.promises.mkdir(collectionFolder, { recursive: true });
      await fs.promises.mkdir(addressFolder, { recursive: true });
  
      let normalizedAddress: Address;
      if (addresses.length !== 0) {
        logger.info(`
          Passed Addresses: ${JSON.stringify(addresses, null, 2)}
        `);
        for (const passedAddress of addresses) {
          normalizedAddress = passedAddress.toLowerCase();
  
          if (!normalizedAddress) {
            logger.warn('Invalid address:', normalizedAddress);
            continue; // Skip to the next iteration
          }
  
          logger.info(`Passed Address: ${normalizedAddress}`);
          const addressFilePath = path.resolve(addressFolder, `${normalizedAddress}.json`);
  
          // Check if the metadata file already exists
          if (await fs.promises.access(addressFilePath).then(() => true).catch(() => false)) {
            logger.info(`Metadata file already exists for address ${normalizedAddress}. Skipping.`);
            continue; // Skip to the next iteration
          }
  
          let existingMetadata: AddressMetadata | undefined;
  
          try {
            // Read existing metadata file
            const existingMetadataContent = await fs.promises.readFile(addressFilePath, 'utf-8');
            existingMetadata = JSON.parse(existingMetadataContent);
          } catch (error) {
            // File doesn't exist or error reading file
            logger.debug(`Metadata file not found for address ${normalizedAddress}. Will create a new one.`);
          }
  
          let shouldWriteFile = true;
  
          let foundMatch = false; // Flag to control the loop
          for (const [index, addressData] of Object.entries(addressTokenIds)) {
            for (const [address, tokenIds] of Object.entries(addressData)) {
              if (address === '') {
                logger.warn('Invalid address:', address);
                continue; // Skip to the next iteration
              }
  
              const matchingAddressEntry = addressTokenIds.find(([address]) => normalizedAddress === address.toLowerCase());
  
              if (matchingAddressEntry) {
                const [address, tokenIds] = matchingAddressEntry;
  
                if (!address) {
                  logger.warn('Invalid address:', address);
                  continue; // Skip to the next iteration
                }
  
                if (foundMatch) {
                  break; // Break out of the loop for the current address
                }
  
                if (passedAddress.toLowerCase() === address.toLowerCase()) {
                  if (tokenIds && Array.isArray(tokenIds)) {
                    logger.info(`
                      ${JSON.stringify(`Processing from addresses.json: ${normalizedAddress} which should be ${address.toLowerCase()},
                      Scraping ${tokenIds.length} tokens for address ${address},
                      Address: ${address}, owns  ${tokenIds.length} Token IDs: ${tokenIds}`, null, 2)}
                    `);
  
                    let metadataPerAddress: AddressMetadata = {
                      ownerTokens: { [normalizedAddress]: tokenIds },
                      metadata: {},
                    };
  
                    // Check if there are changes in the metadata
                    let metadataChanged = true; // Assume metadata has changed by default
  
                    for (const tokenId of tokenIds) {
                      try {
                        const meta: TokenMetadata = await this.getMeta(tokenId);
                        metadataPerAddress.metadata[tokenId] = meta;
                      } catch (error) {
                        logger.error(`Error processing token #${tokenId} for address ${address}: ${error}`);
                      }
                      logger.info(`Metadata for token #${tokenId} saved!}`);
                    }
  
                    // Check if there are changes in the metadata
                    if (existingMetadata) {
                      metadataChanged = !(await deepEqual(existingMetadata, metadataPerAddress));
                    }
  
                    if (!metadataChanged) {
                      logger.info(`Metadata for address ${normalizedAddress} has not changed. Skipping.`);
                      continue; // Skip to the next iteration
                    }
  
                    try {
                      const addressFilePath = path.resolve(addressFolder, `${normalizedAddress}.json`);
                      await fs.promises.writeFile(addressFilePath, JSON.stringify(metadataPerAddress, null, 2));
                      logger.info(`Metadata saved for address ${normalizedAddress} at: ${addressFilePath}`);
                      foundMatch = true; // Set the flag to true
                    } catch (error) {
                      logger.error(`Error writing file for address ${normalizedAddress}: ${error}`);
                    }
  
                    this.allAddressTokenMetadata[normalizedAddress] = metadataPerAddress;
                    if (!agglomeratedData[contractAddress]) {
                      agglomeratedData[contractAddress] = {};
                    }
  
                    agglomeratedData[contractAddress][normalizedAddress] = metadataPerAddress;
                  } else {
                    logger.info(`Not an Array`);
                  }
                } else {
                  logger.info(`NoMatch ${address} + ${normalizedAddress}`);
                }
              } else {
                logger.info(`No tokenIds found for address: ${address}`);
              }
            }
          }
        }
  
        logger.info('Loop completed for all addresses.');
      } else {
        logger.info('No addresses passed, possible insert "ALL scrape"');
      }
  
      const agglomeratedFilePath = path.resolve(collectionFolder, `${contractAddress}_collected_metadata.json`);
      await fs.promises.writeFile(agglomeratedFilePath, JSON.stringify(agglomeratedData, null, 2));
    } catch (error) {
      logger.error('Error scraping metadata for addresses:', error);
    }
  }
  
      
      async scrapeTokenMetadata(address: Address, tokenId: number, metadataPerAddress: AddressMetadata): Promise<void> {
        try {
          const URI: string = await this.contract.tokenURI(tokenId);
          const { loc, URI: formattedURI } = collectURILocation(URI);
      
          const metadata: Record<string, any> = await this.getHTTPMetadata(
            loc === URILocation.IPFS ? `${this.IPFSGateway}${formattedURI}` : formattedURI
          );
      
          metadataPerAddress.metadata[tokenId] = {
            metadata,
          };
        } catch (error) {
          logger.error(`Error fetching metadata for token #${tokenId} and address ${address}: ${error}`);
          throw error;
        }
      }
  
  async createAddressTokenIdsMap(): Promise<AddressTokenIdsMap> {
    try {
      let addressTokenIds: AddressTokenIdsMap = {};
      let startTokenId = 1;

      try {
        const data = fs.readFileSync('addressTokenIds.json', 'utf-8');
        addressTokenIds = JSON.parse(data);
        startTokenId = Object.values(addressTokenIds)
          .reduce((maxTokenId: number, tokenIds: number[]) => Math.max(maxTokenId, ...tokenIds), 0) + 1;
      } catch (error) {
        logger.error('No existing addressTokenIds.json file found.');
      }

      const totalSupply: number = await this.contract.totalSupply();
      logger.info(`Creating Map of ${totalSupply} tokenIds for contract ${this.contract.address}`);

      for (let tokenId = startTokenId; tokenId <= totalSupply; tokenId++) {
        try {
          const tokenOwner: Address = await this.contract.ownerOf(tokenId);
          logger.info(`Owner of tokenId: ${tokenId} for contract ${this.contract.address} is ${tokenOwner}`);
          if (!addressTokenIds[tokenOwner]) {
            addressTokenIds[tokenOwner] = [tokenId];
            logger.info('Address to Owner changed, Token IDs map updated to addressTokenIds.json');
          } else {
            if (!addressTokenIds[tokenOwner].includes(tokenId)) {
              addressTokenIds[tokenOwner].push(tokenId);
              logger.info('TokenID owner Changed. Map updated: addressTokenIds.json');
            }
          }

          await fs.promises.writeFile('addressTokenIds.json', JSON.stringify(addressTokenIds, null, 2));
          logger.info(`Saved progress up to tokenId ${tokenId} in addressTokenIds.json`);
        } catch (error) {
          logger.error(`Error fetching owner of token #${tokenId}: ${error}`);
        }
      }

      const addressesWithTokens: AddressTokenIdsMap = {};
      Object.keys(addressTokenIds).forEach((address) => {
        addressesWithTokens[address] = addressTokenIds[address];
      });

      logger.info('NoChanges to Token IDs map addressTokenIds.json');
      return addressesWithTokens;
    } catch (error) {
      logger.error('Error creating Address to Token IDs map:', error);
      return {};
    }
  }
  async populateAllAddressTokenMetadata(): Promise<void> {
    try {
      const contractAddress: Address = `${process.env.CONTRACT}` || `0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3`;
      const agglomeratedData: Record<string, Record<string, AddressMetadata>> = {};
      logger.info(`Starting metadata population for all addresses.`);
  
      // Read existing addressTokenIds from the file
      const addressTokenIds: AddressTokenIdsMap = await this.readParsedAddressTokenIdsFromJSON();
  
      const collectionFolder = path.resolve('./output/', this.collectionName.toLowerCase().trim());
      const addressFolder = path.resolve(collectionFolder, 'addressesMeta');
      await fs.promises.mkdir(collectionFolder, { recursive: true });
      await fs.promises.mkdir(addressFolder, { recursive: true });
  
      if (addressTokenIds && Object.keys(addressTokenIds).length !== 0) {
        for (const [address, tokenIds] of Object.entries(addressTokenIds)) {
          const normalizedAddress = address.toLowerCase();
  
          logger.info('Processing address:', normalizedAddress);
  
          if (!normalizedAddress) {
            logger.warn('Invalid address:', normalizedAddress);
            continue; // Skip to the next iteration
          }
  
          const metadataPerAddress: AddressMetadata = await this.fetchMetadataForAddress(normalizedAddress, tokenIds);
  
          await fs.promises.writeFile(addressFolder, JSON.stringify(metadataPerAddress, null, 2));

          agglomeratedData[contractAddress] = agglomeratedData[contractAddress] || {};
          agglomeratedData[contractAddress][normalizedAddress] = metadataPerAddress;
        }
  
        logger.info('Metadata population completed for all addresses.');
      } else {
        logger.info('No addresses available in addressTokenIds.json for metadata population.');
      }
  
      const agglomeratedFilePath = path.resolve('./output/', `${contractAddress}_collected_metadata.json`);
      await fs.promises.writeFile(agglomeratedFilePath, JSON.stringify(agglomeratedData, null, 2));
    } catch (error) {
      logger.error('Error populating metadata for addresses:', error);
    }
  }
  

// Existing method
async scrapeToken(address: Address): Promise<void> {
  try {
    const addressTokenIdsJSON = fs.readFileSync('addressTokenIds.json', 'utf-8');
    const addressTokenIds: AddressTokenIdsMap = JSON.parse(addressTokenIdsJSON);

    if (!addressTokenIds[address]) {
      logger.info(`No tokenIds found for address: ${address}`);
      return;
    }

    const tokenIds = addressTokenIds[address];
    const metadataPerAddress: AddressMetadata = await this.fetchMetadataForAddress(address, tokenIds);

    this.allAddressTokenMetadata[address] = metadataPerAddress;

    const addressFilePath = path.resolve(`./output/${this.collectionName}/${address}_metadata.json`);
    if (!fs.existsSync(addressFilePath)) {
      fs.mkdirSync(addressFilePath, { recursive: true });
    }

    await fs.promises.writeFile(addressFilePath, JSON.stringify(metadataPerAddress, null, 2));
  } catch (error) {
    logger.error(`Error scraping metadata for address ${address}: ${error}`);
  }
}


async doIt(): Promise<void> {
  try {
    const addresses: Address[] = await this.readSanitizedAddressesFromJSON();
    let addressTokenIds = await this.readIndexedAddressTokenIdsFromJSON();
    let lastProcessedAddress: string | null = null;

    //logger.info(`Passed Addresses: ${JSON.stringify(addresses, null, 2)}`);

    const shouldContinue = await promptVerifyContinue("Continue? (true/false)");

    if (addresses.length !== 0) {
      for (const passedAddress of addresses) {
        if (!passedAddress) {
          logger.warn('Invalid passedAddress:', passedAddress);
          continue; // Skip to the next iteration
        }
      
      
        const normalizedAddress = passedAddress.toLowerCase();
        const matchingAddressEntry = addressTokenIds.find(([address]) => normalizedAddress === address.toLowerCase());
      
        if (matchingAddressEntry) {
          const [address, tokenIds] = matchingAddressEntry;
      
          logger.info(`Address_: ${address}, owns  ${tokenIds.length} Token IDs: ${tokenIds}`);

          if (!address) {
            logger.warn('Invalid address:', address);
            continue; // Skip to the next iteration
          }

          if (lastProcessedAddress && address !== lastProcessedAddress) {
            continue;
          }

          logger.info(`Processing address from addresses.json: ${address}`);

          if (tokenIds.length === 0) {
            logger.info(`No tokenIds found for address: ${address}`);
          } else {
            await this.createAddressTokenMetadata();
            logger.info(`Scraped tokens of address #${address}`);
          }

          lastProcessedAddress = address;
        }
      }
    }
  } catch (error) {
    logger.error('Error in doIt:', error);
  }
}


  async process() {
    try {
      await this.collectCollectionDetails();
      logger.info(`Scraping ${this.collectionName} collection (supply: ${this.collectionSupply})`);

      this.lastScrapedToken = await this.setupDirectoryByType('original');

      await this.doIt();

      const shouldContinue = await promptVerifyContinue(
        "Continue to populate all owners? (true/false)"
      );
      
      await this.populateAllAddressTokenMetadata();

        //await this.scrapeOriginalToken(this.lastScrapedToken + 1);
      
    } catch (error) {
      logger.error('Error in the processing:', error);
    }
  }
}
