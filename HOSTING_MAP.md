# 🗺️ 김동곤 님의 7대 운영 웹사이트 공식 호스팅 지도 & AI 작업 가이드

> **AI 에이전트(ChatGPT, Claude, Cursor 등) 필수 필독 안내**  
> 이 문서는 김동곤(@kdg28447520) 님이 운영하는 7대 공공데이터/수익형 웹사이트의 **실제 호스팅 배포처, 깃허브 저장소, 실서버 배포 방식**을 확정한 공식 단일 진실 공급원(Single Source of Truth)입니다.  
> 사이트 수정 작업을 수행하기 전에 반드시 아래 [4대 호스팅 분류]에 따라 정확한 도구와 절차로 작업하세요.

---

## 📊 7대 사이트 공식 호스팅 & 배포 분류 (4대 그룹)

### 1. Vercel 그룹 (깃허브 main 푸시 시 실서버 자동 배포)
- **대상 사이트**:
  - **펫맵** (`https://petmap.kr`) ➔ 저장소: `kdg28447520/petmap`
  - **주말어디가** (`https://weekendgo.co.kr`) ➔ 저장소: `kdg28447520/weekendgo-production-backup`
  - **공공맛집/공공식당** (`https://publicfood.co.kr`) ➔ 저장소: `kdg28447520/publicfood-production-backup`
- **배포 방법**: 
  - 대응 깃허브 저장소의 `main` 브랜치에 코드를 커밋하고 푸시하면, 연동된 Vercel이 자동으로 빌드하여 실서버에 즉시 배포합니다.
- **주의사항 (펫맵)**:
  - 1,389개 장소 중 약 17~20개만 사이트맵에 반영되는 것은 정상입니다.
  - 애드센스 씬 콘텐츠(Thin Content) 저품질 페널티를 막기 위한 의도된 방어 로직(`index-rule.js`)이므로 함부로 전체 개방하지 마세요.

---

### 2. GitHub Pages 그룹 (깃허브 main 푸시 시 실서버 자동 배포)
- **대상 사이트**:
  - **공매물** (`https://gongmaemul.co.kr`) ➔ 저장소: `kdg28447520/gongmaemul-test`
- **배포 방법**:
  - `gongmaemul-test` 저장소의 `main` 브랜치에 푸시하면 GitHub Pages 워크플로(`pages-build-deployment`)가 30초 내에 실서버로 자동 배포합니다.
- **수정 규칙**:
  - 모든 정적 페이지 및 물건 상세(`/item/*.html`)에는 `<link rel="canonical">` 태그와 `<meta name="robots" content="index, follow">`가 반드시 유지되어야 합니다.

---

### 3. ChatGPT Sites 그룹 (깃허브는 백업용! 챗GPT에서 Deploy 필수)
- **대상 사이트**:
  - **공매카** (`https://gongmeca.co.kr`) ➔ 백업 저장소: `kdg28447520/gongmeca-production-backup`
  - **별다방/스타펫** (`https://starpet.co.kr`) ➔ 백업 저장소: `kdg28447520/starpet-production-backup`, `byeoldabang`
- **치명적 주의사항 (AI 필수 확인)**:
  - 대응 깃허브 저장소는 **'소스 코드 백업/보관용'**입니다!
  - **깃허브에 코드를 푸시해도 실서버로 자동 배포되지 않습니다.**
- **배포 방법**:
  - 실제 사이트는 ChatGPT의 **Sites (Cloudflare Workers)** 환경에서 구동됩니다.
  - 해당 사이트를 작업하는 **ChatGPT 프로젝트(Sites) 대화창**에서 소스코드를 수정한 뒤, 프로젝트 우측 상단의 **[Publish / Deploy]** 버튼을 눌러야 실서버에 적용됩니다.
- **공매카 SEO 규칙**:
  - 차량 상세 주소는 `/vehicle/[id]`입니다. 진행 중인 유효 차량만 `index,follow` 및 `sitemap.xml` 포함, 마감/유찰 차량은 `noindex,follow` 처리합니다.

---

### 4. 카페24 웹호스팅 그룹 (WP File Manager 직접 업로드)
- **대상 사이트**:
  - **다시출근** (`https://dasijak.co.kr`) ➔ 호스팅: 카페24 (KT망)
- **배포 방법**:
  - 단일 SPA 구조로 동작하며, 워드프레스 기반 카페24 호스팅입니다.
  - 가이드 글 등 검색엔진 최적화가 필요한 파일은 독립 정적 HTML 파일로 생성한 뒤, **워드프레스 관리자의 [WP File Manager] 플러그인을 통해 웹서버 루트(root) 디렉터리에 직접 업로드**합니다.

---

## 📌 다른 AI에게 전달할 복붙용 1초 지시문

```text
내 7개 사이트는 호스팅 배포처가 다 다르니 헤매지 말고 아래 기준으로 작업해줘:

1. 펫맵 · 주말어디가 · 공공맛집: Vercel (깃허브 main 푸시 시 실서버 자동 배포)
2. 공매물: GitHub Pages (gongmaemul-test 깃허브 main 푸시 시 실서버 자동 배포)
3. 공매카 · 별다방(스타펫): ChatGPT Sites (깃허브는 백업용이므로 챗GPT 사이트 프로젝트에서 소스 수정 후 Deploy로 배포)
4. 다시출근: 카페24 호스팅 (WP File Manager로 정적 HTML 파일을 루트에 직접 업로드)
```
