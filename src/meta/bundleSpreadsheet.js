import { generateSpreadsheet } from '@/composables/meta/generateSpreadsheet.ts';

function generateBundleSpreadsheet() {
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

export { generateBundleSpreadsheet };
