// ============================================================
// server.js  –  AeroKnow Safety Report BACKEND
// Runs on:  http://localhost:5001
//
// What this file does (plain English):
//   1. Accepts the form data from the React client
//   2. Saves it to a small JSON file on disk (inside /data folder)
//   3. Sends an email link to the next person who needs to act
//   4. Serves back a saved report when someone opens their email link
//   5. Generates and sends a real PDF download of the whole form
// ============================================================

// ---- Load environment variables from .env file ----
require("dotenv").config();

// ---- Import required packages ----
const express = require("express");       // Web server framework
const cors = require("cors");          // Allows React (port 3000) to talk to this server (port 5001)
const nodemailer = require("nodemailer");    // Sends emails via Gmail
const puppeteer = require("puppeteer");     // Headless Chrome – converts HTML to PDF
const fs = require("fs");            // Read/write files on disk
const path = require("path");          // Build file paths safely across OS
const { v4: uuidv4 } = require("uuid");     // Generates unique IDs (e.g. "a3f2-...") for each report

const app = express();

// ---- Middleware ----
// CORS: Allow the React client on port 3000 to make requests here
app.use(cors());
// Parse incoming JSON bodies (form data arrives as JSON)
app.use(express.json());


// ============================================================
// EMAIL SETUP (Gmail via nodemailer)
// Credentials come from server/.env  –  never hardcode passwords!
// ============================================================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,   // e.g. bantifux@gmail.com
        pass: process.env.EMAIL_PASS    // 16-char App Password from Google Account
    }
});


// ============================================================
// HARD-CODED SETTINGS  (easy to find and change)
// ============================================================

// Who gets emails at each step
const RECIPIENTS = {
    SAFETY_MANAGER: "ishananjana20@gmail.com",   // Gets link to fill Part B
    SAFETY_COMMITTEE: "ishananjana22@gmail.com"    // Gets link to fill Part C
};

// Where this React client is hosted
// LOCAL DEV:  http://localhost:3000
// PRODUCTION: change this to your Render/Netlify URL  e.g. https://aeroknow.netlify.app
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Where form data JSON files are stored on the server disk
const DATA_DIR = path.join(__dirname, "data");

// Make sure the /data folder exists when server starts
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}


