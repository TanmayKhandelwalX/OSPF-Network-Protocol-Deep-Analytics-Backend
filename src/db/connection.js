import { MongoClient } from "mongodb";


//console.log(`${MONGODB_URI}`);

export const client = new MongoClient(`${process.env.MONGODB_URI}`);



export async function connectDB() {
    try {
        await client.connect();
        console.log("MONGODB DATABASE CONNECTION OPENED");
        
    }
    catch (err) {
        console.log("ERROR: Failed to Connect Database\n" + err);
        await closeDB();
        process.exit(1);
    }
}
export async function closeDB() {
    await client.close();
    console.log("MONGODB DATABASE CONNECTION CLOSED");
}