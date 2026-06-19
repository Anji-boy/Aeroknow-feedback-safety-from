# AeroKnow Safety Report System

**AK – 2311 SAFETY REPORTING | EASA.21J.791/LV.21G.0001**

A React form that replicates the AeroKnow Safety Report Word document.  
When submitted, the form data is emailed to 2 Gmail addresses via Nodemailer.

---

## How It Works

```
Phone Camera → QR Code → React Form → User Fills Form → Submit → Email Sent
                                                                    ↓
                                                        ishananjana22@gmail.com
                                                        ishananjana20@gmail.com
```

---

## Project Structure

```
QR form/
│
├── client/                    ← React Frontend (Vite)
│   ├── src/
│   │   ├── main.jsx          ← Entry point
│   │   ├── App.jsx           ← App wrapper
│   │   ├── SafetyForm.jsx    ← THE MAIN FORM (all 3 parts)
│   │   └── index.css         ← All styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                    ← Express Backend (Nodemailer)
│   ├── server.js             ← API endpoint + email sending
│   ├── .env                  ← Gmail credentials (EDIT THIS!)
│   └── package.json
│
└── README.md
```

---

## Setup Steps

### Step 1: Gmail App Password (DO THIS FIRST!)

1. Go to your Google Account → Security
2. Turn ON **2-Step Verification**
3. Go to **App Passwords**
4. Create a new app password
5. Copy the 16-character password

### Step 2: Edit `.env`

Open `server/.env` and put your Gmail credentials:

```
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

### Step 3: Install & Run Server

```bash
cd server
npm install
npm start
```

You should see:
```
🚀 AeroKnow Server running
📡 Port: 5000
```

### Step 4: Install & Run Client

Open a NEW terminal:

```bash
cd client
npm install
npm run dev
```

React will open at: `http://localhost:3000`

### Step 5: Test It!

1. Fill out the form
2. Click "Submit Safety Report"
3. Check both Gmail inboxes for the email

---

## QR Code

After deploying, generate a QR code pointing to your deployed React URL.  
Free QR generators: https://www.qr-code-generator.com/

---

## Deployment (Free)

| What     | Where                        |
|----------|------------------------------|
| Frontend | Netlify or Vercel (free)     |
| Backend  | Render.com (free)            |

**Important:** After deploying the backend, update `API_URL` in  
`client/src/SafetyForm.jsx` to point to your Render URL instead of localhost.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to send email" | Check `.env` has correct Gmail + App Password |
| CORS error in browser | Make sure server has `app.use(cors())` |
| Form not loading | Check `npm run dev` is running in client folder |
| Server crash on start | Run `npm install` in server folder first |
| Gmail blocks email | Use App Password, NOT regular password |
| Port 5000 in use | Change PORT in server.js or kill the process |

---

## Email Recipients (Hardcoded)

Emails go to:
- `ishananjana22@gmail.com`
- `ishananjana20@gmail.com`

To change: Edit `RECIPIENTS` array in `server/server.js` (line ~35)
