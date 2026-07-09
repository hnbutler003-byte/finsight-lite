# FinSight Lite Teacher Guide

This guide covers the Teacher Portal and the Org Admin Portal. All details are drawn from the live application.

---

## 1. Teacher Portal

### 1.1 Logging In

Go to `/teacher/login`. Enter the email address and password that your school administrator or Org Admin registered for you. Passwords are stored with bcrypt hashing. If you forget your password, contact your Org Admin.

### 1.2 Teacher Dashboard

After login you land at `/teacher/dashboard`. The page shows:

- Your name and school name in the header.
- A getting-started checklist with four steps: create your teacher account (already complete on first login), create a class, add students, and post a challenge or quiz. The checklist disappears automatically once all four items are complete. A "Need help?" link at the bottom of the checklist leads directly to the Help Center.
- Up to two of your most recent classes, each showing the class name, subject, and current enrollment count.
- A "Create Class" button in the top-right corner.

Visit `/teacher/classes` to see every class you have created.

A **Help Center** is available at `/teacher/help` (also reachable via the "Help" link in the sidebar). It contains this full guide rendered in-app.

### 1.3 Creating a Class

Click "Create Class" on the dashboard or the classes page. Fill in three fields:

| Field | Required | Notes |
|---|---|---|
| Class Name | Yes | Example: Grade 7 Financial Literacy |
| Subject | No | Defaults to "Financial Literacy" |
| Sponsor | No | Optional sponsor name, e.g. "Commonwealth Bank" |

When you save, the system generates a unique six-character join code. Share this code with students so they can enroll.

### 1.4 Class Detail Page

Click any class card to open the class detail page at `/teacher/classes/:id`. The page header shows the class name, subject, and the join code in a copyable pill. There is also a "Download Report" button that exports a CSV with every student's name, username, XP, level, streak, lessons completed, games played, average score, and badge count.

The page has six tabs: Students, Leaderboard, Challenges, Notifications, Analytics, and Lessons.

#### Students Tab

Lists every enrolled student as a row with these columns:

- Name and avatar emoji
- XP, average quiz score, streak (days), and badges (visible on wider screens)
- Games played and lessons completed

Click any student row to open a detail dialog showing their XP, average score, games played, and badge count, plus a free-text feedback field where you can type a personal message that gets saved to the platform.

To remove a student from the class, click the remove button on their row (the icon appears on hover). This only removes enrollment; the student account is not deleted.

#### Leaderboard Tab

Shows the top ten students in the class ranked by total XP, with gold/silver/bronze medals for ranks 1, 2, and 3. XP totals update in real time as students complete activities.

#### Challenges Tab

Challenges appear to students in their dashboard as goals to work toward. Click "New Challenge" to open the creation form:

| Field | Required | Notes |
|---|---|---|
| Title | Yes | Short goal name |
| Description | Yes | Explain what students should do |
| Type | Yes | Quiz, Savings, Investment, or Budget |
| Target value | No | Numeric goal, e.g. 1000 for a savings target |
| Start date | No | When the challenge becomes visible |
| End date | No | When the challenge closes |

Active challenges show a green badge. Past challenges show a grey badge. There is no limit on how many challenges you can create.

#### Notifications Tab

Send a one-way message to the class. Three types are available:

- **Announcement** (blue): general information.
- **Reminder** (amber): upcoming deadlines or tasks.
- **Congratulations** (green): celebrating student achievement.

Each message has a title and a body. Messages are stored and visible to students in their notification feed.

#### Analytics Tab

The analytics tab now includes action buttons, insight cards, class summary stats, and investment analytics.

**Action buttons** (top right of the analytics tab):

- **Impact Summary PDF** - Generates a downloadable one-page PDF showing the class's learning outcomes across the semester: total students, lessons completed, average quiz score, total simulated trades, most and least completed module, and the top student by XP. Use this for reporting to school leadership or sponsors.
- **Generate Certificates (N)** - Generates a personalised PDF certificate for every student in the class and bundles all certificates into a single ZIP file for download. Each certificate shows the student's name, class, teacher, total XP earned, lessons completed, trades made, and average quiz score. The number in brackets is the count of students who will receive a certificate.

**Insight cards** (three cards below the action buttons):

| Card | What it shows |
|---|---|
| Falling Behind | Students who have completed at least one lesson but have not been active in 7 or more days. Expand the card to see the student names. |
| Needs Attention | The learning module with the lowest completion rate across the class. Use this to decide which topic to revisit or spend more time on. |
| Quiet Streaks | Students who previously had a streak of 3 or more days but whose streak has since lapsed and have not been active in 5 or more days. These students were engaged but have dropped off. |

**Class summary stats** (four cards below the insight cards):

| Stat | What it measures |
|---|---|
| Avg Score | Average quiz score across all students in percent |
| Avg Lessons Done | Average number of learning modules completed out of 6 |
| Engagement Rate | Percentage of students who have played at least one game |
| Total Games | Total game sessions played by the whole class |

