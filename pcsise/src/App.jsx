import React, { useState, useMemo, useEffect } from "react";

// 출처: 본치마크(computer.downingmoon.dev) — 당근/번개장터/중고나라 등 공개 매물의 최근 90일 표본.
// GPU 일부는 2026-08-18 갱신값으로 실측 확인.
// 그 외 부품의 표본 수(n)는 미검증 추정치이므로 실서비스 전 재조사 필요.
const DATA_UPDATED_AT = "2026-08-22";

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
// 2026-08-19~20 기준 수집. base = 실제 P2P 매물 중간값(만원).
const DATA_SOURCE_NOTE = "중고나라 판매중 호가 + 당근마켓 거래완료가 혼합 (부품별로 출처 다름)";

const CPUS = [
  // 인텔 (표본 3~16건 기준)
  { id: "i5-12400f", label: "인텔 i5-12400F", base: 16.25, n: 8 },
  // ── 인텔 코어 Ultra 200S 플러스 (2026-03-26 출시, 아직 중고매물 없음·추정치) ──
  { id: "ultra7-270k-plus", label: "인텔 코어 Ultra 7 270K 플러스", base: 35 },
  { id: "ultra5-250k-plus", label: "인텔 코어 Ultra 5 250K 플러스", base: 27 },
  { id: "ultra5-250kf-plus", label: "인텔 코어 Ultra 5 250KF 플러스", base: 25 },
  // ── 인텔 14세대 ──
  { id: "i9-14900kf", label: "인텔 i9-14900KF", base: 55 },
  { id: "i7-14700k", label: "인텔 i7-14700K", base: 40 },
  { id: "i7-14700kf", label: "인텔 i7-14700KF", base: 38 },
  { id: "i7-14700f", label: "인텔 i7-14700F", base: 32 },
  { id: "i5-14600kf", label: "인텔 i5-14600KF", base: 24 },
  { id: "i5-14500", label: "인텔 i5-14500", base: 21 },
  { id: "i5-14400", label: "인텔 i5-14400", base: 18 },
  { id: "i5-14400f", label: "인텔 i5-14400F", base: 17 },
  { id: "i3-14100f", label: "인텔 i3-14100F", base: 10 },
  // ── 인텔 13세대 ──
  { id: "i9-13900k", label: "인텔 i9-13900K", base: 45 },
  { id: "i9-13900kf", label: "인텔 i9-13900KF", base: 43 },
  { id: "i7-13700k", label: "인텔 i7-13700K", base: 33 },
  { id: "i7-13700f", label: "인텔 i7-13700F", base: 27 },
  { id: "i5-13600kf", label: "인텔 i5-13600KF", base: 21 },
  { id: "i5-13500", label: "인텔 i5-13500", base: 18 },
  { id: "i5-13490f", label: "인텔 i5-13490F", base: 16 },
  { id: "i3-13100f", label: "인텔 i3-13100F", base: 9 },
  // ── 인텔 12세대 ──
  { id: "i9-12900k", label: "인텔 i9-12900K", base: 26 },
  { id: "i7-12700k", label: "인텔 i7-12700K", base: 20 },
  { id: "i7-12700kf", label: "인텔 i7-12700KF", base: 19 },
  { id: "i7-12700", label: "인텔 i7-12700", base: 18 },
  { id: "i5-12600kf", label: "인텔 i5-12600KF", base: 15 },
  { id: "i5-12500", label: "인텔 i5-12500", base: 13 },
  { id: "i5-12400", label: "인텔 i5-12400", base: 13 },
  { id: "i3-12100f", label: "인텔 i3-12100F", base: 7.5 },
  // ── 인텔 10~11세대 ──
  { id: "i9-11900k", label: "인텔 i9-11900K", base: 16 },
  { id: "i7-11700k", label: "인텔 i7-11700K", base: 13 },
  { id: "i7-11700", label: "인텔 i7-11700", base: 11 },
  { id: "i5-11600k", label: "인텔 i5-11600K", base: 9 },
  { id: "i5-11400", label: "인텔 i5-11400", base: 8.5 },
  { id: "i7-10700k", label: "인텔 i7-10700K", base: 12 },
  { id: "i7-10700", label: "인텔 i7-10700", base: 10 },
  { id: "i5-10600k", label: "인텔 i5-10600K", base: 8 },
  { id: "i5-10400", label: "인텔 i5-10400", base: 7 },
  { id: "i3-10100f", label: "인텔 i3-10100F", base: 4.5 },
  // ── 인텔 6~9세대 ──
  { id: "i9-9900k", label: "인텔 i9-9900K", base: 9 },
  { id: "i7-9700k", label: "인텔 i7-9700K", base: 7.5 },
  { id: "i7-9700f", label: "인텔 i7-9700F", base: 6.5 },
  { id: "i5-9600k", label: "인텔 i5-9600K", base: 5.5 },
  { id: "i5-9400f", label: "인텔 i5-9400F", base: 4.5 },
  { id: "i7-8700k", label: "인텔 i7-8700K", base: 7 },
  { id: "i5-8500", label: "인텔 i5-8500", base: 4 },
  { id: "i7-7700", label: "인텔 i7-7700", base: 4.5 },
  { id: "i7-6700", label: "인텔 i7-6700", base: 4 },
  { id: "i5-4590", label: "인텔 i5-4590", base: 1.5 },
  { id: "i7-4790k", label: "인텔 i7-4790K", base: 3.5 },
  // ── 라이젠 9000 / 7000 ──
  { id: "r9-9950x", label: "라이젠 9 9950X", base: 68 },
  { id: "r9-9900x3d", label: "라이젠 9 9900X3D", base: 62 },
  { id: "r9-9950x3d", label: "라이젠 9 9950X3D", base: 88 },
  { id: "r5-9600", label: "라이젠 5 9600", base: 25 },
  { id: "r7-9700x", label: "라이젠 7 9700X", base: 38 },
  { id: "r9-7950x", label: "라이젠 9 7950X", base: 48 },
  { id: "r9-7950x3d", label: "라이젠 9 7950X3D", base: 60 },
  { id: "r9-7900", label: "라이젠 9 7900", base: 35 },
  { id: "r7-7700", label: "라이젠 7 7700", base: 28 },
  { id: "r5-7600x", label: "라이젠 5 7600X", base: 18 },
  // ── 라이젠 5000 / 3000 ──
  { id: "r9-5950x", label: "라이젠 9 5950X", base: 30 },
  { id: "r9-5900x", label: "라이젠 9 5900X", base: 22 },
  { id: "r7-5800x", label: "라이젠 7 5800X", base: 15 },
  { id: "r7-5700g", label: "라이젠 7 5700G", base: 14 },
  { id: "r5-5600g", label: "라이젠 5 5600G", base: 9 },
  { id: "r5-5500", label: "라이젠 5 5500", base: 6.5 },
  { id: "r5-4650g", label: "라이젠 5 4650G", base: 7 },
  { id: "r9-3900x", label: "라이젠 9 3900X", base: 13 },
  { id: "r7-3700x", label: "라이젠 7 3700X", base: 9 },
  { id: "r5-3600x", label: "라이젠 5 3600X", base: 6 },
  { id: "r5-1600", label: "라이젠 5 1600", base: 3 },
  { id: "i5-13400", label: "인텔 i5-13400", base: 24, n: 6 },
  { id: "i5-13400f", label: "인텔 i5-13400F", base: 19.5, n: 16 },
  { id: "i5-12600k", label: "인텔 i5-12600K", base: 26, n: 8 },
  { id: "i5-13600k", label: "인텔 i5-13600K", base: 26, n: 11 },
  { id: "i5-14600k", label: "인텔 i5-14600K", base: 32.5, n: 9 },
  { id: "i7-13700kf", label: "인텔 i7-13700KF", base: 35, n: 7 },
  { id: "i7-8700", label: "인텔 i7-8700", base: 11, n: 12 },
  { id: "i9-14900k", label: "인텔 i9-14900K", base: 69, n: 6 },
  { id: "i9-10900k", label: "인텔 i9-10900K", base: 32, n: 5 },
  { id: "i5-10400f", label: "인텔 i5-10400F", base: 11.5, n: 18 },
  { id: "i5-11400f", label: "인텔 i5-11400F", base: 12, n: 13 },
  { id: "i5-8400", label: "인텔 i5-8400", base: 5, n: 9 },
  { id: "i5-7500", label: "인텔 i5-7500", base: 4, n: 7 },
  { id: "i5-6500", label: "인텔 i5-6500", base: 2.7, n: 11 },
  { id: "i3-9100f", label: "인텔 i3-9100F", base: 3.1, n: 8 },
  // AMD (표본 3~16건 기준)
  { id: "r5-5600", label: "라이젠 5 5600", base: 15.5, n: 15 },
  { id: "r5-5600x", label: "라이젠 5 5600X", base: 15.5, n: 4 },
  { id: "r5-7500f", label: "라이젠 5 7500F", base: 13, n: 6 },
  { id: "r5-7600", label: "라이젠 5 7600", base: 13, n: 11 },
  { id: "r5-9600x", label: "라이젠 5 9600X", base: 22.8, n: 5 },
  { id: "r7-5700x", label: "라이젠 7 5700X", base: 27, n: 11 },
  { id: "r7-5700x3d", label: "라이젠 7 5700X3D", base: 36, n: 8 },
  { id: "r7-5800x3d", label: "라이젠 7 5800X3D", base: 42.5, n: 13 },
  { id: "r7-7700x", label: "라이젠 7 7700X", base: 20, n: 6 },
  { id: "r7-7700x3d", label: "라이젠 7 7700X3D", base: 38 },
  { id: "r7-7800x3d", label: "라이젠 7 7800X3D", base: 39.5, n: 16 },
  { id: "r7-9800x3d", label: "라이젠 7 9800X3D", base: 57.5, n: 9 },
  { id: "r9-7900x", label: "라이젠 9 7900X", base: 28, n: 5 },
  { id: "r9-9900x", label: "라이젠 9 9900X", base: 48, n: 4 },
  { id: "r5-3600", label: "라이젠 5 3600", base: 6.5, n: 14 },
  { id: "r5-2600", label: "라이젠 5 2600", base: 3.5, n: 10 },
];

