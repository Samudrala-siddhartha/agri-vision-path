🌱 AgriPulse

Scan your crop. Get treatment in seconds.

AgriPulse is a mobile-first AI-powered web app that helps farmers detect crop diseases, plan better crops, and make fast, data-driven decisions using images, soil inputs, and real-time conditions.

🚀 Features
📸 Crop Disease Detection
Snap a photo → get instant diagnosis
AI-powered detection (multimodal)
Confidence score + severity level
Visual highlighting of infected areas
🧪 Actionable Treatment Plans
Chemical recommendations (dosage included)
Organic alternatives
Clear warnings (what NOT to do)
🌾 Crop Planning (Smart Recommendations)
Based on:
Soil inputs (NPK, pH, etc.)
Weather conditions
Crop history
Outputs:
Top 3 recommended crops
Suitability score
Risk level
Profit estimate
Water & fertilizer guidance
🗂️ My Farm Timeline
Track every scan over time
Vertical history view
Detect trends (improving / worsening)
🔔 Smart Alerts
Disease risk warnings
Weather-based notifications
🧮 Spray Calculator
Enter land size → get exact chemical quantity
🤖 AI Assistant (Controlled Chatbot)
Helps navigate the app
Explains results
Triggers features (not free-form AI)
🎫 Ticket System (Feedback Loop)
Report wrong diagnosis or bugs
Chat-style support threads
Email notifications + unread badges
📢 Admin Announcements
In-app popup notifications
Internal navigation (no external redirects)
Used for alerts, schemes, updates
📶 Offline Support
Capture scans without internet
Auto-sync when back online
🎨 UI/UX Highlights
Mobile-first design
Large, thumb-friendly buttons
Visual-first (icons > text)
Fast, clean, minimal interface
Subtle animations (no heavy 3D)
Built for low-end devices
⚙️ Tech Stack

Frontend

React + Tailwind CSS

Backend

Firebase / Supabase

AI

Gemini (Pro + Flash)

Data

Crop dataset (CSV → k-NN engine)

Other

Weather API (auto-fetch)
Local storage (offline queue)
🧠 System Architecture
Crop Recommendation Engine
k-NN algorithm for ranking crops
Deterministic outputs
AI used only for explanation (not decision-making)
AI Design Principles
No hallucination allowed
Responses grounded in:
App data
Verified datasets
Fallback: “Not enough data”
🚫 Not Included (Yet)

These are intentionally deferred:

Video-based diagnosis
Soil PDF OCR parsing
Disease heatmaps

Focus is on:
👉 Speed, reliability, and usability

📊 Performance Goals
Diagnosis in < 30 seconds
Dashboard load < 2 seconds
Works on low-end mobile devices
🔒 Reliability & Safety
Input validation across all flows
Graceful error handling
No empty or broken states
🎯 Vision

AgriPulse is built to be:

Simple enough for any farmer
Fast enough for real-world use
Smart enough to improve over time
⚡ Getting Started
git clone https://github.com/your-username/agripulse.git
cd agripulse
npm install
npm run dev
🤝 Contributing

Pull requests are welcome.
Focus on:

Performance
Simplicity
Real-world usability
📜 License

MIT License

💡 Final Note

This is not just another AI app.
