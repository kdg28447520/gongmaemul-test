# 🗺️ 김동곤 님의 7대 운영 웹사이트 총괄 호스팅 지도 & AI 작업 가이드

> **AI 에이전트(ChatGPT, Claude, Cursor 등) 필수 필독 안내**  
> 이 문서는 김동곤(@kdg28447520) 님이 운영하는 7대 공공데이터/수익형 웹사이트의 **실제 호스팅 위치, 깃허브 저장소, 배포 파이프라인(수도관)**을 정의한 단일 진실 공급원(Single Source of Truth)입니다.  
> 사이트 수정 작업을 수행하기 전에 반드시 해당 사이트의 [배포 방식]과 [주의사항]을 확인하고 작업하세요.

---

## 📊 7대 사이트 총괄 현황 매트릭스

| 사이트명 | 운영 도메인 | 실제 호스팅 배포처 | 대응 GitHub 저장소 | 배포 방식 (배포 트리거) | DB / 기술 스택 |
|---|---|---|---|---|---|
| **공매물** | `https://gongmaemul.co.kr` | **GitHub Pages** | `kdg28447520/gongmaemul-test` | 깃허브 `main` 브랜치 푸시 시 자동 배포 (GitHub Actions) | 순수 정적 HTML/JS |
| **공매카** | `https://gongmeca.co.kr` | **OpenAI Sites** (Cloudflare Workers) | `kdg28447520/gongmeca-production-backup` | **주의**: 깃허브는 '백업용'임! 실제 배포는 ChatGPT 프로젝트(Sites)에서 수행 | Cloudflare D1 (SQLite) + Worker ESM |
| **펫맵** | `https://petmap.kr` | **Vercel** (`petmap-cyan.vercel.app`) | `kdg28447520/petmap` | 깃허브 `main` 브랜치 푸시 시 Vercel 자동 빌드/배포 | Node.js / HTML 정적 빌드 |
| **주말어디가** | `https://weekendgo.co.kr` | **Vercel** (`oneul-eodiga-public-2026.vercel.app`) | `kdg28447520/weekendgo-production-backup` | 깃허브 `main` 브랜치 푸시 시 Vercel 자동 빌드/배포 | Node.js 정적 빌드 |
| **공공식당** | `https://publicfood.co.kr` | **Vercel** (`public-food-map-kdg2844-8355s-projects.vercel.app`) | `kdg28447520/publicfood-production-backup` | 깃허브 `main` 브랜치 푸시 시 Vercel 자동 빌드/배포 | 정적 웹앱 |
| **다시출근** | `https://dasijak.co.kr` | **KT 독립 웹서버** (OpenResty, IP: 220.73.160.8) | 별도 깃허브 없음 (독립 서버 운영) | 웹서버 디렉터리 직접 파일 복사/업로드 | OpenResty (Nginx) SPA |
| **스타펫** | `https://starpet.co.kr` | **WordPress.com** | `kdg28447520/starpet-production-backup` | 워드프레스 관리자 콘솔 / Jetpack 동기화 | WordPress CMS |

---

## 🛠️ 사이트별 상세 수정 & 배포 지침 (AI 필독)

### 1. 공매물 (gongmaemul.co.kr)
- **저장소**: `kdg28447520/gongmaemul-test` (Public)
- **배포 방식**: 저장소의 `main` 브랜치에 커밋 후 푸시하면 GitHub Pages 워크플로(`pages-build-deployment`)가 30초 내에 실서버로 자동 배포합니다.
- **수정 규칙**:
  - 모든 정적 페이지 및 물건 상세(`/item/*.html`)에는 `<link rel="canonical">` 태그와 `<meta name="robots" content="index, follow">`가 반드시 유지되어야 합니다.
  - 사이트맵은 `sitemap.xml`에 전수 URL이 반영되어야 합니다.

### 2. 공매카 (gongmeca.co.kr)
- **저장소**: `kdg28447520/gongmeca-production-backup` (Private)
- **주의 (치명적)**: 
  - 이 저장소는 **'소스 코드 보관/백업용'**입니다!
  - 깃허브에 커밋/푸시하는 것만으로는 실서버(`gongmeca.co.kr`)에 반영되지 않습니다.
- **배포 방법**:
  - 실제 사이트는 ChatGPT의 **Sites (Cloudflare Workers + D1)** 엔진에서 구동됩니다.
  - ChatGPT 공매카 프로젝트 대화창에서 소스코드를 수정한 뒤, 프로젝트 우측 상단의 **[Publish / Deploy]** 버튼을 눌러야 실서버에 반영됩니다.
- **SEO 주의사항**:
  - 차량 상세 주소는 `/car/`가 아니라 `/vehicle/[id]` 형식입니다.
  - 진행 중인 차량만 `index,follow` 및 `sitemap.xml` 포함, 마감/유찰 차량은 `noindex,follow`로 처리해야 구글 저품질 페널티를 방지할 수 있습니다.

### 3. 펫맵 (petmap.kr)
- **저장소**: `kdg28447520/petmap` (Public)
- **배포 방식**: 깃허브 `main` 푸시 시 연결된 Vercel(`petmap-cyan.vercel.app`)에서 자동 배포됩니다.
- **주의사항**:
  - 1,389개 장소 중 약 17~20개만 sitemap에 등록되는 것은 버그가 아닙니다!
  - 애드센스 씬 콘텐츠(Thin Content) 저품질 페널티를 방어하기 위해 `build.js`와 `index-rule.js`에서 필수 보강 데이터가 24자 이상 갖춰진 우수 장소만 엄격히 선별 색인하는 의도된 방어 로직입니다. 함부로 해제하지 마세요.

### 4. 주말어디가 (weekendgo.co.kr) & 공공식당 (publicfood.co.kr)
- **저장소**: `weekendgo-production-backup`, `publicfood-production-backup` (Private)
- **배포 방식**: 깃허브 `main` 브랜치 푸시 시 Vercel 프로젝트에서 자동 빌드 및 배포됩니다.

### 5. 다시출근 (dasijak.co.kr)
- **호스팅**: KT 고정 IP 웹서버 (OpenResty)
- **특징**: 단일 SPA로 동작하므로, 검색엔진 노출이 필요한 가이드 글은 독립 정적 HTML 파일로 생성하여 웹서버에 직접 업로드해야 색인됩니다.

---

## 📌 다른 AI에게 전달할 1줄 복붙용 지시문

> "내 사이트 구조와 실제 배포처는 깃허브 `HOSTING_MAP.md` 파일에 정의되어 있어. 공매카는 챗GPT Sites, 펫맵/주말어디가/공공식당은 Vercel, 공매물은 GitHub Pages로 배포되니 해당 파일 지침대로 작업해줘."
