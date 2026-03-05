# Prompt: Build the ACM Activity Dashboard

> **Instructions:** Paste this entire document into a new Claude Code session. It contains everything needed to build the dashboard.

---

## What to Build

Build an **ACM (Adoption & Change Management) Activity Dashboard** — an interactive, visual, single-page web application for managing all activities in a change management project. It is the consultant's central workspace: tracking what's done, what's next, what information is needed, and where everything lives.

**Tech stack:** Plain HTML, CSS, and vanilla JavaScript. No frameworks, no build step. The dashboard is a single HTML file (with linked CSS/JS files if needed for maintainability) that can be opened locally in a browser or hosted on a simple static server.

**Data store:** Google Sheets as the live database, accessed via Google Apps Script as a lightweight API. The dashboard reads and writes data to Google Sheets in real time.

---

## Project Folder

The project lives at: `/Users/jel/projects/ACM_project_planner/`

This folder already contains two critical source files:

1. **`ACM Consultant Personal Planning Template.html`** — An exported Microsoft Whiteboard containing all the high-level activities on a visual timeline. Read this file to extract the exact list of activities, their descriptions, and their ordering. There are **34 activities** (possibly 35 if a prerequisite/intake step is added to Plan I). Activities are grouped into 5 PDCA phases (see below).

2. **`ACM_Activity_Breakdown.md`** — A structured Markdown file containing, for each activity:
   - General to-dos (checkbox items)
   - Questions grouped by sub-topic, each annotated with **who to ask** (e.g., → _Ask: Executive Sponsor_)
   - Particularisation guidance
   - Answer placeholders

   **Use this file as the content source** to seed the dashboard's default to-dos and questions for each activity. Read it and parse the content per activity.

### First Step

Before writing any code, read both source files thoroughly. Extract:
- All 34 activity titles and their descriptions from the HTML template
- All to-dos, questions (with who-to-ask annotations), and particularisation guidance from the Markdown file
- Map each activity to the correct PDCA phase (see grouping below)

Present the extracted list to me for verification before proceeding.

---

## PDCA Phase Grouping

The 34 activities are grouped into 5 phases. The exact activity-to-phase mapping should be extracted from the Whiteboard template, but the phase structure and approximate counts are:

| # | Phase Name | Nav Button Label | Activity Count |
|---|---|---|---|
| 1 | **Plan I** | Diagnosis | ~9 (8 core + prerequisite intake folded in) |
| 2 | **Plan II** | Design + Activate Champions | ~7 |
| 3 | **Do** | Deployment | ~8 |
| 4 | **Check** | Analyse | 9 |
| 5 | **Act** | Handover, Anchor & Learn | 2 |

**Important:** These phases must be **editable by the user**. The user should be able to:
- Rename phases
- Split a phase into sub-phases (e.g., split "Check" into "Check Part 1" and "Check Part 2") for manageability
- Move activities between phases
- Add new custom activities to any phase

---

## Architecture

### Google Sheets (Data Store)

Create a Google Sheets spreadsheet with the following sheets/tabs:

**Sheet 1: `Activities`**
| Column | Type | Description |
|---|---|---|
| id | string | Unique activity ID (e.g., "A01") |
| title | string | Activity title |
| intro_text | string | Short description (first few lines from the template) |
| full_description | text | Full activity description from the template |
| pdca_phase | string | Phase name (e.g., "Plan I: Diagnosis") |
| sequence | number | Order within the phase |
| status | enum | "not_started", "in_progress", "completed", "blocked" |
| due_date | date | Optional target date |
| depends_on | string | Comma-separated list of activity IDs this depends on |
| particularisation_guidance | text | Guidance on adapting for specific project types |
| created_at | datetime | Auto-populated |
| updated_at | datetime | Auto-populated |

