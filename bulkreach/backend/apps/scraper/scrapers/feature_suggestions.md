# 🚀 BulkReach — Feature Suggestions

BulkReach is a cold job-application outreach platform with: **Gmail integration**, **AI resume tailoring**, **email campaigns**, **job scraper**, **company research**, and **email templates**.

---

## 🔥 High-Impact / Core Features

### 1. 📊 Campaign Analytics Dashboard
**What's missing**: The `opened_count` field exists on `Campaign` but there's no dedicated analytics page.
- Open rate, reply rate, bounce rate per campaign over time
- Line/bar charts per day using the existing Recharts library
- Heatmap: best time of day / day of week to send (inferred from open timestamps)
- Compare two campaigns side-by-side

---

### 2. ✉️ Follow-Up Sequences (Drip Campaigns)
**Currently**: Campaigns send once. There's no concept of follow-up threads.
- Schedule automated follow-up emails (e.g., "If no reply in 3 days → send follow-up")
- Multiple steps in a sequence with configurable delays
- Stop sequence if a reply is detected (via Gmail API)
- Backend model: `CampaignSequenceStep`

---

### 3. 🤖 AI Cover Letter Generator
**Currently**: Resumes can be AI-tailored; cover letters don't exist.
- Generate a tailored cover letter from a resume + job description
- Multiple tone options: professional, casual, enthusiastic
- Download as DOCX / copy as plain text
- Save multiple cover letters per resume

---

### 4. 📅 Scheduled Campaign Sending
**Currently**: Campaigns start immediately when launched.
- Pick a future date/time to send a campaign
- Timezone support (user sets preferred timezone in Settings)
- Pause and reschedule from Campaign Detail page
- Backend: Celery ETA-based scheduling

---

### 5. 🔔 Real-Time Notifications
**Currently**: No in-app or push notifications.
- In-app notification bell (top bar)
- Notify on: campaign completed, email opened, resume parsed, scrape finished
- Email digest: daily summary of campaign performance
- WebSocket or SSE-based live updates

---

## 🧠 AI / Smart Features

### 6. 🎯 AI Job Match Score
**Currently**: Job Scraper shows jobs but doesn't rank them.
- Score each scraped job 0–100 based on how well the user's active resume fits
- Show match percentage badge on each job card
- Auto-suggest which resume to use for a given role

---

### 7. ✍️ AI Email Subject Line Optimizer
**Currently**: Subject is typed manually.
- Suggest 3–5 subject line variants for a given campaign
- Grade subject lines on: open-rate potential, spam score, length
- A/B test support: send 50% with subject A, 50% with subject B

---

### 8. 🏢 AI Company Fit Analyzer (extend Company Research)
**Currently**: Company Research shows basic info.
- "Would I be a good fit?" analysis using resume + company info
- Suggests which of the user's skills align with company tech stack
- Highlights skill gaps with learning resource suggestions

---

### 9. 📝 AI Bullet Point Rewriter
**Currently**: Experience descriptions are edited manually.
- One-click rewrite experience bullets using action verbs + metrics language
- Tone selector: technical, leadership, startup, enterprise
- Diff view: before vs. after

---

## 📬 Outreach / Prospecting Features

### 10. 👤 Contacts / Leads Manager
**Currently**: Recipients are per-campaign spreadsheet rows with no persistent store.
- Persistent contacts database with tags, notes, status (Contacted / Replied / Rejected / Offer)
- Import from campaign recipients automatically
- Search, filter, and bulk-tag contacts
- Timeline: all emails sent to a contact across campaigns

---

### 11. 📎 LinkedIn Outreach Integration
**Currently**: Only Gmail email campaigns.
- Generate LinkedIn connection request messages
- LinkedIn InMail message templates
- Copy-to-clipboard workflow optimized for LinkedIn pasting

---

### 12. 🗂️ Application Tracker (Kanban Board)
**Currently**: No way to track job application status.
- Kanban columns: Saved → Applied → Interview → Offer → Rejected
- Drag-and-drop cards
- Auto-move card to "Applied" when campaign sent to that company
- Attach notes, interview dates, contact names

---

## ⚙️ Platform / UX Features

