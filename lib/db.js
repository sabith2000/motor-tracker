import mongoose from 'mongoose';

/**
 * Serverless-optimized MongoDB connection.
 * Caches connection on `global` to reuse across warm invocations.
 */
let cached = global._mongooseCache;
if (!cached) {
    cached = global._mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI environment variable not set');
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
        }).then((m) => {
            console.log('✅ Connected to MongoDB (serverless)');
            return m;
        }).catch((err) => {
            // Reset promise so next invocation retries
            cached.promise = null;
            throw err;
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
