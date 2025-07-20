
import { createWriteStream } from "fs";
import { readAllFiles } from "./Filter.js";

const __dirname = import.meta.dirname;
const outputFilePath = __dirname+"/syntheticOutput.csv";
const writeStream = createWriteStream(outputFilePath,{encoding:'utf8'});
let allFilesData = await readAllFiles();

console.log("FILTERED ALL LOG FILES  " + allFilesData.length);

function dateToISOLikeButLocal(date) {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal =  date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    return iso;
}
function setNewDate(row,prev,ck){
    const delay = (ck ? Math.round(Math.random()*10000) : Math.round(Math.random()*1000));
    const newMs = prev.ms + delay;
    row.dateTime = dateToISOLikeButLocal(new Date(newMs));
    prev.ms = newMs;
    return row;
}
export function makeNewlines(){
    let newData = [];
    let mp = new Map();
    allFilesData.forEach((row)=>{
        if(row.type === "AdjChg") {
            const key = `${row.nbrID.trim()} | ${row.areaID.trim()}`;
            if(!mp.has(key)) {
                let st = new Set();
                st.add(row.routerID);
                mp.set(key,st);
            }
            else {
                let routerIds = mp.get(key);
                routerIds.add(row.routerID);
                mp.set(key,routerIds);
            }
        }
    });
    let ifcnt = 0,prev = {ms:Date.now()};
    allFilesData.forEach( (row) => {
        if(row.type === "AdjChg") {
            newData.push(setNewDate(row,prev,0));
        }
        else {
            ifcnt++;
            let upRow = {},downRow = {};
            if(row.type === "IF_ELIG_BCAST_UP") {
                downRow = {...row};
                downRow.type = "IF_INTERFACE_DOWN";
                upRow = {...row};
            }
            else {
                downRow = {...row};
                upRow = {...row};
                upRow.type = "IF_ELIG_BCAST_UP";
            }
            const key = `${row.nbrID.trim()} | ${row.areaID.trim()}`;
            if(ifcnt%5!==0 && mp.has(key)) {
                mp.get(key).forEach((rid) => {
                    let log = {...row};
                    log.type = "AdjChg";
                    log.routerID = rid;
                    log.initialState = "Exchange";
                    log.finalState = "Full";
                    newData.push(setNewDate(log,prev,1));
                });
               
            }
            newData.push(setNewDate(downRow,prev,0));
            
            if(ifcnt%5!==0 && mp.has(key)) {
                mp.get(key).forEach((rid) => {
                    let log = {...row};
                    log.type = "AdjChg";
                    log.routerID = rid;
                    log.initialState = "Full";
                    log.finalState = "Down";
                    newData.push(setNewDate(log,prev,1));
                });
               
            }
            newData.push(setNewDate(upRow,prev));
            if(ifcnt%5!==0 && mp.has(key)) {
                mp.get(key).forEach((rid) => {
                    let log = {...row};
                    log.type = "AdjChg";
                    log.routerID = rid;
                    log.initialState = "Down";
                    log.finalState = "Init";
                    newData.push(setNewDate(log,prev,1));
                });
                mp.get(key).forEach((rid) => {
                    let log = {...row};
                    log.type = "AdjChg";
                    log.routerID = rid;
                    log.initialState = "Exchange";
                    log.finalState = "Full";
                    newData.push(setNewDate(log,prev,1));
                });
            }
        }
    });
    newData.forEach((row)=>{
        if(row.type === "AdjChg") {
            writeStream.write(row.type + "," + row.dateTime + "," + row.nbrID + "," + row.IPversion + ","+ row.areaID +
                "," + row.routerID + "," + row.initialState + "," + row.finalState + "\n");
        }
        else writeStream.write(row.type + "," + row.dateTime + "," + row.nbrID + "," + row.IPversion + ","+ row.areaID + "\n");
    });
    return newData;
}




