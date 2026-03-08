#!/usr/bin/env python3
"""
Generate dummy-data.json for CuraNova Healthcare Group demo.

Reads seed-data.json (34 activities, 289 todos, 272 questions, 6 agreements)
and overlays CuraNova-specific demo data including:
- Activity statuses (completed/in_progress/not_started)
- Todo completion states (deterministic)
- Answered questions with CuraNova-specific content
- Filled agreements + 3 out-of-scope items
- Config, SOW, and transcripts
"""

import json
import copy

# ---------------------------------------------------------------------------
# 1. Load seed data
# ---------------------------------------------------------------------------
with open("seed-data.json", "r") as f:
    seed = json.load(f)

data = copy.deepcopy(seed)

# ---------------------------------------------------------------------------
# 2. Activity status assignments
# ---------------------------------------------------------------------------

PLAN_I_IDS = {"A00", "A33", "A01", "A02", "A03", "A04", "A05", "A06",
              "A07", "A08", "A09", "A10", "A11"}

PLAN_II_COMPLETED = {"A12", "A13", "A14", "A15"}
PLAN_II_IN_PROGRESS = {"A16", "A17"}

for activity in data["activities"]:
    aid = activity["id"]
    if aid in PLAN_I_IDS:
        activity["status"] = "completed"
    elif aid in PLAN_II_COMPLETED:
        activity["status"] = "completed"
    elif aid in PLAN_II_IN_PROGRESS:
        activity["status"] = "in_progress"
    # else: leave as "not_started"

# Build lookup: activity_id -> status
activity_status = {a["id"]: a["status"] for a in data["activities"]}

# ---------------------------------------------------------------------------
# 3. Todo assignments (deterministic)
# ---------------------------------------------------------------------------

for todo in data["todos"]:
    status = activity_status.get(todo["activity_id"], "not_started")
    seq = todo["sequence"]

    if status == "completed":
        # 80% done: every 5th one stays undone
        todo["is_done"] = (seq % 5) != 0
    elif status == "in_progress":
        # ~33% done: every 3rd one is done
        todo["is_done"] = (seq % 3) == 0
    else:
        todo["is_done"] = False

# ---------------------------------------------------------------------------
# 4. Question answer generation
# ---------------------------------------------------------------------------

