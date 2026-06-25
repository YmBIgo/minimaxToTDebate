import fs from "fs/promises";
import OpenAI from "openai";
import type { Tree } from "./index.js";

type Category = {
  categoryId: string;
  name: string;
  description: string;
  answerIds: string[];
}

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = "gpt-5.1"

const categorizePrompt = (count: number) => { return `あなたは議論・答弁の分類専門家です。
与えられた答弁を「言っている内容の性質」で分類してください。

分類基準の例：
- 財源・コストを問題にしている
- 感情・不安に訴えている
- 制度設計を論じている
- 相手の前提を否定している
- 実現可能性を疑っている
- 代替案を提示している
- 責任追及をしている

注意：
- カテゴリ数は5〜${count}個程度にしてください。
- 1つの答弁は原則1カテゴリに入れてください。
- カテゴリ名は短く、説明は具体的にしてください。
- 答弁の表現ではなく、主張の性質で分類してください。
- 入力のcategoriesで答弁のカテゴリにないものがあれば、適切なカテゴリを追加してください。

入力例：
\`\`\`json
{
  "1": "その政策は理想論としては理解できますが、年間で数兆円規模の財源が必要になります。\n具体的にどこからその予算を確保するのか、説明が不十分です。",
  "2": "多くの国民が将来に不安を抱えています。\nまずはその不安に真摯に向き合い、安心できる環境を整えるべきです。",
  ... 残りの答弁 ,
  "categories": [
    "",
    "",
    "",
     ... 残りのカテゴリ
  ]
}
\`\`\`

出力例：
\`\`\`json
[
  {
    "categoryId": "C1",
    "name": "財源・コスト批判",
    "description": "政策や提案に対して、費用・財源・予算面の不備を指摘する答弁",
    "answerIds": ["1", "8", "21"]
  },
  {
    "categoryId": "C2",
    "name": "感情・不安への訴え",
    "description": "国民感情、不安、安心感、共感を中心に主張する答弁",
    "answerIds": ["2", "14", "33"]
  }
]
\`\`\`
`
}

async function getFrontier(filePath: string): Promise<Tree> {
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data) as Tree;
}

function traverseTree(tree: Tree, callback: (node: Tree) => void): void {
  callback(tree);
  for (const child of tree.children) {
    traverseTree(child, callback);
  }
}

async function main(filePath: string) {
  const now = Date.now().toString();
  const frontier = await getFrontier(filePath);
  console.log("Frontier loaded:", frontier);
  let As: string[] = [];
  let Bs: string[] = [];
  traverseTree(frontier, (node) => {
    if (node.history.position === "A") {
      As.push(node.history.content);
    } else if (node.history.position === "B") {
      Bs.push(node.history.content);
    }
  });
//   As = As.slice(0, 100);
  await fs.writeFile(`json/${now}_As.json`, JSON.stringify(As, null, 2), "utf-8");
  await fs.writeFile(`json/${now}_Bs.json`, JSON.stringify(Bs, null, 2), "utf-8");
  const splittedAs: string[][] = [];
  for (let i = 0; i < As.length; i += 50) {
    splittedAs.push(As.slice(i, i + 50));
  }
  const splittedBs: string[][] = [];
  for (let i = 0; i < Bs.length; i += 50) {
    splittedBs.push(Bs.slice(i, i + 50));
  }
  let categorizedAs: Category[] = [];
  for (let i = 0; i < splittedAs.length; i++) {
    console.log(`Categorizing As batch ${i + 1}/${splittedAs.length}`);
    const splittedA = splittedAs[i];
    if (!splittedA || splittedA.length === 0) continue;
    try {
      const response = await openaiClient.responses.create({
        model,
        input: JSON.stringify(
          {
            ...Object.fromEntries(splittedA.map((content, index) => [(i * 50 + index).toString(), content])),
            categories: categorizedAs.map(c => c.name)
          }
        ),
        instructions: categorizePrompt(10 + i * 3),
      });
      const newCategorizedAs: Category[] = JSON.parse(response.output_text.replace(/```json/, "").replace(/```/, ""));
      newCategorizedAs.forEach((c) => {
        if (!categorizedAs.some(existing => existing.categoryId === c.categoryId)) {
          categorizedAs.push(c);
        } else {
          categorizedAs = categorizedAs.map(existing => {
            if (existing.categoryId === c.categoryId) {
              return {
                ...existing,
                answerIds: Array.from(new Set([...existing.answerIds, ...c.answerIds]))
              }
            } else {
              return existing;
            }
          });
        }
      });
    } catch (error) {
      console.error("Error categorizing As:", error);
    }
  }
  console.log("Categorized As:", categorizedAs.length);
  await fs.writeFile(`json/${now}_categorized_As.json`, JSON.stringify(categorizedAs, null, 2), "utf-8");
  let categorizedBs: Category[] = [];
  for (let i = 0; i < splittedBs.length; i++) {
    console.log(`Categorizing Bs batch ${i + 1}/${splittedBs.length}`);
    const splittedB = splittedBs[i];
    if (!splittedB || splittedB.length === 0) continue;
    try {
      const response = await openaiClient.responses.create({
        model,
        input: JSON.stringify(
          {
            ...Object.fromEntries(splittedB.map((content, index) => [(i * 50 + index).toString(), content])),
            categories: categorizedBs.map(c => c.name)
          }
        ),
        instructions: categorizePrompt(10 + i * 3),
      });
      const newCategorizedBs: Category[] = JSON.parse(response.output_text.replace(/```json/, "").replace(/```/, ""));
      newCategorizedBs.forEach((c) => {
        if (!categorizedBs.some(existing => existing.categoryId === c.categoryId)) {
          categorizedBs.push(c);
        } else {
          categorizedBs = categorizedBs.map(existing => {
            if (existing.categoryId === c.categoryId) {
              return {
                ...existing,
                answerIds: Array.from(new Set([...existing.answerIds, ...c.answerIds]))
              }
            } else {
              return existing;
            }
          });
        }
      });
    } catch (error) {
      console.error("Error categorizing Bs:", error);
    }
  }
  console.log("Categorized Bs:", categorizedBs.length);
  await fs.writeFile(`json/${now}_categorized_Bs.json`, JSON.stringify(categorizedBs, null, 2), "utf-8");
}

main("json/1782301687211_tree.json").catch(console.error);