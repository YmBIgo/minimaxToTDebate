import fs from "fs/promises";

// https://kokkai.ndl.go.jp/api.html の利用条件に従い、delayを入れる。
async function slowFetch(url: string, options: any = {}, delay: number = 5000): Promise<Response> {
  await new Promise(resolve => setTimeout(resolve, delay));
  return fetch(url, options);
}

// url sample
// https://kokkai.ndl.go.jp/api/speech?any=%E3%80%82&issueID=122105254X00620260313&recordPacking=json&from=2026-03-13&until=2026-03-13&maximumRecords=100&startRecord=1
// https://kokkai.ndl.go.jp/api/meeting_list?from=2026-02-18&until=2026-03-18&recordPacking=json&maximumRecords=100&startRecord=1

async function getSpeechRecord(
  startDate: string,
  endDate: string,
  maxRecords: number = 100,
  startRecord: number = 1
): Promise<string[][]> {
  console.log(`Fetching speech records from ${startDate} to ${endDate}, startRecord: ${startRecord}`);
  const URL = `https://kokkai.ndl.go.jp/api/meeting_list?from=${startDate}&until=${endDate}&recordPacking=json&maximumRecords=${maxRecords}&startRecord=${startRecord}`;
  try {
    const response = await slowFetch(URL, {}, 5000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const meetingIssueIds = (data.meetingRecord ?? []).map((meeting: any) => [
      String(meeting.issueID),
      String(meeting.date)
    ]);
    if (meetingIssueIds.length === maxRecords) {
      const nextStartRecord = startRecord + maxRecords;
      const nextMeetingIssueIds = await getSpeechRecord(startDate, endDate, maxRecords, nextStartRecord);
      return meetingIssueIds.concat(nextMeetingIssueIds);
    }
    return meetingIssueIds;
  } catch (error) {
    console.error(`Failed to fetch speech records from ${startDate} to ${endDate}:`, error);
    return [];
  }
}

// 2/18〜3/17, 3/18〜4/17, 4/18〜5/17, 5/18〜6/17, 6/18〜6/23 を取得する
async function getIssueIds(now: string): Promise<string[][]> {
  const dateRanges = [
    { start: "2026-02-18", end: "2026-03-17" },
    { start: "2026-03-18", end: "2026-04-17" },
    { start: "2026-04-18", end: "2026-05-17" },
    { start: "2026-05-18", end: "2026-06-17" },
    { start: "2026-06-18", end: "2026-07-17" },
  ];
  let meetingIssueIds: string[][] = [];
  for (const range of dateRanges) {
    const newMeetingIssueIds = await getSpeechRecord(range.start, range.end);
    meetingIssueIds = meetingIssueIds.concat(newMeetingIssueIds);
  }
  console.log("Meeting Issue IDs:", meetingIssueIds);
  await fs.mkdir("kokkai_raw/issues", { recursive: true });
  await fs.writeFile(`kokkai_raw/issues/meeting_issue_ids_${now}.json`, JSON.stringify(meetingIssueIds, null, 2));
  return meetingIssueIds;
}

async function getSpeechRecordsByIssueId(
  issueId: string,
  date: string,
  now: string,
  maxRecords: number = 100,
  startRecord: number = 1
): Promise<string> {
  const URL = `https://kokkai.ndl.go.jp/api/speech?any=%E3%80%82&issueID=${issueId}&recordPacking=json&from=${date}&until=${date}&maximumRecords=${maxRecords}&startRecord=${startRecord}`;
  console.log(`Fetching speech records for issue ID ${issueId}, startRecord: ${startRecord}`);
  console.log("URL:", URL);
  try {
    const response = await slowFetch(URL, {}, 5000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const speeches = (data.speechRecord ?? []).map((speech: any) => speech.speech);
    const speechString = speeches.join("\n");
    if (speeches.length === maxRecords) {
      const nextStartRecord = startRecord + maxRecords;
      const nextSpeeches = await getSpeechRecordsByIssueId(issueId, date, now, maxRecords, nextStartRecord);
      return speechString + "\n" + nextSpeeches;
    }
    return speechString;
  } catch (error) {
    console.error(`Failed to fetch speech records for issue ID ${issueId}:`, error);
    return "";
  }
}

async function main() {
  const now = Date.now().toString();
  const issueIds = await getIssueIds(now);
  await fs.mkdir("kokkai_raw/speeches", { recursive: true });
  for (const issueId of issueIds) {
    const path = `kokkai_raw/speeches/speech_${issueId}.txt`
    try {
      await fs.access(path);
      console.log(`File already exists for issue ID ${issueId}, skipping fetch.`);
    } catch (error) {
      if (issueId.length < 2) continue; // Skip if issueId is not valid
      const speech = await getSpeechRecordsByIssueId(
        issueId[0] ?? "",
        issueId[1] ?? "",
        now
      );
      await fs.writeFile(path, speech);
    }
  }
}

main().catch(error => {
  console.error("Error in main function:", error);
});