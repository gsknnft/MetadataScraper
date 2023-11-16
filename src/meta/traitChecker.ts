import fs from 'fs';
import path from 'path';
import ReadData, {  AllAddressesMetadata, AddressMetadata, TokenMetadata, Attribute, TokenId } from './readData'; // Assuming the file is in the same directory
import { logger } from '../utils/logger';
import { Songs, Song, Frame, Frames, FrameTrait, SongTrait, TraitType } from './traits'
import Meta, {deepEqual, AddressTokenIdsMap} from '../meta';
import { promptVerifyContinue } from '../utils/prompt';
import { Address } from 'web3';
import { check } from 'prettier';

export interface Condition {
  if: TraitType[] | Record<string, TraitType>;
  mustHave: TraitType[] | Record<string, TraitType>;
  requiredTokenIds?: number[];
  minTokenQuantity?: number;
  claimIndex?: number;
  quantity?: number;
  requiresOneSongAllColors?: boolean; // New property
  allSongsOneColor?: boolean; // New property
}


export interface TokenCollector {
  tokenIds: number[],
  claimIndex: Record<number, number>;
  claimed?: boolean;
}

interface ClaimsRecord {
  ownerAddress: Record<Address, Address>;
  claim: Record<any, ClaimableAddress>;
  conditionClaim: Record<string, Condition>;
  collected: Record<string, TokenCollector>,
}

export interface ClaimableAddress {
  address: Address;
  claimable: boolean;
  claimIndex?: number;
  quantity?: number;
}


const frameEqualizer: Record<string, string> = {
  "Daddy's Colors": "Frame",
  "Colors": "Frame",
  "Frame": "Frame",
};


const contractAddress: Address = process.env.CONTRACT || '0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3'

export const framesData: Frames = {
  color: Object.values(FrameTrait),
};


export const songsData: Songs = {
  songs: Object.values(SongTrait),
};

interface Traits {
  frame: FrameTrait;
  song: SongTrait
}


export class TraitChecker {
  private readData: ReadData;
  private songsData: Songs;
  private framesData: Frames;
  private conditions: Condition[] = [];
  private contractAddress: Address;

  constructor() {
    this.readData = new ReadData();
    this.songsData = songsData;
    this.framesData = framesData;
    this.contractAddress = process.env.CONTRACT || '0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3';
  }

