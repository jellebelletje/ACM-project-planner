# Gemini Prompt: Create and Populate ACM Activity Dashboard Google Sheet

Copy and paste this prompt into Gemini inside a new Google Sheet.
If the prompt is too long for a single paste, use the section markers to split it into multiple prompts.

---

## PROMPT START

Create 6 sheets (tabs) in this spreadsheet with the following structures and data. Add the headers in row 1 of each sheet. Format headers as bold. Freeze row 1 on all sheets.

### Sheet 1: Activities

Headers: id | title | intro_text | full_description | pdca_phase | sequence | status | due_date | depends_on | particularisation_guidance | created_at | updated_at

Set data validation on column G (status) with dropdown options: not_started, in_progress, completed, blocked
Set column H (due_date) to date format. Set columns K-L to date-time format.

Populate with these rows:

| id | title | intro_text | pdca_phase | sequence | status | depends_on | particularisation_guidance |
|---|---|---|---|---|---|---|---|
| A01 | Assess Sponsorship in a Structured Interview | Identify the executive sponsor and any co-sponsors for this initiative | Plan I: Diagnosis | 1 | not_started |  | For **technology rollouts** (e.g., M365 Copilot), probe specifically whether the sponsor has personal experience with the technology and whether they will use it visibly. For **process changes**, focu |
| A02 | Stakeholder Identification and Influence Mapping | Obtain the organisational chart for all affected business units | Plan I: Diagnosis | 2 | not_started |  | For **technology rollouts**, ensure you identify the IT stakeholders who control deployment, licensing, and security configuration — they can block adoption regardless of business support. For **proce |
| A03 | Impact Analysis at the Role Level | Identify all distinct roles affected by the change (not just job titles — functional roles) | Plan I: Diagnosis | 3 | not_started |  | For **technology rollouts** (e.g., M365 Copilot), map impact per application per role — e.g., Finance uses Excel heavily, Communications uses Word and Outlook. For **process changes**, walk the end-to |
| A04 | Assess Current State Capability Baseline | Define what capabilities (skills, knowledge, behaviours) are relevant to assess for this change | Plan I: Diagnosis | 4 | not_started |  | For **technology rollouts**, assess current digital literacy levels — not just familiarity with the specific tool, but general comfort with technology. Include questions about the current tool equival |
| A05 | Organisational Change History and Scar Tissue Assessment | Identify the major changes the organisation has undergone in the last 2–3 years | Plan I: Diagnosis | 5 | not_started |  | For **technology rollouts**, specifically ask about previous technology implementations — did the last system go-live go smoothly? Was training adequate? Were workarounds needed? For **process changes |
| A06 | Assess Middle Management Readiness and Willingness | Identify all middle managers whose teams are affected by the change | Plan I: Diagnosis | 6 | not_started |  | For **technology rollouts**, assess managers' own digital competence — a manager who doesn't use the tool cannot credibly coach their team. Add questions like "Will you use this tool yourself?" and "H |
| A07 | Create Resistance Risk Profile | Compile findings from Activities 1–6 into a single working document | Plan I: Diagnosis | 7 | not_started | A01,A02,A03,A05,A06 | For **technology rollouts** (especially AI/automation), explicitly assess fear of job displacement — this is often the dominant resistance factor even if unstated. Add questions about whether roles wi |
| A08 | Create a Change Strategy Document | Draft the change strategy document structure: organisation context, change difficulty analysis, inte | Plan I: Diagnosis | 8 | not_started | A01,A02,A03,A04,A05,A06,A07 | For **technology rollouts**, the strategy should address the deployment sequence (who gets it first) and its change management implications. For **process changes**, focus on embedding the change into |
| A09 | Design a Stakeholder Engagement Plan | Review the stakeholder map (from Activity 2) and resistance risk profile (from Activity 7) | Plan I: Diagnosis | 9 | not_started | A02,A07 | For **technology rollouts**, include IT leadership and security/compliance stakeholders in the engagement plan — they often control access and configuration. For **process changes**, engage process ow |
| A10 | Design the Training Architecture | Map the gap between current capability (Activity 4) and required future-state capability (Activity 3 | Plan I: Diagnosis | 10 | not_started | A03,A04 | For **technology rollouts**, design role-specific training paths (e.g., Finance team on Copilot in Excel, Communications on Word and Outlook). Include a safe practice environment so people can experim |
| A11 | Design Communication with Message Architecture | Define the communication audiences (may differ from stakeholder groups — broader reach) | Plan I: Diagnosis | 11 | not_started | A08,A09 | For **technology rollouts**, the "What changes for me?" message must be very specific and practical — avoid generic "this exciting new tool" language. Show before/after examples of actual workflows. F |
| A12 | Get Technical Deployment Timeline and Dependencies | Obtain the full technical deployment timeline from the IT/technical project manager | Plan II: Design + Activate Champions | 12 | not_started |  | For **technology rollouts**, this activity is central — the entire ACM plan is built around the technical deployment sequence. Get into the detail: licence provisioning, conditional access policies, s |
| A13 | Establish the Measurement Framework | Define metrics at three levels: | Plan II: Design + Activate Champions | 13 | not_started | A04,A08 | For **technology rollouts** (especially M365), rich telemetry is often available through admin centres and adoption dashboards — leverage these rather than building custom solutions. For **process cha |
| A14 | Develop Resistance Management Approach | Review the resistance risk profile (from Activity 7) | Plan II: Design + Activate Champions | 14 | not_started | A07 | For **technology rollouts** (especially AI), competence anxiety and job displacement fear are the dominant patterns — design interventions around psychological safety, safe practice spaces, and honest |
| A15 | Set Up the Change Network (Champions) | Define the champion role: expectations, time commitment, benefits, and duration | Plan II: Design + Activate Champions | 15 | not_started |  | For **technology rollouts**, champions should be people who will use the tool daily and can demonstrate practical use cases to peers — not just tech-savvy people, but people who understand the work. F |
| A16 | Negotiate Governance Integration | Identify the existing programme governance structure (steering committee, project board, working gro | Plan II: Design + Activate Champions | 16 | not_started |  | For **large technology rollouts**, governance integration is critical because technical decisions (e.g., feature suppression, security restrictions) directly affect adoption — the ACM lead must be abl |
| A17 | Set Up Dedicated Teams Channels | Create or request creation of the following Teams channels: | Plan II: Design + Activate Champions | 17 | not_started |  | For **technology rollouts**, the pilot participant channel is especially important — it becomes the primary feedback loop during pilot. For **process changes**, consider a "Process Q&A" channel where  |
| A18 | Activate the Communication Sequence | Confirm the deployment date is firm with the technical team | Do: Deployment | 18 | not_started | A11,A12 | For **technology rollouts**, the day-one communication must be highly practical: "Open this app. Click here. Try this." Avoid generic enthusiasm. For **process changes**, communicate both what to star |
| A19 | Execute Training as per Architecture | Confirm training schedule with all participants and their managers | Do: Deployment | 19 | not_started | A10 | For **technology rollouts**, training must include hands-on practice in a safe environment, not just demonstrations. Consider recording sessions for on-demand replay. For **process changes**, training |
| A20 | Shift to Active Field Support | Brief champions on their active support role during deployment | Do: Deployment | 20 | not_started | A15 | For **technology rollouts**, champions should sit with their teams and demonstrate real use cases in real work — not contrived examples. For **process changes**, champions should be the go-to people f |
| A21 | Run Support Infrastructure | Confirm dedicated help desk queue is operational and staffed | Do: Deployment | 21 | not_started |  | For **technology rollouts**, ensure support staff have access to the same version and configuration that users have — nothing undermines credibility faster than support not being able to reproduce the |
| A22 | Monitor Adoption Telemetry Against Baseline | Activate monitoring dashboards and reports as designed in Activity 13 | Do: Deployment | 22 | not_started | A04,A13 | For **technology rollouts** (especially M365), leverage built-in adoption dashboards (e.g., Microsoft Adoption Score, Copilot Dashboard). For **process changes**, telemetry may not exist — use audit d |
| A23 | Conduct Active Resistance Management | Activate the resistance management interventions designed in Activity 14 | Do: Deployment | 23 | not_started | A14 | For **technology rollouts**, watch for "shadow IT" — people finding workarounds to avoid the new tool. This is a strong signal of either poor usability or inadequate training. For **process changes**, |
| A24 | Run Rapid Check-Act Loops | Synthesise findings from all sensing channels: champion reports, support tickets, telemetry data, re | Do: Deployment | 24 | not_started | A20,A21,A22,A23 | For **technology rollouts**, the check-act loop should include a direct line to the technical team for configuration or feature issues that emerge during deployment. For **process changes**, loop in p |
| A25 | Assess Champion Network Health | Conduct a structured review of the champion network: who is still active? Who has disengaged? | Check: Analyse | 25 | not_started | A15,A20 | For **technology rollouts**, champion networks often need to persist beyond initial deployment as new features are released. For **process changes**, champions may transition into process owners or SM |
| A26 | Run Programme Level Check (Strategic Review) | Synthesise data from all sources: telemetry, interview findings, training effectiveness, champion re | Check: Analyse | 26 | not_started | A18,A19,A20,A21,A22,A23,A24 | For **technology rollouts**, the strategic review should include a comparison of adoption patterns against industry benchmarks if available. For **process changes**, include a process compliance audit |
| A27 | Design the Reinforcement Plan | Segment the user population by adoption maturity: advanced users, competent users, struggling users, | Check: Analyse | 27 | not_started |  | For **technology rollouts**, reinforcement often includes showcasing real examples of how colleagues are using the tool productively — social proof is powerful. For **process changes**, reinforcement  |
| A28 | Identify and Escalate Systemic Barriers | Review all accumulated data for issues that are design, policy, or infrastructure problems — not ado | Check: Analyse | 28 | not_started |  | For **technology rollouts** (especially M365 Copilot), common barriers include overly restrictive security policies, data access limitations, licensing issues, and missing integrations. For **process  |
| A29 | Begin Knowledge Transfer | Identify internal owners for ongoing adoption management: | Act: Handover, Anchor & Learn | 29 | not_started |  | For **technology rollouts**, ensure IT has the skills and tools to continue monitoring adoption telemetry. Ensure L&D has ownership of training materials and a plan for updating them as the technology |
| A30 | State Resistance Profile and Adjust | Revisit the original resistance risk profile (Activity 7) and compare predictions to actual outcomes | Act: Handover, Anchor & Learn | 30 | not_started | A07,A23 | For **technology rollouts**, watch for resistance that transformed from "I can't use it" (competence) to "I don't want to use it" (motivation) — this often signals poor user experience or lack of perc |
| A31 | Codify What Worked into Organisational Infrastructure | Identify successful patterns and behaviours that need to be structurally embedded (not dependent on  | Act: Handover, Anchor & Learn | 31 | not_started |  | For **technology rollouts**, codification includes ensuring the tool is part of standard operating procedures, included in onboarding, and that usage expectations are clear. For **process changes**, u |
| A32 | Create ACM Programme Retrospective | Schedule a retrospective session with the core ACM team, programme manager, and key stakeholders | Act: Handover, Anchor & Learn | 32 | not_started |  | For **technology rollouts**, the retrospective should include a technology-specific section: was the product mature enough? Were technical prerequisites met on time? Did vendor support meet expectatio |

---

### Sheet 2: Todos

Headers: id | activity_id | text | is_done | is_project_specific | assigned_to | due_date | sequence

Set column D (is_done) and column E (is_project_specific) as checkboxes.
Set column G (due_date) to date format.

Populate with these rows:

| id | activity_id | text | is_done | is_project_specific | assigned_to | due_date | sequence |
|---|---|---|---|---|---|---|---|
| T001 | A01 | Identify the executive sponsor and any co-sponsors for this initiative | FALSE | FALSE | | | 0 |
| T002 | A01 | Schedule a 60–90 minute structured interview with each sponsor | FALSE | FALSE | | | 1 |
| T003 | A01 | Prepare the interview question set (see Questions below) | FALSE | FALSE | | | 2 |
| T004 | A01 | Send pre-read materials to the sponsor 48 hours before the interview (project brief, scope summary, expected role of sponsor) | FALSE | FALSE | | | 3 |
| T005 | A01 | Conduct the interview and document findings in a sponsor readiness matrix (using Prosci's CLARC model: Coalition building, Leadership, Active & visible participation, Resistance management, Communication) | FALSE | FALSE | | | 4 |
| T006 | A01 | Score sponsor readiness across each CLARC dimension and identify gaps | FALSE | FALSE | | | 5 |
| T007 | A01 | Develop a sponsor coaching plan to address identified gaps | FALSE | FALSE | | | 6 |
| T008 | A01 | [Project-specific: Add any additional sponsor-related tasks based on organisational structure, e.g., if there are multiple business unit sponsors who need aligning] | FALSE | TRUE | | | 7 |
| T009 | A02 | Obtain the organisational chart for all affected business units | FALSE | FALSE | | | 0 |
| T010 | A02 | Conduct a preliminary stakeholder brainstorm with the sponsor and project manager to identify all individuals and groups who are affected by, or can influence, the change | FALSE | FALSE | | | 1 |
| T011 | A02 | Categorise stakeholders by level: senior leaders, middle managers, frontline staff, support functions (IT, HR, L&D), external parties | FALSE | FALSE | | | 2 |
| T012 | A02 | Schedule structured interviews with senior leaders and their direct reports (30–45 minutes each) | FALSE | FALSE | | | 3 |
| T013 | A02 | Prepare the interview question set (see Questions below) | FALSE | FALSE | | | 4 |
| T014 | A02 | Conduct interviews and document each stakeholder's influence level and disposition (supportive, neutral, resistant) | FALSE | FALSE | | | 5 |
| T015 | A02 | Create a stakeholder map with axes of influence (high/low) and disposition (supportive/neutral/resistant) | FALSE | FALSE | | | 6 |
| T016 | A02 | Identify priority stakeholders: high-influence resistors (need converting) and high-influence supporters (need equipping) | FALSE | FALSE | | | 7 |
| T017 | A02 | [Project-specific: Add stakeholders unique to this project, e.g., union representatives, regulatory bodies, vendor partners] | FALSE | TRUE | | | 8 |
| T018 | A03 | Identify all distinct roles affected by the change (not just job titles — functional roles) | FALSE | FALSE | | | 0 |
| T019 | A03 | For each role, document the current-state workflow (how they do their work today) | FALSE | FALSE | | | 1 |
| T020 | A03 | For each role, document the future-state workflow (how they will do their work after the change) | FALSE | FALSE | | | 2 |
| T021 | A03 | Map the gap between current and future state for each role: what disappears, what stays, what is new, what changes | FALSE | FALSE | | | 3 |
| T022 | A03 | Create a structured impact analysis matrix: Role × Impact dimension (tools, processes, skills, reporting lines, performance metrics, workload) | FALSE | FALSE | | | 4 |
| T023 | A03 | Rate the severity of impact per role (high/medium/low) to prioritise intervention effort | FALSE | FALSE | | | 5 |
| T024 | A03 | Validate the impact analysis with middle managers and subject matter experts | FALSE | FALSE | | | 6 |
| T025 | A03 | [Project-specific: Add role-specific workflows and impact dimensions unique to the change being introduced] | FALSE | TRUE | | | 7 |
| T026 | A04 | Define what capabilities (skills, knowledge, behaviours) are relevant to assess for this change | FALSE | FALSE | | | 0 |
| T027 | A04 | Design or select an assessment instrument (survey, skills test, self-assessment, observation) | FALSE | FALSE | | | 1 |
| T028 | A04 | Pilot the assessment with a small group to validate clarity and relevance | FALSE | FALSE | | | 2 |
| T029 | A04 | Deploy the assessment across all affected populations | FALSE | FALSE | | | 3 |
| T030 | A04 | Analyse results and segment by role, department, location, and experience level | FALSE | FALSE | | | 4 |
| T031 | A04 | Identify capability clusters: those already near-ready, those needing moderate upskilling, those needing significant support | FALSE | FALSE | | | 5 |
| T032 | A04 | Document the baseline as a quantified reference point for measuring progress post-deployment | FALSE | FALSE | | | 6 |
| T033 | A04 | Share findings with the training architecture design (→ feeds into Activity 10) | FALSE | FALSE | | | 7 |
| T034 | A04 | [Project-specific: Define the specific skills and tools to assess based on what is being introduced] | FALSE | TRUE | | | 8 |
| T035 | A05 | Identify the major changes the organisation has undergone in the last 2–3 years | FALSE | FALSE | | | 0 |
| T036 | A05 | Select interviewees: long-tenured staff, middle managers, HR, and anyone who was involved in previous change efforts | FALSE | FALSE | | | 1 |
| T037 | A05 | Schedule 30–45 minute interviews (individual or small group) | FALSE | FALSE | | | 2 |
| T038 | A05 | Prepare the interview question set (see Questions below) | FALSE | FALSE | | | 3 |
| T039 | A05 | Conduct interviews and document themes, patterns, and emotional residue | FALSE | FALSE | | | 4 |
| T040 | A05 | Create a change history timeline noting: what was promised, what was delivered, what was the experience | FALSE | FALSE | | | 5 |
| T041 | A05 | Identify "scar tissue" — areas where previous failed or painful changes have created cynicism, distrust, or resistance patterns | FALSE | FALSE | | | 6 |
| T042 | A05 | Document implications for the current initiative: what to avoid, what to address explicitly, what narratives to counter | FALSE | FALSE | | | 7 |
| T043 | A05 | [Project-specific: Research specific past changes that are relevant to the current initiative, e.g., previous technology rollouts if this is a tech change] | FALSE | TRUE | | | 8 |
| T044 | A06 | Identify all middle managers whose teams are affected by the change | FALSE | FALSE | | | 0 |
| T045 | A06 | Schedule small group conversations (3–5 managers per group, 60 minutes) or individual interviews for sensitive contexts | FALSE | FALSE | | | 1 |
| T046 | A06 | Prepare the conversation guide (see Questions below) | FALSE | FALSE | | | 2 |
| T047 | A06 | Conduct conversations and document each manager's readiness (ability to support the change) and willingness (desire to support the change) | FALSE | FALSE | | | 3 |
| T048 | A06 | Plot managers on a readiness × willingness matrix | FALSE | FALSE | | | 4 |
| T049 | A06 | For managers who are willing but not ready: plan capability building (training, coaching, resources) | FALSE | FALSE | | | 5 |
| T050 | A06 | For managers who are ready but not willing: plan engagement and motivation interventions (address concerns, connect to their interests) | FALSE | FALSE | | | 6 |
| T051 | A06 | For managers who are neither ready nor willing: escalate to sponsor for direct intervention | FALSE | FALSE | | | 7 |
| T052 | A06 | Develop targeted support plans for each manager segment | FALSE | FALSE | | | 8 |
| T053 | A06 | [Project-specific: Add questions specific to the managerial capabilities this change requires, e.g., coaching digital skills if it's a tech rollout] | FALSE | TRUE | | | 9 |
| T054 | A07 | Compile findings from Activities 1–6 into a single working document | FALSE | FALSE | | | 0 |
| T055 | A07 | Identify all distinct affected populations (by role, department, location, or other meaningful segmentation) | FALSE | FALSE | | | 1 |
| T056 | A07 | For each population, analyse what they stand to lose: status, competence, autonomy, workload predictability | FALSE | FALSE | | | 2 |
| T057 | A07 | For each population, analyse what they might gain and whether they perceive it as a gain | FALSE | FALSE | | | 3 |
| T058 | A07 | Assess structural factors for each population: quality of manager support, sponsor visibility, communication trust, prior change experience | FALSE | FALSE | | | 4 |
| T059 | A07 | Rate resistance risk for each population (high/medium/low) with supporting evidence | FALSE | FALSE | | | 5 |
| T060 | A07 | Document the resistance risk profile as a formal artefact | FALSE | FALSE | | | 6 |
| T061 | A07 | Review and validate with the sponsor and programme manager | FALSE | FALSE | | | 7 |
| T062 | A07 | [Project-specific: Identify population-specific resistance factors unique to this change, e.g., for AI tools — fear of job replacement] | FALSE | TRUE | | | 8 |
| T063 | A08 | Draft the change strategy document structure: organisation context, change difficulty analysis, intervention plan, success criteria | FALSE | FALSE | | | 0 |
| T064 | A08 | Write the organisational context section: who is this organisation, what are its characteristics, how does it handle change? | FALSE | FALSE | | | 1 |
| T065 | A08 | Write the change difficulty analysis: what specifically makes this change hard for this organisation? | FALSE | FALSE | | | 2 |
| T066 | A08 | Define named populations with specific intervention plans for each (drawing from the resistance risk profile) | FALSE | FALSE | | | 3 |
| T067 | A08 | Define success criteria: what does successful adoption look like? At what levels? By when? | FALSE | FALSE | | | 4 |
| T068 | A08 | Define the measurement approach (high level — detailed measurement in Activity 13) | FALSE | FALSE | | | 5 |
| T069 | A08 | Include governance and escalation approach | FALSE | FALSE | | | 6 |
| T070 | A08 | Review with sponsor and obtain sign-off | FALSE | FALSE | | | 7 |
| T071 | A08 | [Project-specific: Tailor the strategy to the specific change type and organisational context] | FALSE | TRUE | | | 8 |
| T072 | A09 | Review the stakeholder map (from Activity 2) and resistance risk profile (from Activity 7) | FALSE | FALSE | | | 0 |
| T073 | A09 | Prioritise stakeholders by influence and disposition: identify the "must-engage" list | FALSE | FALSE | | | 1 |
| T074 | A09 | For each priority stakeholder, define the engagement approach: one-on-one, small group, or inclusion in a working group | FALSE | FALSE | | | 2 |
| T075 | A09 | Build a coalition of supportive stakeholders: equip them with talking points, early access, and information advantage | FALSE | FALSE | | | 3 |
| T076 | A09 | Plan early engagement with high-influence resistors — engage before the change becomes visible | FALSE | FALSE | | | 4 |
| T077 | A09 | Create an engagement cadence: who to meet, when, what's needed at each stage, what they need from you | FALSE | FALSE | | | 5 |
| T078 | A09 | Prepare talking points and briefing materials for supportive leaders to use with their teams | FALSE | FALSE | | | 6 |
| T079 | A09 | Schedule all engagements and set up calendar invitations | FALSE | FALSE | | | 7 |
| T080 | A09 | [Project-specific: Identify stakeholder-specific engagement needs, e.g., a union engagement process, regulatory briefings, vendor coordination meetings] | FALSE | TRUE | | | 8 |
| T081 | A10 | Map the gap between current capability (Activity 4) and required future-state capability (Activity 3) per role | FALSE | FALSE | | | 0 |
| T082 | A10 | Determine the training modality for each population: instructor-led, e-learning, peer coaching, self-paced, blended | FALSE | FALSE | | | 1 |
| T083 | A10 | Decide training timing: before deployment, at deployment, or phased after deployment | FALSE | FALSE | | | 2 |
| T084 | A10 | Define prerequisites: what must people know or have access to before training begins? | FALSE | FALSE | | | 3 |
| T085 | A10 | Map training touchpoints in the deployment timeline with dependencies | FALSE | FALSE | | | 4 |
| T086 | A10 | Identify who will deliver training: external trainers, internal L&D, champions, managers | FALSE | FALSE | | | 5 |
| T087 | A10 | Estimate training duration and scheduling constraints per population | FALSE | FALSE | | | 6 |
| T088 | A10 | Confirm training environment requirements (sandbox, test tenant, demo data) | FALSE | FALSE | | | 7 |
| T089 | A10 | Document the training architecture (structure and approach — not content yet) | FALSE | FALSE | | | 8 |
| T090 | A10 | [Project-specific: Design role-specific training pathways based on the specific tool, process, or change being introduced] | FALSE | TRUE | | | 9 |
| T091 | A11 | Define the communication audiences (may differ from stakeholder groups — broader reach) | FALSE | FALSE | | | 0 |
| T092 | A11 | Design the message sequence aligned to the audience's psychological journey: | FALSE | FALSE | | | 1 |
| T093 | A11 | Define the communication channels for each audience (email, Teams, town hall, intranet, manager cascade, video) | FALSE | FALSE | | | 2 |
| T094 | A11 | Ensure managers hear before their teams — build in a management pre-brief at each stage | FALSE | FALSE | | | 3 |
| T095 | A11 | Create a communication timeline mapped to the deployment schedule | FALSE | FALSE | | | 4 |
| T096 | A11 | Draft key messages and have them reviewed by the sponsor and programme manager | FALSE | FALSE | | | 5 |
| T097 | A11 | Plan for two-way communication: how will questions and feedback be captured and responded to? | FALSE | FALSE | | | 6 |
| T098 | A11 | [Project-specific: Adapt messaging to address the specific "What's in it for me?" for each population and the specific change being introduced] | FALSE | TRUE | | | 7 |
| T099 | A12 | Obtain the full technical deployment timeline from the IT/technical project manager | FALSE | FALSE | | | 0 |
| T100 | A12 | Map every technical milestone and identify its downstream ACM implications (e.g., "tenant configured" → "training environments available") | FALSE | FALSE | | | 1 |
| T101 | A12 | Confirm pilot environment availability dates and scope | FALSE | FALSE | | | 2 |
| T102 | A12 | Confirm go-live date and any hard dependencies (e.g., licence activation, security approvals) | FALSE | FALSE | | | 3 |
| T103 | A12 | Identify the rollback plan: what happens if go-live fails? | FALSE | FALSE | | | 4 |
| T104 | A12 | Build the ACM plan against the technical timeline — align all communication, training, and support activities to technical milestones | FALSE | FALSE | | | 5 |
| T105 | A12 | Identify risks: what technical delays would cascade into ACM plan disruption? | FALSE | FALSE | | | 6 |
| T106 | A12 | Establish a regular sync cadence with the technical team | FALSE | FALSE | | | 7 |
| T107 | A12 | [Project-specific: Map technology-specific deployment steps and their ACM implications] | FALSE | TRUE | | | 8 |
| T108 | A13 | Define metrics at three levels: | FALSE | FALSE | | | 0 |
| T109 | A13 | Identify data sources for each metric: system telemetry, surveys, assessments, business data | FALSE | FALSE | | | 1 |
| T110 | A13 | Establish baseline measurements (drawing from Activity 4) | FALSE | FALSE | | | 2 |
| T111 | A13 | Define measurement frequency: daily/weekly during deployment, monthly post-deployment | FALSE | FALSE | | | 3 |
| T112 | A13 | Partner with business stakeholders to agree on business impact metrics and data access | FALSE | FALSE | | | 4 |
| T113 | A13 | Build or configure dashboards/reports for ongoing monitoring | FALSE | FALSE | | | 5 |
| T114 | A13 | Integrate the measurement framework into the change strategy document | FALSE | FALSE | | | 6 |
| T115 | A13 | [Project-specific: Define specific metrics based on the tool, process, or change and available data sources] | FALSE | TRUE | | | 7 |
| T116 | A14 | Review the resistance risk profile (from Activity 7) | FALSE | FALSE | | | 0 |
| T117 | A14 | For each high-risk resistance cluster, design a specific intervention: | FALSE | FALSE | | | 1 |
| T118 | A14 | Distinguish between resistance that is an adoption problem (to be managed) and resistance that signals a genuine design/structural problem (to be escalated) | FALSE | FALSE | | | 2 |
| T119 | A14 | Prepare intervention materials and resources | FALSE | FALSE | | | 3 |
| T120 | A14 | Brief the sponsor, middle managers, and champions on resistance patterns to expect and how to respond | FALSE | FALSE | | | 4 |
| T121 | A14 | Define escalation criteria: what level of resistance triggers escalation to governance? | FALSE | FALSE | | | 5 |
| T122 | A14 | [Project-specific: Design interventions tailored to the specific resistance patterns expected for this change] | FALSE | TRUE | | | 6 |
| T123 | A15 | Define the champion role: expectations, time commitment, benefits, and duration | FALSE | FALSE | | | 0 |
| T124 | A15 | Define champion selection criteria: peer credibility, enthusiasm for the change, respected by colleagues (not just high performers or volunteers) | FALSE | FALSE | | | 1 |
| T125 | A15 | Identify potential champions — solicit nominations from middle managers and the sponsor | FALSE | FALSE | | | 2 |
| T126 | A15 | Conduct a formal recruitment process: approach candidates individually, explain the role, gauge willingness | FALSE | FALSE | | | 3 |
| T127 | A15 | Secure manager approval for each champion's time commitment | FALSE | FALSE | | | 4 |
| T128 | A15 | Equip champions: provide early access to the tool/process, deeper context on the change, and a direct communication line back to the ACM team | FALSE | FALSE | | | 5 |
| T129 | A15 | Conduct initial champion training: what they need to know, how to support peers, how to report back | FALSE | FALSE | | | 6 |
| T130 | A15 | Establish a regular check-in rhythm (weekly during deployment, fortnightly post-deployment) | FALSE | FALSE | | | 7 |
| T131 | A15 | Create a champion communication channel (e.g., Teams channel) | FALSE | FALSE | | | 8 |
| T132 | A15 | Prepare updated talking points and troubleshooting guidance for champions to use | FALSE | FALSE | | | 9 |
| T133 | A15 | [Project-specific: Tailor champion role and training to the specific change, e.g., tool-specific tips for tech rollouts] | FALSE | TRUE | | | 10 |
| T134 | A16 | Identify the existing programme governance structure (steering committee, project board, working groups) | FALSE | FALSE | | | 0 |
| T135 | A16 | Propose a formal seat for ACM in programme governance (standing agenda item, reporting cadence) | FALSE | FALSE | | | 1 |
| T136 | A16 | Define which decisions the ACM lead can make autonomously vs. what requires governance approval | FALSE | FALSE | | | 2 |
| T137 | A16 | Define what constitutes an ACM risk requiring escalation (e.g., adoption dropping below threshold, widespread resistance, sponsor disengagement) | FALSE | FALSE | | | 3 |
| T138 | A16 | Agree on ACM reporting format and frequency | FALSE | FALSE | | | 4 |
| T139 | A16 | Negotiate ACM inclusion in the programme risk register | FALSE | FALSE | | | 5 |
| T140 | A16 | Document governance agreements and circulate to all governance members | FALSE | FALSE | | | 6 |
| T141 | A16 | [Project-specific: Adapt governance integration to the specific programme structure and political dynamics] | FALSE | TRUE | | | 7 |
| T142 | A17 | Create or request creation of the following Teams channels: | FALSE | FALSE | | | 0 |
| T143 | A17 | Define the purpose and posting guidelines for each channel | FALSE | FALSE | | | 1 |
| T144 | A17 | Populate channels with relevant members | FALSE | FALSE | | | 2 |
| T145 | A17 | Post a welcome message in each channel explaining its purpose | FALSE | FALSE | | | 3 |
| T146 | A17 | Pin key resources (project brief, timeline, FAQ) in each channel | FALSE | FALSE | | | 4 |
| T147 | A17 | Assign channel moderation responsibilities | FALSE | FALSE | | | 5 |
| T148 | A17 | [Project-specific: Create additional channels if needed, e.g., regional channels for multi-location deployments, or topic-specific channels for complex changes] | FALSE | TRUE | | | 6 |
| T149 | A18 | Confirm the deployment date is firm with the technical team | FALSE | FALSE | | | 0 |
| T150 | A18 | Send pre-deployment communication 48–72 hours before go-live | FALSE | FALSE | | | 1 |
| T151 | A18 | Ensure managers have been briefed before any communication reaches their teams | FALSE | FALSE | | | 2 |
| T152 | A18 | Ensure champions know what benefits they're receiving and what's expected of them | FALSE | FALSE | | | 3 |
| T153 | A18 | Activate two-way communication channels (Q&A channels, feedback forms) | FALSE | FALSE | | | 4 |
| T154 | A18 | Monitor initial reactions and address misinformation or confusion rapidly | FALSE | FALSE | | | 5 |
| T155 | A18 | Send day-one communication: practical "what to do now" guidance | FALSE | FALSE | | | 6 |
| T156 | A18 | [Project-specific: Customise messaging with specific tool/process instructions and "What's in it for me" for each audience] | FALSE | TRUE | | | 7 |
| T157 | A19 | Confirm training schedule with all participants and their managers | FALSE | FALSE | | | 0 |
| T158 | A19 | Ensure training environments and materials are ready | FALSE | FALSE | | | 1 |
| T159 | A19 | Deliver training in the designed sequence: awareness → skill building → applied practice | FALSE | FALSE | | | 2 |
| T160 | A19 | Collect participant feedback after each training session | FALSE | FALSE | | | 3 |
| T161 | A19 | Track attendance and follow up with non-attendees | FALSE | FALSE | | | 4 |
| T162 | A19 | Provide post-training reference materials and quick-start guides | FALSE | FALSE | | | 5 |
| T163 | A19 | Identify participants who are struggling and arrange additional support | FALSE | FALSE | | | 6 |
| T164 | A19 | Feed training observations into the resistance management approach | FALSE | FALSE | | | 7 |
| T165 | A19 | [Project-specific: Execute role-specific training based on the training architecture designed in Activity 10] | FALSE | TRUE | | | 8 |
| T166 | A20 | Brief champions on their active support role during deployment | FALSE | FALSE | | | 0 |
| T167 | A20 | Position champions for peer-level help within their teams (less stigma than formal IT/training support) | FALSE | FALSE | | | 1 |
| T168 | A20 | Establish champion intelligence-gathering protocol: what to observe, how to report back | FALSE | FALSE | | | 2 |
| T169 | A20 | Champions model productive use of the new tool/process visibly within their teams | FALSE | FALSE | | | 3 |
| T170 | A20 | Maintain daily or every-other-day champion check-ins during the first two weeks | FALSE | FALSE | | | 4 |
| T171 | A20 | Collect and synthesise champion intelligence: what's working, what's confusing, what's failing | FALSE | FALSE | | | 5 |
| T172 | A20 | Ensure intelligence reaches the ACM team within hours, not days | FALSE | FALSE | | | 6 |
| T173 | A20 | Act on champion intelligence — adjust support, communication, or training as needed | FALSE | FALSE | | | 7 |
| T174 | A20 | [Project-specific: Define specific support activities and intelligence-gathering focus based on the change type] | FALSE | TRUE | | | 8 |
| T175 | A21 | Confirm dedicated help desk queue is operational and staffed | FALSE | FALSE | | | 0 |
| T176 | A21 | Set up drop-in clinic schedule (physical or virtual) — floor-walking support if applicable | FALSE | FALSE | | | 1 |
| T177 | A21 | Ensure Teams support channels are monitored and responsive | FALSE | FALSE | | | 2 |
| T178 | A21 | Brief support staff on common issues and resolution paths | FALSE | FALSE | | | 3 |
| T179 | A21 | Ensure all support is visibly operational from the moment access goes live | FALSE | FALSE | | | 4 |
| T180 | A21 | Over-resource support in the first week; scale back based on demand data | FALSE | FALSE | | | 5 |
| T181 | A21 | Track support ticket volume, categories, and resolution times | FALSE | FALSE | | | 6 |
| T182 | A21 | Feed support data into the rapid check-act loops (Activity 24) | FALSE | FALSE | | | 7 |
| T183 | A21 | [Project-specific: Configure support infrastructure for the specific tool/process and known technical issues] | FALSE | TRUE | | | 8 |
| T184 | A22 | Activate monitoring dashboards and reports as designed in Activity 13 | FALSE | FALSE | | | 0 |
| T185 | A22 | Begin tracking adoption metrics from day one of deployment | FALSE | FALSE | | | 1 |
| T186 | A22 | Compare daily/weekly metrics against the baseline established in Activity 4 | FALSE | FALSE | | | 2 |
| T187 | A22 | Track utilisation metrics: who is using it, how often, what features | FALSE | FALSE | | | 3 |
| T188 | A22 | Track proficiency indicators: are people using it correctly? | FALSE | FALSE | | | 4 |
| T189 | A22 | Identify cohorts that are adopting well vs. cohorts that are lagging | FALSE | FALSE | | | 5 |
| T190 | A22 | Report findings to the programme governance at agreed frequency | FALSE | FALSE | | | 6 |
| T191 | A22 | Feed data into rapid check-act loops (Activity 24) | FALSE | FALSE | | | 7 |
| T192 | A22 | [Project-specific: Configure specific telemetry and dashboards for the tool or process being deployed] | FALSE | TRUE | | | 8 |
| T193 | A23 | Activate the resistance management interventions designed in Activity 14 | FALSE | FALSE | | | 0 |
| T194 | A23 | Monitor for pre-identified resistance patterns manifesting as actual behaviour | FALSE | FALSE | | | 1 |
| T195 | A23 | Distinguish between productive resistance (identifying genuine problems → escalate to technical team) and defensive resistance (protecting established habits or status → manage through ACM) | FALSE | FALSE | | | 2 |
| T196 | A23 | Deploy specific interventions for each resistance cluster as designed | FALSE | FALSE | | | 3 |
| T197 | A23 | Ensure the sponsor is actively visible during the first two weeks — attending floor walks, sending messages, checking in with teams | FALSE | FALSE | | | 4 |
| T198 | A23 | Coach the sponsor on resistance interactions: what to say, how to respond, when to listen | FALSE | FALSE | | | 5 |
| T199 | A23 | Track resistance patterns: is resistance decreasing, stable, or escalating? | FALSE | FALSE | | | 6 |
| T200 | A23 | Adjust interventions if initial approach is not working | FALSE | FALSE | | | 7 |
| T201 | A23 | [Project-specific: Deploy interventions specific to the resistance patterns identified for this change] | FALSE | TRUE | | | 8 |
| T202 | A24 | Synthesise findings from all sensing channels: champion reports, support tickets, telemetry data, resistance observations, manager feedback | FALSE | FALSE | | | 0 |
| T203 | A24 | Identify the most significant gaps between expected and actual adoption within the first week | FALSE | FALSE | | | 1 |
| T204 | A24 | Diagnose probable causes for each gap | FALSE | FALSE | | | 2 |
| T205 | A24 | Design adjustments: modified training, additional communication, targeted support, process change, escalation | FALSE | FALSE | | | 3 |
| T206 | A24 | Implement adjustments within the same week | FALSE | FALSE | | | 4 |
| T207 | A24 | Document all changes and rationale in a change log | FALSE | FALSE | | | 5 |
| T208 | A24 | Report adjustments and outcomes to governance | FALSE | FALSE | | | 6 |
| T209 | A24 | Repeat the cycle: synthesise → diagnose → design → implement → document | FALSE | FALSE | | | 7 |
| T210 | A24 | [Project-specific: Define the specific data sources and synthesis cadence for this project's check-act loops] | FALSE | TRUE | | | 8 |
| T211 | A25 | Conduct a structured review of the champion network: who is still active? Who has disengaged? | FALSE | FALSE | | | 0 |
| T212 | A25 | Assess each champion's own adoption level — are they practising what they preach? | FALSE | FALSE | | | 1 |
| T213 | A25 | Gather feedback from champions: what worked, what was difficult, what support did they lack? | FALSE | FALSE | | | 2 |
| T214 | A25 | Identify burnout risk — champions often carry extra load during deployment | FALSE | FALSE | | | 3 |
| T215 | A25 | Recognise and thank active champions (publicly and privately) | FALSE | FALSE | | | 4 |
| T216 | A25 | Decide whether the champion network should continue, be refreshed, or be wound down | FALSE | FALSE | | | 5 |
| T217 | A25 | If continuing: recruit replacement champions for those who have disengaged | FALSE | FALSE | | | 6 |
| T218 | A25 | [Project-specific: Assess champion effectiveness against the specific support outcomes expected for this change] | FALSE | TRUE | | | 7 |
| T219 | A26 | Synthesise data from all sources: telemetry, interview findings, training effectiveness, champion reports, support ticket trends, resistance pattern evolution, sponsor engagement quality | FALSE | FALSE | | | 0 |
| T220 | A26 | Assess progress against the success criteria defined in the change strategy (Activity 8) | FALSE | FALSE | | | 1 |
| T221 | A26 | Identify what is working well and should be continued or amplified | FALSE | FALSE | | | 2 |
| T222 | A26 | Identify what is not working and needs adjustment | FALSE | FALSE | | | 3 |
| T223 | A26 | Create a coherent written assessment as a formal deliverable (not a verbal update) | FALSE | FALSE | | | 4 |
| T224 | A26 | Present to the steering committee | FALSE | FALSE | | | 5 |
| T225 | A26 | Obtain governance decisions on any recommended adjustments | FALSE | FALSE | | | 6 |
| T226 | A26 | [Project-specific: Include project-specific data sources and success criteria in the review] | FALSE | TRUE | | | 7 |
| T227 | A27 | Segment the user population by adoption maturity: advanced users, competent users, struggling users, non-users | FALSE | FALSE | | | 0 |
| T228 | A27 | For advanced users: design deepening activities (advanced training, power-user communities, use-case showcases) | FALSE | FALSE | | | 1 |
| T229 | A27 | For competent users: design reinforcement (refresher sessions, tips-and-tricks, continued champion support) | FALSE | FALSE | | | 2 |
| T230 | A27 | For struggling users: design remedial support (one-on-one coaching, simplified guides, manager intervention) | FALSE | FALSE | | | 3 |
| T231 | A27 | For non-users: diagnose root cause and decide whether to apply pressure, provide support, or accept non-adoption | FALSE | FALSE | | | 4 |
| T232 | A27 | Schedule reinforcement activities and assign ownership | FALSE | FALSE | | | 5 |
| T233 | A27 | Set a review date to assess reinforcement effectiveness | FALSE | FALSE | | | 6 |
| T234 | A27 | [Project-specific: Tailor reinforcement content to specific tool features, process steps, or skills relevant to this change] | FALSE | TRUE | | | 7 |
| T235 | A28 | Review all accumulated data for issues that are design, policy, or infrastructure problems — not adoption problems | FALSE | FALSE | | | 0 |
| T236 | A28 | Categorise barriers: technical configuration, security/compliance, process design, policy, organisational structure | FALSE | FALSE | | | 1 |
| T237 | A28 | For each barrier: document the evidence, the impact on adoption, and a proposed resolution | FALSE | FALSE | | | 2 |
| T238 | A28 | Escalate to the appropriate owner (IT, HR, business leadership, vendor) with specific evidence | FALSE | FALSE | | | 3 |
| T239 | A28 | Track escalated barriers to resolution — do not let them disappear into a queue | FALSE | FALSE | | | 4 |
| T240 | A28 | Report barrier status to governance | FALSE | FALSE | | | 5 |
| T241 | A28 | [Project-specific: Identify the specific systemic barriers likely to emerge for this type of change] | FALSE | TRUE | | | 6 |
| T242 | A29 | Identify internal owners for ongoing adoption management: | FALSE | FALSE | | | 0 |
| T243 | A29 | Create a knowledge transfer plan: what to transfer, to whom, by when | FALSE | FALSE | | | 1 |
| T244 | A29 | Transfer the measurement framework and dashboards with instructions | FALSE | FALSE | | | 2 |
| T245 | A29 | Transfer the champion network management approach: how to recruit, brief, and support champions | FALSE | FALSE | | | 3 |
| T246 | A29 | Transfer stakeholder relationships: introduce internal owners to key stakeholders | FALSE | FALSE | | | 4 |
| T247 | A29 | Hand over all documentation: change strategy, resistance profile, communication materials, training content | FALSE | FALSE | | | 5 |
| T248 | A29 | Conduct structured handover sessions — not just document drops | FALSE | FALSE | | | 6 |
| T249 | A29 | Shadow period: internal owners operate with consultant available for questions | FALSE | FALSE | | | 7 |
| T250 | A29 | [Project-specific: Identify specific knowledge assets and relationship transfers needed for this project] | FALSE | TRUE | | | 8 |
| T251 | A30 | Revisit the original resistance risk profile (Activity 7) and compare predictions to actual outcomes | FALSE | FALSE | | | 0 |
| T252 | A30 | Document which resistance patterns resolved, which transformed, and which persisted | FALSE | FALSE | | | 1 |
| T253 | A30 | Identify new resistance patterns that emerged and were not predicted | FALSE | FALSE | | | 2 |
| T254 | A30 | Distinguish between resistance that was validly managed as an adoption issue and resistance that proved to be a genuine design/structural problem | FALSE | FALSE | | | 3 |
| T255 | A30 | Update the resistance profile to reflect current state | FALSE | FALSE | | | 4 |
| T256 | A30 | Design ongoing management interventions for any persistent resistance | FALSE | FALSE | | | 5 |
| T257 | A30 | Document lessons for future initiatives: what resistance predictions were accurate and which were wrong? | FALSE | FALSE | | | 6 |
| T258 | A30 | [Project-specific: Assess resistance patterns specific to this change type and their current status] | FALSE | TRUE | | | 7 |
| T259 | A31 | Identify successful patterns and behaviours that need to be structurally embedded (not dependent on project energy or champion effort) | FALSE | FALSE | | | 0 |
| T260 | A31 | Update standard operating procedures (SOPs) to reflect new ways of working | FALSE | FALSE | | | 1 |
| T261 | A31 | Update job descriptions and competency frameworks to include new skills and expectations | FALSE | FALSE | | | 2 |
| T262 | A31 | Update onboarding programmes so new joiners learn the new way from day one | FALSE | FALSE | | | 3 |
| T263 | A31 | Transfer training materials to the learning management system (LMS) with an identified owner and a content refresh cycle | FALSE | FALSE | | | 4 |
| T264 | A31 | Embed adoption metrics into regular business reporting (not just project reporting) | FALSE | FALSE | | | 5 |
| T265 | A31 | Apply the "bus test": if everyone involved in this project left tomorrow, would the successful patterns persist? | FALSE | FALSE | | | 6 |
| T266 | A31 | Close gaps identified by the bus test | FALSE | FALSE | | | 7 |
| T267 | A31 | [Project-specific: Identify the specific processes, documents, and systems that need updating for this change] | FALSE | TRUE | | | 8 |
| T268 | A32 | Schedule a retrospective session with the core ACM team, programme manager, and key stakeholders | FALSE | FALSE | | | 0 |
| T269 | A32 | Prepare the retrospective agenda: what went well, what didn't, what we'd do differently, lessons for the organisation | FALSE | FALSE | | | 1 |
| T270 | A32 | Assess each major ACM intervention: was it the right intervention? Was it effective? | FALSE | FALSE | | | 2 |
| T271 | A32 | Document time and effort spent on each phase and activity (to inform scoping of future projects) | FALSE | FALSE | | | 3 |
| T272 | A32 | Identify lessons that should inform the organisation's approach to future change initiatives | FALSE | FALSE | | | 4 |
| T273 | A32 | Create a formal retrospective document and share with the sponsor and governance | FALSE | FALSE | | | 5 |
| T274 | A32 | Archive all project materials (change strategy, resistance profiles, measurement data, communication materials) for future reference | FALSE | FALSE | | | 6 |
| T275 | A32 | [Project-specific: Include project-specific reflections on what was unique about this change and what was transferable] | FALSE | TRUE | | | 7 |

---

### Sheet 3: Questions

Headers: id | activity_id | sub_topic | question_text | ask_whom | answer | is_answered | sequence

Set column G (is_answered) as a checkbox.

Populate with these rows:

| id | activity_id | sub_topic | question_text | ask_whom | answer | is_answered | sequence |
|---|---|---|---|---|---|---|---|
| Q001 | A01 | Vision and Commitment | What does success look like to you personally for this initiative? | Executive Sponsor | | FALSE | 1 |
| Q002 | A01 | Vision and Commitment | Why is this change important now? What happens if we don't do it? | Executive Sponsor | | FALSE | 2 |
| Q003 | A01 | Vision and Commitment | How does this initiative connect to the broader organisational strategy? | Executive Sponsor | | FALSE | 3 |
| Q004 | A01 | Vision and Commitment | What are you personally willing to do visibly to support this change? | Executive Sponsor | | FALSE | 4 |
| Q005 | A01 | Resources and Priority | What resources (budget, people, time) are you prepared to allocate? | Executive Sponsor | | FALSE | 5 |
| Q006 | A01 | Resources and Priority | What will you defend when competing priorities emerge? | Executive Sponsor | | FALSE | 6 |
| Q007 | A01 | Resources and Priority | Where does this rank among your current priorities? | Executive Sponsor | | FALSE | 7 |
| Q008 | A01 | Risk Awareness | What do you see as the biggest risks to adoption? | Executive Sponsor | | FALSE | 8 |
| Q009 | A01 | Risk Awareness | Which groups do you expect to resist, and why? | Executive Sponsor | | FALSE | 9 |
| Q010 | A01 | Risk Awareness | How have you handled change resistance in previous initiatives? | Executive Sponsor | | FALSE | 10 |
| Q011 | A01 | Coalition | Who else in the leadership team actively supports this? | Executive Sponsor | | FALSE | 11 |
| Q012 | A01 | Coalition | Are there leaders who are sceptical or opposed? Who? | Executive Sponsor | | FALSE | 12 |
| Q013 | A01 | Coalition | Who do people in the organisation actually listen to, regardless of title? | Executive Sponsor | | FALSE | 13 |
| Q014 | A01 | Communication | How do you currently communicate major changes to the organisation? | Executive Sponsor | | FALSE | 14 |
| Q015 | A01 | Communication | Are you willing to send communications, attend town halls, and record video messages? | Executive Sponsor | | FALSE | 15 |
| Q016 | A02 | Role and Scope | What is your role, and how does your team interact with the area being changed? | Each identified stakeholder | | FALSE | 1 |
| Q017 | A02 | Role and Scope | How many people report to you directly and indirectly? | Each identified stakeholder | | FALSE | 2 |
| Q018 | A02 | Role and Scope | Who else should I be speaking to about this change? | Each identified stakeholder | | FALSE | 3 |
| Q019 | A02 | Disposition | What have you heard about this initiative so far? | Each identified stakeholder | | FALSE | 4 |
| Q020 | A02 | Disposition | What is your initial reaction — what excites you and what concerns you? | Each identified stakeholder | | FALSE | 5 |
| Q021 | A02 | Disposition | On a scale of 1–10, how supportive are you of this change? What would move you higher? | Each identified stakeholder | | FALSE | 6 |
| Q022 | A02 | Influence | When you express a view about a change, who listens? | Each identified stakeholder | | FALSE | 7 |
| Q023 | A02 | Influence | Who do your people go to for advice when they're uncertain about something new? | Each identified stakeholder / Ask: Their direct reports | | FALSE | 8 |
| Q024 | A02 | Influence | Are there informal leaders in your area whose opinion carries weight? Who? | Each identified stakeholder | | FALSE | 9 |
| Q025 | A02 | Needs | What would you need from us to feel confident supporting this change? | Each identified stakeholder | | FALSE | 10 |
| Q026 | A02 | Needs | How do you prefer to be kept informed — and how often? | Each identified stakeholder | | FALSE | 11 |
| Q027 | A03 | Current State | Walk me through a typical day/week in your role — what tools do you use and what tasks do you perform? | End Users / Frontline Staff (sample per role) | | FALSE | 1 |
| Q028 | A03 | Current State | Which parts of your current workflow are most time-consuming or frustrating? | End Users / Frontline Staff | | FALSE | 2 |
| Q029 | A03 | Current State | What workarounds have you developed to get things done? | End Users / Frontline Staff | | FALSE | 3 |
| Q030 | A03 | Future State Understanding | What have you been told about how your work will change? | End Users / Frontline Staff | | FALSE | 4 |
| Q031 | A03 | Future State Understanding | What aspects of the change are unclear to you? | End Users / Frontline Staff | | FALSE | 5 |
| Q032 | A03 | Impact Assessment | Which of your team's workflows will be most affected by this change? | Middle Managers | | FALSE | 6 |
| Q033 | A03 | Impact Assessment | Will any tasks or responsibilities disappear entirely? Which ones? | Middle Managers / IT Lead | | FALSE | 7 |
| Q034 | A03 | Impact Assessment | What new tasks or skills will your team need to acquire? | Middle Managers | | FALSE | 8 |
| Q035 | A03 | Impact Assessment | Will performance metrics or KPIs change as a result? | Middle Managers / Programme Manager | | FALSE | 9 |
| Q036 | A03 | Impact Assessment | Will reporting lines or team structures change? | Middle Managers / Senior Leadership | | FALSE | 10 |
| Q037 | A03 | Capacity | Does your team have capacity to learn new ways of working alongside their current workload? | Middle Managers | | FALSE | 11 |
| Q038 | A03 | Capacity | What time of year or business cycle would make this change hardest to absorb? | Middle Managers | | FALSE | 12 |
| Q039 | A04 | Current Skills | How would you rate your proficiency with the current tools/processes being replaced or augmented? | End Users (via survey) | | FALSE | 1 |
| Q040 | A04 | Current Skills | What formal training have you received on your current tools in the last 12 months? | End Users (via survey) / HR / L&D | | FALSE | 2 |
| Q041 | A04 | Current Skills | What do you find most difficult about your current tools or processes? | End Users (via survey or focus group) | | FALSE | 3 |
| Q042 | A04 | Learning Readiness | How do you prefer to learn new skills — classroom, online, peer coaching, self-directed? | End Users (via survey) | | FALSE | 4 |
| Q043 | A04 | Learning Readiness | How confident are you in your ability to learn new technology or processes? | End Users (via survey) | | FALSE | 5 |
| Q044 | A04 | Learning Readiness | What has your experience been with previous training programmes — were they helpful? | End Users (via focus group) | | FALSE | 6 |
| Q045 | A04 | Organisational Capability | Does the organisation have an existing learning management system (LMS) or training infrastructure? | HR / L&D | | FALSE | 7 |
| Q046 | A04 | Organisational Capability | What training resources (trainers, rooms, e-learning platforms) are available? | HR / L&D | | FALSE | 8 |
| Q047 | A04 | Organisational Capability | Are there existing digital champions or super-users who could be leveraged? | HR / L&D / IT Lead | | FALSE | 9 |
| Q048 | A05 | Change History | What significant changes has this organisation gone through in the last 2–3 years? | Middle Managers / Long-tenured staff | | FALSE | 1 |
| Q049 | A05 | Change History | Which of those changes went well? What made them successful? | Middle Managers / Long-tenured staff | | FALSE | 2 |
| Q050 | A05 | Change History | Which changes were painful or failed? What went wrong? | Middle Managers / Long-tenured staff | | FALSE | 3 |
| Q051 | A05 | Trust and Credibility | When leadership announces a change, what is the typical reaction on the ground? | Middle Managers / Long-tenured staff | | FALSE | 4 |
| Q052 | A05 | Trust and Credibility | Has there been a change where promises were made but not kept? What happened? | Middle Managers / Long-tenured staff | | FALSE | 5 |
| Q053 | A05 | Trust and Credibility | Do people generally trust that changes are in their interest, or is there scepticism? | Middle Managers / Long-tenured staff / HR | | FALSE | 6 |
| Q054 | A05 | Patterns | How are changes typically communicated here — and is it effective? | Middle Managers / Long-tenured staff | | FALSE | 7 |
| Q055 | A05 | Patterns | Is there a pattern of "change fatigue" — too many changes at once? | Middle Managers / HR | | FALSE | 8 |
| Q056 | A05 | Patterns | Have previous changes been properly completed, or do people feel like changes were abandoned halfway? | Middle Managers / Long-tenured staff | | FALSE | 9 |
| Q057 | A05 | Relevance to Current Initiative | Has the organisation attempted anything similar to this change before? What happened? | Middle Managers / IT Lead / Programme Manager | | FALSE | 10 |
| Q058 | A05 | Relevance to Current Initiative | Are there specific groups or departments where change is particularly difficult? Why? | HR / Senior Leadership | | FALSE | 11 |
| Q059 | A06 | Understanding | What do you understand about this change and why it's happening? | Middle Managers | | FALSE | 1 |
| Q060 | A06 | Understanding | What questions do you have that haven't been answered? | Middle Managers | | FALSE | 2 |
| Q061 | A06 | Understanding | Do you feel you have enough information to explain this change to your team? | Middle Managers | | FALSE | 3 |
| Q062 | A06 | Willingness | How do you feel about this change personally — is it something you believe in? | Middle Managers | | FALSE | 4 |
| Q063 | A06 | Willingness | What concerns do you have about the impact on your team? | Middle Managers | | FALSE | 5 |
| Q064 | A06 | Willingness | Are you willing to actively advocate for this change with your team, even when it's difficult? | Middle Managers | | FALSE | 6 |
| Q065 | A06 | Willingness | What would make you more confident or enthusiastic about supporting this? | Middle Managers | | FALSE | 7 |
| Q066 | A06 | Readiness | Have you led your team through a significant change before? How did it go? | Middle Managers | | FALSE | 8 |
| Q067 | A06 | Readiness | Do you feel equipped to support your team through this transition — training, coaching, handling resistance? | Middle Managers | | FALSE | 9 |
| Q068 | A06 | Readiness | What support or resources would you need from us to lead this effectively? | Middle Managers | | FALSE | 10 |
| Q069 | A06 | Practical Concerns | Do you and your team have capacity to take on this change alongside current workload? | Middle Managers | | FALSE | 11 |
| Q070 | A06 | Practical Concerns | What competing priorities might get in the way? | Middle Managers | | FALSE | 12 |
| Q071 | A06 | Practical Concerns | How will you know if your team is struggling with the change? | Middle Managers | | FALSE | 13 |
| Q072 | A07 | Loss Analysis | What status or recognition might this group lose? (e.g., being the expert, having a unique skill) | Middle Managers / synthesise from Activity 3 | | FALSE | 1 |
| Q073 | A07 | Loss Analysis | What competence will they lose — will they go from expert to novice? | Middle Managers / synthesise from Activity 4 | | FALSE | 2 |
| Q074 | A07 | Loss Analysis | What autonomy or control over their work might they lose? | Middle Managers / synthesise from Activity 3 | | FALSE | 3 |
| Q075 | A07 | Loss Analysis | Will their workload increase during or after the transition? | Middle Managers / Programme Manager | | FALSE | 4 |
| Q076 | A07 | Loss Analysis | Will the predictability of their work decrease? | Middle Managers / synthesise from Activity 3 | | FALSE | 5 |
| Q077 | A07 | Gain Analysis | What tangible benefits will this group experience? | Programme Manager / Sponsor | | FALSE | 6 |
| Q078 | A07 | Gain Analysis | Do they believe these benefits are real? Have they been communicated? | End Users (via focus group) | | FALSE | 7 |
| Q079 | A07 | Gain Analysis | When will they start experiencing the benefits — immediately or after a difficult transition period? | Programme Manager / IT Lead | | FALSE | 8 |
| Q080 | A07 | Structural Factors | How supportive is this group's direct manager of the change? | Synthesise from Activity 6 | | FALSE | 9 |
| Q081 | A07 | Structural Factors | Has this group experienced broken promises from previous changes? | Synthesise from Activity 5 | | FALSE | 10 |
| Q082 | A07 | Structural Factors | Does this group trust organisational communications? | Synthesise from Activity 5 | | FALSE | 11 |
| Q083 | A08 | Strategy Framing | What is the compelling case for this change? Why now? | Synthesise from Activity 1 | | FALSE | 1 |
| Q084 | A08 | Strategy Framing | What are the top three risks to successful adoption? | Synthesise from Activities 5, 6, 7 | | FALSE | 2 |
| Q085 | A08 | Strategy Framing | What is the single biggest obstacle we need to overcome? | Sponsor / Programme Manager | | FALSE | 3 |
| Q086 | A08 | Success Criteria | How will we know this change has been successfully adopted? | Sponsor / Senior Leadership | | FALSE | 4 |
| Q087 | A08 | Success Criteria | What adoption metrics matter most — utilisation, proficiency, or business impact? | Sponsor / Programme Manager | | FALSE | 5 |
| Q088 | A08 | Success Criteria | What is the timeline for achieving full adoption? | Sponsor / Programme Manager | | FALSE | 6 |
| Q089 | A08 | Success Criteria | What level of adoption is the minimum acceptable? | Sponsor | | FALSE | 7 |
| Q090 | A08 | Interventions | For each population at high resistance risk: what specific intervention will address their concerns? | Consultant synthesis from Activities 1–7 | | FALSE | 8 |
| Q091 | A08 | Interventions | What resources are available for interventions? | Programme Manager / Sponsor | | FALSE | 9 |
| Q092 | A08 | Interventions | Are there organisational constraints on the types of interventions we can use? (e.g., no mandatory training, no town halls, unionised environments) | HR / Programme Manager | | FALSE | 10 |
| Q093 | A09 | Engagement Design | For each key stakeholder: what do they need to know, feel, and do at each project stage? | Consultant synthesis from Activities 1, 2, 7 | | FALSE | 1 |
| Q094 | A09 | Engagement Design | What is the right frequency of engagement for each stakeholder? | Programme Manager / Consultant judgement | | FALSE | 2 |
| Q095 | A09 | Engagement Design | Are there stakeholders who need to be engaged together (because they influence each other) or separately (because of political dynamics)? | Sponsor / Programme Manager | | FALSE | 3 |
| Q096 | A09 | Coalition Building | Which supportive stakeholders have the most credibility with resistant groups? | Synthesise from Activity 2 | | FALSE | 4 |
| Q097 | A09 | Coalition Building | What do supportive stakeholders need from us to advocate effectively? | Supportive Stakeholders | | FALSE | 5 |
| Q098 | A09 | Coalition Building | Are supportive stakeholders willing to speak publicly at town halls or in communications? | Supportive Stakeholders | | FALSE | 6 |
| Q099 | A09 | Resistance Engagement | For each high-influence resistor: what is the root cause of their resistance? | Synthesise from Activity 7 | | FALSE | 7 |
| Q100 | A09 | Resistance Engagement | Is their resistance based on legitimate concerns that need addressing, or on personal interests? | Consultant assessment | | FALSE | 8 |
| Q101 | A09 | Resistance Engagement | Who is the best person to engage each resistor — the sponsor, a peer, or the ACM consultant? | Discuss with: Sponsor | | FALSE | 9 |
| Q102 | A10 | Design Decisions | What training modalities does the organisation already use and trust? | HR / L&D | | FALSE | 1 |
| Q103 | A10 | Design Decisions | Are there scheduling constraints — can people be taken off their work for training? For how long? | Middle Managers / HR | | FALSE | 2 |
| Q104 | A10 | Design Decisions | Is there a training environment or sandbox available for hands-on practice? | IT Lead | | FALSE | 3 |
| Q105 | A10 | Design Decisions | Can training be recorded for later on-demand access? | HR / L&D / IT Lead | | FALSE | 4 |
| Q106 | A10 | Population Specifics | For each affected role: what are the critical skills they must have from day one vs. what can be learned over time? | Middle Managers / Programme Manager | | FALSE | 5 |
| Q107 | A10 | Population Specifics | Are there accessibility requirements (language, disability, remote workers)? | HR / Middle Managers | | FALSE | 6 |
| Q108 | A10 | Population Specifics | Are there populations who will need significantly more support than others? | Synthesise from Activity 4 | | FALSE | 7 |
| Q109 | A10 | Logistics | How many people need to be trained, and over what timeframe? | Programme Manager | | FALSE | 8 |
| Q110 | A10 | Logistics | Can training be delivered in the existing meeting/training infrastructure, or do we need additional facilities? | HR / L&D / Facilities | | FALSE | 9 |
| Q111 | A10 | Logistics | What is the budget for training materials and delivery? | Programme Manager / Sponsor | | FALSE | 10 |
| Q112 | A11 | Audience and Channels | What communication channels are most effective in this organisation? | HR / Internal Communications / Middle Managers | | FALSE | 1 |
| Q113 | A11 | Audience and Channels | Are there populations who don't regularly check email or intranet? How do we reach them? | Middle Managers / HR | | FALSE | 2 |
| Q114 | A11 | Audience and Channels | Is there an internal communications team we should coordinate with? | Programme Manager / HR | | FALSE | 3 |
| Q115 | A11 | Audience and Channels | Does the organisation have existing communication templates or brand guidelines we must follow? | Internal Communications | | FALSE | 4 |
| Q116 | A11 | Message Design | What is the core "Why?" — the compelling reason for this change that will resonate with staff? | Synthesise from Activity 1 / Ask: Sponsor | | FALSE | 5 |
| Q117 | A11 | Message Design | What are the top three concerns or questions staff are likely to have? | Synthesise from Activities 5, 6, 7 | | FALSE | 6 |
| Q118 | A11 | Message Design | What is the "What's in it for me?" for each audience? | Synthesise from Activity 3 / Ask: Programme Manager | | FALSE | 7 |
| Q119 | A11 | Message Design | Are there messages from previous changes that need to be explicitly countered or addressed? | Synthesise from Activity 5 | | FALSE | 8 |
| Q120 | A11 | Timing and Cascade | How far in advance of deployment should the first communication go out? | Programme Manager / Consultant judgement | | FALSE | 9 |
| Q121 | A11 | Timing and Cascade | Is there a management cascade process we can use — or do we need to create one? | HR / Middle Managers | | FALSE | 10 |
| Q122 | A11 | Timing and Cascade | How will we handle rumours or misinformation? | Sponsor / Programme Manager | | FALSE | 11 |
| Q123 | A12 | Timeline | What is the confirmed deployment timeline with key milestones? | IT Lead / Programme Manager | | FALSE | 1 |
| Q124 | A12 | Timeline | Which milestones are firm vs. tentative? | IT Lead / Programme Manager | | FALSE | 2 |
| Q125 | A12 | Timeline | What are the dependencies between technical milestones? | IT Lead | | FALSE | 3 |
| Q126 | A12 | Timeline | When will the pilot environment be ready for training and testing? | IT Lead | | FALSE | 4 |
| Q127 | A12 | Scope and Phasing | Which groups get access first, and in what sequence? | IT Lead / Programme Manager | | FALSE | 5 |
| Q128 | A12 | Scope and Phasing | What features or capabilities will be available at pilot vs. full deployment? | IT Lead | | FALSE | 6 |
| Q129 | A12 | Scope and Phasing | Are there any technical limitations that affect the user experience at launch? | IT Lead | | FALSE | 7 |
| Q130 | A12 | Risk and Contingency | What is the rollback plan if deployment fails? | IT Lead / Programme Manager | | FALSE | 8 |
| Q131 | A12 | Risk and Contingency | What are the most likely causes of delay? | IT Lead | | FALSE | 9 |
| Q132 | A12 | Risk and Contingency | How will we be notified of technical issues during deployment? | IT Lead | | FALSE | 10 |
| Q133 | A12 | Risk and Contingency | Is there a deployment freeze window (e.g., financial year-end) we need to avoid? | IT Lead / Programme Manager | | FALSE | 11 |
| Q134 | A13 | Metrics Design | What system telemetry or usage data is available? | IT Lead | | FALSE | 1 |
| Q135 | A13 | Metrics Design | What business metrics should improve as a result of this change? | Sponsor / Senior Leadership | | FALSE | 2 |
| Q136 | A13 | Metrics Design | How will we measure whether people are using the new tool/process correctly, not just at all? | Programme Manager / Consultant design | | FALSE | 3 |
| Q137 | A13 | Metrics Design | Are there existing reports or dashboards we can leverage? | IT Lead / Business Intelligence | | FALSE | 4 |
| Q138 | A13 | Data Access | Who owns the data we need, and will they share it? | Programme Manager / IT Lead | | FALSE | 5 |
| Q139 | A13 | Data Access | Are there data privacy considerations (GDPR, etc.) we need to address? | IT Lead / Legal / HR | | FALSE | 6 |
| Q140 | A13 | Data Access | What is the reporting cadence expected by the steering committee? | Programme Manager / Governance | | FALSE | 7 |
| Q141 | A13 | Baseline | What are the current values of the metrics we plan to track? | Synthesise from Activity 4 / Ask: IT Lead / Business Intelligence | | FALSE | 8 |
| Q142 | A13 | Baseline | Are there seasonal or cyclical variations we need to account for? | Middle Managers / Business Intelligence | | FALSE | 9 |
| Q143 | A14 | Intervention Design | For each resistance cluster: is this resistance about fear, loss, lack of understanding, or a genuine problem? | Consultant synthesis from Activity 7 | | FALSE | 1 |
| Q144 | A14 | Intervention Design | What safe practice environments can we create for people anxious about competence? | IT Lead / L&D | | FALSE | 2 |
| Q145 | A14 | Intervention Design | Who are the best people to have one-on-one conversations with resistors — managers, sponsors, peers, or the consultant? | Discuss with: Sponsor / Programme Manager | | FALSE | 3 |
| Q146 | A14 | Intervention Design | Are there structural barriers (policy, technology configuration, process design) creating legitimate resistance that should be escalated rather than managed? | Consultant assessment / Ask: Middle Managers / IT Lead | | FALSE | 4 |
| Q147 | A14 | Response Protocols | How should managers respond when a team member openly resists? | Consultant design / Review with: HR / Middle Managers | | FALSE | 5 |
| Q148 | A14 | Response Protocols | At what point does individual resistance become a performance issue? Who decides? | HR / Sponsor | | FALSE | 6 |
| Q149 | A14 | Response Protocols | How will we track resistance patterns during deployment to know if our interventions are working? | Consultant design | | FALSE | 7 |
| Q150 | A15 | Selection | Who in each team is respected by their peers and has informal influence? | Middle Managers | | FALSE | 1 |
| Q151 | A15 | Selection | Who has shown enthusiasm or early interest in this change? | Middle Managers / Programme Manager | | FALSE | 2 |
| Q152 | A15 | Selection | Are there people who were champions in previous change initiatives? Were they effective? | HR / Middle Managers | | FALSE | 3 |
| Q153 | A15 | Selection | How many champions do we need per team/department/location? | Consultant judgement based on population size | | FALSE | 4 |
| Q154 | A15 | Role Design | How much time per week can champions realistically dedicate? | Middle Managers (for approval) | | FALSE | 5 |
| Q155 | A15 | Role Design | What recognition or incentive can we offer champions? | HR / Sponsor | | FALSE | 6 |
| Q156 | A15 | Role Design | What early access or special resources can we provide to champions? | IT Lead / Programme Manager | | FALSE | 7 |
| Q157 | A15 | Support | What training do champions need to fulfil their role effectively? | Consultant design | | FALSE | 8 |
| Q158 | A15 | Support | How will champions report back what they're hearing on the ground? | Consultant design | | FALSE | 9 |
| Q159 | A15 | Support | What happens if a champion disengages or leaves? | Consultant contingency plan | | FALSE | 10 |
| Q160 | A16 | Governance Structure | What is the existing governance structure for this programme? | Programme Manager | | FALSE | 1 |
| Q161 | A16 | Governance Structure | Who sits on the steering committee, and how often does it meet? | Programme Manager | | FALSE | 2 |
| Q162 | A16 | Governance Structure | Is there currently an ACM voice in governance, or will this be new? | Programme Manager | | FALSE | 3 |
| Q163 | A16 | Decision Authority | What decisions can the ACM lead make without governance approval? (e.g., adjusting communication timing, modifying training approach) | Negotiate with: Programme Manager / Sponsor | | FALSE | 4 |
| Q164 | A16 | Decision Authority | What requires escalation? (e.g., budget reallocation, scope changes, sponsor intervention requests) | Negotiate with: Programme Manager / Sponsor | | FALSE | 5 |
| Q165 | A16 | Decision Authority | How quickly can governance respond to escalated ACM risks? | Programme Manager | | FALSE | 6 |
| Q166 | A16 | Reporting | What reporting format does governance expect? | Programme Manager | | FALSE | 7 |
| Q167 | A16 | Reporting | How frequently should ACM report — same cadence as technical, or different? | Negotiate with: Programme Manager | | FALSE | 8 |
| Q168 | A16 | Reporting | Does governance want leading indicators (risk signals) or lagging indicators (adoption data)? | Programme Manager / Sponsor | | FALSE | 9 |
| Q169 | A17 | Platform | Does the organisation use Microsoft Teams as its collaboration platform? If not, what do they use? | IT Lead | | FALSE | 1 |
| Q170 | A17 | Platform | Are there any restrictions on creating Teams channels (e.g., IT approval required)? | IT Lead | | FALSE | 2 |
| Q171 | A17 | Platform | Are there existing channels or communication spaces we should use rather than creating new ones? | Programme Manager / Internal Communications | | FALSE | 3 |
| Q172 | A17 | Access and Moderation | Who should have access to each channel? | Consultant design / Confirm with: Programme Manager | | FALSE | 4 |
| Q173 | A17 | Access and Moderation | Who will moderate each channel and respond to questions? | Consultant design / Negotiate with: Programme Manager | | FALSE | 5 |
| Q174 | A17 | Access and Moderation | Should channels be private or discoverable? | Consultant judgement / Ask: Programme Manager | | FALSE | 6 |
| Q175 | A18 | Readiness Check | Is the deployment date confirmed? Are there any remaining blockers? | IT Lead / Programme Manager | | FALSE | 1 |
| Q176 | A18 | Readiness Check | Have all managers been briefed? | Check with: Middle Managers | | FALSE | 2 |
| Q177 | A18 | Readiness Check | Are champions equipped and ready? | Check with: Champions | | FALSE | 3 |
| Q178 | A18 | Readiness Check | Are support channels operational? | Check with: Help Desk / IT Lead | | FALSE | 4 |
| Q179 | A18 | Day-One | What is the first thing users will see or experience when the change goes live? | IT Lead | | FALSE | 5 |
| Q180 | A18 | Day-One | What is the single most important thing users need to know on day one? | Consultant synthesis | | FALSE | 6 |
| Q181 | A18 | Day-One | What common questions or issues should we pre-empt in the day-one communication? | IT Lead / Champions / Help Desk | | FALSE | 7 |
| Q182 | A19 | Execution | Are all training sessions scheduled and confirmed? | Check with: L&D / Programme Manager / Middle Managers | | FALSE | 1 |
| Q183 | A19 | Execution | Are trainers prepared and briefed on the training content and approach? | Check with: L&D / External trainers | | FALSE | 2 |
| Q184 | A19 | Execution | Is the training environment functional and loaded with realistic data? | IT Lead | | FALSE | 3 |
| Q185 | A19 | Feedback | After each session: what was clear? What was confusing? What do you need more practice on? | Training participants | | FALSE | 4 |
| Q186 | A19 | Feedback | Do participants feel ready to use the new tool/process in their real work? | Training participants | | FALSE | 5 |
| Q187 | A19 | Feedback | What questions are coming up repeatedly that suggest a gap in training content? | Trainers / Champions | | FALSE | 6 |
| Q188 | A20 | Champion Activation | Are all champions active and engaged? | Check with: Champions | | FALSE | 1 |
| Q189 | A20 | Champion Activation | Are champions themselves confident and proficient with the change? | Check with: Champions | | FALSE | 2 |
| Q190 | A20 | Champion Activation | Are managers supporting champion time commitment as agreed? | Check with: Champions / Middle Managers | | FALSE | 3 |
| Q191 | A20 | Intelligence Gathering | What are the most common questions or issues people are raising? | Champions (daily check-in) | | FALSE | 4 |
| Q192 | A20 | Intelligence Gathering | Are there specific teams, roles, or locations struggling more than others? | Champions (daily check-in) | | FALSE | 5 |
| Q193 | A20 | Intelligence Gathering | Are people reverting to old tools or processes? Where and why? | Champions (daily check-in) | | FALSE | 6 |
| Q194 | A20 | Intelligence Gathering | Is there any resistance that is escalating or spreading? | Champions (daily check-in) | | FALSE | 7 |
| Q195 | A21 | Readiness | Is the help desk queue configured and staffed? | Help Desk / IT Lead | | FALSE | 1 |
| Q196 | A21 | Readiness | Do support staff know about the change and the common issues users will face? | Help Desk / IT Lead | | FALSE | 2 |
| Q197 | A21 | Readiness | Are drop-in clinics or floor-walking sessions scheduled for the first two weeks? | Check with: Programme Manager / L&D | | FALSE | 3 |
| Q198 | A21 | Capacity | How many support requests do we anticipate in the first week? | Estimate: Consultant / IT Lead | | FALSE | 4 |
| Q199 | A21 | Capacity | Do we have enough support capacity, or do we need additional resources? | Help Desk / Programme Manager | | FALSE | 5 |
| Q200 | A21 | Capacity | What is the escalation path for issues that support cannot resolve? | IT Lead / Programme Manager | | FALSE | 6 |
| Q201 | A22 | Data Quality | Is the telemetry data flowing correctly? | IT Lead / Business Intelligence | | FALSE | 1 |
| Q202 | A22 | Data Quality | Are the metrics we're seeing reliable, or are there data quality issues? | IT Lead | | FALSE | 2 |
| Q203 | A22 | Data Quality | Can we segment the data by team, department, role, and location? | IT Lead / Business Intelligence | | FALSE | 3 |
| Q204 | A22 | Interpretation | What does the adoption data tell us — who is adopting and who isn't? | Consultant analysis | | FALSE | 4 |
| Q205 | A22 | Interpretation | Are the patterns aligned with our resistance risk profile predictions? | Consultant analysis | | FALSE | 5 |
| Q206 | A22 | Interpretation | Are there surprises — populations doing better or worse than expected? | Consultant analysis | | FALSE | 6 |
| Q207 | A23 | Field Reality | What resistance behaviours are we actually seeing? Do they match predictions? | Champions / Middle Managers (daily/weekly) | | FALSE | 1 |
| Q208 | A23 | Field Reality | Is the resistance concentrated in specific groups, or distributed? | Champions / Middle Managers | | FALSE | 2 |
| Q209 | A23 | Field Reality | Are there new resistance patterns we didn't predict? | Champions / Middle Managers | | FALSE | 3 |
| Q210 | A23 | Intervention Effectiveness | Are the planned interventions working? What's shifting and what isn't? | Consultant assessment | | FALSE | 4 |
| Q211 | A23 | Intervention Effectiveness | Does the sponsor need to intervene directly with any specific groups or individuals? | Consultant assessment / Discuss with: Sponsor | | FALSE | 5 |
| Q212 | A23 | Intervention Effectiveness | Are there structural barriers causing legitimate resistance that need escalation? | Champions / IT Lead / Middle Managers | | FALSE | 6 |
| Q213 | A24 | Synthesis | What are the top three issues emerging across all sensing channels? | Consultant synthesis from Activities 20–23 | | FALSE | 1 |
| Q214 | A24 | Synthesis | Are these issues localised or systemic? | Consultant analysis | | FALSE | 2 |
| Q215 | A24 | Synthesis | Do they require ACM adjustment, technical escalation, or both? | Consultant assessment | | FALSE | 3 |
| Q216 | A24 | Response | What is the fastest intervention we can deploy for each issue? | Consultant design | | FALSE | 4 |
| Q217 | A24 | Response | Who needs to approve or execute the adjustment? | Depends on issue: Programme Manager / IT Lead / Sponsor | | FALSE | 5 |
| Q218 | A24 | Response | How will we know if the adjustment worked? | Consultant design — define success indicator | | FALSE | 6 |
| Q219 | A25 | Health Check | How many of our original champions are still actively participating? | Consultant tracking data | | FALSE | 1 |
| Q220 | A25 | Health Check | How are champions feeling — energised, neutral, or burnt out? | Champions (survey or one-on-one) | | FALSE | 2 |
| Q221 | A25 | Health Check | Are champions still getting time from their managers to fulfil the role? | Champions | | FALSE | 3 |
| Q222 | A25 | Effectiveness | Which champions were most effective, and what made them so? | Middle Managers / End Users | | FALSE | 4 |
| Q223 | A25 | Effectiveness | Were there teams where having a champion made a visible difference to adoption? | Consultant analysis of adoption data by team | | FALSE | 5 |
| Q224 | A25 | Effectiveness | Did champions provide useful intelligence that led to actionable adjustments? | Consultant review of change log | | FALSE | 6 |
| Q225 | A25 | Future | Is there ongoing need for a champion network, or can support now shift to BAU? | Discuss with: Programme Manager / Sponsor | | FALSE | 7 |
| Q226 | A25 | Future | Would champions be willing to continue in a reduced capacity? | Champions | | FALSE | 8 |
| Q227 | A26 | Assessment | Are we on track against the success criteria we set? | Consultant analysis | | FALSE | 1 |
| Q228 | A26 | Assessment | What is the overall adoption health: green, amber, or red? | Consultant assessment | | FALSE | 2 |
| Q229 | A26 | Assessment | Are there populations where adoption has stalled or failed? What do we do about it? | Consultant analysis / Discuss with: Sponsor | | FALSE | 3 |
| Q230 | A26 | Strategic Decisions | Do we need to adjust the change strategy based on what we've learned? | Consultant recommendation / Discuss with: Sponsor | | FALSE | 4 |
| Q231 | A26 | Strategic Decisions | Are there resources or interventions we need that weren't in the original plan? | Consultant recommendation / Ask: Programme Manager | | FALSE | 5 |
| Q232 | A26 | Strategic Decisions | Is the deployment timeline still realistic, or do we need to adjust? | Discuss with: Programme Manager / IT Lead | | FALSE | 6 |
| Q233 | A27 | Segmentation | What does the adoption data tell us about who needs what? | Consultant analysis of telemetry | | FALSE | 1 |
| Q234 | A27 | Segmentation | Are there patterns in who is struggling — role, location, manager, tenure? | Consultant analysis | | FALSE | 2 |
| Q235 | A27 | Segmentation | Are the struggling users struggling with motivation, capability, or structural barriers? | Champions / Middle Managers | | FALSE | 3 |
| Q236 | A27 | Reinforcement Design | What training modalities worked best during initial training? | Synthesise from Activity 19 feedback | | FALSE | 4 |
| Q237 | A27 | Reinforcement Design | Are advanced users willing to become mentors or showcase their use cases? | Advanced users / Champions | | FALSE | 5 |
| Q238 | A27 | Reinforcement Design | What additional content or resources would help struggling users? | Struggling users / Champions | | FALSE | 6 |
| Q239 | A28 | Identification | Are there issues people are experiencing that no amount of training or communication will fix? | Champions / Middle Managers / Help Desk | | FALSE | 1 |
| Q240 | A28 | Identification | Are there security or configuration restrictions preventing people from using the tool/process as intended? | IT Lead / End Users | | FALSE | 2 |
| Q241 | A28 | Identification | Are there policy or process constraints that conflict with the new way of working? | Middle Managers / Process owners | | FALSE | 3 |
| Q242 | A28 | Escalation | Who is the right owner for each barrier? | Programme Manager | | FALSE | 4 |
| Q243 | A28 | Escalation | What evidence is needed to make a compelling case for resolution? | Consultant assessment | | FALSE | 5 |
| Q244 | A28 | Escalation | What is the expected timeline for resolution? | Barrier owner | | FALSE | 6 |
| Q245 | A29 | Ownership | Who will own ongoing adoption management after the consultant exits? Is this person identified and engaged? | Sponsor / Programme Manager | | FALSE | 1 |
| Q246 | A29 | Ownership | Does the identified owner have capacity and authority for this role? | Sponsor / Programme Manager | | FALSE | 2 |
| Q247 | A29 | Ownership | Is ongoing adoption management resourced (budget, time), or is it expected to be absorbed into existing roles? | Sponsor / Programme Manager | | FALSE | 3 |
| Q248 | A29 | Transfer Readiness | Does the internal owner understand the measurement framework and how to use it? | Check with: Internal owner | | FALSE | 4 |
| Q249 | A29 | Transfer Readiness | Does the internal owner have relationships with key stakeholders, or do introductions need to be made? | Consultant assessment | | FALSE | 5 |
| Q250 | A29 | Transfer Readiness | Are there any ACM activities that still require external expertise and cannot be fully transferred? | Consultant assessment | | FALSE | 6 |
| Q251 | A30 | Assessment | Which resistance patterns have resolved? What resolved them? | Consultant analysis / Ask: Champions / Middle Managers | | FALSE | 1 |
| Q252 | A30 | Assessment | Which resistance patterns persist? Why? | Consultant analysis / Ask: Champions / Middle Managers | | FALSE | 2 |
| Q253 | A30 | Assessment | Has any resistance transformed — e.g., moved from active resistance to passive non-adoption? | Consultant analysis | | FALSE | 3 |
| Q254 | A30 | Assessment | Have new resistance patterns emerged that we didn't predict? | Champions / Middle Managers | | FALSE | 4 |
| Q255 | A30 | Classification | Looking back, which resistance was genuinely about adoption (and correctly managed by ACM) and which was signalling a real problem (that should have been escalated sooner)? | Consultant reflection | | FALSE | 5 |
| Q256 | A30 | Classification | Are there persistent resistors whose concerns have been validated by outcomes? | Consultant analysis | | FALSE | 6 |
| Q257 | A31 | Structural Embedding | What new ways of working need to be reflected in SOPs? | Process owners / Middle Managers | | FALSE | 1 |
| Q258 | A31 | Structural Embedding | Do job descriptions need updating? Who has authority to change them? | HR | | FALSE | 2 |
| Q259 | A31 | Structural Embedding | Does the onboarding programme reflect the new way of working? | HR / L&D | | FALSE | 3 |
| Q260 | A31 | Structural Embedding | Are training materials housed in a permanent system with an owner and refresh schedule? | L&D | | FALSE | 4 |
| Q261 | A31 | Sustainability Test | If we removed all project support tomorrow, would the new ways of working persist? | Consultant assessment | | FALSE | 5 |
| Q262 | A31 | Sustainability Test | What would revert first — and how do we prevent that? | Consultant assessment / Ask: Middle Managers | | FALSE | 6 |
| Q263 | A31 | Sustainability Test | Are the right incentives and accountability structures in place to sustain the change? | Middle Managers / HR | | FALSE | 7 |
| Q264 | A32 | Effectiveness | Which ACM interventions made the biggest difference? How do we know? | Core ACM team / Programme Manager / Champions | | FALSE | 1 |
| Q265 | A32 | Effectiveness | Which interventions didn't work as expected? Why? | Core ACM team / Programme Manager | | FALSE | 2 |
| Q266 | A32 | Effectiveness | Were there interventions we should have done but didn't? | Core ACM team / Middle Managers | | FALSE | 3 |
| Q267 | A32 | Efficiency | How long did each phase take? Was the original timeline realistic? | Consultant review of project data | | FALSE | 4 |
| Q268 | A32 | Efficiency | Where did we spend the most effort? Was it the right place? | Consultant review | | FALSE | 5 |
| Q269 | A32 | Efficiency | What would we do differently if we ran the same project again? | Core ACM team / Programme Manager | | FALSE | 6 |
| Q270 | A32 | Organisational Learning | What has this project taught us about how this organisation handles change? | Consultant synthesis | | FALSE | 7 |
| Q271 | A32 | Organisational Learning | What should the organisation invest in to make future changes easier? (e.g., internal change capability, manager development, communication infrastructure) | Consultant recommendation | | FALSE | 8 |
| Q272 | A32 | Organisational Learning | Are there transferable frameworks, templates, or approaches from this project that should be standardised? | Consultant recommendation | | FALSE | 9 |

---

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