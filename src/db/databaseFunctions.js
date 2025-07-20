import { client } from './connection.js';

async function ShowTable(databaseName, collectionName) {
    try {
        const table = await client.db(databaseName).collection(collectionName).find().toArray();
        console.log(table);
        console.log(`table shown Successfully`);
    }
    catch (err) {
        console.log(`Failed To show Table ${collectionName}`);
        console.log(err);
    }
}
async function ListDatabases() {
    try {
        const databaseList = await client.db().admin().listDatabases();
        console.log(databaseList);
        console.log(`databases shown Successfully`);
    }
    catch (err) {
        console.log(`Failed To show databases`);
        console.log(err);
    }
    return;
}
async function ListCollections(databaseName) {
    try {
        const collectionList = await client.db(databaseName).listCollections().toArray();
        console.log(collectionList);
        console.log(`collections shown Successfully`);
    }
    catch (err) {
        console.log(`Failed To show collections In database ${databaseName}`);
        console.log(err);
    }
    return;
}
async function DeleteCollection(databaseName, collectionName) {
    try {
        const res = await client.db(databaseName).collection(collectionName).drop();
        console.log(`deleted ${collectionName} successfully`);
    }
    catch (err) {
        console.log(`Failed To delete ${collectionName}`);
        console.log(err);
    }
}
async function InsertData(databaseName, collectionName, data) {
    try {
        const res = await client.db(databaseName).collection(collectionName).insertMany(data);
        console.log(`data inserted Successfully`);
    }
    catch (err) {
        console.log("Failed to insert");
        console.log(err);
    }
    return;
}

/**
 * @param {MongoClient} client
 * @param {string} databaseName
 * @param {string} collectionName
 */
async function findSpecificData(data) {
    try {
        let {
            databaseName,
            collectionName,
            requestedDataFromFrontend = {},
            sortCriteria = { 'nbrID': 1 },
            limit = 100000
        } = data;

        const specificData = await client.db(databaseName).collection(collectionName).find(requestedDataFromFrontend).sort(sortCriteria).limit(limit).toArray();
        //console.log(specificData);
        return specificData;
    }
    catch (err) {
        console.log(`ERROR failed to show Specific data\n ${err}`);
        throw err;
    }
}



export const dbFunctions = {
    specificData: findSpecificData,
    ShowTable: ShowTable,
    ListCollections: ListCollections,
    ListDatabases: ListDatabases,
    InsertData: InsertData,
    DeleteCollection: DeleteCollection,
};
