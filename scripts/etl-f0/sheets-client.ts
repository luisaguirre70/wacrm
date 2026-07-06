import { google } from 'googleapis';

export async function getSheetsClient() {
  const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function readRange(spreadsheetId: string, range: string) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values ?? [];
}
