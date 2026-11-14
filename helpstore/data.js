/* 동곤 헬프스토어 PRO — 실제 원천 DB
   모든 수치는 워크스페이스 원천 자료에서 옮겨 적었고, 출처를 함께 보관한다.
   근거가 없는 값은 아예 넣지 않는다(빈칸 = 사용자가 직접 입력). */
window.HSDB = {
  meta: {
    built: "2026-11-14",
    sourceNote: "원천: materials/wholesale_suppliers_9.md, materials/wholesale_suppliers_master.md(도매몰 54곳 통합·2026-11-14 URL 실측), memory/topics/business-ventures/docs/{november-sourcing-top10.md,coupang-fruit.md}, gongmaemul-repo/growth-calc/index.html, materials/miracle/",
    supplierNote: "도매몰 54곳은 downloads/rocketgrowth_challenge/wholesale_malls.txt(38곳)와 기존 9선을 합치고 중복을 제거한 수. URL 접속 확인은 2026-11-14. 가격 '공개'는 비회원도 단가를 볼 수 있는 몰을 뜻한다.",
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

  /* 위탁·B2G 도매처 9선 (기존 원천 유지) */
  suppliers9: [
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

  /* 국내 도매몰 통합 마스터 (54곳 + 1688) — 원천: materials/wholesale_suppliers_master.md (2026-11-14)
     kind: 사입 / 위탁 / 승인(사업자 승인 필요) / 회원
     price: 공개(비회원도 단가 확인) / 회원공개 / 인증후(사업자 인증 후 확인)
     req: 가입·거래 자격 요건
     live: 2026-11-14 접속 확인 여부 */
  supplierGroups: [
    { id: "all", label: "전체" },
    { id: "general", label: "종합" },
    { id: "stationery", label: "문구·사무" },
    { id: "snack", label: "과자·간식" },
    { id: "living", label: "생활·주방" },
    { id: "interior", label: "인테리어·선물" },
    { id: "character", label: "캐릭터·팬시" },
    { id: "sports", label: "스포츠" },
    { id: "fashion", label: "패션·가방" },
    { id: "consign", label: "위탁 전문" },
    { id: "licensed", label: "자격 필요" },
    { id: "china", label: "중국 소싱" }
  ],
  suppliersMaster: [
    { no: 1, name: "도매꾹", group: "general", cat: "종합 5만+종", url: "https://domeggook.com", kind: "사입", price: "공개", req: "구매 시 회원", live: true, tip: "국내 최대. 1~10개 소량 판매 상품이 많아 첫 사입처로 최적, 상품마다 MOQ·배송비 표기", b2g: "공산품 전반" },
    { no: 2, name: "도매토피아", group: "general", cat: "종합 생활용품", url: "https://dometopia.com", kind: "사입·위탁", price: "회원공개", req: "사업자 회원", live: true, tip: "무료 위탁배송·1개 직발송 병행", b2g: "공산품·판촉물" },
    { no: 3, name: "이지마켓B2B", group: "general", cat: "종합", url: "https://ezmarketb2b.com", kind: "사입·위탁", price: "회원공개", req: "사업자 회원", live: true, tip: "위탁판매·상품DB 제공 (㈜커넥트어센드)", b2g: "공산품 전반" },
    { no: 4, name: "필우커머스", group: "general", cat: "생활잡화·스포츠·휴대폰·산업", url: "https://www.feelwoo.com", kind: "사입", price: "회원공개", req: "사업자 회원 전용", live: true, tip: "사내 창고 실재고만 등록, 품절 잦음", b2g: "산업용품·생활잡화" },
    { no: 5, name: "젠트레이드", group: "general", cat: "생활·주방·문구·디지털", url: "https://zentrade.cafe24.com", kind: "사입", price: "회원공개", req: "사업자등록증 보유 소매업체", live: true, tip: "낱개·소박스·박스 주문 단위, 일부 실시간 재고", b2g: "사무·생활 비품" },
    { no: 6, name: "바나나B2B", group: "general", cat: "종합(패션·유아·스포츠·가구·가전)", url: "https://bananab2b.shop", kind: "사입·위탁", price: "회원공개", req: "사업자 회원", live: true, tip: "상품별 판매 가능 채널(오픈마켓/폐쇄몰) 표기 — 쿠팡 판매 금지 상품을 미리 걸러냄", b2g: "공산품 전반" },
    { no: 7, name: "이음몰(도매창고)", group: "general", cat: "종합", url: "", kind: "사입", price: "회원공개", req: "사업자 회원", live: false, tip: "원문 표기 '도매창고'. 공식 도메인 미확인", b2g: "공산품 전반" },
    { no: 8, name: "플라라 PLALA", group: "general", cat: "주방·생활용품", url: "https://mocacorp.cafe24.com", kind: "사입", price: "회원공개", req: "사업자 회원 전용", live: true, tip: "하코야·코멕스·르베르폴리세 등 브랜드 주방. 권장판매가 정책 있음", b2g: "구내식당·조리기구" },
    { no: 9, name: "싸요꾹", group: "general", cat: "판촉물·생활잡화", url: "https://ssayoggook.com", kind: "사입", price: "공개", req: "없음", live: true, tip: "소비자가·도매가 동시 노출. 파라솔·방석·주방잡화 등", b2g: "행사 판촉물" },
    { no: 10, name: "천유닷컴(더천유)", group: "stationery", cat: "디자인 문구·캐릭터 소품", url: "https://www.cheonyu.com", kind: "사입·위탁", price: "회원공개", req: "도매 회원", live: true, tip: "약 4만 SKU·3,500평 물류. 3만원 이상 무료배송(주소 등록 조건). 원문 1000u.com은 cheonyu.com으로 통합", b2g: "돌봄교실·어린이집 교구" },
    { no: 11, name: "알파문구 B2B", group: "stationery", cat: "학용품·사무문구", url: "https://www.alpha.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "전국 체인망 표준 브랜드 문구", b2g: "관공서 사무용품 1순위" },
    { no: 12, name: "오피스디포 B2B", group: "stationery", cat: "사무용품·오피스 MRO", url: "https://www.officedepot.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: null, tip: "복사용지·토너·탕비실 다과, 견적서 발행 최적", b2g: "안산시청·구청 총무과" },
    { no: 13, name: "문구랜드(승진문구유통)", group: "stationery", cat: "문구 전반·수입 필기구", url: "https://munguland.com", kind: "사입", price: "공개", req: "없음", live: true, tip: "종로5가 60년 도매. 소비자가·판매가 동시 노출로 단가 검증 즉시 가능", b2g: "사무용품 소액수의" },
    { no: 14, name: "펜도매 PENDOMAE", group: "stationery", cat: "수입 필기구·각인", url: "https://pendomae.co.kr", kind: "사입", price: "공개", req: "없음", live: true, tip: "㈜대전문구몰. 제브라·스테들러·유니 정품 + 각인 서비스", b2g: "기념품·수상품" },
    { no: 15, name: "라라팬시 B2B(라라비투비)", group: "stationery", cat: "문구·팬시·사무·생활", url: "", kind: "사입·위탁", price: "회원공개", req: "사업자 회원", live: false, tip: "원문 표기만 있고 공식 도메인 미확인", b2g: "사무·생활 비품" },
    { no: 16, name: "초이템", group: "stationery", cat: "여성의류·생활·문구", url: "https://choitemb2b.com", kind: "사입·위탁", price: "회원공개", req: "사업자 회원", live: true, tip: "'리빙공감' 자체 브랜드 생활잡화 라인(욕실·수납·청소)", b2g: "생활 비품" },
    { no: 17, name: "머깨비도매몰", group: "snack", cat: "수입과자", url: "http://mkbe.co.kr", kind: "사입", price: "인증후", req: "사업자 인증", live: null, tip: "㈜유앤아이글로벌. 소비기한·구매수량 노출", b2g: "탕비실" },
    { no: 18, name: "하이코퍼레이션(현동몰)", group: "snack", cat: "수입·국내과자", url: "https://www.hicorporation.co.kr", kind: "사입", price: "인증후", req: "사업자 인증", live: true, tip: "원문 '제일쌈'. 10만원 무료배송, 소분 특약", b2g: "탕비실" },
    { no: 19, name: "삼원유통", group: "snack", cat: "국내·수입과자", url: "https://www.15774281.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "과자 도매", b2g: "탕비실" },
    { no: 20, name: "까까무까", group: "snack", cat: "과자 도매", url: "https://kakamuka.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "과자 도매전문 유통몰", b2g: "탕비실" },
    { no: 21, name: "스낵오케이", group: "snack", cat: "과자·음료·라면 특가", url: "https://www.snackok.com", kind: "사입", price: "공개", req: "없음", live: true, tip: "개인 구매도 가능한 할인몰", b2g: "탕비실" },
    { no: 22, name: "떠리몰", group: "snack", cat: "간식·먹거리", url: "https://thirtymall.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "간식 도매", b2g: "탕비실" },
    { no: 23, name: "과자몰(cookieall)", group: "snack", cat: "과자", url: "https://cookieall.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "과자 전문몰", b2g: "탕비실" },
    { no: 24, name: "삼봉몰", group: "snack", cat: "옛날식품·과자", url: "https://3bong.kr", kind: "사입", price: "회원공개", req: "사업자 전용", live: true, tip: "'사업자 전용 도매몰' 명시", b2g: "탕비실" },
    { no: 25, name: "또요몰(또요상회)", group: "snack", cat: "중국간식·수입과자", url: "https://douyoudouyou.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "중국간식 도매", b2g: "탕비실" },
    { no: 26, name: "임박몰", group: "snack", cat: "유통기한 임박", url: "https://www.imbak.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "소비기한 리스크 — 로켓그로스 입고 부적합", b2g: "비권장" },
    { no: 27, name: "이유몰", group: "snack", cat: "임박상품 최대 99%", url: "https://www.eyoumall.co.kr", kind: "사입", price: "공개", req: "없음", live: true, tip: "소비자몰 성격. 임박 상품", b2g: "비권장" },
    { no: 28, name: "준도메", group: "snack", cat: "과자", url: "https://www.jundome.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: null, tip: "원문 URL만 기재", b2g: "탕비실" },
    { no: 29, name: "이디나 B2B", group: "living", cat: "주방용품·식기", url: "http://www.edina.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: null, tip: "프라이팬·냄비·주방 소모품 대량 도매", b2g: "구내식당·복지관 조리기구" },
    { no: 30, name: "필 국제무역", group: "living", cat: "주방·식기·수입잡화", url: "http://www.philtrade.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: null, tip: "해외 직수입 주방용품·식당 집기", b2g: "단체급식 비품" },
    { no: 31, name: "핑크돼지도매", group: "living", cat: "생활·청소·욕실 잡화", url: "http://www.pinkpig.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: false, tip: "2026-11-14 접속 실패 — 재확인 필요", b2g: "청소용역 소모품" },
    { no: 32, name: "리빙츄", group: "living", cat: "휴대폰케이스·생활·주방", url: "http://livingchu.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: null, tip: "갤럭시·아이폰 케이스, 워치 스트랩, DIY 유화 세트", b2g: "생활 비품" },
    { no: 33, name: "데이즈하우스", group: "living", cat: "식기류·주방", url: "https://dayshouse.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "식기 중심 — 식품용 기구 적합표시 확인 필요", b2g: "구내식당 식기" },
    { no: 34, name: "클릭몰", group: "living", cat: "PC방·카페·냉동식품·간식", url: "https://www.clickmall.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "업소용 먹거리·소모품", b2g: "비권장(식품)" },
    { no: 35, name: "소소홈", group: "interior", cat: "인테리어 소품·패브릭·주방", url: "https://sosohome.co.kr", kind: "사입·위탁", price: "회원공개", req: "사업자 회원", live: true, tip: "최소주문 없음·배송비 3,300원(20만원 이상 무료). 최저판매가 준수 규정", b2g: "복지관 비품" },
    { no: 36, name: "롤링페이퍼", group: "interior", cat: "감성 소품·악세사리", url: "https://www.rollringpaper.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "'쿠팡판매 금지상품' 표기 제품 존재 — 등록 전 필수 확인", b2g: "선물·판촉" },
    { no: 37, name: "오송유통", group: "interior", cat: "가구·수납·인테리어", url: "http://www.osongmall.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: null, tip: "조립식 선반·수납장·사무의자. 부피 커 초기 로켓그로스 부적합", b2g: "주민센터·도서관 서가" },
    { no: 38, name: "갓샵B2B", group: "interior", cat: "핸드메이드·선물·캐릭터 굿즈", url: "https://godshopb2b.co.kr", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "5만원 이상 무료배송. 달력·키링·디퓨저 기획상품", b2g: "기념품" },
    { no: 39, name: "알로하TD", group: "character", cat: "캐릭터 소품·문구", url: "https://aloha-td.com", kind: "사입·위탁", price: "회원공개", req: "사업자등록증 승인", live: true, tip: "상품별 MOQ 10~40개. 정품 라이선스만, 이미지 사용은 허가 아이콘 상품만", b2g: "기념품" },
    { no: 40, name: "디어몰", group: "character", cat: "캐릭터 소품·피규어", url: "https://dear-mmmmall.com", kind: "사입", price: "회원공개", req: "도매 회원", live: true, tip: "짱구·산리오 등 캐릭터 중심", b2g: "기념품" },
    { no: 41, name: "두리랑아트", group: "character", cat: "캐릭터 봉제인형·키링", url: "https://doorirang.com", kind: "사입", price: "회원공개", req: "도매 회원", live: true, tip: "미니키링(8~10cm) 라인 다수 — 소형·경량", b2g: "기념품" },
    { no: 42, name: "장난감·팬시 B2B", group: "character", cat: "장난감·팬시", url: "", kind: "사입", price: "회원공개", req: "사업자 회원", live: false, tip: "원문에 상호 미기재", b2g: "교구" },
    { no: 43, name: "온스포츠", group: "sports", cat: "스포츠 브랜드(나이키·훌리건)", url: "https://onsports.co.kr", kind: "사입", price: "회원공개", req: "B2B 회원(사업자등록증)", live: true, tip: "정품/병행 구분 표기. 30만원 미만 배송비 3,000원", b2g: "체육 비품" },
    { no: 44, name: "대연이엔티", group: "sports", cat: "요가·피트니스·구기·라켓", url: "", kind: "사입", price: "회원공개", req: "사업자 회원 승인", live: false, tip: "아디다스·버터플라이·챔피온 유통. 사이트 도메인 미노출", b2g: "체육 비품" },
    { no: 45, name: "MCN B2B", group: "sports", cat: "스포츠의류 제작(사이클 강점)", url: "", kind: "사입", price: "회원공개", req: "비즈니스 회원 전용", live: false, tip: "퀄리티 좋으나 단가 높음 — 첫 테스트 부적합", b2g: "단체복" },
    { no: 46, name: "남도마켓", group: "fashion", cat: "동대문·남대문 패션", url: "https://ndmarket.co.kr", kind: "사입·위탁", price: "회원공개", req: "사업자 회원", live: null, tip: "사입/위탁 연동", b2g: "단체복·조끼·안전모" },
    { no: 47, name: "도매찜", group: "fashion", cat: "의류 생산 도매", url: "http://www.domejjim.com", kind: "사입", price: "회원공개", req: "사업자 회원", live: true, tip: "양산 물류센터 + 중국지사. 옵션 많아 초보 부적합", b2g: "단체복" },
    { no: 48, name: "어이사마켓", group: "fashion", cat: "중국 패션(1688 연동)", url: "https://uh2samarket.com", kind: "사입", price: "공개", req: "사업자·개인", live: true, tip: "1688·VVIC·HZNZCN 실시간 연동. 결제~입고 3~4주", b2g: "비권장" },
    { no: 49, name: "가방쟁이", group: "fashion", cat: "가방 도매", url: "https://gabangjangii.cafe24.com", kind: "사입", price: "회원공개", req: "도매 회원", live: true, tip: "GENOVA·OZUKO 등 브랜드 가방", b2g: "비권장" },
    { no: 50, name: "스페셜오퍼", group: "consign", cat: "리빙·주방·건강", url: "https://specialoffer.kr", kind: "위탁", price: "회원공개", req: "판매회원(사업자·개인)", live: true, tip: "전상품 위탁배송 + 엑셀·CSV 상품DB. 로켓그로스 불가", b2g: "비권장" },
    { no: 51, name: "고고비투비", group: "consign", cat: "건강식품·생활·주방·캠핑", url: "https://gogob2b.co.kr", kind: "위탁", price: "회원공개", req: "사업자 회원", live: true, tip: "위탁판매·공동구매·기업특판. 배송비 3,000~24,000원", b2g: "판촉·사은품" },
    { no: 52, name: "하이메디넷", group: "licensed", cat: "의료기기", url: "https://www.himedinet.com", kind: "사입", price: "회원공개", req: "의료기기판매업 신고증", live: false, tip: "자격 없으면 가입 불가 — 첫 테스트 제외", b2g: "비권장" },
    { no: 53, name: "건강산", group: "licensed", cat: "건강기능식품", url: "", kind: "사입", price: "회원공개", req: "건강기능식품 판매업 신고", live: false, tip: "자격 필요 — 첫 테스트 제외", b2g: "비권장" },
    { no: 54, name: "1688(알리바바)", group: "china", cat: "중국 내수 도매", url: "https://www.1688.com", kind: "사입", price: "공개", req: "중국 계정", live: null, tip: "결제→통관→입고 3~4주. 국내 도매로 구조를 익힌 뒤 진입", b2g: "비권장" }
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
