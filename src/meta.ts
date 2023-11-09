import fs from "fs"; // Filesystem
import Jimp from "jimp"; // Image manipulation
import path from "path"; // Path
import axios from "axios"; // Requests
import { ethers } from "ethers"; // Ethers
import FormData from "form-data"; // Data sending
import { logger } from "./utils/logger"; // Logging
import { ERC721ABI } from "./utils/constants"; // Constants
import { promptVerifyContinue } from "./utils/prompt"; // Prompt
import { collectURILocation, URILocation } from "./utils/metadata"; // Metadata helpers
import { OwnedNftsResponse, Alchemy } from 'alchemy-sdk'; // Update to actual Alchemy SDK types
import { CONTRACT_ADDRESSES } from "@thirdweb-dev/sdk";
type AddressTokenIdsMap = {
  [address: string]: number[];
};

type TokenMetadata = {
  tokenId: number;
  metadata: Record<string, any>; // Type according to your metadata structure
};

type AddressMetadata = {
  [tokenId: number]: TokenMetadata;
};

type AddressTokenIds = {
  [address: string]: AddressMetadata;
};

// Define the types returned by the Alchemy SDK for better type handling
type NFTData = {
  contractAddress: string;
  tokenId: number;
  // Define other properties according to the response structure from the Alchemy SDK
};

type AddressTokenIds1 = {
    [contractAddress: string]: {
      [address: string]: {
      tokenId: number[];
      metadata: Record<number, TokenMetadata>;
    };
  };
};

const contractAddy = '0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3';
// Define the types for metadata and addressTokenIds
type MetadataPerAddress = Record<number, Record<string, any>>;
type AddressTokenIds2 = Record<string, number[]>;
type AllAddressesMetadata = Record<string, MetadataPerAddress>;

export default class Meta {
  // IPFS Gateway URL
  IPFSGateway: string;

  // Collection contract
  contract: ethers.Contract;

  // Collection details
  collectionName: string = "";
  collectionSupply: number = 0;

  // Scraping + flipping status
  lastScrapedToken: number = 0;

  /**
   * Initializes Flipper
   * @param {string} rpcURL to retrieve from
   * @param {string} IPFSGateway to retrieve from + store to
   * @param {string} contractAddress of collection
   */
  constructor(
    rpcURL: string,
    IPFSGateway: string,
    contractAddress: string
  ) {
    // Update IPFS Gateway
    this.IPFSGateway = IPFSGateway;
    // Initialize collection contract
    this.contract = new ethers.Contract(
      contractAddress,
      ERC721ABI,
      new ethers.providers.StaticJsonRpcProvider(rpcURL)
    );
  }
  allAddressTokenMetadata: Record<string, AddressMetadata[]> = {};

  /**
   * Collects collections name and totalSupply
   * Modifies collectionName and collectionSupply global variables
   */
  async collectCollectionDetails(): Promise<void> {
    this.collectionName = await this.contract.name();
    this.collectionSupply = await this.contract.totalSupply();
  }

    /**
   * Read Ethereum addresses from the 'addresses.json' file.
   * @returns {string[]} Array of Ethereum addresses.
   */
  readAddressesFromJSON(): string[] {
    try {
      const addressesJSON = fs.readFileSync("src/utils/addresses.json", "utf-8");
      return JSON.parse(addressesJSON);
    } catch (error) {
      logger.error("Error reading addresses from 'addresses.json':", error);
      return [];
    }
  }

  readFromJSON(): AddressTokenIdsMap {
    try {
      const addressTokenIdsJSON = fs.readFileSync("addressTokenIds.json", "utf-8");
      return JSON.parse(addressTokenIdsJSON);
    } catch (error) {
      logger.error("Error reading data from 'addressTokenIds.json':", error);
      return {};
    }
  }
        
      

