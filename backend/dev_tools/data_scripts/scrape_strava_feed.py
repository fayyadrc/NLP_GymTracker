#!/usr/bin/env python3
"""
Scrape recent activities from your Strava profile feed (no API required).

Extracts per activity: duration, avg heart rate, and calories — the same
fields shown on each feed card (Time / Avg HR / Cal).

One-time setup:
    pip install playwright
    playwright install chromium

Get your session cookie:
    1. Log in to strava.com in your browser
    2. DevTools → Application → Cookies → strava.com → _strava4_session
    3. Add to backend/.env:
       STRAVA_SESSION_COOKIE=<paste value here>
       STRAVA_ATHLETE_ID=<your numeric athlete id from profile URL>
       STRAVA_SCRAPE_AFTER=2026-06-30

Usage:
    python backend/dev_tools/data_scripts/scrape_strava_feed.py
    python backend/dev_tools/data_scripts/scrape_strava_feed.py --dry-run
    python backend/dev_tools/data_scripts/scrape_strava_feed.py --after 2026-06-30
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

STRAVA_BASE = "https://www.strava.com"
FEED_SELECTOR = '[data-testid="web-feed-entry"]'
DEFAULT_AFTER_DATE = os.getenv("STRAVA_SCRAPE_AFTER", "2026-06-30")

# Columns accepted by strava_activities (matches live Supabase schema).
TABLE_COLUMNS = (
    "id",
    "name",
    "type",
    "start_date",
    "distance_meters",
    "duration_seconds",
    "elevation_gain",
    "avg_speed_mps",
    "max_speed_mps",
    "avg_heartrate",
    "max_heartrate",
    "avg_cadence",
    "avg_temp",
    "calories",
)


def parse_duration(value: str) -> int | None:
    """Parse human-readable durations like '1h 36m' or '52m 44s' into seconds."""
    if not value:
        return None

    total = 0
    hours = re.search(r"(\d+)\s*h", value, re.I)
    minutes = re.search(r"(\d+)\s*m", value, re.I)
    seconds = re.search(r"(\d+)\s*s", value, re.I)

    if hours:
        total += int(hours.group(1)) * 3600
    if minutes:
        total += int(minutes.group(1)) * 60
    if seconds:
        total += int(seconds.group(1))

    return total if total > 0 else None


def parse_after_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"Invalid date '{value}'. Use YYYY-MM-DD.") from exc


def parse_start_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        pass

    for fmt in ("%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue

    lowered = value.strip().lower()
    today = datetime.now(timezone.utc).date()
    if lowered == "today":
        return today
    if lowered == "yesterday":
        return today - timedelta(days=1)

    return None


def extract_date_from_text(text: str) -> date | None:
    patterns = [
        r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}",
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}",
        r"\b(Today|Yesterday)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            parsed = parse_start_date(match.group(0))
            if parsed:
                return parsed
    return None


def _value_after_label(text: str, label: str) -> str | None:
    match = re.search(rf"{re.escape(label)}\s*(?:\n|\s)*([^\n]+)", text, re.I)
    return match.group(1).strip() if match else None


def parse_stat_block(text: str) -> dict[str, Any]:
    """Pull Time, Avg HR, and Cal values from a feed card's visible text."""
    stats: dict[str, Any] = {}

    time_val = _value_after_label(text, "Time")
    if time_val:
        stats["duration_seconds"] = parse_duration(time_val)

    hr_val = _value_after_label(text, "Avg HR")
    if hr_val:
        hr_match = re.search(r"(\d+)", hr_val)
        if hr_match:
            stats["avg_heartrate"] = int(hr_match.group(1))

    cal_val = _value_after_label(text, "Cal")
    if cal_val:
        cal_match = re.search(r"(\d+)", cal_val)
        if cal_match:
            stats["calories"] = int(cal_match.group(1))

    return stats


