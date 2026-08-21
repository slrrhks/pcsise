// Vercel 서버리스 함수 — 브라우저 대신 서버에서 Claude API를 호출합니다.
//
// 왜 필요한가:
//   API 키를 브라우저 코드에 넣으면 누구나 개발자도구로 꺼내 쓸 수 있습니다.
//   그러면 남이 내 요금으로 API를 쓰게 됩니다. 그래서 키는 반드시 서버에만 둡니다.
//
// 사전 준비:
//   Vercel 프로젝트 Settings > Environment Variables 에
//   ANTHROPIC_API_KEY 를 등록하세요. (코드에 직접 적지 마세요)

// 같은 IP의 과도한 호출을 막는 간단한 제한 장치.
// 서버리스는 인스턴스가 여러 개일 수 있어 완벽하진 않지만,
// 실수나 단순 반복 호출로 요금이 새는 건 막아줍니다.
const rateLimit = new Map();
const WINDOW_MS = 60 * 60 * 1000; // 1시간
const MAX_CALLS = 20; // IP당 시간당 최대 호출 수

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now - record.start > WINDOW_MS) {
    rateLimit.set(ip, { start: now, count: 1 });
    return true;
  }
  if (record.count >= MAX_CALLS) return false;

  record.count += 1;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 받습니다." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 API 키가 설정되지 않았습니다." });
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return res
      .status(429)
      .json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." });
  }

  try {
    const { messages, max_tokens = 1000 } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages가 필요합니다." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens,
        messages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic API 오류:", data.error);
      return res.status(502).json({ error: "분석 중 문제가 생겼어요." });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("서버 오류:", err);
    return res.status(500).json({ error: "분석 중 문제가 생겼어요." });
  }
}