  /**
   * Generates directory path based on collection contract address and subpath folder
   * @param {string} folder subpath to append ("original" || "flipped")
   * @returns {string} formatted directory full path
   */
  getDirectoryPath(folder: string): string {
    // `~/output/0x.../(original || flipped)`
    return path.join(__dirname, `../output/${this.contract.address}/${folder}`);
  }

  /**
   * Creates necessary folders in directories, as specified
   * Returns max id of token stored in JSON in full path
   * @param {string} path partial ("original" || "flipped")
   * @returns {number} max id of token stored in full path
   */
  setupDirectoryByType(path: string): number {
    // Collect paths for metadata + images folder
    const metadataFolder: string = this.getDirectoryPath(path);
    const metadataImagesFolder: string = metadataFolder + "/images";

    // Check if metadata images folder exists by path
    if (!fs.existsSync(metadataImagesFolder)) {
      // If does not exist, create folder
      fs.mkdirSync(metadataImagesFolder, { recursive: true });
      logger.info(`Initializing new ${path} metadata + images folder`);

      // Return 0 as currently synced index
      return 0;
    } else {
      // If folder does exist, collect all child filenames
      const folderFilenames: string[] = fs.readdirSync(metadataFolder);
      // Process filenames to find all tokenIds
      const tokenIds: number[] = folderFilenames.flatMap((filename: string) => {
        // Select filenames by .json extension
        if (filename.endsWith(".json")) {
          // Return tokenId number
          return Number(filename.slice(0, -5));
        }

        // Else, return empty (if not correct extension)
        return [];
      });

      // If at least 1 tokenId exists in folder
      if (tokenIds.length > 0) {
        // Set max tokenId and log
        const maxTokenId: number = Math.max(...tokenIds);
        logger.info(`${path} metadata folder exists till token #${maxTokenId}`);

        // Return max tokenId
        return maxTokenId;
      } else {
        // Log empty but existing folder
        logger.info(`${path} metadata folder exists but is empty`);

        // Return 0 as currently synced index
        return 0;
      }
    }
  }

  /**
   * Collects metadata from HTTP(s) url (expects JSON response)
   * @param {string} uri to retrieve from
   * @returns {Promise<Record<any, any>>} JSON response
   */
  async getHTTPMetadata(uri: string): Promise<Record<any, any>> {
    const { data } = await axios.get(uri);
    return data;
  }

  /**
   * Scrapes tokenId of contract
   * Saves metadata to /output/original/{tokenId}.json
   * Saves image to /output/original/images/{tokenId}.png
   * @param {number} tokenId to scrape
   */
  async scrapeOriginalToken(tokenId: number): Promise<void> {
    if (tokenId >= this.collectionSupply) {
      logger.info("Finished scraping original metadata");
      return;
    }
  
    const URI: string = await this.contract.tokenURI(tokenId);
    const { loc, URI: formattedURI } = collectURILocation(URI);
  
    let metadata: Record<any, any> = {};
    switch (loc) {
      case URILocation.IPFS:
        metadata = await this.getHTTPMetadata(`${this.IPFSGateway}${formattedURI}`);
        break;
      case URILocation.HTTPS:
        metadata = await this.getHTTPMetadata(formattedURI);
        break;
    }
  
    const baseFolder: string = this.getDirectoryPath("original");
    const tokenMetadataPath: string = `${baseFolder}/${tokenId}.json`;
  
    await fs.writeFileSync(tokenMetadataPath, JSON.stringify(metadata));
    logger.info(`Retrieved token #${tokenId}`);
    await this.scrapeOriginalToken(tokenId + 1);
  }
  async scrapeToken(address: string, tokenIds: number[]): Promise<void> {
    const metadataPerAddress: Record<number, Record<any, any>> = {};
  
    for (const tokenId of tokenIds) {
      const metadata = await this.scrapeTokenMetadata(tokenId);
      metadataPerAddress[tokenId] = metadata;
    }
  
    // Store metadata for the address
    const addressMetadataPath = `../output/addresses/${address}_metadata.json`;
    fs.writeFileSync(addressMetadataPath, JSON.stringify(metadataPerAddress));
  }
  
