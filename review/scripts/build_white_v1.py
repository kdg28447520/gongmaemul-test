from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
#!/usr/bin/env python3
import json
import re
from collections import defaultdict

with open(BASE_DIR / "live_data.json", "r", encoding="utf-8") as f:
    live = json.load(f)

raw_items = live["items"]
UPDATED_AT = live["updated_at"]

def norm_key(title: str) -> str:
    # [지역], [릴스], [클립], [서울은평구/30,000P] 등 대괄호 태그 제거 후 정규화
    t = re.sub(r"\[[^\]]+\]", "", title)
    t = re.sub(r"[^가-힣a-zA-Z0-9]", "", t).lower()
    return t[:14] if t else title

groups_map = defaultdict(list)
for item in raw_items:
    groups_map[norm_key(item["title"])].append(item)

grouped_items = []
for k, members in groups_map.items():
    # 미달 우선 + 경쟁률 낮은 순 정렬해 0번을 대표로
    members.sort(key=lambda x: (0 if x["shortage"] > 0 else 1, x["rate"], x["applied"]))
    rep = dict(members[0])
    # clean title (대괄호 채널 태그만 유지하거나 깔끔히)
    rep["variants"] = [
        {
            "id": m["id"],
            "source": m["source"],
            "category": m["category"],
            "channel": m["channel"],
            "title": m["title"],
            "dday": m["dday"],
            "applied": m["applied"],
            "target": m["target"],
            "rate": m["rate"],
            "shortage": m["shortage"],
            "url": m["url"],
        }
        for m in members
    ]
    rep["channels"] = list(dict.fromkeys(m["channel"] for m in members))
    rep["sources"] = list(dict.fromkeys(m["source"] for m in members))
    rep["has_shortage"] = any(m["shortage"] > 0 for m in members)
    grouped_items.append(rep)

# 대표 그룹도 미달 우선 + 경쟁률 낮은 순 정렬
grouped_items.sort(key=lambda x: (0 if x["has_shortage"] else 1, x["rate"], x["applied"]))

LIVE_JSON = json.dumps(grouped_items, ensure_ascii=False)
TOTAL_RAW = len(raw_items)
TOTAL_GROUPS = len(grouped_items)
SHORTAGE_GROUPS = sum(1 for x in grouped_items if x["has_shortage"])

HTML = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>ReviewPilot All-in-One — 대한민국 체험단 통합 관제센터</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css");
    body {{
      font-family: "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #F8FAFC;
      color: #0F172A;
      letter-spacing: -0.015em;
      -webkit-font-smoothing: antialiased;
    }}
  </style>
