import React, { useState, useMemo, useEffect } from "react";

// 출처: 본치마크(computer.downingmoon.dev) — 당근/번개장터/중고나라 등 공개 매물의 최근 90일 표본.
// GPU 일부는 2026-08-18 갱신값으로 실측 확인. 판매완료가(soldPrice/soldN)는 확인된 제품에만 존재.
// 그 외 부품의 표본 수(n)는 미검증 추정치이므로 실서비스 전 재조사 필요.
const DATA_UPDATED_AT = "2026-08-18";

// ── 기능 스위치 ───────────────────────────────────────────────
// AI 호출 비용이 붙는 기능들. 배포 초기에는 꺼두고 트래픽을 본 뒤 켠다.
// true로 바꾸면 해당 기능이 화면에 다시 나타난다.
const FEATURES = {
  aiRefine: false,      // 실시간 시세 보정 (1건당 약 5~15원)
  aiSearch: false,      // AI 실시간 시세 검색 (웹 검색 별도 과금, 1건당 약 50~100원)
  aiListingCheck: true, // 매물 적정가 판정 (1건당 약 5~30원)
};

// ---- Baseline reference data ----
// 출처: 본치마크(computer.downingmoon.dev) — 당근/번개장터/중고나라 등 공개 매물의 최근 90일 표본 중간값.
// 2026-08-19~20 기준 수집. base = 실제 P2P 매물 중간값(만원), newPrice = 신품 정가 참고값(만원).
const DATA_SOURCE_NOTE = "본치마크 P2P 매물 중간값 (최근 90일 표본)";

const CPUS = [
  // 인텔 (표본 3~16건 기준)
  { id: "i5-12400f", label: "인텔 i5-12400F", base: 17.5, newPrice: 22, n: 14 },
  { id: "i5-13400", label: "인텔 i5-13400", base: 24, newPrice: 28, n: 6 },
  { id: "i5-13400f", label: "인텔 i5-13400F", base: 19.5, newPrice: 24, n: 16 },
  { id: "i5-12600k", label: "인텔 i5-12600K", base: 26, newPrice: 32, n: 8 },
  { id: "i5-13600k", label: "인텔 i5-13600K", base: 26, newPrice: 34, n: 11 },
  { id: "i5-14600k", label: "인텔 i5-14600K", base: 32.5, newPrice: 40, n: 9 },
  { id: "i7-13700kf", label: "인텔 i7-13700KF", base: 35, newPrice: 45, n: 7 },
  { id: "i7-8700", label: "인텔 i7-8700", base: 11, newPrice: 0, n: 12 },
  { id: "i9-14900k", label: "인텔 i9-14900K", base: 69, newPrice: 78, n: 6 },
  { id: "i9-10900k", label: "인텔 i9-10900K", base: 32, newPrice: 0, n: 5 },
  { id: "i5-10400f", label: "인텔 i5-10400F", base: 11.5, newPrice: 0, n: 18 },
  { id: "i5-11400f", label: "인텔 i5-11400F", base: 12, newPrice: 0, n: 13 },
  { id: "i5-8400", label: "인텔 i5-8400", base: 5, newPrice: 0, n: 9 },
  { id: "i5-7500", label: "인텔 i5-7500", base: 4, newPrice: 0, n: 7 },
  { id: "i5-6500", label: "인텔 i5-6500", base: 2.7, newPrice: 0, n: 11 },
  { id: "i3-9100f", label: "인텔 i3-9100F", base: 3.1, newPrice: 0, n: 8 },
  // AMD (표본 3~16건 기준)
  { id: "r5-5600", label: "라이젠 5 5600", base: 15.5, newPrice: 19, n: 15 },
  { id: "r5-5600x", label: "라이젠 5 5600X", base: 16, newPrice: 20, n: 12 },
  { id: "r5-7500f", label: "라이젠 5 7500F", base: 13, newPrice: 17, n: 9 },
  { id: "r5-7600", label: "라이젠 5 7600", base: 18, newPrice: 23, n: 7 },
  { id: "r5-9600x", label: "라이젠 5 9600X", base: 22.8, newPrice: 28, n: 5 },
  { id: "r7-5700x", label: "라이젠 7 5700X", base: 27, newPrice: 32, n: 11 },
  { id: "r7-5700x3d", label: "라이젠 7 5700X3D", base: 36, newPrice: 42, n: 8 },
  { id: "r7-5800x3d", label: "라이젠 7 5800X3D", base: 42.5, newPrice: 0, n: 13 },
  { id: "r7-7700x", label: "라이젠 7 7700X", base: 20, newPrice: 26, n: 6 },
  { id: "r7-7800x3d", label: "라이젠 7 7800X3D", base: 39.5, newPrice: 48, n: 16 },
  { id: "r7-9800x3d", label: "라이젠 7 9800X3D", base: 57.5, newPrice: 68, n: 9 },
  { id: "r9-7900x", label: "라이젠 9 7900X", base: 28, newPrice: 35, n: 5 },
  { id: "r9-9900x", label: "라이젠 9 9900X", base: 48, newPrice: 58, n: 4 },
  { id: "r5-3600", label: "라이젠 5 3600", base: 8.5, newPrice: 0, n: 14 },
  { id: "r5-2600", label: "라이젠 5 2600", base: 3.5, newPrice: 0, n: 10 },
];