def generate_answer(question_text):
    """Generate a CuraNova-specific answer based on question content keywords."""
    q = question_text.lower()

    # Sponsor-related
    if "sponsor" in q and ("who" in q or "identify" in q or "name" in q):
        return "Dr. Mark van der Berg, Medical Director of CuraNova Healthcare Group, serves as the executive sponsor. He has full decision authority and budget sign-off for the Copilot deployment."
    if "success look like" in q:
        return "Dr. Mark van der Berg defines success as: 80% active Copilot usage within 12 weeks, zero patient data incidents via unapproved AI tools, and measurable time savings for ward secretaries and nursing staff."
    if "why is this change important now" in q or "why now" in q:
        return "Shadow AI usage has reached critical levels -- staff are using ChatGPT Free to summarise patient reports, creating serious GDPR and NEN 7510 compliance risks. The failed scheduling software rollout 2 years ago has eroded trust in IT projects, making a well-managed approach essential."
    if "broader organisational strategy" in q or "connect to" in q and "strategy" in q:
        return "CuraNova's 2025-2028 strategic plan includes 'Digital-First Clinical Excellence' as a pillar. The Copilot deployment directly supports this, with the board expecting AI-augmented workflows across all three locations by end of 2027."
    if "personally willing to do visibly" in q:
        return "Dr. Mark has committed to using Copilot in his own clinical work, presenting at the all-staff town hall, recording a video message about safe AI use, and attending the first prompt engineering workshop alongside clinical staff."
    if "resources" in q and ("budget" in q or "allocat" in q or "prepared" in q):
        return "Fixed fee of EUR 68,500 approved with 40/40/20 milestone payments. Dr. Mark has ring-fenced 2 hours/week of protected time for 15 champions across departments, plus dedicated IT support for the Purview configuration."
    if "defend" in q and "competing priorities" in q:
        return "Dr. Mark has explicitly stated this is his top non-clinical priority. He will escalate to the CuraNova board if competing IT projects threaten to divert resources from the Copilot deployment."
    if "rank" in q and "priorities" in q:
        return "Ranked number 1 among current non-clinical initiatives. The only higher priority is direct patient care operations."
    if "biggest risk" in q and ("adoption" in q or "risk" in q):
        return "Three key risks: (1) Scar tissue from the failed scheduling software rollout creating 'here we go again' narrative, (2) Shadow AI users who prefer the freedom of ChatGPT Free over governed Copilot, (3) Surgeons who are too busy to attend training and will resist any workflow changes."
    if "which groups" in q and "resist" in q:
        return "Surgeons are the highest resistance risk -- they are time-poor, sceptical of IT changes after the scheduling failure, and currently the heaviest shadow AI users. Ward secretaries may also resist if Copilot is perceived as adding steps rather than saving time."
    if "handled change resistance" in q or "previous initiatives" in q:
        return "The failed scheduling software rollout 2 years ago was pushed through without adequate change management. Dr. Mark acknowledges this and is determined to do it differently this time -- hence the investment in structured ACM with Vitalis."
    if "leadership team" in q and "support" in q:
        return "The Head of Nursing is actively supportive and has volunteered to co-champion the initiative. The CFO supports the business case. The Head of Surgery is cautiously neutral -- needs to be won over through practical demonstrations."
    if "sceptical or opposed" in q:
        return "The Head of Surgery (Dr. Hendriks) is sceptical -- he sees AI as a distraction from clinical work. Two senior nurses have publicly expressed concern about 'being monitored' by Purview AI Hub. These concerns need targeted engagement."
    if "actually listen to" in q:
        return "Head Nurse van Dijk on Ward 3 is the informal opinion leader among nursing staff. Among doctors, Dr. Hendriks (Head of Surgery) carries the most influence. In back-office, the senior ward secretary Petra has been there 18 years and sets the tone."

    # Communication-related
    if "communicate" in q and ("change" in q or "major" in q):
        return "CuraNova typically uses email announcements from Dr. Mark, supplemented by department meetings. The internal newsletter reaches about 60% of staff. For shift workers (nurses, ward secretaries), the breakroom notice boards and WhatsApp groups are more effective than email."
    if "willing to send communications" in q or "town hall" in q or "video message" in q:
        return "Yes. Dr. Mark has agreed to: (1) send the initial announcement email, (2) attend and speak at a town hall session, (3) record a 3-minute video about why safe AI matters for patient care. The Head of Nursing will co-present."
    if "communication channel" in q and ("effective" in q or "most" in q):
        return "Department team meetings are the most trusted channel. Email works for back-office but not for clinical staff on shifts. WhatsApp is used informally but not sanctioned. CuraNova's intranet has low traffic. The AI-Awareness Toolkit (posters, breakroom screens) will fill the gap for shift workers."
    if "don't regularly check email" in q or "reach them" in q:
        return "Nursing staff on rotating shifts rarely check email during work hours. Ward secretaries check email but are overwhelmed. The champion network (15 super-users across departments) will serve as the primary face-to-face communication channel for these populations."
    if "internal communications team" in q:
        return "CuraNova has a small communications department (2 people) who manage the intranet and newsletter. They have agreed to review and distribute all staff-facing materials. All communications require CuraNova sign-off 24 hours before distribution."
    if "brand guidelines" in q or "template" in q and "communication" in q:
        return "CuraNova has brand guidelines including logo usage, colours (teal and white), and tone of voice (warm, professional, patient-centred). All materials must use CuraNova templates and include the 'Safe AI in Healthcare' tagline."
    if "core" in q and "why" in q and "compelling" in q:
        return "The core message is: 'We are giving you a powerful, safe AI assistant so you can spend more time on what matters -- patient care. No more copying patient data into unsecured tools. Copilot keeps your data safe and saves you time.'"
    if "top three concerns" in q or "questions staff" in q:
        return "Staff concerns: (1) 'Will AI replace my job?' -- especially among ward secretaries, (2) 'Is this going to be another scheduling software disaster?', (3) 'Will I get in trouble for using ChatGPT before?' The messaging must address all three directly."
    if "what's in it for me" in q:
        return "Nurses: 30 mins/day saved on documentation. Surgeons: faster research summaries without risking patient data. Ward secretaries: automated appointment letters and referral summaries. Back-office: streamlined reporting. All staff: no more compliance risk from shadow AI."
    if "messages from previous" in q and "counter" in q:
        return "The scheduling software was promised to 'make everything easier' and instead added 3 steps to every workflow. Our messaging must explicitly acknowledge this: 'We know the scheduling system was frustrating. This time, we measured the actual time savings before recommending the change.'"
    if "advance" in q and "deployment" in q and "communication" in q:
        return "First awareness communication 3 weeks before pilot. Detailed 'what changes for you' messages 1 week before. Day-of practical guide ('Open Copilot, try this prompt'). Champions briefed 48 hours before each communication wave."
    if "management cascade" in q:
        return "CuraNova has monthly department head meetings that cascade to team meetings. We will use this existing cascade plus the champion network for faster, more personal communication."
    if "rumour" in q or "misinformation" in q:
        return "The champion network serves as the rumour detection system. Champions report misinformation in the dedicated Teams channel within 24 hours. Sarah prepares corrective talking points within 4 hours. Dr. Mark addresses serious concerns directly."

    # Stakeholder-related
    if ("role" in q or "team" in q) and "interact" in q:
        return "Key stakeholder groups at CuraNova: (1) Clinical staff -- nurses, doctors (especially surgeons), specialists across 3 locations, (2) Ward secretaries handling patient administration, (3) Back-office staff including finance, HR, and facilities, (4) Department heads/middle managers overseeing ~800 staff total."
    if "how many people" in q and "report" in q:
        return "CuraNova has approximately 800 staff across 3 locations. Dr. Mark has 6 direct reports (department heads). Each department head manages 80-150 staff. The nursing department is the largest with approximately 350 staff."
    if "who else should" in q and "speaking" in q:
        return "Key people to engage: Head Nurse van Dijk (informal opinion leader), Dr. Hendriks (Head of Surgery, potential resistor), Petra de Vries (senior ward secretary, 18 years tenure), and the IT Security Officer who manages the current Purview setup."
    if "heard about this initiative" in q:
        return "Word has spread informally that 'an AI tool is coming.' Some staff have heard about the shadow AI crackdown and are nervous about being punished. The official communication has not yet gone out, creating a vacuum filled by speculation."
    if "initial reaction" in q and ("excite" in q or "concern" in q):
        return "Excitement about potential time savings is tempered by scepticism from the scheduling software failure. Surgeons are cautiously interested in research summary capabilities. Nurses worry about monitoring. Ward secretaries are curious but fear job displacement."
    if "scale of 1" in q and "supportive" in q:
        return "Support varies significantly: Department heads average 7/10, nursing staff 5/10, surgeons 4/10, ward secretaries 6/10, back-office 7/10. The surgeons' score could improve to 8/10 with targeted demonstrations of research summary use cases."
    if "express a view" in q and "who listens" in q:
        return "Dr. Mark's opinion carries the most weight at executive level. Among clinical staff, the Head of Surgery's view is decisive. Head Nurse van Dijk influences all nursing decisions informally. In back-office, the Finance Manager sets the tone for technology adoption."
    if "go to for advice" in q:
        return "Clinical staff go to their charge nurses and ward leads. For technology questions specifically, there are 3-4 informal 'tech-savvy' colleagues in each department who help others -- these are prime champion candidates."
    if "informal leaders" in q and "opinion" in q:
        return "Head Nurse van Dijk (Ward 3) -- 15 years experience, everyone consults her. Dr. Hendriks -- the surgeons follow his lead. Petra de Vries (ward secretary) -- 18 years tenure, knows every process. Bas Kuiper in IT -- respected for practical solutions."
    if "need from us" in q and "confident" in q:
        return "Stakeholders need: (1) concrete proof that Copilot saves time -- not just promises, (2) assurance that no one will be punished for past ChatGPT use, (3) a clear comparison with the scheduling software failure explaining why this is different."
    if "prefer to be kept informed" in q:
        return "Dr. Mark: weekly 30-minute check-ins plus immediate escalation for blockers. Department heads: fortnightly updates at existing management meetings. Champions: weekly Teams channel updates. Clinical staff: information through champions and department meetings."

    # Impact analysis
    if "typical day" in q or "walk me through" in q:
        return "Nurses: shift handovers, patient documentation in EMR, medication rounds, family communication. Ward secretaries: appointment scheduling, referral letters, discharge summaries, phone triage. Surgeons: clinic consultations, OR scheduling, research documentation, MDT preparation."
    if "time-consuming" in q or "frustrating" in q:
        return "Top frustrations: (1) Manually typing discharge summaries that could be generated from notes, (2) Writing referral letters with repetitive template content, (3) Preparing MDT (multidisciplinary team) meeting summaries from multiple sources, (4) Searching for clinical guidelines across multiple systems."
    if "workaround" in q:
        return "Staff have developed several workarounds: copying patient data into ChatGPT Free for summarisation (serious compliance risk), maintaining personal Word templates for common letters, using personal phones to photograph whiteboards during handovers. These workarounds demonstrate clear demand for AI assistance."
    if "told about" in q and "change" in q:
        return "Most staff have heard that 'Microsoft AI is coming' but lack details. Some believe it will monitor their work. Others think it will replace ward secretaries. The narrative is being shaped by informal channels rather than official communication."
    if "aspects of the change" in q and "unclear" in q:
        return "Staff are unclear about: (1) exactly which tasks Copilot can help with, (2) whether their ChatGPT Free usage will be reported/punished, (3) whether Copilot will work inside the EMR system, (4) how training will be scheduled around shifts."
    if "workflow" in q and "most affected" in q:
        return "Most affected workflows: (1) Patient documentation and discharge summaries (nurses), (2) Referral letter and appointment letter generation (ward secretaries), (3) Research summary and MDT preparation (surgeons), (4) Report generation and data analysis (back-office)."
    if "tasks" in q and "disappear" in q:
        return "Manual template-based letter writing will be largely automated. Copy-pasting between systems for summaries should disappear. However, review and quality checking of AI-generated content will be a new required step -- this is a net gain but needs to be framed correctly."
    if "new tasks or skills" in q:
        return "Staff will need to learn: (1) effective prompting techniques (covered in 3 workshops), (2) reviewing and editing AI-generated clinical text, (3) understanding sensitivity labels and data classification, (4) using Copilot within M365 apps (Word, Outlook, Teams). Champions receive additional advanced training."
    if "performance metrics" in q or "kpi" in q:
        return "Current KPIs (documentation completion time, referral turnaround) will remain but targets may be adjusted downward. New KPIs: Copilot usage rate per department, shadow AI incidents (target: zero), prompt quality scores from workshop assessments."
    if "reporting lines" in q or "team structure" in q:
        return "No structural changes to reporting lines or team compositions. This is purely a tool/capability change. This is an important message -- staff need to hear explicitly that no jobs are being eliminated."
    if "capacity to learn" in q:
        return "Capacity is tight. Nursing staff cannot attend multi-hour training sessions due to shift coverage requirements. Workshops are capped at 20 participants and scheduled around shift patterns. Champions provide ongoing floor support to reduce formal training burden."
    if "time of year" in q or "business cycle" in q:
        return "Summer holiday period (July-August) and flu season (December-February) are the hardest periods for clinical staff availability. The 12-week ACM period is deliberately scheduled March-May 2026 to avoid both."

    # Capability baseline
    if "proficiency" in q and ("current tool" in q or "rate" in q):
        return "Digital literacy varies significantly: back-office staff are generally proficient with M365 (7/10). Nurses average 5/10 -- they use the EMR system daily but limited M365 experience. Surgeons are 6/10 with technology but impatient with new interfaces. Ward secretaries are 6/10 with Word and Outlook but struggle with newer features."
    if "formal training" in q and ("received" in q or "last" in q):
        return "Very limited recent training. The EMR system training was 3 years ago. No M365-specific training has been delivered. Some staff attended a generic 'IT security awareness' e-learning 6 months ago, which was poorly received (click-through compliance exercise)."
    if "most difficult" in q and ("current tool" in q or "process" in q):
        return "Staff find these most difficult: (1) Searching across multiple systems for patient information, (2) Formatting documents to CuraNova standards, (3) Creating pivot tables and data summaries in Excel (back-office), (4) Managing complex email threads with external referrers."
    if "prefer to learn" in q:
        return "Clinical staff strongly prefer hands-on, small-group workshops over e-learning. 'Show me, then let me try' is the dominant preference. Peer coaching from champions is highly valued. E-learning alone has failed in previous initiatives."
    if "confident" in q and "learn" in q and "technology" in q:
        return "Confidence varies: younger staff (< 35) are generally confident (8/10). Staff aged 45+ are less confident (5/10) and need more reassurance. Surgeons are confident but impatient -- they want to see value in the first 5 minutes or they disengage."
    if "previous training programmes" in q and "helpful" in q:
        return "The EMR training was considered adequate but too short. The IT security e-learning was universally disliked (seen as a tick-box exercise). Staff remember the scheduling software training as 'too little, too late' -- training happened after the rollout, not before."
    if "learning management system" in q or "lms" in q:
        return "CuraNova has a basic LMS (Cornerstone) used primarily for mandatory compliance training. It could host Copilot e-learning modules but is not suitable as the primary training channel given staff preferences for hands-on learning."
    if "training resources" in q and ("trainer" in q or "room" in q or "available" in q):
        return "CuraNova has 2 training rooms at the main Eindhoven location (20 seats each) and 1 at each satellite location (12 seats). No dedicated internal trainers for IT skills. Vitalis provides the training delivery as part of the ACM engagement."
    if "digital champion" in q or "super-user" in q and "leverag" in q:
        return "There are 3-4 informal tech helpers per department who already assist colleagues. These are the primary candidates for the 15-person champion programme. They need formal recognition, protected time, and structured support rather than just being left to volunteer."

    # Change history
    if "significant changes" in q and ("last 2" in q or "last two" in q or "2-3 year" in q):
        return "Two major changes in the last 3 years: (1) Failed scheduling software rollout 2 years ago -- still a sore point, (2) EMR system upgrade 3 years ago -- went better but training was inadequate. Additionally, COVID-19 forced rapid adoption of Teams for remote collaboration, which was relatively successful."
    if "changes went well" in q or "what made them successful" in q:
        return "The Teams adoption during COVID was surprisingly smooth because (1) there was an obvious, immediate need, (2) younger staff helped colleagues informally, and (3) it made their work genuinely easier. The EMR upgrade was acceptable because clinical staff understood the patient safety rationale."
    if "painful or failed" in q or "what went wrong" in q:
        return "The scheduling software failure is the defining scar tissue event. It was rolled out top-down without user input, added 3 steps to every nurse's workflow, the training was inadequate and delivered after go-live, and promises of 'it will get better' were never fulfilled. It was eventually rolled back after 4 months."
    if "leadership announces" in q and "typical reaction" in q:
        return "The default reaction is cautious scepticism: 'Let's wait and see if this actually happens.' Staff have learned to not invest emotionally in announced changes because several have been reversed or abandoned. There is a strong 'this too shall pass' culture."
    if "promises" in q and "not kept" in q:
        return "The scheduling software was promised to 'save 30 minutes per shift.' It actually added time. Staff were told 'we will fix the issues' but the system was eventually scrapped. This broken promise is directly relevant -- our messaging must acknowledge it and differentiate Copilot."
    if "trust" in q and ("interest" in q or "scepticism" in q):
        return "Trust in IT-led changes is low. Trust in clinically-led changes is moderate. Staff trust their direct managers more than senior leadership for honest information. The shadow AI usage itself shows staff ARE open to AI -- they just don't trust the organisation to implement it well."
    if "change fatigue" in q:
        return "Moderate change fatigue. CuraNova has had regulatory changes, the EMR upgrade, and the scheduling failure in quick succession. However, the Copilot deployment is seen as different because staff are already using AI (just unsafely). The key is framing this as 'making what you already do safer' rather than 'here is yet another new thing.'"
    if "properly completed" in q or "abandoned halfway" in q:
        return "The scheduling software was literally abandoned -- rolled back after 4 months. The EMR upgrade was completed but staff feel the training and support were cut short. There is a pattern of 'project team moves on' before embedding is complete."
    if "attempted anything similar" in q:
        return "No previous AI-specific initiatives. The closest analogue is the Teams rollout during COVID, which succeeded largely organically. The scheduling software failure is the most relevant precedent for an IT-mandated tool change."
    if "specific groups" in q and "difficult" in q and "change" in q:
        return "The surgical department is consistently the hardest group for any change -- they are time-poor, autonomous, and sceptical. Interestingly, they are also the heaviest shadow AI users, which creates a paradox: they want AI but resist managed rollouts."

    # Middle management
    if "understand about this change" in q and "why" in q:
        return "Department heads understand the business case and compliance rationale. Middle managers (charge nurses, team leads) have a vague understanding that 'an AI tool is coming' but lack specifics about impact on their teams' daily workflows."
    if "questions" in q and "haven't been answered" in q:
        return "Key unanswered questions: (1) Will ward secretary positions be reduced? (2) How will training be scheduled without impacting patient care? (3) What happens to staff who can't adapt? (4) When exactly does this start affecting my team?"
    if "enough information to explain" in q:
        return "Most middle managers do not feel equipped to explain the change to their teams. They need a briefing pack with FAQs, key messages, and specific workflow impact descriptions for their department."
    if "believe in" in q and "change personally" in q:
        return "Mixed: the Head of Nursing is genuinely enthusiastic. Most department heads see the logic but are worried about implementation disruption. Two charge nurses are privately sceptical -- they've seen previous changes fail and don't want to champion something that might embarrass them."
    if "concerns" in q and "impact on your team" in q:
        return "Main concerns: (1) Training time taking staff away from patient care, (2) Older staff struggling with new technology, (3) The perception that AI = monitoring = less trust, (4) Potential increase in workload during the transition period."
    if "advocate" in q and "difficult" in q:
        return "Most managers are willing to support the change if they feel informed and equipped. They are not willing to champion something they don't fully understand or haven't used themselves. The champion training for managers must happen before the broader rollout."
    if "more confident" in q and "enthusiastic" in q:
        return "Managers want: (1) to try Copilot themselves before promoting it to their teams, (2) a clear FAQ document for common staff questions, (3) assurance that the timeline accounts for clinical workload, (4) evidence from the pilot showing genuine time savings."
    if "led your team" in q and "significant change" in q:
        return "The EMR upgrade and the scheduling software failure are the two reference points. Managers who supported the scheduling software publicly feel 'burnt' and are cautious about endorsing another IT change. The Head of Nursing successfully led her team through the EMR upgrade and is a model for this initiative."
    if "equipped to support" in q and ("training" in q or "coaching" in q or "resistance" in q):
        return "Most managers feel under-equipped. They can manage day-to-day operations but have limited change management skills. The champion programme and manager briefing packs will fill this gap. Two managers specifically requested coaching on handling resistance conversations."
    if "support or resources" in q and "lead this effectively" in q:
        return "Managers need: (1) early access to Copilot to build personal experience, (2) a manager-specific briefing 1 week before staff communications, (3) a simple escalation path for issues they cannot resolve, (4) regular updates from Sarah on what's working and what's not."
    if "capacity" in q and "current workload" in q:
        return "Capacity is the number one constraint. Clinical teams are already stretched. Training must be in short sessions (max 90 minutes) scheduled around shift patterns. Champions absorb ongoing support so that formal training is minimised."
    if "competing priorities" in q and "in the way" in q:
        return "The annual quality audit (April) and summer leave planning (May) are potential competing priorities. Two departments are also onboarding new junior staff in April. The ACM plan accounts for these by front-loading critical training in March."
    if "struggling" in q and "change" in q and "know" in q:
        return "Managers can spot struggling team members through: reduced output quality, increased errors, avoidance of new tools (reverting to old methods), and increased frustration or disengagement. Champions will also flag struggling individuals."

    # Resistance risk profile
    if "status" in q and "recognition" in q and "lose" in q:
        return "Surgeons risk losing their 'expert status' in clinical documentation -- they pride themselves on their writing. Ward secretaries may lose their 'gatekeeper' role if doctors can draft their own letters. These identity losses need to be addressed explicitly."
    if "competence" in q and "expert to novice" in q:
        return "Yes, significantly. Staff who are proficient with current tools will temporarily become novices with Copilot. This is especially threatening for older staff and for surgeons who are accustomed to being the most capable people in the room."
    if "autonomy" in q and "control" in q and "lose" in q:
        return "The shift from uncontrolled ChatGPT Free to governed Copilot with Purview monitoring reduces perceived autonomy. Staff who valued being able to 'just get things done' with ChatGPT will feel constrained. The messaging must frame governance as protection, not control."
    if "workload increase" in q or ("workload" in q and "during" in q and "transition" in q):
        return "Yes, workload will increase during the 4-week transition as staff learn new workflows. The 'Time-Back' analysis shows net time savings of 30 min/day for ward secretaries and 20 min/day for nurses after the learning curve, but the initial period will feel like extra work."
    if "predictability" in q and "decrease" in q:
        return "Moderately. AI outputs are inherently less predictable than manual processes -- staff will need to learn to review and edit rather than write from scratch. This shift from 'I create' to 'I review and approve' requires a mindset change."
    if "tangible benefits" in q:
        return "Time savings: 30 min/day for ward secretaries (referral letters, appointment summaries), 20 min/day for nurses (documentation), 15 min/day for surgeons (research summaries). Compliance benefit: no more GDPR/NEN 7510 risk from ChatGPT Free. Quality benefit: consistent, professional documentation."
    if "believe" in q and "benefits" in q and "real" in q:
        return "Scepticism is high due to the scheduling software failure where promised benefits never materialised. The Time-Back analysis with real CuraNova workflow data is crucial evidence. Piloting with willing departments first will create visible proof points."
    if "start experiencing the benefits" in q:
        return "Ward secretaries should see time savings within 2 weeks of training. Nurses within 3-4 weeks as they build prompting habits. Surgeons may take 4-6 weeks due to lower engagement. Back-office staff can see benefits almost immediately for report generation."
    if "direct manager" in q and "supportive" in q:
        return "Head of Nursing: highly supportive (9/10). Surgical department: neutral (5/10), Head of Surgery needs convincing. Ward secretary team lead: supportive (7/10). Back-office managers: supportive (8/10). Manager support is the strongest predictor of team adoption."
    if "broken promises" in q:
        return "Yes -- the scheduling software failure is the defining broken promise. Staff were told 'it will save you time' and it did the opposite. This scar tissue means our credibility depends on demonstrating real benefits before asking for trust."
    if "trust" in q and "communications" in q and "organisational" in q:
        return "Low to moderate. Staff trust face-to-face communication from their direct managers far more than official emails from leadership. The champion network is designed to provide this trusted, peer-level communication channel."

    # Change strategy
    if "compelling case" in q and "why now" in q:
        return "Compelling case: (1) Shadow AI creates immediate patient data risk that regulators could act on, (2) Staff are already demonstrating demand for AI tools, (3) Competitors are deploying AI-assisted workflows, (4) The NEN 7510 audit in Q3 2026 will scrutinise AI governance."
    if "top three risks" in q and "adoption" in q:
        return "Top 3 adoption risks: (1) Scheduling software scar tissue creating 'here we go again' resistance, (2) Surgeons disengaging from training due to time pressure, (3) Shadow AI users perceiving governed Copilot as inferior to unrestricted ChatGPT Free."
    if "single biggest obstacle" in q:
        return "The single biggest obstacle is the organisational scar tissue from the failed scheduling software rollout. Every communication, training session, and interaction will be filtered through the lens of 'is this going to be another disaster?' We must proactively address this in every touchpoint."
    if "know this change" in q and "successfully adopted" in q:
        return "Success criteria: (1) 80% active Copilot usage across all departments within 12 weeks, (2) Zero patient data incidents via unapproved AI tools, (3) Shadow AI usage reduced by 90%, (4) Net Promoter Score > 30 from staff survey, (5) Department heads reporting measurable time savings."
    if "adoption metrics" in q and ("utilisation" in q or "proficiency" in q or "business impact" in q):
        return "Utilisation: monitored via M365 admin centre and Copilot Dashboard. Proficiency: assessed through workshop completion scores and prompt quality reviews. Business impact: measured via the PowerBI adoption dashboard tracking documentation completion times, referral turnaround, and shadow AI incidents."
    if "timeline" in q and "full adoption" in q:
        return "12-week ACM period (March-May 2026). Pilot group (champions + willing departments) weeks 1-4. Broader rollout weeks 5-8. Reinforcement and handover weeks 9-12. Full adoption target: 80% active usage by end of week 12."
    if "minimum acceptable" in q and "adoption" in q:
        return "Minimum acceptable: 60% active usage with zero patient data incidents. Below 60%, additional intervention budget would need to be discussed. The shadow AI reduction target (90%) is non-negotiable from a compliance perspective."
    if "specific intervention" in q and ("concern" in q or "resistance" in q):
        return "Interventions mapped to resistance clusters: (1) Scar tissue -> explicit acknowledgement in all comms + pilot proof points, (2) Competence anxiety -> safe practice environments + champion floor support, (3) Autonomy loss -> frame governance as patient protection not monitoring, (4) Surgeon disengagement -> 1-on-1 demonstrations with research summary use cases."
    if "resources" in q and "intervention" in q:
        return "Resources available: EUR 68,500 fixed fee covers all ACM deliverables. 15 champions with 2 hours/week protected time. 2 training rooms at main location. Vitalis provides Sarah as dedicated ACM consultant. CuraNova communications team available for material review."
    if "constraints" in q and ("intervention" in q or "mandatory" in q):
        return "Constraints: (1) Training cannot be mandatory for clinical staff during patient care hours, (2) No all-staff town halls possible due to 24/7 shift operations, (3) All materials must pass CuraNova communications review, (4) Purview monitoring messaging must be approved by legal."

    # Stakeholder engagement plan
    if "need to know" in q and "feel" in q and "do" in q:
        return "Dr. Mark: needs to feel confident the project is on track; must visibly champion. Department heads: need to understand impact on their teams; must cascade messages. Champions: need deep product knowledge; must provide floor support. Clinical staff: need to see 'what's in it for me'; must attend training and try Copilot."
    if "frequency" in q and "engagement" in q:
        return "Dr. Mark: weekly 30-min check-ins. Department heads: fortnightly at existing management meeting. Champions: weekly Teams channel + biweekly video call. Resistor stakeholders (Dr. Hendriks): biweekly 1-on-1 until disposition shifts. Clinical staff: through champions continuously."
    if "engaged together" in q or "separately" in q:
        return "Engage together: the Head of Nursing and ward secretary team lead (aligned interests). Separately: Dr. Hendriks (Head of Surgery) needs private engagement before group settings -- he won't voice concerns publicly. IT Security and Dr. Mark together for governance discussions."
    if "credibility" in q and "resistant" in q:
        return "Head Nurse van Dijk has the most credibility with resistant nursing staff. For the surgeons, a successful early adopter from within their own department (once identified) will be more credible than any external champion. Dr. Mark can influence department heads but not frontline staff directly."
    if "advocate effectively" in q and "supportive" in q:
        return "Supportive stakeholders need: (1) talking points and FAQ documents, (2) early access to Copilot so they speak from experience, (3) regular updates on adoption progress to share with their teams, (4) a simple way to escalate issues they hear about."
    if "speak publicly" in q:
        return "Dr. Mark: yes, committed to town hall and video. Head of Nursing: yes, willing to present at department meetings. Head Nurse van Dijk: willing to speak informally but not at formal events. Dr. Hendriks: not yet -- needs to be won over first."
    if "root cause" in q and "resistance" in q:
        return "Dr. Hendriks (Head of Surgery): root cause is autonomy concern -- he sees governed AI as IT overreach into clinical workflows. Senior nurses (Ward 5): root cause is competence anxiety -- they are less digitally confident and fear looking incompetent. Both require different interventions."
    if "legitimate concerns" in q and "personal interests" in q:
        return "The surgeons' concern about workflow disruption is legitimate and should be addressed through tailored demonstrations. The concern about Purview 'monitoring' is partially legitimate (privacy) and partially based on misunderstanding (it monitors data flow, not individual performance). Both need honest engagement."
    if "best person to engage" in q:
        return "Dr. Hendriks: best engaged by Dr. Mark (peer authority) with Sarah present for technical details. Senior nurses: best engaged by Head Nurse van Dijk (trusted peer) with champion support. IT Security concerns: engaged by Sarah directly with technical evidence."

    # Training architecture
    if "training modalities" in q and ("use" in q or "trust" in q):
        return "Hands-on workshops are most trusted. E-learning is poorly received ('tick-box exercise'). Peer coaching from champions is highly valued. Video recordings of workshops are acceptable for catch-up but not as primary delivery. Floor-walking support during the first 2 weeks post-deployment is essential."
    if "scheduling constraints" in q or ("taken off" in q and "work" in q):
        return "Clinical staff cannot be away for more than 90 minutes due to shift coverage. Workshops must be repeated across multiple time slots to accommodate all shifts. Protected time for training must be approved by department heads and covered by colleagues."
    if "training environment" in q or "sandbox" in q:
        return "Vitalis will configure a Copilot sandbox environment with anonymised patient data for safe practice. This is critical -- staff must be able to experiment without fear of making mistakes with real patient data. The sandbox will be available from week 2."
    if "recorded" in q and ("later" in q or "on-demand" in q):
        return "Yes, all 3 prompt engineering workshops will be recorded and hosted on the CuraNova intranet. However, recordings are supplementary -- the primary delivery is hands-on workshops. Staff who only watch recordings will receive follow-up champion support."
    if "critical skills" in q and "day one" in q:
        return "Day one essentials: (1) How to open and access Copilot in M365 apps, (2) Basic prompting (what to type, what not to include), (3) Understanding sensitivity labels (which documents are restricted), (4) How to get help (champion, Teams channel, help desk). Advanced skills can develop over weeks 2-8."
    if "accessibility" in q and ("language" in q or "disability" in q or "remote" in q):
        return "All materials will be in Dutch (primary) with English summaries for international staff. CuraNova's third location has some remote workers who need virtual workshop access. No specific disability accommodations required currently, but all materials will follow WCAG guidelines."
    if "significantly more support" in q:
        return "Three groups need extra support: (1) Staff aged 50+ with lower digital confidence, (2) Surgeons who require 1-on-1 demonstrations rather than group workshops, (3) Night shift nurses who cannot attend regular training slots -- they need dedicated evening sessions."
    if "how many people" in q and "trained" in q:
        return "Approximately 800 staff across 3 locations, phased over 8 weeks. Week 1-2: 15 champions (intensive). Week 3-4: pilot departments (~150 staff). Week 5-8: remaining staff. Workshops capped at 20 participants = approximately 40 workshop sessions total."
    if "meeting" in q and "training infrastructure" in q:
        return "The main Eindhoven location has 2 training rooms (20 seats each, equipped with projectors and PCs). Each satellite location has 1 smaller room (12 seats). This is sufficient if sessions are well-scheduled. IT will ensure Copilot is pre-configured on all training room PCs."
    if "budget" in q and "training materials" in q:
        return "Training delivery is included in the EUR 68,500 fixed fee. CuraNova provides the facilities and staff time. Additional costs for printed materials (AI Etiquette Guide) estimated at EUR 1,200, covered by CuraNova's L&D budget."

    # Technical deployment
    if "confirmed" in q and "deployment timeline" in q:
        return "Technical deployment: Week 1-2 Purview AI Hub and sensitivity labels configuration. Week 3-4 Defender for Cloud Apps policies and SharePoint Advanced Management. Week 5 pilot group Copilot licence provisioning. Week 6 broader licence rollout. Technical pilot completion triggers 2nd milestone payment (40%)."
    if "firm" in q and "tentative" in q:
        return "Firm milestones: Purview configuration (week 2), pilot licence provisioning (week 5). Tentative: broader rollout timing depends on pilot feedback. The 12-week ACM period end date is contractually firm."
    if "dependencies" in q and "technical milestone" in q:
        return "Sensitivity labels must be configured before Copilot licences are provisioned (patient data protection prerequisite). Defender for Cloud Apps policies must be active before blocking ChatGPT Free (to avoid creating a gap where neither old nor new AI is available)."
    if "pilot environment" in q and "ready" in q:
        return "Copilot sandbox environment available from week 2 for champion training. Production pilot environment with real (governed) data from week 5. Champions get 3 weeks of practice before the broader staff rollout."
    if "access first" in q and "sequence" in q:
        return "Sequence: (1) Champions across all departments (week 5), (2) Willing early adopter departments -- Head of Nursing's team and back-office (week 6), (3) Remaining departments including surgery (week 7-8). Surgeons are deliberately placed later to allow proof points to accumulate."
    if "features" in q and "pilot vs" in q:
        return "Pilot: full Copilot in Word, Outlook, Teams, Excel, PowerPoint with all 10 sensitivity labels enforced. Not available at pilot: Copilot in the EMR system (out of scope). Power Automate AI features deferred to Phase 2."
    if "technical limitation" in q and "user experience" in q:
        return "Key limitations: (1) Copilot cannot access the EMR system directly -- staff must copy-paste text into M365 apps (with sensitivity labels auto-applied), (2) Response times may be slower during peak usage hours, (3) Dutch language prompting works but English produces higher quality outputs currently."
    if "rollback plan" in q:
        return "If critical issues arise: Copilot licences can be deactivated per-user within 1 hour. Sensitivity labels and Purview monitoring remain active regardless. ChatGPT Free blocking via Defender can be temporarily relaxed if needed (requires Dr. Mark + IT Security approval)."
    if "most likely" in q and "delay" in q:
        return "Most likely delays: (1) Sensitivity label configuration taking longer due to complex medical document taxonomy, (2) IT Security requiring additional testing of Defender policies, (3) Champion recruitment taking longer if managers resist releasing staff time."
    if "notified" in q and "technical issues" in q:
        return "Vitalis technical team has a shared Teams channel with CuraNova IT. Critical issues escalated via phone to IT Security Officer within 1 hour. Sarah receives daily technical status updates and flags ACM-relevant issues immediately."
    if "freeze window" in q:
        return "No formal deployment freeze, but CuraNova prefers to avoid changes during the annual quality audit (mid-April). The pilot launch is scheduled for week 5 (early April) to be established before the audit period."

    # Measurement framework
    if "system telemetry" in q or "usage data" in q:
        return "M365 Admin Centre provides Copilot usage data per user. Purview AI Hub shows data access patterns and potential policy violations. Defender for Cloud Apps logs blocked shadow AI attempts. All data feeds into the PowerBI adoption dashboard."
    if "business metrics" in q and "improve" in q:
        return "Expected improvements: (1) Discharge summary completion time (target: 40% reduction), (2) Referral letter turnaround (target: 50% faster), (3) Shadow AI incidents (target: zero within 8 weeks), (4) Staff satisfaction with documentation tools (baseline survey vs. end survey)."
    if "using" in q and "correctly" in q and ("not just at all" in q or "measure" in q):
        return "Proficiency measured through: (1) Prompt quality scores from workshop assessments, (2) Sensitivity label compliance rates (are staff using correct labels?), (3) Champion observations of real-world usage quality, (4) Sample review of AI-generated documents for clinical accuracy."
    if "existing reports" in q or "dashboard" in q and "leverage" in q:
        return "The M365 Adoption Score dashboard exists but is not currently monitored. Vitalis will configure the PowerBI adoption dashboard to pull from M365 admin data, Purview AI Hub, and Defender logs. CuraNova IT can provide access to existing reporting infrastructure."
    if "owns the data" in q and "share" in q:
        return "IT Security Officer owns the Purview and Defender data. HR owns staff demographic data for segmentation. Department heads own operational metrics. Dr. Mark has authorised data sharing for the adoption dashboard. GDPR compliance confirmed with CuraNova's DPO."
    if "data privacy" in q and ("gdpr" in q or "consideration" in q):
        return "GDPR and NEN 7510 requirements: individual usage data visible only to IT Security and project leadership. Department-level aggregates shared with department heads. No individual performance scoring from AI usage data. Data processing agreement between Vitalis and CuraNova covers dashboard data."
    if "reporting cadence" in q:
        return "Weekly adoption report for Dr. Mark (check-in meeting). Fortnightly summary for department heads (management meeting). Monthly executive summary for CuraNova board. Real-time alerts for shadow AI policy violations."
    if "current values" in q and "metrics" in q:
        return "Baseline measurements (pre-deployment): Average discharge summary time: 22 minutes. Referral letter turnaround: 2.1 days. Shadow AI usage: estimated 40% of clinical staff using ChatGPT Free at least weekly. Current Copilot adoption: 0% (not yet deployed)."
    if "seasonal" in q or "cyclical" in q:
        return "Flu season (Dec-Feb) increases clinical workload and reduces training capacity. Summer holidays (Jul-Aug) reduce staff availability. The March-May deployment window is optimal. Week-to-week variations are minimal outside these periods."

    # Resistance management
    if ("fear" in q or "loss" in q or "understanding" in q) and "genuine problem" in q:
        return "Mapped by cluster: Surgeons = fear of autonomy loss + genuine concern about workflow disruption. Ward secretaries = fear of job displacement (partially legitimate). Nurses = competence anxiety + workload concern. Back-office = minimal resistance, mainly about learning curve."
    if "safe practice" in q and ("environment" in q or "create" in q):
        return "Copilot sandbox with anonymised patient data available from week 2. Champions staff 'drop-in Copilot clinics' twice weekly. All practice sessions are explicitly framed as safe learning spaces -- no monitoring of individual performance during practice."
    if ("one-on-one" in q or "1-on-1" in q or "one on one" in q) and "resistor" in q:
        return "Dr. Hendriks (Head of Surgery): 1-on-1 with Dr. Mark, focusing on research summary use case. Senior nurses on Ward 5: Head Nurse van Dijk will have informal conversations. IT-sceptical staff: champions provide peer-level engagement. Sarah handles escalated cases."
    if "structural barrier" in q and ("policy" in q or "technology" in q or "legitimate" in q):
        return "Identified structural barriers: (1) Copilot cannot access EMR directly (technical limitation, not ACM-solvable), (2) Shift patterns make training attendance difficult (structural, requires scheduling accommodation), (3) Some departments lack sufficient PCs for hands-on practice (resource issue to escalate)."
    if "respond" in q and "openly resist" in q:
        return "Manager guidance: (1) Listen without defending -- acknowledge concerns, (2) Distinguish between 'I have a legitimate concern' and 'I don't want to change', (3) Escalate legitimate concerns to Sarah, (4) For persistent resistance, involve the champion and if needed, Dr. Mark."
    if "performance issue" in q and "resistance" in q:
        return "Resistance becomes a performance issue only when: (1) individual non-adoption creates compliance risk (e.g., continuing to use ChatGPT Free), and (2) after reasonable support and training have been provided. Dr. Mark and HR decide, not the ACM consultant."
    if "track resistance" in q and "patterns" in q:
        return "Resistance tracking through: (1) Champion weekly reports (qualitative), (2) Copilot usage data by department (quantitative), (3) Shadow AI blocking logs from Defender, (4) Help desk ticket sentiment analysis, (5) Sarah's biweekly resistance pulse survey to department heads."

    # Champions
    if "respected" in q and "peer" in q and "informal influence" in q:
        return "Identified per department: Nursing -- Head Nurse van Dijk (Ward 3) and charge nurse Amin (Ward 7). Surgery -- Dr. Janssen (junior surgeon, tech-enthusiastic). Back-office -- Lisa from Finance (Excel power user). Ward secretaries -- Petra de Vries (18 years, knows everyone)."
    if "enthusiasm" in q and "early interest" in q:
        return "The following have expressed interest: 3 nurses from the night shift (surprisingly), 2 back-office staff who already use Copilot features in personal M365, Dr. Janssen (junior surgeon), and 4 ward secretaries who are tired of repetitive letter writing."
    if "champion" in q and "previous change" in q and "effective" in q:
        return "During the EMR upgrade, 5 'super-users' were appointed. 3 were effective (they actually helped colleagues) and 2 were nominal (had the title but didn't engage). Lesson learned: champions must be volunteers, not appointees, and must have protected time."
    if "how many champions" in q and ("team" in q or "department" in q):
        return "15 champions across CuraNova: 5 nursing (covering all wards across 3 locations), 3 medical (including 1 surgeon), 3 ward secretaries, 2 back-office, 2 management. Minimum 1 per department, with extra in nursing due to size and shift complexity."
    if "time per week" in q and "champion" in q:
        return "2 hours per week of protected time for champion activities. This includes: floor-walking support (1 hour), Teams channel monitoring and response (30 min), weekly champion check-in with Sarah (30 min). Managers have agreed to this time allocation."
    if "recognition" in q and "incentive" in q:
        return "Champions receive: (1) 'CuraNova AI Champion' certificate and badge, (2) 2 extra hours of advanced Copilot training, (3) Mention in the CEO's quarterly newsletter, (4) A dedicated Teams channel for peer support and direct access to Sarah. No financial incentive -- intrinsic motivation and recognition focus."
    if "early access" in q and "special resources" in q:
        return "Champions get: (1) Copilot licence 3 weeks before other staff, (2) Access to the sandbox environment from day 1, (3) Advanced prompt engineering guide (beyond what's covered in workshops), (4) Direct Teams chat with Sarah for questions and escalation."
    if "training" in q and "champion" in q and "role" in q:
        return "Champion training (2 half-days): Day 1 -- advanced Copilot features, sensitivity labels, common use cases per department. Day 2 -- peer coaching skills, handling resistance conversations, reporting and escalation. Plus ongoing support via dedicated Teams channel."
    if "report back" in q and "hearing" in q:
        return "Champions report via: (1) Dedicated Teams channel (real-time observations), (2) Weekly structured report template (5 questions: what's working, what's confusing, resistance spotted, suggestions, help needed), (3) Biweekly video call with all champions and Sarah."
    if "disengage" in q and "leaves" in q:
        return "Backup champions identified for each department. If a champion disengages: Sarah has a 1-on-1 to understand why (burnout? manager not supporting time?). If unresolvable, the backup steps in. The champion network health assessment (Activity 25) monitors this formally."

    # Governance integration
    if "existing governance" in q:
        return "CuraNova has a monthly IT Steering Committee (Dr. Mark, CFO, IT Director, department heads). No formal ACM representation currently. There is also a weekly technical project standup for the Copilot deployment."
    if "steering committee" in q and ("who" in q or "how often" in q):
        return "IT Steering Committee meets monthly. Members: Dr. Mark (chair), CFO, IT Director, Head of Nursing, Head of Surgery, Head of Operations. Sarah will present an ACM status update as a standing agenda item."
    if "acm voice" in q and "governance" in q:
        return "Currently no ACM voice in governance. This will be new. Sarah will attend the monthly IT Steering Committee and the weekly technical standup. ACM risks and adoption data will be a standing agenda item."
    if "decisions" in q and "acm" in q and "autonomously" in q:
        return "Sarah can decide autonomously: communication timing and messaging (with CuraNova comms review), workshop scheduling, champion coaching approach, training content adjustments. Requires escalation: scope changes, budget reallocation, sponsor intervention requests, deployment timeline changes."
    if "escalation" in q and ("budget" in q or "scope" in q or "sponsor" in q):
        return "Escalation triggers: (1) Adoption below 40% at any weekly checkpoint, (2) Champion network losing more than 3 members, (3) Resistance that a department head cannot resolve, (4) Technical issues blocking adoption for more than 48 hours, (5) Any patient data incident."
    if "quickly" in q and "governance respond" in q:
        return "Monthly steering committee is too slow for urgent ACM issues. Dr. Mark has agreed to a 24-hour escalation path: Sarah contacts Dr. Mark directly for urgent items, decision within 24 hours. For critical items (patient data incidents), immediate phone escalation."
    if "reporting format" in q and "governance" in q:
        return "One-page status report: RAG status for adoption, training, resistance, champion network. Key metrics: usage rate, shadow AI incidents, training completion. Issues and decisions needed. This aligns with CuraNova's existing governance reporting format."
    if "frequently" in q and "acm report" in q:
        return "ACM reports monthly to steering committee (aligned with existing cadence). Additionally, weekly written update to Dr. Mark and fortnightly verbal update at management meeting. During deployment weeks 5-8, daily flash updates to Dr. Mark."
    if "leading indicator" in q or "lagging indicator" in q:
        return "Both. Leading indicators: champion sentiment, training attendance, manager engagement, resistance signals. Lagging indicators: usage data, shadow AI reduction, documentation time savings. Governance wants leading indicators for early intervention and lagging indicators for quarterly board reporting."

    # Teams channels
    if "microsoft teams" in q and "collaboration platform" in q:
        return "Yes, CuraNova uses Microsoft Teams as its primary collaboration platform. Adopted during COVID and well-established. All departments have active Teams channels. Mobile Teams app is used by clinical staff on the floor."
    if "restriction" in q and "creating" in q and "channel" in q:
        return "IT approval is required for new Teams/channels in the CuraNova tenant. Request submitted and approved for: (1) CuraNova Copilot Champions (private), (2) CuraNova Copilot Pilot (private), (3) CuraNova AI Questions (public). Turnaround: 2 business days."
    if "existing channel" in q and ("use" in q or "rather than" in q):
        return "Each department has existing Teams channels for operational communication. We will post Copilot updates in these existing channels (reaching people where they are) AND maintain dedicated Copilot channels for focused discussions and support."
    if "access" in q and "each channel" in q:
        return "Champions channel: 15 champions + Sarah + Dr. Mark. Pilot channel: pilot group participants (~150 staff) + champions + Sarah. AI Questions channel: all staff (discoverable). Manager channel: department heads + Sarah."
    if "moderate" in q and "channel" in q and "respond" in q:
        return "Champions channel: Sarah moderates, champions co-moderate. Pilot channel: champions respond to peer questions, Sarah handles escalations. AI Questions channel: champions take turns on a weekly rota. Response target: 4 hours during business hours."
    if "private" in q and "discoverable" in q:
        return "Champions channel: private (sensitive intelligence and strategy discussions). Pilot channel: private during pilot, converted to public after broader rollout. AI Questions channel: public and discoverable -- staff should find help easily."

    # Generic keyword matching for remaining questions
    if "sponsor" in q:
        return "Dr. Mark van der Berg (Medical Director) is the project sponsor with full decision authority. He has committed to visible sponsorship including town halls, video messages, and weekly check-ins."
    if "stakeholder" in q:
        return "Key stakeholder groups: clinical staff (nurses, surgeons, specialists), ward secretaries, back-office staff, and department heads across CuraNova's 3 locations with ~800 total staff."
    if "risk" in q or "resistance" in q:
        return "Primary risks stem from the failed scheduling software rollout 2 years ago and the shadow AI problem. Staff perceive new IT tools as 'more work.' Specific resistance expected from surgeons (time-poor, sceptical) and older nursing staff (competence anxiety)."
    if "training" in q or "workshop" in q or "learn" in q:
        return "3 prompt engineering workshops capped at 20 participants each, scheduled around clinical shift patterns. 15 champions trained intensively as peer coaches. All sessions hands-on with anonymised patient data in sandbox environment."
    if "communicat" in q:
        return "Communication follows the AI-Awareness Toolkit approach: 'Safe AI in Healthcare' messaging. Manager cascade 1 week before staff comms. Champions as face-to-face channel for shift workers. All materials reviewed by CuraNova communications team."
    if "capability" in q or "skill" in q or "competenc" in q:
        return "Digital literacy varies significantly across CuraNova. Back-office staff are most proficient (7/10), nurses moderate (5/10), surgeons technically capable but resistant to new interfaces (6/10). Shadow AI use shows staff are capable of adopting AI tools when motivated."
    if "measur" in q or "metric" in q or "monitor" in q or "telemetry" in q or "dashboard" in q:
        return "PowerBI adoption dashboard tracking: Copilot active usage per department, shadow AI incidents (target: zero), documentation completion times, training completion rates. Data from M365 Admin Centre, Purview AI Hub, and Defender for Cloud Apps."
    if "governance" in q:
        return "ACM integrated into CuraNova's monthly IT Steering Committee. Sarah reports alongside technical project lead. 24-hour escalation path to Dr. Mark for urgent adoption issues. Purview AI Hub provides continuous AI governance monitoring."
    if "champion" in q or "network" in q or "super-user" in q:
        return "15 super-users selected across all departments, minimum one per department. Champions receive 2 additional hours of advanced training, early Copilot access (3 weeks before general rollout), and a dedicated Teams channel for peer support."
    if "timeline" in q or "schedule" in q or "when" in q:
        return "12-week ACM period running March-May 2026. Weeks 1-4: diagnosis and champion training. Weeks 5-8: deployment and broader rollout. Weeks 9-12: reinforcement, measurement, and handover."
    if "budget" in q or "cost" in q or "invest" in q:
        return "Total investment: EUR 68,500 fixed fee with 40/40/20 milestone payments. 40% upon signature, 40% after technical pilot completion, 20% after completion of the 12-week ACM period."

    # Default fallback
    return "Confirmed during diagnosis phase with CuraNova project team. Details documented in project files."


