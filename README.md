# ☁️ CloudGuard AI

Real-time cloud security and cost monitoring system powered by **Confluent Cloud Flink** and **Google Vertex AI**.

Built for the **Confluent + Google Cloud AI Challenge**.

---

## 🎯 Overview

CloudGuard AI provides intelligent, real-time detection of:
- 🚨 Security threats (crypto mining, breached credentials)
- 💰 Cost anomalies and budget alerts
- 🔓 Public exposure vulnerabilities
- 🔄 Infinite loops and performance issues
- 👨‍💻 Developer activity correlation

---

## 🏗️ Architecture
```
[GCP Event Simulator]
         ↓
[Confluent Cloud Kafka Topics]
         ↓
[Flink SQL Detection Queries] (7 queries)
         ↓
[Output Topics] → [Backend API]
                       ↓
                  [Vertex AI Analysis]
                       ↓
                  [WebSocket Server]
                       ↓
                  [React Dashboard]
```

---

## 🛠️ Tech Stack

- **Streaming:** Confluent Cloud Kafka + Flink SQL
- **AI/ML:** Google Vertex AI (Gemini 2.0 Flash)
- **Backend:** Node.js, Express, WebSocket
- **Frontend:** React (coming soon)
- **Cloud:** Google Cloud Platform

---

## 📊 Detection Queries

1. **Breach Detection** - Multi-region VM creation spikes
2. **Infinite Loop Detection** - Exponential function invocations
3. **Cost Spike Detection** - Unusual billing patterns
4. **Budget Monitoring** - Real-time cost rate tracking
5. **Public Exposure Detection** - IAM policy changes
6. **Unusual Activity Pattern** - Service usage anomalies
7. **Developer Activity Correlation** - Action tracking

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- Google Cloud account with Vertex AI enabled
- Confluent Cloud account
- `gcloud` CLI authenticated

### Installation

1. **Clone repository:**
```bash
   git clone <your-repo-url>
   cd cloudguard-ai
```

2. **Install simulator dependencies:**
```bash
   cd simulator
   npm install
```

3. **Install backend dependencies:**
```bash
   cd ../backend
   npm install
```

4. **Configure environment:**
```bash
   # Copy example env files
   cp .env.example .env
   # Edit .env with your credentials
```

5. **Run simulator:**
```bash
   cd simulator
   node index.js --scenario=all
```

6. **Run backend:**
```bash
   cd backend
   node server.js
```

---

## 📁 Project Structure
```
cloudguard-ai/
├── simulator/              # Event data generator
│   ├── index.js
│   └── package.json
├── backend/                # API + Kafka consumer + AI
│   ├── server.js
│   ├── kafka-consumer.js
│   ├── vertex-ai-analyzer.js
│   ├── context-aggregator.js
│   ├── websocket-server.js
│   └── package.json
├── dashboard/              # React frontend (coming soon)
├── flink-queries/          # SQL queries (documented)
├── .gitignore
└── README.md
```

---

## 🔑 Environment Variables

Required in `backend/.env`:
```env
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
CONFLUENT_BOOTSTRAP_SERVER=your-kafka-server
CONFLUENT_API_KEY=your-key
CONFLUENT_API_SECRET=your-secret
VERTEX_AI_MODEL=gemini-2.0-flash-exp
PORT=3001
```

---

## 🧪 Testing
```bash
# Health check
curl http://localhost:3001/health

# Dashboard summary
curl http://localhost:3001/api/dashboard-summary

# Recent threats
curl http://localhost:3001/api/recent-threats
```

---

## 📝 Status

- ✅ Simulator (5 threat scenarios)
- ✅ Kafka topics + Schema Registry
- ✅ 7 Flink SQL detection queries
- ✅ Backend API + Kafka consumer
- ✅ Vertex AI integration
- ✅ WebSocket server
- 🔄 React dashboard (in progress)
- ⏳ Deployment (pending)

---

## 👥 Team

Built by [Your Name] for the Confluent + Google Cloud AI Challenge

---

## 📄 License

MIT