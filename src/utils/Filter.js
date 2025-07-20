import fs, { createWriteStream } from 'fs';
import { dirname } from 'path';


import readline from 'readline';

const __dirname = import.meta.dirname;
const inputFilePath =__dirname+"/logs/log_";
const ipv4Regex = "\\b([0-9]{1,3}\\.){3}([0-9]{1,3}){1}\\b";
const ipv6Regex = "\\b([0-9a-fA-F]{1,4}:){1}(:[0-9a-fA-F]{1,4}){4}\\b";
const combinedRegex = ipv4Regex + "|" + ipv6Regex;
const outputFilePath = __dirname+"/filteredOutput.csv";
const writeStream = createWriteStream(outputFilePath,{encoding:'utf8'});



/**
 * 
 * @param {String} line
 */
function extract(line){
    let row = {};
    if(line.indexOf('AdjChg:') !== -1) {
        let dateTime = line.slice(2,28);
        let regexCombined = new RegExp(combinedRegex,'g');
        let regexIPv4 = new RegExp(ipv4Regex,'g');
        const matches = line.match(regexCombined);
        let IPversion = (regexIPv4.test(matches[1]) ? "IPv4" : "IPv6");

        let startIndexOfInitialState = line.lastIndexOf(')') + 3;
        let endIndexOfInitialState = line.indexOf("-&gt;",startIndexOfInitialState)-2;
        let startIndexOfFinalState = endIndexOfInitialState + 7;
        let endIndexOfFinalState = line.indexOf("</div>",startIndexOfFinalState)-1;
        if(endIndexOfFinalState === -2) endIndexOfFinalState = line.length-1;
        let initialState = line.slice(startIndexOfInitialState,endIndexOfInitialState+1);
        let finalState = line.slice(startIndexOfFinalState+1,endIndexOfFinalState+1);
        row = {
            type:"AdjChg",
            dateTime:dateTime,
            routerID:matches[0],
            nbrID:matches[1],
            areaID:matches[2],
            initialState:initialState,
            finalState:finalState,
            IPversion:IPversion,
        }
    }
    else if(line.indexOf("IF_ELIG_BCAST_UP")!==-1){
        let dateTime = line.slice(2,28);
        let regexCombined = new RegExp(combinedRegex,'g');
        let regexIPv4 = new RegExp(ipv4Regex,'g');
        const matches = line.match(regexCombined);
        if(!matches || matches.length !== 2) return 0;
        let IPversion = (regexIPv4.test(matches[0]) ? "IPv4" : "IPv6");
        row = {
            type:"IF_ELIG_BCAST_UP",
            dateTime:dateTime,
            nbrID:matches[0],
            areaID:matches[1],
            IPversion:IPversion,
        }
    }
    else if(line.indexOf("IF_INTERFACE_DOWN")!==-1){
        let dateTime = line.slice(2,28);
        let regexCombined = new RegExp(combinedRegex,'g');
        let regexIPv4 = new RegExp(ipv4Regex,'g');
        const matches = line.match(regexCombined);
        if(!matches || matches.length !== 2) return 0;
        let IPversion = (regexIPv4.test(matches[0]) ? "IPv4" : "IPv6");
        row = {
            type:"IF_INTERFACE_DOWN",
            dateTime:dateTime,
            nbrID:matches[0],
            areaID:matches[1],
            IPversion:IPversion,
        }
    }
    else return 0;
    
    return row;
}


async function readFile(inputFilePath,allFilesData){
    let readStream = fs.createReadStream(inputFilePath,{encoding:'utf8'});
    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity,
    });
    for await (const l of rl){
        let row = extract(l);
        if(row!==0) allFilesData.push(row);
    }

}

export async function readAllFiles(){
    try{
        let allFilesData = [];
        for(let i = 1; i <= 225; i++){
            await readFile(inputFilePath+i,allFilesData);
        }
        allFilesData.sort((a,b)=>{
            let d1 = a.dateTime,d2 = b.dateTime;
            if(d1<d2) return -1;
            else if(d1>d2) return 1;
            return 0;
        });

        allFilesData.forEach((row)=>{
            if(row.type==="AdjChg") {
                writeStream.write(row.type + "," + row.dateTime + "," + row.nbrID + "," + row.IPversion + ","+ row.areaID +
                    "," + row.routerID + "," + row.initialState + "," + row.finalState + "\n");
            }
            else writeStream.write(row.type + "," + row.dateTime + "," + row.nbrID + "," + row.IPversion + ","+ row.areaID + "\n");
        });
        writeStream.close();

        return allFilesData;
    }
    catch(err){
        console.log(err);
    }
}
