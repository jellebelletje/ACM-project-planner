# ACM Activity Dashboard — Setup Guide

## Prerequisites
- A Google account
- A modern web browser (Chrome, Firefox, Edge, Safari)
- Python 3 (for generating seed data)

---

## Step 1: Generate Seed Data

In the project folder, run:

```bash
python3 parse_markdown.py
```

This parses `ACM_Activity_Breakdown.md` and creates `seed-data.json` with all 32 activities, 275 to-dos, and 272 questions.

---

## Step 2: Create and Populate the Google Sheet

### Option A: Use the Gemini Prompts (Recommended)

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "ACM Activity Dashboard"
3. Open **Gemini** (the AI assistant in Sheets)
4. Paste the prompts from the `gemini-prompts/` folder **in order**:
   - `1-activities.md` — Creates the Activities sheet with all 32 activities
   - `2-todos.md` — Creates the Todos sheet with all 275 to-dos
   - `3-questions.md` — Creates the Questions sheet with all 272 questions
   - `4-notes-milestones-config.md` — Creates Notes_Links, Technical_Milestones, and Project_Config sheets
5. After each prompt, verify the sheet tab was created with the correct data

The full combined prompt is also available in `gemini-prompt.md` (92K chars — may need to be pasted in parts).

### Option B: Use the Seed Script

If Gemini doesn't work or you prefer a programmatic approach:

1. Create the empty sheet structure manually with these 6 tabs:

#### Tab: `Activities`
| id | title | intro_text | full_description | pdca_phase | sequence | status | due_date | depends_on | particularisation_guidance | created_at | updated_at |

#### Tab: `Todos`
| id | activity_id | text | is_done | is_project_specific | assigned_to | due_date | sequence |

#### Tab: `Questions`
| id | activity_id | sub_topic | question_text | ask_whom | answer | is_answered | sequence |

#### Tab: `Notes_Links`
| id | activity_id | type | content | url | label | date_added |

#### Tab: `Technical_Milestones`
| id | milestone_name | date | status | notes | sequence |

### Tab: `Project_Config`
| key | value |

Add these default rows to `Project_Config`:
- `project_name` | *(blank)*
- `client_name` | *(blank)*
- `start_date` | *(blank)*
- `end_date` | *(blank)*
- `current_phase` | Plan I: Diagnosis
- `consultant_name` | *(blank)*

**Tip:** You can paste the Gemini prompt from the plan file to automate this setup.

---

## Step 3: Deploy the Apps Script API

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any default code in `Code.gs`
3. Copy the entire contents of `apps-script/Code.gs` from this project and paste it into the editor
4. Click **Deploy → New deployment**
5. Set:
   - **Type:** Web app
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**
7. **Copy the deployment URL** — it looks like: `https://script.google.com/macros/s/XXXX.../exec`
8. When prompted, click **Authorize access** and follow the permissions flow

### Testing the API

Open this URL in your browser:
```
YOUR_DEPLOYMENT_URL?action=getConfig
```

You should see JSON like:
```json
{"project_name":"","client_name":"","start_date":"","end_date":"","current_phase":"Plan I: Diagnosis","consultant_name":""}
```

---

## Step 4: Seed the Data

1. Open `seed.html` in your browser (just double-click it or use a local server)
2. Paste your Apps Script deployment URL into the API URL field
3. Review the seed data summary (should show 32 activities, 275 todos, 272 questions)
4. Click **"Seed Data to Google Sheet"**
5. Wait 30-60 seconds for the data to populate
6. Check your Google Sheet — all tabs should now have data

---

## Step 5: Configure and Open the Dashboard

1. Open `index.html` in your browser
2. If no data loads, click the **gear icon** (Settings) in the top-right
3. Enter your Apps Script deployment URL
4. Click **Save Settings**
5. Reload the page — the dashboard should now load with all activities

### Alternative: Local Mode (No Google Sheets)

If `seed-data.json` exists in the same directory, the dashboard will load it directly without needing a Google Sheets connection. Changes won't persist across sessions in this mode, but it's useful for previewing the dashboard.

---

## Using the Dashboard

### Navigation
- Click **phase buttons** on the left to jump to a phase
- Click any **activity card** to expand it
- Use the **search bar** to find activities, todos, or questions
- Use the **status filter** to show only specific statuses

### Editing
- **Everything is editable.** Click on text to edit it inline.
- **Activity status:** Use the dropdown in the expanded card's Overview tab
- **To-dos:** Check/uncheck, edit text, add new, delete
- **Questions:** Edit question text, answer field, "Ask whom" badge
- **Notes & Links:** Add notes, add links with URLs, edit, delete
- **Phase names:** Click on a phase heading to rename it
- **Project name / client:** Click on the header text to edit

### Milestones
- Click **"+ Milestone"** above the timeline to add one
- Click any milestone dot to edit or delete it

### Data Sync
- All changes save automatically to Google Sheets (debounced, 500ms delay)
- A sync indicator appears bottom-right when saving
- Data is also cached locally for offline resilience

---

## Updating the Apps Script

If you modify `Code.gs`:
1. Go to **Extensions → Apps Script** in your Sheet
2. Paste the updated code
3. Click **Deploy → Manage deployments**
4. Click the pencil icon on your deployment
5. Change **Version** to "New version"
6. Click **Deploy**

The URL stays the same — no need to update the dashboard config.

---

## Troubleshooting

- **"CORS error" or fetch fails:** Make sure the Apps Script is deployed with "Anyone" access. Apps Script uses redirects, so the dashboard uses `redirect: 'follow'`.
- **Data not loading:** Check browser console for errors. Verify the API URL is correct in Settings.
- **Seed fails:** Ensure all 6 sheet tabs exist with correct names and header rows before seeding.
- **Changes not saving:** Check that the API URL is set. Look at the sync indicator — red means an error occurred.
