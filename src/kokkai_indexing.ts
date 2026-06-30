import fs from 'fs/promises';
import { getLLMResponse } from './llm/index.js';
import { pickTopicsPrompt, searchParticipantPrompt, sequencePrompt } from './prompt/index.js';
import type { Answer, Participant } from './kokkai.js';

const keyword = "安全保障";

async function analyzeFileAndGetCount(filePath: string): Promise<number> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const searchKeyword = keyword;
    const count = (fileContent.match(new RegExp(searchKeyword, 'g')) || []).length;
    if (count > 0) {
      console.log(`File: ${filePath}, Count of '${searchKeyword}': ${count}`);
    }
    return count;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return 0;
  }
}

async function analyzeFiles(rootFilePath: string): Promise<void> {
  try {
    const files = await fs.readdir(rootFilePath, { withFileTypes: true });
    // const fullPath = "/Users/kazuyakurihara/Documents/work/llm/minimax_tree/kokkai_raw/speeches/speech_122104080X00720260513,2026-05-13.txt";
    // const cnt = await analyzeFileAndGetCount(fullPath);
    // if (cnt === 0) {
    //   console.log(`No occurrences of '${keyword}' found in the specified file.`);
    //   return;
    // }
    // mainStep(fullPath);
    // return;
    for (const file of files.slice(0, 200)) {
      const fullPath = `${rootFilePath}/${file.name}`;
      if (file.isDirectory()) {
        // await analyzeFiles(fullPath);
        continue; // Skip directories for now
      } else if (file.isFile() && file.name.endsWith('.txt')) {
        // const count = await analyzeFileAndGetCount(fullPath);
        // countSum += count;
        // console.log(`File: ${fullPath}, Count of '○': ${count}`);
        const count = await analyzeFileAndGetCount(fullPath);
        if (count === 0) continue;
        mainStep(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${rootFilePath}:`, error);
  }
}


const textChunkSize = 5;
const answerChunkSize = 30;
// const categoryChunkSize = 15;

async function main() {
  const rootFilePath = './kokkai_raw/speeches';
  await analyzeFiles(rootFilePath);
}

function convertParticipant(data: any): Participant {
  return {
    name: String(data.name).replace(/\s*君\s*$/, "").trim(),
    party: String(data.party),
    familyName: String(data.familyName)
  };
}
async function readKokkaiData(filePath: string): Promise<any> {
  const data = await fs.readFile(filePath, "utf-8");
  return data;
}

async function mainStep(filePath: string) {
  const fileName = filePath.split("/").pop() || "unknown_file";
  const fileNameWithoutExtension = fileName.split(".")[0] ?? "unknown_file";
  const now = Date.now();
  const data = await readKokkaiData(filePath);
  // const firstLine = data.split("\n")[0].replace(/[\s\n]+/g, "").trim();
  const firstLine = fileNameWithoutExtension.replace(/[\s\n]+/g, "").trim();
  try {
    await fs.access(`kokkai/${firstLine}`);
    return; // 一旦再生成はしない。
  } catch (error) {
    await fs.mkdir(`kokkai/${firstLine}/${now}`, { recursive: true });
  }
  const participantData = data.split("本日の会議に付した案件")[0];
  const splitIndicator = data.includes("――――◇―――――");
  const circleIndicator = data.includes("○");
  if (!splitIndicator && !circleIndicator) {
    console.error("The data does not contain the expected split indicator '――――◇―――――'. Please check the input file format.");
    return;
  }
  const answerData = splitIndicator
  ?
   data.split("――――◇―――――").slice(1).join("\n\n").split("○")
  :
   data.split("○").slice(1);
  console.log(`Read ${answerData.length} answers from the file.`);
  const splittedAnswerData: string[] = [];
  for(let i = 0; i < answerData.length; i+=textChunkSize) {
    splittedAnswerData.push(answerData.slice(i, i + textChunkSize).join("○"));
  }
  let participantList: Participant[] = [];
  try {
    console.log("Fetching participant data...");
    const participantResponse = await getLLMResponse(
      "openai",
      participantData,
      searchParticipantPrompt,
      true
    );
    participantList = JSON.parse(participantResponse.replace(/```json/g, "").replace(/```/g, "")).map(convertParticipant);
    console.log(`Fetched ${participantList.length} participants.`);
  } catch (error) {
    console.error("Error fetching participant data:", error);
    return;
  }
  if (!participantList || participantList.length === 0) {
    console.error("No participants found.");
    // 全文から指名を抜き出す
    const lines = data.split("\n");
    const nameRegex = /([^\s]*)\s*([^\s]+)\s*君/; // 「名字 名前 君」の形式を想定
    const foundNames: Set<string> = new Set();
    for (const line of lines) {
      const match = line.match(nameRegex);
      if (match) {
        const familyName = match[1];
        const givenName = match[2];
        foundNames.add(`${familyName} ${givenName}`);
      }
    }
    const foundNameArray = Array.from(foundNames);
    if (foundNameArray.length === 0) {
      return;
    }
    try {
      console.log("Fetching participant data from found names...");
      const participantResponse = await getLLMResponse(
        "openai",
        JSON.stringify(foundNameArray),
        searchParticipantPrompt,
        true
      );
      participantList = JSON.parse(participantResponse.replace(/```json/g, "").replace(/```/g, "")).map(convertParticipant);
      console.log(`Fetched ${participantList.length} participants from found names.`);
    } catch (error) {
      console.error("Error fetching participant data from found names:", error);
      return;
    }
    if (!participantList || participantList.length === 0) {
      console.error("No participants found from found names.");
      return;
    }
    // return;
  }
  await fs.writeFile(`kokkai/${firstLine}/${now}/participants.json`, JSON.stringify(participantList, null, 2), "utf-8");
  let answerList: Answer[] = [];
  try {
    console.log("Fetching answer data...");
    for(let i = 0; i < splittedAnswerData.length; i++) {
      const chunk = splittedAnswerData[i];
      console.log(`Processing answer chunk: ${i + 1}/${splittedAnswerData.length}`);
      // openAIに問い合わせるのは非効率なのでやめる
      // const answerResponse = await openaiClient.responses.create({
      //   model,
      //   input: chunk + "\n\n議員\n" + JSON.stringify(participantList),
      //   instructions: nameAnswerLinkPrompt,
      // });
      // answerList = [...answerList, ...JSON.parse(answerResponse.output_text.replace(/```json/g, "").replace(/```/g, ""))];
      const answerContents = chunk?.split("○").map((ch) => {
        return ch.split("　").slice(1).join("　");
      });
      const answerNames = chunk?.split("○").map((ch) => {
        return ch.split("　")[0];
      });
      if (answerNames?.length !== answerContents?.length) {
        console.warn(`Answer names and contents length mismatch in chunk ${i + 1}. Skipping this chunk.`);
        continue;
      }
      answerNames?.forEach((name, index) => {
        const answerName = participantList.find((p) => {
          return (name && name.startsWith(p.familyName))
            || (name && name.startsWith(p.familyName + p.name.slice(p.familyName.length, p.familyName.length + 1)))
            || (name && name.includes(p.familyName+"君"));
        });
        if (!answerName) return;
        const content = answerContents?.[index];
        if (!content) return;
        const kunExcludedName = answerName.name.replace(/\s*君\s*$/, "").trim();
        answerList.push({
          name: kunExcludedName,
          party: answerName.party,
          content,
        });
      });
    };
    console.log(`Fetched ${answerList.length} answers.`);
  } catch (error) {
    console.error("Error fetching answer data:", error);
    return;
  }
  await fs.writeFile(`kokkai/${firstLine}/${now}/answers.json`, JSON.stringify(answerList, null, 2), "utf-8");
  const answerListParty = Array.from(new Set(answerList.map((answer) => {
    return answer.party
  })));
  const answerListName = Array.from(new Set(answerList.map((answer) => {
    return answer.name
  })));
  console.log(`Unique parties: ${answerListParty.length}, Unique names: ${answerListName.length}`);
  const spllitedAnswerList: Answer[][] = [];
  for(let i = 0; i < answerList.length; i+=answerChunkSize) {
    spllitedAnswerList.push(answerList.slice(i, i + answerChunkSize));
  }
  let sequenceAnswersListResult: Record<string, any[]> = {};
  let sequencePartyAnswersListResult: Record<string, any[]> = {};
  for (let i = 0; i < spllitedAnswerList.length; i++) {
    const chunk = spllitedAnswerList[i];
    let sequenceAnswersList: Record<string, any[]> = {};
    let sequencePartyAnswersList: Record<string, any[]> = {};
    if (!chunk || chunk.length === 0) {
      console.warn(`Answer chunk ${i + 1} is empty. Skipping this chunk.`);
      continue;
    }
    console.log(`Processing answer chunk ${i + 1}/${spllitedAnswerList.length} with ${chunk.length} answers.`);
    await Promise.all(chunk.map(async(answer) => {
      if (!answer.name || !answer.party || !answer.content) {
        console.warn(`Incomplete answer data in chunk ${i + 1}:`, answer);
        return;
      }
      const systemPrompt = sequencePrompt;
      const llmType = 'openai'; // or 'anthropic' or 'plamo'
      const response = await getLLMResponse(llmType, answer.content, systemPrompt);
      const sequenceAnswer = JSON.parse(response.replace(/```json/g, "").replace(/```/g, ""));
      if (!sequenceAnswersList[answer.name]) {
        sequenceAnswersList[answer.name] = [];
      }
      sequenceAnswersList[answer.name] = [...(sequenceAnswersList[answer.name] ?? []), ...sequenceAnswer
        .map((item:any) => ({...item, party: answer.party }))
      ];
      if (!sequencePartyAnswersList[answer.party]) {
        sequencePartyAnswersList[answer.party] = [];
      }
      sequencePartyAnswersList[answer.party] = [...(sequencePartyAnswersList[answer.party] ?? []), ...sequenceAnswer
        .map((item:any) => ({...item, name: answer.name }))
      ];
    }));
    await fs.writeFile(`kokkai/${firstLine}/${now}/sequence_answers_${firstLine}_${i + 1}.json`, JSON.stringify(sequenceAnswersList, null, 2), "utf-8");
    await fs.writeFile(`kokkai/${firstLine}/${now}/sequence_party_answers_${firstLine}_${i + 1}.json`, JSON.stringify(sequencePartyAnswersList, null, 2), "utf-8");
    Object.entries(sequenceAnswersList).forEach(([key, value]) => {
      sequenceAnswersListResult[key] = [...(sequenceAnswersListResult[key] ?? []), ...value];
    });
    Object.entries(sequencePartyAnswersList).forEach(([key, value]) => {
      sequencePartyAnswersListResult[key] = [...(sequencePartyAnswersListResult[key] ?? []), ...value];
    });
    console.log(`Saved sequence answers for chunk ${i + 1} to files.`);
  }
  await fs.writeFile(`kokkai/${firstLine}/${now}/sequence_answers_all.json`, JSON.stringify(sequenceAnswersListResult, null, 2), "utf-8");
  await fs.writeFile(`kokkai/${firstLine}/${now}/sequence_party_answers_all.json`, JSON.stringify(sequencePartyAnswersListResult, null, 2), "utf-8");
  console.log(`Saved all sequence answers to files.`);
}

main().catch(error => {
  console.error('Error in main execution:', error);
});