const GPUS = [
  { id: "none", label: "없음 (내장그래픽)", base: 0 },
  // NVIDIA RTX 50 시리즈
  { id: "rtx5090", label: "RTX 5090", base: 659, n: 7 },
  // ── 엔비디아 40 시리즈 추가 ──
  { id: "rtx4090d", label: "RTX 4090 D", base: 231 },
  { id: "rtx4050", label: "RTX 4050 6GB", base: 29 },
  // ── 엔비디아 30 시리즈 추가 ──
  { id: "rtx3080ti-12", label: "RTX 3080 Ti 12GB", base: 58 },
  { id: "rtx3060ti-g6x", label: "RTX 3060 Ti GDDR6X", base: 32 },
  { id: "rtx3050-6", label: "RTX 3050 6GB", base: 14 },
  // ── 엔비디아 20 / 16 시리즈 추가 ──
  { id: "rtx2070-nonsuper", label: "RTX 2070 8GB", base: 19 },
  { id: "gtx1630", label: "GTX 1630 4GB", base: 7 },
  { id: "gtx1650-gddr6", label: "GTX 1650 GDDR6", base: 12 },
  // ── 엔비디아 구형 ──
  { id: "gtx1050-2", label: "GTX 1050 2GB", base: 3, n: 1 },
  { id: "gtx960", label: "GTX 960", base: 4 },
  { id: "gtx950", label: "GTX 950", base: 3 },
  { id: "gtx750ti", label: "GTX 750 Ti", base: 2, n: 1 },
  { id: "gt730", label: "GT 730", base: 1.6 },
  { id: "gt710", label: "GT 710", base: 1.3 },
  { id: "gt1030-ddr4", label: "GT 1030 DDR4", base: 4 },
  // ── AMD RX 9000 / 7000 추가 ──
  { id: "rx9060xt-8", label: "RX 9060 XT 8GB", base: 40 },
  { id: "rx7800xt", label: "RX 7800 XT", base: 55 },
  { id: "rx7700xt", label: "RX 7700 XT", base: 42 },
  { id: "rx7600xt", label: "RX 7600 XT 16GB", base: 34 },
  { id: "rx7600", label: "RX 7600", base: 26 },
  // ── AMD RX 6000 추가 ──
  { id: "rx6950xt", label: "RX 6950 XT", base: 50 },
  { id: "rx6750xt", label: "RX 6750 XT", base: 29 },
  { id: "rx6700", label: "RX 6700 10GB", base: 23 },
  { id: "rx6650xt", label: "RX 6650 XT", base: 19 },
  { id: "rx6600xt", label: "RX 6600 XT", base: 17 },
  { id: "rx6500xt", label: "RX 6500 XT", base: 9 },
  { id: "rx6400", label: "RX 6400", base: 7 },
  // ── AMD 구형 ──
  { id: "rx5700xt", label: "RX 5700 XT", base: 14 },
  { id: "rx5700", label: "RX 5700", base: 12 },
  { id: "rx5600xt", label: "RX 5600 XT", base: 9 },
  { id: "rx5500xt", label: "RX 5500 XT 8GB", base: 7 },
  { id: "rxvega56", label: "RX Vega 56", base: 7 },
  { id: "rx580-4", label: "RX 580 4GB", base: 3, n: 1 },
  { id: "rx480", label: "RX 480 8GB", base: 4.7 },
  { id: "rx470", label: "RX 470 4GB", base: 3 },
  { id: "rx560", label: "RX 560 4GB", base: 2.6 },
  { id: "rx550", label: "RX 550 4GB", base: 2.6 },
  // ── 인텔 Arc ──
  { id: "arc-b570", label: "Arc B570 10GB", base: 23 },
  { id: "arc-a770", label: "Arc A770 16GB", base: 25 },
  { id: "arc-a750", label: "Arc A750 8GB", base: 19 },
  { id: "arc-a380", label: "Arc A380 6GB", base: 9 },
  { id: "rtx5080", label: "RTX 5080", base: 228, n: 11 },
  { id: "rtx5070ti", label: "RTX 5070 Ti", base: 132, n: 11 },
  { id: "rtx5070", label: "RTX 5070", base: 86, n: 4 },
  { id: "rtx5060ti-16", label: "RTX 5060 Ti 16GB", base: 78, n: 7 },
  { id: "rtx5060ti-8", label: "RTX 5060 Ti 8GB", base: 68, n: 8 },
  { id: "rtx5060", label: "RTX 5060", base: 55, n: 10 },
  { id: "rtx5050", label: "RTX 5050 8GB", base: 24 },
  // NVIDIA RTX 40 시리즈
  { id: "rtx4090", label: "RTX 4090", base: 375, n: 4 },
  { id: "rtx4080super", label: "RTX 4080 Super", base: 146, n: 10 },
  { id: "rtx4080", label: "RTX 4080", base: 115, n: 1 },
  { id: "rtx4070ti-super", label: "RTX 4070 Ti Super", base: 95, n: 5 },
  { id: "rtx4070ti", label: "RTX 4070 Ti", base: 78, n: 18 },
  { id: "rtx4070super", label: "RTX 4070 Super", base: 67.5, n: 4 },
  { id: "rtx4070", label: "RTX 4070", base: 63, n: 5, verified: true },
  { id: "rtx4060ti-16", label: "RTX 4060 Ti 16GB", base: 55, n: 5 },
  { id: "rtx4060ti-8", label: "RTX 4060 Ti 8GB", base: 44.5, n: 10 },
  { id: "rtx4060", label: "RTX 4060", base: 38, n: 1 },
  // NVIDIA RTX 30 시리즈
  { id: "rtx3090ti", label: "RTX 3090 Ti", base: 158, n: 3 },
  { id: "rtx3090", label: "RTX 3090", base: 139, n: 5 },
  { id: "rtx3080ti", label: "RTX 3080 Ti", base: 64, n: 4 },
  { id: "rtx3080-12", label: "RTX 3080 12GB", base: 49.5, n: 6 },
  { id: "rtx3080-10", label: "RTX 3080 10GB", base: 44, n: 12 },
  { id: "rtx3070ti", label: "RTX 3070 Ti", base: 38, n: 9 },
  { id: "rtx3070", label: "RTX 3070", base: 30, n: 1 },
  { id: "rtx3060ti", label: "RTX 3060 Ti", base: 31.9, n: 28 },
  { id: "rtx3060-12", label: "RTX 3060 12GB", base: 22, n: 1 },
  { id: "rtx3060-8", label: "RTX 3060 8GB", base: 32.1, n: 8 },
  { id: "rtx3050-8", label: "RTX 3050 8GB", base: 22, n: 14 },
  // NVIDIA RTX 20 시리즈
  { id: "rtx2080ti", label: "RTX 2080 Ti", base: 34.1, n: 6 },
  { id: "rtx2080super", label: "RTX 2080 Super", base: 28, n: 4 },
  { id: "rtx2080", label: "RTX 2080", base: 26.8, n: 5 },
  { id: "rtx2070super", label: "RTX 2070 Super", base: 24.6, n: 8 },
  { id: "rtx2070", label: "RTX 2070", base: 21, n: 7 },
  { id: "rtx2060super", label: "RTX 2060 Super", base: 21.3, n: 11 },
  { id: "rtx2060", label: "RTX 2060", base: 15, n: 2, verified: true },
  // NVIDIA GTX
  { id: "gtx1080ti", label: "GTX 1080 Ti", base: 20, n: 14, verified: true },
  { id: "gtx1080", label: "GTX 1080", base: 12, n: 1, verified: true },
  { id: "gtx1070ti", label: "GTX 1070 Ti", base: 15, n: 8, verified: true },
  { id: "gtx1070", label: "GTX 1070", base: 9, n: 1, verified: true },
  { id: "gtx1660super", label: "GTX 1660 Super", base: 14.9, n: 24, verified: true },
  { id: "gtx1660ti", label: "GTX 1660 Ti", base: 14.8, n: 14, verified: true },
  { id: "gtx1660", label: "GTX 1660", base: 14.2, n: 13, verified: true },
  { id: "gtx1650super", label: "GTX 1650 Super", base: 12.4, n: 6, verified: true },
  { id: "gtx1650", label: "GTX 1650", base: 10, n: 26, verified: true },
  { id: "gtx1060-6", label: "GTX 1060 6GB", base: 7.75, n: 2, verified: true },
  { id: "gtx1060-3", label: "GTX 1060 3GB", base: 4.5, n: 3, verified: true },
  { id: "gtx1050ti", label: "GTX 1050 Ti", base: 8, n: 27, verified: true },
  { id: "gtx1050", label: "GTX 1050", base: 6, n: 13, verified: true },
  { id: "gtx980", label: "GTX 980", base: 8.9, n: 11, verified: true },
  { id: "gtx970", label: "GTX 970", base: 6.9, n: 12, verified: true },
  { id: "gt1030", label: "GT 1030", base: 7.7, n: 4, verified: true },
  // AMD Radeon
  { id: "rx9070xt", label: "RX 9070 XT", base: 105, n: 8 },
  { id: "rx9070", label: "RX 9070", base: 84, n: 6 },
  { id: "rx9060xt-16", label: "RX 9060 XT 16GB", base: 61.4, n: 4 },
  { id: "rx7900xtx", label: "RX 7900 XTX", base: 97, n: 7 },
  { id: "rx7900xt", label: "RX 7900 XT", base: 90, n: 5 },
  { id: "rx7900gre", label: "RX 7900 GRE", base: 60, n: 1 },
  { id: "rx6900xt", label: "RX 6900 XT", base: 50, n: 3 },
  { id: "rx6800xt", label: "RX 6800 XT", base: 45, n: 6 },
  { id: "rx6800", label: "RX 6800", base: 34, n: 4 },
  { id: "rx6700xt", label: "RX 6700 XT", base: 28, n: 9 },
  { id: "rx6600", label: "RX 6600", base: 23.9, n: 12 },
  { id: "rx580-8", label: "RX 580 8GB", base: 10.2, n: 16 },
  { id: "rx570-8", label: "RX 570 8GB", base: 8.9, n: 11 },
  { id: "rx570-4", label: "RX 570 4GB", base: 6, n: 7 },
  // Intel Arc
  { id: "arc-b580", label: "Arc B580", base: 37, n: 5 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 3~35건). 2026년 메모리 급등이 그대로 반영된 수치.
const RAM_OPTIONS = [
  { id: "ddr3-8", label: "DDR3 8GB", base: 1.9, n: 6 },
  { id: "ddr4-8", label: "DDR4 8GB (2666/3200 혼합)", base: 4.5, n: 28 },
  { id: "ddr4-16-2666", label: "DDR4 16GB 2666MHz", base: 10 },
  { id: "ddr4-16-3200", label: "DDR4 16GB 3200MHz", base: 14, n: 13 },
  { id: "ddr4-16-3600", label: "DDR4 16GB 3600MHz (고클럭)", base: 11, n: 3 },
  { id: "ddr4-32-2666", label: "DDR4 32GB 2666MHz", base: 24, n: 2 },
  { id: "ddr4-32-3200", label: "DDR4 32GB 3200MHz", base: 25, n: 11 },
  { id: "ddr4-32-3600", label: "DDR4 32GB 3600MHz (고클럭)", base: 29 },
  { id: "ddr4-64", label: "DDR4 64GB (혼합 클럭)", base: 63, n: 4 },
  { id: "ddr5-8", label: "DDR5 8GB (혼합 클럭)", base: 16, n: 7 },
  { id: "ddr5-16-4800", label: "DDR5 16GB 4800MHz", base: 25, n: 3 },
  { id: "ddr5-16-5600", label: "DDR5 16GB 5600MHz", base: 25, n: 6 },
  { id: "ddr5-16-6000", label: "DDR5 16GB 6000MHz (고클럭)", base: 32 },
  { id: "ddr5-32-4800", label: "DDR5 32GB 4800MHz", base: 35, n: 3 },
  { id: "ddr5-32-5600", label: "DDR5 32GB 5600MHz", base: 50 },
  { id: "ddr5-32-6000", label: "DDR5 32GB 6000MHz (고클럭)", base: 55, n: 3 },
  { id: "ddr5-48", label: "DDR5 48GB (혼합 클럭)", base: 77.2, n: 3 },
  { id: "ddr5-64", label: "DDR5 64GB (혼합 클럭)", base: 126, n: 5 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 5~166건).
const STORAGE_OPTIONS = [
  { id: "sata-128", label: "SATA SSD 128GB", base: 2, n: 22 },
  { id: "sata-256", label: "SATA SSD 256GB", base: 4, n: 48 },
  { id: "sata-500", label: "SATA SSD 500GB", base: 9, n: 61 },
  { id: "sata-1000", label: "SATA SSD 1TB", base: 14.5, n: 39 },
  { id: "sata-2000", label: "SATA SSD 2TB", base: 29, n: 12 },
  { id: "nvme-256", label: "NVMe SSD 256GB", base: 6.1, n: 35 },
  { id: "nvme-512-gen3-dram", label: "NVMe SSD 512GB (Gen3, DRAM 탑재)", base: 10, n: 3 },
  { id: "nvme-512-gen3-dramless", label: "NVMe SSD 512GB (Gen3, DRAM리스)", base: 13, n: 3 },
  { id: "nvme-1000-gen3-dram", label: "NVMe SSD 1TB (Gen3, DRAM 탑재)", base: 20, n: 5 },
  { id: "nvme-1000-gen3-dramless", label: "NVMe SSD 1TB (Gen3, DRAM리스)", base: 17, n: 2 },
  { id: "nvme-1000-gen4-dram", label: "NVMe SSD 1TB (Gen4, DRAM 탑재)", base: 25, n: 5 },
  { id: "nvme-1000-gen4-dramless", label: "NVMe SSD 1TB (Gen4, DRAM리스)", base: 18, n: 2 },
  { id: "nvme-2000-gen3", label: "NVMe SSD 2TB (PCIe Gen3)", base: 31.5, n: 4 },
  { id: "nvme-2000-gen4", label: "NVMe SSD 2TB (PCIe Gen4)", base: 44, n: 3 },
  { id: "nvme-4000", label: "NVMe SSD 4TB", base: 81, n: 7 },
  { id: "hdd-1000", label: "HDD 1TB", base: 2.8, n: 29 },
  { id: "hdd-2000", label: "HDD 2TB", base: 5, n: 24 },
  { id: "hdd-4000", label: "HDD 4TB", base: 13.4, n: 9 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 4~47건).
const MOBO_OPTIONS = [
  // AMD AM5
  { id: "am5-x870", label: "AM5 X870", base: 38, n: 6 },
  { id: "am5-x670", label: "AM5 X670", base: 26, n: 5 },
  { id: "am5-b850", label: "AM5 B850", base: 19.5, n: 8 },
  { id: "am5-b650e", label: "AM5 B650E", base: 18.6, n: 7 },
  { id: "am5-b650", label: "AM5 B650", base: 14, n: 14 },
  { id: "am5-a620", label: "AM5 A620", base: 8.3, n: 9 },
  // AMD AM4
  { id: "am4-x570", label: "AM4 X570", base: 13.4, n: 11 },
  { id: "am4-b550", label: "AM4 B550", base: 12, n: 31 },
  { id: "am4-x470", label: "AM4 X470", base: 8.9, n: 6 },
  { id: "am4-b450", label: "AM4 B450", base: 8, n: 28 },
  { id: "am4-b350", label: "AM4 B350", base: 6.4, n: 13 },
  { id: "am4-a520", label: "AM4 A520", base: 5.5, n: 10 },
  { id: "am4-a320", label: "AM4 A320", base: 4.7, n: 12 },
  // 인텔 LGA1700 (12·13·14세대)
  { id: "lga1700-z790", label: "LGA1700 Z790", base: 22 },
  { id: "lga1700-b760", label: "LGA1700 B760", base: 8.3, n: 24 },
  { id: "lga1700-h770", label: "LGA1700 H770", base: 15 },
  { id: "lga1700-z690", label: "LGA1700 Z690", base: 15 },
  { id: "lga1700-b660", label: "LGA1700 B660", base: 7, n: 5 },
  { id: "lga1700-h610", label: "LGA1700 H610", base: 6 },
  // 인텔 LGA1200 / 1151 등
  { id: "lga1200-b560", label: "LGA1200 B560", base: 7.3, n: 15 },
  { id: "lga1200-b460", label: "LGA1200 B460", base: 5.9, n: 11 },
  { id: "lga1200-h510", label: "LGA1200 H510", base: 5.2, n: 18 },
  { id: "lga1200-h410", label: "LGA1200 H410", base: 5.5, n: 9 },
  { id: "lga1151-z390", label: "LGA1151 Z390", base: 9.8, n: 12 },
  { id: "lga1151-z370", label: "LGA1151 Z370", base: 7.1, n: 8 },
  { id: "lga1151-b365", label: "LGA1151 B365", base: 6, n: 10 },
  { id: "lga1151-b360", label: "LGA1151 B360", base: 5, n: 19 },
  { id: "lga1151-h310", label: "LGA1151 H310", base: 3.6, n: 47 },
  { id: "lga1151-h110", label: "LGA1151 H110", base: 2.8, n: 21 },
  { id: "lga1150-h97", label: "LGA1150 H97", base: 3, n: 7 },
  { id: "lga1150-h81", label: "LGA1150 H81", base: 2, n: 14 },
  { id: "lga1150-b85", label: "LGA1150 B85", base: 1.7, n: 9 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 3~51건).
const PSU_OPTIONS = [
  { id: "400w", label: "400W Standard", base: 1.2, n: 8 },
  { id: "450w", label: "450W Standard", base: 1.7 },
  { id: "500w", label: "500W Standard", base: 1.5, n: 22 },
  { id: "550w", label: "550W Standard", base: 1.6 },
  { id: "600w-std", label: "600W Standard", base: 2.3, n: 19 },
  { id: "600w-bronze", label: "600W Bronze", base: 2.9, n: 13 },
  { id: "650w-std", label: "650W Standard", base: 2.5 },
  { id: "650w-bronze", label: "650W Bronze", base: 2.9 },
  { id: "700w-std", label: "700W Standard", base: 3.5, n: 51 },
  { id: "700w-bronze", label: "700W Bronze", base: 4, n: 27 },
  { id: "750w-gold", label: "750W Gold", base: 9.2, n: 18 },
  { id: "850w-gold", label: "850W Gold", base: 9 },
  { id: "1000w-std", label: "1000W Standard", base: 6.6, n: 6 },
  { id: "1000w-gold", label: "1000W Gold", base: 11.3, n: 9 },
  { id: "1200w-platinum", label: "1200W Platinum", base: 28.4, n: 3 },
];

// 출처: 본치마크 P2P 매물 중간값 (표본 3~35건).
const CASE_OPTIONS = [
  { id: "office-matx", label: "사무용 mATX 케이스", base: 3.3, n: 35 },
  { id: "mid-tower", label: "일반 미들타워 케이스", base: 2, n: 28 },
  { id: "matx-mesh", label: "보급형 M-ATX 메쉬 케이스", base: 4 },
  { id: "mini-tower", label: "일반 미니타워 케이스", base: 4.2 },
  { id: "glass-mid", label: "강화유리 미들타워 케이스", base: 5.5 },
  { id: "itx", label: "ITX 소형 케이스", base: 6.2 },
  { id: "fishtank", label: "어항형 케이스", base: 7.8, n: 7 },
  { id: "big-tower", label: "빅타워 케이스", base: 10, n: 5 },
];


function formatWon(manwon) {
  return Math.round(manwon).toLocaleString("ko-KR") + "만원";
}

export default function PCPriceEstimator() {
  const [cpuText, setCpuText] = useState("인텔 i5-13400");
  const [gpuText, setGpuText] = useState("RTX 4070");
  const [ram, setRam] = useState("ddr4-16-3200");
  const [storage, setStorage] = useState("nvme-1000-gen4-dram");
  const [mobo, setMobo] = useState("am4-b550");
  const [psu, setPsu] = useState("700w-std");
  const [pcCase, setPcCase] = useState("mid-tower");
  const [includeCase, setIncludeCase] = useState(true);

  // 입력한 텍스트와 참고 목록을 매칭.
  // "5060"이 "5060 Ti"보다 먼저 걸리는 문제가 있어, 점수를 매겨 가장 정확한 것을 고른다.
  function findMatch(list, text) {
    const norm = (s) => s.toLowerCase().replace(/[\s-_]/g, "");
    const t = norm(text || "");
    if (!t) return undefined;

    let best;
    let bestScore = -1;
    for (const o of list) {
      const label = norm(o.label);
      let score = -1;

      if (label === t) {
        score = 100; // 완전히 같음
      } else if (label.includes(t)) {
        // 입력이 이름의 일부 — 이름이 짧을수록(군더더기가 적을수록) 우선
        score = 60 - (label.length - t.length);
      } else if (t.includes(label)) {
        // 이름이 입력의 일부 — 이름이 길수록 더 구체적이므로 우선
        score = 40 + label.length;
      }

      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    }
    return bestScore >= 0 ? best : undefined;
  }

  const cpuMatch = findMatch(CPUS, cpuText) ?? null;
  const gpuMatch = findMatch(GPUS, gpuText) ?? null;

  // 목록에 없는 모델 입력 시 사용할 대체값 (표본 없음 → 신뢰도 낮음으로 표시됨)
  const cpuFallback = { id: "cpu-unknown", label: cpuText || "미입력", base: 18, n: 0 };
  const gpuFallback = { id: "gpu-unknown", label: gpuText || "미입력", base: 40, n: 0 };

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
  const [listingText, setListingText] = useState("");
  const [shotImage, setShotImage] = useState(null); // { url, name }
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState("text"); // text | image

  // ---- 사용자 실거래 제보 데이터 ----
  // { partId: [가격(만원), ...] } — 실제 서비스에서는 서버 DB에 저장해 전체 사용자와 공유
  const [userReports, setUserReports] = useState({});
  const [reportPartId, setReportPartId] = useState("");
  const [reportPartText, setReportPartText] = useState("");
  const [showReportSuggest, setShowReportSuggest] = useState(false);
  const [reportPrice, setReportPrice] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
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

  // 제보용 부품 검색: 전체 부품에서 이름·분류로 찾고, 분류를 함께 보여준다
  const reportSuggestions = useMemo(() => {
    const norm = (v) => (v || "").toLowerCase().replace(/[\s-_]/g, "");
    const t = norm(reportPartText);
    if (!t) return allParts.slice(0, 10);
    return allParts
      .filter((p) => norm(`${p.label} ${p.group}`).includes(t))
      .slice(0, 10);
  }, [reportPartText, allParts]);

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
    setReportPartId("");
    setReportPartText("");
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
사이트 기준 계산값: ${Math.round(result.mid)}만원

부품 조합을 고려해 이 기준값이 적절한지 판단하고, 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
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
메인보드·파워·케이스처럼 매물글에 칩셋/모델이 명시되지 않은 부품은 전체 구성의 등급(예산형/보급형인지
고급형인지)에 맞춰 추정하세요 — 예를 들어 CPU가 보급형(예: 라이젠 5 3600, i5-10400 등)이면
메인보드도 A320/A520·H510 같은 보급형 칩셋으로, 고급형이 아니라면 무리해서 B550/Z 계열로
추정하지 마세요. 불확실하면 더 저렴한 쪽으로 추정하는 것이 안전합니다.
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
  function effectivePrice(part) {
    if (!part) return { value: 0, n: 0, reportN: 0, basis: "없음", verified: false };

    const baseValue = part.base;
    const baseN = part.n || 0;
    const basis = "판매중";

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
          value: eff.value,
          sampleN: eff.n,
          reportN: eff.reportN,
          partId: part.id,
          basis: eff.basis,
          verified: eff.verified,
        };
      })
      .filter((c) => c.value > 0);

    const mid = entries.reduce((sum, e) => sum + effectivePrice(e.part).value, 0);

    // 표본이 적을수록 범위를 넓게 잡아 불확실성을 반영
    const totalN = perComponent.reduce((s, c) => s + c.sampleN, 0);
    const avgN = perComponent.length ? totalN / perComponent.length : 0;
    const spread = avgN >= 20 ? 0.08 : avgN >= 8 ? 0.13 : 0.2;
    const low = mid * (1 - spread);
    const high = mid * (1 + spread);

    const totalReports = perComponent.reduce((s, c) => s + c.reportN, 0);

    return {
      low, mid, high, perComponent,
      avgN, totalReports,
      confidence: confidenceOf(avgN),
    };
  }, [cpuText, gpuText, ram, storage, mobo, psu, pcCase, includeCase, userReports]);

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
          ℹ️ 예상가는 중고나라 판매중 호가와 당근마켓 거래완료가를 부품별로 섞어 쓴 추정치예요(구형 GPU 일부는 실제 거래완료가, 나머지는 판매중 호가). 참고용으로만 활용해 주세요.
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
        </section>

        <section style={styles.resultCard} className="card">
          <div style={styles.ticketLabel}>예상 거래가</div>
          <div style={styles.priceRow}>
            <span style={{ ...styles.priceMid, color: "#3E7A57" }}>{formatWon(result.mid)}</span>
          </div>
          <div style={styles.rangeRow}>
            <span style={styles.rangeText}>{formatWon(result.low)} ~ {formatWon(result.high)}</span>
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

          <div style={styles.divider} />

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
            ⚠ 예상가는 중고나라 판매중 호가 표본을 기반으로 한 추정치입니다(실거래가 아님). 실제 거래가는 상태·구성·지역에 따라
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
              <Field label="부품 검색">
                <div style={styles.autocompleteWrap}>
                  <input
                    style={styles.select}
                    value={reportPartText}
                    onChange={(e) => {
                      setReportPartText(e.target.value);
                      setReportPartId("");
                      setReportError(null);
                    }}
                    onFocus={() => setShowReportSuggest(true)}
                    onBlur={() => setTimeout(() => setShowReportSuggest(false), 150)}
                    placeholder="부품명을 입력하세요 (예: 1660, i5, DDR4)"
                  />
                  {showReportSuggest && reportSuggestions.length > 0 && (
                    <div style={styles.suggestDropdown}>
                      {reportSuggestions.map((o) => (
                        <div
                          key={`${o.group}-${o.id}`}
                          style={styles.suggestItem}
                          className="suggest-item"
                          onMouseDown={() => {
                            setReportPartId(o.id);
                            setReportPartText(o.label);
                            setShowReportSuggest(false);
                          }}
                        >
                          <span style={styles.suggestGroup}>{o.group}</span>
                          {o.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {reportPartText && !reportPartId && !showReportSuggest && (
                  <div style={styles.reportHintText}>
                    목록에서 부품을 골라주세요.
                  </div>
                )}
                {reportPartId && (
                  <div style={styles.reportPickedText}>
                    현재 시세 {formatWon(allParts.find((p) => p.id === reportPartId)?.base || 0)}
                  </div>
                )}
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
  suggestGroup: {
    fontSize: 10,
    color: "#9AA6B8",
    background: "#1B2230",
    borderRadius: 4,
    padding: "2px 6px",
    marginRight: 8,
  },
  reportHintText: { fontSize: 11, color: "#8A6D1F", marginTop: 6 },
  reportPickedText: { fontSize: 11, color: "#7FB98F", marginTop: 6 },
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
  newPriceLabel: { fontSize: 12, color: "#9AA6B8", fontFamily: "'JetBrains Mono', monospace" },
  newPriceValue: { fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" },
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