# Apply answers to questions
for question in data["questions"]:
    status = activity_status.get(question["activity_id"], "not_started")
    seq = question["sequence"]

    if status == "completed":
        # 80% answered: every 5th one stays unanswered
        should_answer = (seq % 5) != 0
    elif status == "in_progress":
        # ~33% answered
        should_answer = (seq % 3) == 0
    else:
        should_answer = False

    if should_answer:
        question["answer"] = generate_answer(question["question_text"])
        question["is_answered"] = True

# ---------------------------------------------------------------------------
# 5. Agreements
# ---------------------------------------------------------------------------

data["agreements"] = [
    {
        "id": "AG_default_i1",
        "question_agreed": "Champion programme scope",
        "agreement": "15 super-users will be selected, minimum one per department. Champions receive 2 additional hours of advanced training and a dedicated Teams channel for peer support.",
        "internal": True,
        "active": True,
        "added_by": "Sarah",
        "added_on": "2026-03-14"
    },
    {
        "id": "AG_default_i2",
        "question_agreed": "Training delivery format",
        "agreement": "3 interactive prompt engineering workshops will be held, scheduled around clinical shift patterns to maximise attendance. Each workshop capped at 20 participants.",
        "internal": True,
        "active": True,
        "added_by": "Sarah",
        "added_on": "2026-03-14"
    },
    {
        "id": "AG_default_i3",
        "question_agreed": "Shadow AI messaging approach",
        "agreement": "All communications about shadow AI will use a risk-reduction frame ('protecting patient data') rather than a punitive frame ('you broke the rules'). Messaging reviewed by CuraNova's communications team.",
        "internal": True,
        "active": True,
        "added_by": "Sarah",
        "added_on": "2026-03-14"
    },
    {
        "id": "AG_default_e1",
        "question_agreed": "Client project governance",
        "agreement": "CuraNova provides Dr. Mark van der Berg as dedicated project sponsor with decision authority. Weekly 30-min check-ins, escalation within 24h for blockers.",
        "internal": False,
        "active": True,
        "added_by": "Sarah",
        "added_on": "2026-03-10"
    },
    {
        "id": "AG_default_e2",
        "question_agreed": "Communications approval process",
        "agreement": "All staff-facing communications require CuraNova sign-off minimum 24 hours before distribution. Dr. Mark or his delegate (Head of Nursing) can approve.",
        "internal": False,
        "active": True,
        "added_by": "Sarah",
        "added_on": "2026-03-10"
    },
    {
        "id": "AG_default_e3",
        "question_agreed": "Adoption dashboard access",
        "agreement": "PowerBI adoption dashboard shared with CuraNova leadership team. Weekly data review during check-ins. Shadow AI reduction metrics visible to department heads.",
        "internal": False,
        "active": True,
        "added_by": "Sarah",
        "added_on": "2026-03-17"
    },
    # Out of scope items - AI analysis should flag these
    {
        "id": "AG_demo_oos1",
        "question_agreed": "Custom EMR integration",
        "agreement": "Build a custom 'Summarise' button inside the Electronic Medical Record (EMR) patient files, allowing doctors to use Copilot directly within the clinical workflow without switching to M365 apps.",
        "internal": False,
        "active": True,
        "added_by": "Dr. Mark",
        "added_on": "2026-03-10"
    },
    {
        "id": "AG_demo_oos2",
        "question_agreed": "Family AI awareness sessions",
        "agreement": "Organise evening sessions for employees' families to educate them about AI safety and build a positive culture around AI adoption at home, reducing resistance from personal networks.",
        "internal": False,
        "active": True,
        "added_by": "Dr. Mark",
        "added_on": "2026-03-17"
    },
    {
        "id": "AG_demo_oos3",
        "question_agreed": "Partner clinic licensing",
        "agreement": "Extend Microsoft 365 Copilot licensing and the full ACM programme to CuraNova's three partner clinics in the region, covering an additional ~400 staff members.",
        "internal": False,
        "active": True,
        "added_by": "Dr. Mark",
        "added_on": "2026-03-24"
    },
]

