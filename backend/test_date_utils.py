import unittest
from datetime import date

from app.modules.history.date_utils import (
    extract_global_workout_date,
    find_section_dates,
    normalize_parsed_dates,
    parse_date_phrase,
)
from app.modules.history.schemas import ParsedWorkoutEntry, ParsedWorkoutLog


class DateUtilsTest(unittest.TestCase):
    def setUp(self):
        self.reference = date(2026, 6, 30)

    def test_parse_day_month_phrase(self):
        self.assertEqual(parse_date_phrase("29th of june", self.reference), "2026-06-29")
        self.assertEqual(parse_date_phrase("on the 29th of june", self.reference), "2026-06-29")
        self.assertEqual(parse_date_phrase("June 29", self.reference), "2026-06-29")

    def test_parse_yesterday(self):
        self.assertEqual(parse_date_phrase("yesterday", self.reference), "2026-06-29")

    def test_global_date_in_paragraph(self):
        raw = "on the 29th of june i did incline smith machine 35kgs for 8 and then 45kgs for 5"
        self.assertEqual(extract_global_workout_date(raw, self.reference), "2026-06-29")

    def test_section_dates_from_headers(self):
        raw = """18th May
Incline DB Press
35kgs for 5
14th May
Lat Pulldown
65kgs for 10"""
        sections = find_section_dates(raw, self.reference)
        self.assertEqual(len(sections), 2)
        self.assertEqual(sections[0][0], "2026-05-18")
        self.assertEqual(sections[1][0], "2026-05-14")

    def test_normalize_single_backdated_workout(self):
        raw = "on the 29th of june bench press 80kg for 8"
        parsed = ParsedWorkoutLog(
            entries=[
                ParsedWorkoutEntry(
                    date="2026-06-30",
                    exercise_name="Bench Press",
                    weight=80,
                    unit="kg",
                    reps=8,
                )
            ]
        )
        normalized = normalize_parsed_dates(raw, parsed, self.reference)
        self.assertEqual(normalized.entries[0].date, "2026-06-29")


if __name__ == "__main__":
    unittest.main()
