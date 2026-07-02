from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Optional

from .schemas import ParsedWorkoutEntry, ParsedWorkoutLog

MONTHS = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}

SET_LINE_PATTERN = re.compile(
    r"\d+(?:\.\d+)?\s*(?:kg|kgs|lb|lbs|plate|plates)?\s*(?:x|for)\s*\d+",
    re.IGNORECASE,
)

ISO_DATE_PATTERN = re.compile(r"(\d{4})-(\d{2})-(\d{2})")
DAY_MONTH_PATTERN = re.compile(
    r"(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)(?:\s+(\d{4}))?",
    re.IGNORECASE,
)
MONTH_DAY_PATTERN = re.compile(
    r"([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?",
    re.IGNORECASE,
)


def _resolve_year(month: int, day: int, reference: date) -> int:
    try:
        candidate = date(reference.year, month, day)
    except ValueError:
        return reference.year
    if candidate > reference:
        return reference.year - 1
    return reference.year


def _to_iso(year: int, month: int, day: int) -> Optional[str]:
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def parse_date_phrase(text: str, reference: Optional[date] = None) -> Optional[str]:
    reference = reference or date.today()
    cleaned = text.strip().lower().rstrip(".,;")
    if not cleaned:
        return None

    if cleaned in {"today"}:
        return reference.isoformat()
    if cleaned in {"yesterday"}:
        return (reference - timedelta(days=1)).isoformat()

    iso_match = ISO_DATE_PATTERN.search(cleaned)
    if iso_match:
        year, month, day = map(int, iso_match.groups())
        return _to_iso(year, month, day)

    day_month = DAY_MONTH_PATTERN.search(cleaned)
    if day_month:
        day = int(day_month.group(1))
        month_name = day_month.group(2).lower()
        month = MONTHS.get(month_name)
        if month:
            year = int(day_month.group(3)) if day_month.group(3) else _resolve_year(month, day, reference)
            return _to_iso(year, month, day)

    month_day = MONTH_DAY_PATTERN.search(cleaned)
    if month_day:
        month_name = month_day.group(1).lower()
        month = MONTHS.get(month_name)
        if month:
            day = int(month_day.group(2))
            year = int(month_day.group(3)) if month_day.group(3) else _resolve_year(month, day, reference)
            return _to_iso(year, month, day)

    return None


def is_date_only_line(line: str) -> bool:
    stripped = line.strip().lstrip("-•*").strip()
    if not stripped or SET_LINE_PATTERN.search(stripped):
        return False
    return parse_date_phrase(stripped) is not None


def extract_global_workout_date(raw_text: str, reference: Optional[date] = None) -> Optional[str]:
    reference = reference or date.today()
    normalized = raw_text.replace("\r", " ").replace("\n", " ")
    for pattern in (DAY_MONTH_PATTERN, MONTH_DAY_PATTERN):
        for match in pattern.finditer(normalized):
            parsed = parse_date_phrase(match.group(0), reference)
            if parsed:
                return parsed
    return None


def find_section_dates(raw_text: str, reference: Optional[date] = None) -> list[tuple[str, str]]:
    reference = reference or date.today()
    sections: list[tuple[str, str]] = []
    current_date = reference.isoformat()
    current_lines: list[str] = []
    saw_explicit_header = False

    for line in raw_text.replace("\r", "").split("\n"):
        stripped = line.strip()
        if stripped and is_date_only_line(stripped):
            saw_explicit_header = True
            if current_lines:
                sections.append((current_date, "\n".join(current_lines)))
            parsed = parse_date_phrase(stripped.lstrip("-•*").strip(), reference)
            current_date = parsed or current_date
            current_lines = []
            continue
        if stripped:
            current_lines.append(line)

    if current_lines:
        sections.append((current_date, "\n".join(current_lines)))

    if not saw_explicit_header:
        return [(reference.isoformat(), raw_text)]
    return sections


def count_sets_in_section(section_text: str) -> int:
    matches = SET_LINE_PATTERN.findall(section_text)
    if matches:
        return len(matches)
    non_empty = [line for line in section_text.split("\n") if line.strip() and not is_date_only_line(line)]
    return len(non_empty)


def normalize_iso_date(value: str) -> Optional[str]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value).split("T")[0]).isoformat()
    except ValueError:
        return parse_date_phrase(value)


def normalize_parsed_dates(raw_text: str, parsed: ParsedWorkoutLog, reference: Optional[date] = None) -> ParsedWorkoutLog:
    reference = reference or date.today()
    today_iso = reference.isoformat()
    sections = find_section_dates(raw_text, reference)
    global_date = extract_global_workout_date(raw_text, reference)

    has_explicit_headers = len(sections) > 1 or (
        len(sections) == 1 and sections[0][0] != today_iso
    )

    if has_explicit_headers and len(sections) > 1:
        updated_entries: list[ParsedWorkoutEntry] = []
        entry_index = 0
        set_counts = [count_sets_in_section(section_text) for _, section_text in sections]
        if sum(set_counts) == 0:
            set_counts = [1] * len(sections)

        for (section_date, _section_text), set_count in zip(sections, set_counts):
            chunk = parsed.entries[entry_index : entry_index + set_count]
            if not chunk and entry_index < len(parsed.entries):
                chunk = [parsed.entries[entry_index]]
            for entry in chunk:
                entry_date = normalize_iso_date(entry.date) or section_date
                if entry_date == today_iso:
                    entry_date = section_date
                updated_entries.append(entry.model_copy(update={"date": entry_date}))
            entry_index += len(chunk)

        while entry_index < len(parsed.entries):
            entry = parsed.entries[entry_index]
            entry_date = normalize_iso_date(entry.date) or today_iso
            updated_entries.append(entry.model_copy(update={"date": entry_date}))
            entry_index += 1

        return ParsedWorkoutLog(entries=updated_entries or parsed.entries)

    target_date = global_date
    if not target_date and len(sections) == 1 and sections[0][0] != today_iso:
        target_date = sections[0][0]

    updated_entries = []
    for entry in parsed.entries:
        entry_date = normalize_iso_date(entry.date) or today_iso
        if target_date and entry_date == today_iso:
            entry_date = target_date
        updated_entries.append(entry.model_copy(update={"date": entry_date}))

    return ParsedWorkoutLog(entries=updated_entries)
