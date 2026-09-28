import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const DIGILOCKER_BASE_URL = process.env.DIGILOCKER_BASE_URL || 'https://digilocker.meripehchaan.gov.in';
const CLIENT_ID = process.env.DIGILOCKER_CLIENT_ID || 'DEMO_BIDSURE_CLIENT_ID';
const CLIENT_SECRET = process.env.DIGILOCKER_CLIENT_SECRET || 'DEMO_BIDSURE_CLIENT_SECRET';
const REDIRECT_URI = process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:5173/auth/digilocker/callback';

/**
 * Base64URL encoding without trailing padding '='
 * As specified in Meri Pehchaan API Spec Page 6
 */
export function base64UrlEncodeWithoutPadding(buffer) {
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generate PKCE code verifier and code challenge (S256)
 * Minimum 43, maximum 128 characters
 */
export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncodeWithoutPadding(hash);
  return { codeVerifier, codeChallenge };
}

/**
 * Check if real credentials are configured
 */
export function isLiveConfigured() {
  return (
    process.env.DIGILOCKER_CLIENT_ID &&
    !process.env.DIGILOCKER_CLIENT_ID.includes('YOUR_') &&
    process.env.DIGILOCKER_CLIENT_SECRET &&
    !process.env.DIGILOCKER_CLIENT_SECRET.includes('YOUR_')
  );
}

/**
 * 1. Get Authorization Code URL (Specification Page 4-7)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize
 */
export function getAuthorizationUrl(options = {}) {
  const pkce = generatePKCE();
  const state = options.state || crypto.randomBytes(16).toString('hex');
  const purpose = (options.purpose || 'Bidder Verification').replace(/[^a-zA-Z0-9 _]/g, '');
  const serviceName = (options.serviceName || 'BidSure AI Procurement Verification').replace(/[^a-zA-Z0-9 _]/g, '');
  const scope = options.scope || 'openid files.issueddocs userdetails partners.PANCR partners.DRVLC';
  const reqDocType = options.reqDocType || 'PANCR,DRVLC,INCER';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    purpose,
    service_name: serviceName,
    scope,
    req_doctype: reqDocType,
    amr: options.amr || 'mobile username',
    dl_flow: options.dlFlow || 'signin',
  });

  const authUrl = `${DIGILOCKER_BASE_URL}/public/oauth2/1/authorize?${params.toString()}`;

  return {
    authUrl,
    codeVerifier: pkce.codeVerifier,
    codeChallenge: pkce.codeChallenge,
    state
  };
}

/**
 * 2. Get Access Token (OpenID Connect Protocol v2 & v1) (Page 7-11)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/2/token
 */
export async function getAccessToken({ code, codeVerifier, version = 2 }) {
  if (!isLiveConfigured()) {
    // Realistic mock conforming 100% to Meri Pehchaan Spec Page 9 & 11
    return {
      success: true,
      mode: 'mock',
      data: {
        access_token: 'dl_mock_token_' + crypto.randomBytes(16).toString('hex'),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid files.issueddocs partners.PANCR partners.DRVLC userdetails',
        consent_valid_till: Math.floor(Date.now() / 1000) + 86400 * 30,
        refresh_token: 'dl_mock_refresh_' + crypto.randomBytes(16).toString('hex'),
        digilockerid: 'DL-IND-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        name: 'M/S BHARAT INFRATECH PVT LTD (Authorized Signatory: Rajesh Sharma)',
        dob: '15081982',
        gender: 'M',
        eaadhaar: 'Y',
        new_account: 'N',
        reference_key: crypto.randomBytes(24).toString('hex'),
        mobile: '9876543210',
        purpose: 'Bidder Document Verification',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJkaWdpbG9ja2VyIiwibmFtZSI6IlJhamVzaCBTaGFybWEiLCJpanRpIjoiMTIzNCJ9.signature'
      }
    };
  }

  const endpoint = `${DIGILOCKER_BASE_URL}/public/oauth2/${version}/token`;
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    ...(codeVerifier ? { code_verifier: codeVerifier } : {})
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token exchange failed');
  return { success: true, mode: 'live', data };
}