Below the summary cards, the top three students by XP are shown with their name, level, XP total, and badge count.

**Investment Simulator Analytics** (shown when at least one student is enrolled):

| Stat | What it measures |
|---|---|
| Students Invested | How many students have bought at least one stock or bond |
| Avg Stocks Held | Average number of distinct holdings per invested student |
| Well Diversified (3+) | Number of students holding three or more different instruments |
| Most Active Trader | Student with the highest total trade count |

Below those cards is a student table showing each student's net worth (virtual balance + portfolio value), gain or loss since starting with the default $10,000, gain or loss as a percentage, and total number of trades. Students who have not traded yet are included with their starting balance of 10,000.

#### Lessons Tab

The Lessons tab appears when your class is linked to a school organisation. It has two sections: My Class Lessons and Org Lesson Plans.

**My Class Lessons** lets you create your own lessons and quizzes for this class. Click "Create Lesson" to open a three-step wizard:

1. **Lesson details**: title (required), instructor, grade level, subject, duration, topic, an optional YouTube video link, and learning objectives (one per line).
2. **Content sections**: add one or more sections, each with a heading, an explanation, and optional comma-separated examples.
3. **Quiz questions (optional)**: add multiple-choice questions with four options and mark the correct answer by clicking the letter. You can skip this step and the lesson still saves.

New lessons are saved as **drafts**. Students cannot see a lesson until you click **Publish** on its card. You can Unpublish a lesson at any time to hide it again, or delete it with the trash button (this cannot be undone).

**Scope**: lessons you create here are visible only to students enrolled in this class. They never appear for other classes, other teachers, the wider school environment, or in the Org Admin's lesson list. Published class lessons show up for your students in their Lessons area alongside org lessons, and completing the quiz earns them XP the same way.

**Org Lesson Plans** displays lesson plans that your school's Org Admin has published and assigned to the environment your class belongs to. Each lesson card shows the title, subject, instructor, grade, duration, and counts of objectives and sections. You can preview these but cannot edit or delete them. Org lesson management belongs to the Org Admin.

---

## 2. Org Admin Portal

Org Admins manage the school's overall FinSight Lite environment. Login is at `/org/login`.

### 2.1 Dashboard (`/org/dashboard`)

The dashboard provides a whole-organisation overview:

- **Summary stats**: total students, teachers, active classes, and total XP generated across the org.
- **Student join code**: the org-level code students use to join the organisation. A copy button is next to the code.
- **Getting started checklist**: four onboarding steps: create your admin account (already complete), enrol at least one student, publish your first lesson, and set up your branding. A "Need help?" link leads to the Org Admin Help Center.
- **AI summary card** (when available): a monthly plain-language summary generated by the platform.
- **AI Usage Today**: shows how many AI tokens (Money Guide and AI Insights) have been used today versus the org's daily limit for each service.
- **Email deliverability stats**: sent, opened, bounced, and failed counts for emails dispatched by the platform.
- **Top Money Games by session**: a bar-chart breakdown of which games students played most.
- **All Students table**: lists every student with their display name, join date, total XP, and lessons completed. Supports searching by name.
- **Organisation details**: the org name, plan, and environment information.

### 2.2 Students (`/org/students`)

A full list of every student enrolled in the organisation. Each row shows the student's avatar, name, level badge, XP, streak, join date, and which environment they belong to. Use the search box at the top to filter by name.

### 2.3 Teachers (`/org/teachers`)

Lists all teachers registered under the organisation with their name, email, school name, and a count of active classes. Org Admins can invite new teachers from this page by entering their first name, last name, email, password, and school name. Teachers receive login credentials to use the Teacher Portal.

### 2.4 Lessons (`/org/lessons`)

Org Admins create and manage lesson plans that appear in the Teacher Portal's Lessons tab. Each lesson has:

- Title
- Short description
- Video URL (optional, embedded from YouTube)
- Written content
- Published or draft status

A published lesson is visible to all teachers and students in the organisation's environment. Draft lessons are only visible to Org Admins. A preview button shows exactly how the lesson will look to a student before publishing.

Note: some of FinSight's built-in core lessons include embedded visual diagrams (for example, a step-by-step account opening flow). These diagrams are part of the built-in content only. They cannot be added to org lesson plans, and the lesson preview does not render them.

### 2.5 Branding (`/org/branding`)

Upload the organisation's logo. The logo is stored in cloud object storage and displayed in the app header and on student dashboards associated with this organisation. Supported formats are PNG and JPG. The legacy upload path (`/uploads/logos/*`) redirects automatically to the new object storage URL.

---

## 3. Student-Facing Features Reference

Teachers and Org Admins are sometimes asked about what students can do. Here is a summary.

### 3.1 Joining

Students go to the app's login page and choose "Student Sign-In". They enter the class join code or org join code, then pick an avatar and a display name. No password is required.

