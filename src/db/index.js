import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/llmengine';
const client = new MongoClient(url);

export let db;

export const connectDB = async () => {
    try {
        await client.connect();
        db = client.db();
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};
