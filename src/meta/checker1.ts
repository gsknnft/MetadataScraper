import ReadData, { AllAddressesMetadata, AddressMetadata, TokenMetadata, Attribute } from './readData'; // Assuming the file is in the same directory

interface ClaimableAddress {
  address: string;
  claimable: boolean;
}

  // Traits to check:
  // trait_type:
  const song = [
    `Im Gonna Love You`,
  ]
  // trait_type
  const frame = {
    red: `Red`,
    green: `Green`,
  }

  // owners must have all the same colour frame of one song
  // once all colours are achieved, they are eligible for a 
  // certain mint
  const frames = {
    allColours: frame
  }

  const conditions = {
    if: song,
    mustHave: frame, 
  }
  // owners must have all the same song in all frame colours
  // once one song in all colours are achieved, they are eligible for a 
  // certain mint
  const conditions2 = {
    if: frame,
    mustHave: frame // set for one frame colout
  }

   const nestedCondition = {
    if: conditions,
    eligible: true
   }


export class TraitChecker {
  private readData: ReadData;

  constructor() {
    this.readData = new ReadData();
  }


  // values to check

  async checkTraitsAndMarkClaimable(traitToCheck: string): Promise<ClaimableAddress[]> {
    try {
      const allAddressesData: AllAddressesMetadata = await this.readData.readAndExtractData();
      const claimableAddresses: ClaimableAddress[] = [];

      for (const contractAddress in allAddressesData) {
        const ownerAddressesData = allAddressesData[contractAddress];

        for (const ownerAddress in ownerAddressesData) {
          const addressData: AddressMetadata = ownerAddressesData[ownerAddress];
          const tokenIds: number[] = addressData.tokenIds;

          for (const tokenId of tokenIds) {
            const tokenMetadataIndex = addressData.metadata[tokenId];
            const tokenMetadata: TokenMetadata = tokenMetadataIndex.metadata;

            // Example: Check if a specific trait matches the traitToCheck
            const matchingTraits: Attribute[] | string = tokenMetadata.attributes.filter(
              (trait: Attribute) => trait.trait_type === traitToCheck
            );

            // Customize this condition based on your requirements
            const isClaimable = matchingTraits && matchingTraits.length > 0;
            if (!isClaimable) {
                return []
            }
            claimableAddresses.push({
              address: ownerAddress,
              claimable: isClaimable,
            });
          }
        }
      }

      return claimableAddresses;
    } catch (error) {
      console.error('Error checking traits and marking claimable:', error);
      return [];
    }
  }
}

// Example usage:
const traitChecker = new TraitChecker();
const traitToCheck = 'example_trait'; // Replace with the trait you want to check
traitChecker.checkTraitsAndMarkClaimable(traitToCheck).then((claimableAddresses) => {
  console.log('Claimable Addresses:', claimableAddresses);
});
