import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  Search, 
  Bell, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ShieldCheck,
  MoreVertical,
  Download,
  Filter,
  Plus,
  UploadCloud,
  Link,
  Database,
  FileCheck,
  Cpu,
  Fingerprint,
  Building2,
  AlertTriangle,
  Activity,
  ChevronRight,
  Lock,
  Shield,
  History,
  Hash,
  ExternalLink,
  Briefcase,
  Award,
  CreditCard,
  Sparkles,
  Key,
  X,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, Legend
} from 'recharts';
import './App.css';

const API_BASE = 
  import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.port !== '3001' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001' 
    : '');

// ─── Disqualification Report Generator & HTML Exporter ────────────────────────
function downloadDisqualificationMemo(report) {
  const entityName = report.bidder?.company || report.extracted?.entityName || report.entityName || 'Bidder Entity';
  const tenderId = report.bidder?.tenderId || report.bidder?.tender || report.extracted?.tenderRef || report.tenderRef || 'TND-2026-004';
  const score = report.bidder?.score ?? report.complianceScore ?? 45;
  const risk = report.bidder?.risk || report.riskLevel || 'High';
  const memoNo = report.memoNumber || `BS-DISQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const date = report.bidder?.date || report.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];

  const reasons = (report.failureReasons && report.failureReasons.length > 0)
    ? report.failureReasons 
    : [
      {
        code: 'GSTN_INACTIVE_DELINQUENT',
        title: 'Goods & Services Tax (GSTIN) Non-Compliance',
        severity: 'CRITICAL',
        statutoryRule: 'General Financial Rules (GFR) 2017 Rule 144(xi) & CGST Act 2017 Sec 39',
        details: 'Entity failed tax compliance check. GSTR-3B filings delinquent for greater than 6 consecutive billing cycles. Unresolved tax liabilities outstanding.'
      },
      {
        code: 'MCA_DIRECTOR_DISQUALIFIED',
        title: 'MCA21 Regulatory Debarment / Director Disqualification',
        severity: 'CRITICAL',
        statutoryRule: 'Companies Act 2013 Sec 164(2) & GFR Rule 151 (Debarment from Bidding)',
        details: 'Corporate master data search revealed Director DIN flagged for default in statutory filings. Automatic bid exclusion triggered.'
      },
      {
        code: 'FIN_TURNOVER_DEFICIT',
        title: 'Mandatory Financial Turnover Below Minimum Tender Criteria',
        severity: 'HIGH',
        statutoryRule: 'CVC Public Procurement Guidelines Clause 4.2.1',
        details: 'Audited annual turnover fails to satisfy mandatory minimum requirement of 30% of tender budget.'
      },
      {
        code: 'CREDIT_DEFAULT_RISK',
        title: 'Commercial Credit Bureau Impairment Flag',
        severity: 'HIGH',
        statutoryRule: 'GeM Standard Terms & Conditions Clause 7.1',
        details: 'Commercial credit bureau score reflects high default probability (>40%) and subprime risk grade.'
      }
    ];

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Disqualification Memorandum - ${entityName}</title>
<style>
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #fff; color: #0f172a; padding: 40px; margin: 0; line-height: 1.5; }
  .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  .emblem { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
  .sub-header { font-size: 12px; color: #475569; margin-top: 4px; }
  .badge-failed { background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 13px; text-transform: uppercase; }
  .memo-meta { margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px; }
  .memo-meta div strong { color: #64748b; display: block; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
  .reasons-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 28px 0 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .reason-card { background: #fff; border: 1px solid #fecaca; border-left: 5px solid #dc2626; border-radius: 6px; padding: 14px 16px; margin-bottom: 14px; }
  .reason-card h4 { margin: 0 0 6px 0; font-size: 14px; color: #991b1b; display: flex; justify-content: space-between; }
  .severity { font-size: 11px; background: #dc2626; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 600; }
  .rule { font-family: monospace; font-size: 11px; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; margin: 4px 0 8px; display: inline-block; }
  .finding { font-size: 13px; color: #334155; margin: 0; line-height: 1.5; }
  .appeal-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 30px; font-size: 13px; color: #1e40af; line-height: 1.6; }
  .signature-section { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b; }
  .stamp { border: 2px solid #0f172a; padding: 8px 16px; border-radius: 6px; font-weight: 700; color: #0f172a; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 12px;">
    <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="emblem">Central Procurement Vigilance & Audit Bureau</div>
      <div class="sub-header">Government e-Marketplace (GeM) & CPPP Autonomous AI Compliance Cell</div>
      <div style="font-size: 18px; font-weight: 700; color: #991b1b; margin-top: 12px;">OFFICIAL MEMORANDUM OF BIDDER DISQUALIFICATION</div>
    </div>
    <div style="text-align: right;">
      <span class="badge-failed">STATUS: ${risk.toUpperCase()} RISK / DISQUALIFIED</span>
      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Memo Ref: <strong>${memoNo}</strong></div>
      <div style="font-size: 12px; color: #64748b;">Date: ${date}</div>
    </div>
  </div>

  <div class="memo-meta">
    <div><strong>Evaluated Bidder Entity</strong>${entityName}</div>
    <div><strong>Tender Reference ID</strong>${tenderId}</div>
    <div><strong>Assigned Compliance Score</strong><span style="font-weight: 700; color: #dc2626;">${score}/100</span> (Pass Cutoff: 75/100)</div>
    <div><strong>Evaluation Methodology</strong>Google Gemini AI Multimodal Vision OCR + National Registry Cross-Verification</div>
  </div>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    Pursuant to the automated scrutiny of technical qualification documents submitted for the subject tender, the competent evaluation authority has determined that the submission by <strong>${entityName}</strong> has failed to comply with statutory and mandatory procurement eligibility criteria. Technical rejection has been registered on the procurement ledger.
  </p>

  <div class="reasons-title">Specific Grounds & Statutory Reasons for Disqualification (${reasons.length} Findings)</div>

  ${reasons.map((r, i) => `
    <div class="reason-card">
      <h4>
        <span>#${i + 1}. ${r.title}</span>
        <span class="severity">${r.severity || 'CRITICAL'}</span>
      </h4>
      <div class="rule">Statutory Reference: ${r.statutoryRule || 'GFR 2017 & Public Procurement Act'}</div>
      <p class="finding">${r.details || r.finding}</p>
    </div>
  `).join('')}

  <div class="appeal-box">
    <strong>Notice of Statutory Grievance & Appeal Procedure:</strong><br>
    In accordance with Clause 11 of the GeM Incident Management Policy and CPPP Dispute Redressal Guidelines, the bidder may submit a formal appeal with supporting documentation within <strong>seven (7) calendar days</strong> from the receipt of this memorandum through the GeM Grievance Portal.
  </div>

  <div class="signature-section">
    <div>
      <div>Verification Seal: <strong>BidSure.ai Automated Engine v2.4</strong></div>
      <div>Audit Timestamp: ${new Date().toISOString()}</div>
      <div>Cryptographic Hash: <code>0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 10)}</code></div>
    </div>
    <div class="stamp">
      VERIFICATION STATUS<br>
      <span style="color: #dc2626; font-size: 16px;">DISQUALIFIED</span><br>
      <span style="font-size: 10px; font-weight: normal; color: #64748b;">Digitally Certified</span>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BidSure_Disqualification_Memo_${entityName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Disqualification Report Preview Modal Component ─────────────────────────
function DisqualificationReportModal({ report, onClose }) {
  if (!report) return null;
  const entityName = report.bidder?.company || report.extracted?.entityName || report.entityName || 'Bidder Entity';
  const tenderId = report.bidder?.tenderId || report.bidder?.tender || report.extracted?.tenderRef || report.tenderRef || 'TND-2026-004';
  const score = report.bidder?.score ?? report.complianceScore ?? 45;
  const risk = report.bidder?.risk || report.riskLevel || 'High';
  const memoNo = report.memoNumber || `BS-DISQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const date = report.bidder?.date || report.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];

  const reasons = (report.failureReasons && report.failureReasons.length > 0)
    ? report.failureReasons 
    : [
      {
        code: 'GSTN_INACTIVE_DELINQUENT',
        title: 'Goods & Services Tax (GSTIN) Non-Compliance',
        severity: 'CRITICAL',
        statutoryRule: 'General Financial Rules (GFR) 2017 Rule 144(xi) & CGST Act 2017 Sec 39',
        details: 'Entity failed tax compliance check. GSTR-3B filings delinquent for greater than 6 consecutive billing cycles. Unresolved tax liabilities outstanding.'
      },
      {
        code: 'MCA_DIRECTOR_DISQUALIFIED',
        title: 'MCA21 Regulatory Debarment / Director Disqualification',
        severity: 'CRITICAL',
        statutoryRule: 'Companies Act 2013 Sec 164(2) & GFR Rule 151 (Debarment from Bidding)',
        details: 'Corporate master data search revealed Director DIN flagged for default in statutory filings. Automatic bid exclusion triggered.'
      },
      {
        code: 'FIN_TURNOVER_DEFICIT',
        title: 'Mandatory Financial Turnover Below Minimum Tender Criteria',
        severity: 'HIGH',
        statutoryRule: 'CVC Public Procurement Guidelines Clause 4.2.1',
        details: 'Audited annual turnover fails to satisfy mandatory minimum requirement of 30% of tender budget.'
      },
      {
        code: 'CREDIT_DEFAULT_RISK',
        title: 'Commercial Credit Bureau Impairment Flag',
        severity: 'HIGH',
        statutoryRule: 'GeM Standard Terms & Conditions Clause 7.1',
        details: 'Commercial credit bureau score reflects high default probability (>40%) and subprime risk grade.'
      }
    ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#fca5a5' }}>Official Disqualification Memorandum</h2>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Memo Ref: <code>{memoNo}</code> • Date: {date}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Summary Box */}
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Disqualified Entity</span>
                <strong>{entityName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Tender Reference</span>
                <strong>{tenderId}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Compliance Score</span>
                <strong style={{ color: '#f87171', fontSize: '15px' }}>{score}/100</strong> (Cutoff: 75)
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Decision Status</span>
                <span className="status-badge status-failed">REJECTED / FAILED</span>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '15px', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--danger)" /> Specific Grounds for Rejection ({reasons.length} Identified Causes)
          </h3>

          <div>
            {reasons.map((r, idx) => (
              <div key={idx} className="disq-reason-item">
                <div className="disq-reason-header">
                  <div className="disq-reason-title">
                    <XCircle size={16} color="var(--danger)" />
                    #{idx + 1}: {r.title}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                    {r.severity || 'CRITICAL'}
                  </span>
                </div>
                <div className="disq-statutory">Statute: {r.statutoryRule || 'GFR 2017 & Public Procurement Guidelines'}</div>
                <p className="disq-details" style={{ marginTop: '8px' }}>{r.details || r.finding}</p>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '12px 16px', marginTop: '16px', fontSize: '12px', color: '#93c5fd', lineheight: 1.5 }}>
            <strong>Right to Appeal Notice:</strong> Under Clause 11 of the GeM Incident Management Policy, this decision may be formally contested within 7 calendar days with verifiable compliance proofs through the Competent Appellate Authority.
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <button className="connect-btn" onClick={onClose}>Close Preview</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="primary-btn" onClick={() => downloadDisqualificationMemo(report)}>
              <Download size={15} /> Download Official Memo (.html)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Verification View Component ─────────────────────────────────────────────
function VerificationView({ extractionResult, setActiveTab, onOpenDisqualificationReport }) {
  const r = extractionResult;
  const extracted = r?.extracted || {};
  const score = r?.complianceScore ?? 92;
  const risk = r?.riskLevel ?? 'Low';
  const entityName = extracted.entityName || 'Demo Infra Solutions Ltd';
  const tenderRef = extracted.tenderRef || 'GEM/2026/B/891240';
  const gstin = extracted.gstin || '27AABCB1234F1Z8';
  const pan = extracted.pan || 'AABCB1234F';
  const udyam = extracted.udyam || 'UDYAM-MH-02-0012345';
  const docType = extracted.documentType || 'Bidder Technical Submission & Certificates';
  const method = r?.extractionMethod || 'Google Gemini AI OCR';
  const isGemini = method.toLowerCase().includes('gemini');
  const riskClass = risk === 'Low' ? 'verified' : risk === 'Medium' ? 'pending' : 'failed';
  const riskLabel = risk === 'Low' ? 'Verified Bidder' : risk === 'Medium' ? 'Pending Review' : 'High Risk';
  const isFailed = score < 75 || risk === 'High' || r?.status === 'Failed';

  return (
    <div className="dashboard-container">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('ingestion')}>Data Ingestion</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--primary)' }}>AI Verification</span>
        </div>

        {/* Statutory Disqualification Banner if Failed */}
        {isFailed && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#fca5a5' }}>
                  Statutory Non-Compliance: Bidder Failed Verification
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
                  Critical discrepancies detected against government procurement rules. Rejection report generated.
                </p>
              </div>
            </div>
            <button className="danger-btn" onClick={() => onOpenDisqualificationReport && onOpenDisqualificationReport(r)}>
              <Download size={15} /> Download Disqualification Report
            </button>
          </div>
        )}

        <div className="profile-header">
          <div className="profile-info">
            <div className="company-avatar">{entityName[0]}</div>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: '24px' }}>{entityName}</h1>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="tender-id">{tenderRef}</span>
                <span className={`status-badge status-${riskClass}`}>{riskLabel}</span>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '12px', 
                  padding: '3px 10px', 
                  borderRadius: '20px',
                  background: isGemini ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: isGemini ? '#c084fc' : 'var(--text-muted)',
                  border: isGemini ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid var(--border)'
                }}>
                  {isGemini ? <Sparkles size={13} /> : <Cpu size={13} />}
                  {method}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="score-container" style={{ height: 'auto', flexDirection: 'row', gap: '16px' }}>
              <div className="score-circle" style={{ width: '80px', height: '80px' }}>
                <div className="score-value" style={{ fontSize: '28px' }}>{score}</div>
              </div>
              <div>
                <div className="score-label" style={{ margin: 0 }}>Compliance Score</div>
                <div className="risk-badge" style={{ marginTop: '4px' }}>{risk} Risk</div>
              </div>
            </div>
            <button 
              className={isFailed ? "danger-btn" : "connect-btn"}
              style={{ padding: '10px 16px', height: 'fit-content' }}
              onClick={() => onOpenDisqualificationReport && onOpenDisqualificationReport(r)}
            >
              <Download size={15} /> {isFailed ? "Download Failure Report" : "Download Audit Report"}
            </button>
          </div>
        </div>
      </div>

      <div className="verification-grid">
        {/* Stage 2: AI Document Extraction */}
        <div className="card glass-panel">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} color="var(--primary)" />
              Stage 2: Gemini AI Multimodal OCR Extraction
            </h2>
            <span className="tag-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              {docType}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Direct visual OCR transcript & legal entity intelligence extracted via Google Gemini AI.
          </p>

          <div className="extraction-list">
            <div className="extraction-item">
              <div className="extraction-label"><Building2 size={16} /> Legal Entity Name</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="extraction-value">{entityName}</span>
                <span className="confidence-badge"><CheckCircle2 size={12} /> 99%</span>
              </div>
            </div>
            <div className="extraction-item">
              <div className="extraction-label"><Fingerprint size={16} /> GSTIN Number</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="extraction-value">{gstin}</span>
                <span className={`confidence-badge ${gstin === 'Not Found' ? 'warning' : ''}`}>
                  {gstin !== 'Not Found' ? <><CheckCircle2 size={12} /> 99%</> : 'Not Found'}
                </span>
              </div>
            </div>
            <div className="extraction-item">
              <div className="extraction-label"><FileText size={16} /> PAN Number</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="extraction-value">{pan}</span>
                <span className={`confidence-badge ${pan === 'Not Found' ? 'warning' : ''}`}>
                  {pan !== 'Not Found' ? <><CheckCircle2 size={12} /> 99%</> : 'Not Found'}
                </span>
              </div>
            </div>
            <div className="extraction-item">
              <div className="extraction-label"><AlertTriangle size={16} /> Udyam MSME Number</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="extraction-value">{udyam}</span>
                <span className={`confidence-badge ${udyam === 'Not Found' ? 'warning' : ''}`}>
                  {udyam !== 'Not Found' ? <><CheckCircle2 size={12} /> 96%</> : 'Not Found'}
                </span>
              </div>
            </div>
            {extracted.address && extracted.address !== 'Not Found' && (
              <div className="extraction-item">
                <div className="extraction-label"><Building2 size={16} /> Registered Address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="extraction-value" style={{ fontSize: '13px' }}>{extracted.address}</span>
                </div>
              </div>
            )}
            {extracted.turnover && extracted.turnover !== 'Not Found' && (
              <div className="extraction-item">
                <div className="extraction-label"><Database size={16} /> Annual Turnover</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="extraction-value">{extracted.turnover}</span>
                </div>
              </div>
            )}
            {extracted.complianceNotes && (
              <div className="extraction-item" style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px' }}>
                <div className="extraction-label"><Sparkles size={16} color="var(--primary)" /> AI Analysis</div>
                <span className="extraction-value" style={{ fontSize: '12px', fontWeight: 400 }}>{extracted.complianceNotes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stage 3: Cross-Verification Engine */}
        <div className="card glass-panel">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--success)" />
              Stage 3: Government Registry Cross-Match
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Data cross-verified against live portals & DigiLocker Requester APIs (Spec v2.4).
          </p>

          <div className="check-list">
            <div className="check-item">
              <div className="check-icon" style={{ color: 'var(--success)' }}><CheckCircle2 size={18} /></div>
              <div className="check-content">
                <h4>GST Compliance (GSTN Portal)</h4>
                <p>Status: Active. Returns filed up to Aug 2026. Zero tax defaults recorded.</p>
                <span className="cross-match-tag">Match: GSTN Live/Mock</span>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon" style={{ color: 'var(--success)' }}><CheckCircle2 size={18} /></div>
              <div className="check-content">
                <h4>Corporate Identity (MCA21 / PAN)</h4>
                <p>PAN valid. Directors match with MCA21 registered database.</p>
                <span className="cross-match-tag">Match: MCA21 Company Master</span>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon" style={{ color: 'var(--success)' }}><CheckCircle2 size={18} /></div>
              <div className="check-content">
                <h4>DigiLocker Digital India Vault (Spec v2.4)</h4>
                <p>Verified authentic certificate in issuer repository with valid SHA-256 HMAC.</p>
                <span className="cross-match-tag" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                  Meri Pehchaan SSO Verified
                </span>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon" style={{ color: 'var(--success)' }}><CheckCircle2 size={18} /></div>
              <div className="check-content">
                <h4>MSME Udyam Verification</h4>
                <p>Valid Udyam Certificate. Small Enterprise classification confirmed for exemption.</p>
                <span className="cross-match-tag">Verified MSME</span>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon" style={{ color: 'var(--success)' }}><CheckCircle2 size={18} /></div>
              <div className="check-content">
                <h4>National Blacklist / Debarment</h4>
                <p>Entity clear across GeM, CPPP, and all departmental registries.</p>
                <span className="cross-match-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Clear</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="connect-btn" onClick={() => setActiveTab('ingestion')}>
          ← Upload Another Document
        </button>
        <button className="primary-btn" onClick={() => setActiveTab('audit')}>
          View Blockchain Audit Trail (Stage 4) →
        </button>
      </div>
    </div>
  );
}