**Sheet 2: `Todos`**
| Column | Type | Description |
|---|---|---|
| id | string | Unique to-do ID |
| activity_id | string | FK → Activities.id |
| text | string | To-do description |
| is_done | boolean | Checkbox state |
| is_project_specific | boolean | TRUE if user-added, FALSE if from template |
| assigned_to | string | Optional person/role |
| due_date | date | Optional |
| sequence | number | Display order |

**Sheet 3: `Questions`**
| Column | Type | Description |
|---|---|---|
| id | string | Unique question ID |
| activity_id | string | FK → Activities.id |
| sub_topic | string | Question group heading |
| question_text | string | The question |
| ask_whom | string | Who to ask (role/person) |
| answer | text | The answer (fillable per project) |
| is_answered | boolean | Auto-set when answer is non-empty |
| sequence | number | Display order |

**Sheet 4: `Notes_Links`**
| Column | Type | Description |
|---|---|---|
| id | string | Unique ID |
| activity_id | string | FK → Activities.id |
| type | enum | "note", "link", "attachment_ref" |
| content | text | Note text, or description of the link |
| url | string | URL (for links and attachment references) |
| label | string | Display label |
| date_added | datetime | Auto-populated |

**Sheet 5: `Technical_Milestones`**
| Column | Type | Description |
|---|---|---|
| id | string | Unique milestone ID |
| milestone_name | string | E.g., "Tenant configured", "Pilot live", "Go-live" |
| date | date | Target or actual date |
| status | enum | "planned", "in_progress", "completed", "delayed" |
| notes | text | Free-form notes |
| sequence | number | Display order (left to right) |

**Sheet 6: `Project_Config`**
| Column | Type | Description |
|---|---|---|
| key | string | Configuration key |
| value | string | Configuration value |

Keys: `project_name`, `client_name`, `start_date`, `end_date`, `current_phase`, `consultant_name`

### Google Apps Script (API Layer)

Create a Google Apps Script project bound to the Sheets spreadsheet. It should expose a web app (`doGet` / `doPost`) that serves as the API for the dashboard. Endpoints needed:

**Read operations (GET):**
- `?action=getActivities` — return all activities
- `?action=getTodos&activityId=X` — return to-dos for an activity
- `?action=getQuestions&activityId=X` — return questions for an activity
- `?action=getNotesLinks&activityId=X` — return notes/links for an activity
- `?action=getMilestones` — return all technical milestones
- `?action=getConfig` — return project configuration
- `?action=getAll` — return everything (for initial load)

**Write operations (POST):**
- `?action=updateActivity` — update activity fields (status, due_date, etc.)
- `?action=updateTodo` — toggle to-do, edit text, add new to-do
- `?action=updateQuestion` — save an answer to a question
- `?action=addNote` — add a note or link
- `?action=deleteNote` — remove a note or link
- `?action=updateMilestone` — add/update a technical milestone
- `?action=updateConfig` — update project configuration
- `?action=addActivity` — add a custom activity
- `?action=moveActivity` — move activity to a different phase

**Important:** The Apps Script should handle CORS appropriately and return JSON responses. Include error handling and basic validation.

**Provide the complete Apps Script code** and instructions for deploying it as a web app.

---