const GPUS = [
  { id: "none", label: "없음 (내장그래픽)", base: 0, newPrice: 0 },
  // NVIDIA RTX 50 시리즈
  { id: "rtx5090", label: "RTX 5090", base: 628, newPrice: 500, n: 7 },
  { id: "rtx5080", label: "RTX 5080", base: 220, newPrice: 190, n: 11 },
  { id: "rtx5070ti", label: "RTX 5070 Ti", base: 139, newPrice: 130, n: 24 },
  { id: "rtx5070", label: "RTX 5070", base: 102, newPrice: 95, n: 18 },
  { id: "rtx5060ti-16", label: "RTX 5060 Ti 16GB", base: 80.5, newPrice: 75, n: 9 },
  { id: "rtx5060ti-8", label: "RTX 5060 Ti 8GB", base: 59, newPrice: 58, n: 5 },
  { id: "rtx5060", label: "RTX 5060", base: 53, newPrice: 50, n: 6 },
  // NVIDIA RTX 40 시리즈
  { id: "rtx4090", label: "RTX 4090", base: 360, newPrice: 0, n: 19 },
  { id: "rtx4080super", label: "RTX 4080 Super", base: 130, newPrice: 0, n: 8 },
  { id: "rtx4080", label: "RTX 4080", base: 125, newPrice: 0, n: 6 },
  { id: "rtx4070ti-super", label: "RTX 4070 Ti Super", base: 95, newPrice: 0, n: 7 },
  { id: "rtx4070ti", label: "RTX 4070 Ti", base: 75, newPrice: 0, n: 9 },
  { id: "rtx4070super", label: "RTX 4070 Super", base: 70, newPrice: 0, n: 11 },
  { id: "rtx4070", label: "RTX 4070", base: 60, newPrice: 0, n: 5, soldPrice: 64, soldN: 3, verified: true },
  { id: "rtx4060ti-16", label: "RTX 4060 Ti 16GB", base: 55, newPrice: 0, n: 6 },
  { id: "rtx4060ti-8", label: "RTX 4060 Ti 8GB", base: 50, newPrice: 0, n: 10 },
  { id: "rtx4060", label: "RTX 4060", base: 38, newPrice: 0, n: 15 },
  // NVIDIA RTX 30 시리즈
  { id: "rtx3090ti", label: "RTX 3090 Ti", base: 150, newPrice: 0, n: 3 },
  { id: "rtx3090", label: "RTX 3090", base: 132, newPrice: 0, n: 5 },
  { id: "rtx3080ti", label: "RTX 3080 Ti", base: 61, newPrice: 0, n: 4 },
  { id: "rtx3080-12", label: "RTX 3080 12GB", base: 47.1, newPrice: 0, n: 6 },
  { id: "rtx3080-10", label: "RTX 3080 10GB", base: 42, newPrice: 0, n: 12 },
  { id: "rtx3070ti", label: "RTX 3070 Ti", base: 36, newPrice: 0, n: 9 },
  { id: "rtx3070", label: "RTX 3070", base: 33.9, newPrice: 0, n: 21 },
  { id: "rtx3060ti", label: "RTX 3060 Ti", base: 30.4, newPrice: 0, n: 28 },
  { id: "rtx3060-12", label: "RTX 3060 12GB", base: 30.5, newPrice: 0, n: 45 },
  { id: "rtx3060-8", label: "RTX 3060 8GB", base: 30.6, newPrice: 0, n: 8 },
  { id: "rtx3050-8", label: "RTX 3050 8GB", base: 21, newPrice: 0, n: 14 },
  // NVIDIA RTX 20 시리즈
  { id: "rtx2080ti", label: "RTX 2080 Ti", base: 32.5, newPrice: 0, n: 6 },
  { id: "rtx2080super", label: "RTX 2080 Super", base: 27, newPrice: 0, n: 4 },
  { id: "rtx2080", label: "RTX 2080", base: 25.5, newPrice: 0, n: 5 },
  { id: "rtx2070super", label: "RTX 2070 Super", base: 23.4, newPrice: 0, n: 8 },
  { id: "rtx2070", label: "RTX 2070", base: 20, newPrice: 0, n: 7 },
  { id: "rtx2060super", label: "RTX 2060 Super", base: 20.3, newPrice: 0, n: 11 },
  { id: "rtx2060", label: "RTX 2060", base: 21, newPrice: 0, n: 9, verified: true },
  // NVIDIA GTX
  { id: "gtx1080ti", label: "GTX 1080 Ti", base: 19, newPrice: 0, n: 14, verified: true },
  { id: "gtx1080", label: "GTX 1080", base: 15, newPrice: 0, n: 13, verified: true },
  { id: "gtx1070ti", label: "GTX 1070 Ti", base: 14, newPrice: 0, n: 8, verified: true },
  { id: "gtx1070", label: "GTX 1070", base: 11.9, newPrice: 0, n: 19, verified: true },
  { id: "gtx1660super", label: "GTX 1660 Super", base: 14.2, newPrice: 0, n: 24, verified: true },
  { id: "gtx1660ti", label: "GTX 1660 Ti", base: 14.1, newPrice: 0, n: 14, verified: true },
  { id: "gtx1660", label: "GTX 1660", base: 13.5, newPrice: 0, n: 13, verified: true },
  { id: "gtx1650super", label: "GTX 1650 Super", base: 11.8, newPrice: 0, n: 6, verified: true },
  { id: "gtx1650", label: "GTX 1650", base: 10, newPrice: 0, n: 26, verified: true },
  { id: "gtx1060-6", label: "GTX 1060 6GB", base: 9.5, newPrice: 0, n: 19, verified: true },
  { id: "gtx1060-3", label: "GTX 1060 3GB", base: 8.5, newPrice: 0, n: 14, verified: true },
  { id: "gtx1050ti", label: "GTX 1050 Ti", base: 8, newPrice: 0, n: 27, verified: true },
  { id: "gtx1050", label: "GTX 1050", base: 6, newPrice: 0, n: 13, verified: true },
  { id: "gtx980", label: "GTX 980", base: 8.5, newPrice: 0, n: 11, verified: true },
  { id: "gtx970", label: "GTX 970", base: 6.6, newPrice: 0, n: 12, verified: true },
  { id: "gt1030", label: "GT 1030", base: 7.3, newPrice: 0, n: 4, verified: true },
  // AMD Radeon
  { id: "rx9070xt", label: "RX 9070 XT", base: 100, newPrice: 95, n: 8 },
  { id: "rx9070", label: "RX 9070", base: 80, newPrice: 78, n: 6 },
  { id: "rx9060xt-16", label: "RX 9060 XT 16GB", base: 58.5, newPrice: 56, n: 4 },
  { id: "rx7900xtx", label: "RX 7900 XTX", base: 92, newPrice: 0, n: 7 },
  { id: "rx7900xt", label: "RX 7900 XT", base: 86, newPrice: 0, n: 5 },
  { id: "rx7900gre", label: "RX 7900 GRE", base: 58, newPrice: 0, n: 4 },
  { id: "rx6900xt", label: "RX 6900 XT", base: 48, newPrice: 0, n: 3 },
  { id: "rx6800xt", label: "RX 6800 XT", base: 43, newPrice: 0, n: 6 },
  { id: "rx6800", label: "RX 6800", base: 32, newPrice: 0, n: 4 },
  { id: "rx6700xt", label: "RX 6700 XT", base: 27, newPrice: 0, n: 9 },
  { id: "rx6600", label: "RX 6600", base: 22.8, newPrice: 0, n: 12 },
  { id: "rx580-8", label: "RX 580 8GB", base: 9.7, newPrice: 0, n: 16 },
  { id: "rx570-8", label: "RX 570 8GB", base: 8.5, newPrice: 0, n: 11 },
  { id: "rx570-4", label: "RX 570 4GB", base: 6, newPrice: 0, n: 7 },
  // Intel Arc
  { id: "arc-b580", label: "Arc B580", base: 35, newPrice: 33, n: 5 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 3~35건). 2026년 메모리 급등이 그대로 반영된 수치.
const RAM_OPTIONS = [
  { id: "ddr3-8", label: "DDR3 8GB", base: 1.8, newPrice: 0, n: 6 },
  { id: "ddr4-8", label: "DDR4 8GB", base: 5, newPrice: 7, n: 28 },
  { id: "ddr4-16", label: "DDR4 16GB", base: 11.3, newPrice: 15, n: 35 },
  { id: "ddr4-32", label: "DDR4 32GB", base: 25.5, newPrice: 32, n: 19 },
  { id: "ddr4-64", label: "DDR4 64GB", base: 60, newPrice: 72, n: 4 },
  { id: "ddr5-8", label: "DDR5 8GB", base: 15, newPrice: 18, n: 7 },
  { id: "ddr5-16", label: "DDR5 16GB", base: 27.4, newPrice: 33, n: 24 },
  { id: "ddr5-32", label: "DDR5 32GB", base: 59.1, newPrice: 68, n: 22 },
  { id: "ddr5-48", label: "DDR5 48GB", base: 73.5, newPrice: 85, n: 3 },
  { id: "ddr5-64", label: "DDR5 64GB", base: 120, newPrice: 135, n: 5 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 5~166건).
const STORAGE_OPTIONS = [
  { id: "sata-128", label: "SATA SSD 128GB", base: 2, newPrice: 0, n: 22 },
  { id: "sata-256", label: "SATA SSD 256GB", base: 4, newPrice: 5, n: 48 },
  { id: "sata-500", label: "SATA SSD 500GB", base: 9, newPrice: 11, n: 61 },
  { id: "sata-1000", label: "SATA SSD 1TB", base: 16, newPrice: 19, n: 39 },
  { id: "sata-2000", label: "SATA SSD 2TB", base: 28, newPrice: 33, n: 12 },
  { id: "nvme-256", label: "NVMe SSD 256GB", base: 5.8, newPrice: 7, n: 35 },
  { id: "nvme-512", label: "NVMe SSD 512GB", base: 9.6, newPrice: 12, n: 88 },
  { id: "nvme-1000", label: "NVMe SSD 1TB", base: 20, newPrice: 24, n: 166 },
  { id: "nvme-2000", label: "NVMe SSD 2TB", base: 38, newPrice: 44, n: 44 },
  { id: "nvme-4000", label: "NVMe SSD 4TB", base: 77, newPrice: 88, n: 7 },
  { id: "hdd-1000", label: "HDD 1TB", base: 2.7, newPrice: 5, n: 29 },
  { id: "hdd-2000", label: "HDD 2TB", base: 5, newPrice: 8, n: 24 },
  { id: "hdd-4000", label: "HDD 4TB", base: 12.8, newPrice: 16, n: 9 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 4~47건).
const MOBO_OPTIONS = [
  // AMD AM5
  { id: "am5-x870", label: "AM5 X870", base: 38, newPrice: 45, n: 6 },
  { id: "am5-x670", label: "AM5 X670", base: 26, newPrice: 32, n: 5 },
  { id: "am5-b850", label: "AM5 B850", base: 19.5, newPrice: 24, n: 8 },
  { id: "am5-b650e", label: "AM5 B650E", base: 18.6, newPrice: 23, n: 7 },
  { id: "am5-b650", label: "AM5 B650", base: 14, newPrice: 18, n: 14 },
  { id: "am5-a620", label: "AM5 A620", base: 8.3, newPrice: 11, n: 9 },
  // AMD AM4
  { id: "am4-x570", label: "AM4 X570", base: 13.4, newPrice: 0, n: 11 },
  { id: "am4-b550", label: "AM4 B550", base: 12, newPrice: 15, n: 31 },
  { id: "am4-x470", label: "AM4 X470", base: 8.9, newPrice: 0, n: 6 },
  { id: "am4-b450", label: "AM4 B450", base: 8, newPrice: 0, n: 28 },
  { id: "am4-b350", label: "AM4 B350", base: 6.4, newPrice: 0, n: 13 },
  { id: "am4-a520", label: "AM4 A520", base: 5.5, newPrice: 8, n: 10 },
  { id: "am4-a320", label: "AM4 A320", base: 4.7, newPrice: 0, n: 12 },
  // 인텔 LGA1700 / 1200 / 1151 등
  { id: "lga1200-b560", label: "LGA1200 B560", base: 7.3, newPrice: 0, n: 15 },
  { id: "lga1200-b460", label: "LGA1200 B460", base: 5.9, newPrice: 0, n: 11 },
  { id: "lga1200-h510", label: "LGA1200 H510", base: 5.2, newPrice: 0, n: 18 },
  { id: "lga1200-h410", label: "LGA1200 H410", base: 5.5, newPrice: 0, n: 9 },
  { id: "lga1151-z390", label: "LGA1151 Z390", base: 9.8, newPrice: 0, n: 12 },
  { id: "lga1151-z370", label: "LGA1151 Z370", base: 7.1, newPrice: 0, n: 8 },
  { id: "lga1151-b365", label: "LGA1151 B365", base: 6, newPrice: 0, n: 10 },
  { id: "lga1151-b360", label: "LGA1151 B360", base: 5, newPrice: 0, n: 19 },
  { id: "lga1151-h310", label: "LGA1151 H310", base: 3.6, newPrice: 0, n: 47 },
  { id: "lga1151-h110", label: "LGA1151 H110", base: 2.8, newPrice: 0, n: 21 },
  { id: "lga1150-h97", label: "LGA1150 H97", base: 3, newPrice: 0, n: 7 },
  { id: "lga1150-h81", label: "LGA1150 H81", base: 2, newPrice: 0, n: 14 },
  { id: "lga1150-b85", label: "LGA1150 B85", base: 1.7, newPrice: 0, n: 9 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 3~51건).
const PSU_OPTIONS = [
  { id: "400w", label: "400W Standard", base: 1.2, newPrice: 3, n: 8 },
  { id: "450w", label: "450W Standard", base: 1.7, newPrice: 3.5 },
  { id: "500w", label: "500W Standard", base: 1.5, newPrice: 4, n: 22 },
  { id: "550w", label: "550W Standard", base: 1.6, newPrice: 4.5 },
  { id: "600w-std", label: "600W Standard", base: 2.3, newPrice: 5, n: 19 },
  { id: "600w-bronze", label: "600W Bronze", base: 2.9, newPrice: 6, n: 13 },
  { id: "650w-std", label: "650W Standard", base: 2.5, newPrice: 5.5 },
  { id: "650w-bronze", label: "650W Bronze", base: 2.9, newPrice: 6.5 },
  { id: "700w-std", label: "700W Standard", base: 3.5, newPrice: 6, n: 51 },
  { id: "700w-bronze", label: "700W Bronze", base: 4, newPrice: 7, n: 27 },
  { id: "750w-gold", label: "750W Gold", base: 9.2, newPrice: 12, n: 18 },
  { id: "850w-gold", label: "850W Gold", base: 9, newPrice: 12.5 },
  { id: "1000w-std", label: "1000W Standard", base: 6.6, newPrice: 10, n: 6 },
  { id: "1000w-gold", label: "1000W Gold", base: 11.3, newPrice: 15, n: 9 },
  { id: "1200w-platinum", label: "1200W Platinum", base: 28.4, newPrice: 34, n: 3 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 3~35건).
const CASE_OPTIONS = [
  { id: "office-matx", label: "사무용 mATX 케이스", base: 3.3, newPrice: 4, n: 35 },
  { id: "mid-tower", label: "일반 미들타워 케이스", base: 3.8, newPrice: 5, n: 28 },
  { id: "matx-mesh", label: "보급형 M-ATX 메쉬 케이스", base: 4, newPrice: 5.5 },
  { id: "mini-tower", label: "일반 미니타워 케이스", base: 4.2, newPrice: 5.5 },
  { id: "glass-mid", label: "강화유리 미들타워 케이스", base: 5.5, newPrice: 7.5 },
  { id: "itx", label: "ITX 소형 케이스", base: 6.2, newPrice: 8.5 },
  { id: "fishtank", label: "어항형 케이스", base: 7.8, newPrice: 11, n: 7 },
  { id: "big-tower", label: "빅타워 케이스", base: 10, newPrice: 14, n: 5 },
];

// 기준값(base)이 "현재 시점의 실제 매물 중간값"이므로, 연차 배율은 1.0을 중심으로 상태 보정만 합니다.
// (일반적인 매물 = 몇 년 사용한 제품이 이미 반영된 값이라, 과거처럼 크게 깎지 않습니다)
const AGE_OPTIONS = [
  { id: "0-1", label: "1년 미만", factor: 1.15 },
  { id: "1-2", label: "1~2년", factor: 1.05 },
  { id: "2-3", label: "2~3년", factor: 1.0 },
  { id: "3-4", label: "3~4년", factor: 0.93 },
  { id: "4-5", label: "4~5년", factor: 0.86 },
  { id: "5+", label: "5년 이상", factor: 0.78 },
];

const CONDITION_OPTIONS = [
  { id: "excellent", label: "새것같음", factor: 1.08, tone: "#2F6F4E" },
  { id: "good", label: "양호", factor: 1.0, tone: "#3E7A57" },
  { id: "fair", label: "보통", factor: 0.88, tone: "#8A6D1F" },
  { id: "poor", label: "하자있음", factor: 0.68, tone: "#B0402A" },
];

function formatWon(manwon) {
  return Math.round(manwon).toLocaleString("ko-KR") + "만원";
}

export default function PCPriceEstimator() {
  const [cpuText, setCpuText] = useState("인텔 i5-13400");
  const [gpuText, setGpuText] = useState("RTX 4070");
  const [ram, setRam] = useState("ddr4-16");
  const [storage, setStorage] = useState("nvme-512");
  const [mobo, setMobo] = useState("am4-b550");
  const [psu, setPsu] = useState("700w-std");
  const [pcCase, setPcCase] = useState("mid-tower");
  const [includeCase, setIncludeCase] = useState(true);
  const [age, setAge] = useState("2-3");
  const [condition, setCondition] = useState(CONDITION_OPTIONS[1].id);

  // 입력한 텍스트와 참고 목록을 느슨하게 매칭 (공백 제거 후 부분일치)
  function findMatch(list, text) {
    const norm = (s) => s.toLowerCase().replace(/[\s-_]/g, "");
    const t = norm(text || "");
    if (!t) return undefined;
    return list.find((o) => norm(o.label).includes(t) || t.includes(norm(o.label)));
  }

  const cpuMatch = findMatch(CPUS, cpuText) ?? null;
  const gpuMatch = findMatch(GPUS, gpuText) ?? null;

  // 목록에 없는 모델 입력 시 사용할 대체값 (표본 없음 → 신뢰도 낮음으로 표시됨)
  const cpuFallback = { id: "cpu-unknown", label: cpuText || "미입력", base: 18, newPrice: 24, n: 0 };
  const gpuFallback = { id: "gpu-unknown", label: gpuText || "미입력", base: 40, newPrice: 0, n: 0 };

  // datalist가 모바일 브라우저(특히 iOS Safari)에서 잘 안 뜨는 문제 때문에 직접 만든 드롭다운으로 대체
  const [showCpuSuggest, setShowCpuSuggest] = useState(false);
  const [showGpuSuggest, setShowGpuSuggest] = useState(false);

  function filterSuggestions(list, text) {
    const norm = (s) => s.toLowerCase().replace(/[\s-_]/g, "");
    const t = norm(text || "");
    if (!t) return list.slice(0, 8);
    return list.filter((o) => norm(o.label).includes(t)).slice(0, 8);
  }

  const cpuSuggestions = filterSuggestions(CPUS, cpuText);
  const gpuSuggestions = filterSuggestions(GPUS, gpuText);

  // ---- 스크린샷 업로드 → 적정가 판정 (데모용 목업) ----
  const [shotStatus, setShotStatus] = useState("idle"); // idle | analyzing | done
  const [shotResult, setShotResult] = useState(null);
  const [shotError, setShotError] = useState(null);
  const [showNewPrice, setShowNewPrice] = useState(false);
  const [listingText, setListingText] = useState("");
  const [shotImage, setShotImage] = useState(null); // { url, name }
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState("text"); // text | image

  // ---- 사용자 실거래 제보 데이터 ----
  // { partId: [가격(만원), ...] } — 실제 서비스에서는 서버 DB에 저장해 전체 사용자와 공유
  const [userReports, setUserReports] = useState({});
  const [reportPartId, setReportPartId] = useState("");
  const [reportPrice, setReportPrice] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [priceBasis, setPriceBasis] = useState("listed"); // listed | sold
  const [partQuery, setPartQuery] = useState("");
  const [searchMode, setSearchMode] = useState("local"); // local | ai
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");

  const totalReportCount = useMemo(
    () => Object.values(userReports).reduce((sum, arr) => sum + arr.length, 0),
    [userReports]
  );

  // 저장된 제보 불러오기
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem("user-reports");
        if (raw) setUserReports(JSON.parse(raw));
      } catch (e) {
        // 저장된 제보가 없으면 그대로 진행
      }
    })();
  }, []);

  // 제보 대상으로 고를 수 있는 전체 부품 목록
  const allParts = useMemo(
    () => [
      ...CPUS.map((o) => ({ ...o, group: "CPU" })),
      ...GPUS.filter((o) => o.base > 0).map((o) => ({ ...o, group: "그래픽카드" })),
      ...RAM_OPTIONS.map((o) => ({ ...o, group: "RAM" })),
      ...STORAGE_OPTIONS.map((o) => ({ ...o, group: "저장장치" })),
      ...MOBO_OPTIONS.map((o) => ({ ...o, group: "메인보드" })),
      ...PSU_OPTIONS.map((o) => ({ ...o, group: "파워" })),
      ...CASE_OPTIONS.map((o) => ({ ...o, group: "케이스" })),
    ],
    []
  );

  // 제보 검증: 기존 시세의 30~300% 범위를 벗어나면 오타·조작으로 보고 거부
  function validateReport(partId, price) {
    const part = allParts.find((p) => p.id === partId);
    if (!part) return { ok: false, msg: "부품을 찾을 수 없어요." };
    if (!price || price <= 0) return { ok: false, msg: "가격을 올바르게 입력해 주세요." };

    const ref = part.base;
    const min = ref * 0.3;
    const max = ref * 3;
    if (price < min || price > max) {
      return {
        ok: false,
        msg: `현재 시세(${formatWon(ref)}) 대비 너무 차이가 커요. ${formatWon(min)}~${formatWon(max)} 범위로 입력해 주세요. 실제로 이 가격에 거래하셨다면 상태나 구성이 특수한 경우일 수 있어요.`,
      };
    }
    return { ok: true };
  }

  async function submitReport() {
    const price = parseFloat(reportPrice);
    const check = validateReport(reportPartId, price);
    if (!check.ok) {
      setReportError(check.msg);
      return;
    }

    setReportError(null);
    const next = { ...userReports, [reportPartId]: [...(userReports[reportPartId] || []), price] };
    setUserReports(next);
    setReportPrice("");
    setReportDone(true);
    setTimeout(() => setReportDone(false), 2500);
    try {
      localStorage.setItem("user-reports", JSON.stringify(next));
    } catch (e) {
      console.error("제보 저장 실패", e);
    }
  }


  // ---- AI 실시간 보정 (계산기 결과용) ----
  const [refineStatus, setRefineStatus] = useState("idle"); // idle | loading | done
  const [refineResult, setRefineResult] = useState(null);

  async function handleRefine() {
    setRefineStatus("loading");
    setRefineResult(null);
    try {
      const parts = result.perComponent.map((c) => `${c.label}: ${c.name}`).join(", ");
      const prompt = `아래 중고 컴퓨터 구성의 대한민국 P2P(당근마켓·번개장터·중고나라) 중고 시세가 적절한지 검토해주세요.

구성: ${parts}
상태: ${CONDITION_OPTIONS.find((c) => c.id === condition).label}
구입 후 경과: ${AGE_OPTIONS.find((a) => a.id === age).label}
사이트 기준 계산값: ${Math.round(result.mid)}만원

부품 조합, 상태, 연식을 고려해 이 기준값이 적절한지 판단하고, 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"refinedEstimate": 숫자(만원), "confidence": "높음" 또는 "중간" 또는 "낮음", "note": "한 문장 근거 요약"}`;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "API 오류");
      const text = data.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));

      setRefineResult({
        refinedEstimate: parsed.refinedEstimate,
        confidence: parsed.confidence,
        note: parsed.note,
        diffFromSite: parsed.refinedEstimate - Math.round(result.mid),
      });
      setRefineStatus("done");
    } catch (err) {
      console.error(err);
      setRefineResult({
        refinedEstimate: Math.round(result.mid),
        confidence: "낮음",
        note: `실시간 확인에 실패했어요: ${err.message || "알 수 없는 오류"}`,
        diffFromSite: 0,
      });
      setRefineStatus("done");
    }
  }

  function buildPriceTable() {
    return {
      CPU: CPUS.map((o) => `${o.label}=${o.base}만원`).join(", "),
      GPU: GPUS.filter((o) => o.base > 0).map((o) => `${o.label}=${o.base}만원`).join(", "),
      RAM: RAM_OPTIONS.map((o) => `${o.label}=${o.base}만원`).join(", "),
      저장장치: STORAGE_OPTIONS.map((o) => `${o.label}=${o.base}만원`).join(", "),
      메인보드: MOBO_OPTIONS.map((o) => `${o.label}=${o.base}만원`).join(", "),
      파워: PSU_OPTIONS.map((o) => `${o.label}=${o.base}만원`).join(", "),
      케이스: CASE_OPTIONS.map((o) => `${o.label}=${o.base}만원`).join(", "),
    };
  }

  function buildPrompt(sourceLabel) {
    const priceTable = buildPriceTable();
    return `${sourceLabel}에서 다음을 읽어주세요:
1) 판매 가격 (있으면)
2) 부품 구성 (CPU, 그래픽카드, RAM, 저장장치, 메인보드, 파워, 케이스 중 확인 가능한 것)

아래는 당근마켓·번개장터·중고나라 공개 매물 최근 90일 중간값을 집계한 시세표입니다:
${Object.entries(priceTable).map(([k, v]) => `[${k}] ${v}`).join("\n")}

인식한 각 부품을 위 시세표와 대조해서 아래 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 JSON만, 간결하게:
{
  "listedPrice": 숫자 또는 null (읽어낸 판매가, 만원 단위),
  "components": [{"label": "CPU", "name": "모델명", "value": 숫자, "source": "시세표" 또는 "추정"}],
  "fairPrice": 숫자 (부품 시세 합산 적정가, 만원),
  "verdict": "시세보다 저렴함" 또는 "적정가" 또는 "시세보다 비쌈" 또는 "가격 정보 없음",
  "note": "한 문장 요약"
}

시세표에 없는 부품은 성능이 비슷한 제품 기준으로 추정하고 source를 "추정"으로 표시하세요.
부품을 전혀 읽을 수 없으면 components를 빈 배열로 두고 note에 이유를 적으세요.`;
  }

  async function runAnalysis(contentBlocks) {
    // API 키는 서버(api/analyze.js)에만 있고 브라우저로는 내려오지 않습니다.
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 1000,
        messages: [{ role: "user", content: contentBlocks }],
      }),
    });

    const data = await response.json();
    if (response.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
    if (data.error) throw new Error(typeof data.error === "string" ? data.error : "분석 중 문제가 생겼어요.");
    if (!data.content) throw new Error("응답을 받지 못했습니다.");

    const text = data.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const cleaned = text.replace(/```json|```/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      if (data.stop_reason === "max_tokens") throw new Error("응답이 너무 길어 잘렸어요. 판매글을 짧게 줄여보세요.");
      throw new Error(`결과를 해석하지 못했어요: ${cleaned.slice(0, 80) || "빈 응답"}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    } catch (e) {
      throw new Error("응답 형식이 올바르지 않아요. 다시 시도해 주세요.");
    }

    const fairPrice = parsed.fairPrice || 0;
    const listedPrice = parsed.listedPrice;
    const diffPct =
      listedPrice && fairPrice ? Math.round(((listedPrice - fairPrice) / fairPrice) * 100) : null;

    return {
      listedPrice,
      fairPrice,
      diffPct,
      verdict: parsed.verdict,
      note: parsed.note,
      componentBreakdown: parsed.components || [],
    };
  }

  // 모바일 사진은 HEIC이거나 화소가 매우 커서 그대로 보내면 실패합니다.
  // canvas로 다시 그려 JPEG로 변환하고 긴 변을 1600px로 축소합니다.
  function normalizeImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 1600;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const ratio = Math.min(MAX / width, MAX / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          URL.revokeObjectURL(objectUrl);
          resolve({ base64: dataUrl.split(",")[1], previewUrl: dataUrl });
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지를 열지 못했어요. HEIC이면 JPEG로 저장 후 다시 시도해 주세요."));
      };
      img.src = objectUrl;
    });
  }

  async function processImageFile(file) {
    setShotStatus("analyzing");
    setShotResult(null);
    setShotError(null);
    setShotImage({ url: URL.createObjectURL(file), name: file.name || "선택한 이미지" });

    try {
      const { base64, previewUrl } = await normalizeImage(file);
      setShotImage({ url: previewUrl, name: file.name || "선택한 이미지" });

      const analysis = await runAnalysis([
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
        { type: "text", text: buildPrompt("이 이미지(중고 컴퓨터 매물 게시글 캡처 또는 제품 사진)") },
      ]);

      setShotResult(analysis);
      setShotStatus("done");
    } catch (err) {
      console.error(err);
      setShotError(`이미지 분석 실패: ${err.message || "알 수 없는 오류"}`);
      setShotStatus("idle");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (file) processImageFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) processImageFile(file);
  }

  function handlePaste(e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
        }
        return;
      }
    }
  }

  async function handleTextAnalyze() {
    if (!listingText.trim()) return;
    setShotStatus("analyzing");
    setShotResult(null);
    setShotError(null);
    setShotImage(null);

    try {
      const result = await runAnalysis([
        {
          type: "text",
          text: `${buildPrompt("아래 중고 컴퓨터 판매글")}\n\n--- 판매글 내용 ---\n${listingText}`,
        },
      ]);

      setShotResult(result);
      setShotStatus("done");
    } catch (err) {
      console.error(err);
      setShotError(`분석에 실패했어요: ${err.message || "알 수 없는 오류"}`);
      setShotStatus("idle");
    }
  }

  // 제보가 반영된 유효 시세: 조사 표본과 사용자 제보를 표본 수로 가중평균
  // priceBasis가 "sold"이고 판매완료 데이터가 있으면 그 값을 우선 사용
  function effectivePrice(part) {
    if (!part) return { value: 0, n: 0, reportN: 0, basis: "없음", verified: false };

    const useSold = priceBasis === "sold" && part.soldPrice;
    const baseValue = useSold ? part.soldPrice : part.base;
    const baseN = (useSold ? part.soldN : part.n) || 0;
    const basis = useSold ? "판매완료" : "판매중";

    const verified = !!part.verified;
    const reports = userReports[part.id] || [];
    if (reports.length === 0) return { value: baseValue, n: baseN, reportN: 0, basis, verified };

    // 평균 대신 중간값을 써서 이상값 하나가 시세를 흔들지 못하게 함
    const sorted = [...reports].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const reportMedian =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    // 제보 1건 = 조사 표본 0.3건의 가중치. 3~4건 모여야 의미 있게 반영됨
    const REPORT_WEIGHT = 0.3;
    const reportWeight = reports.length * REPORT_WEIGHT;
    const totalWeight = baseN + reportWeight;
    const value =
      totalWeight > 0 ? (baseValue * baseN + reportMedian * reportWeight) / totalWeight : reportMedian;

    return { value, n: baseN + reports.length, reportN: reports.length, basis, verified };
  }

  // 표본 수 기준 신뢰도
  function confidenceOf(n) {
    if (n >= 20) return { label: "높음", tone: "#2F6F4E" };
    if (n >= 8) return { label: "보통", tone: "#8A6D1F" };
    return { label: "낮음", tone: "#B0402A" };
  }

  // AI 실시간 시세 검색: 웹 검색 도구로 현재 중고 시세를 조사
  // 검색 결과 블록이 출력 토큰을 잡아먹어 JSON이 잘리는 일이 있어,
  // 잘려도 살릴 수 있는 줄 단위 포맷으로 받아서 정규식으로 파싱한다.
  async function runAiSearch() {
    const q = aiQuery.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setAiResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `한국 중고 시장에서 "${q}"의 현재 중고 시세를 웹에서 찾아줘.
중고나라, 당근마켓, 번개장터, 퀘이사존 등의 최근 매물 가격을 참고해.

검색을 마친 뒤, 아래 4줄 형식으로만 답해. 다른 말은 절대 붙이지 마.

이름: (정확한 부품 정식 명칭)
시세: (대표 중고가, 예: 45만원)
범위: (최저~최고, 예: 40만~52만원)
근거: (한 문장, 30자 이내)

시세를 찾지 못하면 시세 줄에 "확인 불가"라고 써.`,
            },
          ],
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        }),
      });

      const data = await res.json();

      if (data.error) {
        setAiError("검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const text = (data.content || [])
        .map((b) => (b.type === "text" ? b.text : ""))
        .filter(Boolean)
        .join("\n");

      const pick = (key) => {
        const m = text.match(new RegExp(`${key}\\s*[:：]\\s*(.+)`));
        return m ? m[1].trim() : "";
      };

      const price = pick("시세");
      if (!price) {
        setAiError("시세를 찾지 못했어요. 부품명을 더 구체적으로 입력해 보세요.");
      } else if (price.includes("확인 불가")) {
        setAiError(`"${q}"의 중고 시세 정보를 웹에서 찾지 못했어요.`);
      } else {
        setAiResult({
          name: pick("이름") || q,
          price,
          range: pick("범위"),
          basis: pick("근거"),
        });
      }
    } catch (e) {
      setAiError("검색에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAiLoading(false);
    }
  }

  // 부품 검색: 공백·하이픈 무시, 여러 키워드 AND 조건
  const searchResults = useMemo(() => {
    const q = partQuery.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean).map((t) => t.replace(/[-\s]/g, ""));
    const scored = [];
    for (const p of allParts) {
      const hay = `${p.label} ${p.group} ${p.id}`.toLowerCase().replace(/[-\s]/g, "");
      if (!terms.every((t) => hay.includes(t))) continue;
      // 이름 앞부분에서 일치할수록 상위 노출
      const pos = p.label.toLowerCase().replace(/[-\s]/g, "").indexOf(terms[0]);
      scored.push({ part: p, score: pos === -1 ? 999 : pos });
    }
    scored.sort((a, b) => a.score - b.score || b.part.base - a.part.base);
    return scored.slice(0, 40).map((x) => x.part);
  }, [partQuery, allParts]);

  const result = useMemo(() => {
    const cpuObj = cpuMatch || cpuFallback;
    const gpuObj = gpuMatch || gpuFallback;
    const ramObj = RAM_OPTIONS.find((r) => r.id === ram);
    const storageObj = STORAGE_OPTIONS.find((s) => s.id === storage);
    const moboObj = MOBO_OPTIONS.find((m) => m.id === mobo);
    const psuObj = PSU_OPTIONS.find((p) => p.id === psu);
    const caseObj = CASE_OPTIONS.find((c) => c.id === pcCase);
    const ageFactor = AGE_OPTIONS.find((a) => a.id === age).factor;
    const condObj = CONDITION_OPTIONS.find((c) => c.id === condition);

    const mult = ageFactor * condObj.factor;

    const entries = [
      { label: "CPU", part: cpuObj },
      { label: "그래픽카드", part: gpuObj },
      { label: "RAM", part: ramObj },
      { label: "저장장치", part: storageObj },
      { label: "메인보드", part: moboObj },
      { label: "파워서플라이", part: psuObj },
      ...(includeCase ? [{ label: "케이스", part: caseObj }] : []),
    ];

    const perComponent = entries
      .map(({ label, part }) => {
        const eff = effectivePrice(part);
        return {
          label,
          name: part.label,
          value: eff.value * mult,
          newPrice: part.newPrice,
          sampleN: eff.n,
          reportN: eff.reportN,
          partId: part.id,
          basis: eff.basis,
          hasSold: !!part.soldPrice,
          verified: eff.verified,
        };
      })
      .filter((c) => c.value > 0);

    const rawTotal = entries.reduce((sum, e) => sum + effectivePrice(e.part).value, 0);
    const mid = rawTotal * mult;

    // 표본이 적을수록 범위를 넓게 잡아 불확실성을 반영
    const totalN = perComponent.reduce((s, c) => s + c.sampleN, 0);
    const avgN = perComponent.length ? totalN / perComponent.length : 0;
    const spread = avgN >= 20 ? 0.08 : avgN >= 8 ? 0.13 : 0.2;
    const low = mid * (1 - spread);
    const high = mid * (1 + spread);

    const curve = AGE_OPTIONS.map((a) => rawTotal * a.factor * condObj.factor);

    const newPriceTotal = perComponent.reduce((sum, c) => (c.newPrice ? sum + c.newPrice : sum), 0);
    const depreciationPct = newPriceTotal > 0 ? Math.round((1 - mid / newPriceTotal) * 100) : null;

    const totalReports = perComponent.reduce((s, c) => s + c.reportN, 0);
    const soldCoverage = perComponent.filter((c) => c.hasSold).length;

    return {
      low, mid, high, curve, condTone: condObj.tone, perComponent,
      newPriceTotal, depreciationPct, avgN, totalReports, soldCoverage,
      confidence: confidenceOf(avgN),
    };
  }, [cpuText, gpuText, ram, storage, mobo, psu, pcCase, includeCase, age, condition, userReports, priceBasis]);

  const maxCurve = Math.max(...result.curve, 1);

  return (
    <div style={styles.page} className="page-wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; -webkit-text-size-adjust: 100%; }
        input[type="range"] { -webkit-appearance: none; appearance: none; }
        .seg-btn:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid #2F6F4E; outline-offset: 2px; }

        /* iOS Safari에서 입력창 포커스 시 자동 확대되는 것 방지 (16px 미만이면 확대됨) */
        input, select, textarea { font-size: 16px !important; }

        /* 터치 대상 최소 크기 확보 */
        .seg-btn, .upload-btn, .refine-btn { min-height: 44px; touch-action: manipulation; }
        .suggest-item { min-height: 44px; display: flex; align-items: center; }

        /* 가로 스크롤 방지 */
        html, body { overflow-x: hidden; max-width: 100%; }

        /* 좁은 화면 대응 */
        @media (max-width: 600px) {
          .two-col { grid-template-columns: 1fr !important; }
          .comp-row { flex-wrap: wrap; gap: 4px; }
          .page-wrap { padding: 16px 12px 40px !important; }
          .card { padding: 16px !important; }
          .curve-tick { font-size: 8px !important; }
        }

        /* 넓은 화면에서는 2단 배치 */
        @media (min-width: 900px) {
          .main-grid { grid-template-columns: 1fr 1fr; align-items: start; }
          .full-span { grid-column: 1 / -1; }
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.eyebrow}>PROTOTYPE · 시세 산정 데모</div>
        <h1 style={styles.h1}>중고 컴퓨터, 지금 얼마가 적정가일까</h1>
        <p style={styles.sub}>사양과 상태를 입력하면 예상 거래 범위를 계산합니다.</p>
        <div style={styles.globalNotice}>
          ℹ️ 예상가는 당근·번개장터·중고나라 등 공개 매물 표본을 기반으로 한 추정치예요. 실제 거래가와 다를 수 있으니 참고용으로만 활용해 주세요.
          <br />
          🔄 시세 데이터 최종 업데이트: {DATA_UPDATED_AT} (매주 자동 갱신)
        </div>
      </header>

      <main style={styles.grid} className="main-grid">
        <section style={styles.formCard} className="card">
          <Field label="CPU">
            <div style={styles.autocompleteWrap}>
              <input
                style={styles.select}
                value={cpuText}
                onChange={(e) => setCpuText(e.target.value)}
                onFocus={() => setShowCpuSuggest(true)}
                onBlur={() => setTimeout(() => setShowCpuSuggest(false), 150)}
                placeholder="예: i5-13400, 라이젠 7 7700"
              />
              {showCpuSuggest && cpuSuggestions.length > 0 && (
                <div style={styles.suggestDropdown}>
                  {cpuSuggestions.map((o) => (
                    <div
                      key={o.id}
                      style={styles.suggestItem}
                      className="suggest-item"
                      onMouseDown={() => {
                        setCpuText(o.label);
                        setShowCpuSuggest(false);
                      }}
                    >
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="그래픽카드">
            <div style={styles.autocompleteWrap}>
              <input
                style={styles.select}
                value={gpuText}
                onChange={(e) => setGpuText(e.target.value)}
                onFocus={() => setShowGpuSuggest(true)}
                onBlur={() => setTimeout(() => setShowGpuSuggest(false), 150)}
                placeholder="예: RTX 4070, RTX 4060 Ti"
              />
              {showGpuSuggest && gpuSuggestions.length > 0 && (
                <div style={styles.suggestDropdown}>
                  {gpuSuggestions.map((o) => (
                    <div
                      key={o.id}
                      style={styles.suggestItem}
                      className="suggest-item"
                      onMouseDown={() => {
                        setGpuText(o.label);
                        setShowGpuSuggest(false);
                      }}
                    >
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {(cpuMatch === null && cpuText.trim()) || (gpuMatch === null && gpuText.trim()) ? (
            <div style={styles.aiMatchNotice}>
              🤖 목록에 없는 모델이에요. 실제 서비스에서는 AI가 모델명을 인식해 시세를 추정하고, 지금은 프로토타입이라 평균값으로 근사해서 보여드려요.
            </div>
          ) : null}

          <TwoCol>
            <Field label="RAM">
              <select style={styles.select} value={ram} onChange={(e) => setRam(e.target.value)}>
                {RAM_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="저장장치">
              <select style={styles.select} value={storage} onChange={(e) => setStorage(e.target.value)}>
                {STORAGE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Field>
          </TwoCol>

          <Field label="메인보드">
            <select style={styles.select} value={mobo} onChange={(e) => setMobo(e.target.value)}>
              {MOBO_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Field>

          <TwoCol>
            <Field label="파워서플라이">
              <select style={styles.select} value={psu} onChange={(e) => setPsu(e.target.value)}>
                {PSU_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="케이스">
              <select
                style={{ ...styles.select, opacity: includeCase ? 1 : 0.5 }}
                value={pcCase}
                onChange={(e) => setPcCase(e.target.value)}
                disabled={!includeCase}
              >
                {CASE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <label style={styles.caseToggleRow}>
                <input
                  type="checkbox"
                  checked={includeCase}
                  onChange={(e) => setIncludeCase(e.target.checked)}
                  style={styles.toggleCheckbox}
                />
                케이스 가격을 거래가에 포함
              </label>
            </Field>
          </TwoCol>

          <Field label="구입 후 경과">
            <SegmentGroup options={AGE_OPTIONS} value={age} onChange={setAge} />
          </Field>

          <Field label="상태">
            <SegmentGroup options={CONDITION_OPTIONS} value={condition} onChange={setCondition} />
          </Field>
        </section>

        <section style={styles.resultCard} className="card">
          <div style={styles.ticketLabel}>예상 거래가</div>
          <div style={styles.priceRow}>
            <span style={{ ...styles.priceMid, color: result.condTone }}>{formatWon(result.mid)}</span>
          </div>
          <div style={styles.rangeRow}>
            <span style={styles.rangeText}>{formatWon(result.low)} ~ {formatWon(result.high)}</span>
          </div>

          <div style={styles.basisRow}>
            {[
              { id: "listed", label: "판매중 호가" },
              { id: "sold", label: "판매완료가" },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setPriceBasis(b.id)}
                style={{
                  ...styles.basisBtn,
                  background: priceBasis === b.id ? "#2A3140" : "transparent",
                  color: priceBasis === b.id ? "#fff" : "#9AA6B8",
                  borderColor: priceBasis === b.id ? "#3E7A57" : "#2A3140",
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div style={styles.confidenceRow}>
            <span style={{ ...styles.confidenceBadge, color: result.confidence.tone, borderColor: result.confidence.tone }}>
              신뢰도 {result.confidence.label}
            </span>
            <span style={styles.sampleText}>
              부품당 평균 표본 {Math.round(result.avgN)}건
              {result.totalReports > 0 && ` · 내 제보 ${result.totalReports}건`}
            </span>
          </div>

          {priceBasis === "sold" && (
            <div style={styles.basisNote}>
              {result.soldCoverage > 0
                ? `${result.soldCoverage}개 부품만 판매완료 데이터가 있어요. 나머지는 판매중 호가로 계산됩니다.`
                : "선택한 부품에는 아직 판매완료 데이터가 없어요. 전부 판매중 호가 기준입니다."}
            </div>
          )}

          <label style={styles.toggleRow}>
            <input
              type="checkbox"
              checked={showNewPrice}
              onChange={(e) => setShowNewPrice(e.target.checked)}
              style={styles.toggleCheckbox}
            />
            새제품 가격 함께 보기
          </label>

          {showNewPrice && (
            <div style={styles.newPriceBox}>
              {result.newPriceTotal > 0 ? (
                <>
                  <div style={styles.newPriceRow}>
                    <span style={styles.newPriceLabel}>신제품 정가 합계</span>
                    <span style={styles.newPriceValue}>{formatWon(result.newPriceTotal)}</span>
                  </div>
                  <div style={styles.newPriceRow}>
                    <span style={styles.newPriceLabel}>감가율</span>
                    <span style={styles.newPriceValue}>{result.depreciationPct}%</span>
                  </div>
                  <div style={styles.newPriceWarning}>
                    ⚠ 신제품 가격은 실시간으로 변동될 수 있어요. 표시된 값은 참고용 기준가이며, 실제 최저가는 다나와·컴퓨존 등에서 별도로 확인해 주세요.
                  </div>
                </>
              ) : (
                <div style={styles.newPriceEmpty}>선택한 부품 중 신제품가 데이터가 없어요 (단종 등)</div>
              )}
            </div>
          )}

          <div style={styles.divider} />

          <div style={styles.curveLabel}>연차별 감가 추이</div>
          <div style={styles.curveWrap}>
            {result.curve.map((v, i) => (
              <div key={i} style={styles.curveCol}>
                <div
                  style={{
                    ...styles.curveBar,
                    height: `${Math.max((v / maxCurve) * 100, 4)}%`,
                    background: AGE_OPTIONS[i].id === age ? result.condTone : "#C7CEDA",
                  }}
                />
                <div style={styles.curveTick} className="curve-tick">{AGE_OPTIONS[i].label}</div>
              </div>
            ))}
          </div>

          {FEATURES.aiRefine && (
            <>
              <div style={styles.divider} />

              <div style={styles.curveLabel}>AI 실시간 보정</div>
              <p style={styles.refineDesc}>
                매주 갱신되는 기준값 사이에 시세가 급변했을 수 있어요. AI가 지금 시점 매물을 한 번 더 확인해요.
              </p>
              <button onClick={handleRefine} disabled={refineStatus === "loading"} style={styles.refineBtn} className="refine-btn">
                {refineStatus === "loading" ? "실시간 확인 중…" : "지금 시세 한 번 더 확인"}
              </button>

              {refineStatus === "done" && refineResult && (
                <div style={styles.refineBox}>
                  <div style={styles.aiBadge}>AI 실시간 보정 · 참고용</div>
                  <div style={styles.refineRow}>
                    <span style={styles.newPriceLabel}>보정된 예상가</span>
                    <span style={styles.newPriceValue}>{formatWon(refineResult.refinedEstimate)}</span>
                  </div>
                  <div style={styles.refineRow}>
                    <span style={styles.newPriceLabel}>기준값 대비</span>
                    <span
                      style={{
                        ...styles.newPriceValue,
                        color: refineResult.diffFromSite > 0 ? "#5EEAD4" : refineResult.diffFromSite < 0 ? "#F0A7A0" : "#fff",
                      }}
                    >
                      {refineResult.diffFromSite > 0 ? "+" : ""}
                      {formatWon(refineResult.diffFromSite)}
                    </span>
                  </div>
                  <div style={styles.refineRow}>
                    <span style={styles.newPriceLabel}>신뢰도</span>
                    <span style={styles.newPriceValue}>{refineResult.confidence}</span>
                  </div>
                  <div style={styles.refineNote}>{refineResult.note}</div>
                </div>
              )}
            </>
          )}

          <div style={styles.disclaimer}>
            ⚠ 예상가는 공개 매물 표본을 기반으로 한 추정치입니다. 실제 거래가는 상태·구성·지역에 따라
            달라지니 참고용으로만 활용해 주세요.
          </div>
        </section>

        <section style={styles.breakdownCard} className="card">
          <div style={styles.curveLabel}>부품별 예상가</div>
          {result.perComponent.map((c) => {
            const conf = confidenceOf(c.sampleN);
            return (
              <div key={c.label} style={styles.compRow} className="comp-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.compLabel}>{c.label}</div>
                  <div style={styles.compName}>{c.name}</div>
                  <div style={styles.sampleLine}>
                    {c.sampleN > 0 ? (
                      <>
                        <span style={{ color: conf.tone }}>●</span> {c.basis} 표본 {c.sampleN}건
                        {c.reportN > 0 && ` (제보 ${c.reportN}건 포함)`}
                      </>
                    ) : (
                      <span style={{ color: "#7C8798" }}>표본 정보 없음</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={styles.compValue}>{formatWon(c.value)}</div>
                  {showNewPrice && (
                    <div style={styles.compNewPrice}>
                      {c.newPrice ? `새제품 ${formatWon(c.newPrice)}` : "새제품가 없음"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section style={styles.searchCard} className="card full-span">
          <div style={styles.curveLabel}>부품 시세 검색</div>

          {FEATURES.aiSearch && (
            <div style={styles.searchTabRow}>
              {[
                { id: "local", label: "등록 시세" },
                { id: "ai", label: "AI 실시간 검색" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSearchMode(t.id)}
                  style={{
                    ...styles.searchTab,
                    background: searchMode === t.id ? "#2A3140" : "transparent",
                    color: searchMode === t.id ? "#fff" : "#9AA6B8",
                    borderColor: searchMode === t.id ? "#3E7A57" : "#2A3140",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {!FEATURES.aiSearch || searchMode === "local" ? (
            <>
              <div style={styles.searchHint}>
                등록된 {allParts.length}종 시세표에서 바로 찾아요. (예: 1660, i5, DDR4, B550)
              </div>
              <input
                type="text"
                value={partQuery}
                onChange={(e) => setPartQuery(e.target.value)}
                placeholder="부품명 검색"
                style={styles.searchInput}
              />

              {partQuery.trim() === "" ? (
                <div style={styles.searchEmpty}>
                  전체 {allParts.length}종의 시세가 등록돼 있어요.
                </div>
              ) : searchResults.length === 0 ? (
                <div style={styles.searchEmpty}>
                  "{partQuery}"에 해당하는 부품이 없어요.
                  {FEATURES.aiSearch && (
                    <>
                      <br />
                      <button
                        type="button"
                        style={styles.searchSwitchBtn}
                        onClick={() => {
                          setAiQuery(partQuery);
                          setSearchMode("ai");
                        }}
                      >
                        AI로 실시간 검색해보기 →
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div style={styles.searchCount}>{searchResults.length}종 찾음</div>
                  <div style={styles.searchList}>
                    {searchResults.map((p) => (
                      <div key={`${p.group}-${p.id}`} style={styles.searchRow}>
                        <div style={styles.searchRowMain}>
                          <span style={styles.searchCat}>{p.group}</span>
                          <span style={styles.searchLabel}>{p.label}</span>
                        </div>
                        <div style={styles.searchRowRight}>
                          <span style={styles.searchPrice}>{formatWon(p.base)}</span>
                          <span style={styles.searchMeta}>
                            {p.soldPrice ? `판매완료 ${formatWon(p.soldPrice)} · ` : ""}
                            표본 {p.n || 0}건
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={styles.searchHint}>
                시세표에 없는 부품도 AI가 웹을 검색해 현재 중고 시세를 찾아줘요. 결과는 검색된
                공개 정보 기반이라 실제 거래가와 다를 수 있어요.
              </div>
              <div style={styles.aiSearchRow}>
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !aiLoading) runAiSearch();
                  }}
                  placeholder="예: RTX 5070 Ti, 라이젠 7 7800X3D"
                  style={{ ...styles.searchInput, marginTop: 0, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={runAiSearch}
                  disabled={aiLoading || !aiQuery.trim()}
                  style={{
                    ...styles.aiSearchBtn,
                    opacity: aiLoading || !aiQuery.trim() ? 0.5 : 1,
                  }}
                >
                  {aiLoading ? "검색 중" : "검색"}
                </button>
              </div>

              {aiLoading && (
                <div style={styles.searchEmpty}>
                  웹에서 최근 매물을 찾는 중이에요. 10~20초 걸릴 수 있어요.
                </div>
              )}

              {aiError && <div style={styles.aiError}>{aiError}</div>}

              {aiResult && !aiLoading && (
                <div style={styles.aiResultBox}>
                  <div style={styles.aiResultName}>{aiResult.name}</div>
                  <div style={styles.aiResultPrice}>{aiResult.price}</div>
                  {aiResult.range && (
                    <div style={styles.aiResultRange}>거래 범위 {aiResult.range}</div>
                  )}
                  {aiResult.basis && (
                    <div style={styles.aiResultBasis}>{aiResult.basis}</div>
                  )}
                  <div style={styles.aiResultFooter}>
                    AI가 웹 검색으로 추정한 값이에요. 참고용으로만 활용해 주세요.
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section style={styles.reportCard} className="card">
          <div style={styles.reportHeaderRow}>
            <div>
              <div style={styles.curveLabel}>실거래가 제보</div>
              <div style={styles.reportSummary}>
                {totalReportCount > 0
                  ? `내가 제보한 ${totalReportCount}건이 시세에 반영 중`
                  : "직접 사고판 가격을 알려주시면 시세가 더 정확해져요"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReportOpen((v) => !v)}
              style={styles.reportToggleBtn}
              className="seg-btn"
            >
              {reportOpen ? "닫기" : "제보하기"}
            </button>
          </div>

          {reportOpen && (
            <div style={styles.reportBody}>
              <Field label="부품 선택">
                <select
                  style={styles.select}
                  value={reportPartId}
                  onChange={(e) => setReportPartId(e.target.value)}
                >
                  <option value="">부품을 선택하세요</option>
                  {["CPU", "그래픽카드", "RAM", "저장장치", "메인보드", "파워", "케이스"].map((g) => (
                    <optgroup key={g} label={g}>
                      {allParts.filter((p) => p.group === g).map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>

              <Field label="실제 거래 가격 (만원)">
                <input
                  type="number"
                  inputMode="decimal"
                  style={styles.select}
                  value={reportPrice}
                  onChange={(e) => {
                    setReportPrice(e.target.value);
                    setReportError(null);
                  }}
                  placeholder="예: 63"
                />
              </Field>

              <button
                type="button"
                onClick={submitReport}
                disabled={!reportPartId || !reportPrice}
                style={{
                  ...styles.uploadBtn,
                  width: "100%",
                  opacity: !reportPartId || !reportPrice ? 0.5 : 1,
                }}
                className="upload-btn"
              >
                등록하기
              </button>

              {reportError && <div style={styles.reportErrorBox}>{reportError}</div>}
              {reportDone && <div style={styles.reportDoneBox}>제보 감사합니다! 시세에 반영됐어요.</div>}

              <div style={styles.shotDisclaimer}>
                제보는 중간값으로 반영되고, 시세와 지나치게 동떨어진 값은 자동으로 걸러져요. 여러 건이 쌓일수록 영향력이 커집니다.
                지금은 이 브라우저에만 저장돼요.
              </div>
            </div>
          )}
        </section>

        {FEATURES.aiListingCheck && (
        <section style={styles.shotCard} className="card full-span">
          <div style={styles.curveLabel}>매물로 적정가 확인</div>
          <p style={styles.shotDesc}>
            판매글을 붙여넣거나 매물 스크린샷을 올리면, 부품별 시세와 비교해 적정가인지 알려드려요.
          </p>

          <div style={styles.tabRow}>
            {[
              { id: "text", label: "글 붙여넣기" },
              { id: "image", label: "스크린샷 올리기" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setInputMode(t.id)}
                style={{
                  ...styles.tabBtn,
                  background: inputMode === t.id ? "#131A24" : "#fff",
                  color: inputMode === t.id ? "#fff" : "#5A6474",
                  borderColor: inputMode === t.id ? "#131A24" : "#C7CEDA",
                }}
                className="seg-btn"
              >
                {t.label}
              </button>
            ))}
          </div>

          {inputMode === "text" ? (
            <>
              <textarea
                value={listingText}
                onChange={(e) => setListingText(e.target.value)}
                placeholder={"예)\n게이밍 컴퓨터 팝니다\ni5-13400F / RTX 4070 / 램 32GB / SSD 1TB\n메인보드 B760 / 파워 700W\n가격 90만원"}
                style={styles.textArea}
                rows={6}
              />
              <button
                type="button"
                onClick={handleTextAnalyze}
                disabled={shotStatus === "analyzing" || !listingText.trim()}
                style={{
                  ...styles.uploadBtn,
                  marginTop: 10,
                  width: "100%",
                  opacity: shotStatus === "analyzing" || !listingText.trim() ? 0.5 : 1,
                }}
                className="upload-btn"
              >
                {shotStatus === "analyzing" ? "분석 중…" : "시세 확인하기"}
              </button>
            </>
          ) : (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onPaste={handlePaste}
                tabIndex={0}
                style={{
                  ...styles.dropZone,
                  borderColor: isDragging ? "#2F6F4E" : "#C7CEDA",
                  background: isDragging ? "#E8F2EC" : "#FAFBFC",
                }}
              >
                <div style={styles.dropZoneText}>
                  이미지를 붙여넣기(Ctrl+V)하거나 끌어다 놓으세요
                </div>
                <label style={styles.uploadBtn} className="upload-btn">
                  {shotImage ? "다른 이미지 선택" : "사진 선택 / 촬영"}
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                </label>
              </div>

              {shotImage && (
                <div style={styles.previewRow}>
                  <img src={shotImage.url} alt={shotImage.name} style={styles.previewThumb} />
                  <div style={styles.previewName}>
                    {shotStatus === "analyzing" ? "이미지 분석 중…" : shotImage.name}
                  </div>
                </div>
              )}

              <div style={styles.shotDisclaimer}>
                앱 미리보기에서는 파일 접근이 막힐 수 있어요. 그럴 땐 위 탭에서 글 붙여넣기를 이용해 주세요.
              </div>
            </>
          )}

          {shotError && <div style={styles.shotErrorBox}>{shotError}</div>}

          {shotStatus === "done" && shotResult && (
            <div style={styles.verdictBox}>
              {shotResult.listedPrice ? (
                <>
                  <div style={styles.aiBadge}>AI 분석 결과 · 참고용</div>
                  <div style={styles.shotPrice}>판매가 {formatWon(shotResult.listedPrice)}</div>
                  <div
                    style={{
                      ...styles.shotVerdict,
                      color:
                        shotResult.verdict === "시세보다 저렴함"
                          ? "#2F6F4E"
                          : shotResult.verdict === "시세보다 비쌈"
                          ? "#B0402A"
                          : "#5A6474",
                    }}
                  >
                    {shotResult.verdict}
                    {shotResult.diffPct !== null && (
                      <> ({shotResult.diffPct > 0 ? "+" : ""}{shotResult.diffPct}%)</>
                    )}
                  </div>
                </>
              ) : (
                <div style={styles.shotVerdict}>글에서 판매가를 찾지 못했어요</div>
              )}
            </div>
          )}

          {shotStatus === "done" && shotResult && shotResult.componentBreakdown.length > 0 && (
            <div style={styles.shotBreakdownBox}>
              <div style={styles.shotBreakdownTitle}>부품별 중고 시세</div>
              {shotResult.componentBreakdown.map((c, i) => (
                <div key={i} style={styles.compRow} className="comp-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.compLabel}>{c.label}</div>
                    <div style={styles.compName}>
                      {c.name}
                      {c.source === "추정" ? (
                        <span style={styles.estimateTag}> 추정</span>
                      ) : (
                        <span style={styles.searchTag}> 시세표</span>
                      )}
                    </div>
                    {c.basis && <div style={styles.compBasis}>{c.basis}</div>}
                  </div>
                  <div style={styles.compValue}>{formatWon(c.value)}</div>
                </div>
              ))}
              <div style={styles.shotBreakdownTotal}>
                <span>부품별 합산 적정가</span>
                <span>{formatWon(shotResult.fairPrice)}</span>
              </div>
              {shotResult.note && <div style={styles.shotBreakdownNote}>{shotResult.note}</div>}
            </div>
          )}

          {shotStatus === "done" && shotResult && shotResult.componentBreakdown.length === 0 && (
            <div style={styles.shotBreakdownBox}>
              <div style={styles.shotBreakdownNote}>{shotResult.note || "부품 정보를 읽지 못했어요."}</div>
            </div>
          )}

          <div style={styles.shotDisclaimer}>
            ⚠ AI가 분석한 결과이며 실제 거래가와 다를 수 있어요. 참고용으로만 활용하시고, 거래 전 사양·상태를 직접 확인해 주세요.
          </div>
        </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function TwoCol({ children }) {
  return <div style={styles.twoCol} className="two-col">{children}</div>;
}

function SegmentGroup({ options, value, onChange }) {
  return (
    <div style={styles.segGroup}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            className="seg-btn"
            onClick={() => onChange(o.id)}
            style={{
              ...styles.segBtn,
              background: active ? (o.tone || "#131A24") : "#fff",
              color: active ? "#fff" : "#131A24",
              borderColor: active ? (o.tone || "#131A24") : "#C7CEDA",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#EEF1F5",
    fontFamily: "'Space Grotesk', sans-serif",
    color: "#131A24",
    padding: "28px 16px 56px",
  },
  header: { maxWidth: 880, margin: "0 auto 24px" },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.08em",
    color: "#2F6F4E",
    marginBottom: 10,
    fontWeight: 500,
  },
  h1: { fontSize: "clamp(24px, 4.5vw, 34px)", fontWeight: 700, margin: "0 0 8px", lineHeight: 1.25 },
  sub: { fontSize: 15, color: "#4B5566", margin: "0 0 14px" },
  globalNotice: {
    fontSize: 12.5,
    color: "#4B5566",
    background: "#E4E9F0",
    border: "1px solid #C7CEDA",
    borderRadius: 8,
    padding: "10px 12px",
    lineHeight: 1.5,
  },
  grid: {
    maxWidth: 880,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  formCard: {
    background: "#fff",
    border: "1px solid #D7DCE4",
    borderRadius: 14,
    padding: 20,
  },
  field: { marginBottom: 16 },
  caseToggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    fontSize: 11.5,
    color: "#5A6474",
    cursor: "pointer",
  },
  fieldLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.06em",
    color: "#5A6474",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #C7CEDA",
    background: "#fff",
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    color: "#131A24",
  },
  autocompleteWrap: { position: "relative" },
  suggestDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #C7CEDA",
    borderRadius: 8,
    boxShadow: "0 8px 20px rgba(19,26,36,0.12)",
    zIndex: 10,
    maxHeight: 220,
    overflowY: "auto",
  },
  suggestItem: {
    padding: "10px 12px",
    fontSize: 13.5,
    color: "#131A24",
    cursor: "pointer",
    borderBottom: "1px solid #EEF1F5",
  },
  aiMatchNotice: {
    fontSize: 11.5,
    color: "#5A6474",
    background: "#E4E9F0",
    border: "1px solid #C7CEDA",
    borderRadius: 8,
    padding: "8px 10px",
    lineHeight: 1.5,
    marginBottom: 16,
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  segGroup: { display: "flex", flexWrap: "wrap", gap: 8 },
  segBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: "pointer",
    fontWeight: 500,
  },
  resultCard: {
    background: "#131A24",
    color: "#fff",
    borderRadius: 14,
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  ticketLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.08em",
    color: "#9AA6B8",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  priceRow: { display: "flex", alignItems: "baseline", gap: 8 },
  priceMid: { fontSize: "clamp(30px, 6vw, 42px)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  rangeRow: { marginTop: 4 },
  rangeText: { fontSize: 13, color: "#9AA6B8", fontFamily: "'JetBrains Mono', monospace" },
  confidenceRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  basisRow: { display: "flex", gap: 6, marginTop: 12 },
  basisBtn: {
    flex: 1,
    padding: "7px 10px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: 11.5,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
  },
  basisNote: {
    marginTop: 8,
    fontSize: 11,
    color: "#9AA6B8",
    lineHeight: 1.5,
    background: "#1B2230",
    borderRadius: 6,
    padding: "8px 10px",
  },
  confidenceBadge: {
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    border: "1px solid",
    borderRadius: 4,
    padding: "2px 7px",
    background: "rgba(255,255,255,0.06)",
  },
  sampleText: { fontSize: 11, color: "#7A8494", fontFamily: "'JetBrains Mono', monospace" },
  sampleLine: {
    fontSize: 10.5,
    color: "#8A93A3",
    marginTop: 3,
    fontFamily: "'JetBrains Mono', monospace",
  },
  searchCard: {
    background: "#141A24",
    borderRadius: 10,
    padding: 18,
    border: "1px solid #222A38",
  },
  searchTabRow: { display: "flex", gap: 6, marginTop: 10, marginBottom: 4 },
  searchTab: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: 11.5,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
  },
  searchSwitchBtn: {
    marginTop: 8,
    background: "transparent",
    border: "none",
    color: "#7FB98F",
    fontSize: 11.5,
    cursor: "pointer",
    textDecoration: "underline",
    fontFamily: "'JetBrains Mono', monospace",
  },
  aiSearchRow: { display: "flex", gap: 6, marginTop: 10, alignItems: "stretch" },
  aiSearchBtn: {
    padding: "0 16px",
    borderRadius: 6,
    border: "1px solid #3E7A57",
    background: "#2F6F4E",
    color: "#fff",
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
    whiteSpace: "nowrap",
    minHeight: 44,
  },
  aiError: {
    marginTop: 12,
    fontSize: 11.5,
    color: "#C4664F",
    background: "#1F1714",
    borderRadius: 6,
    padding: "10px 12px",
    lineHeight: 1.5,
  },
  aiResultBox: {
    marginTop: 12,
    background: "#0F141C",
    border: "1px solid #2A3140",
    borderRadius: 8,
    padding: 16,
  },
  aiResultName: { fontSize: 12, color: "#9AA6B8" },
  aiResultPrice: {
    fontSize: 26,
    color: "#7FB98F",
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 4,
  },
  aiResultRange: { fontSize: 12, color: "#C7D0DC", marginTop: 6 },
  aiResultBasis: { fontSize: 11.5, color: "#9AA6B8", marginTop: 8, lineHeight: 1.5 },
  aiResultFooter: {
    fontSize: 10.5,
    color: "#7C8798",
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid #1C2331",
  },
  searchHint: { fontSize: 11.5, color: "#9AA6B8", marginTop: 4, lineHeight: 1.5 },
  searchInput: {
    width: "100%",
    marginTop: 10,
    padding: "11px 12px",
    borderRadius: 6,
    border: "1px solid #2A3140",
    background: "#0F141C",
    color: "#E6EAF0",
    fontSize: 16,
    fontFamily: "'JetBrains Mono', monospace",
    boxSizing: "border-box",
  },
  searchEmpty: {
    marginTop: 12,
    fontSize: 12,
    color: "#7C8798",
    textAlign: "center",
    padding: "14px 0",
  },
  searchCount: { marginTop: 12, fontSize: 11, color: "#7C8798" },
  searchList: {
    marginTop: 6,
    maxHeight: 340,
    overflowY: "auto",
    border: "1px solid #222A38",
    borderRadius: 6,
  },
  searchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderBottom: "1px solid #1C2331",
    flexWrap: "wrap",
  },
  searchRowMain: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  searchCat: {
    fontSize: 10,
    color: "#9AA6B8",
    background: "#1B2230",
    borderRadius: 4,
    padding: "2px 6px",
    whiteSpace: "nowrap",
  },
  searchLabel: { fontSize: 12.5, color: "#E6EAF0" },
  searchRowRight: { textAlign: "right", marginLeft: "auto" },
  searchPrice: {
    display: "block",
    fontSize: 13,
    color: "#7FB98F",
    fontFamily: "'JetBrains Mono', monospace",
  },
  searchMeta: { display: "block", fontSize: 10.5, color: "#7C8798", marginTop: 2 },
  reportCard: {
    background: "#fff",
    border: "1px solid #D7DCE4",
    borderRadius: 14,
    padding: 20,
  },
  reportHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  reportSummary: { fontSize: 12.5, color: "#5A6474", marginTop: 4, lineHeight: 1.4 },
  reportToggleBtn: {
    flexShrink: 0,
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid #131A24",
    background: "#fff",
    color: "#131A24",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
  },
  reportBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #EEF1F5",
  },
  reportErrorBox: {
    marginTop: 12,
    padding: "10px 12px",
    background: "#FBEAE7",
    border: "1px solid #E8C4BD",
    borderRadius: 8,
    fontSize: 12,
    color: "#B0402A",
    lineHeight: 1.5,
  },
  reportDoneBox: {
    marginTop: 12,
    padding: "10px 12px",
    background: "#DCEDE3",
    border: "1px solid #A9CDBA",
    borderRadius: 8,
    fontSize: 12.5,
    color: "#2F6F4E",
  },
  divider: { height: 1, background: "#2A3140", margin: "20px 0 16px" },
  curveLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.06em",
    color: "#9AA6B8",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  curveWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    height: 90,
  },
  curveCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" },
  curveBar: { width: "100%", borderRadius: "3px 3px 0 0", transition: "height 0.2s ease" },
  curveTick: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7A8494", marginTop: 6, textAlign: "center" },
  refineDesc: { fontSize: 12, color: "#9AA6B8", lineHeight: 1.5, margin: "0 0 10px" },
  refineBtn: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #3E7A57",
    background: "#1B2230",
    color: "#7FD9B0",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
  },
  refineBox: {
    marginTop: 12,
    background: "#1B2230",
    borderRadius: 8,
    padding: "10px 12px",
  },
  refineRow: { display: "flex", justifyContent: "space-between", padding: "3px 0" },
  refineNote: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px dashed #2A3140",
    fontSize: 11,
    color: "#9AA6B8",
    lineHeight: 1.5,
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 11,
    color: "#7A8494",
    lineHeight: 1.5,
    borderTop: "1px dashed #2A3140",
    paddingTop: 12,
  },
  breakdownCard: {
    background: "#fff",
    border: "1px solid #D7DCE4",
    borderRadius: 14,
    padding: 20,
  },
  compRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #EEF1F5",
  },
  compLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.05em",
    color: "#5A6474",
    textTransform: "uppercase",
  },
  compName: { fontSize: 13, marginTop: 2, color: "#131A24" },
  compValue: { fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600 },
  compNewPrice: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8A93A3", marginTop: 2 },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    fontSize: 12,
    color: "#C7CEDA",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
  },
  toggleCheckbox: { width: 14, height: 14, cursor: "pointer" },
  newPriceBox: {
    marginTop: 10,
    background: "#1B2230",
    borderRadius: 8,
    padding: "10px 12px",
  },
  newPriceRow: { display: "flex", justifyContent: "space-between", padding: "3px 0" },
  newPriceLabel: { fontSize: 12, color: "#9AA6B8", fontFamily: "'JetBrains Mono', monospace" },
  newPriceValue: { fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" },
  newPriceEmpty: { fontSize: 12, color: "#7A8494" },
  newPriceWarning: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px dashed #2A3140",
    fontSize: 10.5,
    color: "#8A93A3",
    lineHeight: 1.5,
  },
  shotCard: {
    background: "#fff",
    border: "1px solid #D7DCE4",
    borderRadius: 14,
    padding: 20,
  },
  shotDesc: { fontSize: 13, color: "#5A6474", lineHeight: 1.5, margin: "0 0 14px" },
  tabRow: { display: "flex", gap: 8, marginBottom: 14 },
  tabBtn: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
  },
  dropZone: {
    border: "1.5px dashed #C7CEDA",
    borderRadius: 10,
    padding: "24px 16px",
    textAlign: "center",
    transition: "background 0.15s ease, border-color 0.15s ease",
    outline: "none",
  },
  dropZoneText: { fontSize: 12.5, color: "#5A6474", marginBottom: 12, lineHeight: 1.5 },
  previewRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 10,
    background: "#EEF1F5",
    borderRadius: 8,
  },
  previewThumb: {
    width: 56,
    height: 56,
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #D7DCE4",
  },
  previewName: { fontSize: 12.5, color: "#5A6474", flex: 1, minWidth: 0, wordBreak: "break-all" },
  textArea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #C7CEDA",
    background: "#fff",
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    color: "#131A24",
    resize: "vertical",
    lineHeight: 1.5,
  },
  uploadBtn: {
    display: "inline-block",
    padding: "12px 20px",
    borderRadius: 8,
    border: "1px solid #131A24",
    background: "#131A24",
    color: "#fff",
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
    WebkitAppearance: "none",
    appearance: "none",
  },
  shotAnalyzing: { fontSize: 13, color: "#5A6474", fontFamily: "'JetBrains Mono', monospace" },
  aiBadge: {
    display: "inline-block",
    fontSize: 9.5,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.04em",
    color: "#5A6474",
    background: "#E4E9F0",
    border: "1px solid #C7CEDA",
    borderRadius: 4,
    padding: "2px 6px",
    marginBottom: 6,
  },
  shotPrice: { fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  shotVerdict: { fontSize: 13, fontWeight: 600, marginTop: 4 },
  shotDisclaimer: { marginTop: 14, fontSize: 11, color: "#8A93A3", lineHeight: 1.5 },
  shotBreakdownBox: {
    marginTop: 14,
    background: "#EEF1F5",
    borderRadius: 10,
    padding: "12px 14px",
  },
  shotBreakdownTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10.5,
    letterSpacing: "0.05em",
    color: "#5A6474",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  shotBreakdownTotal: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #D7DCE4",
    fontSize: 13.5,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: "#131A24",
  },
  shotBreakdownNote: { marginTop: 8, fontSize: 10.5, color: "#8A93A3", lineHeight: 1.5 },
  verdictBox: {
    marginTop: 16,
    padding: "14px 16px",
    background: "#EEF1F5",
    borderRadius: 10,
  },
  shotErrorBox: {
    marginTop: 14,
    padding: "10px 12px",
    background: "#FBEAE7",
    border: "1px solid #E8C4BD",
    borderRadius: 8,
    fontSize: 12.5,
    color: "#B0402A",
    lineHeight: 1.5,
  },
  estimateTag: {
    fontSize: 10,
    color: "#8A6D1F",
    background: "#F5EDD6",
    borderRadius: 4,
    padding: "1px 5px",
    marginLeft: 5,
  },
  searchTag: {
    fontSize: 10,
    color: "#2F6F4E",
    background: "#DCEDE3",
    borderRadius: 4,
    padding: "1px 5px",
    marginLeft: 5,
  },
  compBasis: {
    fontSize: 10.5,
    color: "#8A93A3",
    marginTop: 3,
    lineHeight: 1.4,
  },
};
