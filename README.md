# 🧠 Collaborative Decision-Making

**Make better decisions together and see what actually works.**

A collaborative decision-making app that tracks **decisions, confidence, and accuracy over time**.  
Instead of just collecting opinions, it helps groups learn from outcomes.

Think: **a structured group chat for decisions**, powered by data (and AI).

---

## 🚩 The Problem

Group decisions usually fall apart because:

- The loudest voice wins  
- Confidence isn’t measured  
- Outcomes aren’t tracked  
- Accuracy is never evaluated  

Chats, polls, and spreadsheets record opinions, **not decision quality**.

---

## 🎯 The Solution

This app lets groups:

- Submit decisions with confidence scores  
- Track outcomes once results are known  
- See individual and group accuracy over time  
- Get optional AI feedback on group patterns  

The goal is **better judgment through feedback and accountability**, not replacing people.

---

## 👥 Who It’s For

Small groups (5–20 people) making repeat decisions:

- Student teams  
- Friend groups (sports, debates)  
- Clubs and organizations  
- Beginner finance or banking groups  

> Sports and banking are our test cases.

---

## ✨ Core Features

- Create or join decision groups  
- Submit decisions with confidence  
- Accuracy leaderboards (individual + group)  
- Decision history and outcome tracking  
- AI feedback on disagreement and overconfidence  
- Fully functional even without AI  

---

## 🏗️ Architecture

- **Frontend:** Next.js  
- **Backend:** FastAPI  
- **Database:** PostgreSQL  
- **AI Runtime:** Ollama (local)

### Data Flow

1. User submits a decision + confidence  
2. Backend validates and stores data  
3. AI analyzes group patterns (optional)  
4. Feedback is returned  
5. Outcomes are logged later for scoring  

---

## 🤖 AI Principles

- AI advises, it does not decide  
- AI never blocks decisions  
- The app works without AI  
- All feedback is explainable  

---

## 📈 Vision

Over time, the app reveals:

- Who is consistently accurate  
- When groups outperform individuals  
- How confidence matches reality  

**Smarter groups. Better decisions**
