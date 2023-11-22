import fs from 'fs';
//import path from 'path';
import ReadData, {  AllAddressesMetadata, AddressMetadata, TokenMetadata, Attribute } from './readData'; // Assuming the file is in the same directory
import { logger } from '../utils/logger';
import { Songs, Song, Frame, Frames, TraitsData, Traits, FrameTrait, SongTrait, TraitType, framesData, songsData, framesDataSet, songsDataSet, frameEqualizer } from './traits'
import Meta, {deepEqual} from '../meta';
import { Address } from 'web3';

enum ClaimIndex {
  OneSongAllColors = 1,
  AllSongsOneColor = 2,
  // Add more indices as needed
}

export interface Condition {
  if: TraitType[] | Record<string, TraitType>;
  mustHave: TraitType[] | Record<string, TraitType>;
  requiredTokenIds?: number[];
  minTokenQuantity?: number;
  claimIndex?: ClaimIndex;
  quantity?: number;
  requiresOneSongAllColors?: boolean; // New property
  allSongsOneColor?: boolean; // New property
}


export interface TokenCollector {
  tokenIds: number[],
  claimIndex: Record<number, ClaimIndex>;
  claimed?: boolean;
}

interface ClaimsRecord {
  ownerAddress: Record<Address, Address>;
  claim: Record<any, ClaimableAddress>;
  conditionClaim: Record<string, Condition>;
  collected: Record<string, TokenCollector>,
}
export interface ClaimAddress {
  address: Address;
  satisfyingTokens: number[],
  meta: {
    songsArray: string[],
    attributes: Attribute[],
  }
}

export interface ClaimableAddress {
  address: Address;
  claimable: boolean;
  song?: string;
  frame?: string;
  claimIndex?: ClaimIndex;
  quantity?: number;
}



const contractAddress: Address = process.env.CONTRACT || '0xFAb8E011F858270A3d41E4af3c2FDec0081B0eE3'


export class TraitChecker {
  private readData: ReadData;
  private songsData: Songs;
  private framesData: Frames;
  private conditions: Condition[] = [];
  private contractAddress: Address;

