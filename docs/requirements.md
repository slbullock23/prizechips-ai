# 📋 The Requirements

This document outlines what the system must do, how it should feel to users, and the minimum AI expectations required for this product.

---

## 1. Functional Requirements (What It Does)

- Users can create an account and authenticate securely  
- Users can create or join a **decision group**  
- Users can submit:
  - A decision (prediction, choice, or recommendation)
  - A confidence score (percentage-based)
- Users can post, edit, archive, or delete their own decisions  
- Users can comment on decisions made by others in the group  
- The system records outcomes once results are known  
- The system stores:
  - Users
  - Groups
  - Decisions
  - Confidence scores
  - Outcomes
  - Comments
- A leaderboard displays:
  - Individual accuracy
  - Group accuracy
  - Historical performance trends
- Users can view past decisions and compare:
  - Initial confidence
  - Final outcome
  - AI feedback (if available)

---

## 2. Non-Functional Requirements (How It Feels)

### Fast
- Decision submissions and feedback appear in **under 1 second**  
- Returning users can submit and comment on decisions in **under 1 minute**

### Fair
- Decisions and confidence scores **cannot be edited after submission**  
- Outcomes are recorded transparently and immutably  

### Secure
- Each profile requires password-based authentication  
- Passwords must be hashed using **bcrypt**  
- Unauthorized users are denied access to profiles and decision data  

### Simple
- No complex setup or onboarding  
- Feels like a **group chat with structure**  
- Confidence scoring is intuitive and percentage-based  

### Responsive
- Adapts to varying screen sizes on **Android and iOS**  
- Usable on small and large devices  

---

## 3. AI-Specific Requirements

- The system provides an **AI assistant** to support decision-making  
- AI capabilities include:
  - Analyzing group confidence distributions  
  - Detecting risk, disagreement, or overconfidence  
  - Providing plain-language feedback  
- AI **enhances decisions but never blocks them**  
- The system functions fully **without AI**
  - Decisions are still logged  
  - Outcomes are still scored  
  - Leaderboards still update  
- If AI is unavailable:
  - The app continues normal operation  
  - Users are notified that AI feedback is temporarily unavailable  
- AI responses must be:
  - Explainable  
  - Non-technical  
  - Actionable  
---

## 4. User Stories

### Administrator / Developer

**As an administrator or developer**,  
I want to see all registered users   so that I can track platform usage and growth.

**Acceptance Criteria**
- Admin can view every registered user  
- Admin can see total user count  
- Admin can view high-level usage metrics  

---

### Offline Access

**As a user**,  
I want to submit decisions without an internet connection so that I can use the app anywhere.

**Acceptance Criteria**
- Users can submit decisions offline  
- Decisions are queued locally  
- Decisions sync automatically once reconnected  

---

### Team Management

**As a team leader**,  
I want to manage my decision group so that I can control participation.

**Acceptance Criteria**
- Users can view:
  - Number of group members  
  - Member names  
  - Decisions made by each member  
- Users can add members  
- Users can remove members  

---

### Confidence Scoring

**As a user**,  
I want to enter a confidence score for my decision so that accuracy can be measured over time.

**Acceptance Criteria**
- Confidence scores are entered as percentages  
- Confidence scores are locked after submission  
- AI uses confidence scores when analyzing decisions  

---

### Leaderboard & Accuracy Tracking

**As a competitive group member**,  
I want to see a leaderboard  
so that I can evaluate my decision accuracy.

**Acceptance Criteria**
- Leaderboards show individual and group accuracy  
- Users can compare:
  - Confidence scores  
  - AI-generated evaluations  
- Users must be within **10% of AI evaluation** to improve ranking  
- Consistently low-ranked users receive in-app warnings  

---

### Terms and Conditions

**As a user**,  
I want to read and accept the terms and conditions  
so that I understand the rules and risks.

**Acceptance Criteria**
- Users can read or listen to the terms  
- Users must scroll through all content before accepting  
- Acceptance is required before accessing core features  
