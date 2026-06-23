import fs from "fs/promises";
import OpenAI from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = "gpt-5.1"
const textChunkSize = 5;
const answerChunkSize = 10;
const categoryChunkSize = 15;

type Participant = {
  name: string;
  party: string;
  familyName: string;
}

type Answer = {
  name: string;
  party: string;
  content: string;
}

type Category = {
  categoryId: string;
  name: string;
  description: string;
  answerIds: string[];
}

const searchParticipantPrompt = `あなたは国会議員を検索する専門家です。
与えられた文書の一部から、そこに登場する国会議員の名前と苗字と政党を抽出してください。
注意：
- 名前はフルネームで、政党名も正式名称で出力してください。
- 出力はJSON形式で、名前と政党をキーとして持つオブジェクトの配列にしてください。
- 文書中に登場しない議員は出力しないでください。
- 議員以外の人物の場合は、「民間人」と出力してください

入力例：
\`\`\`txt
第221回国会　衆議院　憲法審査会　第8号　令和8年6月4日

令和八年六月四日（木曜日）
　　　　午前十時三分開議
　出席委員
　　　会長　古屋　圭司君
　　　幹事　鬼木　　誠君　幹事　北神　圭朗君
　　　幹事　新藤　義孝君　幹事　鈴木　英敬君
　　　幹事　高階恵美子君　幹事　和田　義明君
　　　幹事　國重　　徹君　幹事　馬場　伸幸君
　　　幹事　浅野　　哲君
　　　　　　石井　　拓君　　　　石川　昭政君
　　　　　　石橋林太郎君　　　　井出　庸生君
　　　　　　伊藤　　聡君　　　　稲田　朋美君
　　　　　　内山　こう君　　　　遠藤　寛明君
　　　　　　大野敬太郎君　　　　長田紘一郎君
　　　　　　上川　陽子君　　　　木村　次郎君
　　　　　　今　　洋佑君　　　　坂本竜太郎君
　　　　　　下村　博文君　　　　高木　宏壽君
　　　　　　田野瀬太道君　　　　土田　　慎君
　　　　　　寺田　　稔君　　　　中川　貴元君
　　　　　　葉梨　康弘君　　　　星野　剛士君
　　　　　　細野　豪志君　　　　森原紀代子君
　　　　　　盛山　正仁君　　　　保岡　宏武君
　　　　　　山本　裕三君　　　　米内　紘正君
　　　　　　若林　健太君　　　　有田　芳生君
　　　　　　泉　　健太君　　　　河西　宏一君
　　　　　　西村智奈美君　　　　阿部　圭史君
　　　　　　池畑浩太朗君　　　　西田　　薫君
　　　　　　飯泉　嘉門君　　　　玉木雄一郎君
　　　　　　川　裕一郎君　　　　和田　政宗君
　　　　　　古川あおい君　　　　畑野　君枝君
　　　　…………………………………
　　　衆議院憲法審査会事務局長　吉澤　紀子君
　　　衆議院法制局特別参与　　　橘　　幸信君
　　　　―――――――――――――
委員の異動
六月四日
　辞任　　　　　　　　　補欠選任
　　秋葉　賢也君　　　　　坂本竜太郎君
　　伊藤信太郎君　　　　　森原紀代子君
　　大野敬太郎君　　　　　山本　裕三君
　　加藤　勝信君　　　　　遠藤　寛明君
　　棚橋　泰文君　　　　　米内　紘正君
　　中山　泰秀君　　　　　伊藤　　聡君
　　細野　豪志君　　　　　長田紘一郎君
　　本田　太郎君　　　　　今　　洋佑君
　　丸川　珠代君　　　　　内山　こう君
同日
　辞任　　　　　　　　　補欠選任
　　伊藤　　聡君　　　　　中山　泰秀君
　　内山　こう君　　　　　丸川　珠代君
　　遠藤　寛明君　　　　　加藤　勝信君
　　長田紘一郎君　　　　　細野　豪志君
　　今　　洋佑君　　　　　本田　太郎君
　　坂本竜太郎君　　　　　秋葉　賢也君
　　森原紀代子君　　　　　伊藤信太郎君
　　山本　裕三君　　　　　大野敬太郎君
　　米内　紘正君　　　　　棚橋　泰文君
　　　　―――――――――――――
\`\`\`

出力例：
\`\`\`json
[
  {"name":"古屋圭司","party":"自由民主党","familyName":"古屋"},
  {"name":"鬼木誠","party":"自由民主党","familyName":"鬼木"},
  {"name":"北神圭朗","party":"有志の会","familyName":"北神"},
  {"name":"新藤義孝","party":"自由民主党","familyName":"新藤"},
  {"name":"鈴木英敬","party":"自由民主党","familyName":"鈴木"},
  {"name":"高階恵美子","party":"自由民主党","familyName":"高階"},
  {"name":"和田義明","party":"自由民主党","familyName":"和田"},
  {"name":"國重徹","party":"公明党","familyName":"國重"},
  {"name":"馬場伸幸","party":"日本維新の会","familyName":"馬場"},
  {"name":"浅野哲","party":"国民民主党","familyName":"浅野"},
  {"name":"石井拓","party":"自由民主党","familyName":"石井"},
  {"name":"石川昭政","party":"自由民主党","familyName":"石川"},
  {"name":"石橋林太郎","party":"自由民主党","familyName":"石橋"},
  {"name":"井出庸生","party":"自由民主党","familyName":"井出"},
  {"name":"伊藤聡","party":"自由民主党","familyName":"伊藤"},
  {"name":"稲田朋美","party":"自由民主党","familyName":"稲田"},
  {"name":"内山こう","party":"自由民主党","familyName":"内山"},
  {"name":"遠藤寛明","party":"自由民主党","familyName":"遠藤"},
  {"name":"大野敬太郎","party":"自由民主党","familyName":"大野"},
  {"name":"長田紘一郎","party":"自由民主党","familyName":"長田"},
  {"name":"上川陽子","party":"自由民主党","familyName":"上川"},
  {"name":"木村次郎","party":"自由民主党","familyName":"木村"},
  {"name":"今洋佑","party":"自由民主党","familyName":"今"},
  {"name":"坂本竜太郎","party":"自由民主党","familyName":"坂本"},
  {"name":"下村博文","party":"自由民主党","familyName":"下村"},
  {"name":"高木宏壽","party":"自由民主党","familyName":"高木"},
  {"name":"田野瀬太道","party":"自由民主党","familyName":"田野瀬"},
  {"name":"土田慎","party":"自由民主党","familyName":"土田"},
  {"name":"寺田稔","party":"自由民主党","familyName":"寺田"},
  {"name":"中川貴元","party":"自由民主党","familyName":"中川"},
  {"name":"葉梨康弘","party":"自由民主党","familyName":"葉梨"},
  {"name":"星野剛士","party":"自由民主党","familyName":"星野"},
  {"name":"細野豪志","party":"自由民主党","familyName":"細野"},
  {"name":"森原紀代子","party":"自由民主党","familyName":"森原"},
  {"name":"盛山正仁","party":"自由民主党","familyName":"盛山"},
  {"name":"保岡宏武","party":"自由民主党","familyName":"保岡"},
  {"name":"山本裕三","party":"自由民主党","familyName":"山本"},
  {"name":"米内紘正","party":"自由民主党","familyName":"米内"},
  {"name":"若林健太","party":"自由民主党","familyName":"若林"},
  {"name":"有田芳生","party":"立憲民主党","familyName":"有田"},
  {"name":"泉健太","party":"立憲民主党","familyName":"泉"},
  {"name":"河西宏一","party":"立憲民主党","familyName":"河西"},
  {"name":"西村智奈美","party":"立憲民主党","familyName":"西村"},
  {"name":"阿部圭史","party":"日本維新の会","familyName":"阿部"},
  {"name":"池畑浩太朗","party":"日本維新の会","familyName":"池畑"},
  {"name":"西田薫","party":"日本維新の会","familyName":"西田"},
  {"name":"飯泉嘉門","party":"日本維新の会","familyName":"飯泉"},
  {"name":"玉木雄一郎","party":"国民民主党","familyName":"玉木"},
  {"name":"川裕一郎","party":"公明党","familyName":"川"},
  {"name":"和田政宗","party":"日本保守党","familyName":"和田"},
  {"name":"古川あおい","party":"れいわ新選組","familyName":"古川"},
  {"name":"畑野君枝","party":"日本共産党","familyName":"畑野"},
  {"name":"吉澤紀子","party":"民間人","familyName":"吉澤"},
  {"name":"橘幸信","party":"民間人","familyName":"橘"},
  {"name":"秋葉賢也","party":"自由民主党","familyName":"秋葉"},
  {"name":"伊藤信太郎","party":"自由民主党","familyName":"伊藤"},
  {"name":"加藤勝信","party":"自由民主党","familyName":"加藤"},
  {"name":"棚橋泰文","party":"自由民主党","familyName":"棚橋"},
  {"name":"中山泰秀","party":"自由民主党","familyName":"中山"},
  {"name":"本田太郎","party":"自由民主党","familyName":"本田"},
  {"name":"丸川珠代","party":"自由民主党","familyName":"丸川"}
]
\`\`\`
`