  private async writeClaimsRecord(filePath: string, data: ClaimsRecord[]): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
      logger.info(`Claims record saved to ${filePath}`);
    } catch (error) {
      logger.error(`Error writing to ${filePath}:`, error);
    }
  }

  setSongsData(data: Songs): void {
    this.songsData = data;
  }

  setFramesData(data: Frames): void {
    this.framesData = data;
  }

  setConditions(conditions: Condition[]): void {
    this.conditions = conditions;
  }

  async getUniqueSongsArray(attributes: Attribute[]): Promise<string[]> {
    const uniqueSongs: Set<string> = new Set();
  
    for (const attribute of attributes) {
      if (attribute.trait_type === TraitType.Song) {
        uniqueSongs.add(attribute.value);
      }
    }
  
    return [...uniqueSongs];
  }


  async checkData() {
    const addressMetadata = await this.readData.readCollectedAddressData();
    const allAddressesData = await this.readData.readIndexedAddressesFromJSON();
    const allAddressTokenData = await this.readData.readIndexedAddressTokenIdsFromJSON();
    for (const ownerData of allAddressesData) {
      const owner = ownerData.address;
      const tokenIds = addressMetadata.tokenIds;
      for (const [address, tokenIds] of allAddressTokenData) {
        const IDs = tokenIds;
        const numTokens = IDs.length;
        if (address == owner) {
        for (const tokenId of tokenIds) {
          logger.info(`Checking Data: ${address}  ... ${JSON.stringify(IDs, null, 2)} ... ${numTokens}`);

        }
      }
    }
  }
}

  async checkCondition(
    addressMetadata: AddressMetadata,
    tokenMetadata: TokenMetadata,
    condition: Condition
  ): Promise<boolean> {
    const allAddressesData = await this.readData.readIndexedAddressesFromJSON();
    const allAddressTokenData = await this.readData.readIndexedAddressTokenIdsFromJSON();
    try {
      const normalizedTraitToCheck = await this.normalizeTraits(condition.if, TraitType.Song);
      const normalizedMustHave = await this.normalizeTraits(condition.mustHave, TraitType.Frame);
  
      logger.info(`normalizedTraitToCheck: ${JSON.stringify(normalizedTraitToCheck, null, 2)}`);
      logger.info(`normalizedMustHave: ${JSON.stringify(normalizedMustHave, null, 2)}`);
      // Check requiresOneSongAllColors condition
      if (condition.requiresOneSongAllColors) {
        logger.info('Checking requiresOneSongAllColors condition...');


        //this.checkData();

        for (const ownerData of allAddressesData) {
          const address = ownerData.address;
          const tokenIds = addressMetadata.tokenIds;
          const numTokens = tokenIds.length;
/*           let dataStorage = {
            tokenIds: tokenIds,
            metadata: {},
            attributes: {}
          }; */
          logger.info(`Checking Data: ${address}  ... ${JSON.stringify(tokenIds, null, 2)} ... ${numTokens}`);
          for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];


/*            for (const [address, tokenIds] of allAddressTokenData) {
            const numTokens = tokenIds.length;
            logger.info(`Checking Data: ${address}  ... ${JSON.stringify(tokenIds)} ... ${numTokens}`);
            for (const tokenId of tokenIds) {
 */

            logger.info(`Checking ${tokenId}...`);
        
            const data = addressMetadata.metadata[tokenId].metadata;
        

            if (data) {
              const attributes = data.attributes;
/*               dataStorage = {
                tokenIds: tokenIds,
                metadata: data,
                attributes: attributes
              } */
              //logger.info(`DataStore: ${JSON.stringify([dataStorage], null, 2)}`);

              // Check if tokenMetadata.attributes is defined before using .some()
              const tokenHasValidFrame = attributes && attributes.some(
                (attribute) => frameEqualizer[attribute.trait_type] === TraitType.Frame
              );
  
              const uniqueSongs = await this.getUniqueSongs(attributes);
              const uniqueFrames = await this.getUniqueFrames(attributes);
              logger.info(`uniqueSongs: ${JSON.stringify([...uniqueSongs], null, 2)}`);
              logger.info(`uniqueFrames: ${JSON.stringify([...uniqueFrames], null, 2)}`);
  
              // Check for the presence of required traits
              if (
                condition.requiresOneSongAllColors &&
                normalizedTraitToCheck.includes(TraitType.Song) &&
                normalizedMustHave.includes(TraitType.Frame)
              ) {
                if (
                  (condition.requiresOneSongAllColors && tokenHasValidFrame) ||
                  (condition.allSongsOneColor && tokenHasValidFrame)
                ) {
                  // Additional conditions for requiresOneSongAllColors
  
                  const hasAllColors = attributes
                    .filter((attribute) => frameEqualizer[attribute.trait_type] === TraitType.Frame)
                    .every((attribute) => {
                      const correspondingSong = attributes.find(
                        (attr) => attr.trait_type === TraitType.Song && attr.value === attribute.value
                      );
                      return correspondingSong !== undefined;
                    });
  
                  for (const songAttribute of attributes.filter(attribute => attribute.trait_type === TraitType.Song)) {
                    const songValue = songAttribute.value;
  
                    // Check if the song is present in all frame colors
                    const hasAllColors = attributes
                      .filter(frameAttribute => frameEqualizer[frameAttribute.trait_type] === TraitType.Frame)
                      .every(frameAttribute => {
                        // Check if there is a corresponding song with the same value
                        const correspondingSong = attributes.find(
                          attr => attr.trait_type === TraitType.Song && attr.value === frameAttribute.value
                        );
  
                        return correspondingSong !== undefined;
                      });
  
                    logger.info(`Song ${songValue} - HasAllColors: ${hasAllColors}`);
                    logger.info(`Owner ${address} HasAllColors: ${hasAllColors} of Song ${songValue}`);
                    if (hasAllColors) {
                      const traitConditionMet = await this.checkCondition(
                        addressMetadata,
                        tokenMetadata,
                        { if: normalizedTraitToCheck, mustHave: normalizedMustHave }
                      );
  
                      if (traitConditionMet) {
                        await this.markAndSave({ addressMetadata, traitConditionMet });
                        logger.info('Claimable address:', address); // Log the claimable address
                      }
                    }
                  }
                }
              }
  
              if (
                condition.allSongsOneColor &&
                normalizedTraitToCheck.includes(TraitType.Frame) &&
                normalizedMustHave.includes(TraitType.Song)
              ) {
                // Additional conditions for allSongsOneColor
  
                for (const frameAttribute of tokenMetadata.attributes.filter(
                  (attribute) => attribute.trait_type === TraitType.Frame
                )) {
                  const frameColor = frameAttribute.value;
  
                  // Check if the frame color is present in all songs
                  const hasAllSongs = tokenMetadata.attributes
                    .filter((songAttribute) => frameEqualizer[songAttribute.trait_type] === TraitType.Song)
                    .every((songAttribute) => {
                      // Check if there is a corresponding song with the same value
                      const correspondingSong = tokenMetadata.attributes.find(
                        (attr) => attr.trait_type === TraitType.Song && attr.value === songAttribute.value
                      );
  
                      return correspondingSong !== undefined;
                    });
  
                  logger.info(`Frame Color ${frameColor} - HasAllSongs: ${hasAllSongs}`);
                  logger.info(`Owner ${address} HasAllSongs: ${hasAllSongs} of Frame Color ${frameColor}`);
                  if (hasAllSongs) {
                    const traitConditionMet = await this.checkCondition(
                      addressMetadata,
                      tokenMetadata,
                      { if: normalizedTraitToCheck, mustHave: normalizedMustHave }
                    );
  
                    if (traitConditionMet) {
                      await this.markAndSave({ addressMetadata, traitConditionMet });
                      logger.info('Claimable address:', address); // Log the claimable address
                    }
                  }
                }
              }
            }
          
      // Check for required token IDs
      if (condition.requiredTokenIds && condition.requiredTokenIds.length > 0) {
        const hasRequiredTokenIds = condition.requiredTokenIds.some((tokenId) =>
          addressMetadata.tokenIds.includes(tokenId)
        );
  
        if (hasRequiredTokenIds) {
            logger.info(`address: ${addressMetadata.ownerAddress} satisfies requirements of holding one of ${condition.requiredTokenIds} - ${tokenId}`);
          } else {
          return false;
          }
        }
      }
              // Check for minimum token quantity
      if (condition.minTokenQuantity !== undefined) {
        const tokenQuantity = addressMetadata.tokenIds.length;
        if (tokenQuantity >= condition.minTokenQuantity) {
          logger.info(`address: ${addressMetadata.ownerAddress} satisfies requirements of holding enough of ${condition.minTokenQuantity} - ${tokenQuantity}`);
        } else {
          return false;
        }
      }
      logger.info('No conditions met for address:', address, tokenIds);
      }
    }

    } catch (error) {
      logger.error('Error in checkCondition:', error);
      return false;
    }
  
    return false;
  }
  
  
  
