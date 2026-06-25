import OpenAI from "openai";
import fs from "fs/promises";
import { randomUUID } from "crypto";

type History = {
  position: string;
  content: string;
  reason: string;
  score: number;
}

export type Tree = {
  id: string;
  history: History;
  parentTreeId: string | null;
  children: Tree[];
}

const predictStep = 7;

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = "gpt-5.1"

const systemInstruction = `あなたはディベートの達人です。
与えられた「テーマ」と「会話履歴」と「立場」をもとに、次に発言する内容の候補を以下の形式で3つまで出力してください。

出力JSONの型
\`\`\`json
[
  {
    "content": string,
    "reason": string,
    "score": number,
    "position": string
  },
  ... 残り2つ
]
\`\`\`

- content はおおむね150〜500文字程度で考えてください。
- reason はcontentの内容をなぜその発言をするのかの理由を説明してください。
- scoreはその発言までのAの立場の有利度を0から100の数値で表したものです。100に近いほどAの立場にとって有利な展開であることを示します。

・出力例
\`\`\`json
[
  {
    "content": "発言内容",
    "reason": "なぜその発言をするのかの理由",
    "score": "その発言までのAの立場の有利度を0から100の数値で表したもの。100に近いほどAにとって有利な展開であることを示す",
    "position": "A or B"
  },
  ... 残り2つ
]
\`\`\`

・入力例
テーマ: 「日本は原子力発電を推進すべきか」
会話履歴:
A: 日本は原子力発電を推進すべきだと思います。なぜなら、再生可能エネルギーだけではエネルギー需要を満たすことが難しいからです。
B: しかし、原子力発電には安全性の問題があります。福島第一原子力発電所の事故はそのリスクを明確に示しています。
立場: A
`;

async function chat(prompt: string, instruction?: string) {
  console.log("Searching for next move...", prompt.slice(0, 100));
  try {
    const response = await openaiClient.responses.create({
      model,
      input: prompt,
      instructions: instruction ?? "",
    });
    return response.output_text.replace(/```json/, "").replace(/```/, "");
  } catch (error) {
    console.error("Error in chat function:", error);
    return "[]";
  }
}

function getTreeById(frontier: Tree, id: string): Tree | null {
  if (frontier.id === id) {
    return frontier;
  }
  for (const child of frontier.children) {
    const result = getTreeById(child, id);
    if (result) {
      return result;
    }
  }
  return null;
}

function getTrajectoryFromFrontier(frontier: Tree, searchTree: Tree): History[] {
  const trajectory: History[] = [];
  let currentTree: Tree | null = searchTree;
  while (currentTree) {
    trajectory.push(currentTree.history);
    if (currentTree.parentTreeId) {
      currentTree = getTreeById(frontier, currentTree.parentTreeId);
    } else {
      currentTree = null;
    }
  }
  return trajectory.reverse();
}

async function generateTree(
  frontier: Tree, 
  currentTree: Tree,
  theme: string,
  position: string
) {
  const trajectory = getTrajectoryFromFrontier(frontier, currentTree);
  if (trajectory.length >= predictStep) {
    return frontier;
  }
  const prompt = `テーマ: ${theme}
会話履歴:
${trajectory.map(h => `${h.position}: ${h.content}`).join("\n")}
立場: ${position}`;
  const instruction = systemInstruction;
  const responseText = await chat(prompt, instruction);
  const nextHistories: History[] = JSON.parse(responseText);
  const nextTrees: Tree[] = nextHistories.map(history => ({
    id: randomUUID(),
    history,
    parentTreeId: currentTree.id,
    children: [],
  }));
  function dfs (tree: Tree, searchId: string): Tree | null {
    if (tree.id === searchId) {
      return tree;
    }
    for (const child of tree.children) {
      const s = dfs(child, searchId);
      if (s) {
        return s;
      }
    }
    return null;
  }
  const newCurrentTree = dfs(frontier, currentTree.id);
  if (!newCurrentTree) {
    throw new Error("Tree not found");
  }
  newCurrentTree.children.push(...nextTrees);
  const newPostition = position === "A" ? "B" : "A";
  await Promise.all(nextTrees.map(async (nextTree) => {
    await generateTree(frontier, nextTree, theme, newPostition);
  }));
  return frontier;
}

