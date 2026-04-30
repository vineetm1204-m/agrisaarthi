# AgriSaarthi - Deployment Guide

This guide covers the deployment process for both the Next.js Frontend/API and the Flask ML Microservice.

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.8+
- Accounts for Firebase, Supabase, Twilio, Redis, OpenWeatherMap, Anthropic (for API keys)

---

## 1. Environment Setup

Create a `.env.local` or `.env` file in the root directory (`/agrisaarthi`) and configure the following variables:

```env
# ── Firebase (Client SDK) ──
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_IVR_NUMBER=your_ivr_number

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ── Redis ──
REDIS_URL=redis://localhost:6379

# ── External APIs ──
DATA_GOV_IN_API_KEY=your_data_gov_in_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# ── Twilio ──
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# ── Firebase Admin (Server SDK) ──
FIREBASE_SERVICE_ACCOUNT_KEY={"type": "service_account", ...}

# ── App ──
NODE_ENV=development # change to production for deployment
```

---

## 2. Frontend & Next.js API Setup

The main application is a Next.js full-stack app containing the UI, middleware, and Next.js API routes.

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   *(If you get `sh: next: command not found`, ensure `npm install` finishes successfully).*
3. Open [http://localhost:3000](http://localhost:3000)

### Production Deployment (Vercel)
The easiest way to deploy the Next.js app is via Vercel.
1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and import your repository.
3. In the **Environment Variables** section, paste all the keys from your `.env` file.
4. Note: The `vercel.json` file is already configured to run background cron jobs (irrigation, price-alerts, weather). Vercel will automatically detect and set these up.
5. Click **Deploy**.

---

## 3. ML Microservice Setup

The ML microservice is a Flask API serving Python-based ML models for irrigation predictions.

### Local Development
1. Navigate to the ML microservice directory:
   ```bash
   cd ml_microservice
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   
   # On macOS/Linux:
   source venv/bin/activate  
   
   # On Windows:
   venv\Scripts\activate
   ```
3. Install dependencies:
   There is no explicit `requirements.txt` yet, so install the packages manually:
   ```bash
   pip install Flask flask-cors joblib scikit-learn
   ```
4. Run the Flask server:
   ```bash
   python app.py
   ```
   The ML API will be accessible at [http://localhost:5000](http://localhost:5000).

### Production Deployment
For production, the ML microservice should be deployed as an independent service on platforms like Render, Railway, or Heroku.
1. Generate a `requirements.txt` file first:
   ```bash
   pip freeze > requirements.txt
   ```
2. You will also want to replace `app.run(...)` with a production WSGI server like `gunicorn`. Add `gunicorn` to your requirements:
   ```bash
   pip install gunicorn
   ```
3. Create a `Procfile` in the `ml_microservice` folder if required by your hosting provider:
   ```
   web: gunicorn app:app
   ```
4. Deploy the `ml_microservice` folder.
5. **CRITICAL:** Update your Next.js application's environment variables or hardcoded fetch URLs to point to the new deployed ML microservice URL instead of `http://localhost:5000`.
