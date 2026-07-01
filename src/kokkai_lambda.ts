import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getLLMResponse } from "./llm/index.js";
import { getKeywordsPrompt, pickupRelatedAnswerPrompt, summarizeAnswerPrompt } from "./prompt/index.js";

const s3 = new S3Client({ region: "ap-northeast-1" });

const bucketName = "kokkai-gpt";
const files = [
  "speech_122124293X00120260520_2026-05-20/sequence_answers_all.json",
  "speech_122115388X00120260521_2026-05-21/sequence_answers_all.json",
  "speech_122115386X00320260420_2026-04-20/sequence_answers_all.json",
  "speech_122115386X00220260401_2026-04-01/sequence_answers_all.json",
  "speech_122115386X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122115385X00420260422_2026-04-22/sequence_answers_all.json",
  "speech_122115385X00320260415_2026-04-15/sequence_answers_all.json",
  "speech_122115385X00220260401_2026-04-01/sequence_answers_all.json",
  "speech_122115385X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122115384X00420260508_2026-05-08/sequence_answers_all.json",
  "speech_122115384X00320260401_2026-04-01/sequence_answers_all.json",
  "speech_122115384X00220260331_2026-03-31/sequence_answers_all.json",
  "speech_122115384X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122115383X00420260522_2026-05-22/sequence_answers_all.json",
  "speech_122115383X00320260508_2026-05-08/sequence_answers_all.json",
  "speech_122115383X00220260401_2026-04-01/sequence_answers_all.json",
  "speech_122115383X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122115382X00420260520_2026-05-20/sequence_answers_all.json",
  "speech_122115382X00320260424_2026-04-24/sequence_answers_all.json",
  "speech_122115382X00220260401_2026-04-01/sequence_answers_all.json",
  "speech_122115382X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122115364X00420260513_2026-05-13/sequence_answers_all.json",
  "speech_122115364X00320260422_2026-04-22/sequence_answers_all.json",
  "speech_122115364X00220260415_2026-04-15/sequence_answers_all.json",
  "speech_122115364X00120260311_2026-03-11/sequence_answers_all.json",
  "speech_122115262X00120260324_2026-03-24/sequence_answers_all.json",
  "speech_122115261X00920260403_2026-04-03/sequence_answers_all.json",
  "speech_122115261X00820260330_2026-03-30/sequence_answers_all.json",
  "speech_122115261X00720260327_2026-03-27/sequence_answers_all.json",
  "speech_122115261X00520260319_2026-03-19/sequence_answers_all.json",
  "speech_122115261X00420260318_2026-03-18/sequence_answers_all.json",
  "speech_122115261X00320260317_2026-03-17/sequence_answers_all.json",
  "speech_122115261X00220260316_2026-03-16/sequence_answers_all.json",
  "speech_122115261X00120260226_2026-02-26/sequence_answers_all.json",
  "speech_122115254X01020260424_2026-04-24/sequence_answers_all.json",
  "speech_122115254X00920260417_2026-04-17/sequence_answers_all.json",
  "speech_122115254X00820260407_2026-04-07/sequence_answers_all.json",
  "speech_122115254X00720260331_2026-03-31/sequence_answers_all.json",
  "speech_122115254X00620260330_2026-03-30/sequence_answers_all.json",
  "speech_122115254X00320260225_2026-02-25/sequence_answers_all.json",
  "speech_122115254X00220260220_2026-02-20/sequence_answers_all.json",
  "speech_122115254X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122115253X00220260522_2026-05-22/sequence_answers_all.json",
  "speech_122115253X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122115206X00820260514_2026-05-14/sequence_answers_all.json",
  "speech_122115206X00720260423_2026-04-23/sequence_answers_all.json",
  "speech_122115206X00620260421_2026-04-21/sequence_answers_all.json",
  "speech_122115206X00520260416_2026-04-16/sequence_answers_all.json",
  "speech_122115206X00420260414_2026-04-14/sequence_answers_all.json",
  "speech_122115206X00320260402_2026-04-02/sequence_answers_all.json",
  "speech_122115206X00220260324_2026-03-24/sequence_answers_all.json",
  "speech_122115206X00120260319_2026-03-19/sequence_answers_all.json",
  "speech_122115104X00920260609_2026-06-09/sequence_answers_all.json",
  "speech_122115104X00820260602_2026-06-02/sequence_answers_all.json",
  "speech_122115104X00720260521_2026-05-21/sequence_answers_all.json",
  "speech_122115104X00620260421_2026-04-21/sequence_answers_all.json",
  "speech_122115104X00520260416_2026-04-16/sequence_answers_all.json",
  "speech_122115104X00420260402_2026-04-02/sequence_answers_all.json",
  "speech_122115104X00320260331_2026-03-31/sequence_answers_all.json",
  "speech_122115104X00220260326_2026-03-26/sequence_answers_all.json",
  "speech_122115104X00120260324_2026-03-24/sequence_answers_all.json",
  "speech_122115007X01020260519_2026-05-19/sequence_answers_all.json",
  "speech_122115007X00920260514_2026-05-14/sequence_answers_all.json",
  "speech_122115007X00820260512_2026-05-12/sequence_answers_all.json",
  "speech_122115007X00720260423_2026-04-23/sequence_answers_all.json",
  "speech_122115007X00620260421_2026-04-21/sequence_answers_all.json",
  "speech_122115007X00520260402_2026-04-02/sequence_answers_all.json",
  "speech_122115007X00420260331_2026-03-31/sequence_answers_all.json",
  "speech_122115007X00320260326_2026-03-26/sequence_answers_all.json",
  "speech_122115007X00220260324_2026-03-24/sequence_answers_all.json",
  "speech_122115007X00120260319_2026-03-19/sequence_answers_all.json",
  "speech_122114889X01120260528_2026-05-28/sequence_answers_all.json",
  "speech_122114889X01020260526_2026-05-26/sequence_answers_all.json",
  "speech_122114889X00920260521_2026-05-21/sequence_answers_all.json",
  "speech_122114889X00820260519_2026-05-19/sequence_answers_all.json",
  "speech_122114889X00720260514_2026-05-14/sequence_answers_all.json",
  "speech_122114889X00620260512_2026-05-12/sequence_answers_all.json",
  "speech_122114889X00520260421_2026-04-21/sequence_answers_all.json",
  "speech_122114889X00420260416_2026-04-16/sequence_answers_all.json",
  "speech_122114889X00320260414_2026-04-14/sequence_answers_all.json",
  "speech_122114889X00220260402_2026-04-02/sequence_answers_all.json",
  "speech_122114889X00120260324_2026-03-24/sequence_answers_all.json",
  "speech_122114601X00720260423_2026-04-23/sequence_answers_all.json",
  "speech_122114601X00620260421_2026-04-21/sequence_answers_all.json",
  "speech_122114601X00520260402_2026-04-02/sequence_answers_all.json",
  "speech_122114601X00420260331_2026-03-31/sequence_answers_all.json",
  "speech_122114601X00320260326_2026-03-26/sequence_answers_all.json",
  "speech_122114601X00120260319_2026-03-19/sequence_answers_all.json",
  "speech_122114575X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122114536X00320260529_2026-05-29/sequence_answers_all.json",
  "speech_122114536X00220260401_2026-04-01/sequence_answers_all.json",
  "speech_122114536X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122114370X01020260528_2026-05-28/sequence_answers_all.json",
  "speech_122114370X00920260526_2026-05-26/sequence_answers_all.json",
  "speech_122114370X00820260423_2026-04-23/sequence_answers_all.json",
  "speech_122114370X00720260421_2026-04-21/sequence_answers_all.json",
  "speech_122114370X00620260409_2026-04-09/sequence_answers_all.json",
  "speech_122114370X00520260402_2026-04-02/sequence_answers_all.json",
  "speech_122114370X00420260331_2026-03-31/sequence_answers_all.json",
  "speech_122114370X00320260326_2026-03-26/sequence_answers_all.json",
  "speech_122114370X00220260324_2026-03-24/sequence_answers_all.json",
  "speech_122114370X00120260319_2026-03-19/sequence_answers_all.json",
  "speech_122114324X00520260610_2026-06-10/sequence_answers_all.json",
  "speech_122114324X00420260520_2026-05-20/sequence_answers_all.json",
  "speech_122114324X00320260415_2026-04-15/sequence_answers_all.json",
  "speech_122114324X00220260311_2026-03-11/sequence_answers_all.json",
  "speech_122114324X00120260304_2026-03-04/sequence_answers_all.json",
  "speech_122114319X00620260423_2026-04-23/sequence_answers_all.json",
  "speech_122114319X00520260402_2026-04-02/sequence_answers_all.json",
  "speech_122114319X00420260331_2026-03-31/sequence_answers_all.json",
  "speech_122114319X00320260324_2026-03-24/sequence_answers_all.json",
  "speech_122114319X00220260319_2026-03-19/sequence_answers_all.json",
  "speech_122114319X00120260226_2026-02-26/sequence_answers_all.json",
  "speech_122114308X00320260513_2026-05-13/sequence_answers_all.json",
  "speech_122114308X00220260415_2026-04-15/sequence_answers_all.json",
  "speech_122114308X00120260304_2026-03-04/sequence_answers_all.json",
  "speech_122114292X00220260520_2026-05-20/sequence_answers_all.json",
  "speech_122114292X00120260226_2026-02-26/sequence_answers_all.json",
  "speech_122114281X00220260518_2026-05-18/sequence_answers_all.json",
  "speech_122114281X00120260309_2026-03-09/sequence_answers_all.json",
  "speech_122114260X00420260416_2026-04-16/sequence_answers_all.json",
  "speech_122114260X00320260402_2026-04-02/sequence_answers_all.json",
  "speech_122114260X00220260324_2026-03-24/sequence_answers_all.json",
  "speech_122114260X00120260319_2026-03-19/sequence_answers_all.json",
  "speech_122114183X00120260415_2026-04-15/sequence_answers_all.json",
  "speech_122114080X00520260421_2026-04-21/sequence_answers_all.json",
  "speech_122114080X00420260402_2026-04-02/sequence_answers_all.json",
  "speech_122114080X00320260326_2026-03-26/sequence_answers_all.json",
  "speech_122114080X00220260324_2026-03-24/sequence_answers_all.json",
  "speech_122114080X00120260226_2026-02-26/sequence_answers_all.json",
  "speech_122114024X01820260527_2026-05-27/sequence_answers_all.json",
  "speech_122114024X01720260522_2026-05-22/sequence_answers_all.json",
  "speech_122114024X01620260520_2026-05-20/sequence_answers_all.json",
  "speech_122114024X01520260515_2026-05-15/sequence_answers_all.json",
  "speech_122114024X01420260513_2026-05-13/sequence_answers_all.json",
  "speech_122114024X01320260508_2026-05-08/sequence_answers_all.json",
  "speech_122114024X01220260424_2026-04-24/sequence_answers_all.json",
  "speech_122114024X01120260417_2026-04-17/sequence_answers_all.json",
  "speech_122114024X01020260407_2026-04-07/sequence_answers_all.json",
  "speech_122114024X00920260331_2026-03-31/sequence_answers_all.json",
  "speech_122114024X00820260330_2026-03-30/sequence_answers_all.json",
  "speech_122114024X00720260323_2026-03-23/sequence_answers_all.json",
  "speech_122114024X00620260303_2026-03-03/sequence_answers_all.json",
  "speech_122114024X00520260226_2026-02-26/sequence_answers_all.json",
  "speech_122114024X00420260225_2026-02-25/sequence_answers_all.json",
  "speech_122114024X00320260220_2026-02-20/sequence_answers_all.json",
  "speech_122114024X00220260219_2026-02-19/sequence_answers_all.json",
  "speech_122114024X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122114006X00620260512_2026-05-12/sequence_answers_all.json",
  "speech_122114006X00520260416_2026-04-16/sequence_answers_all.json",
  "speech_122114006X00420260414_2026-04-14/sequence_answers_all.json",
  "speech_122114006X00320260402_2026-04-02/sequence_answers_all.json",
  "speech_122114006X00220260324_2026-03-24/sequence_answers_all.json",
  "speech_122114006X00120260319_2026-03-19/sequence_answers_all.json",
  "speech_122113950X01120260602_2026-06-02/sequence_answers_all.json",
  "speech_122113950X01020260528_2026-05-28/sequence_answers_all.json",
  "speech_122113950X00920260521_2026-05-21/sequence_answers_all.json",
  "speech_122113950X00820260514_2026-05-14/sequence_answers_all.json",
  "speech_122113950X00720260512_2026-05-12/sequence_answers_all.json",
  "speech_122113950X00620260423_2026-04-23/sequence_answers_all.json",
  "speech_122113950X00520260421_2026-04-21/sequence_answers_all.json",
  "speech_122113950X00420260414_2026-04-14/sequence_answers_all.json",
  "speech_122113950X00320260402_2026-04-02/sequence_answers_all.json",
  "speech_122113950X00220260331_2026-03-31/sequence_answers_all.json",
  "speech_122113950X00120260324_2026-03-24/sequence_answers_all.json",
  "speech_122105387X00220260310_2026-03-10/sequence_answers_all.json",
  "speech_122105387X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122105367X00820260521_2026-05-21/sequence_answers_all.json",
  "speech_122105367X00720260514_2026-05-14/sequence_answers_all.json",
  "speech_122105367X00620260512_2026-05-12/sequence_answers_all.json",
  "speech_122105367X00520260508_2026-05-08/sequence_answers_all.json",
  "speech_122105367X00420260423_2026-04-23/sequence_answers_all.json",
  "speech_122105367X00320260416_2026-04-16/sequence_answers_all.json",
  "speech_122105367X00220260414_2026-04-14/sequence_answers_all.json",
  "speech_122105367X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122105262X00120260310_2026-03-10/sequence_answers_all.json",
  "speech_122105261X01320260603_2026-06-03/sequence_answers_all.json",
  "speech_122105261X01220260330_2026-03-30/sequence_answers_all.json",
  "speech_122105261X01120260313_2026-03-13/sequence_answers_all.json",
  "speech_122105261X01020260312_2026-03-12/sequence_answers_all.json",
  "speech_122105261X00920260311_2026-03-11/sequence_answers_all.json",
  "speech_122105261X00820260309_2026-03-09/sequence_answers_all.json",
  "speech_122105261X00720260306_2026-03-06/sequence_answers_all.json",
  "speech_122105261X00620260305_2026-03-05/sequence_answers_all.json",
  "speech_122105261X00520260304_2026-03-04/sequence_answers_all.json",
  "speech_122105261X00420260303_2026-03-03/sequence_answers_all.json",
  "speech_122105261X00320260302_2026-03-02/sequence_answers_all.json",
  "speech_122105261X00220260227_2026-02-27/sequence_answers_all.json",
  "speech_122105261X00120260226_2026-02-26/sequence_answers_all.json",
  "speech_122105254X01620260428_2026-04-28/sequence_answers_all.json",
  "speech_122105254X01520260423_2026-04-23/sequence_answers_all.json",
  "speech_122105254X01420260421_2026-04-21/sequence_answers_all.json",
  "speech_122105254X01320260416_2026-04-16/sequence_answers_all.json",
  "speech_122105254X01220260414_2026-04-14/sequence_answers_all.json",
  "speech_122105254X01120260409_2026-04-09/sequence_answers_all.json",
  "speech_122105254X01020260402_2026-04-02/sequence_answers_all.json",
  "speech_122105254X00920260330_2026-03-30/sequence_answers_all.json",
  "speech_122105254X00820260326_2026-03-26/sequence_answers_all.json",
  "speech_122105254X00720260319_2026-03-19/sequence_answers_all.json",
  "speech_122105254X00620260313_2026-03-13/sequence_answers_all.json",
  "speech_122105254X00520260305_2026-03-05/sequence_answers_all.json",
  "speech_122105254X00420260225_2026-02-25/sequence_answers_all.json",
  "speech_122105254X00320260224_2026-02-24/sequence_answers_all.json",
  "speech_122105254X00220260220_2026-02-20/sequence_answers_all.json",
  "speech_122105254X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122105253X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122105206X00620260421_2026-04-21/sequence_answers_all.json",
  "speech_122105206X00520260417_2026-04-17/sequence_answers_all.json",
  "speech_122105206X00420260415_2026-04-15/sequence_answers_all.json",
  "speech_122105206X00320260414_2026-04-14/sequence_answers_all.json",
  "speech_122105206X00220260410_2026-04-10/sequence_answers_all.json",
  "speech_122105206X00120260403_2026-04-03/sequence_answers_all.json",
  "speech_122105124X01120260529_2026-05-29/sequence_answers_all.json",
  "speech_122105124X01020260522_2026-05-22/sequence_answers_all.json",
  "speech_122105124X00920260520_2026-05-20/sequence_answers_all.json",
  "speech_122105124X00820260424_2026-04-24/sequence_answers_all.json",
  "speech_122105124X00720260422_2026-04-22/sequence_answers_all.json",
  "speech_122105124X00620260313_2026-03-13/sequence_answers_all.json",
  "speech_122105124X00520260311_2026-03-11/sequence_answers_all.json",
  "speech_122105124X00420260310_2026-03-10/sequence_answers_all.json",
  "speech_122105124X00320260309_2026-03-09/sequence_answers_all.json",
  "speech_122105124X00220260304_2026-03-04/sequence_answers_all.json",
  "speech_122105124X00120260303_2026-03-03/sequence_answers_all.json",
  "speech_122105007X01220260602_2026-06-02/sequence_answers_all.json",
  "speech_122105007X01120260526_2026-05-26/sequence_answers_all.json",
  "speech_122105007X01020260520_2026-05-20/sequence_answers_all.json",
  "speech_122105007X00920260513_2026-05-13/sequence_answers_all.json",
  "speech_122105007X00820260512_2026-05-12/sequence_answers_all.json",
  "speech_122105007X00720260422_2026-04-22/sequence_answers_all.json",
  "speech_122105007X00620260416_2026-04-16/sequence_answers_all.json",
  "speech_122105007X00520260414_2026-04-14/sequence_answers_all.json",
  "speech_122105007X00420260409_2026-04-09/sequence_answers_all.json",
  "speech_122105007X00320260312_2026-03-12/sequence_answers_all.json",
  "speech_122105007X00220260311_2026-03-11/sequence_answers_all.json",
  "speech_122105007X00120260310_2026-03-10/sequence_answers_all.json",
  "speech_122104889X00320260410_2026-04-10/sequence_answers_all.json",
  "speech_122104889X00220260408_2026-04-08/sequence_answers_all.json",
  "speech_122104889X00120260403_2026-04-03/sequence_answers_all.json",
  "speech_122104780X00120260602_2026-06-02/sequence_answers_all.json",
  "speech_122104601X01120260526_2026-05-26/sequence_answers_all.json",
  "speech_122104601X01020260512_2026-05-12/sequence_answers_all.json",
  "speech_122104601X00920260428_2026-04-28/sequence_answers_all.json",
  "speech_122104601X00820260416_2026-04-16/sequence_answers_all.json",
  "speech_122104601X00720260414_2026-04-14/sequence_answers_all.json",
  "speech_122104601X00620260409_2026-04-09/sequence_answers_all.json",
  "speech_122104601X00520260313_2026-03-13/sequence_answers_all.json",
  "speech_122104601X00420260312_2026-03-12/sequence_answers_all.json",
  "speech_122104601X00320260310_2026-03-10/sequence_answers_all.json",
  "speech_122104601X00220260305_2026-03-05/sequence_answers_all.json",
  "speech_122104601X00120260303_2026-03-03/sequence_answers_all.json",
  "speech_122104575X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122104541X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122104536X00320260616_2026-06-16/sequence_answers_all.json",
  "speech_122104536X00220260528_2026-05-28/sequence_answers_all.json",
  "speech_122104536X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122104376X00820260422_2026-04-22/sequence_answers_all.json",
  "speech_122104376X00720260414_2026-04-14/sequence_answers_all.json",
  "speech_122104376X00620260410_2026-04-10/sequence_answers_all.json",
  "speech_122104376X00520260313_2026-03-13/sequence_answers_all.json",
  "speech_122104376X00420260310_2026-03-10/sequence_answers_all.json",
  "speech_122104376X00320260306_2026-03-06/sequence_answers_all.json",
  "speech_122104376X00220260304_2026-03-04/sequence_answers_all.json",
  "speech_122104376X00120260303_2026-03-03/sequence_answers_all.json",
  "speech_122104339X00920260514_2026-05-14/sequence_answers_all.json",
  "speech_122104339X00820260512_2026-05-12/sequence_answers_all.json",
  "speech_122104339X00720260428_2026-04-28/sequence_answers_all.json",
  "speech_122104339X00620260423_2026-04-23/sequence_answers_all.json",
  "speech_122104339X00520260416_2026-04-16/sequence_answers_all.json",
  "speech_122104339X00420260414_2026-04-14/sequence_answers_all.json",
  "speech_122104339X00320260312_2026-03-12/sequence_answers_all.json",
  "speech_122104339X00220260310_2026-03-10/sequence_answers_all.json",
  "speech_122104339X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122104319X00820260513_2026-05-13/sequence_answers_all.json",
  "speech_122104319X00720260424_2026-04-24/sequence_answers_all.json",
  "speech_122104319X00620260422_2026-04-22/sequence_answers_all.json",
  "speech_122104319X00520260415_2026-04-15/sequence_answers_all.json",
  "speech_122104319X00420260410_2026-04-10/sequence_answers_all.json",
  "speech_122104319X00320260408_2026-04-08/sequence_answers_all.json",
  "speech_122104319X00220260310_2026-03-10/sequence_answers_all.json",
  "speech_122104319X00120260306_2026-03-06/sequence_answers_all.json",
  "speech_122104292X00120260514_2026-05-14/sequence_answers_all.json",
  "speech_122104260X00820260513_2026-05-13/sequence_answers_all.json",
  "speech_122104260X00720260424_2026-04-24/sequence_answers_all.json",
  "speech_122104260X00620260422_2026-04-22/sequence_answers_all.json",
  "speech_122104260X00520260421_2026-04-21/sequence_answers_all.json",
  "speech_122104260X00420260417_2026-04-17/sequence_answers_all.json",
  "speech_122104260X00320260415_2026-04-15/sequence_answers_all.json",
  "speech_122104260X00220260410_2026-04-10/sequence_answers_all.json",
  "speech_122104260X00120260403_2026-04-03/sequence_answers_all.json",
  "speech_122104183X01120260625_2026-06-25/sequence_answers_all.json",
  "speech_122104183X01020260618_2026-06-18/sequence_answers_all.json",
  "speech_122104183X00920260611_2026-06-11/sequence_answers_all.json",
  "speech_122104183X00820260604_2026-06-04/sequence_answers_all.json",
  "speech_122104183X00720260528_2026-05-28/sequence_answers_all.json",
  "speech_122104183X00620260521_2026-05-21/sequence_answers_all.json",
  "speech_122104183X00520260514_2026-05-14/sequence_answers_all.json",
  "speech_122104183X00420260423_2026-04-23/sequence_answers_all.json",
  "speech_122104183X00320260416_2026-04-16/sequence_answers_all.json",
  "speech_122104183X00220260409_2026-04-09/sequence_answers_all.json",
  "speech_122104183X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122104127X00220260603_2026-06-03/sequence_answers_all.json",
  "speech_122104127X00120260527_2026-05-27/sequence_answers_all.json",
  "speech_122104080X00720260513_2026-05-13/sequence_answers_all.json",
  "speech_122104080X00620260424_2026-04-24/sequence_answers_all.json",
  "speech_122104080X00520260422_2026-04-22/sequence_answers_all.json",
  "speech_122104080X00420260417_2026-04-17/sequence_answers_all.json",
  "speech_122104080X00320260415_2026-04-15/sequence_answers_all.json",
  "speech_122104080X00220260410_2026-04-10/sequence_answers_all.json",
  "speech_122104080X00120260408_2026-04-08/sequence_answers_all.json",
  "speech_122104040X00120260219_2026-02-19/sequence_answers_all.json",
  "speech_122104037X00120260219_2026-02-19/sequence_answers_all.json",
  "speech_122104025X00120260619_2026-06-19/sequence_answers_all.json",
  "speech_122104024X03220260626_2026-06-26/sequence_answers_all.json",
  "speech_122104024X03120260625_2026-06-25/sequence_answers_all.json",
  "speech_122104024X03020260619_2026-06-19/sequence_answers_all.json",
  "speech_122104024X02920260616_2026-06-16/sequence_answers_all.json",
  "speech_122104024X02820260611_2026-06-11/sequence_answers_all.json",
  "speech_122104024X02720260604_2026-06-04/sequence_answers_all.json",
  "speech_122104024X02620260603_2026-06-03/sequence_answers_all.json",
  "speech_122104024X02520260602_2026-06-02/sequence_answers_all.json",
  "speech_122104024X02420260526_2026-05-26/sequence_answers_all.json",
  "speech_122104024X02320260519_2026-05-19/sequence_answers_all.json",
  "speech_122104024X02220260514_2026-05-14/sequence_answers_all.json",
  "speech_122104024X02120260512_2026-05-12/sequence_answers_all.json",
  "speech_122104024X02020260428_2026-04-28/sequence_answers_all.json",
  "speech_122104024X01920260423_2026-04-23/sequence_answers_all.json",
  "speech_122104024X01820260421_2026-04-21/sequence_answers_all.json",
  "speech_122104024X01720260416_2026-04-16/sequence_answers_all.json",
  "speech_122104024X01620260414_2026-04-14/sequence_answers_all.json",
  "speech_122104024X01520260409_2026-04-09/sequence_answers_all.json",
  "speech_122104024X01420260402_2026-04-02/sequence_answers_all.json",
  "speech_122104024X01320260330_2026-03-30/sequence_answers_all.json",
  "speech_122104024X01220260326_2026-03-26/sequence_answers_all.json",
  "speech_122104024X01120260319_2026-03-19/sequence_answers_all.json",
  "speech_122104024X01020260313_2026-03-13/sequence_answers_all.json",
  "speech_122104024X00920260310_2026-03-10/sequence_answers_all.json",
  "speech_122104024X00820260305_2026-03-05/sequence_answers_all.json",
  "speech_122104024X00720260304_2026-03-04/sequence_answers_all.json",
  "speech_122104024X00620260303_2026-03-03/sequence_answers_all.json",
  "speech_122104024X00520260225_2026-02-25/sequence_answers_all.json",
  "speech_122104024X00420260224_2026-02-24/sequence_answers_all.json",
  "speech_122104024X00320260220_2026-02-20/sequence_answers_all.json",
  "speech_122104024X00220260219_2026-02-19/sequence_answers_all.json",
  "speech_122104024X00120260218_2026-02-18/sequence_answers_all.json",
  "speech_122104006X01020260522_2026-05-22/sequence_answers_all.json",
  "speech_122104006X00920260519_2026-05-19/sequence_answers_all.json",
  "speech_122104006X00820260515_2026-05-15/sequence_answers_all.json",
  "speech_122104006X00720260428_2026-04-28/sequence_answers_all.json",
  "speech_122104006X00620260424_2026-04-24/sequence_answers_all.json",
  "speech_122104006X00520260421_2026-04-21/sequence_answers_all.json",
  "speech_122104006X00420260417_2026-04-17/sequence_answers_all.json",
  "speech_122104006X00320260414_2026-04-14/sequence_answers_all.json",
  "speech_122104006X00220260410_2026-04-10/sequence_answers_all.json",
  "speech_122104006X00120260403_2026-04-03/sequence_answers_all.json",
  "speech_122103968X01020260513_2026-05-13/sequence_answers_all.json",
  "speech_122103968X00920260422_2026-04-22/sequence_answers_all.json",
  "speech_122103968X00820260417_2026-04-17/sequence_answers_all.json",
  "speech_122103968X00720260415_2026-04-15/sequence_answers_all.json",
  "speech_122103968X00620260410_2026-04-10/sequence_answers_all.json",
  "speech_122103968X00520260408_2026-04-08/sequence_answers_all.json",
  "speech_122103968X00420260313_2026-03-13/sequence_answers_all.json",
  "speech_122103968X00320260311_2026-03-11/sequence_answers_all.json",
  "speech_122103968X00220260306_2026-03-06/sequence_answers_all.json",
  "speech_122103968X00120260304_2026-03-04/sequence_answers_all.json",
  "speech_122103895X00120260220_2026-02-20/sequence_answers_all.json",
  "speech_122103815X00720260515_2026-05-15/sequence_answers_all.json",
  "speech_122103815X00620260512_2026-05-12/sequence_answers_all.json",
  "speech_122103815X00520260424_2026-04-24/sequence_answers_all.json",
  "speech_122103815X00420260421_2026-04-21/sequence_answers_all.json",
  "speech_122103815X00320260416_2026-04-16/sequence_answers_all.json",
  "speech_122103815X00220260409_2026-04-09/sequence_answers_all.json",
  "speech_122103815X00120260403_2026-04-03/sequence_answers_all.json"
]