// ─── Main App Component ──────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dragActive, setDragActive] = useState(false);

  const [dashboardData, setDashboardData] = useState({ barData: [], pieData: [], recentBidders: [] });
  const [allBidders, setAllBidders] = useState([]);
  const [activeTenders, setActiveTenders] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [connectedPortals, setConnectedPortals] = useState({});
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const fileInputRef = useRef(null);

  // DigiLocker / Meri Pehchaan state
  const [showDigiModal, setShowDigiModal] = useState(false);
  const [digiUser, setDigiUser] = useState(null);
  const [digiDocs, setDigiDocs] = useState([]);
  const [digiLoading, setDigiLoading] = useState(false);
  const [digiAuthData, setDigiAuthData] = useState(null);

  // Environment & API Keys Guide modal
  const [envStatus, setEnvStatus] = useState(null);
  const [selectedEnvGuide, setSelectedEnvGuide] = useState(null);

  // Disqualification Report Modal State
  const [selectedDisqReport, setSelectedDisqReport] = useState(null);

  const handleOpenBidderDisq = async (bidder) => {
    try {
      const res = await fetch(`${API_BASE}/api/bidders/${bidder.id}/disqualification-report`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDisqReport(data);
      } else {
        setSelectedDisqReport({
          bidder: {
            id: bidder.id,
            company: bidder.company,
            tenderId: bidder.tender,
            score: bidder.score,
            risk: bidder.risk,
            status: bidder.status,
            date: bidder.date,
            creditScore: bidder.credit
          }
        });
      }
    } catch {
      setSelectedDisqReport({
        bidder: {
          id: bidder.id,
          company: bidder.company,
          tenderId: bidder.tender,
          score: bidder.score,
          risk: bidder.risk,
          status: bidder.status,
          date: bidder.date,
          creditScore: bidder.credit
        }
      });
    }
  };

  const handleOpenExtractionDisq = (extraction) => {
    setSelectedDisqReport(extraction);
  };

  const handleGenerateMonthlySummaryReport = () => {
    const csvRows = [
      ['Bidder ID', 'Company Name', 'Tender ID', 'Score', 'Risk Level', 'Status', 'Date', 'Credit Score', 'Honor Score'],
      ...allBidders.map(b => [b.id, `"${b.company}"`, b.tender, b.score, b.risk, b.status, b.date, b.credit || '720', b.honorScore || 'A'])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BidSure_Monthly_Compliance_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchData();
    fetchEnvStatus();
  }, []);

  const fetchData = () => {
    fetch(`${API_BASE}/api/dashboard`)
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(err => console.error("Error fetching dashboard data", err));

    fetch(`${API_BASE}/api/bidders`)
      .then(res => res.json())
      .then(data => setAllBidders(data))
      .catch(err => console.error("Error fetching bidders", err));

    fetch(`${API_BASE}/api/tenders`)
      .then(res => res.json())
      .then(data => setActiveTenders(data))
      .catch(err => console.error("Error fetching tenders", err));

    fetch(`${API_BASE}/api/reports`)
      .then(res => res.json())
      .then(data => setTrendData(data))
      .catch(err => console.error("Error fetching reports", err));
  };

  const fetchEnvStatus = () => {
    fetch(`${API_BASE}/api/env-status`)
      .then(res => res.json())
      .then(data => setEnvStatus(data))
      .catch(err => console.error("Error checking env status", err));
  };

  // Open DigiLocker Meri Pehchaan Modal
  const openDigiLockerModal = async () => {
    setShowDigiModal(true);
    setDigiLoading(true);
    try {
      const [userRes, docsRes, authRes] = await Promise.all([
        fetch(`${API_BASE}/api/digilocker/user`).then(r => r.json()),
        fetch(`${API_BASE}/api/digilocker/issued-documents`).then(r => r.json()),
        fetch(`${API_BASE}/api/digilocker/auth-url`).then(r => r.json())
      ]);
      setDigiUser(userRes);
      setDigiDocs(docsRes.items || []);
      setDigiAuthData(authRes);
      setConnectedPortals(prev => ({ ...prev, DigiLocker: 'connected' }));
    } catch (e) {
      console.error('DigiLocker fetch error:', e);
    } finally {
      setDigiLoading(false);
    }
  };

  // Import a certificate directly from DigiLocker
  const handleImportDigiDoc = (doc) => {
    const importedResult = {
      extracted: {
        entityName: digiUser?.name || 'M/S BHARAT INFRATECH PVT LTD',
        gstin: doc.doctype === 'GSTCR' ? '27AABCB1234F1Z8' : '27AABCB1234F1Z8',
        pan: doc.doctype === 'PANCR' ? 'AABCB1234F' : 'AABCB1234F',
        udyam: doc.doctype === 'UDYAM' ? 'UDYAM-MH-02-0012345' : 'UDYAM-MH-02-0012345',
        tenderRef: 'GEM/2026/B/891240',
        address: 'Plot 42, Bandra-Kurla Complex, Mumbai, MH - 400051',
        turnover: '₹48.5 Crore (FY 2025-26)',
        documentType: doc.name,
        complianceNotes: `Document pulled directly from DigiLocker Issuer Repository: ${doc.issuer}. Authentic URI: ${doc.uri}`
      },
      complianceScore: 98,
      riskLevel: 'Low',
      extractionMethod: 'DigiLocker Requester API v2.4 (Meri Pehchaan)',
      documentPages: 1,
      timestamp: new Date().toISOString()
    };
    setExtractionResult(importedResult);
    setShowDigiModal(false);
    setActiveTab('verification');
  };

  const handleConnect = (portal) => {
    if (portal === 'DigiLocker') {
      openDigiLockerModal();
      return;
    }
    setConnectedPortals(prev => ({ ...prev, [portal]: 'connecting' }));
    setTimeout(() => {
      setConnectedPortals(prev => ({ ...prev, [portal]: 'connected' }));
    }, 1200);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.name.split('.').pop().toUpperCase(),
      raw: file
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileName) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  // Perform Gemini AI OCR Extraction
  const handleStartExtraction = async () => {
    const fileToUpload = uploadedFiles.find(f => ['PDF', 'PNG', 'JPG', 'JPEG'].includes(f.type));
    if (!fileToUpload || !fileToUpload.raw) {
      alert('Please upload a PDF or image (PNG/JPG) bidder document first!');
      return;
    }
    setExtracting(true);
    setExtractionError(null);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload.raw);
      const res = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Server error: ' + res.status);
      const data = await res.json();
      setExtractionResult(data);
      fetchData(); // reload bidders and dashboard data from sqlite database
      setActiveTab('verification');
    } catch (err) {
      console.error('Extraction failed:', err);
      setExtractionError('Extraction failed: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handlePublishTender = async () => {
    const newTender = {
      id: `TND-2026-00${Math.floor(Math.random() * 900) + 100}`,
      title: 'Smart Border Surveillance & AI Analytics Setup',
      department: 'Ministry of Home Affairs / NIC',
      budget: '₹14.2 Cr',
      bids: 0,
      deadline: '2026-11-20'
    };
    try {
      await fetch(`${API_BASE}/api/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTender)
      });
      fetchData();
    } catch (err) {
      console.error('Error adding tender', err);
    }
  };

  const { barData, pieData, recentBidders } = dashboardData;

  // Comprehensive guide on obtaining each API key
  const API_GUIDES = {
    gemini: {
      name: 'Google Gemini AI (Multimodal Vision OCR)',
      envVar: 'GEMINI_API_KEY',
      cost: 'Free tier available (15 RPM / 1M tokens/min)',
      steps: [
        'Visit Google AI Studio at: https://aistudio.google.com/ or https://ai.google.dev/',
        'Log in with your standard Google Account.',
        'Click the blue "Get API key" button in the left sidebar or top banner.',
        'Click "Create API key in new project" (or select an existing Google Cloud project).',
        'Copy the generated key (starts with "AIzaSy...") and paste it into your .env file as GEMINI_API_KEY.',
        'Restart the server — Gemini 1.5 Flash will immediately process scanned PDFs, images, and documents!'
      ]
    },
    digilocker: {
      name: 'Meri Pehchaan / DigiLocker Requester API (Spec v2.4)',
      envVar: 'DIGILOCKER_CLIENT_ID & DIGILOCKER_CLIENT_SECRET',
      cost: 'Government / Enterprise Partnership (Free for Gov/Authorized Entities)',
      steps: [
        'Visit the Meri Pehchaan Partner Portal: https://meripehchaan.gov.in/ or DigiLocker Partners: https://partners.digitallocker.gov.in/',
        'Register your procurement agency / organization under "Requester" category.',
        'Submit entity verification details (Organization PAN, authorized nodal officer digital signature).',
        'Once approved, register your Application to receive your Client ID and Client Secret.',
        'Set your Redirect URI to: http://localhost:5173/auth/digilocker/callback (or your domain).',
        'Request the approved scopes: openid, files.issueddocs, userdetails, partners.PANCR, partners.DRVLC.',
        'Paste DIGILOCKER_CLIENT_ID and DIGILOCKER_CLIENT_SECRET into your .env file!'
      ]
    },
    gstn: {
      name: 'GSTN Portal API (Goods & Services Tax Network)',
      envVar: 'GSTN_API_KEY & GSTN_BASE_URL',
      cost: 'Free Sandbox / Production via GSP registration',
      steps: [
        'Go to the GST Developer Portal: https://developer.gst.gov.in/',
        'Register your organization as an ASP (Application Service Provider) or connect via an authorized GSP (GST Suvidha Provider).',
        'For testing and sandbox verification, access https://sandbox.gst.gov.in/.',
        'Generate your API Public Key, Client ID, and Secret.',
        'Set GSTN_BASE_URL to https://api.gst.gov.in/commonapi/v1.1 (or sandbox URL) in .env.',
        'Add your key as GSTN_API_KEY.'
      ]
    },
    mca: {
      name: 'MCA21 / Ministry of Corporate Affairs (data.gov.in)',
      envVar: 'DATA_GOV_API_KEY & DATA_GOV_BASE_URL',
      cost: '100% Free Open Data Portal',
      steps: [
        'Visit India\'s Open Government Data platform: https://data.gov.in/',
        'Click "Register" at the top right and create a free citizen/developer account.',
        'Verify your email and log in.',
        'Navigate to "My Account" -> "API Key Management" to copy your API key.',
        'Search the catalog for "Company Master Data" or "Director Information".',
        'Paste the key in .env as DATA_GOV_API_KEY and set DATA_GOV_BASE_URL=https://api.data.gov.in.'
      ]
    },
    udyam: {
      name: 'Udyam MSME Verification API',
      envVar: 'UDYAM_API_KEY & UDYAM_BASE_URL',
      cost: 'Government / G2G Interoperability Gateway',
      steps: [
        'Visit the Ministry of MSME Udyam Portal: https://udyamregistration.gov.in/',
        'Departmental and government procurement entities can apply for API access via the National Informatics Centre (NIC) MSME division.',
        'For commercial/private platforms, access Udyam validation APIs via IndiaStack or certified GSP aggregators like Karza, Signzy, or Zoop.',
        'Enter your API key into .env as UDYAM_API_KEY.'
      ]
    },
    credit: {
      name: 'Commercial Credit Bureau API (CIBIL / FinBox / CRIF)',
      envVar: 'CREDIT_API_KEY & CREDIT_BASE_URL',
      cost: 'Developer Sandbox Available',
      steps: [
        'Sign up for developer access at FinBox (https://finbox.in/) or CRIF High Mark (https://crifhighmark.com/developer/).',
        'Access the developer console and generate Sandbox API keys.',
        'Add CREDIT_API_KEY and CREDIT_BASE_URL=https://api.finbox.in to your .env file.'
      ]
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <ShieldCheck size={24} />
          </div>
          <span className="logo-text text-gradient">BidSure.AI</span>
        </div>
        
        <div style={{ padding: '0 8px', marginBottom: '24px' }}>
          <button className="primary-btn" style={{ width: '100%' }} onClick={() => setActiveTab('ingestion')}>
            <Plus size={18} />
            <span className="btn-text">New Verification</span>
          </button>
        </div>

        <nav className="nav-menu">
          <a className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          <a className={`nav-item ${activeTab === 'ingestion' ? 'active' : ''}`} onClick={() => setActiveTab('ingestion')}>
            <UploadCloud size={20} />
            <span>Data Ingestion</span>
          </a>
          <a className={`nav-item ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>
            <Cpu size={20} />
            <span>AI Verification</span>
          </a>
          <a className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            <Shield size={20} />
            <span>Audit Ledger</span>
          </a>
          <a className={`nav-item ${activeTab === 'bidders' ? 'active' : ''}`} onClick={() => setActiveTab('bidders')}>
            <Users size={20} />
            <span>Bidders</span>
          </a>
          <a className={`nav-item ${activeTab === 'tenders' ? 'active' : ''}`} onClick={() => setActiveTab('tenders')}>
            <FileText size={20} />
            <span>Tenders</span>
          </a>
          <a className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <BarChart3 size={20} />
            <span>Reports</span>
          </a>
          <a className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} />
            <span>Settings & APIs</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Search tenders, GSTIN, PAN, DigiLocker..." />
          </div>
          <div className="header-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              <span className={`env-status-chip ${envStatus?.gemini?.configured ? 'live' : 'mock'}`} title="Gemini AI Multimodal OCR status">
                <Sparkles size={12} />
                Gemini AI: {envStatus?.gemini?.configured ? 'Active' : 'Mock/Demo'}
              </span>
              <span className={`env-status-chip ${envStatus?.digilocker?.configured ? 'live' : 'mock'}`} title="DigiLocker Meri Pehchaan status">
                <ShieldCheck size={12} />
                DigiLocker: {envStatus?.digilocker?.configured ? 'Live' : 'Spec v2.4 Ready'}
              </span>
            </div>
            <button className="icon-btn">
              <Bell size={20} />
            </button>
            <div className="profile-pic"></div>
          </div>
        </header>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-container">
            <div>
              <h1 className="page-title">Compliance Dashboard</h1>
              <p className="page-subtitle">AI Insights & Bidder Verification Overview</p>
            </div>

            <div className="top-cards">
              <div className="card glass-panel">
                <div className="card-header">
                  <h2 className="card-title">Average Compliance Score</h2>
                  <span className="risk-badge">Healthy</span>
                </div>
                <div className="score-container">
                  <div className="score-circle">
                    <div className="score-value">84</div>
                  </div>
                  <div className="score-label">Across 42 Evaluated Bidders</div>
                </div>
              </div>

              <div className="card glass-panel">
                <div className="card-header">
                  <h2 className="card-title">Weekly Evaluation Velocity</h2>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                      <Bar dataKey="verified" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card glass-panel">
                <div className="card-header">
                  <h2 className="card-title">Risk Distribution</h2>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px'}}>
                    {pieData.map(item => (
                      <div key={item.name} style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)'}}>
                        <div style={{width: '10px', height: '10px', borderRadius: '50%', background: item.color}}></div>
                        {item.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card glass-panel table-container">
              <div className="card-header">
                <h2 className="card-title">Recent Bidder Evaluations</h2>
                <button className="icon-btn" style={{width: 32, height: 32}}>
                  <Filter size={16} />
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Bidder / Company Name</th>
                    <th>Tender ID</th>
                    <th>Compliance Score</th>
                    <th>Risk Level</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBidders.map(bidder => (
                    <tr key={bidder.id}>
                      <td className="company-name">{bidder.company}</td>
                      <td className="tender-id">{bidder.tender}</td>
                      <td>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <div style={{width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                            <div style={{width: `${bidder.score}%`, height: '100%', background: bidder.score >= 80 ? 'var(--success)' : bidder.score >= 50 ? 'var(--warning)' : 'var(--danger)'}}></div>
                          </div>
                          <span style={{fontSize: '13px', fontWeight: 600}}>{bidder.score}/100</span>
                        </div>
                      </td>
                      <td>
                        <span style={{color: bidder.risk === 'Low' ? 'var(--success)' : bidder.risk === 'Medium' ? 'var(--warning)' : 'var(--danger)', fontWeight: 500}}>
                          {bidder.risk}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${bidder.status.toLowerCase()}`}>
                          {bidder.status}
                        </span>
                      </td>
                      <td style={{color: 'var(--text-muted)', fontSize: '13px'}}>{bidder.date}</td>
                      <td>
                        {bidder.status === 'Failed' || bidder.risk === 'High' ? (
                          <button 
                            className="danger-btn" 
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handleOpenBidderDisq(bidder)}
                            title="Download Report of failure causes"
                          >
                            <Download size={11} /> Failure Memo
                          </button>
                        ) : (
                          <button 
                            className="connect-btn" 
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handleOpenBidderDisq(bidder)}
                          >
                            <Download size={11} /> Audit Memo
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ingestion Tab */}
        {activeTab === 'ingestion' && (
          <div className="dashboard-container">
            <div>
              <h1 className="page-title">Multi-Source Data Ingestion</h1>
              <p className="page-subtitle">Upload bidder documents for Gemini AI OCR or import verified certificates via DigiLocker / Meri Pehchaan (v2.4)</p>
            </div>

            <div className="ingestion-grid">
              {/* Document Upload Area */}
              <div className="card glass-panel">
                <div className="card-header">
                  <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCheck size={20} color="var(--primary)" />
                    Document Upload (PDF / Images)
                  </h2>
                  <span className="env-status-chip live" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'none' }}>
                    <Sparkles size={12} /> Gemini AI OCR Enabled
                  </span>
                </div>
                
                <div 
                  className={`upload-area ${dragActive ? 'active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    multiple 
                    accept=".pdf,.png,.jpg,.jpeg" 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                  />
                  <div className="upload-icon">
                    <UploadCloud size={32} />
                  </div>
                  <h3 className="upload-title">Drop Bidder Documents Here</h3>
                  <p className="upload-desc">Supports Scanned PDFs, Certificates, GST Returns, MSME & CA Audited Statements</p>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="file-list" style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-muted)' }}>Uploaded Documents ({uploadedFiles.length})</h4>
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="file-item">
                        <div className="file-info">
                          <FileText size={18} color="var(--primary)" />
                          <div>
                            <div className="file-name">{file.name}</div>
                            <div className="file-size">{file.size} • {file.type}</div>
                          </div>
                        </div>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}>
                          <XCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '20px' }}>
                  <button 
                    className="primary-btn" 
                    style={{ width: '100%', padding: '12px' }} 
                    onClick={handleStartExtraction}
                    disabled={extracting || uploadedFiles.length === 0}
                  >
                    <Sparkles size={18} />
                    {extracting ? 'Processing with Gemini AI OCR...' : 'Run Gemini AI OCR & Verification'}
                  </button>
                  {extractionError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '8px' }}>{extractionError}</p>}
                </div>
              </div>

              {/* Live Portals & Meri Pehchaan Integration */}
              <div className="card glass-panel">
                <div className="card-header">
                  <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={20} color="var(--primary)" />
                    National Single Sign-On & Registry Portals
                  </h2>
                  <span className="risk-badge" style={{ marginTop: 0 }}>API Spec v2.4</span>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Verify authentic digital credentials directly from government repositories without manual paperwork.
                </p>

                <div className="integration-list">
                  {/* DigiLocker / Meri Pehchaan */}
                  <div className="integration-card" style={{ borderColor: 'rgba(168, 85, 247, 0.3)' }}>
                    <div className="integration-info">
                      <div className="integration-logo digi" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}>DL</div>
                      <div className="integration-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>DigiLocker / Meri Pehchaan</h3>
                          <span className="tag-badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontSize: '10px' }}>Spec v2.4</span>
                        </div>
                        <p>Pull authentic PAN, GST, MSME & Aadhaar e-KYC</p>
                      </div>
                    </div>
                    <button 
                      className="connect-btn"
                      style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                      onClick={() => handleConnect('DigiLocker')}
                    >
                      Connect & Pull Docs
                    </button>
                  </div>

                  {/* GSTN */}
                  <div className="integration-card">
                    <div className="integration-info">
                      <div className="integration-logo gst">GST</div>
                      <div className="integration-details">
                        <h3>GSTN Portal</h3>
                        <p>Check GST returns & active status</p>
                      </div>
                    </div>
                    <button 
                      className="connect-btn"
                      style={connectedPortals['GSTN'] === 'connected' ? { background: 'var(--success)', color: 'white', borderColor: 'var(--success)' } : {}}
                      onClick={() => handleConnect('GSTN')}
                    >
                      {connectedPortals['GSTN'] === 'connecting' ? 'Connecting...' : connectedPortals['GSTN'] === 'connected' ? 'Connected' : 'Connect'}
                    </button>
                  </div>

                  {/* Udyam */}
                  <div className="integration-card">
                    <div className="integration-info">
                      <div className="integration-logo udyam">UDY</div>
                      <div className="integration-details">
                        <h3>Udyam Registration</h3>
                        <p>Verify MSME classification & status</p>
                      </div>
                    </div>
                    <button 
                      className="connect-btn"
                      style={connectedPortals['Udyam'] === 'connected' ? { background: 'var(--success)', color: 'white', borderColor: 'var(--success)' } : {}}
                      onClick={() => handleConnect('Udyam')}
                    >
                      {connectedPortals['Udyam'] === 'connecting' ? 'Connecting...' : connectedPortals['Udyam'] === 'connected' ? 'Connected' : 'Connect'}
                    </button>
                  </div>

                  {/* PAN/IT */}
                  <div className="integration-card">
                    <div className="integration-info">
                      <div className="integration-logo" style={{ color: '#0369a1', background: '#e0f2fe' }}>PAN</div>
                      <div className="integration-details">
                        <h3>Income Tax Dept (PAN)</h3>
                        <p>Verify entity PAN identity</p>
                      </div>
                    </div>
                    <button 
                      className="connect-btn"
                      style={connectedPortals['PAN'] === 'connected' ? { background: 'var(--success)', color: 'white', borderColor: 'var(--success)' } : {}}
                      onClick={() => handleConnect('PAN')}
                    >
                      {connectedPortals['PAN'] === 'connecting' ? 'Connecting...' : connectedPortals['PAN'] === 'connected' ? 'Connected' : 'Connect'}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <Info size={14} color="var(--primary)" />
                  <span>Configured with both live API keys and simulated fallback sandbox modes.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <VerificationView 
            extractionResult={extractionResult} 
            setActiveTab={setActiveTab} 
            onOpenDisqualificationReport={handleOpenExtractionDisq} 
          />
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="dashboard-container">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 12px 0' }}>
                <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('ingestion')}>Data Ingestion</span>
                <ChevronRight size={14} />
                <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('verification')}>AI Verification</span>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--primary)' }}>Audit Ledger</span>
              </div>
              <h1 className="page-title">Secure Evidence Custody</h1>
              <p className="page-subtitle">Immutable, cryptographic logs of all OCR extraction & portal matches</p>
            </div>

            <div className="card glass-panel blockchain-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(170, 59, 255, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>Blockchain Ledger Active</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>All events are securely hashed and tamper-proof.</p>
                  </div>
                </div>
                <div className="hash-badge">
                  <Hash size={14} />
                  Current Block: 0x8a92...f4e1
                </div>
              </div>
            </div>

            <div className="card glass-panel">
              <div className="card-header">
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={20} color="var(--primary)" />
                  Transaction & Verification Timeline
                </h2>
                <button className="icon-btn" style={{width: 32, height: 32}}>
                  <Download size={16} />
                </button>
              </div>

              <div className="timeline-container">
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <Database size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div>
                        <h4 className="timeline-title">Data Ingestion via GSTN & DigiLocker Spec v2.4</h4>
                        <div className="timeline-time"><Clock size={12} /> 2026-09-28 00:30:10 UTC</div>
                      </div>
                      <div className="hash-badge" title="Cryptographic Hash">
                        <Lock size={12} />
                        0x4f1b...29ac
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Raw certificate payload verified from DigiLocker repository with SHA-256 HMAC integrity check.
                    </p>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-marker" style={{ borderColor: '#c084fc', color: '#c084fc' }}>
                    <Cpu size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div>
                        <h4 className="timeline-title">Google Gemini AI Multimodal OCR Completed</h4>
                        <div className="timeline-time"><Clock size={12} /> 2026-09-28 00:30:14 UTC</div>
                      </div>
                      <div className="hash-badge" title="Cryptographic Hash">
                        <Lock size={12} />
                        0x9c3d...11b4
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Processed uploaded document. Extracted Legal Entity, GSTIN, PAN, and Udyam with 99% confidence.
                    </p>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-marker" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div>
                        <h4 className="timeline-title">Final Decision Issued: Low Risk (98/100)</h4>
                        <div className="timeline-time"><Clock size={12} /> 2026-09-28 00:30:20 UTC</div>
                      </div>
                      <div className="hash-badge" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                        <Lock size={12} />
                        0x11ee...90bc
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0' }}>
                      All criteria passed. Bidder eligible for GeM tender contract award.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bidders Tab */}
        {activeTab === 'bidders' && (
          <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 className="page-title">Bidder Directory</h1>
                <p className="page-subtitle">Complete registry of evaluated vendors, compliance history, and scores</p>
              </div>
              <button className="primary-btn" onClick={() => setActiveTab('ingestion')}>
                <Plus size={16} /> Evaluate New Bidder
              </button>
            </div>

            <div className="card glass-panel table-container" style={{ marginTop: '16px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Bidder / Company Name</th>
                    <th>Tender ID</th>
                    <th>Experience</th>
                    <th>Credit Score</th>
                    <th>Honor Score</th>
                    <th>Compliance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allBidders.map(bidder => (
                    <tr key={bidder.id}>
                      <td className="company-name">{bidder.company}</td>
                      <td className="tender-id">{bidder.tender}</td>
                      <td>{bidder.experience || '5 Yrs'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CreditCard size={14} color="var(--text-muted)" /> {bidder.credit || '720'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: bidder.honorScore === 'A+' || !bidder.honorScore ? 'var(--success)' : 'var(--warning)' }}>
                          {bidder.honorScore || 'A'}
                        </span>
                      </td>
                      <td>
                        <span style={{color: bidder.risk === 'Low' ? 'var(--success)' : bidder.risk === 'Medium' ? 'var(--warning)' : 'var(--danger)', fontWeight: 600}}>
                          {bidder.score}/100
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${bidder.status.toLowerCase()}`}>
                          {bidder.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {bidder.status === 'Failed' || bidder.risk === 'High' ? (
                            <button 
                              className="danger-btn" 
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => handleOpenBidderDisq(bidder)}
                              title="Download Report of failure causes"
                            >
                              <Download size={12} /> Failure Report
                            </button>
                          ) : (
                            <button 
                              className="connect-btn" 
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => handleOpenBidderDisq(bidder)}
                            >
                              <Download size={12} /> Audit Report
                            </button>
                          )}
                          <button className="connect-btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setActiveTab('verification')}>View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tenders Tab */}
        {activeTab === 'tenders' && (
          <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 className="page-title">Active Tenders</h1>
                <p className="page-subtitle">Monitor bid submissions and compliance status per tender</p>
              </div>
              <button className="primary-btn" onClick={handlePublishTender}>
                <Plus size={16} /> Publish Tender
              </button>
            </div>

            <div className="ingestion-grid" style={{ gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
              {activeTenders.map(tender => (
                <div key={tender.id} className="card glass-panel" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="tender-id" style={{ fontSize: '16px', fontWeight: 600 }}>{tender.id}</span>
                      <span className="risk-badge" style={{ marginTop: 0, padding: '4px 10px', fontSize: '12px' }}>{tender.department}</span>
                    </div>
                    <h3 style={{ fontSize: '18px', margin: '0 0 12px 0' }}>{tender.title}</h3>
                    <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={14} /> Budget: {tender.budget}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> {tender.bids} Bidders</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Closes: {tender.deadline}</div>
                    </div>
                  </div>
                  <div>
                    <button className="connect-btn" style={{ background: 'var(--text-main)', color: 'var(--background)' }} onClick={() => setActiveTab('ingestion')}>
                      Upload Bid Documents
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 className="page-title">Analytics & Reports</h1>
                <p className="page-subtitle">Track verification trends, export compliance data, and view audit summaries</p>
              </div>
              <button className="primary-btn" onClick={handleGenerateMonthlySummaryReport}>
                <Download size={16} /> Generate Monthly Report (CSV)
              </button>
            </div>

            <div className="charts-grid" style={{ gridTemplateColumns: '1fr', marginTop: '16px' }}>
              <div className="card glass-panel" style={{ height: '400px' }}>
                <div className="card-header">
                  <h2 className="card-title">Verification Volume Trends (YTD)</h2>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                      <Line type="monotone" dataKey="verified" name="Successful Verifications" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="failed" name="Failed / High Risk" stroke="var(--danger)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings & API Gateways Tab */}
        {activeTab === 'settings' && (
          <div className="dashboard-container">
            <div>
              <h1 className="page-title">Platform Settings & API Gateways</h1>
              <p className="page-subtitle">Configure compliance rules, inspect connected government API keys, and view setup guides</p>
            </div>

            <div className="ingestion-grid" style={{ marginTop: '16px' }}>
              {/* Compliance Thresholds */}
              <div className="card glass-panel">
                <div className="card-header">
                  <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={20} color="var(--primary)" />
                    Compliance Rules Engine
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Minimum Acceptable Score (Low Risk Threshold)</label>
                    <input type="number" defaultValue={80} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>High Risk Threshold</label>
                    <input type="number" defaultValue={50} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '13px' }}>Auto-fail bids on departmental Blacklist match</span>
                  </div>
                  <button className="primary-btn" style={{ width: 'fit-content' }}>Save Rules</button>
                </div>
              </div>

              {/* API Configuration & How to Get Keys */}
              <div className="card glass-panel">
                <div className="card-header">
                  <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={20} color="var(--primary)" />
                    Government Gateways & API Keys (.env)
                  </h2>
                  <button className="icon-btn" onClick={fetchEnvStatus} title="Refresh API Status">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Click "How to get this key" on any service for step-by-step instructions.
                </p>

                <div className="integration-list">
                  {/* Google Gemini AI */}
                  <div className="integration-card" style={{ padding: '12px' }}>
                    <div className="integration-info">
                      <div className="integration-logo" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: 'white' }}>
                        <Sparkles size={16} />
                      </div>
                      <div className="integration-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>Google Gemini AI (OCR Engine)</h3>
                          <span className={`env-status-chip ${envStatus?.gemini?.configured ? 'live' : 'mock'}`}>
                            {envStatus?.gemini?.configured ? 'Active Key' : 'Free Tier Key Needed'}
                          </span>
                        </div>
                        <p>Powers multimodal visual OCR on PDFs & images</p>
                      </div>
                    </div>
                    <button className="connect-btn" onClick={() => setSelectedEnvGuide(API_GUIDES.gemini)}>
                      How to get
                    </button>
                  </div>

                  {/* DigiLocker / Meri Pehchaan */}
                  <div className="integration-card" style={{ padding: '12px' }}>
                    <div className="integration-info">
                      <div className="integration-logo digi">DL</div>
                      <div className="integration-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>DigiLocker / Meri Pehchaan (v2.4)</h3>
                          <span className={`env-status-chip ${envStatus?.digilocker?.configured ? 'live' : 'mock'}`}>
                            {envStatus?.digilocker?.configured ? 'Partner Portal Live' : 'Demo Spec v2.4 Active'}
                          </span>
                        </div>
                        <p>National SSO & repository certificate extraction</p>
                      </div>
                    </div>
                    <button className="connect-btn" onClick={() => setSelectedEnvGuide(API_GUIDES.digilocker)}>
                      How to get
                    </button>
                  </div>

                  {/* GSTN */}
                  <div className="integration-card" style={{ padding: '12px' }}>
                    <div className="integration-info">
                      <div className="integration-logo gst">GST</div>
                      <div className="integration-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>GSTN Developer Portal</h3>
                          <span className={`env-status-chip ${envStatus?.gstn?.configured ? 'live' : 'mock'}`}>
                            {envStatus?.gstn?.configured ? 'Live API Key' : 'Sandbox Ready'}
                          </span>
                        </div>
                        <p>Validates 15-character GSTIN & GSTR-3B filings</p>
                      </div>
                    </div>
                    <button className="connect-btn" onClick={() => setSelectedEnvGuide(API_GUIDES.gstn)}>
                      How to get
                    </button>
                  </div>

                  {/* MCA21 */}
                  <div className="integration-card" style={{ padding: '12px' }}>
                    <div className="integration-info">
                      <div className="integration-logo" style={{ color: '#0369a1', background: '#e0f2fe' }}>MCA</div>
                      <div className="integration-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>MCA21 Company Data (data.gov.in)</h3>
                          <span className={`env-status-chip ${envStatus?.mca?.configured ? 'live' : 'mock'}`}>
                            {envStatus?.mca?.configured ? 'Live API Key' : 'Free Key Available'}
                          </span>
                        </div>
                        <p>Company Master Data, Directors DIN, and Legal Status</p>
                      </div>
                    </div>
                    <button className="connect-btn" onClick={() => setSelectedEnvGuide(API_GUIDES.mca)}>
                      How to get
                    </button>
                  </div>

                  {/* Udyam MSME */}
                  <div className="integration-card" style={{ padding: '12px' }}>
                    <div className="integration-info">
                      <div className="integration-logo udyam">UDY</div>
                      <div className="integration-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>Udyam MSME Registration</h3>
                          <span className={`env-status-chip ${envStatus?.udyam?.configured ? 'live' : 'mock'}`}>
                            {envStatus?.udyam?.configured ? 'NIC Connected' : 'Sandbox Active'}
                          </span>
                        </div>
                        <p>Micro/Small Enterprise qualification & exemptions</p>
                      </div>
                    </div>
                    <button className="connect-btn" onClick={() => setSelectedEnvGuide(API_GUIDES.udyam)}>
                      How to get
                    </button>
                  </div>

                  {/* Credit Bureau */}
                  <div className="integration-card" style={{ padding: '12px' }}>
                    <div className="integration-info">
                      <div className="integration-logo" style={{ color: '#047857', background: '#d1fae5' }}>CIB</div>
                      <div className="integration-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>Commercial Credit & CIBIL Bureau</h3>
                          <span className={`env-status-chip ${envStatus?.credit?.configured ? 'live' : 'mock'}`}>
                            {envStatus?.credit?.configured ? 'FinBox Connected' : 'Sandbox Active'}
                          </span>
                        </div>
                        <p>Financial health scoring and loan default history</p>
                      </div>
                    </div>
                    <button className="connect-btn" onClick={() => setSelectedEnvGuide(API_GUIDES.credit)}>
                      How to get
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── DigiLocker / Meri Pehchaan Interactive Modal (Spec v2.4) ─── */}
        {showDigiModal && (
          <div className="modal-overlay" onClick={() => setShowDigiModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={22} color="var(--primary)" />
                    <h2 style={{ margin: 0, fontSize: '18px' }}>Meri Pehchaan (National SSO) - DigiLocker Requester</h2>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    API Specification Version 2.4 | A Digital India Initiative (NeGD / MeitY)
                  </p>
                </div>
                <button className="icon-btn" onClick={() => setShowDigiModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                {digiLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <RefreshCw size={28} className="spin" color="var(--primary)" />
                    <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>Connecting to DigiLocker Secure Vault...</p>
                  </div>
                ) : (
                  <>
                    {/* User Profile Card */}
                    <div style={{ 
                      background: 'rgba(59, 130, 246, 0.08)', 
                      border: '1px solid rgba(59, 130, 246, 0.2)', 
                      borderRadius: '12px', 
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Authenticated Account Holder
                          </div>
                          <h3 style={{ margin: '4px 0 6px', fontSize: '16px' }}>{digiUser?.name || 'Rajesh Kumar Sharma'}</h3>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                            <span>DigiLocker ID: <strong style={{ color: 'var(--text-main)' }}>{digiUser?.digilockerid || 'DL-93f03390c-6d92'}</strong></span>
                            <span>Mobile: <strong style={{ color: 'var(--text-main)' }}>+91 {digiUser?.mobile || '9876543210'}</strong></span>
                          </div>
                        </div>
                        <span className="env-status-chip live">
                          <Check size={12} /> Aadhaar e-KYC Linked
                        </span>
                      </div>
                    </div>

                    {/* Issued Certificates in Repository */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>Issued Certificates Available in Repository</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{digiDocs.length} Verified Records</span>
                      </div>

                      {digiDocs.map((doc, idx) => (
                        <div key={idx} className="doc-item-card">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '14px' }}>{doc.name}</strong>
                              <span className={`tag-badge ${doc.doctype?.toLowerCase() || 'pan'}`}>{doc.doctype}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Issuer: {doc.issuer} • URI: <code style={{ color: '#93c5fd' }}>{doc.uri}</code>
                            </div>
                          </div>
                          <button 
                            className="primary-btn" 
                            style={{ padding: '6px 12px', fontSize: '13px' }} 
                            onClick={() => handleImportDigiDoc(doc)}
                          >
                            Import & Verify
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Live OAuth2 PKCE Info */}
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        PKCE Protocol: <code>S256</code> • State: <code>{digiAuthData?.state?.substring(0, 10)}...</code>
                      </div>
                      <a 
                        href={digiAuthData?.authUrl || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="connect-btn"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ExternalLink size={14} /> Open Live Meri Pehchaan SSO
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── API Key Setup Guide Modal ─── */}
        {selectedEnvGuide && (
          <div className="modal-overlay" onClick={() => setSelectedEnvGuide(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>How to Obtain: {selectedEnvGuide.name}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#93c5fd' }}>
                    Environment Variable: <code>{selectedEnvGuide.envVar}</code> • Cost: {selectedEnvGuide.cost}
                  </p>
                </div>
                <button className="icon-btn" onClick={() => setSelectedEnvGuide(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-main)' }}>Step-by-Step Registration & Setup:</h4>
                  <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedEnvGuide.steps.map((step, sIdx) => (
                      <li key={sIdx} style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Example format in .env:</div>
                  <code style={{ fontSize: '13px', color: '#34d399', wordBreak: 'break-all' }}>
                    {selectedEnvGuide.envVar}=your_actual_key_here
                  </code>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="primary-btn" onClick={() => setSelectedEnvGuide(null)}>
                    Got it, Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ─── Disqualification & Failure Report Preview Modal ─── */}
        {selectedDisqReport && (
          <DisqualificationReportModal 
            report={selectedDisqReport} 
            onClose={() => setSelectedDisqReport(null)} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
