export default function handler(req, res) {
    const hasSheetId = !!process.env.GOOGLE_SHEET_ID;
    const hasCredentials = !!process.env.GOOGLE_CREDENTIALS;
    const hasMongoUri = !!process.env.MONGODB_URI;
    let credentialsValid = false;
    let credentialsError = null;
    let clientEmail = null;

    if (hasCredentials) {
        try {
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            credentialsValid = !!(creds.client_email && creds.private_key);
            clientEmail = creds.client_email ? creds.client_email.substring(0, 20) + '...' : null;
        } catch (e) {
            credentialsError = e.message;
        }
    }

    res.json({
        storage: 'mongodb',
        runtime: 'serverless',
        mongodb: {
            uriSet: hasMongoUri,
            uriPreview: hasMongoUri ? process.env.MONGODB_URI.substring(0, 30) + '...' : null
        },
        googleSheets: {
            sheetIdSet: hasSheetId,
            sheetIdValue: hasSheetId ? process.env.GOOGLE_SHEET_ID.substring(0, 10) + '...' : null,
            credentialsSet: hasCredentials,
            credentialsValid,
            credentialsError,
            clientEmail
        },
        environment: process.env.NODE_ENV || 'development'
    });
}
