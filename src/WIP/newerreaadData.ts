const fs = require('fs');
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
import { isDeepStrictEqual } from 'util';
import Meta, {} from '../meta';

export interface Attribute {
  trait_type: string;
  value: string;
}

export interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Attribute[];
}

export interface TokenId {
  metadata: TokenMetadata;
}

export interface AddressMetadata {
  ownerAddress: string;
  tokenIds: number[];
  metadata: Record<number, TokenId>;
}

export interface AllAddressesMetadata {
  [contractAddress: string]: Record<string, AddressMetadata>;
}

  
export default class ReadData {

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

  async readCollectedData(): Promise<AllAddressesMetadata> {
    const contract = process.env.CONTRACT || '';
    try {
      const addressTokenIdsPath = path.join(__dirname,`${contract}_collected_metadata.json`);
      const addressTokenIdsJSON = await fs.promises.readFile(addressTokenIdsPath, 'utf-8');
      const addressTokenIds: AllAddressesMetadata = JSON.parse(addressTokenIdsJSON);
      return addressTokenIds;
    } catch (error) {
      logger.error("Error reading addressTokenIds from '_collected_metadata.json':", error);
      return {};
    }
  }

  async readAndExtractData(): Promise<AllAddressesMetadata> {
    let allAddressesData: AllAddressesMetadata = {};
    try {
      const data = await this.readCollectedData();
  
      for (const contractAddress in data) {
        if (data.hasOwnProperty(contractAddress)) {
          logger.info(`
            Checking ${contractAddress} for ${Object.keys(data[contractAddress]).length} owners
            Contract: ${contractAddress.toLowerCase()}.
          `);
  
          const ownerAddressesData = data[contractAddress];
  
          for (const ownerAddress in ownerAddressesData) {
            if (ownerAddressesData.hasOwnProperty(ownerAddress)) {
              const addressData = ownerAddressesData[ownerAddress];
              const ownerAddressValue = addressData.ownerAddress;
              const tokenIds = addressData.tokenIds;
  
              logger.info(`
                Checking ${ownerAddressValue} for ${JSON.parse(
                  JSON.stringify(tokenIds, null, 2)
                )} tokens
                Contract: ${contractAddress.toLowerCase()}.
              `);
  
              if (tokenIds && Array.isArray(tokenIds) && tokenIds.length > 0) {
                const extractedMetadata: AddressMetadata = {
                  ownerAddress: ownerAddressValue,
                  tokenIds: [],
                  metadata: {},
                };
  
                for (const tokenIdStr of tokenIds) {
                  const tokenId = Number(tokenIdStr);
  
                  if (!isNaN(tokenId)) {
                    const tokenMetadataIndex = addressData.metadata[tokenId];
  
                    if (tokenMetadataIndex) {
                      const tokenMetadata = tokenMetadataIndex.metadata;
  
                      if (tokenMetadata) {
                        const attributes: Attribute[] = tokenMetadata.attributes;
                        const extractedTokenMetadata: TokenMetadata = {
                          name: tokenMetadata.name,
                          description: tokenMetadata.description,
                          image: tokenMetadata.image,
                          attributes: attributes,
                        };
  
                        extractedMetadata.metadata[tokenId] = {
                          metadata: extractedTokenMetadata,
                        };
                        extractedMetadata.tokenIds.push(tokenId);
                      }
                    }
                  }
                }
  
                if (!allAddressesData[contractAddress]) {
                  allAddressesData[contractAddress] = {};
                }
  
                allAddressesData[contractAddress][ownerAddress] = extractedMetadata;
              }
            }
          }
        }
      }
  
/*       logger.info(`
        AllMeta: ${JSON.stringify(allAddressesData, null, 2)}.
      `); */ 
      const contract = process.env.CONTRACT || '0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3';
     // const _path_ = path.resolve(__dirname, `${contract}_collected_metadata.json`);
      const _path = path.resolve(__dirname, 'reprocessedTokenIds.json');
      //await fs.promises.writeFile(_path, JSON.stringify(allAddressesData, null, 2));
      //await fs.promises.writeFile(_path_, JSON.stringify(allAddressesData, null, 2));
      logger.info(`allMetaSaved`)
      return allAddressesData;
    } catch (error) {
      console.error('Error reading or extracting data:', error);
      return allAddressesData;
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
  async readIndexedAddressTokenIdsFromJSON(): Promise<[Address, number[]][]> {
    try {
      const addressTokenIdsJSON = await fs.promises.readFile('addressTokenIds.json', 'utf-8');
      // Parse the content as JSON, which results in an object
      const parsedObject = JSON.parse(addressTokenIdsJSON);
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
}



/// THIS ONE!!!!!!!!!!!!