# ---------------------------------------------------------------------------
# 6. Config
# ---------------------------------------------------------------------------

config = {
    "project_name": "Secure Care Innovation: AI Integration & Clinical Adoption",
    "client_name": "CuraNova Healthcare Group",
    "consultant_name": "Sarah",
    "start_date": "2026-03-09",
    "end_date": "2026-05-29",
    "total_duration_value": "96",
    "duration_unit": "hours",
    "acm_touch_level": "full",
    "current_phase": "Plan II: Design + Activate Champions",
    "master_sheet_id": "",
    "template_sheet_id": ""
}

# ---------------------------------------------------------------------------
# 7. SOW
# ---------------------------------------------------------------------------

sow = {
    "content": """STATEMENT OF WORK
SoW # 2026-VDS-088 \u2013 Secure Care Innovation: AI Integration & Clinical Adoption
Version 1.0 | March 7, 2026

1. INTRODUCTION
This Statement of Work (SoW) is established between:
CuraNova Healthcare Group, located at Medisch Park 12, 5612 AJ Eindhoven (hereinafter \u201cCuraNova\u201d)
and
Vitalis Digital Solutions B.V., located at Stationsplein 45, 3511 ED Utrecht (hereinafter \u201cVitalis\u201d).
This SoW is effective as of the date of last signature and is governed by the Vitalis Standard Terms and Conditions.

2. PROJECT DESCRIPTION
2.1 Client Request & Current Situation
CuraNova aims to increase productivity for clinical and administrative staff through the deployment of Microsoft 365 Copilot. Due to strict medical regulations (GDPR and NEN 7510), an uncontrolled rollout is not feasible.
Current Status: \u2018Shadow AI\u2019 is prevalent, with staff using unsecured consumer AI for summarizing patient reports. The current Microsoft Purview setup is basic and not optimized for AI governance.
Desired Situation: A secured AI environment preventing data exfiltration, where employees are demonstrably competent in using AI tools safely.

2.2 Technical Solution (Build & Pilot)
Vitalis will implement the technical foundations for a secure AI ecosystem:
- Data Security Posture Management (DSPM): Setup of Purview AI Hub for real-time monitoring.
- Patient Data Protection: Configuration of 10 sensitivity labels with auto-classification for medical records.
- Endpoint & Cloud Security: Defender for Cloud Apps policies to block unapproved AI (e.g., ChatGPT Free).
- Governance: SharePoint Advanced Management to manage \u2018oversharing\u2019 in clinical team sites.

3. ADOPTION & CHANGE MANAGEMENT (ACM) DELIVERABLES
Vitalis uses the VITAL methodology (Verify, Inspire, Train, Activate, Learn).
- Stakeholder Impact Analysis: Detailed map of impact on nurses, doctors, and back-office.
- AI-Awareness Toolkit: Videos, posters, and newsletters regarding \u201cSafe AI in Healthcare.\u201d
- CuraNova Champion Program: Training 15 \u2018super-users\u2019 across departments.
- Clinical Prompt Engineering: 3 interactive workshops focused on safe prompting without PII data.
- Adoption Dashboard: PowerBI dashboard showing active usage and shadow AI reduction.
- AI Etiquette Guide: A digital handbook for daily clinical use.

4. INVESTMENT
Total investment: Fixed Fee of \u20ac 68,500.- (excl. VAT).
- 40% upon signature.
- 40% after technical pilot completion.
- 20% after completion of the 12-week ACM period.""",
    "technical_summary": "Microsoft 365 Copilot deployment for CuraNova Healthcare Group (regulated healthcare, GDPR/NEN 7510). Includes Purview AI Hub DSPM, 10 sensitivity labels with auto-classification, Defender for Cloud Apps to block shadow AI, SharePoint Advanced Management. 15-person champion programme, 3 prompt engineering workshops, PowerBI adoption dashboard, AI Etiquette Guide. Fixed fee \u20ac68,500, 12-week ACM period.",
    "date_added": "2026-03-07"
}