</head>
<body class="min-h-screen flex flex-col pb-20">

  <!-- ================= 1. 상단 글로벌 헤더 (화이트) ================= -->
  <header class="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <span class="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          <i class="fa-solid fa-compass"></i>
        </span>
        <span class="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">ReviewPilot<span class="text-sky-600">.</span>All-in-One</span>
        <span class="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
          중복 병합 · 실시간
        </span>
      </div>
      <div class="text-[11px] sm:text-xs text-slate-600 flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span class="font-medium">실시간 DB</span>
      </div>
    </div>
  </header>

  <!-- ================= 2. 메인 컨테이너 ================= -->
  <main class="max-w-5xl mx-auto w-full px-3.5 sm:px-4 py-5 flex-grow space-y-7">

    <!-- 히어로 배너 (화이트 클린 카드) -->
    <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2 mb-1.5">
            <span class="text-[10px] font-mono uppercase tracking-wider text-sky-700 font-bold">
              LIVE CAMPAIGN MONITOR · {UPDATED_AT}
            </span>
            <span class="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
              중복 병합 완료
            </span>
          </div>
          <h1 class="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            전국 체험단 실시간 통합 관제<br>
            <span class="text-sky-600">경쟁률 낮은 미달 공고부터 바로 신청하세요.</span>
          </h1>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            총 {TOTAL_RAW}건의 공고 중 같은 업체·상품은 카드 1장으로 묶었습니다. 카드를 누르면 열려 있는 채널·지역별 신청 버튼을 한 번에 볼 수 있습니다.
          </p>
        </div>

        <div class="shrink-0 grid grid-cols-2 sm:grid-cols-1 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center sm:text-right">
          <div>
            <span class="text-[11px] text-slate-500 block">고유 캠페인 ({TOTAL_RAW}건 통합)</span>
            <span class="text-lg font-extrabold text-slate-900">{TOTAL_GROUPS}개</span>
          </div>
          <div>
            <span class="text-[11px] text-emerald-700 block font-semibold">미달 포함 캠페인</span>
            <span class="text-lg font-extrabold text-emerald-600">{SHORTAGE_GROUPS}개</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 3. 국내 8대 대표 배송형 체험단 플랫폼 바로가기 ================= -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
          <i class="fa-solid fa-store text-sky-600"></i>
          <span>전국 8대 배송형 체험단 플랫폼</span>
          <span class="text-[11px] text-slate-400 font-normal">(탭하면 이동)</span>
        </h2>
        <span class="text-[11px] text-sky-600 font-semibold">배송형 특화 위주</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5" id="platformGrid"></div>
    </section>

    <!-- ================= 4. 실시간 공고 리스트 ================= -->
    <section class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200">
        <div>
          <h2 class="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
            <i class="fa-solid fa-bolt text-amber-500"></i>
            <span>실시간 체험단 공고</span>
            <span id="liveCountBadge" class="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-bold">미달 {SHORTAGE_GROUPS}개</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">미달 공고가 맨 앞에 먼저 표시되며, 같은 업체는 1장으로 묶여 있습니다.</p>
        </div>

        <!-- 필터 버튼 -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button onclick="filterCurated('all', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-sky-600 text-white shadow-sm">전체</button>
          <button onclick="filterCurated('shortage', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200">미달만</button>
          <button onclick="filterCurated('배송', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200">배송</button>
          <button onclick="filterCurated('맛집', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200">맛집</button>
          <button onclick="filterCurated('뷰티', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200">뷰티</button>
          <button onclick="filterCurated('여가', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200">여가</button>
          <button onclick="filterCurated('기자단', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200">기자단</button>
          <button onclick="filterCurated('릴스', this)" class="flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200">릴스·클립</button>
        </div>
      </div>

      <!-- 모바일 2열 / PC 4열 카드 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="curatedContainer"></div>

      <!-- 20개 페이징 -->
      <div id="pagination" class="flex items-center justify-center space-x-2 pt-3"></div>
    </section>

  </main>

  <!-- 원클릭 신청 화이트 모달 (채널/사이트 묶음 버튼 포함) -->
  <div id="applyModal" class="hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4">
    <div class="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <h3 class="font-bold text-sm text-slate-900">신청 가능한 경로 선택</h3>
        </div>
        <button onclick="closeModal()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 text-sm">✕</button>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <span id="modalSource" class="text-[11px] text-sky-600 font-semibold"></span>
          <p id="modalTitle" class="font-bold text-slate-900 text-sm mt-0.5"></p>
        </div>

        <!-- 묶인 채널/지역/사이트별 바로가기 목록 -->
        <div id="modalVariants" class="space-y-2"></div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-slate-500">신청 한마디 (복사 후 붙여넣기)</span>
            <button onclick="copyModalData()" class="text-sky-600 font-bold">복사하기</button>
          </div>
          <textarea id="modalAppeal" rows="2" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs outline-none focus:border-sky-500"></textarea>
        </div>

        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-500">
          수령인·배송지는 개인정보 보호를 위해 공개 페이지에 저장하지 않습니다.
        </div>
      </div>
    </div>
  </div>

  <script>
    const PLATFORMS = [
      {{"name": "체험인", "badge": "실시간 연동", "desc": "인포크링크 연계 · 배송형 미달 꿀템 다수", "deliveryRate": "배송형 60%", "url": "https://cheheomin.com/delivery"}},
      {{"name": "스타일씨", "badge": "배송형 1위", "desc": "모집 공고의 94%가 전국 무료 배송형", "deliveryRate": "배송형 94%", "url": "https://style-c.co.kr/"}},
      {{"name": "택배의여왕", "badge": "100% 무료배송", "desc": "밀키트·간식·뷰티 전국 무료 택배 전문", "deliveryRate": "배송형 100%", "url": "https://dinnerqueen.net/"}},
      {{"name": "클라우드리뷰", "badge": "구매평 특화", "desc": "SNS 없이 참여 가능한 쿠팡·네이버 구매평", "deliveryRate": "구매평 100%", "url": "https://cloudreview.co.kr/"}},
      {{"name": "리뷰플레이스", "badge": "종합 4위", "desc": "고단가 건강·생활용품 및 구매형 체험단", "deliveryRate": "배송형 48%", "url": "https://www.reviewplace.co.kr/"}},
      {{"name": "리뷰노트", "badge": "국내 1위", "desc": "월간 방문자 320만 · 최다 캠페인 보유", "deliveryRate": "종합형", "url": "https://www.reviewnote.co.kr/"}},
      {{"name": "파블로체험단", "badge": "식품 특화", "desc": "반려동물, 유아동, 식품 세분화", "deliveryRate": "배송형 27%", "url": "https://pabloce.com/"}},
      {{"name": "똑똑리워드", "badge": "숏폼 특화", "desc": "카톡 간편 신청 · 인스타 릴스 및 구매평", "deliveryRate": "숏폼 특화", "url": "https://ddok.it/"}}
    ];

    const CURATED = {LIVE_JSON};
    const PAGE_SIZE = 20;
    let activeFilter = 'all';
    let currentPage = 1;

    function renderPlatforms() {{
      const grid = document.getElementById('platformGrid');
      grid.innerHTML = PLATFORMS.map(p => `
        <a href="${{p.url}}" target="_blank" class="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-sky-300 rounded-xl transition flex flex-col justify-between group shadow-xs">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-slate-900 group-hover:text-sky-600 transition">${{p.name}}</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">${{p.badge}}</span>
            </div>
            <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">${{p.desc}}</p>
          </div>
          <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span class="text-sky-600 font-semibold">${{p.deliveryRate}}</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-sky-600"></i>
          </div>
        </a>
      `).join('');
    }}

    function getFiltered() {{
      if (activeFilter === 'all') return CURATED;
      if (activeFilter === 'shortage') return CURATED.filter(c => c.has_shortage);
      if (activeFilter === '릴스') return CURATED.filter(c => c.channels.includes('릴스') || c.channels.includes('클립'));
      return CURATED.filter(c => c.variants.some(v => v.category.includes(activeFilter)));
    }}

    function renderCurated() {{
      const list = getFiltered();
      const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;
      const slice = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

      const container = document.getElementById('curatedContainer');
      if (slice.length === 0) {{
        container.innerHTML = `<div class="col-span-full py-10 text-center text-xs text-slate-500">해당 조건의 공고가 없습니다.</div>`;
      }} else {{
        container.innerHTML = slice.map(item => {{
          const vCount = item.variants.length;
          const chText = item.channels.join('·');
          return `
            <div class="bg-white border border-slate-200 hover:border-sky-300 rounded-2xl overflow-hidden transition shadow-sm flex flex-col justify-between cursor-pointer" onclick="openModal('${{item.id}}')">
              <div>
                <div class="relative aspect-square bg-slate-100 overflow-hidden">
                  <img src="${{item.img}}" alt="${{item.title}}" loading="lazy" class="w-full h-full object-cover" />
                  ${{item.shortage > 0
                    ? `<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow">${{item.shortage}}명 미달</span>`
                    : `<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-slate-700 text-[10px] font-semibold shadow">${{item.dday}}</span>`
                  }}
                  ${{vCount > 1
                    ? `<span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">${{vCount}}개 경로</span>`
                    : ''
                  }}
                </div>
                <div class="p-2.5 sm:p-3 space-y-1">
                  <div class="flex items-center justify-between text-[10px] gap-1">
                    <span class="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold truncate">${{item.category}} · ${{chText}}</span>
                    <span class="shrink-0 font-bold text-slate-700">${{item.applied}}/${{item.target}}명</span>
                  </div>
                  <h3 class="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">${{item.title}}</h3>
                </div>
              </div>
              <div class="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1 flex items-center justify-between text-[11px] border-t border-slate-100">
                <span class="text-slate-500 truncate">${{item.sources.join('·')}} · ${{item.rate}}%</span>
                <span class="shrink-0 text-sky-600 font-bold ml-1">신청 →</span>
              </div>
            </div>
          `;
        }}).join('');
      }}

      const pag = document.getElementById('pagination');
      if (totalPages <= 1) {{
        pag.innerHTML = '';
      }} else {{
        pag.innerHTML = Array.from({{length: totalPages}}, (_, i) => i + 1).map(p => `
          <button onclick="currentPage=${{p}}; renderCurated(); window.scrollTo({{top:0, behavior:'smooth'}});"
            class="w-8 h-8 rounded-full text-xs font-bold transition ${{p === currentPage ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}}">
            ${{p}}
          </button>
        `).join('');
      }}
    }}

    function filterCurated(type, btn) {{
      activeFilter = type;
      currentPage = 1;
      document.querySelectorAll('.flt-btn').forEach(b => {{
        b.className = 'flt-btn px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200';
      }});
      if (btn) btn.className = 'flt-btn px-3 py-1.5 rounded-lg bg-sky-600 text-white shadow-sm';
      renderCurated();
    }}

    function openModal(id) {{
      const item = CURATED.find(c => c.id === id);
      if (!item) return;
      document.getElementById('modalTitle').innerText = item.title;
      document.getElementById('modalSource').innerText = `${{item.sources.join(' · ')}} · 총 ${{item.variants.length}}개 신청 경로`;
      document.getElementById('modalAppeal').value = `[체험 신청] 제품 특징과 실사용 모습을 깔끔한 사진/영상으로 정성껏 리뷰하겠습니다.`;

      document.getElementById('modalVariants').innerHTML = item.variants.map(v => `
        <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
          <div class="min-w-0">
            <div class="flex items-center space-x-1.5">
              <span class="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">${{v.source}}</span>
              <span class="px-1.5 py-0.5 rounded bg-sky-50 text-[10px] font-bold text-sky-700">${{v.channel}}</span>
              ${{v.shortage > 0
                ? `<span class="text-[10px] font-bold text-rose-600">${{v.shortage}}명 미달</span>`
                : `<span class="text-[10px] text-slate-500">${{v.dday}}</span>`
              }}
            </div>
            <p class="text-[11px] text-slate-700 truncate mt-1">${{v.title}} (${{v.applied}}/${{v.target}}명)</p>
          </div>
          <a href="${{v.url}}" target="_blank" class="shrink-0 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg transition">
            신청
          </a>
        </div>
      `).join('');

      document.getElementById('applyModal').classList.remove('hidden');
    }}

    function closeModal() {{
      document.getElementById('applyModal').classList.add('hidden');
    }}

    function copyModalData() {{
      navigator.clipboard.writeText(document.getElementById('modalAppeal').value);
      alert('신청 사유 문구가 복사되었습니다.');
    }}

    window.onload = function() {{
      renderPlatforms();
      renderCurated();
    }};
  </script>
</body>
</html>
"""

with open(BASE_DIR / "index.html", "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"built grouped white v1: {TOTAL_RAW} raw -> {TOTAL_GROUPS} groups (shortage: {SHORTAGE_GROUPS})")
