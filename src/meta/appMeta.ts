import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { ERC721ABI } from '../utils/constants';
import { promptVerifyContinue } from '../utils/prompt';
import { collectURILocation, URILocation } from '../utils/metadata';
import { Alchemy, Network } from 'alchemy-sdk';
import { Address } from '@thirdweb-dev/sdk';
import _default from 'vuex';


interface Attribute {
    trait_type: string;
    value: string;
  }

  
interface AddressTokenIdsMap {
    [address: Address]: number[];
  }
  
interface TokenMetadata {
    metadata: Record<string, any>;
  }
  
  interface AllAddressesMetadata {
    [address: Address]: AddressMetadata;
  }
  
  interface AddressMetadata {
    ownerAddress: Address;
    tokenIds: number[];
    metadata: Record<number, TokenMetadata>;
    [key: string]: any; // Add this line to include an index signature
  }

export default class Bundler {

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

      async readFromJSON(): Promise<Address[]> {
        try {
          const addressesJSON: string = await fs.promises.readFile('src/utils/addresses.json', 'utf-8');
          const parseAdd: Address[] = JSON.parse(addressesJSON);
          return parseAdd;
        } catch (error) {
          logger.error("Error reading addresses from 'addresses.json':", error);
          return [];
        }
      }
    
      async readSanitizedFromJSON(): Promise<Address[]> {
        try {
          const addressesJSON: string = await fs.promises.readFile('src/utils/addresses.json', 'utf-8');
          const addresses: Address[] = JSON.parse(addressesJSON);
          
          // Ensure each element in the array is treated as a string
          const sanitizedAddresses = addresses.map(address => String(address).toLowerCase());
      
          return sanitizedAddresses;
        } catch (error) {
          logger.error("Error reading addresses from 'addresses.json':", error);
          return [];
        }
      }
      async readIndexedFromJSON(): Promise<{ index: number; address: Address }[]> {
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
          const addresses: Address[] = await this.readSanitizedFromJSON();
      
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
      
    
      readTokenIdsFromJSON(): string[] {
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
      
      readFullyParsedAddressTokenIdsFromJSON(): AllAddressesMetadata {
        try {
          const addressTokenIdsJSON = fs.readFileSync("addressTokenIds.json", "utf-8");
          const addressTokenIds: AllAddressesMetadata = JSON.parse(addressTokenIdsJSON);
          return addressTokenIds;
        } catch (error) {
          logger.error("Error reading addressTokenIds from 'addressTokenIds.json':", error);
          return {};
        }
      }

      async readAddressTokenMetadataFromJSON(filePath: string): Promise<AllAddressesMetadata> {
        try {
            const content = fs.readFileSync("addressTokenIds.json", "utf-8");
            return JSON.parse(content);
        } catch (error) {
          logger.error(`Error reading metadata from '${filePath}': ${error}`);
          return {};
        }
      }
      async processJson(outputFilePath: string = './src/meta/processedAddresses.json'): Promise<void> {
        try {
          const addresses: Address[] = await this.readFromJSON();
          const addressesIndexed = await this.readIndexedFromJSON();
          const addressesSanitized = await this.readSanitizedFromJSON();
          const addressTokens = await this.readTokenIdsFromJSON();
          const addressTokensIndexed = await this.readIndexedAddressTokenIdsFromJSON();
          const tokensIndexed: AllAddressesMetadata = await this.readFullyParsedAddressTokenIdsFromJSON();
        
          const processedData = {
/*             addressTokens,
            addressTokensIndexed,
            originalAddresses: addresses,
            indexedAddresses: addressesIndexed,
            sanitizedAddresses: addressesSanitized, */
            tokensIndexed,
          };
    
          // Convert the processed data to a JSON string
          //const jsonData = JSON.stringify(processedData, null, 2);
          //const jsonData = JSON.stringify(tokensIndexed, null, 2);
          const jsonData = tokensIndexed;

          // Write the JSON data to the specified output file
          const jsoned = JSON.stringify(jsonData, null, 2)
          await fs.writeFileSync(outputFilePath, jsoned);
          this.processAllAddressTokenMetadata1();
          console.log(`Processed data written to ${outputFilePath}: ${jsoned}`);
        } catch (error) {
          // Handle errors
          console.error('Error processing addresses:', error);
        }
      }
      async processAllAddressTokenMetadata1(): Promise<void> {
        const filePath = 'processedAddresses.json'; // Update with your actual file path
    
        try {
          const allAddressesTokenIdsMap = await this.readIndexedAddressTokenIdsFromJSON2();
    
          // Iterate over each owner address
          for (const ownerAddress in allAddressesTokenIdsMap) {
            const tokenIds = allAddressesTokenIdsMap[ownerAddress];
    
            // Fetch metadata for each token ID
            const metadataPromises = tokenIds.map(async (tokenId) => {
              try {
                const metadata = await this.contract.tokenURI(tokenId);
                return { [tokenId]: metadata };
              } catch (error) {
                logger.error(`Error fetching metadata for token ID ${tokenId}: ${error}`);
                return { [tokenId]: null };
              }
            });
    
            // Wait for all metadata promises to resolve
            const tokenMetadataList = await Promise.all(metadataPromises);
    
            // Construct the final metadata object for the owner address
            const ownerAddressMetadata: AddressMetadata = {
              ownerAddress,
              tokenIds,
              metadata: tokenMetadataList.reduce((acc, curr, ) => ({ ...acc, ...curr, }), {}),
            };
    
            // Process or store the ownerAddressMetadata as needed
            this.processTokenMetadata();
          }
        } catch (error) {
          console.error('Error processing address token metadata:', error);
        }
      }

      processOwnerAddressMetadata(ownerAddressMetadata: AddressMetadata): void {
        // Add your processing logic here
        // Example: Log the ownerAddressMetadata information
        console.log(ownerAddressMetadata);
      }

      async processAllAddressTokenMetadata(searchAttribute: string, filterValue: string): Promise<void> {
        const filePath = 'processedAddresses.json'; // Update with your actual file path
    
        try {
          const allAddressesTokenMetadataMap = await this.readAddressTokenMetadataFromJSON(filePath);
    
          // Iterate over each contract address
          for (const contractAddress in allAddressesTokenMetadataMap) {
            const ownerAddressesMap = allAddressesTokenMetadataMap[contractAddress];
    
            // Iterate over each owner address within the contract
            for (const ownerAddress in ownerAddressesMap) {
              const metadataMap = ownerAddressesMap[ownerAddress].metadata;
    
              // Iterate over token IDs and their metadata for each owner
              for (const tokenId in metadataMap) {
                const metadata = metadataMap[tokenId];
    
                // Filter tokens based on the specified attribute and value
                const attributeValue = metadata.metadata.attributes.find(
                  (attr: Attribute) => attr.trait_type === searchAttribute
                )?.value;
    
                if (attributeValue && attributeValue === filterValue) {
                  // Process or store the metadata as needed
                  await this.processTokenMetadata();
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing address token metadata:', error);
        }
      }
    
    
      async processTokenMetadata(): Promise<void> {
        const filePath = 'addressTokenIds.json'; // Update with your actual file path
          const allAddressesTokenMetadataMap = await this.readAddressTokenMetadataFromJSON(filePath);
        console.log(`OwnerMetadata: ${JSON.stringify(allAddressesTokenMetadataMap, null, 2)}`);
      }
    }