// party search
async function summarizeSqeuence(rootFilePath: string, keywords: string[], party: string = "自民") {
  try {
    let allSequences: any[] = [];
    for (const key of files) {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await s3.send(command);
      const data = await response.Body?.transformToString();
      if (!data) {
        console.log(`No data found for key: ${key}`);
        continue;
      }
      const sequenceAnswersList = JSON.parse(data);
      const partySequences = sequenceAnswersList[party] || [];
      if (!partySequences || partySequences.length === 0) {
        console.log(`No sequences found for party: ${party} in file: ${key}`);
        continue;
      }
      const dateIncludedPartySequences = partySequences.map((sequence: any) => {
        const date = key.split("/")[0]?.split("_")?.[2] || "unknown_date";
        return { ...sequence, date };
      });
      const keywordFilteredSequences = dateIncludedPartySequences.filter((sequence: any) => {
        return keywords.some((keyword) => {
          return sequence.keywords.some((k: string) => k === keyword) ||
                 sequence.keywords.some((k: string) => k.includes(keyword)) ||
                 sequence.keywords.some((k: string) => keyword.includes(k));
        });
      });
      const keywordIncludedSequences = keywordFilteredSequences.map((sequence: any) => {
        const keywordMap = keywords.map((keyword: string) => {
          if (sequence.keywords.some((k: string) => k === keyword)) {
            return 5;
          }
          if (sequence.keywords.some((k: string) => k.includes(keyword)) ||
              sequence.keywords.some((k: string) => keyword.includes(k))
            ) {
            return 1;
          }
          return 0;
        });
        return { ...sequence, keywordMap };
      });
      allSequences = [...allSequences, ...keywordIncludedSequences];
    }
    return allSequences;
  } catch (error) {
    console.error("Error reading the file:", error);
    return [];
  }
}

