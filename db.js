import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.sqlite');

// Initialize DB
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database', err);
  } else {
    console.log('Connected to SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS bidders (
      id TEXT PRIMARY KEY,
      company TEXT,
      tender TEXT,
      score INTEGER,
      risk TEXT,
      status TEXT,
      date TEXT,
      experience TEXT,
      credit TEXT,
      honorScore TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY,
      title TEXT,
      department TEXT,
      budget TEXT,
      bids INTEGER,
      deadline TEXT
    )`);

    // Check if empty, then seed
    db.get("SELECT COUNT(*) AS count FROM bidders", (err, row) => {
      if (row.count === 0) {
        seedData();
      }
    });
  });
}

function seedData() {
  const bidders = [
    { id: '1', company: 'TechTufan Solutions', tender: 'TND-2026-001', score: 92, risk: 'Low', status: 'Verified', date: '2026-09-26', experience: '5 Yrs', credit: '720', honorScore: 'A' },
    { id: '2', company: 'Global Infra Ltd', tender: 'TND-2026-004', score: 45, risk: 'High', status: 'Failed', date: '2026-09-25', experience: '5 Yrs', credit: '720', honorScore: 'A' },
    { id: '3', company: 'SmartCity Corp', tender: 'TND-2026-001', score: 78, risk: 'Medium', status: 'Pending', date: '2026-09-25', experience: '5 Yrs', credit: '720', honorScore: 'A' },
    { id: '4', company: 'NextGen Systems', tender: 'TND-2026-002', score: 88, risk: 'Low', status: 'Verified', date: '2026-09-24', experience: '5 Yrs', credit: '720', honorScore: 'A' },
    { id: '5', company: 'Apex Buildwell', tender: 'TND-2026-005', score: 95, risk: 'Low', status: 'Verified', date: '2026-09-23', experience: '12 Yrs', credit: '780', honorScore: 'A+' },
    { id: '6', company: 'Zenith Logistics', tender: 'TND-2026-003', score: 62, risk: 'Medium', status: 'Pending', date: '2026-09-22', experience: '3 Yrs', credit: '640', honorScore: 'B' },
    { id: '7', company: 'Pioneer Electrics', tender: 'TND-2026-005', score: 30, risk: 'High', status: 'Failed', date: '2026-09-21', experience: '1 Yr', credit: '520', honorScore: 'C' },
  ];

  const tenders = [
    { id: 'TND-2026-001', title: 'Smart City IT Infrastructure Setup', department: 'MeitY', budget: '₹45.5 Cr', bids: 12, deadline: '2026-10-15' },
    { id: 'TND-2026-002', title: 'Solar Panel Installation (Phase 2)', department: 'MNRE', budget: '₹12.0 Cr', bids: 8, deadline: '2026-10-22' },
    { id: 'TND-2026-003', title: 'Healthcare Logistics Network', department: 'MoHFW', budget: '₹8.2 Cr', bids: 5, deadline: '2026-10-05' },
  ];

  const insertBidder = db.prepare("INSERT INTO bidders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  bidders.forEach(b => {
    insertBidder.run(b.id, b.company, b.tender, b.score, b.risk, b.status, b.date, b.experience, b.credit, b.honorScore);
  });
  insertBidder.finalize();

  const insertTender = db.prepare("INSERT INTO tenders VALUES (?, ?, ?, ?, ?, ?)");
  tenders.forEach(t => {
    insertTender.run(t.id, t.title, t.department, t.budget, t.bids, t.deadline);
  });
  insertTender.finalize();
  
  console.log('Database seeded successfully.');
}

// Helper function to convert callback to promise
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export default db;
