export default function handler(req, res) {
    res.json({
        status: 'ok',
        message: 'Server is awake',
        timestamp: new Date().toISOString(),
        storage: 'mongodb',
        runtime: 'serverless'
    });
}
