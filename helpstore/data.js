/* 동곤 헬프스토어 PRO — 실제 원천 DB
   모든 수치는 워크스페이스 원천 자료에서 옮겨 적었고, 출처를 함께 보관한다.
   근거가 없는 값은 아예 넣지 않는다(빈칸 = 사용자가 직접 입력). */
window.HSDB = {
  meta: {
    built: "2026-11-14",
    sourceNote: "원천: materials/wholesale_suppliers_9.md, memory/topics/business-ventures/docs/{november-sourcing-top10.md,coupang-fruit.md}, gongmaemul-repo/growth-calc/index.html, materials/miracle/",
    miracleNote: "materials/miracle/transcript.xml 은 0바이트여서 담을 실측 단가가 없습니다. 확보되면 이 파일에 추가하세요."
  },

  /* 쿠팡 카테고리 수수료 — growth-calc/index.html 프리셋 기준 */
  feeCats: [
    { id: "car", label: "자동차용품 / 잡화", rate: 11.88 },
    { id: "living", label: "생활 / 주방용품", rate: 10.89 },
    { id: "fresh", label: "신선식품 / 과일", rate: 10.56 },
    { id: "digital", label: "가전 / 디지털", rate: 11.22 },
    { id: "fashion", label: "패션 / 의류", rate: 12.1 },
    { id: "etc", label: "기타 일반 공산품", rate: 11.0 }
  ],

  /* 쿠팡 CFS 입출고·배송 요금 — growth-calc/index.html getCfsFee() 기준 */
  cfs: [
    { name: "극소형", fee: 1950, maxSum: 35, maxKg: 0.25 },
    { name: "소형", fee: 2350, maxSum: 60, maxKg: 1.0 },
    { name: "중형", fee: 2850, maxSum: 80, maxKg: 2.0 },
    { name: "대형", fee: 3650, maxSum: 120, maxKg: 5.0 },
    { name: "특대형", fee: 5900, maxSum: 9999, maxKg: 9999 }
  ],

  /* 실측 상품 DB
     channel: rocket = 로켓그로스(CFS 입출고 발생) / direct = 위탁·산지직송(공급가에 배송 포함)
     supply = 매입 원가(랜딩·배송 포함 실측 공급가)
     margin = 원천 자료에 기록된 순이익·마진율(수수료 공제 후) */
  products: [
    {
      id: "stanley-holder", name: "스탠리 2in1 컵홀더", channel: "rocket", feeCat: "car",
      sale: 23900, supply: 7800, dims: "150×150×200mm · 450g", cfsFee: 2850, cfsName: "중형",
      source: "growth-calc 프리셋 (동곤 로켓그로스 관제탑 PRO)", sourceRef: "gongmaemul-repo/growth-calc/index.html",
      measured: "2026-11-11", tag: "잡화 1호 후보", searchTerm: "스탠리 컵홀더"
    },
    {
      id: "car-tray", name: "차량용 회전 트레이", channel: "rocket", feeCat: "car",
      sale: 21900, supply: 6500, dims: "220×180×120mm · 380g", cfsFee: 2350, cfsName: "소형",
      source: "growth-calc 프리셋 (동곤 로켓그로스 관제탑 PRO)", sourceRef: "gongmaemul-repo/growth-calc/index.html",
      measured: "2026-11-11", tag: "잡화 2호 후보", searchTerm: "차량용 트레이"
    },
    {
      id: "enbu-apple-2kg", name: "엔비·감홍 사과 2kg", channel: "rocket", feeCat: "fresh",
      sale: 18900, supply: 10800, dims: "250×200×150mm · 2,200g", cfsFee: 3650, cfsName: "대형",
      source: "growth-calc 프리셋 (과일)", sourceRef: "gongmaemul-repo/growth-calc/index.html",
      measured: "2026-11-11", tag: "과일", searchTerm: "엔부사과"
    },
    {
      id: "cheongdo-bansi-10kg", name: "청도 반시 10kg 벌크", channel: "rocket", feeCat: "fresh",
      sale: 24900, supply: 11700, dims: "380×280×200mm · 10,500g", cfsFee: 5900, cfsName: "특대형",
      source: "growth-calc 프리셋 + 스위티푸드 단가(2026-11-05)", sourceRef: "gongmaemul-repo/growth-calc/index.html · memory/topics/business-ventures/docs/coupang-fruit.md",
      measured: "2026-11-08", tag: "시즌 2/3 완숙", searchTerm: "청도 반시"
    },
    {
      id: "jeju-tangerine-5kg", name: "제주 극조생 감귤 로얄과 5kg", channel: "direct", feeCat: "fresh",
      sale: 18900, supply: 8800,
      source: "버니즈 단가표 138행 (배송비 포함 공급가)", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "11월 검색 1위", searchTerm: "제주 감귤 5kg",
      demandIndex: 42.2, demandPeak: 54.8, demandSource: "네이버 데이터랩 2026년 11월 일간 검색지수"
    },
    {
      id: "changwon-persimmon-10kg", name: "창원 부유단감 10kg 벌크", channel: "direct", feeCat: "fresh",
      sale: 24900, supply: 11700,
      source: "에코앤팜 파트너몰 실측 (판매중 4,241개 품목 쿼리)", sourceRef: "memory/topics/business-ventures/docs/coupang-fruit.md",
      measured: "2026-11-11", tag: "무수거 CS", searchTerm: "부유단감 10kg"
    },
    {
      id: "sangju-gotgam-600g", name: "상주 봉지곶감 반건시 600g", channel: "direct", feeCat: "fresh",
      sale: 22900, supply: 12500,
      source: "버니즈 단가표 149행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "곶감 시즌", searchTerm: "봉지곶감",
      demandIndex: 36.9, demandPeak: 69.5, demandSource: "네이버 데이터랩 2026년 11월 일간 검색지수"
    },
    {
      id: "jeju-goldhyang-2_5kg", name: "제주 황금향 2.5kg", channel: "direct", feeCat: "fresh",
      sale: 24900, supply: 13400,
      source: "버니즈 단가표 124행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "만감류", searchTerm: "황금향 2.5kg",
      demandIndex: 15.7, demandSource: "네이버 데이터랩 2026년 11월 일간 검색지수"
    },
    {
      id: "busa-apple-3kg", name: "부사 꿀사과 3kg 중과", channel: "direct", feeCat: "fresh",
      sale: 23900, supply: 13400,
      source: "버니즈 단가표 108행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "부사 출하", searchTerm: "부사사과 3kg",
      demandIndex: 15.7, demandSource: "네이버 데이터랩 2026년 11월 일간 검색지수"
    },
    {
      id: "sweet-potato-3kg", name: "여주 햇 꿀고구마 3kg", channel: "direct", feeCat: "fresh",
      sale: 19900, supply: 11200,
      source: "버니즈 단가표 뿌리작물 80행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "부패 리스크 낮음", searchTerm: "꿀고구마 3kg"
    },
    {
      id: "daebong-5kg", name: "영암 대봉감 5kg 소과", channel: "direct", feeCat: "fresh",
      sale: 21900, supply: 12500,
      source: "버니즈 단가표 15행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "11월 한정", searchTerm: "대봉감 5kg"
    },
    {
      id: "cabbage-20kg", name: "해남 절임배추 20kg", channel: "direct", feeCat: "fresh",
      sale: 54900, supply: 35300,
      source: "버니즈 단가표 뿌리작물 21행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "김장철", searchTerm: "절임배추 20kg"
    },
    {
      id: "red-pepper-3kg", name: "국산 김장용 고추가루 3kg", channel: "direct", feeCat: "fresh",
      sale: 79000, supply: 54300,
      source: "버니즈 단가표 138행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "김장 연계", searchTerm: "고추가루 3kg"
    },
    {
      id: "abalone-1kg", name: "완도 활 참전복 1kg", channel: "direct", feeCat: "fresh",
      sale: 65900, supply: 44700,
      source: "버니즈 수산물 13행", sourceRef: "memory/topics/business-ventures/docs/november-sourcing-top10.md",
      measured: "2026-11-11", tag: "수산", searchTerm: "활 참전복 1kg"
    }
  ],

  /* 위탁·B2G 도매처 9선 */
  suppliers: [
    { no: 1, name: "이디나 B2B", cat: "주방용품 / 식기", url: "http://www.edina.co.kr", tip: "프라이팬·냄비·주방 소모품 대량 도매, 브랜드 식기 보유", b2g: "구내식당·복지관 조리기구" },
    { no: 2, name: "필 국제무역", cat: "주방 / 식기 / 수입잡화", url: "http://www.philtrade.co.kr", tip: "해외 직수입 주방용품, 스테인리스 식기·식당 집기", b2g: "단체 급식용 비품" },
    { no: 3, name: "오송유통", cat: "가구 / 인테리어", url: "http://www.osongmall.com", tip: "조립식 선반·수납장·사무의자, 부피 대비 단가 높음", b2g: "주민센터·도서관 서가" },
    { no: 4, name: "핑크돼지도매", cat: "생활용품 / 아이디어 잡화", url: "http://www.pinkpig.co.kr", tip: "청소·욕실용품, 쿠팡 옐로우존 틈새 발굴", b2g: "청소용역 소모품" },
    { no: 5, name: "도매토피아", cat: "종합 생활용품 5만+종", url: "https://dometopia.com", tip: "무료 위탁배송, 1개 직발송 시스템", b2g: "공산품·행사 판촉물" },
    { no: 6, name: "천유닷컴", cat: "문구 / 캐릭터 / 팬시", url: "https://1000u.com", tip: "디자인 문구 B2B, 마진율 50% 근접", b2g: "돌봄교실·어린이집 교구" },
    { no: 7, name: "알파문구 B2B", cat: "학용품 / 사무용 문구", url: "https://www.alpha.co.kr", tip: "전국 체인망, 표준 브랜드 문구", b2g: "관공서 사무용품 1순위" },
    { no: 8, name: "오피스디포 B2B", cat: "사무용품 / 오피스 MRO", url: "https://www.officedepot.co.kr", tip: "복사용지·토너·탕비실 다과, 견적서 발행 최적", b2g: "안산시청·구청 총무과" },
    { no: 9, name: "남도마켓", cat: "패션 / 의류 / 잡화", url: "https://ndmarket.co.kr", tip: "동대문·남대문 패션 도매, 사입/위탁 연동", b2g: "단체복·조끼·안전모" }
  ],

  /* 실제 공휴일·시즌 (2026~2027) — 출처: 우주항공청 2026·2027 월력요항, 교육부 수능 시행일 발표 */
  seasons: [
    { date: "2026-11-19", name: "2027학년도 수능", kind: "공식", heat: 2, lead: 2, note: "교육부 발표 시행일" },
    { date: "2026-11-27", name: "블랙프라이데이", kind: "해외", heat: 3, lead: 3, note: "추수감사절 다음날(11월 넷째 목요일+1)" },
    { date: "2026-12-25", name: "크리스마스", kind: "공휴일", heat: 3, lead: 3, note: "2026 월력요항" },
    { date: "2027-01-01", name: "신정", kind: "공휴일", heat: 1, lead: 2, note: "2027 월력요항" },
    { date: "2027-02-07", name: "설날", kind: "공휴일", heat: 3, lead: 3.5, note: "연휴 2/6~2/9, 설날 당일 2/7(일)" },
    { date: "2027-02-14", name: "밸런타인데이", kind: "기념일", heat: 1, lead: 3, note: "고정 기념일" },
    { date: "2027-03-02", name: "신학기", kind: "시즌", heat: 2, lead: 4, note: "개학 시즌" },
    { date: "2027-03-14", name: "화이트데이", kind: "기념일", heat: 1, lead: 3, note: "고정 기념일" },
    { date: "2027-05-05", name: "어린이날·가정의 달", kind: "공휴일", heat: 3, lead: 3, note: "2027 월력요항" },
    { date: "2027-07-20", name: "초복·바캉스", kind: "시즌", heat: 3, lead: 4, note: "2027 초복 7/20(화)" },
    { date: "2027-09-15", name: "추석", kind: "공휴일", heat: 3, lead: 4, note: "연휴 9/14~9/16, 추석 당일 9/15(수)" },
    { date: "2027-11-11", name: "빼빼로데이", kind: "기념일", heat: 2, lead: 2, note: "고정 기념일" },
    { date: "2027-11-18", name: "2028학년도 수능", kind: "공식", heat: 2, lead: 2, note: "교육부 발표 시행일" },
    { date: "2027-11-26", name: "블랙프라이데이", kind: "해외", heat: 3, lead: 3, note: "추수감사절 다음날" },
    { date: "2027-12-25", name: "크리스마스", kind: "공휴일", heat: 3, lead: 3, note: "2027 월력요항(대체 12/27)" }
  ],

  /* 틈새 키워드 조합에 쓰는 실제 어휘 (동곤 님 원천 DB·상세페이지에서 확인된 표현만) */
  keywordVocab: {
    grade: ["로얄과", "소과", "중과", "대과", "흠과 혼합"],
    origin: ["산지직송", "가정용", "벌크", "선물용", "세트"],
    quality: ["2/3 완숙", "무수거 환불", "당도 보장", "파손 보상"],
    alias: ["엔부사과", "피치애플", "청도 반시", "부유단감"],
    goods: ["컵홀더", "차량용 트레이", "텀블러", "보온 도시락"],
    b2g: ["사무용품", "복사용지", "탕비실", "수납가구", "조리기구", "단체복"]
  },

  /* 실제 운영 도메인 (HOSTING_MAP.md / operating-sites 기준) */
  domains: [
    { name: "공매물", url: "https://gongmaemul.co.kr", desc: "공매·경매 물건 공공데이터 포털", host: "GitHub Pages · gongmaemul-test" },
    { name: "다시출근", url: "https://dasijak.co.kr", desc: "중장년 재취업·일자리 정보", host: "카페24 워드프레스" },
    { name: "주말어디가", url: "https://weekendgo.co.kr", desc: "주말 나들이 장소 추천", host: "Vercel" },
    { name: "공공맛집", url: "https://publicfood.co.kr", desc: "공공기관 식당·맛집 데이터", host: "Vercel" },
    { name: "펫맵", url: "https://petmap.kr", desc: "반려동물 동반 장소 지도", host: "Vercel" },
    { name: "잘 있지?", url: "https://gongmaemul.co.kr/jalitji/", desc: "1인 가구 안부 확인 앱(늘봄상회)", host: "GitHub Pages" }
  ]
};