  async scrapeTokenMetadata(tokenId: number): Promise<Record<any, any>> {
    const URI = await this.contract.tokenURI(tokenId);
    const { loc, URI: formattedURI } = collectURILocation(URI);
  
    let metadata: Record<any, any> = {};
    switch (loc) {
      case URILocation.IPFS:
        metadata = await this.getHTTPMetadata(`${this.IPFSGateway}${formattedURI}`);
        break;
      case URILocation.HTTPS:
        metadata = await this.getHTTPMetadata(formattedURI);
        break;
    }
    return metadata;
  }
  

// Adjust the createMetadataForAddresses function
async createMetadataForAddresses(): Promise<void> {
  try {
    const addressesJSON = fs.readFileSync("src/utils/addresses.json", "utf-8");
    const addresses: string[] = JSON.parse(addressesJSON);

    const addressTokenIdsJSON = fs.readFileSync("addressTokenIds.json", "utf-8");
    const addressTokenIds: AddressTokenIds2 = JSON.parse(addressTokenIdsJSON);

    for (const address of addresses) {
      const tokenIds = addressTokenIds[address];
      await this.scrapeToken(address, tokenIds);
    }

    const allAddressesMetadata: AllAddressesMetadata = {};

    for (const address of addresses) {
      const addressMetadataPath = `../output/addresses/${address}_metadata.json`;
      const metadata = fs.readFileSync(addressMetadataPath, "utf-8");
      allAddressesMetadata[address] = JSON.parse(metadata);
    }

    const allAddressesMetadataPath = `../output/all_addresses_metadata.json`;
    fs.writeFileSync(allAddressesMetadataPath, JSON.stringify(allAddressesMetadata));
  } catch (error) {
    logger.error("Error scraping metadata for addresses:", error);
  }
}

  /**
   * Scrapes token metadata based on address and tokenId
   * @param {string} address - Ethereum address to filter tokens
   * @param {number} tokenId - Token ID to scrape
   */
  async scrapeOriginalTokenByAddress(address: string, tokenId: number): Promise<void> {
    if (tokenId >= this.collectionSupply) {
      logger.info(`Finished scraping original metadata for address ${address}`);
      return;
    }

    const tokenOwner = await this.contract.ownerOf(tokenId);
    if (tokenOwner !== address) {
      // If the token isn't owned by the specified address, proceed to the next token
      await this.scrapeOriginalTokenByAddress(address, tokenId + 1);
      return;
    }

    const URI: string = await this.contract.tokenURI(tokenId);
    const { loc, URI: formattedURI } = collectURILocation(URI);

    let metadata: Record<any, any> = {};
    switch (loc) {
      case URILocation.IPFS:
        metadata = await this.getHTTPMetadata(`${this.IPFSGateway}${formattedURI}`);
        break;
      case URILocation.HTTPS:
        metadata = await this.getHTTPMetadata(formattedURI);
        break;
    }

    // Store metadata in the 'allAddressTokenMetadata' object
    if (!this.allAddressTokenMetadata[address]) {
      this.allAddressTokenMetadata[address] = [];
    }

    // Retrieve existing metadata for this address or initialize an empty array
    const existingMetadata = this.allAddressTokenMetadata[address];
    
    const tokenMetadata: TokenMetadata = {
      tokenId,
      metadata
    };

    // Push the metadata for the current token ID to the existing metadata for this address
    existingMetadata.push(tokenMetadata);

    // Update the 'allAddressTokenMetadata' object
    this.allAddressTokenMetadata[address] = existingMetadata;

    logger.info(`Retrieved token #${tokenId} for address ${address}`);
    await this.scrapeOriginalTokenByAddress(address, tokenId + 1);
  }

  
  
    // Store address -> tokenIds -> Metadata
    addressTokenMetadata: AddressTokenIds = {};