## UI Design

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Project Name]                              [Status Summary Bar]   │
│                                                                      │
├─────────┬────────────────────────────────────────────────────────────┤
│         │  TECHNICAL TIMELINE TRACK                                  │
│  NAV    │  ●──────●──────────●───────────●──────────●               │
│  PANEL  │  Tenant  Pilot     Go-Live     Hypercare   Close          │
│         │  Config  Start                  End                        │
│         ├────────────────────────────────────────────────────────────┤
│ ┌─────┐ │                                                            │
│ │PLAN │ │  ACTIVITY CARDS                                            │
│ │  I  │ │                                                            │
│ ├─────┤ │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│ │PLAN │ │  │Activity│  │Activity│  │Activity│  │Activity│  ...      │
│ │ II  │ │  │ Card 1 │  │ Card 2 │  │ Card 3 │  │ Card 4 │          │
│ ├─────┤ │  │        │  │        │  │        │  │        │          │
│ │ DO  │ │  └────────┘  └────────┘  └────────┘  └────────┘          │
│ ├─────┤ │                                                            │
│ │CHECK│ │  ▼ EXPANDED CARD (when clicked)                           │
│ ├─────┤ │  ┌────────────────────────────────────────────────────┐   │
│ │ ACT │ │  │ ☐ To-do 1                              [Status ▼] │   │
│ │     │ │  │ ☑ To-do 2                                          │   │
│ └─────┘ │  │                                                    │   │
│         │  │ Questions:                                          │   │
│         │  │ Q: What does success look like?                     │   │
│         │  │    Ask: Executive Sponsor                           │   │
│         │  │    Answer: [________________]                       │   │
│         │  │                                                    │   │
│         │  │ Notes & Links:                                     │   │
│         │  │ 📝 Meeting notes from sponsor call                  │   │
│         │  │ 🔗 Interview template (Google Form)                 │   │
│         │  │ [+ Add note] [+ Add link]                          │   │
│         │  └────────────────────────────────────────────────────┘   │
│         │                                                            │
└─────────┴────────────────────────────────────────────────────────────┘
```

### Navigation Panel (Left)

- 5 buttons, stacked vertically, one per PDCA phase
- Each button shows the phase name and a progress indicator (e.g., "3/8 done")
- Clicking a button scrolls the main area to that phase's activities
- The currently visible phase is highlighted
- The buttons should be visually distinct and clearly show which phase the project is currently in

### Technical Timeline Track (Top)

- A horizontal timeline bar above the activity cards
- Shows technical deployment milestones as labelled dots on a line
- Left = project start, right = project end
- Milestones are editable: click to add, edit, or remove
- Milestone status is colour-coded (planned = grey, in progress = blue, completed = green, delayed = red)
- The timeline should be aligned with the activity phases below it so it's clear which milestones correspond to which phase

### Activity Cards (Main Area)

**Card Face (collapsed):**
- Title (bold)
- First ~20 words of the intro text (truncated with "...")
- Status indicator: colour-coded dot or border (not started = grey, in progress = amber, completed = green, blocked = red)
- Small icons showing: number of incomplete to-dos, number of unanswered questions
- Due date if set
- Cards flow left to right within each phase section, wrapping to the next row

**Card Expanded (clicked):**
Expands **below** the card, pushing other content down. Contains tabbed or sectioned content:

**Section 1: Overview**
- Full description text (expandable from the intro)
- Status selector (dropdown: not started / in progress / completed / blocked)
- Due date picker
- Dependencies (which other activities this depends on)
- Particularisation guidance (collapsible)

**Section 2: To-dos**
- Checkbox list of general to-dos (from template)
- Project-specific to-dos (user-added, visually distinguished)
- "Add to-do" button
- Each to-do can have an assigned person and due date
- Progress bar showing completion percentage

**Section 3: Questions & Answers**
- Grouped by sub-topic
- Each question shows:
  - The question text
  - **Who to ask** (highlighted, e.g., a badge: "Ask: Executive Sponsor")
  - An answer input field (text area)
  - Answered/unanswered indicator
- Progress bar showing how many questions are answered

**Section 4: Notes & Links (Workspace)**
- Free-form notes (add, edit, delete)
- Links with labels (add URL + label)
- Reference to attachments (link to files in Google Drive, SharePoint, etc.)
- "Add note" and "Add link" buttons

### Status Summary Bar (Top Right)

A compact summary showing:
- Overall project progress (e.g., "12/34 activities completed")
- Current phase
- Number of unanswered questions across all activities
- Number of incomplete to-dos
- Next activity on deck (the next not-started activity in sequence)

### Visual Design Principles

- **Clean and professional** — this is a consultant's working tool, not a consumer app
- **High information density** — show as much as possible without clutter
- **Colour-coded status** throughout — consistent colour language for not started / in progress / completed / blocked
- **Responsive** — should work well on both a laptop screen and a large monitor
- **Fast** — initial load fetches all data; subsequent interactions update locally and sync to Sheets in background
- The overall visual metaphor is a project moving from left to right, getting more concrete as you move down from high-level activities to detailed to-dos, questions, and answers

---

## Data Seeding

On first setup, the dashboard needs to be populated with default data from the source files:

1. **Activities**: Extract all 34 activity titles, descriptions, and phase groupings from the Whiteboard HTML template
2. **To-dos**: Parse `ACM_Activity_Breakdown.md` and extract all to-do items per activity
3. **Questions**: Parse `ACM_Activity_Breakdown.md` and extract all questions with their sub-topics and who-to-ask annotations
4. **Particularisation guidance**: Extract from the Markdown file per activity

Create a **seeding script** (can be a separate HTML page or a Google Apps Script function) that:
- Reads the source data
- Formats it for the Google Sheets structure
- Populates the sheets

Provide clear instructions for running the seeding process.

---

## Key Features

### 1. What's Next Surfacing
The dashboard should prominently surface:
- The current phase
- The next activity that needs attention (first not-started or in-progress activity in sequence)
- What information is needed for that activity (unanswered questions, incomplete to-dos)
- Who needs to be contacted (aggregated "ask whom" from unanswered questions)

### 2. Activity Dependencies
Activities can depend on other activities (the `depends_on` field). The dashboard should:
- Show a warning if you try to start an activity whose dependencies aren't completed
- Visually indicate dependency chains
- Use the cross-references already noted in `ACM_Activity_Breakdown.md` (e.g., "Activity 14 depends on Activity 7")

### 3. Editability
Everything is editable:
- Activity titles, descriptions, and phases
- To-dos (add, edit, delete, reorder)
- Questions and answers
- Notes and links
- Technical milestones
- Phase names and structure (split, rename)
- The user can add entirely new custom activities

### 4. Search and Filter
- Search across all activities, to-dos, questions, and notes
- Filter activities by status, phase, or tag
- Filter questions by answered/unanswered
- Filter to-dos by done/not done

### 5. Links and References
Each activity's workspace should support:
- URLs with labels (e.g., "Sponsor Interview Template → https://forms.google.com/...")
- References to documents (Google Docs, SharePoint, etc.)
- Cross-links to other activities in the dashboard

---

## Deliverables

1. **`index.html`** — The main dashboard page
2. **`styles.css`** — All styling
3. **`app.js`** — All JavaScript logic (data fetching, rendering, interactions)
4. **`seed.js`** or **`seed.html`** — Data seeding script
5. **`apps-script/Code.gs`** — Google Apps Script code for the API layer
6. **`SETUP.md`** — Step-by-step instructions for:
   - Creating the Google Sheet
   - Deploying the Apps Script web app
   - Configuring the dashboard to point to the Apps Script URL
   - Running the seeding process
   - Opening and using the dashboard

---

## Important Notes

- **Fold the prerequisite/intake activity into Plan I** — don't create a separate pre-phase. The intake tasks (getting population lists, people involved, org charts from the internal project lead) should be part of the first Plan I activity or added as a new activity within Plan I.
- **The Markdown file (`ACM_Activity_Breakdown.md`) currently has 32 activities** while the template has 34. When seeding, use the template as the authoritative source for the activity list, and match to-dos/questions from the Markdown file where activity titles correspond. For the 2 activities that exist in the template but not the Markdown, generate appropriate to-dos and questions following the same structure and depth as the existing ones.
- **Start simple, iterate.** Get the core card-based dashboard working with Google Sheets read/write first. Then add search, filtering, dependencies, and the "what's next" feature.
- **All data changes should save to Google Sheets in the background** — no "Save" button. Use debounced writes so typing in an answer field doesn't trigger a save on every keystroke.
- **Handle offline gracefully** — if the Sheets connection fails, cache changes locally and sync when reconnected.
