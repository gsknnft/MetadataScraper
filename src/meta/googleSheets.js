const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Authenticate using your credentials
// Replace 'YOUR_CREDENTIALS' with your actual credentials file path

const credentials = require('YOUR_CREDENTIALS.json');

// Set up the OAuth2 client
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Define the function to upload data to Google Sheets
async function uploadToGoogleSheets(filePath, dataToUpdate) {
    try {
      // Obtain an OAuth2 client and authenticate
      const client = await auth.getClient();
      await client.authorize();
  
      // Load the Excel file
      const workbook = XLSX.readFile(filePath); // Use the provided file path
  
      // Choose the sheet you want to read (e.g., Sheet1)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
  
      let data; // Declare the data variable here
  
      if (!dataToUpdate) {
        // Parse the data into a JavaScript object
        data = XLSX.utils.sheet_to_json(worksheet);
      } else {
        data = XLSX.utils.sheet_to_json(dataToUpdate);
      }
  
      // Use the OAuth2 client for the Google Sheets API
      const sheetsAPI = google.sheets({ version: 'v4', auth: client });
  
      // Define the data you want to upload
      const requestData = {
        spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your spreadsheet ID
        range: sheetName, // The range where you want to start populating data
        valueInputOption: 'RAW',
        resource: {
          values: data, // The data you've read from the Excel file or dataToUpdate
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
  
  // Call the update function with the updated data

  module.exports = { uploadToGoogleSheets };

/*   
  // Example data to update (replace with your updated data)
  const dataToUpdate = [
    ['New Value 1', 'New Value 2'],
    ['Another New Value 1', 'Another New Value 2'],
  ]; */

/* // Define the data you want to upload (you can use 'data' from your example)
const requestData = {
  spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your spreadsheet ID
  range: 'Sheet1', // The range where you want to start populating data
  valueInputOption: 'RAW',
  resource: {
    values: data, // The data you've read from the Excel file
  },
}; */


/* // Upload the data to Google Sheets
async function uploadToGoogleSheets() {
  try {
    // Authenticate using your credentials
    const auth = new google.auth.GoogleAuth({
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
      range: sheetName, // The range where you want to start populating data
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
// Trigger the upload operation
uploadToGoogleSheets(); */
