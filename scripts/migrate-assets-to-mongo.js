require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../assets/data');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not defined.');
    process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(); // Uses the database specified in the URI

        const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));

        for (const file of files) {
            const collectionName = path.basename(file, '.json');
            const filePath = path.join(DATA_DIR, file);

            console.log(`Processing ${file} -> collection: ${collectionName}`);

            const fileContent = fs.readFileSync(filePath, 'utf8');
            let data;
            try {
                data = JSON.parse(fileContent);
            } catch (e) {
                console.error(`Failed to parse ${file}: ${e.message}`);
                continue;
            }

            const collection = db.collection(collectionName);

            // clear existing data to ensure a clean migration
            await collection.deleteMany({});

            if (Array.isArray(data)) {
                if (data.length > 0) {
                    await collection.insertMany(data);
                    console.log(`  Inserted ${data.length} documents into ${collectionName}`);
                } else {
                    console.log(`  Skipping ${collectionName} (empty array)`);
                }
            } else if (typeof data === 'object' && data !== null) {
                await collection.insertOne(data);
                console.log(`  Inserted 1 document into ${collectionName}`);
            } else {
                console.warn(`  Skipping ${file}: Content is neither array nor object`);
            }
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.close();
    }
}

migrate();
