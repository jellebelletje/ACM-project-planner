#!/usr/bin/env python3
"""Parse ACM_Activity_Breakdown.md and output seed data as JSON."""

import re
import json

def parse_markdown(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # PDCA phase mapping (6 Markdown phases → 5 PDCA phases)
    phase_map = {
        'Phase 1': 'Plan I: Diagnosis',
        'Phase 2': 'Plan I: Diagnosis',
        'Phase 3': 'Plan II: Design + Activate Champions',
        'Phase 4': 'Do: Deployment',
        'Phase 5': 'Check: Analyse',
        'Phase 6': 'Act: Handover, Anchor & Learn',
    }

    # Split into activity blocks
    # Activity headers: ### N. Title
    activity_pattern = r'### (\d+)\.\s+(.+?)(?=\n)'
    phase_pattern = r'## (Phase \d+):\s*(.+?)(?=\n)'

    activities = []
    todos = []
    questions = []

    # Track current phase
    current_phase_key = 'Phase 1'

    # Split content into lines for processing
    lines = content.split('\n')
    i = 0
    activity_num = 0
    todo_counter = 0
    question_counter = 0

    while i < len(lines):
        line = lines[i]

        # Check for phase header
        phase_match = re.match(r'^## (Phase \d+):', line)
        if phase_match:
            current_phase_key = phase_match.group(1)
            i += 1
            continue

        # Check for activity header
        act_match = re.match(r'^### (\d+)\.\s+(.+)', line)
        if act_match:
            act_num = int(act_match.group(1))
            act_title = act_match.group(2).strip()
            act_id = f'A{act_num:02d}'
            activity_num += 1

            pdca_phase = phase_map.get(current_phase_key, 'Plan I: Diagnosis')

            # Collect the rest of the activity block
            i += 1
            depends_on = ''
            receives_from = ''
            current_section = None
            current_subtopic = ''
            intro_text = ''
            full_description = ''
            particularisation = ''
            act_todos = []
            act_questions = []
            todo_seq = 0
            q_seq = 0

            while i < len(lines):
                line = lines[i]

                # Next activity or phase = end of this block
                if re.match(r'^### \d+\.', line) or re.match(r'^## Phase', line) or re.match(r'^## Appendix', line):
                    break

                # Dependencies
                dep_match = re.match(r'^_Depends on:\s*(.+?)_', line)
                if dep_match:
                    dep_text = dep_match.group(1)
                    # Extract activity numbers
                    dep_nums = re.findall(r'Activity\s*(\d+)', dep_text)
                    # Also handle "All Activities 1–7" pattern
                    range_match = re.search(r'All Activities?\s*(\d+)[–-](\d+)', dep_text)
                    if range_match:
                        start, end = int(range_match.group(1)), int(range_match.group(2))
                        dep_nums = [str(n) for n in range(start, end + 1)]
                    depends_on = ','.join([f'A{int(n):02d}' for n in dep_nums])
                    i += 1
                    continue

                recv_match = re.match(r'^_Receives input from:\s*(.+?)_', line)
                if recv_match:
                    recv_text = recv_match.group(1)
                    dep_nums = re.findall(r'(\d+)', recv_text)
                    if 'All Phase 4' in recv_text:
                        dep_nums = [str(n) for n in range(18, 25)]
                    depends_on = ','.join([f'A{int(n):02d}' for n in dep_nums])
                    i += 1
                    continue

                # Section headers
                if line.strip() == '#### To-dos':
                    current_section = 'todos'
                    i += 1
                    continue
                elif line.strip() == '#### Questions':
                    current_section = 'questions'
                    i += 1
                    continue
                elif line.strip() == '#### Answers':
                    current_section = 'answers'
                    i += 1
                    continue
                elif line.strip() == '#### Particularisation Guidance':
                    current_section = 'particularisation'
                    i += 1
                    continue

                # Parse content based on current section
                if current_section == 'todos':
                    todo_match = re.match(r'^- \[ \]\s+(.+)', line)
                    if todo_match:
                        todo_text = todo_match.group(1).strip()
                        # Handle multi-line todos (indented continuation)
                        while i + 1 < len(lines) and lines[i + 1].startswith('  ') and not lines[i + 1].strip().startswith('- '):
                            i += 1
                            todo_text += ' ' + lines[i].strip()
                            # Sub-items (like "- Message 1: ...") are part of the todo
                            if lines[i].strip().startswith('- '):
                                todo_text += '\n' + lines[i].strip()

                        todo_counter += 1
                        is_project_specific = '_[Project-specific:' in todo_text
                        act_todos.append({
                            'id': f'T{todo_counter:03d}',
                            'activity_id': act_id,
                            'text': todo_text.replace('_[Project-specific: ', '[Project-specific: ').replace(']_', ']'),
                            'is_done': False,
                            'is_project_specific': is_project_specific,
                            'assigned_to': '',
                            'due_date': '',
                            'sequence': todo_seq
                        })
                        todo_seq += 1

                elif current_section == 'questions':
                    # Sub-topic headers
                    subtopic_match = re.match(r'^\*\*(.+?)(?:\s*\(.*?\))?\s*:\*\*', line)
                    if subtopic_match:
                        current_subtopic = subtopic_match.group(1).strip()
                        # Remove trailing colon if present
                        current_subtopic = current_subtopic.rstrip(':')
                        i += 1
                        continue

                    q_match = re.match(r'^- (.+?)(?:\s*→\s*_(.+?)_)?$', line)
                    if q_match and current_subtopic:
                        q_text = q_match.group(1).strip()
                        ask_whom = q_match.group(2) or ''
                        if ask_whom.startswith('Ask: '):
                            ask_whom = ask_whom[5:]
                        elif ask_whom.startswith('Ask:'):
                            ask_whom = ask_whom[4:].strip()

                        question_counter += 1
                        q_seq += 1
                        act_questions.append({
                            'id': f'Q{question_counter:03d}',
                            'activity_id': act_id,
                            'sub_topic': current_subtopic,
                            'question_text': q_text,
                            'ask_whom': ask_whom,
                            'answer': '',
                            'is_answered': False,
                            'sequence': q_seq
                        })

                elif current_section == 'particularisation':
                    if line.strip() and not line.strip() == '---':
                        particularisation += line.strip() + ' '

                i += 1

            # Create the activity record
            # Generate intro from first activity todo or just the title context
            intro = act_title
            if act_todos:
                intro = act_todos[0]['text'][:150]

            activities.append({
                'id': act_id,
                'title': act_title,
                'intro_text': intro,
                'full_description': '',  # Will be populated from template if available
                'pdca_phase': pdca_phase,
                'sequence': activity_num,
                'status': 'not_started',
                'due_date': '',
                'depends_on': depends_on,
                'particularisation_guidance': particularisation.strip(),
                'created_at': '',
                'updated_at': ''
            })

            todos.extend(act_todos)
            questions.extend(act_questions)
            continue

        i += 1

    return {
        'activities': activities,
        'todos': todos,
        'questions': questions,
        'config': {
            'project_name': '',
            'client_name': '',
            'start_date': '',
            'end_date': '',
            'current_phase': 'Plan I: Diagnosis',
            'consultant_name': ''
        }
    }


if __name__ == '__main__':
    data = parse_markdown('ACM_Activity_Breakdown.md')
    print(f"Parsed {len(data['activities'])} activities, {len(data['todos'])} todos, {len(data['questions'])} questions")

    # Print activity summary
    for act in data['activities']:
        act_todos = [t for t in data['todos'] if t['activity_id'] == act['id']]
        act_qs = [q for q in data['questions'] if q['activity_id'] == act['id']]
        print(f"  {act['id']}: {act['title']} [{act['pdca_phase']}] - {len(act_todos)} todos, {len(act_qs)} questions")
        if act['depends_on']:
            print(f"       depends on: {act['depends_on']}")

    # Output JSON
    with open('seed-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nSeed data written to seed-data.json")
