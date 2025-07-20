import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { client, connectDB, closeDB } from './db/connection.js';
import { dbFunctions } from './db/databaseFunctions.js';
import { makeNewlines } from "./utils/SyntheticLogs.js";
import { begin} from "./utils/realTimeUpdation.js";
import { DB_NAME,COLLECTION_NAME } from "./constants.js";
import { server } from "./server.js";
import Redis from 'ioredis';


export let localDB = new Redis();

async function calculationForBlockOfLines(Block) {
    await begin(Block);    
}

async function generateRandomNumberOfLinesAndCalculate(){
    let prevMilliSeconds = Date.now();
    let limit = 1;
    for(let i = 0;i<limit;i++){
        let Block = makeNewlines(prevMilliSeconds);
        await calculationForBlockOfLines(Block);     
    }
}


async function main(){
    try{
        await connectDB();
        await dbFunctions.DeleteCollection(DB_NAME,COLLECTION_NAME);//only for debugging purposes and reseting db
        const data = await client.db(DB_NAME).collection(COLLECTION_NAME).find({}).toArray();
        await localDB.flushdb();
        data.forEach(async (val)=> {
            val.oldCalculation = true;
            const key = "AdjChg|"+JSON.stringify(val.ids);
            await localDB.set(key,JSON.stringify(val));
        });
        await generateRandomNumberOfLinesAndCalculate();
       
    }
    catch(err){
        console.log("ERROR IN MAIN \n",err);
    }
    finally{
        await closeDB();
        server.close(()=>console.log("SERVER IS CLOSED"));
        localDB.quit(()=>console.log("REDIS IS CLOSED"));
    }
}

main().catch(console.error);



