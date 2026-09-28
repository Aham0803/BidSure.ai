import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { query, runQuery } from './db.js';
import * as digilocker from './digilocker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limit
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;

// ─── Environment Status Endpoint ─────────────────────────────────────────────
app.get('/api/env-status', (req, res) => {
  const isKeyConfigured = (key) => !!(key && !key.includes('YOUR_'));
  res.json({
    gemini: {
      configured: isKeyConfigured(process.env.GEMINI_API_KEY),
      model: 'gemini-3.5-flash',
      purpose: 'Multimodal AI OCR & Document Intelligence'
    },
    digilocker: {
      configured: digilocker.isLiveConfigured(),
      clientId: process.env.DIGILOCKER_CLIENT_ID || 'DEMO_BIDSURE_CLIENT_ID',
      redirectUri: process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:5173/auth/digilocker/callback',
      purpose: 'National SSO & Verified Certificate Extraction (v2.4 Spec)'
    },
    gstn: {
      configured: isKeyConfigured(process.env.GSTN_API_KEY),
      baseUrl: process.env.GSTN_BASE_URL || 'https://api.gst.gov.in',
      purpose: 'GSTIN Status & Return Filing Verification'
    },
    mca: {
      configured: isKeyConfigured(process.env.DATA_GOV_API_KEY),
      baseUrl: process.env.DATA_GOV_BASE_URL || 'https://api.data.gov.in',
      purpose: 'Ministry of Corporate Affairs (MCA21) Company Master Data'
    },
    udyam: {
      configured: isKeyConfigured(process.env.UDYAM_API_KEY),
      baseUrl: process.env.UDYAM_BASE_URL || 'https://api.udyamregistration.gov.in',
      purpose: 'MSME Udyam Registration & Enterprise Categorization'
    },
    credit: {
      configured: isKeyConfigured(process.env.CREDIT_API_KEY),
      purpose: 'CIBIL / Commercial Credit Health Scoring'
    }
  });
});

// ─── GSTN Portal Verification ────────────────────────────────────────────────
async function verifyGSTIN(gstin) {
  if (!process.env.GSTN_API_KEY || process.env.GSTN_API_KEY.includes('YOUR_') || !gstin || gstin === 'Not Found') {
    return {
      status: gstin && gstin !== 'Not Found' ? 'Active' : 'Unverified',
      legalName: 'Verified Bidder Entity',
      lastReturn: 'Aug 2026',
      verified: gstin && gstin !== 'Not Found',
      source: 'Mock (Configure GSTN_API_KEY in .env for live portal data)'
    };
  }
  try {
    const res = await fetch(`${process.env.GSTN_BASE_URL}/search?gstin=${gstin}`, {
      headers: { 'Authorization': `Bearer ${process.env.GSTN_API_KEY}` }
    });
    const data = await res.json();
    return {
      status: data.sts || 'Active',
      legalName: data.lgnm || 'Registered Business',
      lastReturn: data.lstupdt || 'Current',
      verified: data.sts === 'Active',
      source: 'Live GSTN Portal'
    };
  } catch (e) {
    return { status: 'Unknown', verified: false, error: e.message, source: 'GSTN Portal Error' };
  }
}

// ─── MCA21 Company Verification ──────────────────────────────────────────────
async function verifyMCA(pan) {
  if (!process.env.DATA_GOV_API_KEY || process.env.DATA_GOV_API_KEY.includes('YOUR_') || !pan || pan === 'Not Found') {
    return {
      directors: ['Rajesh Sharma (DIN: 08412901)', 'Amit Patel (DIN: 07291034)'],
      panValid: pan && pan !== 'Not Found',
      companyStatus: 'Active',
      verified: pan && pan !== 'Not Found',
      source: 'Mock (Configure DATA_GOV_API_KEY in .env for live data.gov.in)'
    };
  }
  try {
    const res = await fetch(
      `${process.env.DATA_GOV_BASE_URL}/resource/company-master?pan=${pan}&api-key=${process.env.DATA_GOV_API_KEY}&format=json`
    );
    const data = await res.json();
    const record = data.records?.[0];
    return {
      directors: record?.directors?.split(',') || ['Director Info Found'],
      panValid: !!record,
      companyStatus: record?.company_status || 'Active',
      verified: !!record,
      source: 'Live MCA21 Portal'
    };
  } catch (e) {
    return { panValid: false, verified: false, error: e.message, source: 'MCA21 Error' };
  }
}

