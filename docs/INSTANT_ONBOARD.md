# PĀTAKA PAL - INSTANT ONBOARDING (30 SECONDS)

**Last Updated:** September 30, 2025  
**Architecture Version:** Modular v1.0 (September 29, 2025)  
**Status:** Development Phase - Team Demo October 7, 2025

---

## ⚡ CRITICAL CONTEXT

**Project:** Community food sharing Progressive Web App for Pātaka Kai Movement (New Zealand charity)  
**Organization:** On The House (OTH) - Non-religious community group  
**Purpose:** Track food donations/collections, reduce waste, notify community of available food  
**Stage:** Development (NO users yet - still building)  
**Next Milestone:** Team presentation October 7, 2025 (1 week away)

---

## 🌐 DEPLOYMENTS & ENDPOINTS

**Production App:** https://lively-water-0c4589800.1.azurestaticapps.net  
**Backend API:** https://oth-pataka-api-facpcna9c9hjc5dh.australiaeast-01.azurewebsites.net/api  
**GitHub Repo:** https://github.com/oth-rex/pataka-pal  
**Database:** PatakaPalDB on patakapal-svr.database.windows.net  

---

## 🏗️ ARCHITECTURE (September 29, 2025)

### **Current Structure: Modular (9 Files)**

```
pataka-pal/
├── index.html                  → Main HTML structure, script imports
├── css/
│   └── styles.css              → All styling (~800 lines)
└── js/
    ├── config.js               → Global config, state, utilities, emoji maps
    ├── app-core.js             → Core functions, navigation, initialization
    ├── qr-scanner.js           → QR code scanning (QrScanner library)
    ├── map-functions.js        → Leaflet map, fetchCupboards, data rendering
    ├── photo-utils.js          → Photo processing utilities (ES6 exports)
    ├── donate-workflow.js      → Donation flow (4 steps)
    ├── take-workflow.js        → Collection flow (3 steps)
    └── report-workflow.js      → Issue reporting (3 steps) ✅ WORKING
```

### **Tech Stack**

- **Frontend:** Progressive Web App (vanilla HTML/CSS/JavaScript - NO frameworks)
- **Modules:** ES6 module system (type="module")
- **Backend:** Azure Functions (JavaScript/Node.js)
- **Database:** Azure SQL Database (PatakaPalDB - enterprise structure)
- **Storage:** Azure Blob Storage (issue-photos container)
- **Maps:** Leaflet with OpenStreetMap tiles
- **QR Scanner:** qr-scanner library (1.4.2)
- **AI:** Azure Computer Vision (ready for integration, using mock data currently)
- **Notifications:** Azure Communication Services (email working)

---

## ✅ WHAT WORKS (As of September 29, 2025)

1. **Report Submission** - FULLY INTEGRATED ✅
   - Backend endpoint: POST /api/ReportIssue
   - Photo upload to Azure Blob Storage
   - Email notifications to kaitiaki (info@onthehouse.org.nz CC working)
   - Issue records written to database

2. **Map View** - PARTIALLY WORKING ⚠️
   - Map pins display for 3 pātaka locations
   - Pin popups show pātaka details
   - "View details" button switches to List View
   - Issues: Blank on first load, grey areas on return

3. **QR Code Scanning** - DETECTION WORKS ✅
   - Camera permission prompts correctly
   - QR code recognition functional
   - Format: "Pataka [ID]" pattern

4. **Location Services** - WORKING ✅
   - User location permission prompt
   - Distance calculation from user to pātaka
   - Fallback to default location if denied

5. **Data Fetching** - WORKING ✅
   - GET /api/getCupboards endpoint functional
   - Returns 3 pātaka with inventory
   - Calculates distances and formats timestamps

---

## 🚨 WHAT'S BROKEN (Critical Issues)

### **1. Empty Dropdowns** 🔴 CRITICAL
**Where:** All "Select Pataka" screens (Donate/Take/Report workflows)  
**Symptom:** Dropdown shows only "Choose a pataka..." with no options  
**Root Cause:** `populatePatakaDropdown()` called before `fetchCupboards()` completes  
**Impact:** Users cannot manually select pātaka if QR scan fails