/**
 * 3. Refresh Access Token (Page 11-13)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/1/token
 */
export async function refreshAccessToken(refreshToken) {
  if (!isLiveConfigured()) {
    return {
      access_token: 'dl_mock_refreshed_' + crypto.randomBytes(16).toString('hex'),
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'userdetails files.issueddocs partners.PANCR',
      consent_valid_till: Math.floor(Date.now() / 1000) + 86400 * 30,
      refresh_token: 'dl_mock_refresh_' + crypto.randomBytes(16).toString('hex'),
      digilockerid: 'DL-IND-778942',
      name: 'Rajesh Sharma',
      dob: '15081982',
      gender: 'M',
      eaadhaar: 'Y'
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/token`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Refresh failed');
  return data;
}

/**
 * 4. Revoke Token & Revoke Session (Page 13-14)
 */
export async function revokeToken(token, tokenTypeHint = 'access_token') {
  if (!isLiveConfigured()) {
    return { success: true, message: 'Mock token revoked successfully' };
  }

  const authHeader = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    token,
    token_type_hint: tokenTypeHint
  });

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/revoke`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  return { success: res.ok, status: res.status };
}

export function getLogoutUrl() {
  return `${DIGILOCKER_BASE_URL}/signin/logout/Y?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
}

/**
 * 5. Get User Details (Page 14-16)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/1/user
 */
export async function getUserDetails(accessToken) {
  if (!isLiveConfigured() || !accessToken || accessToken.startsWith('dl_mock_')) {
    return {
      digilockerid: 'DL-93f03390c-6d92-11e9-a85e-09457a564506',
      name: 'Rajesh Kumar Sharma',
      dob: '15081982',
      gender: 'M',
      eaadhaar: 'Y',
      reference_key: '2a33349e7e606a8ad2e30e3c84521f9377450cf09083e162e0a9b1480ce0f972',
      mobile: '9876543210',
      email: 'rajesh.sharma@bharatinfratech.in',
      company_designation: 'Managing Director & Authorized Bidder'
    };
  }

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/user`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to fetch user details');
  return data;
}

/**
 * 6. Get APAAR Details (Academic Bank of Credits / Student ID) (Page 16-19)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/1/apaar
 */
export async function getApaarDetails(accessToken) {
  if (!isLiveConfigured() || !accessToken || accessToken.startsWith('dl_mock_')) {
    return {
      status: 'success',
      status_code: '200',
      message: 'Record Found Successfully.',
      apaar_id: '234815190012',
      student_details: {
        name: 'ANJALI KUMARI',
        dob: '23/09/1998',
        gender: 'Female',
        created_on: '2025-04-24 10:01:10',
        cumulative_credit_points: 165.8,
        cumulative_credit: 21,
        cumulative_grade_points: 39.5
      },
      academic_details: [
        {
          university_name: 'Indian Institute of Technology / National eGovernance Uni',
          org_id: '003356',
          courses: [
            {
              name: 'MASTER OF TECHNOLOGY IN CIVIL INFRASTRUCTURE',
              subjects: [
                {
                  name: 'PROJECT MANAGEMENT & PUBLIC PROCUREMENT',
                  credit_points: 29,
                  credit: '4',
                  grade_points: '8.5',
                  grade: 'A+',
                  stream: 'INFRASTRUCTURE',
                  session: '2022-2023',
                  year: '2024',
                  month: 'NOVEMBER',
                  sem: 'I'
                }
              ]
            }
          ]
        }
      ]
    };
  }

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/apaar`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to fetch APAAR details');
  return data;
}

/**
 * 7. Get List of Issued Documents (Page 22-24)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/2/files/issued
 */
export async function getIssuedDocuments(accessToken) {
  if (!isLiveConfigured() || !accessToken || accessToken.startsWith('dl_mock_')) {
    return {
      items: [
        {
          name: 'PAN Verification Record',
          type: 'file',
          size: '145200',
          date: '2026-08-15T10:30:00Z',
          parent: '',
          mime: 'application/pdf',
          uri: 'in.gov.pan-PANCR-AABCB1234F',
          doctype: 'PANCR',
          description: 'Permanent Account Number Card',
          issuerid: 'in.gov.pan',
          issuer: 'Income Tax Department'
        },
        {
          name: 'GST Registration Certificate',
          type: 'file',
          size: '320140',
          date: '2026-07-20T12:00:00Z',
          parent: '',
          mime: 'application/pdf',
          uri: 'in.gov.gstn-GSTCR-27AABCB1234F1Z8',
          doctype: 'GSTCR',
          description: 'GST Registration Certificate (Form REG-06)',
          issuerid: 'in.gov.gst',
          issuer: 'Goods and Services Tax Network'
        },
        {
          name: 'Udyam MSME Registration Certificate',
          type: 'file',
          size: '198400',
          date: '2026-06-10T09:15:00Z',
          parent: '',
          mime: 'application/pdf',
          uri: 'in.gov.msme-UDYAM-MH-02-0012345',
          doctype: 'UDYAM',
          description: 'MSME Udyam Registration Certificate',
          issuerid: 'in.gov.msme',
          issuer: 'Ministry of Micro, Small and Medium Enterprises'
        },
        {
          name: 'Class XII Passing Certificate',
          type: 'file',
          size: '245600',
          date: '2018-05-12T15:50:38Z',
          parent: '',
          mime: 'application/pdf',
          uri: 'in.gov.cbse-HSCER-201412345678',
          doctype: 'HSCER',
          description: 'Class XII Marksheet / Certificate',
          issuerid: 'in.gov.cbse',
          issuer: 'CBSE'
        }
      ]
    };
  }

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/2/files/issued`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to fetch issued documents');
  return data;
}

/**
 * 8. Get List of Self Uploaded Documents (Page 20-22)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/1/files/{id}
 */
export async function getSelfUploadedDocuments(accessToken, folderId = '') {
  if (!isLiveConfigured() || !accessToken || accessToken.startsWith('dl_mock_')) {
    return {
      directory: '/',
      items: [
        {
          name: 'Procurement Bid Documents',
          type: 'dir',
          id: '5678',
          size: '1240000',
          date: '2026-09-20T10:15:00Z',
          parent: 'root',
          mime: '',
          uri: '',
          description: 'Bidder Submission Folder',
          issuer: ''
        },
        {
          name: 'CA_Audited_Turnover_FY2025.pdf',
          type: 'file',
          id: '9921',
          size: '450210',
          date: '2026-09-22T14:20:00Z',
          parent: 'root',
          mime: 'application/pdf',
          uri: 'in.gov.digilocker-OTHER-9921849120',
          description: 'CA Certified Turnover Statement',
          issuer: ''
        },
        {
          name: 'Non_Debarment_Affidavit.pdf',
          type: 'file',
          id: '9922',
          size: '185300',
          date: '2026-09-24T11:05:00Z',
          parent: 'root',
          mime: 'application/pdf',
          uri: 'in.gov.digilocker-OTHER-9922849121',
          description: 'Non-Debarment / Integrity Undertaking',
          issuer: ''
        }
      ]
    };
  }

  const url = folderId
    ? `${DIGILOCKER_BASE_URL}/public/oauth2/1/files/${folderId}`
    : `${DIGILOCKER_BASE_URL}/public/oauth2/1/files`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to list files');
  return data;
}

/**
 * 9. Get File from URI with HMAC-SHA256 verification (Page 24-25)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/1/file/uri
 */
export async function getFileFromUri(accessToken, uri) {
  if (!isLiveConfigured() || !accessToken || accessToken.startsWith('dl_mock_')) {
    return {
      uri,
      status: 'verified',
      contentType: 'application/pdf',
      verifiedHmac: true,
      message: 'DigiLocker authentic issued document verified.'
    };
  }

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/file/uri?uri=${encodeURIComponent(uri)}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || `Failed to fetch file for URI ${uri}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const hmacHeader = res.headers.get('hmac');

  // Verify HMAC if provided
  let hmacValid = true;
  if (hmacHeader) {
    const computedHmac = crypto.createHmac('sha256', CLIENT_SECRET).update(buffer).digest('base64');
    hmacValid = computedHmac === hmacHeader;
  }

  return {
    buffer,
    contentType: res.headers.get('content-type') || 'application/pdf',
    contentLength: res.headers.get('content-length'),
    hmacValid
  };
}

/**
 * 10. Pull Document into DigiLocker (Page 29-31)
 * URL: https://digilocker.meripehchaan.gov.in/public/oauth2/1/pull/pulldocument
 */
export async function pullDocument(accessToken, { orgid, doctype, consent = 'Y', params = {} }) {
  if (!isLiveConfigured() || !accessToken || accessToken.startsWith('dl_mock_')) {
    return {
      success: true,
      uri: `in.gov.${orgid}-${doctype}-${Date.now()}`,
      status: 200,
      message: 'Document pulled successfully and stored into DigiLocker.'
    };
  }

  const formData = new URLSearchParams({
    orgid,
    doctype,
    consent,
    ...params
  });

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/pull/pulldocument`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Pull document failed');
  return data;
}

/**
 * 11. DigiLocker Meta APIs (Page 31-42)
 * All Meta APIs use SHA-256 HMAC for authentication
 */

// Helper to compute SHA-256 string hash for Meta APIs
function sha256Hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Get List of Issuers (Page 31-33)
 */
export async function getIssuers() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const hmac = sha256Hash(`${CLIENT_SECRET}${CLIENT_ID}${ts}`);

  if (!isLiveConfigured()) {
    return {
      issuers: [
        {
          orgid: '000018',
          issuerid: 'in.gov.cbse',
          name: 'Central Board of Secondary Education, Delhi',
          category: 'Education,Central Government',
          description: 'CBSE marksheet, passing certificates etc.'
        },
        {
          orgid: '000001',
          issuerid: 'in.gov.pan',
          name: 'Income Tax Department, Govt of India',
          category: 'Central Government',
          description: 'PAN verification records and e-PAN'
        },
        {
          orgid: '000002',
          issuerid: 'in.gov.gst',
          name: 'Goods and Services Tax Network (GSTN)',
          category: 'Central Government,Finance',
          description: 'GST Registration Certificates and GSTR-3B filings'
        },
        {
          orgid: '000003',
          issuerid: 'in.gov.msme',
          name: 'Ministry of MSME (Udyam Registration)',
          category: 'Central Government,Commerce',
          description: 'Udyam MSME Registration Certificate'
        }
      ]
    };
  }

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/pull/issuers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ clientid: CLIENT_ID, ts, hmac }).toString()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to fetch issuers');
  return data;
}

