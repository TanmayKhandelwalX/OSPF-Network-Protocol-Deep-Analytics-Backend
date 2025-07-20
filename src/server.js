import express from "express";
import { dbFunctions } from "./db/databaseFunctions.js";
import { client } from "./db/connection.js";
import { DB_NAME,COLLECTION_NAME } from "./constants.js";
import cors from "cors"
import { askLLM } from "./utils/gemini-cag.js";



const collectionName = COLLECTION_NAME;
export const app = express();
const port = process.env.PORT;


app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

export const server = app.listen(port, async ()=>{
    try {
        console.log("Server is Listening\n");
    }
    catch (err) {
        throw err;
    }
});


/**
 * @param {Object} dbFunctions
 */
app.get("/", async (req, res) => {
    let params = {
        databaseName: DB_NAME,
        collectionName: collectionName,
        sortCriteria: {
            "averageTime.Full": -1,
        },

        requestedDataFromFrontend: {
            "ids.nbrID": "192.168.100.1",
        },

        limit: 10
    }
    let result = await dbFunctions.specificData(params);
    result = changeDataFormatForFrontEnd(result);
    res.status(200).json(result);
});

app.get('/nbrID',async(req,res)=>{
    const unqNbrID = await client.db(DB_NAME).collection(COLLECTION_NAME).distinct("ids.nbrID");
    res.status(200).json(unqNbrID);
});
app.get('/areaID',async(req,res)=>{
    const unqNbrID = await client.db(DB_NAME).collection(COLLECTION_NAME).distinct("ids.areaID");
    res.status(200).json(unqNbrID);
});
app.get('/routerID',async(req,res)=>{
    const unqNbrID = await client.db(DB_NAME).collection(COLLECTION_NAME).distinct("ids.routerID");
    res.status(200).json(unqNbrID);
});
/**
 * @param {createClient} redisDB 
 */

app.post("/filter", async (req, res) => {
    let requestedDataFromFrontend = req.body;
    let updatedRequestedDataFromFrontend = {};
    for(let key in requestedDataFromFrontend){
        if(!requestedDataFromFrontend[key]) delete requestedDataFromFrontend[key];
        else updatedRequestedDataFromFrontend[`ids.${key}`] = requestedDataFromFrontend[key];
    }
    
    let params = {
        databaseName: DB_NAME,
        collectionName: collectionName,
        requestedDataFromFrontend: updatedRequestedDataFromFrontend,
    }

    let result = await dbFunctions.specificData(params);
    result = changeDataFormatForFrontEnd(result);

    res.status(200).json(result);
    console.log("Post request was made\n");
    console.log(req.body);
});



app.post('/stability', async (req, res) => {
    let requestedDataFromFrontend = req.body;
    let updatedRequestedDataFromFrontend = {};
    for(let key in requestedDataFromFrontend){
        if(!requestedDataFromFrontend[key]) delete requestedDataFromFrontend[key];
        else updatedRequestedDataFromFrontend[`ids.${key}`] = requestedDataFromFrontend[key];
    }
    let params = {
        databaseName: DB_NAME,
        collectionName: collectionName,
        sortCriteria: {
            "currentStatePriority":-1,
            "averageTime.Full": -1,
            "Varience.Full": 1,
            
        },
        requestedDataFromFrontend: updatedRequestedDataFromFrontend,
        limit: 10,
    }
    let result = await dbFunctions.specificData(params);
    console.log("stability data called");
    result = changeDataFormatForFrontEnd(result);
    res.status(200).json(result);
});


app.post('/unstability', async (req, res) => {
    let requestedDataFromFrontend = req.body;
    let updatedRequestedDataFromFrontend = {};
    for(let key in requestedDataFromFrontend){
        if(!requestedDataFromFrontend[key]) delete requestedDataFromFrontend[key];
        else updatedRequestedDataFromFrontend[`ids.${key}`] = requestedDataFromFrontend[key];
    }
    let params = {
        databaseName: DB_NAME,
        collectionName: collectionName,
        sortCriteria: {
            "averageTime.Down": -1,
        },
        requestedDataFromFrontend: updatedRequestedDataFromFrontend,
        limit: 10
    }
    let result = await dbFunctions.specificData(params);
    console.log("unstability data called");
    result = changeDataFormatForFrontEnd(result);
    res.status(200).json(result);
});


app.post('/chat', async (req, res) => {
    let userQuery = req.body.requestMsg;
    console.log(userQuery);
    let result = await askLLM(userQuery);
    console.log("User Question: ", result);
    res.status(200).json(result);
});



function changeDataFormatForFrontEnd(arr){
    return arr.map((obj) => {
        let newObj = obj;
        Object.entries(obj.ids).forEach((arr)=>{
            newObj[`${arr[0]}`] = arr[1];
        });
        delete newObj.ids;
        Object.entries(obj.averageTime).forEach((arr)=>{
            newObj[`${arr[0]}Avg`] = arr[1]/1000;
        });
        delete newObj.averageTime;
        Object.entries(obj.Varience).forEach((arr)=>{
            newObj[`${arr[0]}SD`] = Math.sqrt(arr[1])/1000;
        });
        newObj.timeLeftOnCurrentState/=1000;
        newObj.timePassedOnCurrentState/=1000;
        delete newObj.Varience;
        delete newObj.dataPointCount;
        delete newObj.dataPointSum;
        delete newObj.initToFullTime;
        delete newObj.initToFullTrack;
        return newObj;
    });
}



