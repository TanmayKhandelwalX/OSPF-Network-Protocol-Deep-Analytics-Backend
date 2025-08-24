import { COLLECTION_NAME, DB_NAME } from "../constants.js";
import { client } from "../db/connection.js";
import { localDB } from "../main.js";
/**
 * @param {MongoClient} client
 */
export async function begin(Block) {

    try {
        let n = Block.length;
        const size = 10;
        for (let i = 0; i < n; i++) {
            await CalculationForOneRow(Block[i]);
            if(await delay(Block[i].dateTime)) await updateAllRouters(Block[i].dateTime);
            console.log((i+1) + " " + Block[i].dateTime);
        }
    }
    catch (err) {
        console.log("ERROR in begin function\n",err);
        throw err;
    }

}
async function delay(dateTimeLine){
    const dateNow = new Date(Date.now());
    const msNow = dateNow.getTime() - dateNow.getTimezoneOffset()*60*1000;
    const msline = Date.parse(dateTimeLine);
    if(msline-msNow <= 0) return false;
    await new Promise((resolve,reject)=>{
        setTimeout(() => resolve() , 500);
    });
    return true;
}
/**
 * @param {Entries} routerPreviousInfo
 */

async function CalculationForOneRow(currRow) {
    try {
        if(currRow.type !==  "AdjChg") {
            const key = `InterfaceChg|${currRow.nbrID}|${currRow.areaID}`;
            if(currRow.type === "IF_ELIG_BCAST_UP") await localDB.hset('HASHMAP',key,"UP");
            else await localDB.hset('HASHMAP',key,"DOWN");
            return 0;
        }
        let IDs = {
            nbrID: currRow.nbrID,
            routerID: currRow.routerID,
            areaID: currRow.areaID,
            IPversion: currRow.IPversion,
        };
        const key = "AdjChg|"+JSON.stringify(IDs);
        if (! (await localDB.hexists('HASHMAP',key))){
            
            let firstRow = new Entries(IDs);
            firstRow.currentDateAndTime = currRow.dateTime;
            firstRow.currentState = currRow.finalState;
            if (currRow.finalState === 'Init') {
                firstRow.initToFullTime = Date.parse(currRow.dateTime);
                firstRow.initToFullTrack = true;
            }
            else firstRow.initToFullTrack = false;
            await localDB.hset('HASHMAP',key,JSON.stringify(firstRow));
            return firstRow;
        }
        let routerPreviousInfo = JSON.parse(await localDB.hget('HASHMAP',key));
        
        let chk1 = checkIfInconsistent(currRow, routerPreviousInfo);

        if (chk1) {
            routerPreviousInfo.currentDateAndTime = currRow.dateTime;
            routerPreviousInfo.currentState = currRow.finalState;
            if (currRow.finalState === 'Init') {
                routerPreviousInfo.initToFullTime = Date.parse(currRow.dateTime);
                routerPreviousInfo.initToFullTrack = true;
            }
            else routerPreviousInfo.initToFullTrack = false;
            routerPreviousInfo.oldCalculation = false;
            await localDB.hset('HASHMAP',key,JSON.stringify(routerPreviousInfo));
            return routerPreviousInfo;
        }


        let t1 = Date.parse(routerPreviousInfo.currentDateAndTime);
        let t2 = Date.parse(currRow.dateTime);

        let dataPointX = t2 - t1;
        let state = currRow.initialState;


        let previousAvg = routerPreviousInfo.averageTime[state];
        let previousVarience = routerPreviousInfo.Varience[state];
        let previousCount = routerPreviousInfo.dataPointCount[state];
        let dataPointSum = routerPreviousInfo.dataPointSum[state];


        routerPreviousInfo.averageTime[state] = updateAvgTime(previousAvg, previousCount, dataPointX);
        routerPreviousInfo.Varience[state] = updateVarience(previousVarience, previousCount, previousAvg, dataPointX);
        routerPreviousInfo.dataPointCount[state] += 1;
        routerPreviousInfo.dataPointSum[state] += dataPointX;
        routerPreviousInfo.currentState = currRow.finalState;
        routerPreviousInfo.currentDateAndTime = currRow.dateTime;


        if(state === 'Full' && dataPointX < previousAvg) routerPreviousInfo.numberOfTimesFullTimeGoesBelowMeanFullTime++; 


        if (currRow.finalState === 'Init') {
            routerPreviousInfo.initToFullTrack = true;
            routerPreviousInfo.initToFullTime = t2;
        }

        if (routerPreviousInfo.initToFullTrack && currRow.finalState === 'Full') {
            let previousAvgInitToFull = routerPreviousInfo.averageTime['InitToFull'];
            let previousVarienceInitToFull = routerPreviousInfo.Varience['InitToFull'];
            let previousInitToFullCount = routerPreviousInfo.dataPointCount['InitToFull'];
            let dataPointXInitToFull = t2 - routerPreviousInfo.initToFullTime;
            routerPreviousInfo.averageTime['InitToFull'] = updateAvgTime(previousAvgInitToFull, previousInitToFullCount, dataPointXInitToFull);
            routerPreviousInfo.Varience['InitToFull'] = updateVarience(previousVarienceInitToFull,previousInitToFullCount,previousAvgInitToFull,dataPointXInitToFull);
            routerPreviousInfo.dataPointCount['InitToFull'] += 1;
            if(dataPointXInitToFull > previousAvgInitToFull) routerPreviousInfo.numberOfTimesInitToFullTimeGoesAboveMeanInitToFullTime++;
            routerPreviousInfo.initToFullTrack = false;
        }
        await localDB.hset('HASHMAP',key,JSON.stringify(routerPreviousInfo));
        return routerPreviousInfo;
    }
    catch (err) {
        console.log("ERROR in CalculationForOneRow function\n",err);
        throw err;
    }

}


