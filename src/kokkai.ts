import fs from "fs/promises";
import {getLLMResponse} from "./llm/index.js";
import { categorizePrompt, pickTopicsPrompt, searchParticipantPrompt } from "./prompt/index.js";

const textChunkSize = 5;
const answerChunkSize = 10;
const categoryChunkSize = 15;

const llmType = "openai"; // Change this to 'openai' or 'plamo' or 'anthropic' as needed

export type Participant = {
  name: string;
  party: string;
  familyName: string;
}

export type Answer = {
  name: string;
  party: string;
  content: string;
}

export type People = {
  name: string;
  party: string;
}

export type Category = {
  categoryId: string;
  name: string;
  description: string;
  answerIds: string[];
  answerIdsPeople: People[] | undefined;
}

/*
以下の型の方がいいか？
{
  "who": "",
  "action": "",
  "object": "",
  "reason": "",
  "condition": "",
  "claimType": ""
}
*/

function convertParticipant(data: any): Participant {
  return {
    name: String(data.name),
    party: String(data.party),
    familyName: String(data.familyName)
  };
}
async function readKokkaiData(filePath: string): Promise<any> {
  const data = await fs.readFile(filePath, "utf-8");
  return data;
}

async function main(filePath: string) {
  const now = Date.now();
  const data = await readKokkaiData(filePath);
  const firstLine = data.split("\n")[0];
  await fs.mkdir(`kokkai/${firstLine}/${now}`, { recursive: true });
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
  let topicData: Record<string, string> = {};
  try {
    console.log("Fetching topic data...");
    const topicResponse = await getLLMResponse(
      "openai",
      answerData.join("○").slice(0, 2000),
      pickTopicsPrompt,
    );
    topicData = JSON.parse(topicResponse.replace(/```json/g, "").replace(/```/g, ""));
    await fs.writeFile(`kokkai/${firstLine}/${now}/topics.json`, JSON.stringify(topicData, null, 2), "utf-8");
  } catch (error) {
    console.error("Error fetching topic data:", error);
    return;
  }
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
        answerList.push({
          name: answerName.name,
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
  let partyAnswerTopics: Record<string, Category[]> = {};
  await Promise.all(answerListParty.map(async(party) => {
    console.log(`Processing answers for party: ${party}`);
    const filteredAnswers: Answer[] = answerList.filter((answer) => answer.party === party);
    const splittedFilteredAnswer: Answer[][] = [];
    for (let i = 0; i < filteredAnswers.length; i += answerChunkSize) {
      splittedFilteredAnswer.push(filteredAnswers.slice(i, i + answerChunkSize));
    }
    partyAnswerTopics[party] = [];
    for(let i = 0; i < splittedFilteredAnswer.length; i++) {
      console.log(`Categorizing answers for party ${party}, chunk ${i + 1}/${splittedFilteredAnswer.length}`);
      const answerChunk = splittedFilteredAnswer[i];
      if (!answerChunk || answerChunk.length === 0) {
        continue;
      }
      try {
        const categorizeResponse = await getLLMResponse(
          llmType,
          JSON.stringify(
            {
              ...Object.fromEntries(answerChunk.map((answer, index) => [i * answerChunkSize + index, answer.content])),
              categories: partyAnswerTopics[party],
              topics: topicData
            }
          ),
          categorizePrompt(categoryChunkSize + i * categoryChunkSize),
        );
        const categories: Category[] = JSON.parse(categorizeResponse.replace(/```json/g, "").replace(/```/g, ""));
        for (const newCategory of categories) {
          const existing = partyAnswerTopics[party].find(
            (category) => category.name === newCategory.name
          );

          if (existing) {
            existing.answerIds = Array.from(
              new Set([...existing.answerIds, ...newCategory.answerIds])
            );
          } else {
            partyAnswerTopics[party].push(newCategory);
          }
        }
      } catch (error) {
        console.error(`Error categorizing answers for party ${party}:`, error);
      }
    }
  }));
  for (const party in partyAnswerTopics) {
    if (!partyAnswerTopics[party]) continue;
    partyAnswerTopics[party] = partyAnswerTopics[party].map((category) => {
      let filteredAnswers: Answer[] = answerList.filter((answer) => answer.party === party);
      category.answerIdsPeople = category.answerIds.map((answerId) => {
        const answer = filteredAnswers.find((_, index) => String(index) === answerId);
        if (!answer) return undefined;
        return {
          name: answer.name,
          party: answer.party
        };
      }).filter(Boolean) as { name: string; party: string }[];
      return category;
    });
  }
  let partyAnswerTopicsOutput: Record<string, Category[]> = {};
  for (const party in partyAnswerTopics) {
    if (!partyAnswerTopics[party]) continue;
    const filteredAnswers: Answer[] = answerList.filter((answer) => answer.party === party);
    partyAnswerTopicsOutput[party] = partyAnswerTopics[party].map((category) => {
      return {
        categoryId: category.categoryId,
        name: category.name,
        description: category.description,
        answerIds: category.answerIds,
        answerIdsString: category.answerIds
        .map((answerId) => {
          const a = filteredAnswers.find((_, index) => String(index) === answerId);
          if (!a) return undefined;
          return `【${a.name}（${a.party}）】\n${a.content}`;
        })
        .filter(Boolean), // undefinedを除外
        answerIdsPeople: category.answerIdsPeople
      }
    });
  }
  await fs.writeFile(`kokkai/${firstLine}/${now}/partyAnswerTopicsResults.json`, JSON.stringify({
    ...partyAnswerTopicsOutput,
    ...topicData
  }, null, 2), "utf-8");
  await fs.writeFile(`kokkai/${firstLine}/${now}/partyAnswerTopics.json`, JSON.stringify({
    ...partyAnswerTopics,
    ...topicData
  }, null, 2), "utf-8");
}
// kokkai_raw/speeches/speech_122114324X00120260304,2026-03-04.txt
// ./txt/FKG004_20260623_155516.txt
// kokkai_raw/speeches/speech_122103815X00520260424,2026-04-24.txt
// kokkai_raw/speeches/speech_122103968X00220260306,2026-03-06.txt
// kokkai_raw/speeches/speech_122103968X00720260415,2026-04-15.txt
// kokkai_raw/speeches/speech_122104080X00320260415,2026-04-15.txt
main("kokkai_raw/speeches/speech_122104080X00320260415,2026-04-15.txt").catch((error) => {
  console.error("Error:", error);
});