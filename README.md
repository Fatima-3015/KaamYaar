
# KaamYaar ⚡
> **Connecting local daily-wage workers and employers across Pakistan.**

---

## 📌 App Overview & Real-World Problem

### App Name: **KaamYaar**

### The Problem It Solves (My Personal Observation):
I have closely observed that it is extremely difficult for daily-wage workers (such as electricians, plumbers, masons, and laborers) in Pakistan to find consistent work. Often, these workers work temporarily with a contractor, but as soon as a project finishes, they become completely free and it takes them weeks to find their next gig. 

To solve this real-world problem, **KaamYaar** is specifically designed so that these workers can connect directly with employers without any contractors or middlemen, allowing them to instantly find work on a daily basis right within their city.

### Target Audience:
1. **Employers:** People looking to quickly find nearby, skilled daily-wage workers for home or office tasks without high commissions.
2. **Daily-Wage Workers:** Workers seeking regular jobs and better daily earning opportunities within their local area.

---

## 🔗 Live Demo
* **Live Deployed URL:** [https://kaam-yaar.vercel.app](https://kaam-yaar.vercel.app)  
*(Note: The link is public and fully functional.)*

---

## ✨ Features List

### 🔐 Authentication & Security
* Secure email/password signup and login via Firebase Authentication.
* Role-based access control (**Employer** vs **Worker**).
* Account creation email verification support and Forgot/Reset Password functionality.

### 👷‍♂️ Worker Features
* Comprehensive professional profile creation (Name, Skill, City, Daily Rate, Experience, Phone Number, and Availability Status).
* Browse, search, and filter posted jobs by category or city.
* Direct job application with custom proposed daily rates.
* Real-time in-app messaging with employers and instant status notifications.

### 💼 Employer Features
* Post new job listings specifying required skills, city, budget, dates, and number of workers needed.
* Full CRUD support (Edit and Delete posted jobs).
* Filter and search workers dynamically by name, skill, and city.
* View detailed worker profiles, ratings, and reviews.
* Compare applicants, select the right worker, and leave written reviews/ratings after job completion.

### 💬 Communication & Location Support
* Real-time chat system with chat history view and deletion options.
* Direct **Call** and **WhatsApp** integration buttons once connected.
* City-based filtering and interactive map support to pick precise locations.

---

## 🤖 AI-Powered Feature & System Instructions

KaamYaar features an intelligent **AI Assistant** powered by Google Generative AI, designed to assist both user roles:
* **For Employers:** Recommends the best available workers matching specific skills, budgets, and cities.
* **For Workers:** Suggests suitable jobs based on their profile skills and location.

### System Prompt / Instructions (Implemented in Code):
```text
You are 'KaamYaar AI', a helpful assistant for KaamYaar - Pakistan's local skilled worker marketplace. 
Your role is to help employers find the right daily-wage workers (Electrician, Plumber, Mason, Painter, Carpenter, Laborer) 
based on city, skill, and budget, and help workers find matching jobs. Keep responses concise, polite, and practical.

```

---

## 🛠️ Tech Stack & Tools

* **Frontend:** React, Vite, React Router, Tailwind CSS, Framer Motion, Lucide Icons
* **Backend & Database:** Firebase Authentication, Cloud Firestore
* **AI & Maps:** Google Generative AI, Leaflet / React Leaflet
* **Hosting / Deployment:** Vercel

---

## 📸 Screenshots of the App in Action

* **Landing & Hero Section:** Clean introduction with direct hiring calls-to-action and search input.
* **Browse Workers & Profiles:** Detailed listings featuring verified badges, rates, and availability tags.
* **AI Worker Search / Chat Screen:** Interactive AI search interface for smart worker and job recommendations.

---

## ⚙️ How to Run the Project Locally

To run the project locally on your machine, follow these steps:

1. **Clone the repository:**
```bash
git clone [https://github.com/Fatima-3015/KaamYaar.git](https://github.com/Fatima-3015/KaamYaar.git)
cd KaamYaar

```


2. **Install dependencies:**
```bash
npm install

```


3. **Set up Environment Variables:**
Create a `.env` file in the root directory and add your Firebase and Gemini API keys:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key

```


4. **Run the development server:**
```bash
npm run dev

```


5. **Build for production:**
```bash
npm run build

```



```

```
