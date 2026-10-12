export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, phone, type, message, date, time } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: "이름과 연락처를 모두 입력해 주세요." });
  }

  const targetEmail = "realhj629@naver.com";
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  try {
    // Forward to Formsubmit.co AJAX endpoint to securely deliver to realhj629@naver.com
    const response = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        _subject: `[한양부동산 상담신청] ${name} 고객님 (${type || '일반상담'})`,
        _template: "table",
        "신청일시": now,
        "고객성함": name,
        "연락처": phone,
        "상담분야": type || "상담 요청",
        "희망방문일시": (date || time) ? `${date || ''} ${time || ''}`.trim() : "해당 없음",
        "문의내용": message || "내용 없음"
      })
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      const err = await response.text();
      return res.status(500).json({ error: "이메일 전송 실패", detail: err });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