### **2. Photo Buttons Non-Functional** 🔴 CRITICAL
**Where:** All photo selection steps (Donate Step 2, Take Step 2, Report Step 2)  
**Symptom:** "Take Photo" and "Select from Gallery" buttons do nothing  
**Root Cause:** photo-utils.js uses ES6 exports but not loaded as module  
**Impact:** Cannot upload photos for donations or issue reports

### **3. Workflow Navigation Buttons Broken** 🔴 CRITICAL
**Where:** Multiple buttons across all workflows  
**Affected Buttons:**
- Donate: "Unable to scan QR code?", "Cancel"
- Take: "Unable to scan", "Back to QR Scan", all Step 2 buttons
- Report: "Back to QR Scan", some Step 2 buttons after QR scan
**Root Cause:** Event listeners not properly attached in modular structure  
**Impact:** Users stuck in workflows, cannot navigate

### **4. Map Initialization Issues** 🟡 HIGH
**Symptom:** Map starts blank, requires clicking "Map View" to display  
**Symptom 2:** Returning to map shows grey areas, pins move incorrectly  
**Root Cause:** Leaflet initialization timing race conditions  
**Impact:** Poor first impression, confusing UX

---

## 📁 KEY REFERENCE FILES

### **The Working Version (Pre-Modular)**
- **File:** azure_pataka_app_v31.html (Document 18)
- **Status:** Fully functional monolithic version (2,127 lines)
- **Use:** Reference for "how it should work" when debugging

### **Database Documentation**
- **File:** Wiki_29_Sep_am.md (Document 29)
- **Contains:** Schema, table relationships, strategic decisions
- **Key Info:** 3 real pātaka locations, 38 food items, enterprise structure

### **Latest Test Results**
- **File:** 20250929_TestResults.docx (Document 30)
- **Contains:** Systematic testing on Firefox Windows + Brave Android
- **Shows:** Exactly which buttons work/fail in each workflow

### **Current Worklist**
- **File:** 20250929_Worklist_1336.docx
- **Contains:** Prioritized issue list and approaches tried

---

## 🎯 ACTIVE PLAN: OPTION B

**Plan Name:** Fix Module Architecture Properly  
**Duration:** 7 days (Sep 30 - Oct 6, 2025)  
**Target:** Working demo for team meeting October 7, 2025  
**Approach:** ES6 modules, photo-utils.js as single source of truth

**Why Option B (not quick fixes):**
- Still in development (no users waiting)
- Team demo in 1 week (enough time)
- Need professional architecture for 100+ location scale
- Avoid technical debt before launch

**Current Progress:** See PROGRESS_TRACKER.md

---

## 🔧 TECHNICAL CONSTRAINTS

**Browser Support:**
- Primary: Firefox (Windows 11 desktop)
- Primary: Brave (Android - Samsung Galaxy A34)
- Must work without camera (desktop QR scan graceful failure)

**Photo Requirements:**
- Max size: 5MB
- Formats: JPEG, PNG, WebP
- Auto-resize to 1600x1600px
- Quality: 85% for JPEG

**Database:**
- 3 pātaka locations: Bell Block, Marfell, Waitara (all in Taranaki, NZ)
- 38 food items in catalog
- Enterprise schema with full audit trail
- Connection via SQL authentication (not integrated auth)

**API Constraints:**
- Anonymous access (no auth tokens yet)
- CORS configured for static web app domain
- Cold start delays (first request ~60 seconds)

---

## 👥 PROJECT TEAM

| Name | Role | Email | Responsibilities |
|------|------|-------|------------------|
| Rex | Developer | rex@onthehouse.org.nz | Full development, Azure management |
| Terry | OTH Leadership | terry@onthehouse.org.nz | Project approval, kaitiaki coordination |
| Hamish | Azure Admin | Hamish.shallard@emao.co.nz | Azure subscription oversight |
| Daryl | Project Planning | dfrench@tussockline.co.nz | Planning, requirements |
| Stuti | Team Member | stuti0503@gmail.com | Project support |

