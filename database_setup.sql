-- ============================================
-- QueueWatch SA — Database Setup Script
-- Run this in SSMS on server: Shanita
-- ============================================

-- Create the database
CREATE DATABASE QueueWatchSA;
GO

USE QueueWatchSA;
GO

-- ============================================
-- TABLE 1: Users
-- ============================================
CREATE TABLE Users (
  UserID      INT IDENTITY(1,1) PRIMARY KEY,
  FullName    NVARCHAR(100)  NOT NULL,
  Email       NVARCHAR(150)  NOT NULL UNIQUE,
  Password    NVARCHAR(255)  NOT NULL, -- will store hashed password
  Role        NVARCHAR(20)   NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  CreatedAt   DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- TABLE 2: Branches
-- ============================================
CREATE TABLE Branches (
  BranchID    INT IDENTITY(1,1) PRIMARY KEY,
  Name        NVARCHAR(150)  NOT NULL,
  Type        NVARCHAR(50)   NOT NULL, -- 'Home Affairs', 'SASSA', 'Clinic', 'Licensing'
  Address     NVARCHAR(255),
  Latitude    DECIMAL(10,7),
  Longitude   DECIMAL(10,7),
  CreatedAt   DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- TABLE 3: WaitingTimeReports
-- ============================================
CREATE TABLE WaitingTimeReports (
  ReportID      INT IDENTITY(1,1) PRIMARY KEY,
  BranchID      INT            NOT NULL FOREIGN KEY REFERENCES Branches(BranchID),
  UserID        INT            NOT NULL FOREIGN KEY REFERENCES Users(UserID),
  Status        NVARCHAR(50)   NOT NULL, -- 'Quiet', 'Busy', 'Very Busy', 'System Offline'
  WaitMinutes   INT            NOT NULL DEFAULT 0,
  Notes         NVARCHAR(500),
  IsFlagged     BIT            NOT NULL DEFAULT 0,
  CreatedAt     DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- SEED DATA: Branches
-- ============================================
INSERT INTO Branches (Name, Type, Address, Latitude, Longitude) VALUES
('Home Affairs Benoni',      'Home Affairs', 'Benoni, Ekurhuleni, Gauteng',         -26.1869, 28.3200),
('SASSA Boksburg Office',    'SASSA',        'Boksburg, Ekurhuleni, Gauteng',        -26.2133, 28.2594),
('Kempton Park Licensing',   'Licensing',    'Kempton Park, Ekurhuleni, Gauteng',    -26.0997, 28.2294),
('Germiston Clinic',         'Clinic',       'Germiston, Ekurhuleni, Gauteng',       -26.2333, 28.1667),
('Home Affairs Alberton',    'Home Affairs', 'Alberton, Ekurhuleni, Gauteng',        -26.2667, 28.1167),
('SASSA Thembisa Office',    'SASSA',        'Thembisa, Ekurhuleni, Gauteng',        -25.9978, 28.2228),
('Edenvale Licensing Dept',  'Licensing',    'Edenvale, Ekurhuleni, Gauteng',        -26.1333, 28.1667),
('Brakpan Community Clinic', 'Clinic',       'Brakpan, Ekurhuleni, Gauteng',         -26.2333, 28.3667);
GO

-- ============================================
-- SEED DATA: Admin user (password: admin123)
-- Note: in production this would be properly hashed
-- ============================================
INSERT INTO Users (FullName, Email, Password, Role) VALUES
('Dev Squad Admin', 'admin@queuewatch.co.za', 'admin123', 'admin');
GO

-- ============================================
-- SEED DATA: Sample reports
-- ============================================
-- First add a sample regular user
INSERT INTO Users (FullName, Email, Password, Role) VALUES
('Thabo Mokoena', 'thabo@example.com', 'password123', 'user');
GO

INSERT INTO WaitingTimeReports (BranchID, UserID, Status, WaitMinutes, Notes) VALUES
(1, 2, 'Very Busy', 120, 'Queue outside the building'),
(1, 2, 'Very Busy', 90,  'System slow but working'),
(2, 2, 'Busy',      60,  'About 40 people ahead'),
(3, 2, 'Quiet',     20,  'Very quiet this morning'),
(4, 2, 'Very Busy', 90,  'Long queue, bring a chair'),
(6, 2, 'Busy',      45,  'Moving fairly quickly'),
(7, 2, 'Quiet',     15,  'In and out quickly'),
(8, 2, 'Busy',      75,  'Moderate queue');
GO

-- ============================================
-- VERIFY: Check everything was created
-- ============================================
SELECT 'Users'              AS TableName, COUNT(*) AS Records FROM Users
UNION ALL
SELECT 'Branches'           AS TableName, COUNT(*) AS Records FROM Branches
UNION ALL
SELECT 'WaitingTimeReports' AS TableName, COUNT(*) AS Records FROM WaitingTimeReports;
GO
