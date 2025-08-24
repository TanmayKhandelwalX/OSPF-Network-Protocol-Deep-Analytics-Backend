import fs from 'fs';
import { GoogleGenAI } from "@google/genai";
import { client,connectDB,closeDB } from "../db/connection.js";
import { COLLECTION_NAME,DB_NAME,GEMINI_API_KEY,OLLAMA_LLM_MODEL,OLLAMA_URL,PERPLEXITY_API_KEY} from "../constants.js";
import { localDB } from '../main.js';
import { ChatOllama } from "@langchain/ollama";
import OpenAI from 'openai';

const __dirname = import.meta.dirname;
let outputFilePath = __dirname+"/context.txt";
let writeStream = fs.createWriteStream(outputFilePath,{encoding:'utf8'});

async function calculateDataFromDBForLLM() {
    let data = [];
    let keys = await localDB.hkeys('HASHMAP');
    keys = keys.map((key) => {
        if(key.indexOf("AdjChg|")!==-1) return key;
    });
    const values = await Promise.all(keys.map(key => localDB.hget('HASHMAP',key)));
    values.forEach((val)=>{
        val = JSON.parse(val);
        data.push(val);
    });
    let unqRouterID = new Set(),unqAreaID = new Set(),unqNbrID = new Set();
    let mostLikelyToFail = [];
    let mostStable = [];
    let mostUnstable = [];
    data.forEach((val,key)=>{
        unqRouterID.add(val.ids.routerID);
        unqAreaID.add(val.ids.areaID);
        unqNbrID.add(val.ids.nbrID);
        mostStable.push([val.ids,val.averageTime.Full,val.averageTime.Down]);
        if(val.status === "Red" || val.status === "Yellow") mostLikelyToFail.push(val.ids); 
    });
    mostUnstable = mostStable;
    mostStable.sort((r1,r2)=>{
        return r1[1]>r2[1];
    });
    mostUnstable.sort((r1,r2)=>{
        return r1[2]>r2[2];
    });

    let context = "",i=0;
    context+="All Unique or different  area Id's present in dataset are as follows\n";
    unqAreaID.forEach((val)=>{
        context+=`${++i}) ${val}\n`;
    });
    i=0;
    context+="\n\n\nAll Unique or different router Id's present in dataset are as follows\n";
    unqRouterID.forEach((val)=>{
        context+=`${++i}) ${val}\n`;
    });
    i=0;
    context+="\n\n\nAll Unique or different neighbour Id's or nbr Id's present in dataset are as follows\n";
    unqNbrID.forEach((val)=>{
        context+=`${++i}) ${val}\n`;
    });

    context+="\n\n\nRouters or Neighbours which are Most Stable or Suitable or Perfect or have Maximum Full time or Maximum Uptime are as follows\n";

    mostStable.forEach((val,i)=>{
        if(i>=10) return;
        context+=`\n${i+1}) neighbour Id or nbrID = ${val[0].nbrID} , router ID = ${val[0].routerID} , area ID = ${val[0].areaID} , IP Version = ${val[0].IPversion} and has Uptime of ${val[1]/1000} seconds\n`
    });

    context+="\n\n\nRouters or Neighbours which are Most Unstable or Suitable or ImPerfect or have Maximum Down time or Maximum Shut Down Time are as follows\n";

    mostUnstable.forEach((val,i)=>{
        if(i>=10) return;
        context+=`\n${i+1}) neighbour Id or nbrID = ${val[0].nbrID} , router ID = ${val[0].routerID} , area ID = ${val[0].areaID} , IP Version = ${val[0].IPversion} and has Down Time of ${val[2]/1000} seconds\n`
    });
    

    context+="\n\n\nRouters or Neighbours which are Most Likely to Fail next or Go to Down State or Stop working are as follows\n";

    mostLikelyToFail.forEach((val,i)=>{
        if(i>=10) return;
        context+=`\n${i+1}) neighbour Id or nbrID = ${val.nbrID} , router ID = ${val.routerID} , area ID = ${val.areaID} , IP Version = ${val.IPversion}\n`
    });

    context+="\nWhenever churn or churn recovery is mentioned or time taken from reaching from Down or Init to Full State is mentioned always refer to Init To Full average time to answer the query \n\n"
    context+="\n\nFor any further queries refer to full Dataset as follows or answer based on general knowledge of OSPF networks \n\n";

    data.forEach((val,i)=>{
        let averageTime = "";
        Object.entries(val.averageTime).forEach((arr)=>{
            if(arr[0] == "InitToFull") averageTime+=`Average time in Transitioning From Init State to Full State is = ${arr[1]/1000} seconds \n`;
            else averageTime+=`average time spent at State ${arr[0]} = ${arr[1]/1000} seconds \n`;
        });
        context+=`\n${i+1}) neighbour Id or nbrID = ${val.ids.nbrID} , router ID = ${val.ids.routerID} , area ID = ${val.ids.areaID} , IP Version = ${val.ids.IPversion} and has Average Time For Each Ospf State as Follows
                    \n${averageTime}\n
                    It is currently in the "${val.currentState}" state, has spent ${val.timePassedOnCurrentState / 1000} seconds in this state, and it is predicted to remain in this state for another ${(val.timeLeftOnCurrentState/1000) ? val.timeLeftOnCurrentState/1000 : "few"} seconds.`;
    });
    return context;
}

const geminiLLM = new GoogleGenAI({ apiKey: GEMINI_API_KEY});
const localLLM = new ChatOllama({
    model: OLLAMA_LLM_MODEL,
    temperature: 0.5,
    maxRetries: 90,
    baseUrl:OLLAMA_URL,
    streaming:true
});

const perplexityAI = new OpenAI({ apiKey: PERPLEXITY_API_KEY,baseURL:"https://api.perplexity.ai"});
export async function askLLM(userQuery){
    const context = await calculateDataFromDBForLLM();
    const llmQuery = `Latest Data:\n ${context}\n Use the above Data as well as All Knowledge about OSPF Networks in general to Provide Accurate and Precise Answer to the Following Question : \n 
                    ${userQuery} \n`;

    try{
        writeStream.write(llmQuery);
        
        const geminiResult = (await geminiLLM.models.generateContent({
            model: "gemini-2.0-flash",
            contents:llmQuery
        })).text;
        console.log("USING gemini-2.0-flash");
        
        return geminiResult;
    }catch(err) {
        try{
            const geminiResult = (await geminiLLM.models.generateContent({
                model: "gemini-2.0-flash-lite",
                contents:llmQuery
            })).text;
            console.log("USING gemini-2.0-flash-lite");
            return geminiResult;
        }
        catch(err){
            console.log("USING Perplexity");
            const perplexityQuery = [
                {   
                    "role": "user",
                    "content": llmQuery
                },
            ]
            const perplexityResult = await perplexityAI.chat.completions.create({
                model: "sonar-pro",
                messages: perplexityQuery,
            });
            return perplexityResult.choices[0].message.content;
        }
    }
}



