private normalizeTraits(traits: TraitType[] | Record<string, TraitType>, defaultTrait: TraitType): Promise<TraitType[]> {
  if (!traits) {
    // If traits is undefined, return an empty array as a promise
    return Promise.resolve([]);
  }

  if (this.isTraitTypeArray(traits)) {
    // If it's already an array, return it as a promise
    return Promise.resolve(traits);
  } else {
    // If it's an object, convert it to an array and return as a promise
    const traitArray: TraitType[] = Object.values(traits).map(trait => frameEqualizer[trait] as TraitType || defaultTrait);
    return Promise.resolve(traitArray);
  }
}

// Custom type guard function
private isTraitTypeArray(value: TraitType[] | Record<TraitType, string>): value is TraitType[] {
  return Array.isArray(value);
}
  
async getUniqueSongs(attributes: Attribute[]): Promise<string[]> {
  const songTraitType = TraitType.Song;
  const songValues = attributes
    .filter((attribute) => attribute.trait_type === songTraitType)
    .map((attribute) => attribute.value);

  return [...songValues];
}

async getUniqueFrames(attributes: Attribute[]): Promise<string[]> {
  const frameTraitType = TraitType.Frame;
  const frameValues = attributes
    .filter((attribute) => attribute.trait_type === frameTraitType)
    .map((attribute) => attribute.value);

  return [...frameValues];
}

  private hasRequiredTokenIds(requiredTokenIds: number[], tokenIds: number[]): boolean {
    return requiredTokenIds && requiredTokenIds.length > 0 && !requiredTokenIds.every((tokenId) => tokenIds.includes(tokenId));
  }
  
  private hasMinTokenQuantity(minTokenQuantity: number | undefined, tokenIds: number[]): boolean {
    return minTokenQuantity !== undefined && tokenIds.length < minTokenQuantity;
  }
  

  async checkSingleCondition(
    tokenMetadata: TokenMetadata,
    condition: Condition,
  ): Promise<void> {
    const { if: traitToCheck, mustHave, requiresOneSongAllColors, allSongsOneColor, requiredTokenIds, minTokenQuantity, claimIndex, quantity } = condition;
    const addressMetadata: AddressMetadata = await this.readData.readCollectedAddressData();
    try {
      const normalizedTraitToCheck = await this.normalizeTraits(condition.if, TraitType.Song);
      logger.info(`normalizedTraitToCheck: ${JSON.stringify(normalizedTraitToCheck, null, 2)}`);
  
      const normalizedMustHave = await this.normalizeTraits(condition.mustHave, TraitType.Frame);
      logger.info(`normalizedMustHave: ${JSON.stringify(normalizedMustHave, null, 2)}`);
  
      const traitConditionMet = await this.checkCondition(
        addressMetadata,
        tokenMetadata,
        { if: normalizedTraitToCheck, mustHave: normalizedMustHave }
      );
      const uniqueFrames = await this.getUniqueFrames(tokenMetadata.attributes);
      logger.info(`uniqueFrames: ${JSON.stringify([...uniqueFrames], null, 2)}`);
  
      // Collect all unique songs owned by the owner
      const uniqueSongs = await this.getUniqueSongsArray(tokenMetadata.attributes);
      logger.info(`Normalized Trait to Check: ${normalizedTraitToCheck}`);
      logger.info(`Normalized Must Have: ${normalizedMustHave}`);
      logger.info(`Unique Songs: ${[...uniqueSongs]}`);
      logger.info(`Unique Frames: ${[...uniqueFrames]}`);
      logger.info(`Token Metadata: ${JSON.stringify(tokenMetadata), null, 2}`);
      const songTraitType = TraitType.Song;
      const frameTraitType = TraitType.Frame;
      // Check requiresOneSongAllColors condition
      logger.info('Checking requiresOneSongAllColors condition...');
      if (requiresOneSongAllColors) {
        const hasAllColors = tokenMetadata.attributes
        .filter((attribute) => attribute.trait_type === frameTraitType)
        .every((attribute) => {
          const correspondingSong = tokenMetadata.attributes.find(
            (attr) => attr.trait_type === songTraitType && attr.value === attribute.value
          );
          return correspondingSong;
        });
  
        if (hasAllColors) {
          await this.markAndSave({addressMetadata, traitConditionMet, claimIndex, quantity});
          logger.info('Claimable address:', addressMetadata.ownerAddress); // Log the claimable address
        }
      }
  
      logger.info('Checking allSongsOneColor condition...');
  
      if (allSongsOneColor) {
        const songNames: string[] = (this.songsData?.songs || []) as string[];
        const hasOneColor = songNames.every((songName: string) =>
          tokenMetadata.attributes.some(
            (attribute) => attribute.trait_type === frameTraitType && attribute.value === songName
          )
        );
  
        if (hasOneColor) {
          await this.markAndSave({addressMetadata, traitConditionMet, claimIndex, quantity});
          logger.info('Claimable address:', addressMetadata.ownerAddress); // Log the claimable address
        }
      }
  
      if (!traitConditionMet) {
        return;
      }
  
      // Check for required token IDs
      let _tokenId: number;
      if (requiredTokenIds && requiredTokenIds.length > 0) {
        const hasRequiredTokenIds = requiredTokenIds.some((tokenId) =>
          addressMetadata.tokenIds.includes(tokenId)
        );
        if (hasRequiredTokenIds) {
          const tokenIds: number[] = addressMetadata.tokenIds;
          for (_tokenId of tokenIds)
            logger.info(`address: ${addressMetadata.ownerAddress} satisfies requirements of holding one of ${requiredTokenIds} - ${_tokenId}`);
        } else {
          return;
        }
      }
  
      // Check for minimum token quantity
      if (minTokenQuantity !== undefined) {
        const tokenQuantity = addressMetadata.tokenIds.length;
        if (tokenQuantity < minTokenQuantity) {
          return;
        }
      }
  
      await this.markAndSave({addressMetadata, traitConditionMet, claimIndex, quantity});
      logger.info('Claimable address:', addressMetadata.ownerAddress); // Log the claimable address
      logger.info('End of checkSingleCondition');
    } catch (error) {
      logger.error('Error in checkSingleCondition:', error);
    }
  }
  

  async markAndSave({
    addressMetadata,
    traitConditionMet,
    claimIndex,
    quantity,
  }: {
    addressMetadata: AddressMetadata;
    traitConditionMet: boolean;
    claimIndex?: number;
    quantity?: number;
  }): Promise<void> {
    if (traitConditionMet) {
      // Mark and save logic here
      const claimableAddress: ClaimableAddress = {
        address: addressMetadata.ownerAddress,
        claimable: true,
        claimIndex,
        quantity,
      };
      logger.info(`Marking and Saving: ${JSON.stringify(claimableAddress, null, 2)}`);
      // Save the claimable address
      await this.saveClaimableAddress(claimableAddress);
    }
  }
  
  async saveClaimableAddress(claimableAddress: ClaimableAddress): Promise<void> {
    // Logic to save the claimable address, you can modify this based on your requirements
    try {
      const existingClaimableAddresses: ClaimableAddress[] = await this.readExistingClaimableAddresses();
      const newClaimableAddresses: ClaimableAddress[] = [...existingClaimableAddresses, claimableAddress];
      await fs.promises.writeFile('./claimableAddresses.json', JSON.stringify(newClaimableAddresses, null, 2));
      logger.info(`Claimable Address Saved: ${JSON.stringify(claimableAddress, null, 2)}`);
    } catch (error) {
      logger.error('Error saving claimable address:', error);
    }
  }
    
  private checkArrayCondition(attributes: Attribute[], traitToCheck: string): boolean {
    return attributes?.some((attribute) =>
      attribute.trait_type === TraitType.Frame && traitToCheck.includes(attribute.value)
    ) || false;
  }
  
  async checkNestedCondition(
    addressData: AddressMetadata,
    tokenMetadata: TokenMetadata,
    attribute: Attribute,
    nestedCondition: Condition
  ): Promise<boolean> {
    try {
    return await this.checkCondition(addressData, tokenMetadata, nestedCondition);
    } catch (error) {
      throw new Error(`${error}`);
    }
  }

  async checkConditions(
    tokenMetadata: TokenMetadata,
    addressData: AddressMetadata,
    attribute: Attribute,
    conditions: Condition[]
  ): Promise<boolean> {
        try {
    const _conditions = conditions.every((condition) =>
      this.checkNestedCondition(addressData, tokenMetadata, attribute, condition)
    );
    return _conditions;
  } catch (error) {
    throw new Error(`${error}`);
  }
  }

  async processTokenConditions(
    tokenMetadata: TokenMetadata,
    addressData: AddressMetadata,
    attribute: Attribute,
    conditions: Condition[]
  ): Promise<ClaimableAddress[]> {
    try {
    const processedAddresses = await Promise.all(
      conditions.map(async (condition) => {
        const isClaimable = await this.checkNestedCondition(addressData, tokenMetadata, attribute, condition);
        if (isClaimable) {
          return {
            address: addressData.ownerAddress,
            claimable: true,
            claimIndex: condition.claimIndex,
            quantity: condition.quantity,
          };
        }
        return null;
      })
    );
    return processedAddresses.filter((result) => result !== null) as ClaimableAddress[];
  } catch (error) {
    throw new Error(`${error}`);
  }
}
  
  async processConditions(
    allAddressesData: AllAddressesMetadata,
    addressData: AddressMetadata,
    tokenMetadata: TokenMetadata,
    attribute: Attribute,
    conditions: Condition[]
  ): Promise<ClaimableAddress[]> {
    try {
    const processedAddresses = await Promise.all(
      conditions.map(async (condition) => {
        const isClaimable = await this.checkNestedCondition(addressData, tokenMetadata, attribute, condition);
        if (isClaimable) {
          return {
            address: addressData.ownerAddress,
            claimable: true,
            claimIndex: condition.claimIndex,
            quantity: condition.quantity,
          };
        }
        return null;
      })
    );
    return processedAddresses.filter((result) => result !== null) as ClaimableAddress[];
  } catch (error) {
    throw new Error(`${error}`);
  }
  }
  

  private async checkTraitsAndMarkClaimable(
    conditions: Condition[]
  ): Promise<ClaimableAddress[]> {
    logger.info(`Starting check`);
    try {
      const allAddressesData: AllAddressesMetadata = await this.readData.readCollectedData();
      const addressMetadata: AddressMetadata = await this.readData.readCollectedAddressData();
      const existingClaimableAddresses: ClaimableAddress[] = await this.readExistingClaimableAddresses();
      const claimableAddresses: ClaimableAddress[] = [];
      const processTasks: Promise<ClaimableAddress[]>[] = [];
      const tokenMetadata: TokenMetadata = await this.readData.readCollectedTokenData();

      for (const [contractAddress, ownerAddressesData] of Object.entries(allAddressesData)) {
        for (const [ownerAddress, addressData] of Object.entries(ownerAddressesData)) {
          const owner = ownerAddress;
          const tokenIds = addressData.tokenIds;
          const metadata = addressData.metadata;

          if (Array.isArray(tokenIds)) {
            for (const tokenId of tokenIds) {
              const attributes = metadata[tokenId].metadata.attributes;
              //const att = tokenMetadata.attributes;
              for (const attribute of attributes) {
                const currentAttribute: Attribute = attribute;
                for (const condition of conditions) {
                  const checkAddresses = await this.checkCondition(addressMetadata, tokenMetadata, condition);
                  if (checkAddresses) {
                    logger.info(`AddressCheck completed ${checkAddresses}`)
                  }
                }
                processTasks.push(this.processContractOwners(tokenMetadata, allAddressesData, currentAttribute, conditions));
              }
            }
          } else {
            logger.error('tokenIds is not an array:', tokenIds);
          }
        }
      }
      
      const processResults = await Promise.all(processTasks);
      const newClaimableAddresses = processResults.flat();
      claimableAddresses.push(...newClaimableAddresses);
    
      const hasChanges = !await this.areArraysEqual(
        existingClaimableAddresses,
        claimableAddresses
      );
    
      if (hasChanges) {
        await this.saveToFile(
          `./${this.contractAddress.toLowerCase()}_claimableAddresses.json`,
          claimableAddresses
        );
    
        logger.info(`File Changed + Updated`);
      }
      logger.info(`Claimable Addresses: ${JSON.stringify(claimableAddresses, null, 2)}`);
      return claimableAddresses;
    } catch (error) {
      // Log specific details about the error, including contract address, condition, attribute, etc.
      logger.error('Error checking traits and marking claimable:', error);
      throw error; // Rethrow the error if needed
    }
  }
  

  async processOwnerTokens(
    tokenMetadata: TokenMetadata,
    addressData: AddressMetadata,
    attribute: Attribute,
    conditions: Condition[]
  ): Promise<ClaimableAddress[]> {
    const claimableAddresses: ClaimableAddress[] = [];
  
    const tokenIds: number[] = addressData.tokenIds;
    for (const tokenId of tokenIds) {
      const processedAddresses = await this.processTokenConditions(
        tokenMetadata,
        addressData,
        attribute,
        conditions
      );
  
      claimableAddresses.push(...processedAddresses);
    }
    return claimableAddresses;
  }
  
  async processContractOwners(
    tokenMetadata: TokenMetadata,
    allAddressesData: AllAddressesMetadata,
    attribute: Attribute,
    conditions: Condition[]
  ): Promise<ClaimableAddress[]> {
    const claimableAddresses: ClaimableAddress[] = [];
    const ownerAddressesData = allAddressesData[contractAddress];
  
    for (const ownerAddress in ownerAddressesData) {
      const addressData: AddressMetadata = ownerAddressesData[ownerAddress];
      const processedAddresses = await this.processOwnerTokens(
        tokenMetadata,
        addressData,
        attribute,
        conditions
      );
  
      claimableAddresses.push(...processedAddresses);
    }
  
    return claimableAddresses;
  }
  
  

  async readExistingClaimableAddresses(): Promise<ClaimableAddress[]> {
    try {
      const filePath = `./${this.contractAddress.toLowerCase()}_claimableAddresses.json`;
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent) as ClaimableAddress[];
    } catch (error) {
      // Handle the case when the file doesn't exist or cannot be read
      throw new Error(`Error Reading Claimable Addresses in claimable Addresses; ${error}`)
    }
  }
  
  
  async areArraysEqual(array1: any[], array2: any[]): Promise<boolean> {
    try {
    if (array1.length !== array2.length) {
      return false;
    }
  
    // Compare each element in the arrays
    try {
      for (let i = 0; i < array1.length; i++) {
        if (!(await deepEqual(array1[i], array2[i]))) {
          return false;
        }
      }
      return true;
    } catch (error) {
      // Handle errors, e.g., log or throw
      logger.error('Error comparing arrays:', error);
      return false;
      }
    } catch (error) {
      logger.error('Error comparing arrays:', error);
      return false; // Or throw an error depending on your use case
    }
  }
  

  private async saveToFile(
    filePath: string,
    data: ClaimableAddress[]
  ): Promise<void> {
    try {
      const existingData: ClaimableAddress[] = await this.readExistingClaimableAddresses();
      const newData: ClaimableAddress[] = [...existingData, ...data];
      
      await fs.promises.writeFile(filePath, JSON.stringify(newData, null, 2));
      logger.info(`Results saved to ${filePath}`);
    } catch (error) {
      logger.error(`Error writing to ${filePath}:`, error);
    }
  }
   
  async runChecker(conditionsToCheck: Condition[] = []): Promise<ClaimableAddress[]> {
    try {
      logger.info('Starting Checker.');
      const addressMetadata: AddressMetadata = await this.readData.readCollectedAddressData();
      const tokenMetadata: TokenMetadata = await this.readData.readCollectedTokenData();
      logger.info(`
        SongData Data: ${JSON.stringify(songsData.songs, null, 2)},
        FramesData: ${JSON.stringify(framesData.color, null, 2)}.
        `);
  
      const conditions: Condition[] = [
        {
          if: [TraitType.Song],  // Use enum values instead of strings
          mustHave: [TraitType.Frame],  // Use enum values instead of strings
          requiresOneSongAllColors: true,
          claimIndex: 1,
          quantity: 1,
        },
        {
          if: [TraitType.Frame],  // Use enum values instead of strings
          mustHave: [TraitType.Song],  // Use enum values instead of strings
          allSongsOneColor: true,
          claimIndex: 2,
          quantity: 1,
        },
      ];
      
  
      conditionsToCheck = conditionsToCheck.length === 0 ? conditions : conditionsToCheck;
      logger.info(`Using conditions:\n${JSON.stringify(conditionsToCheck, null, 2)}`);
      logger.info(`Checking and Marking:`)
      
      try {
      const checkedAddresses = await this.checkTraitsAndMarkClaimable(conditionsToCheck);
      logger.info(`Checker completed. Checked Addresses: ${checkedAddresses}`);
      await this.saveToFile(`./${this.contractAddress.toLowerCase()}_claimableAddresses.json`, checkedAddresses);
      logger.info(`Checker completed. Saved Checked Addresses to File: ${checkedAddresses}`);
      return checkedAddresses;
    } catch (error) {
      throw new Error(`Something went wrong Checking Addresses: ${error}`);
    }
    } catch (error) {
      throw new Error(`Something went wrong: ${error}`);
    }
  }
  
}