// const nameAnswerLinkPrompt = `あなたは国会議員の答弁を分析する専門家です。
// 与えられた文書と議員のリストから、どの議員や民間人がどの答弁を行ったかを特定してください。
// 注意：
// - 出力はJSON形式で、nameに議員の名前・partyにその人が所属する政党・contentに答弁内容を入れたオブジェクトの配列にしてください。
// - 文書中に登場しない議員は出力しないでください。
// - 文章は、できるだけ正確に抽出してください。多少の誤字脱字があっても構いませんが、内容が大きく変わるような改変は避けてください。

// 入力例：
// \`\`\`txt
// 答弁内容：
// ○古屋会長　これより会議を開きます。
// 　日本国憲法及び日本国憲法に密接に関連する基本法制に関する件について調査を進めます。
// 　本日は、国民投票に関する集中的な討議を行います。
// 　この討議につきましては、幹事会の協議に基づき、まず、各会派一名ずつ大会派順に発言していただき、その後、各委員が自由に発言を行うことといたします。
// 　それでは、まず、各会派一名ずつによる発言に入ります。
// 　発言時間は七分以内といたします。
// 　質問を行う場合、発言時間は答弁時間を含めて七分以内といたしますので、御留意願います。
// 　発言時間の経過につきましては、おおむね七分経過時にブザーを鳴らしてお知らせいたします。
// 　発言は自席から着席のままで結構でございます。
// 　発言の申出がありますので、順次これを許します。新藤義孝君。
// ○新藤委員　自由民主党の新藤義孝です。
// 　本日は、国民投票に関して私なりの意見を述べたいと思います。
// 　まず、投票の外形的事項でございますけれども、既に公職選挙法で措置されている三項目の事項、開票立会人の規定整備、投票立会人の要件緩和、そしてＦＭ放送による広報について、これは速やかに国民投票法に反映させるべきと考えております。
// 　この三項目案は、二〇二二年の四月に自民、維新、公明、有志の四会派で提出いたしましたけれども、二〇二四年十月の衆議院解散により廃案になっております。この内容は四年前の公選法改正の審議の際にも特に異論はなく成立したものであります。現在、この三項目の改正案の法案提出に向けて準備を進めております。提出され次第速やかに法案審議に入ること、これをまず提案をしたいと思います。
// 　次に、投票の質に関する事項でございます。ＣＭ規制の問題です。
// 　国民投票法制定時の基本的な考え方は、国民投票は国民主権最大の発露の場であり、国民投票運動はできるだけ自由にというものでございました。この点は当時の民主党の皆さんが強く主張されたことでもあり、法案の重要なポイントになっています。この考え方に基づいて、ＣＭ規制については、法規制をできるだけ避け、自主規制によって国民投票の公平公正を確保する、このような整理がなされました。現行法においては、放送ＣＭについてのみ、期日前投票が始まる投票期日二週間前から勧誘ＣＭを禁止すること、これで決着をしたわけであります。
// 　加えて、放送法四条の政治的公平、意見が対立している問題についての多角的論点の提示などの下で、放送事業者の自主規制に委ねることとされております。既に、放送ＣＭの受け手側の自主規制として、放送事業者のＣＭ考査ガイドラインが整備されております。特定の広告主のＣＭが一部の時間帯に集中して放送されることがないよう特に留意するといった形で、質も量も要素とした自主規制が盛り込まれていることが憲法審の質疑の中で確認をされております。
// 　となると、論点として残るのは、広告の出し手側である私たち政党による取組の在り方ということになるわけです。この点については、政党間の自主規制に関する申合せなどによって十分な担保がなされるよう今後議論を深めていきたいと考えております。
// 　次に、ＣＭに関してでありますけれども、ネットＣＭの問題もございます。
// 　市場規模においては既にネットＣＭが放送ＣＭを上回っておりまして、極めて大きな影響を持つようになっています。しかし、その規制の在り方、そもそも規制できるかどうかについては大きな課題があると思われます。
// 　まず、放送ＣＭとは異なりまして、全ての放送事業者が加盟している民放連のような業界団体は存在しておりません。放送法の規定による自主規制といった枠組みもないわけです。そのような状態において、果たして有効な法規制が可能か、どのような規制手段であれば真っ当な者の表現の自由を侵さずに規制ができるのか、引き続き慎重な検討が必要ではないか、このように思っています。
// 　さらに、大勢の人々が多様な情報を個人単位で発信できるのがネットの特徴であり、問題はＣＭのみに限りません。ネット空間においては、個々人の自由な意見表明を保障しつつ、ＳＮＳ上での偽情報や誤情報、それによる誹謗中傷、生成ＡＩによるディープフェイク、閲覧数稼ぎ目的の過激な投稿などの弊害に対処していかなくてはなりません。
// 　憲法審では、これまでの討議の中で、ネットＣＭの取扱いだけではなく、ネットを通じた国民投票運動の在り方、ファクトチェックと言われるネット情報の正確性担保などについて幅広く議論を行ってまいりましたけれども、様々な意見の中には、自主的な取組に委ねてほしい、効果的なフェイクニュース対策は難しいなどといった意見が多く見られました。
// 　これらについては、国民投票独自の問題というよりも、頻繁に行われている通常選挙においても検討が必要な問題であります。現在、超党派の議員で構成される選挙運動に関する各党協議会でその方策について議論がなされております。そこでの議論も参考にしながら、ネット情報の特性を踏まえた国民投票運動への関わりについて、この憲法審においても引き続き議論を深掘りしてまいりたい、このように考えています。
// 　次に、資金規制の問題です。
// 　国民投票運動に関しては、その支出が一定額を超える団体について届出制を導入するとか、その支出金額の上限を設定したり収支報告書の提出を義務づけるなどの法的規制を行うべきといった、いわゆる資金規制を唱える意見があります。
// 　団体の届出制については、国民投票運動はなるべく自由にという投票法の基本理念と対立し、国民投票法の骨格を変更するような意見とも言えるわけであります。また実務的にも、全国にまたがる大小様々な団体からの届出を受理して収支報告書のチェックをするという膨大な事務を誰がどのように担っていくのか、運用面での問題もございます。
// 　このように、資金規制については様々な課題があり、理念的にも実務的にもかなりの困難が伴うものも想定されますけれども、いずれにしても、この点については引き続き慎重な議論が必要と考えております。
// 　国民投票においては、一般の選挙や住民投票には見られない特別な組織として、国民投票広報協議会が設けられることになっています。この組織が、憲法改正の国民投票に関する正確な情報を提供するための公的広報機関の役割を担うわけであります。発議される憲法改正の議論に関与した衆参の国会議員とこれを支える事務局によって構成されるもので、その果たす役割は極めて大きな意義があります。
// 　憲法改正案に関する正確で公正中立な知識を国民の皆さんにいかにして提供するか、広報協議会にはどのような活動をさせるのか、その具体的な内容を詰めていくことは極めて重要です。そのために、広報協議会規程や事務局規程などを定めなければなりません。大半は事務的な規程の整備であり、国民投票に関する当然の環境整備として、これらも早急に詰めるべきではないかと考えているわけであります。
// 　以上、国民投票についての私なりの総括的な意見を述べてまいりました。
// 　まずは、投票環境整備の外形的事項である三項目の国民投票法改正案について、賛同会派とともに法案提出の準備を進めております。法案が提出されたならば次回の審査会で速やかな審議を行うよう、先ほどの幹事会で提案をさせていただきました。詳細は、筆頭間協議を行い、幹事会で御相談をさせていただきますが、各会派の皆様にも何とぞ御賛同のほどよろしくお願いしたいと思います。
// 　同時に、投票の質に関する事項につきましては、一般選挙と同様に、国民の意識や社会情勢の変化を踏まえ常にアップデートしていく必要があるわけであります。この点について今後憲法審査会において更に議論を深めていくことをお約束いたしまして、私の発言といたします。
// 　ありがとうございました。
// ○古屋会長　次に、河西宏一君。
// ○河西委員　中道改革連合・無所属の河西宏一です。
// 　会派を代表し、国民投票法をめぐる、いわゆるＣＭ規制及びネットの適正利用等について意見を申し述べます。
// 　我が会派はこれまで、本審査会において、国民投票法のいわゆる三項目の法改正については、各会派の合意が形成され、かつ、放送ＣＭやネットＣＭに係る議論を積み残すことなく一定の結論を得る旨が何らかの手段で担保されるのであれば、是非前に進めたいと申し上げてまいりました。
// 　本日は、この立場をより具体化し、会派としての考え方をお示しをいたします。
// 　まず、現在直面している問題の所在でございます。
// 　現行の国民投票法百五条は、投票期日前十四日間の放送ＣＭを禁止するにとどまります。しかも、その対象はいわゆる勧誘ＣＭであり、意見表明ＣＭは、民放連が放送しないことを会員各社に推奨しているものの、法規制の対象外とされております。
// 　他方、ネット、ＳＮＳ上の有料広告、組織的な拡散、ディープフェイク、さらには外国からの干渉については、何ら直接の規定は存在いたしません。
// 　改めて確認するまでもなく、平成十九年の制定当時、テレビ広告費の三分の一以下にすぎなかったネット広告費は、令和元年にはテレビを上回り、令和三年には、マスコミ四媒体、新聞、雑誌、ラジオ、テレビの合計をも上回るに至っております。
// 　さらに、昨今、ネット情報が主権者の投票行動に大きな影響を与える点については日本社会の共通認識になっているところ、放送だけを縛りネットは野放しという現行の枠組みについては、もはや立法当時の前提を大きく外れつつあるのが現実であり、その是非について、従前の議論にとらわれることなく、改めて冷静に熟議を尽くすべきであると考えます。
// 　ここで、具体的な議論に入る前に、表現の自由に関する憲法学説上の視座を整理をいたします。資料一を御覧ください。
// 　表現の自由は、二つの自由から構成をされます。一つは、情報の出し手の自由。これは言論活動による人格形成という個人的な価値を有します。もう一つは、情報の受け手の自由。これは知る権利を含み、国民が虚偽等に惑わされることなく適切に情報を知り、選挙等の政治的意思決定に関与する、いわば自己統治としての社会的な価値を包含します。ちなみに、芦部信喜先生は御著作「憲法」において、知る権利を参政権的な役割を演ずると捉え、その理由を、個人は様々な事実や意見を知ることによって初めて政治に有効に参加することができるからであると考察しておられます。
// 　したがって、選挙における偽情報等は、表現の自由のうちの受け手の自由、つまり知る権利や民主的政治過程への有効な参加を阻害する危険性を有し、今日多くの民主主義国家において重大な問題となっているわけであります。
// 　表現の自由といえば、とかく出し手の自由のみが取り上げられがちですが、このように受け手の自由も含む包括的な視座から国民投票に係る規制の在り方を考えなければなりません。すなわち、出し手の自由からは、どこまでが憲法改正に関する発言なのかといった明確性や発信内容の公平性、あるいは過度広範性の回避、ないしは必要最小限度の規制といった観点で、規制を抑制せよとの要請がなされます。他方、受け手の自由からは、知る権利を保障するための適正な情報環境が求められ、偽情報や扇情的発信による分断、民主的プロセスの社会的価値の毀損といった観点から、規制を強化せよとの逆の要請がなされます。
// 　私は、この視座に立って、このベクトルの異なる二つの要請を適切に調整する設計原理こそがＣＭ規制及びネットの適正利用等の核心であろうと考えます。
// 　次に、これを踏まえ、我が会派の基本的立場を申し上げます。
// 　第一に、表現の自由の核心である一般国民の無償の意見表明には原則として立ち入るべきではないと考えます。現行の国民投票法は、表現の自由を最大限尊重するとの理念の下に成り立っております。我が会派は、その立法の趣旨を重く受け止め、また、賛否いずれかの意見を堂々と表明することは国民主権の最も根源的な発露であることから、意見表明に係る規制には踏み込むべきではないと考えます。
// 　第二に、一方で、情報環境をゆがめる手段には一定の規制が必要であると考えます。すなわち、有料広告、有償かつ組織的な拡散、成り済まし等の欺瞞的な発信、そして外国干渉、これらの手段に対しては放送とネットを通貫する法的フレームを設けるべきでございます。
// 　要するに、内容は問わない、しかし手段は問う、これが我が会派の考え方の根幹でございます。
// 　具体的な方向性を四点、簡潔に申し上げます。
// 　第一に、投票期日前の一定期間については、放送ＣＭの規制に関する現行の百五条の枠組みを維持した上で、少なくとも、有料ネット広告のうち広告費の規模が一定以上の場合には、その主体に、支出上限、広告主の表示、広告ライブラリーへの登録、収支報告を求めることを検討すべきと考えます。
// 　第二に、全期間を通じて、有償、組織的な拡散の透明化、そして成り済まし、ボット、ディープフェイク等の欺瞞的手段への対応を図るべきでございます。
// 　第三に、外国主体、匿名資金による国民投票運動への関与を遮断すること。
// 　第四に、広報協議会の機能を十分に強化するとともに、プラットフォーム事業者に対し透明性確保のための責務を求めることが必要であります。
// 　これら四点の具体的手法については、先ほど新藤筆頭からもございましたけれども、まず、ＥＵのデジタルサービス法をモデルとして、現在選挙運動に関する各党協議会で議論が進む公選法及び情報流通プラットフォーム対処法の改正とも整合的な国民投票法の在り方を設計すること、加えまして、ＥＵの政治広告透明化規則をモデルとして、政治広告のスポンサー等の身元情報、広告費の総額や、その出所がいかなる国によるのか、またターゲティング実施の有無等を明らかにすることを法的に義務づける透明性の公示を検討すべきであると考えます。
// 　最後に、改めて申し上げます。
// 　憲法改正の是非が最終的にどう判断されるにせよ、その結論を国民全体が受け止めるためには、手続の正当性こそが結果の正統性を支えるという、この一点が決定的に重要でございます。
// 　公正な手続と有権者が落ち着いて熟慮できる情報環境を整えることは我々立法府の責務でございます。令和三年改正法附則第四条が定めたＣＭ規制、資金規制、ネット等の適正利用に関する検討期限は既に大きく超過をしております。三項目改正の合意形成とネット規制の議論を継続して一定の結論を得ることを同時に担保する、我が会派はその実現に向けて各会派の皆様の真摯な御議論を期待申し上げ、私の発言といたします。
// 　ありがとうございました。