// ─── Udyam MSME Verification ─────────────────────────────────────────────────
async function verifyUdyam(udyamNo) {
  if (!process.env.UDYAM_API_KEY || process.env.UDYAM_API_KEY.includes('YOUR_') || !udyamNo || udyamNo === 'Not Found') {
    return {
      registered: udyamNo && udyamNo !== 'Not Found',
      category: 'Small Enterprise (MSME-Designated)',
      verified: udyamNo && udyamNo !== 'Not Found',
      source: 'Mock (Configure UDYAM_API_KEY in .env for live MSME portal)'
    };
  }
  try {
    const res = await fetch(`${process.env.UDYAM_BASE_URL}/verify?udyam_no=${udyamNo}`, {
      headers: { 'Authorization': `Bearer ${process.env.UDYAM_API_KEY}` }
    });
    const data = await res.json();
    return {
      registered: data.registered,
      category: data.enterprise_category || 'Micro/Small Enterprise',
      verified: data.registered,
      source: 'Live Udyam Portal'
    };
  } catch (e) {
    return { registered: false, verified: false, error: e.message, source: 'Udyam Error' };
  }
}

// ─── Gemini AI Native Multimodal OCR Engine ───────────────────────────────────
/**
 * Uses Gemini AI 1.5 Flash / 2.0 Flash to perform direct OCR and entity extraction
 * directly on PDF buffers and image files (PNG, JPG, JPEG).
 */
async function extractWithGeminiOCR(fileBuffer, mimeType, originalname) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('YOUR_')) {
    return null;
  }

  const base64Data = fileBuffer.toString('base64');
  let resolvedMime = mimeType || 'application/pdf';
  if (originalname) {
    const ext = originalname.split('.').pop().toLowerCase();
    if (ext === 'pdf') resolvedMime = 'application/pdf';
    else if (ext === 'png') resolvedMime = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') resolvedMime = 'image/jpeg';
  }

  const prompt = `You are an expert AI Document OCR and Verification Engine for Indian Public Procurement (GeM, CPPP, Indian Railways, NHAI, CPWD).
Analyze the attached document (PDF/Image) using OCR.
Extract all legal entities, registration IDs, tender codes, financial figures, and signatures.

Return ONLY a strict JSON object (no markdown fences, no extra text) with the following structure:
{
  "entityName": "Official Legal Entity / Bidder Company Name",
  "gstin": "15-character GSTIN (or 'Not Found')",
  "pan": "10-character PAN (or 'Not Found')",
  "udyam": "Udyam Registration Number e.g. UDYAM-XX-00-0000000 (or 'Not Found')",
  "tenderRef": "Tender Reference / Bid Number / GeM Bid ID (or 'Not Found')",
  "address": "Registered office address (or 'Not Found')",
  "turnover": "Annual turnover / CA certified revenue (or 'Not Found')",
  "documentType": "Type of document detected (e.g. GST Registration Certificate, MSME Udyam Certificate, Technical Bid Submission, CA Certified Turnover, PAN Card)",
  "extractedTextSample": "Brief 2-3 sentence summary of the key OCR text read",
  "anomalies": ["Any red flags, expiry notices, or discrepancies observed"],
  "complianceSummary": "Concise assessment of document authenticity and completeness"
}`;

  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: resolvedMime,
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Gemini model ${model} responded with status ${res.status}:`, errText);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleanJson = rawText.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleanJson);
        parsed.ocrEngine = `Google Gemini AI OCR (${model})`;
        return parsed;
      }
    } catch (err) {
      console.error(`Gemini OCR attempt with ${model} failed:`, err.message);
    }
  }

  return null;
}

// ─── Gemini AI Text Extraction ───────────────────────────────────────────────
async function extractWithGeminiText(text) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('YOUR_')) return null;
  const prompt = `You are an expert AI Document Intelligence Engine for Indian Public Procurement.
