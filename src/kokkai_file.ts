import fs from "fs/promises";

async function convertKokkaiFile(filePath: string) {
  // filePath: kokkai/speech_122103815X00120260403,2026-04-03/1782731544905/sequence_answers_all.json
  if (!filePath.endsWith("sequence_party_answers_all.json")) {
    console.error("Invalid file path. Expected a path ending with 'sequence_answers_all.json'.");
    return;
  }
  const splittedFilePath = filePath.split("/");
  const dataId = splittedFilePath.find(p => p.includes("speech_"))?.replace(",", "_") || "";
  if (!dataId) {
    console.error("Invalid file path format. Data ID not found.");
    return;
  }
  const newFilePath = `kokkai_lambda/${dataId}/sequence_answers_all.json`;
  try {
    await fs.access(newFilePath);
    console.log("File exists, skip:", newFilePath);
    return;
  } catch (error) {
    console.error("File does not exist, regenerate :", newFilePath);
  }
  try {
    await fs.mkdir(`kokkai_lambda/${dataId}`, { recursive: true })
    const fileContent = await fs.readFile(filePath, "utf-8");
    await fs.writeFile(newFilePath, fileContent, "utf-8");
    console.log(`File converted and saved to: ${newFilePath}`);
  } catch(error) {
    console.error("Error reading or writing file:", error);
  }
}

async function readRootDirectory(rootDir: string) {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true, recursive: true });
    return entries.map((entry) => {
      return entry.isFile() ? `${entry.parentPath}/${entry.name}` : null;
    }).filter(Boolean)
  } catch (error) {
    console.error("Error reading root directory:", error);
  }
}

async function main() {
  const files = await readRootDirectory("kokkai");
  if (!files) {
    console.error("No files found in the root directory.");
    return;
  }
  console.log("Files found:", files);
  for (const file of files) {
    if (file) {
      await convertKokkaiFile(file);
    }
  }
}

async function main2() {
  const files = await readRootDirectory("kokkai_lambda");
  console.log("Files found in kokkai_lambda:", JSON.stringify(files, null, 2));
}

main();