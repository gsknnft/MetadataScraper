import { generateSpreadsheet } from '@/composables/meta/generateSpreadsheet.ts';


/* 
  const tokenIds = tokenId.value.map(tokenId => ({
    
  }));
 */

function generateBundleSpreadsheet() {
  const tokenIds = tokenId.value.map(tokenId => ({
    
  }));
  // Generate the spreadsheet using the imported function
  const data = bundles.value.map(bundle => ({
    Name: bundle.name,
    BundleID: bundle.bundleID,
    tokenIds: bundle.tokenId,
    IsClaimed: bundle.isClaimed ? 'Yes' : 'No',
    // Add more fields as needed
  }));

  // Generate the spreadsheet using the imported function
  const { url } = generateSpreadsheet(data, 'NFT_Bundles'); // Use the imported generateSpreadsheet function

  return url;
}


function generateBundle() {
  // Generate the spreadsheet using the imported function
  const tokenIds = tokenId.value.map(tokenId => ({

  }));
  const data = bundles.value.map(bundle => ({
    Name: bundle.name,
    BundleID: bundle.bundleID,
    tokenIds: tokenIds,
    IsClaimed: bundle.isClaimed ? 'Yes' : 'No',
    // Add more fields as needed
  }));

  // Generate the spreadsheet using the imported function
  const { url } = generateSpreadsheet(data, 'NFT_Bundles'); // Use the imported generateSpreadsheet function

  return url;
}


export { generateBundleSpreadsheet };
