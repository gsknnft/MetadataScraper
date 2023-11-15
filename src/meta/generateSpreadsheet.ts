// generateSpreadsheet.js
import XLSX from 'xlsx';
// ------------
//import { google } from 'googleapis';
import { saveAs } from 'file-saver';
import {GoogleAuth} from 'google-auth-library';
import ReadData, {AllAddressesMetadata, TokenMetadata} from './readData'
import {ClaimsRecord} from './traitChecker'
// Authenticate using your Google Sheets credentials
// Replace 'YOUR_CREDENTIALS' with your actual credentials file path
//const credentials = require('YOUR_CREDENTIALS.json');
// Authenticate using your Google Cloud credentials
// Replace 'YOUR_CREDENTIALS' with your actual credentials file path
// const cloudCredentials = require('YOUR_CLOUD_CREDENTIALS.json');
const credentials = require('YOUR_CREDENTIALS.json')


export class GSheets {
  const readData = new ReadData();

// Set up the OAuth2 client for Google Cloud
async authenticateGoogleCloud(): Promise<boolean> {
  let success: boolean = false;
  try {
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
    const res = await client.request({ url });
    success = true;
    console.log(res.data);
  } catch (error) {
    console.error('Error authenticating for Google Cloud:', error);
    throw error;
  }
  return success;
}

// Set up the OAuth2 client for Google Sheets
async authenticateGoogleSheets() {
  try {
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    // Now, you can use the 'client' for Google Sheets API operations.
    return client;
  } catch (error) {
    console.error('Error authenticating for Google Sheets:', error);
    throw error;
  }
}

// Load the Excel file
const workbook = XLSX.readFile('YOUR_FILE_PATH.xlsx'); // Replace with the actual file path

// Define the data you want to upload (you can use 'data' from your example)
const requestData = {
  spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your spreadsheet ID
  range: 'Sheet1', // The range where you want to start populating data
  valueInputOption: 'RAW',
  resource: {
    values: data, // The data you've read from the Excel file
  },
};

const filePath = './sheets/';
// Choose the sheet you want to read (e.g., Sheet1)
const sheetName = this.workbook.SheetNames[0];
const worksheet_ = this.workbook.Sheets[this.sheetName];

// Parse the data into a JavaScript object
const data = XLSX.utils.sheet_to_json(this.worksheet_);

const columns = [
  {
    key: 'tokenId',
    header: 'Token Id',
  },
  {
    key: 'owner',
    header: 'Owner',
  },
  {
    key: 'tokenURI',
    header: 'Token URI',
  },
  {
    key: 'metadata',
    header: 'Attributes'
  },
];

async saveFile(fileName: string, wb: any) {
  try {
  const xls64 = await wb.xlsx.writeBuffer({ base64: true });
  } catch (error) {
    throw new Error(`Error: ${error}`)
  }
  try {
    const blob = new Blob();
  saveAs(
    new Blob([xls64], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName
  );
  } catch (error) {
    throw new Error(`Error ${error}`)
  }
};

async generateSpreadsheet(sheetName = 'Sheet1') {
  const data = await this.readData.readAddressTokenIdsFromJSON();
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert your data to a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate a blob containing the spreadsheet data
  const blob = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Optionally, open the spreadsheet in a new tab
  // window.open(url);

  return { worksheet, url, blob };
}

// Trigger the generation of the spreadsheet
const { worksheet, url, blob } = generateSpreadsheet(data);

// Open the generated spreadsheet in a new tab (optional)
window.open(url);

 // Upload the data to Google Sheets
async function uploadToGoogleSheets() {
  try {
    // Authenticate using your credentials
    const auth = google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Obtain an OAuth2 client and authenticate
    const client = await auth.getClient();
    await client.authorize();

    // Use the OAuth2 client for the Google Sheets API
    const sheetsAPI = google.sheets({ version: 'v4', auth: client });

    // Define the data you want to upload (you can use 'data' from your example)
    const requestData = {
      spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your spreadsheet ID
      range: ysheetName, // The range where you want to start populating data
      valueInputOption: 'RAW',
      resource: {
        values: XLSX.utils.sheet_to_json(worksheet), // The data from the worksheet
      },
    };

    // Perform the update operation
    const response = await sheetsAPI.spreadsheets.values.update(requestData);

    // Handle the response, if needed
    console.log('Data uploaded successfully.');
    console.log(response.data);
  } catch (error) {
    console.error('Error uploading data to Google Sheets:', error);
  }
}
}



/* 
uploadToGoogleSheets();

// Example data (replace with your actual data)
const data = [
  { Name: 'John', Age: 30 },
  { Name: 'Alice', Age: 28 },
  { Name: 'Bob', Age: 35 },
];
*/