// 
async function main2(question: string, party: string) {
  const sequenceRootPath = "kokkai";
  try {
    const keywordsJsonString = await getLLMResponse('openai', question, getKeywordsPrompt);
    const questionResult = JSON.parse(keywordsJsonString);
    const keywords = questionResult.keywords || [];
    console.log("Extracted Keywords:", JSON.stringify(keywords));
    const sequences = await summarizeSqeuence(sequenceRootPath, keywords, party);
    const filteredSequences = sequences.sort((a: any, b: any) => {
      const aCount = a.keywordMap.reduce((sum: number, val: number) => sum + val, 0);
      const bCount = b.keywordMap.reduce((sum: number, val: number) => sum + val, 0);
      return bCount - aCount; // Sort in descending order
    }).slice(0, 100); // Limit to top 100 sequences
    const _5w1h = questionResult._5w1h || "what";
    const filtered2Sequences = filteredSequences.filter((sequence: any) => {
      const sequence5w1h = sequence._5w1h || "what";
      return sequence5w1h === _5w1h;
    });
    if (filtered2Sequences.length === 0) {
      console.log(`No sequences found for party: ${party} with the specified keywords and 5W1H.`);
      return;
    }
    const pickupPrompt = `質問
${question}

答弁内容
${filtered2Sequences.map((s: any, i: number) => {
  return `${i + 1} : ${s.summary} : ${s.answer}`
}).join("\n")}`;
    const pickupResultString = await getLLMResponse('openai', pickupRelatedAnswerPrompt, pickupPrompt);
    const pickupResultNumber = JSON.parse(pickupResultString);
    const pickupResult = pickupResultNumber.map((index: number) => filtered2Sequences[index - 1]);
    if (pickupResult.length === 0) {
      console.log(`No relevant sequences found for the question: ${question}`);
      return;
    }
    const statements = pickupResult.map((f: any) => f.name + " " + f.date  + ":" + f.summary + f.answer).join("\n");
    const summarizePrompt = `質問
${question}

答弁内容
${pickupResult.map((s: any, i: number) => {
  return `${i + 1} : ${s.summary} : ${s.answer}`
}).join("\n")}`;
    const summarizeResult = await getLLMResponse('openai', summarizeAnswerPrompt, summarizePrompt);
    return {
      statements,
      summary: summarizeResult
    }
  } catch (error) {
    console.error("Error reading the file:", error);
    return;
  }
}

export const handler = async (event: any) => {
  const body = JSON.parse(event.body);
  const question = body.question || "";
  const party = body.party || "自民";
  if (!question) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Question is required" }),
    };
  }
  try {
    const result = await main2(question, party);
    if (!result) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No relevant sequences found" }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error processing the request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}