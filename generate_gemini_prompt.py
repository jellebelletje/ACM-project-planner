#!/usr/bin/env python3
"""Generate a complete Gemini prompt that creates AND populates the Google Sheet."""

import json

def generate_prompt():
    with open('seed-data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    activities = data['activities']
    todos = data['todos']
    questions = data['questions']

    lines = []
    lines.append("# Gemini Prompt: Create and Populate ACM Activity Dashboard Google Sheet")
    lines.append("")
    lines.append("Copy and paste this prompt into Gemini inside a new Google Sheet.")
    lines.append("If the prompt is too long for a single paste, use the section markers to split it into multiple prompts.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## PROMPT START")
    lines.append("")

    # ---- Structure ----
    lines.append("Create 6 sheets (tabs) in this spreadsheet with the following structures and data. "
                 "Add the headers in row 1 of each sheet. Format headers as bold. Freeze row 1 on all sheets.")
    lines.append("")

    # ---- Sheet 1: Activities ----
    lines.append("### Sheet 1: Activities")
    lines.append("")
    lines.append("Headers: id | title | intro_text | full_description | pdca_phase | sequence | status | due_date | depends_on | particularisation_guidance | created_at | updated_at")
    lines.append("")
    lines.append("Set data validation on column G (status) with dropdown options: not_started, in_progress, completed, blocked")
    lines.append("Set column H (due_date) to date format. Set columns K-L to date-time format.")
    lines.append("")
    lines.append("Populate with these rows:")
    lines.append("")

    # Table header
    lines.append("| id | title | intro_text | pdca_phase | sequence | status | depends_on | particularisation_guidance |")
    lines.append("|---|---|---|---|---|---|---|---|")

    for a in activities:
        # Truncate particularisation for table readability, but include enough
        part = (a.get('particularisation_guidance') or '')[:200].replace('|', '/').replace('\n', ' ')
        title = (a.get('title') or '').replace('|', '/')
        intro = (a.get('intro_text') or '')[:100].replace('|', '/').replace('\n', ' ')
        phase = a.get('pdca_phase', '')
        deps = a.get('depends_on', '')
        lines.append(f"| {a['id']} | {title} | {intro} | {phase} | {a.get('sequence', '')} | not_started | {deps} | {part} |")

    lines.append("")

    # ---- Sheet 2: Todos ----
    lines.append("---")
    lines.append("")
    lines.append("### Sheet 2: Todos")
    lines.append("")
    lines.append("Headers: id | activity_id | text | is_done | is_project_specific | assigned_to | due_date | sequence")
    lines.append("")
    lines.append("Set column D (is_done) and column E (is_project_specific) as checkboxes.")
    lines.append("Set column G (due_date) to date format.")
    lines.append("")
    lines.append("Populate with these rows:")
    lines.append("")

    lines.append("| id | activity_id | text | is_done | is_project_specific | assigned_to | due_date | sequence |")
    lines.append("|---|---|---|---|---|---|---|---|")

    for t in todos:
        text = (t.get('text') or '').replace('|', '/').replace('\n', ' ')
        is_ps = 'TRUE' if t.get('is_project_specific') else 'FALSE'
        lines.append(f"| {t['id']} | {t['activity_id']} | {text} | FALSE | {is_ps} | | | {t.get('sequence', '')} |")

    lines.append("")

    # ---- Sheet 3: Questions ----
    lines.append("---")
    lines.append("")
    lines.append("### Sheet 3: Questions")
    lines.append("")
    lines.append("Headers: id | activity_id | sub_topic | question_text | ask_whom | answer | is_answered | sequence")
    lines.append("")
    lines.append("Set column G (is_answered) as a checkbox.")
    lines.append("")
    lines.append("Populate with these rows:")
    lines.append("")

    lines.append("| id | activity_id | sub_topic | question_text | ask_whom | answer | is_answered | sequence |")
    lines.append("|---|---|---|---|---|---|---|---|")

    for q in questions:
        qt = (q.get('question_text') or '').replace('|', '/').replace('\n', ' ')
        st = (q.get('sub_topic') or '').replace('|', '/')
        aw = (q.get('ask_whom') or '').replace('|', '/')
        lines.append(f"| {q['id']} | {q['activity_id']} | {st} | {qt} | {aw} | | FALSE | {q.get('sequence', '')} |")

    lines.append("")

    # ---- Sheet 4: Notes_Links (empty) ----
    lines.append("---")
    lines.append("")
    lines.append("### Sheet 4: Notes_Links")
    lines.append("")
    lines.append("Headers: id | activity_id | type | content | url | label | date_added")
    lines.append("")
    lines.append("Set data validation on column C (type) with dropdown options: note, link, attachment_ref")
    lines.append("Set column G (date_added) to date-time format.")
    lines.append("Leave this sheet empty (no data rows) — notes are added by the user during the project.")
    lines.append("")

    # ---- Sheet 5: Technical_Milestones (empty) ----
    lines.append("---")
    lines.append("")
    lines.append("### Sheet 5: Technical_Milestones")
    lines.append("")
    lines.append("Headers: id | milestone_name | date | status | notes | sequence")
    lines.append("")
    lines.append("Set column C (date) to date format.")
    lines.append("Set data validation on column D (status) with dropdown options: planned, in_progress, completed, delayed")
    lines.append("Leave this sheet empty (no data rows) — milestones are added by the user.")
    lines.append("")

    # ---- Sheet 6: Project_Config ----
    lines.append("---")
    lines.append("")
    lines.append("### Sheet 6: Project_Config")
    lines.append("")
    lines.append("Headers: key | value")
    lines.append("")
    lines.append("Populate with these rows:")
    lines.append("")
    lines.append("| key | value |")
    lines.append("|---|---|")
    lines.append("| project_name | |")
    lines.append("| client_name | |")
    lines.append("| start_date | |")
    lines.append("| end_date | |")
    lines.append("| current_phase | Plan I: Diagnosis |")
    lines.append("| consultant_name | |")
    lines.append("")

    # ---- Formatting ----
    lines.append("---")
    lines.append("")
    lines.append("### Formatting for all sheets")
    lines.append("")
    lines.append("- Auto-resize columns to fit content")
    lines.append("- Light grey alternating row colours for readability")
    lines.append("- Text wrapping on columns that contain long text (intro_text, full_description, particularisation_guidance, text, content, answer, question_text, notes)")
    lines.append("")
    lines.append("## PROMPT END")

    return '\n'.join(lines)


if __name__ == '__main__':
    prompt = generate_prompt()
    with open('gemini-prompt.md', 'w', encoding='utf-8') as f:
        f.write(prompt)

    # Count lines for info
    line_count = prompt.count('\n')
    char_count = len(prompt)
    print(f"Generated gemini-prompt.md: {line_count} lines, {char_count:,} characters")
    print(f"If too large for Gemini, split at the '---' section markers between sheets.")
