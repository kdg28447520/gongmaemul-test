#!/usr/bin/env python3
import json
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=12) as resp:
        return resp.read().decode("utf-8", "ignore")

def safe_fetch(url: str) -> tuple[str, str]:
    try:
        return url, fetch_html(url)
    except Exception:
        return url, ""

def parse_dinnerqueen() -> list[dict]:
    items = []
    seen = set()
    urls = ["https://dinnerqueen.net/taste"] + [
        f"https://dinnerqueen.net/taste?ct={urllib.parse.quote(ct)}&page={p}"
        for ct in ("배송", "릴스", "맛집", "뷰티", "여가", "기자단", "기타")
        for p in (1, 2, 3, 4)
    ]
    with ThreadPoolExecutor(max_workers=10) as ex:
        pages = list(ex.map(safe_fetch, urls))

    for _, html in pages:
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select('a[href^="/taste/"]'):
            href = a.get("href", "")
            if not re.match(r"^/taste/\d+$", href) or href in seen:
                continue
            card = a.parent
            for _ in range(4):
                if card and card.find("img") and "신청" in card.get_text():
                    break
                card = card.parent if card else None
            if not card:
                continue
            img = card.find("img")
            src = (img.get("src") or img.get("data-src") or "") if img else ""
            if "imgs.diq.kr" not in src or "banner" in src:
                continue
            seen.add(href)
            raw_parts = [t.strip() for t in card.stripped_strings if t.strip() not in ("★", "[", "]", "/")]
            text_all = card.get_text(" ", strip=True)
            m_cnt = re.search(r"신청\s*([\d,]+)\s*/\s*([\d,]+)", text_all)
            applied = int(m_cnt.group(1).replace(",", "")) if m_cnt else 0
            target = int(m_cnt.group(2).replace(",", "")) if m_cnt else 0
            m_dday = re.search(r"(오늘까지|\d+\s*일\s*남음)", text_all)
            dday = m_dday.group(1).replace(" ", "") if m_dday else "모집중"

            channel = "블로그"
            for ch in ("릴스", "유튜브", "인스타", "쇼츠", "클립", "랜덤픽"):
                if ch in raw_parts:
                    channel = ch
                    break
            cat = "배송"
            for c in ("배송", "맛집", "뷰티", "생활", "식품", "여가", "기자단", "문화"):
                if c in raw_parts:
                    cat = c
                    break

            alt = (img.get("alt") or "").strip()
            title = alt
            if not title or len(title) < 4:
                cands = [p for p in raw_parts if len(p) >= 6 and "신청" not in p and "남음" not in p and p not in (channel, cat, "오늘까지")]
                title = max(cands, key=len) if cands else "체험단 캠페인"

            rate = round((applied / target) * 100) if target > 0 else 999
            shortage = max(0, target - applied)
            items.append({
                "id": f"dq_{href.split('/')[-1]}",
                "source": "디너의여왕",
                "category": cat,
                "channel": channel,
                "title": title,
                "dday": dday,
                "applied": applied,
                "target": target,
                "rate": rate,
                "shortage": shortage,
                "img": src,
                "url": f"https://dinnerqueen.net{href}",
            })
    return items

def parse_reviewplace() -> list[dict]:
    items = []
    seen = set()
    jobs = [
        (ct, f"https://www.reviewplace.co.kr/pr/?ct1={urllib.parse.quote(ct)}&page={p}")
        for ct in ("제품", "기자단", "지역")
        for p in (1, 2, 3, 4)
    ]
    with ThreadPoolExecutor(max_workers=10) as ex:
        pages = list(ex.map(lambda j: (j[0], safe_fetch(j[1])[1]), jobs))

    for ct, html in pages:
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select('a[href*="/pr/?id="], a[href*="pr_id="], a[href*="/pr/"]'):
            href = a.get("href", "")
            m_id = re.search(r"id=(\d+)", href)
            if not m_id:
                continue
            cid = m_id.group(1)
            if cid in seen:
                continue
            card = a.parent
            for _ in range(4):
                if card and card.find("img") and ("신청" in card.get_text() or "모집" in card.get_text()):
                    break
                card = card.parent if card else None
            if not card:
                continue
            img = card.find("img")
            src = (img.get("src") or img.get("data-src") or "") if img else ""
            if not src or src.startswith("data:") or "logo" in src:
                continue
            if src.startswith("/"):
                src = "https://www.reviewplace.co.kr" + src
            seen.add(cid)
            txt = card.get_text(" ", strip=True)
            m_cnt = re.search(r"신청\s*([\d,]+)\s*/\s*([\d,]+)", txt)
            if not m_cnt:
                m_cnt = re.search(r"([\d,]+)\s*/\s*([\d,]+)\s*명", txt)
            applied = int(m_cnt.group(1).replace(",", "")) if m_cnt else 0
            target = int(m_cnt.group(2).replace(",", "")) if m_cnt else 10
            m_dday = re.search(r"(오늘마감|\d+일\s*남음|D-\d+)", txt)
            dday = m_dday.group(1).replace(" ", "") if m_dday else "모집중"
            title = (img.get("alt") or "").strip()
            if len(title) < 4:
                lines = [s.strip() for s in card.stripped_strings if len(s.strip()) >= 6 and "신청" not in s and "남음" not in s]
                title = lines[0] if lines else "리뷰플레이스 체험단"
            channel = "인스타" if "인스타" in txt else ("릴스" if "릴스" in txt else "블로그")
            rate = round((applied / target) * 100) if target > 0 else 999
            shortage = max(0, target - applied)
            full_url = href if href.startswith("http") else ("https://www.reviewplace.co.kr" + (href if href.startswith("/") else "/pr/" + href))
            cat = "배송" if ct == "제품" else ("기자단" if ct == "기자단" else "맛집")
            items.append({
                "id": f"rp_{cid}",
                "source": "리뷰플레이스",
                "category": cat,
                "channel": channel,
                "title": title,
                "dday": dday,
                "applied": applied,
                "target": target,
                "rate": rate,
                "shortage": shortage,
                "img": src,
                "url": full_url,
            })
    return items

def main():
    all_items = parse_dinnerqueen() + parse_reviewplace()
    all_items.sort(key=lambda x: (0 if x["shortage"] > 0 else 1, x["rate"], x["applied"]))
    out = {
        "updated_at": datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d %H:%M"),
        "count": len(all_items),
        "items": all_items,
    }
    out_path = Path(__file__).resolve().parent / "live_data.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"fetched {len(all_items)} items, shortage>0: {sum(1 for x in all_items if x['shortage'] > 0)}")
    from collections import Counter
    print("by source:", Counter(x["source"] for x in all_items))
    print("by category:", Counter(x["category"] for x in all_items))

if __name__ == "__main__":
    main()