Analyze this document text and extract structured details. Return ONLY valid JSON:
{
  "entityName": "Official Legal Entity / Bidder Name",
  "gstin": "15-character GSTIN (or 'Not Found')",
  "pan": "10-character PAN (or 'Not Found')",
  "udyam": "Udyam Registration Number (or 'Not Found')",
  "tenderRef": "Tender Reference / Bid Number (or 'Not Found')",
  "address": "Registered office address (or 'Not Found')",
  "turnover": "Annual turnover / CA certified revenue (or 'Not Found')",
  "documentType": "Document type detected",
  "complianceNotes": "Brief assessment of document completeness"
}
DOCUMENT TEXT:
${text.substring(0, 4000)}`;

  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) continue;
      const d = await res.json();
      const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txt) {
        const parsed = JSON.parse(txt.trim().replace(/^```json/i, '').replace(/```$/i, '').trim());
        parsed.ocrEngine = `Google Gemini AI (${m})`;
        return parsed;
      }
    } catch (e) {
      console.warn('Text extraction error with', m, e.message);
    }
  }
  return null;
}

// ─── Regex Fallback Extraction ───────────────────────────────────────────────
function extractWithRegex(text) {
  return {
    entityName: (
      text.match(/(?:Bidder|Company|Firm|Entity|Registered)[\s\S]{0,10}Name[\s:]+([^\n,]{3,60})/i) ||
      text.match(/M\/s\.?\s+([A-Za-z][^\n,]{3,50})/i) ||
      []
    )[1]?.trim() || 'Unknown Entity',
    gstin: (text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b/i) || [])[0] || 'Not Found',
    pan:   (text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/) || [])[0] || 'Not Found',
    udyam: (text.match(/UDYAM-[A-Z]{2}-\d{2}-\d+/i) || [])[0] || 'Not Found',
    tenderRef: (
      text.match(/GEM\/\d{4}\/[A-Z]\/\d+/i) ||
      text.match(/TND-\d{4}-\d+/i) ||
      text.match(/(?:Tender|Bid|RFP)[\s#:No.]+([A-Z0-9\-\/]+)/i) ||
      []
    )[0] || 'Unknown Tender',
    address: (text.match(/(?:Address|Registered Office)[\s:]+([^\n]{10,100})/i) || [])[1]?.trim() || 'Not Found',
    turnover: (text.match(/(?:Annual Turnover|Turnover|Revenue)[\s:₹Rs.]+([0-9,.]+\s*(?:Cr|Lakh|L|crore)?)/i) || [])[1]?.trim() || 'Not Found',
    ocrEngine: 'Regex Text Pattern OCR'
  };
}

// ─── Helper: Generate Compliance Score ───────────────────────────────────────
function calculateComplianceScore(gstn, mca, udyam, hasGstin, hasPan, hasUdyam) {
  let score = 0;
  if (gstn.verified) score += 35;
  if (mca.verified) score += 30;
  if (udyam.verified) score += 15;
  if (hasGstin) score += 10;
  if (hasPan) score += 10;
  const risk = score >= 80 ? 'Low' : score >= 55 ? 'Medium' : 'High';
  return { score, risk };
}

// ─── Main OCR + Verification Endpoint ────────────────────────────────────────
app.post('/api/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let extracted = null;
    let textExtracted = '';
    let documentPages = 1;

    // 1. Try native Multimodal Gemini AI OCR first (works on scanned PDFs, images, docs)
    const geminiOcrResult = await extractWithGeminiOCR(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (geminiOcrResult) {
      extracted = geminiOcrResult;
    } else {
      // 2. Fall back to pdf-parse for native text extraction if PDF
      if (req.file.mimetype === 'application/pdf' || req.file.originalname?.endsWith('.pdf')) {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          textExtracted = pdfData.text || '';
          documentPages = pdfData.numpages || 1;
        } catch (pdfErr) {
          console.warn('pdf-parse could not read text (scanned PDF):', pdfErr.message);
        }
      }

      // If text was extracted from PDF and Gemini is configured, use Gemini on text!
      if (textExtracted && process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_')) {
        extracted = await extractWithGeminiText(textExtracted);
      }

      // 3. Fall back to Regex extraction
      if (!extracted) {
        extracted = extractWithRegex(textExtracted);
      }
    }

    // 4. Run concurrent cross-verification against government registries
    const [gstnResult, mcaResult, udyamResult] = await Promise.all([
      verifyGSTIN(extracted.gstin),
      verifyMCA(extracted.pan),
      verifyUdyam(extracted.udyam),
    ]);

    const hasGstin = extracted.gstin && extracted.gstin !== 'Not Found';
    const hasPan   = extracted.pan   && extracted.pan   !== 'Not Found';
    const hasUdyam = extracted.udyam && extracted.udyam !== 'Not Found';

    const { score, risk } = calculateComplianceScore(gstnResult, mcaResult, udyamResult, hasGstin, hasPan, hasUdyam);

    res.json({
      extracted,
      verification: {
        gstn: gstnResult,
        mca: mcaResult,
        udyam: udyamResult,
        digilocker: {
          verified: hasPan || hasGstin,
          status: 'Direct DigiLocker Vault Ready',
          source: 'Meri Pehchaan Spec v2.4'
        }
      },
      complianceScore: score,
      riskLevel: risk,
      extractionMethod: extracted.ocrEngine || (geminiOcrResult ? 'Gemini AI Vision OCR' : 'Regex OCR Fallback'),
      documentPages,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Failed to process document: ' + error.message });
  }
});

// ─── DigiLocker & Meri Pehchaan API Suite (Spec v2.4) ─────────────────────────

// 1. Get Authorization URL with PKCE (Spec v2.4, p.4-7)
app.get('/api/digilocker/auth-url', (req, res) => {
  try {
    const authData = digilocker.getAuthorizationUrl({
      purpose: req.query.purpose || 'Bidder Verification',
      serviceName: req.query.service_name || 'BidSure AI Procurement Verification',
      reqDocType: req.query.req_doctype || 'PANCR,DRVLC,INCER,GSTCR',
      state: req.query.state
    });
    res.json(authData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Exchange Authorization Code for Access Token (Spec v2.4, p.7-11)
app.post('/api/digilocker/token', async (req, res) => {
  const { code, code_verifier, version } = req.body;
  try {
    const tokenResult = await digilocker.getAccessToken({
      code: code || 'demo_auth_code_12345',
      codeVerifier: code_verifier,
      version: version || 2
    });
    res.json(tokenResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Refresh Access Token (Spec v2.4, p.11-13)
app.post('/api/digilocker/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  try {
    const refreshed = await digilocker.refreshAccessToken(refresh_token);
    res.json(refreshed);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Revoke Token (Spec v2.4, p.13-14)
app.post('/api/digilocker/revoke', async (req, res) => {
  const { token, token_type_hint } = req.body;
  try {
    const result = await digilocker.revokeToken(token, token_type_hint);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Revoke Session / Logout URL (Spec v2.4, p.14)
app.get('/api/digilocker/logout-url', (req, res) => {
  res.json({ logoutUrl: digilocker.getLogoutUrl() });
});

// 6. Get User Details (Spec v2.4, p.14-16)
app.get('/api/digilocker/user', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || 'demo_token';
  try {
    const user = await digilocker.getUserDetails(token);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Get APAAR Academic Credit Details (Spec v2.4, p.16-19)
app.get('/api/digilocker/apaar', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || 'demo_token';
  try {
    const apaar = await digilocker.getApaarDetails(token);
    res.json(apaar);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Get Issued Documents (Spec v2.4, p.22-24)
app.get('/api/digilocker/issued-documents', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || 'demo_token';
  try {
    const docs = await digilocker.getIssuedDocuments(token);
    res.json(docs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Get Self Uploaded Documents & Folders (Spec v2.4, p.20-22)
const handleGetFiles = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || 'demo_token';
  try {
    const files = await digilocker.getSelfUploadedDocuments(token, req.params.folderId);
    res.json(files);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
app.get('/api/digilocker/files', handleGetFiles);
app.get('/api/digilocker/files/:folderId', handleGetFiles);

// 10. Get Document File by URI (Spec v2.4, p.24-25)
app.get('/api/digilocker/file/uri', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || 'demo_token';
  const uri = req.query.uri;
  if (!uri) return res.status(400).json({ error: 'uri parameter missing' });

  try {
    const fileResult = await digilocker.getFileFromUri(token, uri);
    if (fileResult.buffer) {
      res.setHeader('Content-Type', fileResult.contentType);
      res.send(fileResult.buffer);
    } else {
      res.json(fileResult);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Pull Document into DigiLocker (Spec v2.4, p.29-31)
app.post('/api/digilocker/pull', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || 'demo_token';
  const { orgid, doctype, consent, params } = req.body;
  try {
    const result = await digilocker.pullDocument(token, { orgid, doctype, consent, params });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 12. DigiLocker Meta APIs (Spec v2.4, p.31-42)
app.get('/api/digilocker/meta/issuers', async (req, res) => {
  try {
    const issuers = await digilocker.getIssuers();
    res.json(issuers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/digilocker/meta/doctypes', async (req, res) => {
  const orgid = req.query.orgid || '000001';
  try {
    const doctypes = await digilocker.getIssuerDocTypes(orgid);
    res.json(doctypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/digilocker/meta/statistics', async (req, res) => {
  try {
    const stats = await digilocker.getDigiLockerStatistics();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard, Bidders, Tenders & Reports Endpoints ─────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const recentBidders = await query("SELECT * FROM bidders ORDER BY date DESC LIMIT 4");
    const barData = [
      { name: 'Mon', verified: 4, failed: 1 }, { name: 'Tue', verified: 6, failed: 0 },
      { name: 'Wed', verified: 5, failed: 2 }, { name: 'Thu', verified: 8, failed: 1 },
      { name: 'Fri', verified: 9, failed: 0 }, { name: 'Sat', verified: 3, failed: 0 },
      { name: 'Sun', verified: 2, failed: 0 },
    ];
    const pieData = [
      { name: 'Low',    value: 65, color: '#10b981' },
      { name: 'Medium', value: 25, color: '#f59e0b' },
      { name: 'High',   value: 10, color: '#ef4444' },
    ];
    res.json({ barData, pieData, recentBidders });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/bidders', async (req, res) => {
  try { res.json(await query("SELECT * FROM bidders")); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/tenders', async (req, res) => {
  try { res.json(await query("SELECT * FROM tenders")); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/tenders', async (req, res) => {
  const { id, title, department, budget, bids, deadline } = req.body;
  try {
    await runQuery("INSERT INTO tenders VALUES (?, ?, ?, ?, ?, ?)", [id, title, department, budget, bids, deadline]);
    res.json({ message: 'Tender added successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/reports', (req, res) => {
  res.json([
    { month: 'Jan', verified: 45, failed: 12 }, { month: 'Feb', verified: 52, failed: 8 },
    { month: 'Mar', verified: 68, failed: 15 }, { month: 'Apr', verified: 85, failed: 10 },
    { month: 'May', verified: 92, failed: 5  }, { month: 'Jun', verified: 115, failed: 14 },
  ]);
});

// ─── Static Production Serving (Full-Stack Unified Deployment) ───────────────
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

const server = app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
server.on('error', (err) => console.error('Server error:', err));
setInterval(() => {}, 1000 * 60 * 60);
// ready
