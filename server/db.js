// ─── db.js — Database Connection (SQLite Auth) ───
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const poolPromise = open({
  filename: path.join(__dirname, 'database.sqlite'),
  driver: sqlite3.Database
}).then(async db => {
  console.log('✅ Connected to SQLite Database — QueueWatchSA');

  // Initialize tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      UserID      INTEGER PRIMARY KEY AUTOINCREMENT,
      FullName    TEXT NOT NULL,
      Email       TEXT NOT NULL UNIQUE,
      Password    TEXT NOT NULL,
      Role        TEXT NOT NULL DEFAULT 'user',
      CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Branches (
      BranchID    INTEGER PRIMARY KEY AUTOINCREMENT,
      Name        TEXT NOT NULL,
      Type        TEXT NOT NULL,
      Address     TEXT,
      Latitude    REAL,
      Longitude   REAL,
      CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS WaitingTimeReports (
      ReportID      INTEGER PRIMARY KEY AUTOINCREMENT,
      BranchID      INTEGER NOT NULL,
      UserID        INTEGER NOT NULL,
      Status        TEXT NOT NULL,
      WaitMinutes   INTEGER NOT NULL DEFAULT 0,
      Notes         TEXT,
      IsFlagged     INTEGER NOT NULL DEFAULT 0,
      CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(BranchID) REFERENCES Branches(BranchID),
      FOREIGN KEY(UserID) REFERENCES Users(UserID)
    );
  `);

  // Seed data if Branches is empty
  const count = await db.get('SELECT COUNT(*) as count FROM Branches');
  if (count.count === 0) {
    console.log('🌱 Seeding initial database data...');
    
    // Seed Branches
    await db.exec(`
      INSERT INTO Branches (Name, Type, Address, Latitude, Longitude) VALUES
      ('Home Affairs Benoni',      'Home Affairs', 'Benoni, Ekurhuleni, Gauteng',         -26.1869, 28.3200),
      ('SASSA Boksburg Office',    'SASSA',        'Boksburg, Ekurhuleni, Gauteng',        -26.2133, 28.2594),
      ('Kempton Park Licensing',   'Licensing',    'Kempton Park, Ekurhuleni, Gauteng',    -26.0997, 28.2294),
      ('Germiston Clinic',         'Clinic',       'Germiston, Ekurhuleni, Gauteng',       -26.2333, 28.1667),
      ('Home Affairs Alberton',    'Home Affairs', 'Alberton, Ekurhuleni, Gauteng',        -26.2667, 28.1167),
      ('SASSA Thembisa Office',    'SASSA',        'Thembisa, Ekurhuleni, Gauteng',        -25.9978, 28.2228),
      ('Edenvale Licensing Dept',  'Licensing',    'Edenvale, Ekurhuleni, Gauteng',        -26.1333, 28.1667),
      ('Brakpan Community Clinic', 'Clinic',       'Brakpan, Ekurhuleni, Gauteng',         -26.2333, 28.3667);
    `);

    // Seed Admin & Test User (with plain password so bcrypt compare will fallback to plain comparison, just like the original code allows)
    await db.exec(`
      INSERT INTO Users (FullName, Email, Password, Role) VALUES
      ('Dev Squad Admin', 'admin@queuewatch.co.za', 'admin123', 'admin'),
      ('Thabo Mokoena', 'thabo@example.com', 'password123', 'user');
    `);

    // Seed Reports
    await db.exec(`
      INSERT INTO WaitingTimeReports (BranchID, UserID, Status, WaitMinutes, Notes) VALUES
      (1, 2, 'Very Busy', 120, 'Queue outside the building'),
      (1, 2, 'Very Busy', 90,  'System slow but working'),
      (2, 2, 'Busy',      60,  'About 40 people ahead'),
      (3, 2, 'Quiet',     20,  'Very quiet this morning'),
      (4, 2, 'Very Busy', 90,  'Long queue, bring a chair'),
      (6, 2, 'Busy',      45,  'Moving fairly quickly'),
      (7, 2, 'Quiet',     15,  'In and out quickly'),
      (8, 2, 'Busy',      75,  'Moderate queue');
    `);
  }

  return db;
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});

module.exports = { poolPromise };