**Who's Asking Questions:** Rex (the developer)

---

## 🚀 QUICK START FOR NEW INSTANCE

**When you (new Claude instance) first see this document:**

1. ✅ **Read this document first** (INSTANT_ONBOARD.md) - 30 seconds
2. ✅ **Read PROGRESS_TRACKER.md** - See exactly where we are in Option B plan
3. ✅ **Read TESTING_LOG.md** - Avoid repeating failed approaches
4. ✅ **Confirm understanding:**
   ```
   I understand:
   - Project: Pātaka Pal food sharing app (development stage)
   - Architecture: 9-file modular structure
   - Plan: Option B (7-day module fix)
   - Current: [Day X from PROGRESS_TRACKER]
   - Broken: Dropdowns, photo buttons, some navigation
   - Working: Report submission, map pins, QR detection
   
   Next action: [from PROGRESS_TRACKER.md]
   Ready to proceed?
   ```

---

## 🎓 DOMAIN KNOWLEDGE

**Māori Terms:**
- **Pātaka** = Pantry/storehouse (pronounced "PAH-tah-kah")
- **Kai** = Food (pronounced "kye" like "eye")
- **Kaitiaki** = Guardian/caretaker (pronounced "kye-tee-AH-kee")

**Business Context:**
- Pātaka kai movement is grassroots, volunteer-led
- Food stocked organically by community donations
- Goal: Reduce waste AND feed those in need
- Non-religious, open to all community members

**User Personas:**
1. **Supplier Sue** - Donates excess food anonymously
2. **Customer Carla** - Takes food for family, wants to know availability
3. **Guardian Grant (Kaitiaki)** - Maintains pātaka, gets issue alerts
4. **Administrator Adam** - OTH rep monitoring usage, reducing waste

---

## ⚠️ IMPORTANT DON'TS (Common Mistakes)

1. **DON'T** suggest reverting to monolithic structure - we chose modular for good reasons
2. **DON'T** recommend quick hacks (setTimeout for async, inline onclick handlers)
3. **DON'T** assume users are waiting - still in development
4. **DON'T** forget Te Reo Māori spelling: Pātaka (with macron), not Pataka
5. **DON'T** suggest new architecture - we're committed to Option B plan
6. **DON'T** reference v31 code without checking if pattern still applies to modules

---

## 📊 SUCCESS METRICS (For Team Demo)

**Must Have (Oct 7):**
- ✅ All 3 workflows working end-to-end
- ✅ Dropdowns populated correctly
- ✅ Photo upload functional in all flows
- ✅ QR scanning OR manual selection working

**Nice to Have:**
- ⚠️ Map view stability improved
- ⚠️ AI food recognition integrated (currently using mock data)
- ⚠️ Polish and animations

**Not Required:**
- Nationwide rollout readiness
- User authentication system
- Push notifications
- Advanced analytics dashboard

---

## 🔗 EXTERNAL LINKS

**Documentation:**
- Leaflet Docs: https://leafletjs.com/reference.html
- QR Scanner: https://github.com/nimiq/qr-scanner
- Azure Functions JS: https://learn.microsoft.com/en-us/azure/azure-functions/

**Project Resources:**
- On The House: https://onthehouse.org.nz
- Pātaka Kai Movement: (grassroots, no central website)

---

## 📝 VERSION HISTORY

| Date | Version | Change | Status |
|------|---------|--------|--------|
| Sep 21, 2025 | v0.1 | Project start, initial planning | Complete |
| Sep 24, 2025 | v1.0 | Database migration to PatakaPalDB | Complete |
| Sep 25, 2025 | v1.5 | Production deployment | Live |
| Sep 27, 2025 | v2.0 | Report submission integrated | Working |
| Sep 29, 2025 | v3.0 | Modular architecture migration | In Progress |
| Oct 7, 2025 | v4.0 | Team demo (target) | Planned |

---

**🎯 You're now onboarded! Check PROGRESS_TRACKER.md for current status.**