function minimax(
  frontier: Tree,
  currentTrees: Tree,
  resultTrajectory: History[],
  isMaximizing: boolean
): {score: number, result: History[]} {
  if (!currentTrees.children || currentTrees.children.length === 0) {
    return {
      score: currentTrees.history.score,
      result: [...resultTrajectory]
    };
  }
  if (isMaximizing) {
    let maxScore = -Infinity;
    let currentMaxTrajectory: History[] = [];
    for (const tree of currentTrees.children) {
      const minimaxResult = minimax(frontier, tree, [...resultTrajectory, tree.history], false);
      const score = minimaxResult.score;
      const trajectory = minimaxResult.result;
      if (score > maxScore) {
        maxScore = score;
        currentMaxTrajectory = [...trajectory];
      }
    }
    return {
      score: maxScore,
      result: currentMaxTrajectory ? [...currentMaxTrajectory] : resultTrajectory
    };
  } else {
    let minScore = Infinity;
    let currentMinTrajectory: History[] = [];
    for (const tree of currentTrees.children) {
      const minimaxResult = minimax(frontier, tree, [...resultTrajectory, tree.history], true);
      const score = minimaxResult.score;
      const trajectory = minimaxResult.result;
      if (score < minScore) {
        minScore = score;
        currentMinTrajectory = [...trajectory];
      }
    }
    return {
      score: minScore,
      result: currentMinTrajectory ? [...currentMinTrajectory] : resultTrajectory
    };
  }
}

async function main(firstState: string, theme: string) {
  console.time("main");
  const initialHistory: History = {
    position: "A",
    content: firstState,
    reason: "",
    score: 0,
  };
  const frontier = {
    id: randomUUID(),
    history: initialHistory,    
    parentTreeId: null,
    children: [],
  };
  const now = Date.now().toString();
  await generateTree(frontier, frontier, theme, "B");
  await fs.writeFile(`json/${theme}/${now}_tree.json`, JSON.stringify(frontier, null, 2));
  main2(now, frontier, theme);
  console.timeEnd("main");
}

async function main2(now: string, frontier?: Tree, theme?: string) {
  let frontier2: Tree;
  if (!frontier) {
    frontier2 = JSON.parse(await fs.readFile(`json/1781693458292_tree.json`, "utf-8")) as Tree;
  } else {
    frontier2 = frontier;
  }
  const resultTrajectory = minimax(frontier2, frontier2, [], false);
  console.log("Best trajectory:", resultTrajectory);
  await fs.writeFile(`json${theme ? `/${theme}` : ""}/${now}_trajectory.json`, JSON.stringify(resultTrajectory, null, 2));
}

// const lawStatement = `自民党として、国民投票制度の適切な運用に向け、まず必要な環境整備を着実に進めるべきと考えます。特に、開票立会人制度の整備、投票立会人要件の緩和、FM放送による広報追加の3項目については、速やかな法案提出と審議入りが必要です。また、CM規制については、国民投票運動における表現の自由を尊重しつつ、法規制よりも自主規制を基本に公平性を確保すべきと考えます。加えて、ネット広告やSNS上の偽情報、ディープフェイクへの対応は重要な課題であり、通常選挙での議論も踏まえながら慎重に検討を深める必要があります。資金規制についても理念面・実務面の双方から丁寧な議論が求められます。あわせて、公正中立な情報提供を担う国民投票広報協議会の体制整備も進め、国民が適切に判断できる環境を整えるべきと考えます。`
// const lawTitle = "国民投票制度の適切な運用に向け、まず必要な環境整備を着実に進めるべきか";
const iranStatement = `現在の中東情勢、とりわけイスラエル及び米国によるイラン攻撃について、我が国として重大な関心を持って注視しております。何より重要なのは、在留邦人の安全確保であります。
安全保障法制上の『存立危機事態』や『重要影響事態』への該当性については、個別具体的な状況を総合的に勘案し、政府が慎重に判断すべきものであり、現時点で直ちに該当すると判断する状況にはありません。
政府には、関係国と緊密に連携しつつ、事態の早期鎮静化に向け、外交努力を尽くしていただきたいと思います。`
const iranTitle = "イラン情勢と日本の安全保障法制上の事態認定";

// main("日本は原子力発電を推進すべきだと思います。なぜなら、再生可能エネルギーだけではエネルギー需要を満たすことが難しいからです。", "日本は原子力発電を推進すべきか");
// main2(Date.now().toString());
main(iranStatement, iranTitle);