    /**
     * Adds or updates the metadata of a token for a specific address
     * @param {string} address - Ethereum address
     * @param {number} tokenId - Token ID
     * @param {Record<string, any>} metadata - Metadata associated with the token
     */
    addAddressTokenMetadata(address: string, tokenId: number, metadata: Record<string, any>): void {
      if (!this.addressTokenMetadata[address]) {
        this.addressTokenMetadata[address] = {};
      }
  
      if (!this.addressTokenMetadata[address][tokenId]) {
        this.addressTokenMetadata[address][tokenId] = {
          tokenId: tokenId,
          metadata: metadata,
        };
      } else {
        // Update metadata for an existing token ID
        this.addressTokenMetadata[address][tokenId].metadata = metadata;
      }
    }
  
    /**
     * Get metadata for a token ID owned by a specific address
     * @param {string} address - Ethereum address
     * @param {number} tokenId - Token ID
     * @returns {Record<string, any> | undefined} - Metadata of the token
     */
    getAddressTokenMetadata(address: string, tokenId: number): Record<string, any> | undefined {
      if (this.addressTokenMetadata[address] && this.addressTokenMetadata[address][tokenId]) {
        return this.addressTokenMetadata[address][tokenId].metadata;
      }
      return undefined;
    }

    async scrapeOriginalTokenByAddress2(address: string, tokenId: number): Promise<void> {
      const addressTokenIds = await this.readFromJSON();
      const tokenIds = addressTokenIds[address] || [];
    
      if (tokenId < tokenIds.length) {
        const tokenOwner = address;
        const tokenId_ = tokenIds[tokenId];
    
        const URI: string = await this.contract.tokenURI(tokenId_);
        const { loc, URI: formattedURI } = collectURILocation(URI);
    
        let metadata: Record<any, any> = {};
        switch (loc) {
          case URILocation.IPFS:
            metadata = await this.getHTTPMetadata(`${this.IPFSGateway}${formattedURI}`);
            break;
          case URILocation.HTTPS:
            metadata = await this.getHTTPMetadata(formattedURI);
            break;
        }
    
        if (!this.addressTokenMetadata[address]) {
          this.addressTokenMetadata[address] = {};
        }
    
        if (!this.addressTokenMetadata[address][tokenId]) {
          this.addressTokenMetadata[address][tokenId] = {
            tokenId: tokenId,
            metadata: metadata,
          };
        } else {
          // Update metadata for an existing token ID
          this.addressTokenMetadata[address][tokenId].metadata = metadata;
        }
    
        await this.scrapeOriginalTokenByAddress2(address, tokenId + 1);
      } else {
        // When all tokenIds for this address are processed, save metadata
        const metadataPath = `../output/${address}_metadata.json`;
        fs.writeFileSync(metadataPath, JSON.stringify(this.addressTokenMetadata[address]));
    
        logger.info(`Metadata for address ${address} has been saved to ${metadataPath}`);
      }
    }
    

  /**
   * Until parity between scraped and flipped tokens, copy metadata and flip images
   */
  async postProcess(lastFlipped: number): Promise<void> {
    // If tokens to flip >= scraped tokens
    if (lastFlipped > this.lastScrapedToken) {
      // Revert with finished log
      logger.info("Finished generating flipped metadata");
      return;
    }

    // Collect folders
    const srcFolder: string = this.getDirectoryPath("original");
    const destFolder: string = this.getDirectoryPath("flipped");

    // Copy metadata JSON from src to dest
    await fs.copyFileSync(
      `${srcFolder}/${lastFlipped}.json`,
      `${destFolder}/${lastFlipped}.json`
    );

    // Read metadata image from src
    const image = await Jimp.read(`${srcFolder}/images/${lastFlipped}.png`);
    // Flip image horizontally and save to dest
    image.flip(true, false).write(`${destFolder}/images/${lastFlipped}.png`);

    // Log flip and process next tokenId
    logger.info(`Flipped token #${lastFlipped}`);
    await this.postProcess(lastFlipped + 1);
  }