### 13. 🔗 Google Sheets Two-Way Sync
**Currently**: `google_sheet_id` and `google_sheet_sync_enabled` exist but syncing seems one-directional.
- Pull recipient updates (new rows added to the sheet) back into the campaign
- Mark sent/failed status back in Google Sheets
- Auto-refresh sync every N minutes

---

### 14. 📤 Resume Export to DOCX / Google Docs
**Currently**: LaTeX and PDF export exist.
- Export structured resume data to a formatted `.docx` file (using python-docx)
- "Open in Google Docs" button using Drive API
- HTML resume preview as a shareable public link

---

### 15. 🧪 Email Preview & Spam Score Checker
**Currently**: Templates have a visual preview but no spam analysis.
- SpamAssassin-style scoring before sending
- Preview across simulated email clients (Gmail, Outlook, Apple Mail)
- Warnings: too many links, spam trigger words, missing unsubscribe

---

### 16. 👥 Team / Shared Workspace
**Currently**: Strictly single-user.
- Invite team members (e.g., recruitment agencies)
- Shared templates, campaigns, and contacts
- Role-based permissions: Owner / Editor / Viewer
- Activity log: who sent what, when

---

### 17. 📱 Mobile-Responsive Layout
**Currently**: Desktop-first sidebar layout.
- Collapsible mobile nav drawer
- Touch-friendly campaign card actions
- Simplified mobile resume editor

---

### 18. 🌑 Dark / Light Mode Toggle
**Currently**: Fixed rose-pine dark theme.
- System-preference aware theme toggle
- Persist in localStorage
- Smooth transition animation between modes

---

### 19. 🕵️ Recruiter & Hiring Manager Finder
**Currently**: Users must find and input contact emails manually.
- Automatically scan and suggest LinkedIn profiles and contact details for key hiring managers or recruiters at the target company during company research.
- Present their role description and brief profile insights to customize the outreach message.

---

### 20. 📬 Unified Inbox & Live Response Tracker
**Currently**: No in-app visibility into email replies.
- Fetch and display incoming replies on campaigns directly inside BulkReach using Gmail API webhooks or polling.
- Allow responding to email threads directly from the app interface, generating quick follow-ups with AI-powered draft suggestions.

---

### 21. 📄 Attachment View Tracking (Secure PDF Hub)
**Currently**: Resumes and cover letters are attached as static files.
- Enable uploading resumes, portfolios, and cover letters to a secure web link instead of attachments.
- Track when the recipient clicks, views, or scrolls through the document, providing instant alerts when someone reviews your profile.

---

### 22. 🛡️ Deliverability Guard & Smart Throttling
**Currently**: Campaigns dispatch emails rapidly.
- Automatically throttle campaign sending with randomized intervals (e.g., 30–90 seconds) to bypass Gmail spam detection blocks.
- Subject/Body content analysis to flag common spam filter keywords (e.g., excessive capitalization, spam triggers) before dispatching.

---

## 🏆 Quick Wins (Low Effort, High Value)

| Feature | Effort | Value |
|---|---|---|
| Resume completion % indicator | 🟢 Low | ⭐⭐⭐ |
| Campaign duplicate/clone | 🟢 Low | ⭐⭐⭐ |
| Template duplicate/clone | 🟢 Low | ⭐⭐⭐ |
| CSV export of campaign logs | 🟢 Low | ⭐⭐⭐ |
| "Send test email to myself" | 🟢 Low | ⭐⭐⭐⭐ |
| Onboarding checklist widget | 🟡 Medium | ⭐⭐⭐ |
| Bulk delete campaigns/resumes | 🟢 Low | ⭐⭐ |
| Campaign search & filter | 🟢 Low | ⭐⭐⭐ |
| Resume version history | 🟡 Medium | ⭐⭐⭐⭐ |
| Keyboard shortcuts | 🟡 Medium | ⭐⭐ |
| Quick filters for Campaign status (Draft / Running / Completed) | 🟢 Low | ⭐⭐⭐ |
| Export Resume as JSON (JSON Resume Schema format) | 🟢 Low | ⭐⭐⭐ |
| Custom tracking domains for link clicks | 🟡 Medium | ⭐⭐⭐⭐ |
