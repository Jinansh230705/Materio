const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

let mongoClient = null;
let db = null;
let connectionPromise = null;

const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

/**
 * Get MongoDB database instance with connection pooling
 * Optimized for Vercel serverless functions
 * @returns {Promise<import('mongodb').Db>}
 */
async function getMongoDb() {
    if (db) return db;
    if (connectionPromise) return connectionPromise;

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    connectionPromise = (async () => {
        try {
            console.log('Connecting to MongoDB...');

            // Mask password for logging
            const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
            console.log(`Connecting to: ${maskedUri}`);

            mongoClient = new MongoClient(MONGODB_URI, {
                // Serverless-friendly timeouts (fail fast, don't block the function)
                maxPoolSize: 3,
                minPoolSize: 0,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 15000,
                serverSelectionTimeoutMS: 10000,
                // Use MongoDB Atlas Stable API for consistency
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: false,
                    deprecationErrors: false,
                },
                // Let the driver handle TLS natively — Atlas requires TLS by default
                retryWrites: true,
                retryReads: true,
                family: 4,
            });

            await mongoClient.connect();
            db = mongoClient.db('materio');
            console.log('MongoDB connected successfully');
            return db;
        } catch (error) {
            console.error('MongoDB connection error:', error.message);
            connectionPromise = null;
            db = null;
            throw error;
        }
    })();

    return connectionPromise;
}

/**
 * Get the form submissions collection
 * @returns {Promise<import('mongodb').Collection>}
 */
async function getFormsCollection() {
    const database = await getMongoDb();
    return database.collection('form_submissions');
}

/**
 * Get the form configs collection (for admin-editable form configurations)
 * @returns {Promise<import('mongodb').Collection>}
 */
async function getFormConfigsCollection() {
    const database = await getMongoDb();
    return database.collection('form_configs');
}

/**
 * Close MongoDB connection (for cleanup)
 */
async function closeMongoConnection() {
    if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
        db = null;
        connectionPromise = null;
    }
}

module.exports = {
    getMongoDb,
    getFormsCollection,
    getFormConfigsCollection,
    closeMongoConnection
};