# ---------------------------------------------------------------------------
# 8. Transcripts
# ---------------------------------------------------------------------------

transcripts = [
    {
        "id": "TR_demo_1",
        "date": "2026-03-10",
        "participants": "Sarah (ACM Consultant, Vitalis), Dr. Mark van der Berg (Project Sponsor, CuraNova)",
        "meeting_type": "external",
        "transcript_note": """TRANSCRIPT: STAKEHOLDER DIAGNOSIS & SPONSORSHIP ASSESSMENT
Date: March 10, 2026
Location: CuraNova main building, Eindhoven
Participants: Sarah (ACM Consultant, Vitalis), Dr. Mark van der Berg (Medical Director & Project Sponsor, CuraNova)

Sarah: Good morning Mark. Thank you for making time for this. As we discussed, we are now in the Diagnosis phase of the VITAL methodology. I have drafted an initial stakeholder map based on the org chart and the preliminary data your HR team shared. I want to walk through it with you and get your input on the real dynamics.

Mark: Of course. I cleared 90 minutes for this. I think getting this right is important.

Sarah: Agreed. So, looking at the map, I have identified five key stakeholder groups: clinical nursing staff, the surgical department, ward secretaries, back-office administration, and the department heads as middle management. The nursing group is the largest at approximately 350 people across the three locations. Where I need your insight is the influence dynamics. Who actually shapes opinion when something new is introduced?

Mark: That is a good question. Officially it flows through the department heads, but in practice, there are a few people who set the tone. On the nursing side, Head Nurse van Dijk on Ward 3 is the person everyone listens to. She has been here 15 years and if she says something works, people believe her. For the surgeons, it is Dr. Hendriks. He is the Head of Surgery and he is, let me be honest, sceptical about anything that comes from IT.

Sarah: Tell me more about Dr. Hendriks. What is his specific concern?

Mark: He sees technology projects as distractions from clinical work. The scheduling software disaster two years ago really cemented that view. He was one of the most vocal critics. But here is the paradox -- I know for a fact that his team uses ChatGPT more than anyone else. They use it for research summaries and literature reviews. So they want the capability, they just do not want the managed rollout.

Sarah: That is actually very useful intelligence. It means his resistance is not about the technology itself but about the process and the perceived loss of autonomy. We can work with that. I would like to schedule a one-on-one with him before we design the communication strategy. If the surgeons are not on board, the rest of the clinical staff will follow their lead in resisting.

Mark: I agree. I can introduce you. But let me warn you, he does not respond well to corporate presentations. You need to show him something practical in the first five minutes.

Sarah: Understood. I will prepare a live demonstration using a research summary use case with anonymised data. Now, let me ask about the ward secretaries. Petra de Vries came up in conversations with HR as an influential figure.

Mark: Petra has been here 18 years. She knows every process, every workaround, every shortcut. She is the person new ward secretaries go to, not their manager. If Petra embraces Copilot for the referral letter workflow, the other secretaries will follow.

Sarah: She sounds like a prime champion candidate. Now, on a different topic -- I want to assess your own sponsorship readiness. You have committed to being the project sponsor, which I appreciate. What does success look like to you personally?

Mark: For me, success means three things. First, that our staff stop using ChatGPT Free for patient data -- that is a ticking compliance bomb. Second, that people actually use Copilot regularly, I would say 80 percent of licensed staff within three months. And third, that we do this in a way that does not repeat the scheduling software disaster. I want people to look back on this and say, the hospital got it right this time.

Sarah: Those are clear and measurable. Last question for today. What are you personally willing to do visibly?

Mark: I will use Copilot myself. I will speak at the town hall. I will record a video if you need one. And I will have the difficult conversation with Dr. Hendriks myself if needed. I do not want to delegate sponsorship.

Sarah: Excellent. That level of commitment makes a significant difference. One more item -- while we are scoping, can you confirm the boundary on EMR integration? I noticed some informal requests from the clinical teams.

Mark: Actually yes. While we are doing this, can your team also look at integrating the AI directly into our custom Electronic Medical Record software? The doctors want a Summarise button inside the patient file. They want it immediately.

Sarah: That is an interesting requirement, Mark. However, custom API development and EMR integration are currently outside the scope of this Statement of Work. Our focus is on the Microsoft 365 environment and Purview security configuration. I will note it as a future Phase 2 requirement, but for now, we need to focus on getting the M365 implementation right. I have actually recorded this as a client agreement to make it visible.

Mark: Fair enough. Let us stick to the plan for the surgeons first.""",
        "source_filename": "Stakeholder_Diagnosis_Meeting.txt",
        "context": "Plan I Diagnosis - Stakeholder mapping and sponsorship assessment",
        "processed": False,
        "summary": "",
        "activity_id": "",
        "created_at": "2026-03-10T09:00:00.000Z"
    },
    {
        "id": "TR_demo_2",
        "date": "2026-03-17",
        "participants": "Sarah (ACM Consultant, Vitalis), Dr. Mark van der Berg (Project Sponsor, CuraNova)",
        "meeting_type": "external",
        "transcript_note": """TRANSCRIPT: RISK PROFILE & CHANGE HISTORY ASSESSMENT
Date: March 17, 2026
Location: CuraNova main building, Eindhoven
Participants: Sarah (ACM Consultant, Vitalis), Dr. Mark van der Berg (Medical Director & Project Sponsor, CuraNova)

Sarah: Mark, thanks for making time again. Today I want to focus on the resistance risk profile. I have been analysing the data from last week's stakeholder interviews and I want to discuss the change history findings. Looking at your organisation's track record, the failed implementation of the new scheduling software two years ago is clearly still a major pain point across the organisation.

Mark: That was a disaster. It added three steps to every nurse's workflow. Nobody was consulted beforehand. The training was two hours after the thing was already live. Nurses were furious. We had to roll it back after four months.

Sarah: That is exactly the pattern I am seeing in the interview data. The biggest adoption risk for our Copilot deployment is not the technology itself -- it is the perception that this is just another IT project that makes people's lives harder. The phrase I heard most frequently in interviews was, here we go again.

Mark: How do we counter that?

Sarah: Two strategies. First, we need to explicitly acknowledge the scheduling failure in our communications. Not gloss over it, but say directly: we know the scheduling system was frustrating, this time we measured the actual time savings before recommending the change. Second, we need to show immediate Time-Back wins. I have been mapping the workflows with the ward secretaries, and I can already see that referral letter generation with Copilot will save approximately 30 minutes per day. That is a concrete, demonstrable benefit we can show before the broader rollout.

Mark: That 30-minute figure would resonate. The ward secretaries are drowning in referral letters.

Sarah: Exactly. Now, the second major risk cluster is the shadow AI situation. Approximately 40 percent of clinical staff are using ChatGPT Free at least weekly, based on the survey results. The risk here is twofold: there is the obvious compliance risk with patient data, but there is also an adoption risk. People who are currently using ChatGPT Free may perceive the governed Copilot as inferior because it has restrictions.

Mark: I had not thought about it that way. They might see the security labels and the monitoring as, what, a downgrade?

Sarah: Precisely. So our messaging needs to frame the governance not as restriction but as protection. Not we are taking away your ChatGPT, but we are giving you a tool that does what ChatGPT does but keeps your patients' data safe and keeps you out of regulatory trouble.

Mark: That framing makes sense for most staff. But for the surgeons it needs to be even more direct. They will not respond to compliance arguments. They need to see that Copilot is genuinely better for their specific use cases.

Sarah: Agreed. That ties into the targeted demonstration I am preparing for Dr. Hendriks. Now, one more thing I want to flag. The risk of change fatigue is moderate. Your organisation has been through a lot in three years -- the EMR upgrade, the scheduling failure, COVID-driven Teams adoption, and various regulatory changes. However, I see an opportunity: the shadow AI usage itself proves that your staff are open to AI adoption. They are already doing it, just unsafely. We should frame Copilot as making what you already do safer, not as yet another new thing.

Mark: That is a much better narrative. Staff are already AI users, we are just making it secure. I like that.

Sarah: Now, I also want to mention -- you raised an idea last week about organising evening sessions for employees' families to educate them about AI. I have thought about it, and while the intention is excellent, family-oriented workshops fall outside the scope of this professional ACM engagement. Our 12-week allocation and the EUR 68,500 budget are strictly for clinical and administrative staff. We need to keep our resources focused on the NEN 7510 compliance training and the champion network.

Mark: You are right. Let us keep it professional. What about extending the programme to our three partner clinics? They have about 400 additional staff who could benefit.

Sarah: That would be a separate engagement with its own scoping and budgeting. I can note it as a potential follow-on project. For now, our focus must remain on CuraNova's 800 staff across your three locations.

Mark: Understood. What are the next steps?

Sarah: I am interviewing the ward secretaries from the Eindhoven location tomorrow to complete the Time-Back analysis. Then I will be consolidating everything into the Change Strategy Document by end of next week. You will get the draft for review.

Mark: Perfect. And Sarah, I appreciate that you are being direct about scope boundaries. The last consulting firm we worked with said yes to everything and then could not deliver.""",
        "source_filename": "Risk_Profile_Change_History.txt",
        "context": "Plan I Diagnosis - Resistance risk profile and change history analysis",
        "processed": False,
        "summary": "",
        "activity_id": "",
        "created_at": "2026-03-17T09:00:00.000Z"
    },
    {
        "id": "TR_demo_3",
        "date": "2026-03-21",
        "participants": "Sarah (ACM Consultant, Vitalis) - internal notes",
        "meeting_type": "internal",
        "transcript_note": """INTERNAL CONSULTANT NOTES: DIAGNOSIS SYNTHESIS & STRATEGY PLANNING
Date: March 21, 2026
Author: Sarah (ACM Consultant, Vitalis Digital Solutions)
Project: CuraNova Healthcare Group - Secure Care Innovation

--- DIAGNOSIS SYNTHESIS ---

After two weeks of stakeholder interviews and data collection, I am consolidating my findings before drafting the Change Strategy Document.

SPONSORSHIP ASSESSMENT:
Dr. Mark van der Berg scores 9 out of 10 on sponsor readiness. He is personally committed, willing to be visible, and has budget authority. His one weakness is that he sometimes overreaches on scope -- he has already requested EMR integration, family AI sessions, and partner clinic extension, all of which are out of scope. I need to keep managing expectations firmly but diplomatically. He responds well to direct communication.

STAKEHOLDER RISK MATRIX:
High Risk, High Impact: Surgical department, led by Dr. Hendriks. They are the heaviest shadow AI users but most resistant to managed rollouts. The one-on-one demonstration approach is critical. I have prepared a research summary use case using anonymised orthopaedic data. If I can show Dr. Hendriks a 15-minute time saving in his first interaction, I believe I can shift him from sceptical to cautiously supportive.

High Risk, Medium Impact: Senior nursing staff aged 50 and over. Competence anxiety is the primary barrier. They are worried about looking incompetent in front of younger colleagues. The champion model with peer coaching is the right intervention here. Head Nurse van Dijk is key -- she is 52 herself and digitally competent. If she models successful adoption, it normalises it for her peers.

Medium Risk, High Impact: Ward secretaries. Their workflows will change the most, but they are also likely to see the biggest time savings. Petra de Vries is the linchpin. I plan to recruit her as a champion and involve her in the referral letter workflow design so she has ownership.

Low Risk, High Volume: Back-office staff. Generally digitally literate, positive about AI tools, and have the most straightforward use cases. They can serve as early success stories.

SCAR TISSUE ASSESSMENT:
The scheduling software failure is the dominant narrative. In 14 out of 18 interviews, it was mentioned unprompted. Key lessons for our approach:
1. We must explicitly acknowledge it -- pretending it did not happen will destroy credibility
2. We must show evidence before asking for trust (the Time-Back analysis)
3. We must involve end users in the design (champion network, pilot feedback loops)
4. We must deliver on promises -- no over-promising

SHADOW AI DATA:
Based on survey data and IT Security logs from Defender, approximately 40 percent of clinical staff use ChatGPT Free at least once per week. The most common use cases are patient report summarisation, referral letter drafting, and clinical guideline queries. This is both a risk (GDPR/NEN 7510 violation) and an opportunity (proven demand for AI assistance). Our messaging must frame Copilot as the safe version of what you are already doing.

CHAMPION NETWORK PLANNING:
I have identified 15 strong candidates across departments. Key selections:
- Nursing: Head Nurse van Dijk (Ward 3), Charge Nurse Amin (Ward 7), plus 3 others across locations
- Surgery: Dr. Janssen (junior surgeon, tech-enthusiastic -- important to have surgical representation)
- Ward secretaries: Petra de Vries plus 2 others
- Back-office: Lisa from Finance (Excel power user), plus 1 other
- Management: 2 charge nurses who are supportive and digitally competent

NEXT STEPS:
1. Complete Change Strategy Document draft by March 28
2. Schedule Dr. Hendriks demonstration for week of March 31
3. Formal champion recruitment conversations starting March 24
4. Begin communication message architecture design
5. Confirm training room availability and workshop scheduling with CuraNova facilities""",
        "source_filename": "Internal_Diagnosis_Synthesis.txt",
        "context": "Internal diagnosis synthesis and planning notes - preparing for Plan II",
        "processed": False,
        "summary": "",
        "activity_id": "",
        "created_at": "2026-03-21T14:00:00.000Z"
    }
]