  /**
   * Given a path to a folder and filetype, filter for all files of filetype
   * Then, if preprocessor provided, process all files of filetype
   * Else, push all files to a form data and publish to IPFS
   * @param {string} path of folder
   * @param {string} filetype to filter
   * @param {string} token Pinata JWT
   * @param {Function?} customPreProcess optional preprocesser for files
   * @returns {Promise<string>} IPFS hash of uploaded content
   */
  async pinContent(
    path: string,
    filetype: string,
    token: string,
    customPreProcess?: Function
  ): Promise<string> {
    // Collect all files at path
    const filenames: string[] = fs.readdirSync(path);
    // Filter all files for filetype
    const files: string[] = filenames.filter((filename: string) =>
      filename.endsWith(filetype)
    );

    // Setup data to post
    const formData = new FormData();
    // Push files to data
    for (const file of files) {
      // Run custom processing for each file, if provided
      if (customPreProcess) {
        await customPreProcess(file, path);
      }

      formData.append("file", fs.createReadStream(`${path}/${file}`), {
        // Truncate filepath to just name
        filepath: `output/${file}`
      });
    }

    // Post data
    const {
      // And collect IpfsHash of directory
      data: { IpfsHash }
    }: { data: { IpfsHash: string } } = await axios.post(
      // Post pinFileToIPFS
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      // With bulk data
      formData,
      {
        // Overload max body to allow infinite images
        maxBodyLength: Infinity,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
          Authorization: `Bearer ${token}`
        }
      }
    );

    // Return directory
    return IpfsHash;
  }

/**
 * Scrape original token metadata for a list of addresses.
 * @param {string[]} addresses - Array of Ethereum addresses to scrape.
 */
async scrapeOriginalTokensForAddresses(addresses: string[]): Promise<void> {
  for (const address of addresses) {
/*     logger.info(`Storing Metadata for address ${address}.`);
    await this.findAndStoreTokenIDsByAddress(address); */
    const addressMetadata = this.addressTokenMetadata[address];
    if (addressMetadata) {
      const dataToStore = JSON.stringify(addressMetadata);
      // Store the data for this address in a file
      fs.writeFileSync(`../output/${address}_metadata.json`, dataToStore);
      logger.info(`Metadata for address ${address} has been stored.`);
    } else {
      logger.info(`No metadata found for address ${address}.`);
    }
  }
}

/**
 * Finds token IDs owned by a specific address for a given contract
 * Stores this data in the 'addressTokenMetadata' object
 * @param {string} address - Ethereum address to filter tokens
 */
