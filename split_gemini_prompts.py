#!/usr/bin/env python3
"""Split the large Gemini prompt into per-sheet prompts for practical use."""

import os
import re

def split_prompts():
    with open('gemini-prompt.md', 'r', encoding='utf-8') as f:
        content = f.read()

    os.makedirs('gemini-prompts', exist_ok=True)

    # Split at "### Sheet N:" boundaries
    parts = re.split(r'(?=### Sheet \d+:)', content)

    # parts[0] = header text before Sheet 1
    # parts[1] = Sheet 1: Activities
    # parts[2] = Sheet 2: Todos
    # etc.

    header = parts[0].strip()

    # Prompt 1: Activities (with header context)
    prompt1 = header + "\n\n" + parts[1].strip()
    prompt1 = prompt1.replace(
        "Create 6 sheets (tabs) in this spreadsheet with the following structures and data. "
        "Add the headers in row 1 of each sheet. Format headers as bold. Freeze row 1 on all sheets.",
        "PART 1 of 4: Create the first sheet tab. Add headers in row 1, bold, freeze row 1."
    )
    with open('gemini-prompts/1-activities.md', 'w') as f:
        f.write(prompt1)
    print(f"1-activities.md: {len(prompt1):,} chars")

    # Prompt 2: Todos
    prompt2 = "PART 2 of 4: Create a new sheet tab. Add headers in row 1, bold, freeze row 1.\n\n" + parts[2].strip()
    with open('gemini-prompts/2-todos.md', 'w') as f:
        f.write(prompt2)
    print(f"2-todos.md: {len(prompt2):,} chars")

    # Prompt 3: Questions
    prompt3 = "PART 3 of 4: Create a new sheet tab. Add headers in row 1, bold, freeze row 1.\n\n" + parts[3].strip()
    with open('gemini-prompts/3-questions.md', 'w') as f:
        f.write(prompt3)
    print(f"3-questions.md: {len(prompt3):,} chars")

    # Prompt 4: Notes_Links + Technical_Milestones + Project_Config + Formatting
    remaining_parts = parts[4:]
    combined = "\n\n".join(p.strip() for p in remaining_parts)
    prompt4 = "PART 4 of 4: Create the remaining sheet tabs. Add headers in row 1, bold, freeze row 1.\n\n" + combined
    with open('gemini-prompts/4-notes-milestones-config.md', 'w') as f:
        f.write(prompt4)
    print(f"4-notes-milestones-config.md: {len(prompt4):,} chars")


if __name__ == '__main__':
    split_prompts()
    print("\nSplit prompts written to gemini-prompts/ directory.")
    print("Paste each file into Gemini in order: 1, 2, 3, 4.")