### 3.2 Dashboard

The student dashboard shows the virtual account balance, a quick XP summary, recent transactions, and shortcuts to all features.

### 3.3 Investment Simulator

Students access the simulator at `/invest`. The currency selector controls which market they view. Supported currencies and their real-world stock exchanges are:

| Currency code | Country / region | Exchange shown |
|---|---|---|
| BSD | The Bahamas | BISX (Bahamas International Securities Exchange) |
| JMD | Jamaica | JSE (Jamaica Stock Exchange) |
| BBD | Barbados | n/a (simulated only) |
| TTD | Trinidad and Tobago | n/a (simulated only) |
| XCD | Eastern Caribbean | n/a (simulated only) |
| GYD | Guyana | n/a (simulated only) |

For BSD and JMD, a real-price ticker widget is shown above the simulated market so students can compare simulated prices with actual end-of-day exchange prices.

Each student starts with a virtual balance of 10,000 in their chosen currency. They can buy and sell stocks and bonds. When they open the buy dialog, an AI explanation (powered by Claude) appears if the stock price changed that day, explaining in plain language why a stock of that type might move up or down. A "Did you know?" fact card is also shown for most tickers, giving Caribbean-specific context about the company or instrument.

The three market tabs are Learn, Market, and Portfolio. The Learn tab contains structured investment modules. The Market tab shows all available stocks and bonds. The Portfolio tab shows current holdings, gain/loss, and a trade history.

### 3.4 Leaderboard

A platform-wide leaderboard at `/leaderboard`, ranking students by total score earned across lessons, quizzes, and Money Games. Includes an all-time and a weekly view.

### 3.5 Money Guide AI

A conversational chatbot at `/guide` that answers questions about money, saving, and investing, and also explains specific lesson topics in depth (a student lands here automatically, with the topic pre-filled, after scoring low on a lesson quiz). Responses are guided toward Caribbean-relevant financial literacy topics and powered by Claude. This feature counts against the org's daily AI quota.

### 3.6 Money Games

Interactive financial literacy games accessible at `/games`. Sessions are tracked and feed into the teacher analytics Engagement Rate metric.

### 3.7 Learning Modules

Located within the Investment Simulator's Learn tab. Six structured lessons covering topics like budgeting, saving, stocks, bonds, risk, and portfolios. Completion is tracked per student and reflected in the Analytics tab.

### 3.8 Lessons Area

Students access core lessons at `/lessons`. This area contains FinSight's built-in learning modules (Budgeting Basics, Saving Smart, Investing Fundamentals, Investing Fundamentals II, the Real Life Ready module, plus regional modules such as The Sand Dollar for Bahamian students) alongside any lessons published by teachers and Org Admins. Each lesson has learning objectives, reading sections, and a quiz that earns XP.

The Investing Fundamentals II module (subtitle "Go Deeper") builds on the first investing module with four lessons: growth versus dividend stocks, diversification and building a portfolio, index funds versus individual stocks, and reading what a stock price move actually means. The module appears for every territory, and its content adapts to the student's territory: stock exchange references (BISX, JSE, BSE, TTSE, ECSE) and the diversification examples match the environment's currency, while other territories see generic phrasing.

The Real Life Ready module covers practical banking skills, and its lessons are territory-specific: students see the lessons written for their environment's territory. Bahamas students see opening a bank account in the Bahamas, understanding a payslip and NIB contributions, and educational investment accounts (CFAL and RF). Jamaica students see opening a bank account in Jamaica (including the TRN requirement) and understanding JAM-DEX, Jamaica's digital dollar. Trinidad and Tobago students see opening a bank account in Trinidad and Tobago (including credit unions) and Know Your Money, a lesson on checking that T&T banknotes are genuine. The avoiding scams and fraud lesson is shared and appears for every territory. Some built-in lessons include embedded visual diagrams (for example, a chequing versus savings comparison, a step-by-step account opening flow, and a payslip breakdown) that animate into view as the student scrolls through the lesson.

---

## 4. Common Admin Questions

**A student cannot join the class.**
Check that the student is typing the join code exactly as it appears (codes are case-sensitive). Verify the code on the class detail page using the copy button.

**A teacher cannot log in.**
Confirm the email and password were set correctly in the Teachers page. Passwords can be reset by an Org Admin by removing and re-inviting the teacher.

**AI features are slow or not responding.**
The platform has a daily AI quota per organisation. Check the AI Usage cards on the Org Dashboard to see if the daily limit has been reached. Limits reset at midnight UTC.

**Students are not showing in the analytics.**
Analytics are calculated on demand from the database. If a student just enrolled and has not completed any activity, they appear in the student list but some analytics columns will show zero.

**A lesson is not visible to students.**
Only published lessons assigned to the correct environment are visible. Check the lesson's published status and confirm the class is linked to the right environment on the class detail page.