// 議員
// [
//   {"name":"古屋 圭司","party":"自由民主党"},
//   {"name":"鬼木 誠","party":"自由民主党"},
//   {"name":"北神 圭朗","party":"有志の会"},
//   {"name":"新藤 義孝","party":"自由民主党"},
//   {"name":"鈴木 英敬","party":"自由民主党"},
//   {"name":"高階 恵美子","party":"自由民主党"},
//   {"name":"和田 義明","party":"自由民主党"},
//   {"name":"國重 徹","party":"公明党"},
//   {"name":"馬場 伸幸","party":"日本維新の会"},
//   {"name":"浅野 哲","party":"国民民主党"},
//   {"name":"石井 拓","party":"自由民主党"},
//   {"name":"石川 昭政","party":"自由民主党"},
//   {"name":"石橋 林太郎","party":"自由民主党"},
//   {"name":"井出 庸生","party":"自由民主党"},
//   {"name":"伊藤 聡","party":"自由民主党"},
//   {"name":"稲田 朋美","party":"自由民主党"},
//   {"name":"内山 こう","party":"自由民主党"},
//   {"name":"遠藤 寛明","party":"自由民主党"},
//   {"name":"大野 敬太郎","party":"自由民主党"},
//   {"name":"長田 紘一郎","party":"自由民主党"},
//   {"name":"上川 陽子","party":"自由民主党"},
//   {"name":"木村 次郎","party":"自由民主党"},
//   {"name":"今 洋佑","party":"自由民主党"},
//   {"name":"坂本 竜太郎","party":"自由民主党"},
//   {"name":"下村 博文","party":"自由民主党"},
//   {"name":"高木 宏壽","party":"自由民主党"},
//   {"name":"田野瀬 太道","party":"自由民主党"},
//   {"name":"土田 慎","party":"自由民主党"},
//   {"name":"寺田 稔","party":"自由民主党"},
//   {"name":"中川 貴元","party":"自由民主党"},
//   {"name":"葉梨 康弘","party":"自由民主党"},
//   {"name":"星野 剛士","party":"自由民主党"},
//   {"name":"細野 豪志","party":"自由民主党"},
//   {"name":"森原 紀代子","party":"自由民主党"},
//   {"name":"盛山 正仁","party":"自由民主党"},
//   {"name":"保岡 宏武","party":"自由民主党"},
//   {"name":"山本 裕三","party":"自由民主党"},
//   {"name":"米内 紘正","party":"自由民主党"},
//   {"name":"若林 健太","party":"自由民主党"},
//   {"name":"有田 芳生","party":"立憲民主党"},
//   {"name":"泉 健太","party":"立憲民主党"},
//   {"name":"河西 宏一","party":"立憲民主党"},
//   {"name":"西村 智奈美","party":"立憲民主党"},
//   {"name":"阿部 圭史","party":"日本維新の会"},
//   {"name":"池畑 浩太朗","party":"日本維新の会"},
//   {"name":"西田 薫","party":"日本維新の会"},
//   {"name":"飯泉 嘉門","party":"国民民主党"},
//   {"name":"玉木 雄一郎","party":"国民民主党"},
//   {"name":"川 裕一郎","party":"民間人"},
//   {"name":"和田 政宗","party":"日本保守党"},
//   {"name":"古川 あおい","party":"参政党"},
//   {"name":"畑野 君枝","party":"日本共産党"},
//   {"name":"秋葉 賢也","party":"自由民主党"},
//   {"name":"伊藤 信太郎","party":"自由民主党"},
//   {"name":"加藤 勝信","party":"自由民主党"},
//   {"name":"棚橋 泰文","party":"自由民主党"},
//   {"name":"中山 泰秀","party":"自由民主党"},
//   {"name":"本田 太郎","party":"自由民主党"},
//   {"name":"丸川 珠代","party":"自由民主党"}
// ]
// \`\`\`

