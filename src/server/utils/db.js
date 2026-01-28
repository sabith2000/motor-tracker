import mongoose from 'mongoose';

// MongoDB connection state
let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

/**
 * Connect to MongoDB with retry logic
 */
export async function connectDB() {
    if (isConnected) {
        console.log('📦 Using existing MongoDB connection');
        return;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI environment variable not set');
        throw new Error('MONGODB_URI not configured');
    }

    while (connectionRetries < MAX_RETRIES) {
        try {
            console.log(`🔄 Connecting to MongoDB... (attempt ${connectionRetries + 1}/${MAX_RETRIES})`);

            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });

            isConnected = true;
            connectionRetries = 0;
            console.log('✅ Connected to MongoDB');

            // Handle connection events
            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
                isConnected = false;
            });

            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err.message);
                isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('🔄 MongoDB reconnected');
                isConnected = true;
            });

            return;
        } catch (error) {
            connectionRetries++;
            console.error(`❌ MongoDB connection failed: ${error.message}`);

            if (connectionRetries < MAX_RETRIES) {
                console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }
    }

    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
}

/**
 * Check if MongoDB is connected
 */
export function isDBConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Graceful shutdown
 */
export async function disconnectDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        isConnected = false;
        console.log('📦 MongoDB disconnected gracefully');
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
});