class Entries {
    constructor(IDs) {
        this.ids = IDs;
        this.currentState = '';
        this.currentDateAndTime = 0;
        this.initToFullTime = 0;
        this.initToFullTrack = false;
        this.status = "Gray";
        this.event = "";
        this.currentStatePriority = 0;
        this.averageTime = {
            InitToFull: 0,
            Down: 0,
            Attempt: 0,
            Init: 0,
            'Two-way': 0,
            Exstart: 0,
            Exchange: 0,
            Loading: 0,
            Full: 0,
        };

        this.dataPointSum = {
            InitToFull: 0,
            Down: 0,
            Attempt: 0,
            Init: 0,
            'Two-way': 0,
            Exstart: 0,
            Exchange: 0,
            Loading: 0,
            Full: 0,
        };

        this.dataPointCount = {
            InitToFull: 0,
            Down: 0,
            Attempt: 0,
            Init: 0,
            'Two-way': 0,
            Exstart: 0,
            Exchange: 0,
            Loading: 0,
            Full: 0,
        };

        this.Varience = {
            InitToFull: 0,
            Down: 0,
            Attempt: 0,
            Init: 0,
            'Two-way': 0,
            Exstart: 0,
            Exchange: 0,
            Loading: 0,
            Full: 0,
        };
        this.timeLeftOnCurrentState = 0;
        this.timePassedOnCurrentState = 0;
        this.numberOfTimesFullTimeGoesBelowMeanFullTime = 0;
        this.numberOfTimesInitToFullTimeGoesAboveMeanInitToFullTime = 0;
        this.oldCalculation = false;
    }
};