/**
 * Get List of Documents Provided by an Issuer (Page 33-35)
 */
export async function getIssuerDocTypes(orgid) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const hmac = sha256Hash(`${CLIENT_SECRET}${CLIENT_ID}${orgid}${ts}`);

  if (!isLiveConfigured()) {
    return {
      documents: [
        { doctype: 'PANCR', description: 'PAN Verification Record' },
        { doctype: 'GSTCR', description: 'GST Registration Certificate' },
        { doctype: 'UDYAM', description: 'Udyam MSME Certificate' },
        { doctype: 'INCER', description: 'Income Certificate' }
      ]
    };
  }

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/oauth2/1/pull/doctype`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ clientid: CLIENT_ID, orgid, ts, hmac }).toString()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to fetch doctypes');
  return data;
}

/**
 * Get DigiLocker Statistics (Page 39-42)
 */
export async function getDigiLockerStatistics() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const hmac = sha256Hash(`${CLIENT_SECRET}${CLIENT_ID}${ts}`);

  if (!isLiveConfigured()) {
    return {
      users: '287410290',
      authentic_documents: '6820475277',
      issuers: '2430',
      requesters: '1850',
      count_as_on: new Date().toLocaleDateString('en-GB')
    };
  }

  const res = await fetch(`${DIGILOCKER_BASE_URL}/public/statistics/1/counts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ clientid: CLIENT_ID, ts, hmac }).toString()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to fetch statistics');
  return data;
}