# ---------------------------------------------------------------------------
# 9. Assemble and write output
# ---------------------------------------------------------------------------

output = {
    "activities": data["activities"],
    "todos": data["todos"],
    "questions": data["questions"],
    "agreements": data["agreements"],
    "config": config,
    "sow": sow,
    "transcripts": transcripts
}

with open("dummy-data.json", "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

# ---------------------------------------------------------------------------
# 10. Validation and summary
# ---------------------------------------------------------------------------

# Count stats
completed_activities = sum(1 for a in output["activities"] if a["status"] == "completed")
in_progress_activities = sum(1 for a in output["activities"] if a["status"] == "in_progress")
not_started_activities = sum(1 for a in output["activities"] if a["status"] == "not_started")
todos_done = sum(1 for t in output["todos"] if t["is_done"])
todos_total = len(output["todos"])
questions_answered = sum(1 for q in output["questions"] if q["is_answered"])
questions_total = len(output["questions"])

print("=" * 60)
print("dummy-data.json generated successfully!")
print("=" * 60)
print(f"Activities:  {len(output['activities'])} total")
print(f"  - Completed:    {completed_activities}")
print(f"  - In Progress:  {in_progress_activities}")
print(f"  - Not Started:  {not_started_activities}")
print(f"Todos:       {todos_total} total, {todos_done} done ({100*todos_done/todos_total:.0f}%)")
print(f"Questions:   {questions_total} total, {questions_answered} answered ({100*questions_answered/questions_total:.0f}%)")
print(f"Agreements:  {len(output['agreements'])} (6 filled defaults + 3 out-of-scope)")
print(f"Transcripts: {len(output['transcripts'])}")
print(f"SOW:         included")
print(f"Config:      included")
