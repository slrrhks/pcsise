// scripts/update-prices.js
//
// GitHub Actions(update-prices.yml)가 매주 실행하는 스크립트입니다.
// Claude API의 웹서치 도구를 이용해 주요 부품의 최신 중고 시세를 조사하고,
// 결과를 src/data/prices.json 에 저장합니다.
//
// 실행: node scripts/update-prices.js
// 필요 환경변수: ANTHROPIC_API_KEY

const fs = require("fs");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "..", "src", "data", "prices.json");

// 매주 조사할 대표 부품 목록 (전체 부품을 다 조사하면 비용이 커지므로,
// 가격 변동이 큰 GPU/CPU 위주로 우선 조사하고 나머지는 비율로 보정하는 방식을 권장)
const TARGET_COMPONENTS = [
  "RTX 4060", "RTX 4060 Ti", "RTX 4070", "RTX 4070 Ti", "RTX 4080", "RTX 4090",
  "RTX 3060", "인텔 i5-13400", "인텔 i7-13700", "라이젠 5 7500F", "라이젠 7 7700",
];

async function fetchLatestPrices() {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content:
            `다음 컴퓨터 부품들의 2026년 현재 대한민국 중고 거래 대표 시세(만원 단위)를 웹검색으로 조사해줘: ` +
            `${TARGET_COMPONENTS.join(", ")}. ` +
            `조사 후 반드시 아래 JSON 형식으로만 응답해 (다른 설명 텍스트 없이 JSON만):\n` +
            `{"업데이트일": "YYYY-MM-DD", "부품별시세": [{"이름": "...", "중고시세만원": 00, "근거요약": "..."}]}`,
        },
      ],
    }),
  });

  const data = await response.json();
  const textBlock = data.content.find((c) => c.type === "text");
  if (!textBlock) throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function main() {
  console.log("최신 시세 조사를 시작합니다...");
  const result = await fetchLatestPrices();

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf-8");

  console.log(`prices.json 업데이트 완료 (${result["업데이트일"]})`);
}

main().catch((err) => {
  console.error("시세 업데이트 실패:", err);
  process.exit(1);
});
