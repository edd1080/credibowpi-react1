# Requirements Document

## Introduction

This specification defines the comprehensive credit application form system for CrediBowpi Mobile. The system implements a 6-stage process with free navigation, real-time auto-save as drafts, and live validations. The form system enables field agents to collect complete customer information for credit applications with an intuitive, mobile-first interface that works seamlessly offline.

The system replaces traditional paper-based processes with a digital solution that maintains data integrity, provides visual progress indicators, and ensures all required information is captured before submission.

## Requirements

### Requirement 1: Multi-Stage Form Navigation System

**User Story:** As a field agent, I want to navigate freely between different sections of the credit application form, so that I can complete information in any order and return to previous sections as needed.

#### Acceptance Criteria

1. WHEN the agent opens a credit application form THEN the system SHALL display 6 main stages: Identification, Finances, Business, Guarantors, Documents, and Review
2. WHEN the agent selects any stage from the navigation dropdown THEN the system SHALL navigate to that stage without losing current progress
3. WHEN the agent is in a multi-step stage THEN the system SHALL show sub-step navigation within that stage
4. WHEN the agent navigates between stages THEN the system SHALL maintain visual indicators showing completed, active, and pending stages
5. WHEN the agent is on mobile THEN the system SHALL display a linear progress bar showing overall completion percentage

### Requirement 2: Personal Identification and Contact Information Capture

**User Story:** As a field agent, I want to capture complete personal identification and contact information for credit applicants, so that I can verify their identity and maintain communication throughout the process.

#### Acceptance Criteria

1. WHEN capturing basic personal data THEN the system SHALL require: Names (text only), Surnames (text only), Gender, Civil Status, DPI (13 digits with format validation), and DPI issuing department
2. WHEN the civil status is "Married" THEN the system SHALL display additional fields for spouse name and spouse work activity
3. WHEN capturing contact information THEN the system SHALL require: Mobile phone (8 digits with format validation), email (with format validation), address (minimum 10 characters), residence department, and municipality
4. WHEN selecting municipality THEN the system SHALL dynamically filter options based on the selected department
5. WHEN capturing location THEN the system SHALL automatically capture GPS coordinates from the device
6. WHEN validating DPI format THEN the system SHALL enforce real-time validation for 13-digit format: 0000 00000 0000
7. WHEN validating phone format THEN the system SHALL enforce real-time validation for 8-digit format: 0000 0000

### Requirement 3: Financial Analysis and Patrimony Assessment

**User Story:** As a field agent, I want to capture comprehensive financial information including income, expenses, assets, and liabilities, so that I can assess the applicant's financial capacity and creditworthiness.

#### Acceptance Criteria

1. WHEN capturing income information THEN the system SHALL require: Primary income source, primary income amount (Q format), and optional secondary income
2. WHEN capturing expenses THEN the system SHALL provide 10 expense categories: Food, Clothing, Basic Services, Education, Housing, Transportation, Commitments, Financial Expenses, Payroll Deductions, and Others
3. WHEN all financial data is entered THEN the system SHALL automatically calculate: Total Income, Total Expenses, Availability (Income - Expenses), and Coverage Percentage
4. WHEN calculating coverage THEN the system SHALL display a traffic light system: Green (Applies), Yellow (Review), Red (Does Not Apply)
5. WHEN capturing assets THEN the system SHALL provide 7 asset categories: Cash and bank balances, Accounts receivable, Merchandise, Movable goods, Vehicles, Real estate, Other assets
6. WHEN capturing liabilities THEN the system SHALL provide 3 liability categories: Accounts payable, Short-term debts, Long-term loans
7. WHEN patrimony data is complete THEN the system SHALL automatically calculate: Total Assets, Total Liabilities, Capital and Patrimony, Current Debt Index, and Projected Debt Index
8. WHEN debt index is calculated THEN the system SHALL display risk evaluation with colors: Green (<50%), Yellow (50-70%), Red (>70%)

### Requirement 4: Business Profile and Economic Activity Management

**User Story:** As a field agent, I want to capture detailed business information for self-employed applicants, so that I can assess their business viability and income stability.

#### Acceptance Criteria

1. WHEN starting business section THEN the system SHALL display applicant type selection: Employee or Own Business
2. WHEN "Own Business" is selected THEN the system SHALL display additional business fields: Business name, Activity type (16 CNAE categories), Years of experience, Business address
3. WHEN capturing sales data THEN the system SHALL require: Monthly cash sales and Monthly credit sales (both in Q format)
4. WHEN managing products/services THEN the system SHALL allow up to 10 dynamic entries with: Name, Unit of measure, Quantity, Unit price, Total (auto-calculated), Profit
5. WHEN capturing seasonality THEN the system SHALL require: High season months, High season sales, Low season months, Low season sales
6. WHEN capturing administrative expenses THEN the system SHALL provide 6 categories: Bonuses, Salaries, Rent, Services, Transportation, Other expenses
7. WHEN completing business analysis THEN the system SHALL provide agent-only fields: Income risk assessment (20-500 characters), Additional observations (20-500 characters)

### Requirement 5: Guarantor and Reference Management System

**User Story:** As a field agent, I want to manage multiple guarantors for each credit application, so that I can ensure adequate backing for the requested credit amount.

#### Acceptance Criteria

