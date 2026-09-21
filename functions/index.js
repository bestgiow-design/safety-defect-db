const Anthropic = require("@anthropic-ai/sdk");
const {onRequest} = require("firebase-functions/v2/https");
const client = new Anthropic.Anthropic();
exports.aiAnalyze = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.set("Access-Control-Allow-Methods", "POST"); res.set("Access-Control-Allow-Headers", "Content-Type"); return res.status(204).send(""); }
  if (!req.body || !req.body.title) return res.status(400).json({ error: "缺少缺失名稱" });
  const title = req.body.title;
  try {
    const prompt = `你是台灣職業安全衛生法規專家。\n缺失名稱：${title}\n\n請從以下法規中找出最相關的2-4條條文：\n- 職業安全衛生法（pcode: N0060001）\n- 職業安全衛生設施規則（pcode: N0060009）\n- 營造安全衛生設施標準（pcode: N0060014）\n- 職業安全衛生管理辦法（pcode: N0060027）\n- 危險性機械及設備安全檢查規則（pcode: N0060039）\n- 營建工程空氣污染防制設施管理辦法（pcode: O0020058）\n- 道路交通安全規則（pcode: K0040013）\n\n重要規則：\n1. law_name 必須完全符合上面列出的法規名稱\n2. law_no 只填條號本身，不要加「第」「條」。條號帶「之」的寫成 21-1、239-1 這種格式，不要寫成 211、2391\n3. lawtext 留空字串\n4. 不確定就少建議，不要亂猜\n\n回傳JSON：{"laws":[{"law_name":"法規名稱","law_no":"條號","law_pcode":"pcode","lawtext":""}],"hazard":"危害說明40字","improve":"改善措施40字","plain":"白話說明40字"}`;
    const message = await client.messages.create({ model: "claude-sonnet-4-5", max_tokens: 1500, messages: [{ role: "user", content: prompt }] });
    const text = message.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON: " + text);
    const result = JSON.parse(match[0]);
    // 條號正規化：保留「-」，「之」轉「-」。舊版把非數字全刪，會讓 21-1 變成 211（曾寫錯進資料庫）
    const normNo = (s) => String(s ?? "").replace(/[第條\s]/g, "").replace(/之/g, "-").replace(/[^0-9-]/g, "");
    if (result.laws) result.laws = result.laws.map(l => ({ ...l, law_no: normNo(l.law_no) }));
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