/*   

  private async processAndWriteClaimsRecord(
    allAddressesData: AllAddressesMetadata,
    conditions: Condition[],
    tokenMetadata: TokenMetadata
  ): Promise<void> {
    try {
      const processedResults = await Promise.all(
        Object.entries(allAddressesData).map(async ([contractAddress, ownerAddressesData]) => {
          const claimableAddresses = await this.processContractOwners(tokenMetadata, allAddressesData, contractAddress, conditions);
          return {
            contractAddress,
            claimableAddresses,
          };
        })
      );

      const claimsRecord: ClaimsRecord = {
        ownerAddress: {},
        claim: {},
        conditionClaim: {},
        collected: {},
      };

      processedResults.forEach(({ contractAddress, claimableAddresses }) => {
        claimableAddresses.forEach((claimableAddress) => {
          claimsRecord.ownerAddress[contractAddress] = claimsRecord.ownerAddress[contractAddress] || {};
          claimsRecord.ownerAddress[contractAddress][claimableAddress.address] = claimableAddress.address;

          claimsRecord.claim[claimableAddress.address] = claimableAddress;
        });
      });

      await this.writeClaimsRecord('./claimsRecord.json', [claimsRecord]);
    } catch (error) {
      logger.error(`Error processing and writing claims record: ${error}`);
    }
  }




private checkObjectCondition(attributes: Attribute[], traitToCheck: Record<string, string>, mustHave: Record<string, string>): boolean {
    return Object.entries(mustHave).every(([frameColor, frameTrait]) =>
      attributes.some((attribute: Attribute) =>
        attribute.trait_type === TraitType.Frame &&
        attribute.value === frameColor &&
        attributes.some((attr: Attribute) =>
          attr.trait_type === TraitType.Song && attr.value === frameTrait
        )
      )
    );
  }   */

