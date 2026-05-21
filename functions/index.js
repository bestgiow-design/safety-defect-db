const { onRequest } = require("firebase-functions/v2/https");
const Anthropic = require("@anthropic-ai/sdk");

exports.aiAnalyze = onRequest({ cors: true }, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client = new Anthropic({ apiKey });
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "缺少缺失名稱" });
  try {
    const prompt = "你是台灣職業安全衛生法規專家。\n缺失名稱：" + title + "\n\n請回傳JSON（只有JSON不要其他文字），包含：\n1. laws：陣列，列出2~4條最相關的法規，每條包含 law_name、law_no（純數字）、law_pcode、lawtext（條文核心義務20字內）\n2. hazard：具體危害40字內\n3. improve：改善措施40字內\n4. plain：白話說明40字內\n\n法規代碼：職業安全衛生法N0060001、職業安全衛生設施規則N0060009、營造安全衛生設施標準N0060014、職業安全衛生管理辦法N0060008、危險性機械及設備安全檢查規則N0060006\n\n範例：{\"laws\":[{\"law_name\":\"職業安全衛生設施規則\",\"law_no\":\"281\",\"law_pcode\":\"N0060009\",\"lawtext\":\"高度2公尺以上應設護欄\"},{\"law_name\":\"營造安全衛生設施標準\",\"law_no\":\"40\",\"law_pcode\":\"N0060014\",\"lawtext\":\"施工架應設上下欄杆及踢腳板\"}],\"hazard\":\"危害說明\",\"improve\":\"改善措施\",\"plain\":\"白話說明\"}";
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }]
    });
    const text = message.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON: " + text);
    const result = JSON.parse(match[0]);
    if (result.laws) {
      result.laws = result.laws.map(l => ({ ...l, law_no: String(l.law_no).replace(/[^0-9]/g, "") }));
    }
    res.set("Access-Control-Allow-Origin", "*");
    res.json(result);
  } catch (e) {
    console.error(e);
    res.set("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: e.message });
  }
});