const dateNow = new Date(Date.now());
async function setStatusAndTimeLeft(row,currentDateAndTime){
    const state = row.currentState;
    const avg = row.averageTime[state];
    const sd = Math.sqrt(row.Varience[state]);
  

    const msLocalNowTrue = dateNow.getTime() - dateNow.getTimezoneOffset()*60*1000;
    const msLocalNowLine = Date.parse(currentDateAndTime);
    const msLocalPrev = (row.oldCalculation ? msLocalNowTrue : Date.parse(row.currentDateAndTime) );
    const timePassedTillNow = (msLocalNowLine - msLocalPrev);
    if(!avg) {
        row.status = (state === "Full" ? "Green" : "Gray");
        row.timePassedOnCurrentState = (state === "Full" ? timePassedTillNow : 0);
        row.timeLeftOnCurrentState = 0;
        return;
    }
    let timeLeft = Math.max(0,avg+(sd?sd:0)-timePassedTillNow);
    if(state === "Full") {
        let status = "Green";
        if(timePassedTillNow <= avg-sd) {
            status = "Green";
            row.event = "Within Average Range";
        }
        else if(timePassedTillNow <= avg + sd) {
            status = "Light Green";
            row.event = "Within Varience Range";
        }
        else {
            status = "Lighter Green";
            row.event = "Exceeded Predicted Time";
        }   
        row.status = status;
        row.timeLeftOnCurrentState = timeLeft;
        row.timePassedOnCurrentState = timePassedTillNow;
    }
    else {
        row.status = "Gray";
        row.timeLeftOnCurrentState = 0;
        row.timePassedOnCurrentState = 0;
    }

  
    const key = `InterfaceChg|${row.ids.nbrID}|${row.ids.areaID}`;
    if(await localDB.hexists('HASHMAP',key)){
        if(await localDB.hget('HASHMAP',key) === "DOWN"){
            if(state === "Down") row.status = "Red";
            else if(state === "Full") row.status = "Yellow";
            row.event = "Interface Down";
        }
        else {
            row.event = "Interface Up";
            if(state === "Full"){
                let status = "Green";
                if(timePassedTillNow <= avg-sd) {
                    status = "Green";
                    row.event = "Interface Up & \n Within Average Range";
                }
                else if(timePassedTillNow <= avg + sd) {
                    status = "Light Green";
                    row.event = "Interface Up & \nWithin Varience Range";
                }
                else {
                    status = "Lighter Green";
                    row.event = "Interface Up & \n Exceeded Predicted Time";
                }   
                row.status = status;
                row.timeLeftOnCurrentState = timeLeft;
                row.timePassedOnCurrentState = timePassedTillNow;
            }
        }
    }
    if(state === "Full") row.currentStatePriority = 1;
    else row.currentStatePriority = 0;


    return;
}


export async function updateAllRouters(currentDateAndTime){
    try{
        let queries = [];
        let keys = await localDB.hkeys('HASHMAP');
        keys = keys.filter((key) => {
            return (key.indexOf("AdjChg|")!==-1);
        });
        const values = await Promise.all(keys.map(key => localDB.hget('HASHMAP',key)));
        for(let val of values){
            val = JSON.parse(val);
            if (val._id) delete val._id;
            await setStatusAndTimeLeft(val,currentDateAndTime);
            const routerUpdateQuery =  {
                replaceOne: {
                    "filter": { ids: val.ids },
                    "replacement": val,
                    "upsert": true,
                }
            }
            queries.push(routerUpdateQuery);
        }
        await client.db(DB_NAME).collection(COLLECTION_NAME).bulkWrite(queries);
    }
    catch(err){
        console.log(`Error In update All Routers \n\n ${err}`);
    }
}
function checkIfInconsistent(currRow, previousRow) {
    return (currRow.initialState !== previousRow.currentState) || (previousRow.oldCalculation);
}

/**
 * 
 * @param {Number} previousAvg 
 * @param {Number} previousCount 
 * @param {Number} dataPointX 
 */
function updateAvgTime(previousAvg, previousCount, dataPointX) {
    const res = ((previousAvg * previousCount) + dataPointX) / (previousCount + 1);
    return res;
}

function updateVarience(Var, N, Mean, x) {
    //https://changyaochen.github.io/welford/
    //Welford's Algorithm
    if (N <= 0) return Var;
    const newVar = (Var * (N + 1) * (N + 1) + N * (x - Mean) * (x - Mean) - (N + 1) * Var) / ((N + 1) * (N + 1));
    return newVar;
}