// ============================================================
// generateHTML(form)
//
// Builds a complete HTML string of the filled-in form.
// This HTML is what puppeteer "prints" to PDF.
// Every form field is injected via ${form.fieldName || ""}
// ============================================================
function generateHTML(form) {

    // Read the logo image from disk and convert to base64 so it
    // can be embedded directly inside the HTML (no file path needed in PDF)
    const logoPath = path.join(__dirname, "../client/images/footerlogo.png");
    let logoSrc = "";
    if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath, "base64");
        logoSrc = `data:image/png;base64,${logoBase64}`;
    }

    // Return the full HTML page as a string
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Verdana, sans-serif; font-size: 12pt; line-height: 1.5; color: #000; margin: 0; padding: 0; }
        .form-container { width: 100%; margin: 0 auto; }
        .form-header { margin-bottom: 20px; }
        .header-logo { margin-bottom: 10px; display: flex; align-items: baseline; }
        .logo-text { font-size: 24px; font-weight: bold; color: #0077b6; margin-left: 10px; }
        .header-easa { font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 4px; }
        .header-title-bar { display: flex; justify-content: space-between; margin-top: 4px; font-size: 14px; }
        .header-title { font-weight: bold; }
        .header-meta { font-size: 12px; }
        .form-main-title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
        .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        .section-note { margin-bottom: 15px; font-size: 14px; }
        .form-row { display: flex; align-items: baseline; margin-bottom: 15px; width: 100%; }
        .val { flex-grow: 1; border-bottom: 1px dotted #000; margin-left: 5px; min-width: 50px; display: inline-block; padding-bottom: 2px; }
        .textarea-box { border: 1px solid #000; min-height: 150px; padding: 10px; margin-top: 5px; white-space: pre-wrap; }
        .scale-container { margin-bottom: 15px; }
        .scale-question { margin-bottom: 5px; }
        .scale-row { display: flex; justify-content: space-between; align-items: center; }
        .scale-label { flex: 1; }
        .scale-label.right { text-align: right; }
        .scale-numbers { display: flex; justify-content: space-between; flex: 2; padding: 0 20px; }
        .scale-num { width: 20px; text-align: center; font-weight: bold; }
        .scale-num.selected { border: 1px solid #000; border-radius: 50%; }
        .agreed-row { display: flex; align-items: baseline; margin-bottom: 10px; }
        .agreed-role { width: 250px; }
    </style>
</head>
<body>
    <div class="form-container">

        <!-- ===== HEADER ===== -->
        <div class="form-header">
            <div class="header-logo" style="margin-top: 0.25in;">
                ${logoSrc ? `<img src="${logoSrc}" alt="AeroKnow Logo" style="width: 150px;" />` : ''}
            </div>
            <div class="header-easa">EASA.21J.791/LV.21G.0001</div>
            <div class="header-title-bar">
                <span class="header-title">AK – 2311 SAFETY REPORTING</span>
                <span class="header-meta">Issue:1 &nbsp;&nbsp; Date:01/05/2023</span>
            </div>
        </div>

        <div class="form-main-title">Safety Report Form Template</div>

        <!-- ===== PART A  (filled by the client / reporter) ===== -->
        <div class="section-title">Part A to be completed by the person identifying the event or hazard.</div>
        <div class="form-row">
            <span>Date of event:</span> <span class="val">${form.dateOfEvent || ""}</span>
            <span style="margin-left: 20px;">Local time:</span> <span class="val">${form.localTime || ""}</span>
        </div>
        <div class="form-row">
            <span>Location:</span> <span class="val">${form.location || ""}</span>
        </div>
        <div class="form-row">
            <span>Name of reporter:(Not mandatory)</span> <span class="val">${form.reporterName || ""}</span>
            <span style="margin-left: 20px;">Dept/Organization:</span> <span class="val">${form.department || ""}</span>
        </div>

        <div style="font-weight: bold; margin-top: 20px;">Please fully describe the event or identified hazard:</div>
        <div style="font-size: 13px; margin-bottom: 5px;">Include your suggestions on how to prevent similar occurrences.</div>
        <div class="textarea-box">${form.eventDescription || ""}</div>

        <br/>
        <div class="scale-question">In your opinion, what is the likelihood of such an event or similar happening or happening again?</div>
        <div class="scale-row">
            <span class="scale-label">Extremely improbable</span>
            <div class="scale-numbers">
                ${[1, 2, 3, 4, 5].map(n => `<span class="scale-num ${String(n) === form.likelihood ? 'selected' : ''}">${n}</span>`).join('')}
            </div>
            <span class="scale-label right">Frequent</span>
        </div>

        <br/>
        <div class="scale-question">What do you consider could be the worst possible consequence if this event did happen or happened again?</div>
        <div class="scale-row">
            <span class="scale-label">Negligible</span>
            <div class="scale-numbers">
                ${[1, 2, 3, 4, 5].map(n => `<span class="scale-num ${String(n) === form.consequence ? 'selected' : ''}">${n}</span>`).join('')}
            </div>
            <span class="scale-label right">Catastrophic</span>
        </div>

        <!-- ===== PART B  (filled by the Safety Manager) ===== -->
        <div class="section-title">Part B to be completed by the Safety Manager</div>
        <div class="section-note">The report has been dis-identified and entered into the company database.</div>

        <div class="form-row">
            <span>Report reference:</span> <span class="val">${form.reportReference || ""}</span>
        </div>
        <div class="form-row">
            <span>Signature:</span> <span class="val" style="flex: 2;">${form.signatureB || ""}</span>
            <span style="margin-left: 20px;">Date:</span> <span class="val" style="flex: 1;">${form.dateB || ""}</span>
        </div>
        <div class="form-row">
            <span>Name:</span> <span class="val">${form.nameB || ""}</span>
        </div>

        <!-- ===== PART C  (filled by the Safety Committee) ===== -->
        <div class="section-title">Part C to be completed by the Safety Committee</div>

        <div class="scale-question">Rate the likelihood of the event occurring or recurring.</div>
        <div class="scale-row">
            <span class="scale-label">Extremely improbable</span>
            <div class="scale-numbers">
                ${[1, 2, 3, 4, 5].map(n => `<span class="scale-num ${String(n) === form.likelihoodC ? 'selected' : ''}">${n}</span>`).join('')}
            </div>
            <span class="scale-label right">Frequent</span>
        </div>

        <br/>
        <div class="scale-question">Rate the worst-case consequences?</div>
        <div class="scale-row">
            <span class="scale-label">Negligible</span>
            <div class="scale-numbers">
                ${[1, 2, 3, 4, 5].map(n => `<span class="scale-num ${String(n) === form.consequenceC ? 'selected' : ''}">${n}</span>`).join('')}
            </div>
            <span class="scale-label right">Catastrophic</span>
        </div>

        <br/>
        <div>What action or actions are required to ELIMINATE, MITIGATE or<br/>CONTROL the hazard to an acceptable level of safety?</div>
        <div class="textarea-box" style="min-height: 100px;">${form.actionRequired || ""}</div>

        <br/>
        <div class="form-row">
            <span>Resource required:</span> <span class="val">${form.resourceRequired || ""}</span>
        </div>
        <div class="form-row">
            <span>Responsibility for Action:</span> <span class="val">${form.responsibility || ""}</span>
        </div>

        <br/>
        <div class="agreed-row">
            <div class="agreed-role">Agreed and Accepted by,</div>
            <div class="agreed-role">Safety Manager</div>
            <span>Date:</span> <span class="val">${form.safetyManagerDate || ""}</span>
        </div>
        <div class="agreed-row">
            <div class="agreed-role"></div>
            <div class="agreed-role">Responsible Manager</div>
            <span>Date:</span> <span class="val">${form.responsibleManagerDate || ""}</span>
        </div>
        <div class="agreed-row">
            <div class="agreed-role"></div>
            <div class="agreed-role">Accountable Manager</div>
            <span>Date:</span> <span class="val">${form.accountableManagerDate || ""}</span>
        </div>

        <br/>
        <div class="agreed-row">
            <div style="flex: 2;">Appropriate Feedback given to staff by Safety Manager<br/>Signed</div>
            <span style="margin-left: 20px;">Date:</span> <span class="val">${form.feedbackDate || ""}</span>
        </div>

        <br/>
        <div class="agreed-row">
            <div style="width: 200px;">Follow up action required:</div>
            <span>When</span> <span class="val">${form.followUpWhen || ""}</span>
            <span style="margin-left: 20px;">Who</span> <span class="val">${form.followUpWho || ""}</span>
        </div>
        <div class="agreed-row">
            <div style="width: 200px;">Hazard log updated:</div>
            <span>When</span> <span class="val">${form.hazardLogWhen || ""}</span>
        </div>

    </div>
</body>
</html>
    `;
}


// ============================================================
// ROUTE 1:  POST /api/reports
// Who calls it:  The CLIENT (reporter) when they submit Part A
//
// What it does:
//   1. Generates a new unique ID (UUID) for this report
//   2. Saves the form data as a JSON file:  data/<uuid>.json
//   3. Builds a magic link for the Safety Manager:
//        http://localhost:3000/?id=<uuid>&role=manager
//   4. Emails that link to the Safety Manager
// ============================================================
app.post("/api/reports", async (req, res) => {
    try {
        // Step 1: Create a new unique ID for this report
        const id = uuidv4();   // e.g.  "a3f2c9d1-44b2-4e8f-bc10-..."

        // Step 2: Get the form data that the client sent
        const form = req.body;

        // Step 3: Save the form data to disk as a JSON file
        const filePath = path.join(DATA_DIR, `${id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(form, null, 2));

        // Step 4: Build the Safety Manager's link (includes role=manager)
        const managerLink = `${CLIENT_URL}/?id=${id}&role=manager`;

        // Step 5: Decide who gets the email
        let mailRecipients = [RECIPIENTS.SAFETY_MANAGER];
        // If the reporter gave their own email, send them a copy too
        if (form.reporterEmail && form.reporterEmail.includes("@")) {
            mailRecipients.push(form.reporterEmail);
        }

        // Step 6: Send the email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: mailRecipients,
            subject: `New feedback safety report comes from ${form.reporterName || 'client'}`,
            html: `
                <p>Dear Safety Manager,</p>
                <p>New feedback safety report comes from ${form.reporterName || 'client'}.</p>
                <p>Click below link to proceed it:</p>
                <p><a href="${managerLink}">${managerLink}</a></p>
            `
        });

        // Step 7: Tell the client everything went OK
        res.status(200).json({ success: true, id, message: "Report saved and email sent to Manager" });

    } catch (error) {
        console.error("POST /api/reports error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ============================================================
// ROUTE 2:  GET /api/reports/:id
// Who calls it:  The React app on page load, when there IS an ?id= in the URL
//                (i.e. manager or committee clicked their email link)
//
// What it does:
//   Reads the saved JSON file for that report ID and sends it back
//   so React can pre-fill all the form fields.
// ============================================================
app.get("/api/reports/:id", (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(DATA_DIR, `${id}.json`);

        // If no file found, the link is invalid or report was never saved
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        // Read and return the saved JSON form data
        const data = fs.readFileSync(filePath, "utf-8");
        res.status(200).json({ success: true, data: JSON.parse(data) });

    } catch (error) {
        console.error("GET /api/reports/:id error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ============================================================
// ROUTE 3:  PUT /api/reports/:id?role=manager  OR  ?role=committee
// Who calls it:  Safety Manager (after filling Part B)
//                Safety Committee (after filling Part C)
//
// What it does:
//   1. Overwrites the saved JSON file with the updated form data
//   2. If role=manager:  emails the Safety Committee their link
//   3. If role=committee: just saves – workflow is complete
// ============================================================
app.put("/api/reports/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.query;       // "manager" or "committee"
        const updatedForm = req.body;

        const filePath = path.join(DATA_DIR, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        // Overwrite the old JSON file with the new (updated) form data
        fs.writeFileSync(filePath, JSON.stringify(updatedForm, null, 2));

        if (role === "manager") {
            // Build the Safety Committee's link (includes role=committee)
            const committeeLink = `${CLIENT_URL}/?id=${id}&role=committee`;

            // Email the Safety Committee
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: [RECIPIENTS.SAFETY_COMMITTEE],
                subject: "AeroKnow Safety Report - Action Required (Part C)",
                html: `
                    <p>The Safety Manager has completed Part B of a Safety Report.</p>
                    <p>Please click the link below to review Parts A & B, and fill out Part C:</p>
                    <p><a href="${committeeLink}">${committeeLink}</a></p>
                `
            });
            return res.status(200).json({ success: true, message: "Report updated and email sent to Committee" });
        }

        if (role === "committee") {
            // Final step – just save, no more emails needed
            return res.status(200).json({ success: true, message: "Final report saved successfully" });
        }

        // Fallback for unknown roles
        res.status(200).json({ success: true, message: "Report updated" });

    } catch (error) {
        console.error("PUT /api/reports/:id error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ============================================================
// ROUTE 4:  POST /api/reports/:id/pdf
// Who calls it:  The Safety Manager when they click "Download as PDF"
//
// What it does:
//   1. Loads the form data (uses data sent from React, or the saved file)
//   2. Generates a full HTML page of the form via generateHTML()
//   3. Uses puppeteer (headless Chrome) to "print" that HTML to a PDF
//   4. Sends the PDF bytes back to the browser so it downloads
//
// ---------------------------------------------------------------
// *** BUG FIXED HERE ***
//
// Puppeteer v21+ changed the return type of page.pdf():
//   OLD (Puppeteer < v21):  returns a Node.js Buffer
//   NEW (Puppeteer >= v21): returns a Uint8Array
//
// Why this matters:
//   Express's res.send() checks if data is a real Node.js Buffer using:
//       Buffer.isBuffer(data)
//   For a Uint8Array, this returns FALSE.
//   So Express thinks it's a plain JavaScript object and calls res.json() on it,
//   which serializes the bytes as:  {"0":37,"1":80,"2":68,...}
//   That JSON string is what gets sent to the browser instead of real PDF bytes.
//   The browser tries to open {"0":37,...} as a PDF → FAILS with
//   "Failed to load PDF document."
//
// Fix: Wrap the Uint8Array in Buffer.from() to create a real Buffer.
//      Buffer.from(uint8Array) copies the bytes into a proper Node.js Buffer.
//      Then Buffer.isBuffer(pdfBuffer) = TRUE, and res.send() sends real binary.
// ============================================================
app.post("/api/reports/:id/pdf", async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(DATA_DIR, `${id}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        // Use the form data sent from React (has latest unsaved edits)
        // Fall back to the saved JSON file if React sent nothing
        const form = Object.keys(req.body).length > 0
            ? req.body
            : JSON.parse(fs.readFileSync(filePath, "utf-8"));

        // Build the HTML page of the form
        const html = generateHTML(form);

        // Launch headless Chrome (puppeteer)
        // --no-sandbox is required when running as root (Linux/Docker/cloud servers like Render)
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();

        // Load the HTML into the browser tab
        // waitUntil: "networkidle0" = wait until no network requests for 500ms
        // (important for images like the logo to finish loading)
        await page.setContent(html, { waitUntil: "networkidle0" });

        // ============================================================
        // page.pdf() returns a Uint8Array in puppeteer v21+
        // We MUST convert it to a real Node.js Buffer before sending!
        // ============================================================
        const pdfUint8Array = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0.25in", bottom: "1in", left: "1in", right: "0.25in" }
        });

        // CLOSE the browser BEFORE sending the response (free up memory)
        await browser.close();

        // *** THE FIX ***
        // Convert Uint8Array  →  real Node.js Buffer
        // Without this, res.send() would serialize the bytes as JSON garbage!
        const pdfBuffer = Buffer.from(pdfUint8Array);

        // Set HTTP headers so the browser knows it's a PDF attachment
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="AeroKnow_Safety_Report_${form.dateOfEvent || 'Draft'}.pdf"`,
            "Content-Length": pdfBuffer.length   // How many bytes to expect
        });

        // Send the real PDF bytes to the browser → triggers download
        res.send(pdfBuffer);

    } catch (error) {
        console.error("PDF generation error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ============================================================
// ROUTE 5:  GET /api/health
// A simple ping to verify the server is running
// Visit http://localhost:5001/api/health in your browser to check
// ============================================================
app.get("/api/health", (req, res) => {
    res.json({ status: "Server is running", time: new Date().toISOString() });
});


// ============================================================
// START THE SERVER
// Port 5001 is hardcoded in .env  (PORT=5001)
// ============================================================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log("====================================");
    console.log("  AeroKnow Safety Report Server");
    console.log("  Port:", PORT);
    console.log("  Data dir:", DATA_DIR);
    console.log("  Client URL:", CLIENT_URL);
    console.log("====================================");
});