def to_db_record(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Map scraped feed data to the strava_activities table shape."""
    activity_id = raw.get("id")
    if not activity_id:
        return None

    stats = parse_stat_block(raw.get("text", ""))
    start_date = raw.get("start_date")
    if not start_date:
        text_date = extract_date_from_text(raw.get("text", ""))
        if text_date:
            start_date = datetime.combine(text_date, datetime.min.time(), tzinfo=timezone.utc).isoformat()

    return {
        "id": activity_id,
        "name": raw.get("name") or "Unknown",
        "type": raw.get("type") or "Workout",
        "start_date": start_date,
        "distance_meters": 0,
        "duration_seconds": stats.get("duration_seconds") or 0,
        "elevation_gain": 0,
        "avg_speed_mps": 0,
        "max_speed_mps": 0,
        "avg_heartrate": stats.get("avg_heartrate"),
        "max_heartrate": None,
        "avg_cadence": None,
        "avg_temp": None,
        "calories": stats.get("calories"),
    }


def sanitize_for_db(record: dict[str, Any]) -> dict[str, Any] | None:
    """Keep only known columns and apply DB null/default conventions."""
    if not record.get("start_date"):
        return None

    clean = {key: record.get(key) for key in TABLE_COLUMNS}

    # Numeric fields the table stores as 0 when unknown.
    for key in ("distance_meters", "duration_seconds", "elevation_gain", "avg_speed_mps", "max_speed_mps"):
        if clean.get(key) is None:
            clean[key] = 0

    # Optional metrics stay null when missing.
    for key in ("avg_heartrate", "max_heartrate", "avg_cadence", "avg_temp", "calories"):
        if clean.get(key) is None:
            clean[key] = None

    return clean


EXTRACT_FEED_JS = """
() => {
  const entries = [...document.querySelectorAll('[data-testid="web-feed-entry"]')];
  return entries.map((entry) => {
    const activityLink = entry.querySelector('a[href*="/activities/"]');
    const href = activityLink?.getAttribute('href') ?? '';
    const idMatch = href.match(/\\/activities\\/(\\d+)/);
    const id = idMatch ? Number(idMatch[1]) : null;

    const titleLink = entry.querySelector('a[href*="/activities/"]');
    const name = titleLink?.textContent?.trim() ?? 'Unknown';

    const timeEl =
      entry.querySelector('time[datetime]') ||
      entry.querySelector('time') ||
      entry.querySelector('[datetime]');
    const start_date = timeEl?.getAttribute('datetime') ?? null;

    let type = 'Workout';
    const sportEl = entry.querySelector('[data-testid="activity-sport-type"]');
    if (sportEl?.textContent?.trim()) {
      type = sportEl.textContent.trim();
    }

    return {
      id,
      name,
      start_date,
      type,
      text: entry.innerText ?? '',
    };
  });
}
"""


def activity_date(raw: dict[str, Any]) -> date | None:
    parsed = parse_start_date(raw.get("start_date"))
    if parsed:
        return parsed
    return extract_date_from_text(raw.get("text", ""))


def collect_records(
    raw_entries: list[dict[str, Any]],
    existing_ids: set[int],
    incremental: bool,
    records_by_id: dict[int, dict[str, Any]],
) -> tuple[bool, str | None, int]:
    """Process feed entries newest-first; return whether to stop scrolling."""
    added = 0

    for entry in raw_entries:
        activity_id = entry.get("id")

        if incremental and activity_id and activity_id in existing_ids:
            return True, f"already synced activity {activity_id}", added

        record = to_db_record(entry)
        if not record:
            continue

        sanitized = sanitize_for_db(record)
        if not sanitized:
            continue

        if sanitized["id"] not in records_by_id:
            records_by_id[sanitized["id"]] = sanitized
            added += 1
        else:
            records_by_id[sanitized["id"]] = sanitized

    return False, None, added


def filter_by_after_date(
    records: list[dict[str, Any]], after_date: date
) -> list[dict[str, Any]]:
    """Keep activities on/after the cutoff. Drop only when date is known and too old."""
    filtered: list[dict[str, Any]] = []
    for record in records:
        parsed = parse_start_date(record.get("start_date"))
        if parsed and parsed < after_date:
            continue
        filtered.append(record)
    return filtered


def scrape_feed(
    session_cookie: str,
    athlete_id: str | None,
    after_date: date,
    existing_ids: set[int],
    incremental: bool,
    max_scrolls: int = 30,
    scroll_pause: float = 1.5,
) -> tuple[list[dict[str, Any]], str | None]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is required for scraping. Install with:\n"
            "  pip install playwright\n"
            "  playwright install chromium"
        ) from exc

    profile_url = (
        f"{STRAVA_BASE}/athletes/{athlete_id}"
        if athlete_id
        else f"{STRAVA_BASE}/dashboard"
    )

    records_by_id: dict[int, dict[str, Any]] = {}
    stop_reason: str | None = None

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        context.add_cookies(
            [
                {
                    "name": "_strava4_session",
                    "value": session_cookie,
                    "domain": ".strava.com",
                    "path": "/",
                }
            ]
        )

        page = context.new_page()
        print(f"🌐 Loading {profile_url}")
        page.goto(profile_url, wait_until="domcontentloaded", timeout=60_000)

        try:
            page.wait_for_selector(FEED_SELECTOR, timeout=30_000)
        except Exception:
            browser.close()
            raise RuntimeError(
                "No feed entries found. Your session cookie may have expired, "
                "or the page structure changed. Re-copy _strava4_session from "
                "DevTools after logging in again."
            )

        stable_rounds = 0
        seen_before_cutoff = False
        for _ in range(max_scrolls):
            raw_entries = page.evaluate(EXTRACT_FEED_JS)
            before_count = len(records_by_id)

            if not incremental:
                for entry in raw_entries:
                    parsed = activity_date(entry)
                    if parsed and parsed < after_date:
                        seen_before_cutoff = True
                        break

            stop, reason, _added = collect_records(
                raw_entries,
                existing_ids,
                incremental,
                records_by_id,
            )
            if reason and reason.startswith("already synced"):
                stop_reason = reason
                break

            if len(records_by_id) == before_count:
                stable_rounds += 1
            else:
                stable_rounds = 0

            if not incremental and seen_before_cutoff and stable_rounds >= 2:
                stop_reason = f"reached activities before {after_date.isoformat()}"
                break

            if stable_rounds >= 3:
                stop_reason = "no more feed entries to load"
                break

            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(scroll_pause)

        browser.close()

    records = list(records_by_id.values())
    records = filter_by_after_date(records, after_date)
    records.sort(key=lambda r: r.get("start_date") or "", reverse=True)
    return records, stop_reason


def get_existing_ids() -> set[int]:
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return set()

    supabase = create_client(url, key)
    response = supabase.table("strava_activities").select("id").execute()
    return {row["id"] for row in (response.data or []) if row.get("id") is not None}


def sync_to_supabase(records: list[dict[str, Any]]) -> int:
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY in backend/.env")

    supabase = create_client(url, key)
    payload = [sanitize_for_db(record) or record for record in records]
    payload = [row for row in payload if row and row.get("start_date")]
    if not payload:
        raise RuntimeError("No valid records to upsert (missing start_date).")

    response = supabase.table("strava_activities").upsert(payload).execute()
    return len(response.data) if response.data else len(payload)


def print_summary(records: list[dict[str, Any]]) -> None:
    print(f"\n📊 Scraped {len(records)} activities:\n")
    for record in records:
        duration = record.get("duration_seconds") or 0
        mins = duration // 60
        secs = duration % 60
        duration_label = f"{mins}m {secs}s" if duration else "—"
        hr = record.get("avg_heartrate")
        cal = record.get("calories")
        start = (record.get("start_date") or "")[:10]
        print(
            f"  • {record['name']} ({start})\n"
            f"    id={record['id']}  time={duration_label}  "
            f"avg_hr={hr or '—'} bpm  cal={cal or '—'}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scrape Strava profile feed and sync to Supabase"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape and print results without writing to Supabase",
    )
    parser.add_argument(
        "--no-sync",
        action="store_true",
        help="Alias for --dry-run",
    )
    parser.add_argument(
        "--after",
        default=DEFAULT_AFTER_DATE,
        help=f"Only include activities on/after this date (default: {DEFAULT_AFTER_DATE})",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Re-scrape all activities since --after, ignoring existing DB ids",
    )
    parser.add_argument(
        "--max-scrolls",
        type=int,
        default=30,
        help="Safety cap on how many times to scroll the feed (default: 30)",
    )
    args = parser.parse_args()

    session_cookie = os.getenv("STRAVA_SESSION_COOKIE", "").strip()
    if not session_cookie:
        print("❌ Missing STRAVA_SESSION_COOKIE in backend/.env")
        print("   Copy the _strava4_session cookie value from your browser.")
        return 1

    athlete_id = os.getenv("STRAVA_ATHLETE_ID", "").strip() or None
    if not athlete_id:
        print("⚠️  STRAVA_ATHLETE_ID not set — using /dashboard instead of /athletes/<id>")

    try:
        after_date = parse_after_date(args.after)
    except ValueError as exc:
        print(f"❌ {exc}")
        return 1

    incremental = not args.full
    existing_ids: set[int] = set()
    if incremental and not (args.dry_run or args.no_sync):
        existing_ids = get_existing_ids()
        if existing_ids:
            print(f"📦 Found {len(existing_ids)} existing activities in Supabase")

    print(f"📅 Scraping newest-first, keeping activities from {after_date.isoformat()} onward")
    if incremental:
        print("🔄 Incremental mode: will stop at first already-synced activity")

    try:
        records, stop_reason = scrape_feed(
            session_cookie,
            athlete_id,
            after_date,
            existing_ids,
            incremental,
            max_scrolls=args.max_scrolls,
        )
    except Exception as exc:
        print(f"❌ Scrape failed: {exc}")
        return 1

    if stop_reason:
        print(f"⏹️  Stopped early: {stop_reason}")

    if not records:
        print("⚠️  No new activities to sync.")
        return 0

    print_summary(records)

    if args.dry_run or args.no_sync:
        print("\n🏁 Dry run complete — nothing written to Supabase.")
        return 0

    try:
        inserted = sync_to_supabase(records)
        print(f"\n✅ Upserted {inserted} activities to strava_activities.")
    except Exception as exc:
        print(f"❌ Supabase sync failed: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
