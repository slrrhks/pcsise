# 중고 PC 시세 계산기

부품을 고르면 중고 거래 예상가를 계산해 주는 사이트입니다.

---

## 배포 순서

개발 도구를 설치하지 않고 웹 브라우저만으로 진행할 수 있습니다.
1번부터 순서대로 따라가면 됩니다.

### 1. GitHub 저장소 만들기

1. [github.com](https://github.com) 가입 후 로그인
2. 오른쪽 위 `+` → **New repository**
3. 이름은 `pcsise` (원하는 이름으로 해도 됩니다)
4. **Public** 선택 → **Create repository**
5. 다음 화면에서 **uploading an existing file** 클릭
6. 이 폴더의 파일을 **폴더 구조 그대로** 끌어다 놓기
7. 아래 **Commit changes** 클릭

> `.github` 폴더가 안 보이면 숨김 파일이라서 그렇습니다.
> 지금은 건너뛰고, 5단계에서 다시 올려도 됩니다.

### 2. Vercel로 배포하기

1. [vercel.com](https://vercel.com) 접속 → **Continue with GitHub**로 가입
2. **Add New** → **Project**
3. 방금 만든 저장소 옆 **Import** 클릭
4. 설정은 건드리지 말고 **Deploy** 클릭
5. 2~3분 기다리면 `프로젝트이름.vercel.app` 주소가 나옵니다

이 시점에 사이트가 열립니다. 계산기와 부품 검색이 바로 작동합니다.

### 3. 도메인 연결하기

1. 가비아·후이즈 등에서 도메인 구입 (연 2만원 안팎)
2. Vercel 프로젝트 → **Settings** → **Domains**
3. 구입한 주소 입력 → **Add**
4. 화면에 나오는 네임서버 주소를 도메인 업체 관리 페이지에 입력
5. 반영까지 10분~2시간

### 4. 매물 판정 기능 켜기 (선택)

이 기능만 API 키가 필요합니다. **비용이 발생하니 급하지 않으면 건너뛰세요.**

1. [console.anthropic.com](https://console.anthropic.com) 가입
2. **Billing**에서 결제 수단 등록 (종량제)
3. **API Keys** → **Create Key** → 키 복사
4. Vercel 프로젝트 → **Settings** → **Environment Variables**
5. Name에 `ANTHROPIC_API_KEY`, Value에 복사한 키 → **Save**
6. **Deployments** 탭 → 맨 위 항목의 `...` → **Redeploy**

> 키를 코드 파일에 직접 적으면 절대 안 됩니다.
> 공개 저장소에 올라가면 남이 내 요금으로 API를 쓰게 됩니다.

### 5. 주간 자동 시세 갱신 켜기 (선택)

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name에 `ANTHROPIC_API_KEY`, Value에 4단계의 키 → **Add secret**
4. `.github/workflows/update-prices.yml` 파일이 저장소에 있는지 확인

매주 월요일 새벽 3시에 자동 실행됩니다.

---

## 수정하는 방법

배포 후에는 GitHub에서 파일을 고치면 1~2분 뒤 사이트에 자동 반영됩니다.

1. GitHub 저장소에서 고칠 파일 클릭
2. 연필 아이콘 클릭
3. 내용 수정 후 아래 **Commit changes**

되돌리려면 Vercel **Deployments** 탭에서 이전 배포의 `...` → **Promote to Production**.

---

## 기능 켜고 끄기

`src/App.jsx` 파일 위쪽에 있습니다. `true` / `false`만 바꾸면 됩니다.

```js
const FEATURES = {
  aiRefine: false,      // 실시간 시세 보정 (1건당 약 5~15원)
  aiSearch: false,      // AI 실시간 시세 검색 (1건당 약 50~100원)
  aiListingCheck: true, // 매물 적정가 판정 (1건당 약 5~30원)
};
```

AI 기능을 전부 `false`로 두면 **API 키 없이도 사이트가 돌아갑니다.**
운영비는 도메인 값뿐이라 적자가 나지 않습니다.

---

## 폴더 설명

```
index.html              사이트 제목·설명 (검색 노출에 쓰임)
src/App.jsx             화면 전체와 시세 데이터
src/main.jsx            앱 시작점 (건드릴 일 없음)
src/index.css           전역 스타일
api/analyze.js          AI 호출 중계 서버 (API 키를 숨기는 역할)
scripts/update-prices.js  주간 시세 갱신 스크립트
.github/workflows/      자동 실행 설정
```

---

## 알아두면 좋은 것

- **제보 데이터는 방문자 브라우저에만 저장됩니다.** 다른 사람에게는 공유되지 않고, 브라우저 기록을 지우면 사라집니다. 여러 사람의 제보를 모으려면 Supabase 같은 데이터베이스 연결이 필요합니다.
- **시세 데이터는 그래픽카드 18종만 실측 확인된 값입니다.** 나머지는 추정치라 실제와 다를 수 있습니다.
- **API 사용량은 [콘솔](https://console.anthropic.com)에서 확인하세요.** 예산 알림도 걸어둘 수 있습니다.