  constructor() {
    this.readData = new ReadData();
    this.songsData = songsDataSet;
    this.framesData = framesDataSet;
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

  async getUniqueFramesArray(attributes: Attribute[]): Promise<string[]> {
    const uniqueFrames: Set<string> = new Set();
  
    for (const attribute of attributes) {
      if (frameEqualizer[attribute.trait_type] === TraitType.Frame) {
        uniqueFrames.add(attribute.value);
      }
    }
  
    return [...uniqueFrames];
  }

  async extractTraitsData(relevantAttributes: Attribute[]): Promise<TraitsData> {
    const traitsData: TraitsData = {
      [TraitType.Song]: [],
      [TraitType.Frame]: [],
    };
  
    for (const attribute of relevantAttributes) {
      if (attribute.trait_type === TraitType.Song || attribute.trait_type === TraitType.Frame) {
        traitsData[attribute.trait_type].push(attribute.value);
      }
    }
  
    return traitsData;
  }

  async checkCondition(
    condition: Condition
  ): Promise<boolean> {
    const tokenData = await this.readData.readCollectedData();
  
    const normalizedTraitToCheck = await this.normalizeTraits(condition.if, TraitType.Song);
    const normalizedMustHave = await this.normalizeTraits(condition.mustHave, TraitType.Frame);
  
    logger.info(`normalizedTraitToCheck: ${JSON.stringify(normalizedTraitToCheck, null, 2)}`);
    logger.info(`normalizedMustHave: ${JSON.stringify(normalizedMustHave, null, 2)}`);
    const claimableAddresses: ClaimableAddress[] = [];
    const satisfyingTokens: number[] = [];
    const claimAddresses: ClaimAddress[] = [{
      address: '',
      satisfyingTokens: [],
      meta: {
        songsArray: [],
        attributes: []
      },
    }];
        for (const [contractAddress, ownerAddressesData] of Object.entries(tokenData)) {
          const numOwners = tokenData[contractAddress].length;
          const numOwners2 = Object.keys(tokenData[contractAddress]).length;
          logger.info(`
              Checking ${contractAddress} for ${numOwners}, == ${numOwners2} owners
              Contract: ${contractAddress.toLowerCase()}.
            `);

            if (condition.requiresOneSongAllColors || condition.allSongsOneColor) {
            try {

            for (const [ownerAddress, addressData] of Object.entries(ownerAddressesData)) {
                const ownerAddressValue = addressData.ownerAddress;
                const numowners = Object.entries(ownerAddressesData).length;
                const tokenIds = addressData.tokenIds;
                const uniqueSongsSet: Set<string> = new Set();
                const uniqueFramesSet: Set<string> = new Set();
                const numTokens = tokenIds.length;
                if (tokenIds && Array.isArray(tokenIds) && numTokens > 0) {
                  const metadata = addressData.metadata;
                  const extractedMetadata: AddressMetadata = {
                    ownerAddress: ownerAddressValue,
                    tokenIds: tokenIds,
                    metadata: metadata,
                  };
                  const songsArray: string[] = [];
                  const framesArray: string[] = [];
                  logger.info(`DataCheck: owner: ${ownerAddress} should be ${ownerAddressValue} owns -> #${numTokens} Tokens ${tokenIds}`)
                 // for (const tokenId of tokenIds) {
                  for (let i = 0; i < numTokens; i++) {
                    const tokenId = tokenIds[i];
                    if (!isNaN(tokenId)) {
                      const tokenMetadataIndex = addressData.metadata[tokenId];
                      logger.info(`DataCheck: Index: ${tokenMetadataIndex} TokenID: ${tokenId} - Count -> #${(numTokens - i)} -  Tokens ${i}/${numTokens}`)
                      if (tokenMetadataIndex) {
                        const tokenMetadata = tokenMetadataIndex.metadata;
                          const attributes: Attribute[] = tokenMetadata.attributes;
                          const relevantAttributes = attributes.filter(attribute => attribute.trait_type === TraitType.Song || frameEqualizer[attribute.trait_type] === TraitType.Frame);
                          const extractedTokenMetadata: TokenMetadata = {
                            name: tokenMetadata.name,
                            description: tokenMetadata.description,
                            image: tokenMetadata.image,
                            attributes: attributes,
                          };

                          for (const attribute of relevantAttributes) {
                            const trait_type = attribute.trait_type;
                            const value = attribute.value;
      
                            if (trait_type === TraitType.Song) {
                              songsArray.push(value);
                              uniqueSongsSet.add(attribute.value);
                              logger.info(`Checking attributes: ${attribute.trait_type}: ${attribute.value}...`);
                            }
      
                            if (frameEqualizer[trait_type] === TraitType.Frame) {
                              framesArray.push(value);
                              uniqueFramesSet.add(attribute.value);
                              logger.info(`Checking attributes: ${attribute.trait_type}: ${attribute.value}...`);
                            }
                          
      
      /*                     for (const attribute of attributes) {
                            if (attribute.trait_type === TraitType.Song || frameEqualizer[attribute.trait_type] === TraitType.Frame) {
                              traitsData[attribute.trait_type].push(attribute.value);
                            }
                          } */
                          const uniqueSongs = await this.getUniqueSongsArray(attributes);
                          logger.info(`uniqueSongs: ${JSON.stringify([...uniqueSongs], null, 2)}`);
                          const uniqueFrames = await this.getUniqueFramesArray(attributes);
                          logger.info(`uniqueFrames: ${JSON.stringify([...uniqueFrames], null, 2)}`);
                              // Check requiresOneSongAllColors condition
                              if (condition.requiresOneSongAllColors) {
                                logger.info('Checking requiresOneSongAllColors condition...');
                                // Iterate over each unique song
                                for (const song of uniqueSongsSet) {
                                  // Find the corresponding song attribute
                                  const songAttribute = attributes.find(sAttribute => sAttribute.trait_type === TraitType.Song && sAttribute.value === song);

                                  if (songAttribute) {
                                    const songValue = songAttribute.value;
                                    logger.info(`Checking SongValue: ${songValue}`);
                                    songsArray.push(songValue.trim());
              
/*                                     const hasAllColors = attributes
                                    .filter(songAttribute => frameEqualizer[songAttribute.trait_type] === TraitType.Song && songAttribute.value === songValue)
                                    .every(songAttribute => { */
                                        
                                    const hasAllColors = attributes
                                    .filter((attribute) => frameEqualizer[attribute.trait_type] === TraitType.Frame)
                                    .every((attribute) => {
                                      const correspondingSong = attributes.find(
                                        (attr) => attr.trait_type === TraitType.Song && attr.value === song
                                      );

                                      if (correspondingSong) {
                                        songsArray.push(correspondingSong.value); // Adjust property accordingly
                                      }
                                      // Find all frames corresponding to the current song
                                      const framesForSong = attributes
                                      .filter(fAttribute => frameEqualizer[fAttribute.trait_type] === TraitType.Frame && fAttribute.value === songValue)
                                      .map(fAttribute => fAttribute.value);

                                      if (correspondingSong !== undefined) {
                                        satisfyingTokens.push(tokenId); // Add tokenId to satisfyingTokens
                                      }
                                      return framesDataSet.color.every(color => framesForSong.includes(color));
                                    });

                                        //logger.info(`Songs Array${JSON.stringify(songsArray, null, 2)}`);
                                        //logger.info(`${JSON.stringify([...framesArray], null, 2)}`);


                                    logger.info(`Song ${song} - HasAllColors: ${hasAllColors}`);
                                    logger.info(`Owner ${ownerAddress} HasAllColors: ${hasAllColors} of Song ${song}`);
                            
                                    if (hasAllColors) {

                                        satisfyingTokens.push(tokenId);
                                        if (satisfyingTokens.length > 0) {
                                            claimAddresses.push({
                                                address: ownerAddress,
                                                satisfyingTokens: satisfyingTokens,
                                                meta: {
                                                    attributes,
                                                    songsArray,
                                                },
                                            });
                                            claimableAddresses.push({
                                                address: ownerAddress,
                                                claimable: true,
                                                song: song,
                                                claimIndex: ClaimIndex.OneSongAllColors,
                                                quantity: 1
                                            });
                                        }
                                        try {
                                          await this.markAndSave({
                                            ownerAddress,
                                            satisfyingTokens,
                                            traitConditionMet: true,
                                            song: song,
                                            claimIndex: ClaimIndex.OneSongAllColors,
                                            quantity: 1
                                        });
                                        } catch (error) {
                                          await this.saveClaimableAddress({
                                            address: ownerAddress,
                                            claimable: true,
                                            claimIndex: ClaimIndex.OneSongAllColors,
                                            quantity: 1
                                        });
                                          logger.info('Claimable address:', ownerAddressValue); // Log the claimable address
                                        }
                                      }
                                    }
                                  }
                                }

                                if (condition.allSongsOneColor || normalizedTraitToCheck.includes(TraitType.Frame) || normalizedMustHave.includes(TraitType.Song)) {
                                  logger.info(`Checking allSongsOneColor...`);
                                
                                  // Iterate over each unique frame color
                                  for (const frameColor of uniqueFramesSet) {
                                    const frameAttribute = attributes.find(fAttribute => frameEqualizer[fAttribute.trait_type] === TraitType.Frame && fAttribute.value === frameColor);
                                    if (frameAttribute) {
                                      const frameValue = frameAttribute.value;
                                      logger.info(`Checking SongValue: ${frameValue}`);
                                      framesArray.push(frameValue.trim());

                                      const hasAllSongsInOneColor = attributes
                                      .filter(frameAttribute => frameEqualizer[frameAttribute.trait_type] === TraitType.Frame && frameAttribute.value === frameValue)
                                      .every(frameAttribute => {
                                        // Find all songs corresponding to the current frame color
                                        const songsForFrame = attributes
                                          .filter(songAttribute => frameEqualizer[songAttribute.trait_type] === TraitType.Song && songAttribute.value === frameValue)
                                          .map(songAttribute => songAttribute.value);
                                  
                                        // Check if songs cover all songs
                                        return songsDataSet.songs.every(song => songsForFrame.includes(song));
                                      });
                                  
                                    logger.info(`Frame Color ${frameValue} - hasAllSongsInOneColor: ${hasAllSongsInOneColor}`);
                                    logger.info(`Owner ${ownerAddressValue} hasAllSongsInOneColor: ${hasAllSongsInOneColor} of Frame Color ${frameValue}`);
                                  
                                    if (hasAllSongsInOneColor) {
                                      await this.markAndSave({
                                        ownerAddress,
                                        frame: frameValue,
                                        traitConditionMet: true,
                                        claimIndex: ClaimIndex.AllSongsOneColor,
                                        quantity: 1
                                      });
                                      logger.info('Claimable address:', ownerAddressValue); // Log the claimable address
                                  
                                    logger.info(`Frame Color ${frameValue} - hasSongInOneColor: ${hasAllSongsInOneColor}`);
                                    logger.info(`Owner ${ownerAddressValue} hasSongInOneColor: ${hasAllSongsInOneColor} of Frame Color ${frameValue}`);
                                    // Mark and save the condition fulfillment
                                      logger.info('Claimable address:', ownerAddressValue); // Log the claimable address
                                    }
                                  }
                                }
                              }
                              extractedMetadata.metadata[tokenId] = {
                                metadata: extractedTokenMetadata,
                              };
                              extractedMetadata.tokenIds.push(tokenId);
                            }
                        }
                    }
                    // Check for required token tokenIds
                    if (condition.requiredTokenIds && condition.requiredTokenIds.length > 0) {
                      const hasRequiredTokenIds = condition.requiredTokenIds.some((tokenId) =>
                        extractedMetadata.tokenIds.includes(tokenId)
                      );

                      if (hasRequiredTokenIds) {
                        satisfyingTokens.push(tokenId);
                        logger.info(`address: ${ownerAddress} satisfies requirements of holding one of ${condition.requiredTokenIds}`);
                        await this.markAndSave({
                          ownerAddress,
                          satisfyingTokens,
                          traitConditionMet: true,
                          claimIndex: 3,
                          quantity: 1
                      });
                      } else {
                        return false;
                      }
                    }
                  
                    // Check for minimum token quantity
                    if (condition.minTokenQuantity !== undefined) {
                      const tokenQuantity = extractedMetadata.tokenIds.length;
                      if (tokenQuantity >= condition.minTokenQuantity) {
                        logger.info(`address: ${ownerAddress} satisfies requirements of holding enough of ${condition.minTokenQuantity} - ${tokenQuantity}`);
                      } else {
                        return false;
                      }
                    }
                    }
                  }
                
              }
            } catch (error) {
              // Handle errors appropriately
              logger.error('Error in processing claimable addresses:', error);
              return false;
             }
            }
            
            for (const claimableAddress of claimableAddresses) {
              // Access the claimable address and its satisfying tokens as needed
              const { address, claimIndex, claimable, quantity } = claimableAddress;
              logger.info('Claimable address:', address);
              logger.info('Satisfying tokens:', satisfyingTokens);
              // Process or log claimableAddress and satisfyingTokens as needed
              // Additionally, you can mark and save the claimable address here
              await this.saveAgglomeratedClaimableAddresses(claimableAddresses);
              //await this.markAndSave({ ownerAddress: claimableAddress.address, traitConditionMet: true, claimIndex: 1, quantity: 1 });
              }
          }
       return true;
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

  return [...new Set(songValues)];
}

async getUniqueFrames(attributes: Attribute[]): Promise<string[]> {
  const uniqueFrames: Set<string> = new Set();
  const frameTraitType = TraitType.Frame;
  const frames = framesData;
  const color = frames.color;
  const frameValues = attributes
    .filter((attribute) => attribute.trait_type === frameTraitType)
    .map((attribute) => attribute.value);

  return [...new Set(frameValues)];
}


  private hasRequiredTokenIds(requiredTokenIds: number[], tokenIds: number[]): boolean {
    return requiredTokenIds && requiredTokenIds.length > 0 && !requiredTokenIds.every((tokenId) => tokenIds.includes(tokenId));
  }
  
  private hasMinTokenQuantity(minTokenQuantity: number | undefined, tokenIds: number[]): boolean {
    return minTokenQuantity !== undefined && tokenIds.length < minTokenQuantity;
  }

private markedSets: Set<string> = new Set(); // Add this property to your class

async markAndSave({
  ownerAddress,
  satisfyingTokens,
  song,
  frame,
  traitConditionMet,
  claimIndex,
  quantity,
}: {
  ownerAddress: Address;
  satisfyingTokens?: number[];
  song?: string;
  frame?: string;
  traitConditionMet: boolean;
  claimIndex: number;
  quantity: number;
}): Promise<void> {
  if (traitConditionMet) {
    const setIdentifier = `${ownerAddress}-${claimIndex}`; // Use a unique identifier for the set

    // Check if the set has been marked already
    if (!this.markedSets.has(setIdentifier)) {
      // Mark and save logic here
      const claimableAddress: ClaimableAddress = {
        address: ownerAddress,
        claimable: true,
        song: song,
        frame: frame,
        claimIndex,
        quantity,
      };
      
      // Save the claimable address
      await this.saveClaimableAddress(claimableAddress);

      // Add the set identifier to the marked sets
      this.markedSets.add(setIdentifier);

      logger.info(`Marking and Saving: ${JSON.stringify(claimableAddress, null, 2)}`);
    }
  }
}
async saveAgglomeratedClaimableAddresses(claimableAddresses: ClaimableAddress[]): Promise<void> {
  try {
    const filePath = `${__dirname}/${this.contractAddress.toLowerCase()}_agglomerated_claimableAddresses.json`;
    const agglomeratedData: ClaimableAddress[] = [];

    // Iterate over the provided claimable addresses and aggregate them
    for (const claimableAddress of claimableAddresses) {
      agglomeratedData.push(claimableAddress);
    }

    await fs.promises.writeFile(filePath, JSON.stringify(agglomeratedData, null, 2));
    logger.info(`Agglomerated Claimable Addresses Saved: ${JSON.stringify(agglomeratedData, null, 2)}`);
  } catch (error) {
    logger.error(`Error saving agglomerated claimable addresses:`, error);
  }
}

async readExistingAgglomeratedClaimableAddresses(filePath: string): Promise<ClaimableAddress[]> {
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as ClaimableAddress[];
  } catch (error) {
    // Handle the case when the file doesn't exist or cannot be read
    return [];
  }
}
async readExistingClaimableAddresses(filePath: string): Promise<ClaimableAddress[]> {
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as ClaimableAddress[];
  } catch (error) {
    // Handle the case when the file doesn't exist or cannot be read
    return [];
  }
}
async saveClaimableAddress(claimableAddress: ClaimableAddress): Promise<void> {
  try {
    const folderPath = `./output/claimable_addresses`;
    await fs.promises.mkdir(folderPath, { recursive: true });
    const filePath = `${folderPath}/${claimableAddress.address.toLowerCase()}_claimableAddress.json`;

    const existingData: ClaimableAddress[] = await this.readExistingClaimableAddresses(filePath);
    const newData: ClaimableAddress[] = [...existingData, claimableAddress];

    await fs.promises.writeFile(filePath, JSON.stringify(newData, null, 2));
    logger.info(`Claimable Address Saved for ${claimableAddress.address}: ${JSON.stringify(claimableAddress, null, 2)}`);
  } catch (error) {
    logger.error(`Error saving claimable address for ${claimableAddress.address}:`, error);
  }
}
  private checkArrayCondition(attributes: Attribute[], traitToCheck: string): boolean {
    return attributes?.some((attribute) =>
      attribute.trait_type === TraitType.Frame && traitToCheck.includes(attribute.value)
    ) || false;
  }
  
  async checkNestedCondition(
    nestedCondition: Condition
  ): Promise<boolean> {
    try {
    return await this.checkCondition(nestedCondition);
    } catch (error) {
      throw new Error(`${error}`);
    }
  }

  async checkConditions(
    conditions: Condition[]
  ): Promise<boolean> {
        try {
    const _conditions = conditions.every((condition) =>
      this.checkNestedCondition(condition)
    );
    return _conditions;
  } catch (error) {
    throw new Error(`${error}`);
  }
  }

  async processTokenConditions(
    addressData: AddressMetadata,
    conditions: Condition[]
  ): Promise<ClaimableAddress[]> {
    try {
    const processedAddresses = await Promise.all(
      conditions.map(async (condition) => {
        const isClaimable = await this.checkNestedCondition(condition);
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
    addressData: AddressMetadata,
    conditions: Condition[]
  ): Promise<ClaimableAddress[]> {
    try {
    const processedAddresses = await Promise.all(
      conditions.map(async (condition) => {
        const isClaimable = await this.checkNestedCondition(condition);
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
      const existingClaimableAddresses: ClaimableAddress[] = await this.readExistingClaimableAddresses2();
      const claimableAddresses: ClaimableAddress[] = [];
      const processTasks: Promise<ClaimableAddress[]>[] = [];

                for (const condition of conditions) {
                  const checkAddresses = await this.checkCondition(condition);
                  if (checkAddresses) {
                    logger.info(`AddressCheck completed ${checkAddresses}`)
                }
              }
      
      const processResults = await Promise.all(processTasks);
      const newClaimableAddresses = processResults.flat();
      claimableAddresses.push(...newClaimableAddresses);
    
      const hasChanges = !await deepEqual(
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
        addressData,
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
  
  

  async readExistingClaimableAddresses2(): Promise<ClaimableAddress[]> {
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
  

  private async saveToFile(filePath: string, data: ClaimableAddress[]): Promise<void> {
    try {
      const existingData: ClaimableAddress[] = await this.readExistingClaimableAddresses(filePath);
      const newData: ClaimableAddress[] = [...existingData, ...data];
  
      await fs.promises.writeFile(filePath, JSON.stringify(newData, null, 2), { flag: 'w' });
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
     // await this.saveToFile(`./${this.contractAddress.toLowerCase()}_claimableAddresses.json`, checkedAddresses);
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
  
      // Check for required token tokenIds
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

