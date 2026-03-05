PART 4 of 4: Create the remaining sheet tabs. Add headers in row 1, bold, freeze row 1.

### Sheet 4: Notes_Links

Headers: id | activity_id | type | content | url | label | date_added

Set data validation on column C (type) with dropdown options: note, link, attachment_ref
Set column G (date_added) to date-time format.
Leave this sheet empty (no data rows) — notes are added by the user during the project.

---

### Sheet 5: Technical_Milestones

Headers: id | milestone_name | date | status | notes | sequence

Set column C (date) to date format.
Set data validation on column D (status) with dropdown options: planned, in_progress, completed, delayed
Leave this sheet empty (no data rows) — milestones are added by the user.

---

### Sheet 6: Project_Config

Headers: key | value

Populate with these rows:

| key | value |
|---|---|
| project_name | |
| client_name | |
| start_date | |
| end_date | |
| current_phase | Plan I: Diagnosis |
| consultant_name | |

---

### Formatting for all sheets

- Auto-resize columns to fit content
- Light grey alternating row colours for readability
- Text wrapping on columns that contain long text (intro_text, full_description, particularisation_guidance, text, content, answer, question_text, notes)

## PROMPT END