async findAndStoreTokenIDsByAddress(address: string): Promise<void> {
  const tokenBalance = await this.contract.totalSupply();

  for (let tokenId = 1; tokenId < tokenBalance; tokenId++) {
    const tokenOwner = await this.contract.ownerOf(tokenId);
    if (tokenOwner != address ) {
      logger.info(`Address ${address} does not own ${tokenId}.`);
    }
    if (tokenOwner === address) {
      const URI = await this.contract.tokenURI(tokenId);
      const { loc, URI: formattedURI } = collectURILocation(URI);

      let metadata: Record<any, any> = {};
      switch (loc) {
        case URILocation.IPFS:
          metadata = await this.getHTTPMetadata(`${this.IPFSGateway}${formattedURI}`);
          break;
        case URILocation.HTTPS:
          metadata = await this.getHTTPMetadata(formattedURI);
          break;
      }

      this.addAddressTokenMetadata(address, tokenId, metadata);
      logger.info(`Retrieved token #${tokenId} for address ${address}`);
    }
  }
}

  

  /**
   * Given a file path + name and IPFS image hash, modifies image path in file
   * @param {string} imageHash of flipped images
   * @param {string} filename of JSON metadata
   * @param {string} path to JSON metadata
   */
  async processJSON(
    imageHash: string,
    filename: string,
    path: string
  ): Promise<void> {
    // Read file
    const file: Buffer = await fs.readFileSync(`${path}/${filename}`);
    // Read data in file
    const data = JSON.parse(file.toString());
    // Overrwrite file with new image data
    await fs.writeFileSync(
      `${path}/${filename}`,
      JSON.stringify({
        ...data,
        // Overwrite image key with "ipfs://hash/tokenId"
        image: `ipfs://${imageHash}/${filename.slice(0, -5)}.png`
      })
    );
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
        console.error('No existing addressTokenIds.json file found.');
      }
  
      const totalSupply: number = await this.contract.totalSupply();
      logger.info(`Creating Map of ${totalSupply} tokenIds for contract ${contractAddy}`);
  
      for (let tokenId = startTokenId; tokenId <= totalSupply; tokenId++) {
        try {
          const tokenOwner: string = await this.contract.ownerOf(tokenId);
          logger.info(`Owner of tokenId: ${tokenId} for contract ${contractAddy} is ${tokenOwner}`);
          if (!addressTokenIds[tokenOwner]) {
            addressTokenIds[tokenOwner] = [tokenId];
          } else {
            addressTokenIds[tokenOwner].push(tokenId);
          }
  
          const addressTokenIdsJSON = JSON.stringify(addressTokenIds, null, 2);
          fs.writeFileSync('addressTokenIds.json', addressTokenIdsJSON);
          logger.info(`Saved progress up to tokenId ${tokenId} in addressTokenIds.json`);
        } catch (error) {
          console.error(`Error fetching owner of token #${tokenId}: ${error}`);
        }
      }
  
      logger.info('Address to Token IDs map saved to addressTokenIds.json');
      return addressTokenIds;
    } catch (error) {
      console.error('Error creating Address to Token IDs map:', error);
      return {}; // or handle the error based on your requirement
    }
  }
  
  
  /**
   * Processes scraping, flipping, and sav
   */
  async process() {
    // Collect and log collection details
    await this.collectCollectionDetails();
    logger.info(
      `Scraping ${this.collectionName} collection (supply: ${this.collectionSupply})`
    );

    // Setup output metadata folder
    this.lastScrapedToken = await this.setupDirectoryByType("original");

    // Scrape original token metadata
    await this.scrapeOriginalToken(this.lastScrapedToken + 1);
    
  const addresses = this.readAddressesFromJSON(); // Read addresses from the addresses.json file based on the flag
if (addresses.length != 0) {
  logger.info(`Scraping for addresses ${addresses.toString()}.`);

  for (const address of addresses) {
    const {tokenIDs} = this.readFromJSON(); // Read addresses from the addresses.json file based on the flag
    for (const tokenId of tokenIDs) {
    await this.scrapeOriginalTokenByAddress2(address, tokenId);
    }
    await this.findAndStoreTokenIDsByAddress(address);
    const addressMetadata = this.addressTokenMetadata[address];
    if (addressMetadata) {
      const dataToStore = JSON.stringify(addressMetadata);
      // Store the data for this address in a file
      fs.writeFileSync(`../output/${address}_metadata.json`, dataToStore);
      logger.info(`Metadata for address ${address} has been stored.`);
    } else {
      logger.info(`No metadata found for address ${address}.`);
    }
  }
  }

    const dataToStore = JSON.stringify(this.allAddressTokenMetadata);
    // Store the data for all addresses in a single file
    fs.writeFileSync(`../output/all_addresses_metadata.json`, dataToStore);
    logger.info(`Metadata for all addresses has been stored.`);
    
    // Po
    // Post-processing (move metadata and flip images)
    //await this.postProcess(this.lastFlippedToken + 1);

    // Post-processing (give time to make manual modifications)
    await promptVerifyContinue(
      "You can make modify the flipped metadata now. Continue? (true/false)"
    );
  }
  
}