// 出力例：
// \`\`\`json
// [
//   {
//     "name": "古屋 圭司",
//     "party": "自由民主党",
//     "content": "これより会議を開きます。日本国憲法及び日本国憲法に密接に関連する基本法制に関する件について調査を進め、本日は国民投票に関する集中的な討議を行う旨を述べ、討議の進行方法・発言時間等を説明した。また、新藤義孝委員および河西宏一委員に順次発言を許可した。"
//   },
//   {
//     "name": "新藤 義孝",
//     "party": "自由民主党",
//     "content": "国民投票法に関し、まず公職選挙法改正に対応した三項目（開票立会人規定整備、投票立会人要件緩和、FM放送による広報）を速やかに反映すべきと主張した。CM規制については、現行法の基本理念である『国民投票運動はできるだけ自由に』を重視し、放送CMについては自主規制を基本としつつ、政党間の申合せによる対応を検討すべきと述べた。ネットCMについては市場規模拡大を認めつつも、規制の実効性や表現の自由への影響から慎重な検討が必要と指摘した。また、SNS上の偽情報・誤情報、ディープフェイク、過激投稿などへの対処の必要性を述べ、通常選挙における議論も参考にしながら国民投票運動への関わりを検討すべきとした。資金規制については理念面・実務面の課題を指摘し慎重な議論を求めた。さらに、国民投票広報協議会の役割の重要性を強調し、公正中立な情報提供のための規程整備を早急に進めるべきと述べた。最後に、三項目改正案の速やかな審議と、投票の質に関する議論の継続的深化を訴えた。"
//   },
//   {
//     "name": "河西 宏一",
//     "party": "立憲民主党",
//     "content": "国民投票法におけるCM規制およびネットの適正利用について意見を述べた。現行法は投票日前14日間の放送CM規制にとどまり、ネット広告やSNS上の組織的拡散、ディープフェイク、外国干渉への規定が存在しない点を問題視した。表現の自由には『情報の出し手の自由』だけでなく『情報の受け手の自由（知る権利）』が含まれるとし、偽情報等が民主的意思決定を阻害する危険性を指摘した。その上で、一般国民の無償の意見表明には原則介入すべきでない一方、有料広告、組織的拡散、成り済まし、外国干渉など情報環境をゆがめる手段には一定の規制が必要と主張した。具体策として、有料ネット広告への支出上限・広告主表示・広告ライブラリー登録・収支報告、有償拡散やディープフェイクへの対応、外国主体や匿名資金の遮断、広報協議会機能強化とプラットフォーム事業者への透明性責務を提案した。EUのデジタルサービス法や政治広告透明化規則を参考に法整備を進めるべきとし、公正な手続と適正な情報環境の確保が国民投票結果の正統性を支えると強調した。"
//   }
// ]
// \`\`\`
// `

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
  const answerData = data.split("――――◇―――――").slice(1).join("\n\n").split("○");
  console.log(`Read ${answerData.length} answers from the file.`);
  const splittedAnswerData: string[] = [];
  for(let i = 0; i < answerData.length; i+=textChunkSize) {
    splittedAnswerData.push(answerData.slice(i, i + textChunkSize).join("○"));
  }
  let participantList: Participant[] = [];
  try {
    console.log("Fetching participant data...");
    const participantResponse = await openaiClient.responses.create({
      model,
      input: participantData,
      instructions: searchParticipantPrompt,
      tools: [
          { type: "web_search" },
      ],
    });
    participantList = JSON.parse(participantResponse.output_text.replace(/```json/g, "").replace(/```/g, "")).map(convertParticipant);
    console.log(`Fetched ${participantList.length} participants.`);
  } catch (error) {
    console.error("Error fetching participant data:", error);
    return;
  }
  if (!participantList || participantList.length === 0) {
    console.error("No participants found.");
    return;
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
            || (name && name.startsWith(p.familyName + p.name.slice(p.familyName.length, p.familyName.length + 1)));
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
        const categorizeResponse = await openaiClient.responses.create({
          model,
          input: JSON.stringify(
            {
              ...Object.fromEntries(answerChunk.map((answer, index) => [i * answerChunkSize + index, answer.content])),
              categories: partyAnswerTopics[party],
            }
          ),
          instructions: categorizePrompt(categoryChunkSize + i * categoryChunkSize),
        });
        const categories: Category[] = JSON.parse(categorizeResponse.output_text.replace(/```json/g, "").replace(/```/g, ""));
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
        .filter(Boolean) // undefinedを除外
      }
    });
  }
  await fs.writeFile(`kokkai/${firstLine}/${now}/partyAnswerTopicsResults.json`, JSON.stringify(partyAnswerTopicsOutput, null, 2), "utf-8");
  await fs.writeFile(`kokkai/${firstLine}/${now}/partyAnswerTopics.json`, JSON.stringify(partyAnswerTopics, null, 2), "utf-8");
}

main("./txt/FKG004_20260623_194940.txt").catch((error) => {
  console.error("Error:", error);
});