1. WHEN managing guarantors THEN the system SHALL require minimum 2 guarantors and allow maximum 10 guarantors
2. WHEN displaying guarantors THEN the system SHALL show individual cards with visual status badges: Pending/Complete
3. WHEN adding guarantor information THEN the system SHALL require: Full name, DPI/CUI (13 characters max), Email (format validation), Phone (format validation), Address
4. WHEN editing guarantors THEN the system SHALL allow individual editing of each guarantor
5. WHEN managing guarantor list THEN the system SHALL allow deletion only if more than 2 guarantors exist
6. WHEN navigating guarantors THEN the system SHALL provide navigation between individual guarantor forms and the main list
7. WHEN displaying progress THEN the system SHALL show visual progress status per guarantor and summary of completed vs total

### Requirement 6: Document Management and File Upload System

**User Story:** As a field agent, I want to capture and manage required documents for credit applications, so that I can ensure all necessary documentation is collected before submission.

#### Acceptance Criteria

1. WHEN managing documents THEN the system SHALL require 4 document types: Official ID, Address proof, Income proof, Bank statements
2. WHEN managing documents THEN the system SHALL allow 1 optional document type: Tax declaration
3. WHEN uploading documents THEN the system SHALL provide two options: Device camera capture or file selection
4. WHEN using camera THEN the system SHALL provide real-time preview and native camera integration
5. WHEN selecting files THEN the system SHALL accept PDF, JPG, PNG formats with maximum 5MB size
6. WHEN displaying documents THEN the system SHALL show preview thumbnails and allow document deletion
7. WHEN processing images THEN the system SHALL automatically compress images and provide quick thumbnail views
8. WHEN validating uploads THEN the system SHALL validate file formats and sizes with visual status indicators: Pending/Uploaded/Error

### Requirement 7: Final Review and Submission System

**User Story:** As a field agent, I want to review all collected information and ensure completeness before submitting the credit application, so that I can avoid incomplete submissions and ensure data quality.

#### Acceptance Criteria

1. WHEN accessing review section THEN the system SHALL automatically calculate completion percentage
2. WHEN displaying missing information THEN the system SHALL provide detailed list of missing required fields
3. WHEN validating data THEN the system SHALL enforce specific validations: DPI 13 digits, NIT 8+ digits, amounts > 0
4. WHEN displaying summary THEN the system SHALL organize information in 6 sections: Identification and Contact, Credit Information, Financial Information, Business and Economic Profile, Guarantors and References, Documents
5. WHEN showing document status THEN the system SHALL display visual indicators: green check for complete, red alert for missing
6. WHEN enabling submission THEN the system SHALL only show submit button when 100% completion is achieved
7. WHEN submitting application THEN the system SHALL automatically accept terms and perform final validation before submission

### Requirement 8: Real-time Data Persistence and Auto-save

**User Story:** As a field agent, I want all my form inputs to be automatically saved as I work, so that I don't lose progress if the app closes unexpectedly or I need to switch between applications.

#### Acceptance Criteria

1. WHEN any form field is modified THEN the system SHALL mark the form as having unsaved changes
2. WHEN working on the form THEN the system SHALL provide manual save functionality available at all times
3. WHEN data is entered THEN the system SHALL auto-save in real-time as draft without strict validations
4. WHEN reopening the application THEN the system SHALL recover the previous session state
5. WHEN changes are made THEN the system SHALL maintain version control of changes
6. WHEN connectivity is available THEN the system SHALL synchronize with the database

### Requirement 9: Form Interface and User Experience

**User Story:** As a field agent, I want an intuitive and responsive form interface that works well on mobile devices, so that I can efficiently collect information in the field.

#### Acceptance Criteria

1. WHEN displaying the form header THEN the system SHALL show: Applicant name or "New Application", formatted application ID, back button, and close button
2. WHEN showing navigation THEN the system SHALL display breadcrumb navigation: Home > Applications > [Applicant Name/New Application]
3. WHEN displaying section selector THEN the system SHALL show: Current section title, progress indicator "Step X of 6", expandable section dropdown
4. WHEN on mobile THEN the system SHALL display linear progress bar that updates dynamically
5. WHEN showing action bar THEN the system SHALL display sticky bottom bar with: Previous button (disabled on first step), Save button (always available), Next/Submit button
6. WHEN closing form THEN the system SHALL display exit dialog with options: "Exit without saving" or "Save and exit"
7. WHEN attempting to save without minimum data THEN the system SHALL show minimum data alert explaining missing information

### Requirement 10: Form Validation and Error Handling

**User Story:** As a field agent, I want real-time validation and clear error messages, so that I can correct issues immediately and ensure data quality.

#### Acceptance Criteria

1. WHEN entering DPI THEN the system SHALL validate format in real-time: 13 digits with format 0000 00000 0000
2. WHEN entering phone numbers THEN the system SHALL validate format in real-time: 8 digits with format 0000 0000
3. WHEN entering email THEN the system SHALL validate email format in real-time
4. WHEN performing financial calculations THEN the system SHALL automatically update totals and percentages
5. WHEN validating before save THEN the system SHALL check minimum required data
6. WHEN validating before submission THEN the system SHALL check consent acceptance
7. WHEN displaying errors THEN the system SHALL provide contextual error messages
8. WHEN showing validation status THEN the system SHALL use visual indicators: completed sections (green checkmark), active section (highlighted), pending sections (neutral)