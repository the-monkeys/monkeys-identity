# 🚀 Pi-Prospector: Edge-Native AI Agent specification

## 1. Executive Summary
**Pi-Prospector** is a lightweight, edge-native AI agent designed to run on exceptionally simple hardware, such as a **Raspberry Pi 4 or 5**. It autonomously finds leads, extracts contact details, and executes cold outreach sequences. It supports dual use-cases: 
1. **B2B Product Sales:** Finding potential clients for a product.
2. **Career Growth:** Finding recruiters/hiring managers for job seekers.

---

## 2. Hardware constraints & Architectural Design

Because a Raspberry Pi has limited RAM (2GB - 8GB) and CPU power, we cannot run massive Large Language Models (LLMs) locally. Instead, the system uses a **Hybrid Edge-Cloud Architecture**:

*   **The Brain (Cloud):** The agent uses lightweight API calls to an external LLM (like OpenAI GPT-4o-mini, Anthropic Haiku, or Gemini 1.5 Flash) to understand text, evaluate leads, and write personalized DMs.
*   **The Muscle (Raspberry Pi):** The Pi acts as the orchestrator. It runs the user interface, the scraping engine, the task scheduler, and stores all user data locally to ensure absolute privacy.

### Core Tech Stack
*   **Backend / Scraper:** Python (FastAPI) or Node.js with `Playwright` / `Puppeteer` optimized for ARM architectures (running headlessly).
*   **Database:** `SQLite` (requires zero configuration, tiny footprint, perfect for Raspberry Pi).
*   **Local UI:** A lightweight web dashboard built with React or Vanilla JS, accessible via the local Wi-Fi network (e.g., `http://raspberrypi.local:3000`).

---

## 3. Core Features

### 🔐 User Login & Multi-Tenancy
*   **Access:** Users log into the local web dashboard.
*   **Profiles:** Users can set up multiple target profiles (e.g., one campaign for selling a SaaS product, another for job hunting).

### 💬 Conversational Onboarding
*   Instead of complex forms, the user simply "chats" with the agent. 
*   **User inputs:** *"I sell a CRM tool for small plumbing businesses in Texas."* or *"I am a Senior React Developer looking for remote startup jobs."*
*   **Agent action:** The LLM processes this into actionable target personas, ideal job titles, and geographic locations.

### 🕵️ Autopilot Lead Generation & Scraping
*   The agent autonomously launches background scraping jobs on the Raspberry Pi while the user sleeps.
*   It bypasses simple bot-protections by running actual browser instances, mimicking human scrolling and clicking behavior.

### 📬 Automated Cold Outreach Engine
*   Generates highly personalized connection requests or emails based on the target's specific bio or company news.
*   **Safety limits:** Pauses actions to avoid getting the user's accounts banned (e.g., sends max 20-30 DMs per day with randomized intervals).

---

## 4. How the Search Mechanism Works

The search logic is broken down into a multi-step pipeline executed locally:

1.  **Query Generation:** The LLM translates the user's simple description into advanced **Google Dorks** and **Boolean search queries**.
    *   *Example:* `site:linkedin.com/in/ "Plumbing Owner" "Texas" -intitle:"sales"`
2.  **Source Scraping:** The Pi uses a headless browser to search these queries.
3.  **Profile Evaluation:** It scrapes the bio of the discovered profiles and asks the LLM via API: *"Is this person a good target for our plumbing CRM?"*
4.  **Contact Extraction:** If approved, it searches for contact info using combination of page text scraping and lightweight email-guessing APIs (like Hunter.io or Apollo.io free tiers).
5.  **Engagement:** It logs into the user's social media/email account via the browser and dispatches the customized message.

---

## 5. Trusted Resources & Targets

Where does the agent look for these people?

### For Product Sales (B2B/B2C Leads)
*   **LinkedIn:** The primary source for professional B2B leads. (Searches via Google Dorks to avoid immediate LinkedIn account restrictions).
*   **Apollo.io / Hunter.io APIs:** Integrated strictly for enriching email addresses.
*   **Twitter / X:** Good for finding indie hackers, founders, or niche communities.
*   **Crunchbase / YCombinator Directories:** For finding startup founders and executives.

### For Job Seekers
*   **LinkedIn Jobs & People:** Searching for "Technical Recruiter", "Hiring Manager", or "Engineering Manager" actively posting about hiring.
*   **Wellfound (formerly AngelList):** Excellent for scraping fresh startup jobs.
*   **GitHub:** For developers, the agent can scrape active repositories of target companies to find CTOs or Engineering Leads to contact directly.

---

## 6. User Interface & Experience (UI/UX)

Since this runs on a Pi, the user will open their laptop browser, type in the IP address, and see a clean dashboard:

*   **Setup View:** Secure entry for LinkedIn session cookies, email SMTP credentials, and API keys.
*   **Agent Chat:** A chat window where the user types what they need.
*   **Kanban Pipeline Board:** A visual CRM showing the status of targets:
    *   *Column 1: Discovered (100+ profiles)*
    *   *Column 2: Qualified by AI (40 profiles)*
    *   *Column 3: Message Sent (15 profiles)*
    *   *Column 4: Replied (2 profiles)*
*   **Analytics:** Simple charts showing response rates and daily action limits (vital to avoid bans).

---

## 7. Major Challenges to Consider

*   **Account Bans:** Platforms like LinkedIn actively fight bots. The agent must use residential proxies (optional add-on), vast time delays (sleep for 10-45 minutes between actions), and use existing active session cookies.
*   **Memory Management:** Chrome/Puppeteer can crash a Raspberry Pi if too many tabs open. The agent must strictly operate one tab at a time and clear its cache constantly.
