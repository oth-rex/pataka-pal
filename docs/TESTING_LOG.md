# PĀTAKA PAL - TESTING LOG (What We've Tried)

**Purpose:** Prevent Claude instances from suggesting already-failed approaches  
**Rule:** ALWAYS ADD to this log, NEVER DELETE entries  
**Format:** Newest sessions at top

---

## 📋 SESSION INDEX

| Date | Session ID | Goal | Status | Duration |
|------|------------|------|--------|----------|
| 2025-09-30 | Session-E | Day 1 Module Foundation | 🟡 IN PROGRESS | 2 hours |
| 2025-09-30 | Session-D | Create handoff system | ✅ SUCCESS | 1 hour |
| 2025-09-29 | Session-C | Choose recovery plan | ✅ SUCCESS | 2 hours |
| 2025-09-29 | Session-B | Analyze broken modular code | ✅ SUCCESS | 1.5 hours |
| 2025-09-29 | Session-A | Initial testing & documentation | ✅ SUCCESS | 2 hours |
| 2025-09-26 | Session-0 | Report submission integration | ✅ SUCCESS | 4 hours |

---

## 🔬 DETAILED SESSION LOGS

### **Session 2025-09-30-E: Day 1 Module Foundation** 🟡
**Instance ID:** Claude (this session)  
**Duration:** 2 hours (still in progress)  
**Goal:** Implement ES6 module loading infrastructure  
**Status:** IN PROGRESS - State object migration needed

#### **What We Did:**
1. ✅ Set up Git locally with GitHub Desktop
2. ✅ Fixed donate-workflow.js path (added js/ prefix)
3. ✅ Added `type="module"` to all 8 script tags
4. ✅ Added exports to config.js (initial attempt)
5. ✅ Encountered "function not defined" errors (expected)
6. ✅ Added exports to qr-scanner.js, map-functions.js, app-core.js
7. ✅ Added exports to all 3 workflow files
8. ✅ Fixed duplicate import error (API_BASE_URL imported twice)
9. ✅ Added imports to map-functions.js
10. ❌ Hit ES6 module limitation: "Assignment to constant variable"
11. 🟡 Chose Option B: Migrate to state object pattern (proper fix)
12. ⏸️ Paused to update handoff docs before completing state migration

#### **What We Learned:**
- **Critical Discovery:** ES6 modules have immutable bindings
  - When you `import { map } from './config.js'`, you get a READ-ONLY binding
  - Cannot do: `map = newValue;` (throws "Assignment to constant variable")
  - This is FUNDAMENTAL to ES6 modules, not a bug
- **Solution:** Wrap mutable state in object
  - `const state = { map: null }` allows: `state.map = newValue;` ✅
  - Object properties ARE mutable, bindings are not
- Module imports must be at top of files (before any code)
- Circular imports (A imports B, B imports A) can work but should be avoided
- TypeScript "never read" warnings are just hints, not errors

#### **What Worked:**
- GitHub Desktop for Git workflow (easier than command line for beginner)
- Live Server in VS Code (auto-refresh on save)
- Systematic export/import addition across all files
- Find & Replace for bulk code updates

#### **What NOT to Try Again:**
- Don't declare variables with `let` and try to export them for mutation
  - `let map = null; export { map };` → Can't reassign when imported
- Don't import mutable variables directly
  - `import { map } from './config.js'; map = X;` → ERROR
- Don't forget `type="module"` on script tags
  - Without it: "Uncaught SyntaxError: Unexpected token 'export'"

#### **Recommended Next Steps:**
1. Complete state object migration (8 steps, ~10 minutes)
2. Test page loads without errors
3. Commit: "Day 1: Complete - state object pattern implemented"
4. Move to Day 2: Photo utils integration

---

### **Session 2025-09-30-D: Create Handoff System** ✅
**Instance ID:** [Unknown - pre-tracking]  
**Duration:** 1 hour  
**Goal:** Solve instance transition problem  
**Status:** SUCCESS

#### **What We Did:**
1. ✅ Discussed Rex's frustration with hitting chat limits
2. ✅ Analyzed the "3 Claude instances without solving issue" problem
3. ✅ Designed 3-document handoff system:
   - INSTANT_ONBOARD.md (static context)
   - PROGRESS_TRACKER.md (dynamic progress)
   - TESTING_LOG.md (accumulated learnings)
4. ✅ Generated all 3 documents as artifacts

#### **What We Learned:**
- Instance transitions cost 30-60 minutes of re-onboarding
- History loss is the biggest development blocker
- Need systematic checkpoint documentation
- 3-document approach reduces onboarding to ~5 minutes

#### **What Worked:**
- Modular documentation approach (separate concerns)
- Artifacts for easy copy-paste
- Quick reference summaries at top of each doc

#### **What NOT to Try Again:**
- N/A (this session was about process, not code)

#### **Recommended Next Steps:**
- Save these 3 documents in project
- Test with next instance transition
- Measure time to productivity improvement

---

### **Session 2025-09-29-C: Choose Recovery Plan** ✅
**Instance ID:** [Unknown]  
**Duration:** 2 hours  
**Goal:** Decide how to fix broken modular architecture  
**Status:** SUCCESS - Chose Option B

#### **What We Did:**
1. ✅ Analyzed 3 recovery options:
   - Option A: Full revert to v31 inline code (2-4 hours)
   - Option B: Fix module architecture properly (8-12 hours)
   - Option C: Hybrid - inline now, refactor later (3-5 hours)
2. ✅ Evaluated trade-offs for each option
3. ✅ Considered context: No users yet, team demo in 1 week
4. ✅ Chose Option B for professional architecture
5. ✅ Created detailed 7-day execution plan

#### **What We Learned:**
- Still in development stage (no users waiting)
- 1 week until team demo = adequate time for proper fix
- Option B better for stakeholder presentation
- Rex originally chose modular for good reasons (100+ location scale)
- Avoiding technical debt before launch is wise

#### **What Worked:**
- Systematic evaluation of options
- Considering business context (team demo matters)
- Breaking down Option B into daily achievable tasks
- Week-long timeline with clear milestones

#### **What NOT to Try Again:**
- Don't choose quick fixes when time allows proper solution
- Don't ignore stakeholder presentation considerations
- Don't underestimate value of clean architecture

#### **Recommended Next Steps:**
- Execute Option B Day 1: Module foundation
- Track progress in PROGRESS_TRACKER.md
- Update this log after each day's work

---

### **Session 2025-09-29-B: Analyze Broken Modular Code** ✅
**Instance ID:** [Unknown]  
**Duration:** 1.5 hours  
**Goal:** Understand why modular split broke functionality  
**Status:** SUCCESS - Root causes identified

#### **What We Did:**
1. ✅ Read all 29 project documents
2. ✅ Line-by-line comparison of v31 (working) vs modular (broken)
3. ✅ Created comprehensive issue list (10 critical issues)
4. ✅ Identified root causes:
   - photo-utils.js uses ES6 exports without module loading
   - populatePatakaDropdown() timing (fetchCupboards not awaited)
   - Event listeners missing in modular split
   - File path inconsistency (donate-workflow.js)
5. ✅ Documented testing results from Rex's manual testing

#### **What We Learned:**
- v31 worked because all code in single scope
- Modular split broke implicit dependencies
- ES6 export/import syntax needs `type="module"`
- Async timing issues hidden in monolithic structure
- Some event listeners never migrated from v31

#### **What Worked:**
- Systematic document review
- Comparison methodology (v31 as baseline)
- Creating button testing matrix
- Identifying patterns across all 3 workflows

#### **What NOT to Try Again:**
- Don't assume modular split is "drop-in" compatible
- Don't skip module loading infrastructure
- Don't ignore async/await for data fetching

#### **Recommended Next Steps:**
- Choose recovery approach (led to Session C)
- Create detailed execution plan
- Set up proper ES6 module system

---

### **Session 2025-09-29-A: Initial Testing & Documentation** ✅
**Instance ID:** [Unknown]  
**Duration:** 2 hours  
**Goal:** Document current state, test functionality  
**Status:** SUCCESS - Testing complete

#### **What We Did:**
1. ✅ Manual testing on Firefox Windows 11
2. ✅ Manual testing on Brave Android (Samsung Galaxy A34)
3. ✅ Created systematic test results document (20250929_TestResults.docx)
4. ✅ Tested all buttons across Donate, Take, Report workflows
5. ✅ Documented exactly what works vs what's broken

#### **Test Results Summary:**

**Donate Tab:**
- ❌ "Unable to scan QR code?" button - no response
- ❌ "Cancel" button - no response
- ⚠️ Camera error modal appears (expected on desktop)

**Take Tab:**
- ✅ "Cancel" button works
- ❌ "Unable to scan QR code?" shows empty dropdown
- ❌ "Back to QR Scan" button - no response
- ❌ All Step 2 buttons non-functional after QR scan

**Report Tab:**
- ✅ "Cancel" button works
- ❌ "Unable to scan QR code?" shows empty dropdown
- ❌ "Back to QR Scan" button - no response (Take: worked, Report: didn't)
- ❌ All Step 2 buttons non-functional after QR scan

**Map View:**
- ⚠️ Starts blank, requires "Map View" click to display
- ⚠️ Grey areas on return, pins move incorrectly
- ✅ Pins display correctly on first proper load
- ✅ "View details" switches to List View with yellow highlight

#### **What We Learned:**
- Inconsistent behavior across workflows (some buttons work, some don't)
- Empty dropdowns are universal problem
- Map timing issues consistent
- Report workflow backend still working (good!)

#### **What Worked:**
- Systematic testing methodology
- Testing on both platforms (desktop + mobile)
- Documenting exact button IDs and behaviors
- Creating reproducible test cases

#### **What NOT to Try Again:**
- N/A (this was pure testing, no attempted fixes)

#### **Recommended Next Steps:**
- Analyze root causes (led to Session B)
- Prioritize fixes by severity
- Create recovery plan

---

### **Session 2025-09-26-0: Report Submission Integration** ✅
**Instance ID:** [Unknown]  
**Duration:** 4 hours  
**Goal:** Integrate Report workflow with backend API  
**Status:** SUCCESS - Fully working

#### **What We Did:**
1. ✅ Created POST /api/ReportIssue Azure Function endpoint
2. ✅ Implemented photo upload to Azure Blob Storage (issue-photos container)
3. ✅ Integrated Azure Communication Services for email notifications
4. ✅ Configured email to kaitiaki (info@onthehouse.org.nz CC working)
5. ✅ Tested end-to-end: App → API → Database → Email

#### **What We Learned:**
- Azure Communication Services email delivery works
- info@t1nz.com filters some emails (spam rules), CC to info@onthehouse.org.nz reliable
- Blob storage needs public access for issue photos
- SQL parameterized queries prevent injection
- Anonymous submission works without auth complexity

#### **What Worked:**
- Report submission end-to-end ✅
- Photo upload with proper content types ✅
- Email with inline image attachments ✅
- Database insertion with proper foreign keys ✅

#### **What NOT to Try Again:**
- Don't send email ONLY to info@t1nz.com (gets filtered)
- Don't use Azure managed identity for SQL (use SQL auth for simplicity)
- Don't skip content-type headers on blob upload

#### **Recommended Next Steps:**
- Replicate pattern for Donate workflow API
- Replicate pattern for Take workflow API
- Consider Turnstile for security (post-pilot)

---

## ❌ KNOWN DEAD ENDS (Never Try These Again)

### **Module System Failures**

#### ❌ **Trying to Reassign Imported Variables**
**Attempted:** During Day 1 module migration  
**Code:** 
```javascript
// In config.js:
let map = null;
export { map };

// In map-functions.js:
import { map } from './config.js';
map = L.map(...);  // ERROR!
```
**Symptom:** `TypeError: Assignment to constant variable`  
**Why it Failed:** ES6 module imports create READ-ONLY bindings, even for `let` variables  
**Correct Approach:** Use state object pattern:
```javascript
// config.js:
const state = { map: null };
export { state };

// map-functions.js:
import { state } from './config.js';
state.map = L.map(...);  // WORKS!
```
**Never Try Again:** Importing mutable variables directly for reassignment

---

### **Photo Handling Failures**

#### ❌ **Loading photo-utils.js as Regular Script**
**Attempted:** Multiple times during modular split  
**Symptom:** `Uncaught SyntaxError: Unexpected token 'export'`  
**Why it Failed:** photo-utils.js uses ES6 `export` syntax which requires module loading  
**Correct Approach:** Use `<script type="module" src="js/photo-utils.js"></script>`  
**Never Try Again:** Regular script tag for ES6 module code

---

#### ❌ **Inline onclick Handlers for Photo Buttons**
**Attempted:** During debugging session  
**Symptom:** `Uncaught ReferenceError: handlePhotoSelect is not defined`  
**Why it Failed:** Functions in modules not accessible to inline HTML attributes  
**Correct Approach:** Attach event listeners in JavaScript using addEventListener  
**Never Try Again:** `<button onclick="handlePhotoSelect()">` with modules

---

#### ❌ **Synchronous File Reading**
**Attempted:** Early v31 development  
**Symptom:** FileReader operations not completing  
**Why it Failed:** FileReader is inherently asynchronous  
**Correct Approach:** Use Promises or async/await with FileReader  
**Never Try Again:** Expecting synchronous file.readAsDataURL() result

---

### **Dropdown Population Failures**

#### ❌ **setTimeout() to Fix Async Timing**
**Attempted:** Quick fix attempt  
**Code:** `setTimeout(() => populateDropdown(), 1000);`  
**Why it Failed:** Unreliable, doesn't guarantee data loaded, fails on slow connections  
**Correct Approach:** Proper async/await: `await fetchCupboards(); populateDropdown();`  
**Never Try Again:** Time-based delays for data dependencies

---

#### ❌ **Calling populateDropdown Before fetchCupboards**
**Attempted:** Original modular split  
**Symptom:** Empty dropdown (only "Choose a pataka..." option)  
**Why it Failed:** cupboards array empty when populate function runs  
**Correct Approach:** Await data fetch, then populate  
**Never Try Again:** Assuming synchronous data availability

---

### **Event Listener Failures**

#### ❌ **Attaching Listeners Before DOM Ready**
**Attempted:** During modular split  
**Symptom:** Buttons silently don't respond  
**Why it Failed:** Elements don't exist in DOM yet  
**Correct Approach:** Wrap in DOMContentLoaded or place script tags at end of body  
**Never Try Again:** Event listeners in module top-level code

---

#### ❌ **Duplicate Event Listeners**
**Attempted:** Multiple workflow file updates  
**Symptom:** Handler fires multiple times per click  
**Why it Failed:** addEventListener adds listener, doesn't replace  
**Correct Approach:** Use once: true option or check if already bound  
**Never Try Again:** Calling addEventListener multiple times on same element/event

---

### **Module Loading Failures**

#### ❌ **Mixing Module and Non-Module Scripts**
**Attempted:** Partial module conversion  
**Symptom:** Some exports work, others undefined  
**Why it Failed:** Mixed scopes, non-modules can't import from modules  
**Correct Approach:** All or nothing - convert all interdependent scripts to modules  
**Never Try Again:** Half-module, half-global scope architecture

---

#### ❌ **Importing Without Exporting**
**Attempted:** Using v31 functions in new modules  
**Symptom:** `Uncaught ReferenceError: functionName is not defined`  
**Why it Failed:** Functions not exported from origin module  
**Correct Approach:** Add export statement in origin, import in consumer  
**Never Try Again:** Assuming global scope functions available in modules

---

## ✅ PROVEN SUCCESSFUL PATTERNS

### **ES6 Module State Management**

```javascript
// In config.js:
const state = {
    map: null,
    cupboards: [],
    selectedPataka: null,
    // ... all mutable state
};

export { state };

// In any other file:
import { state } from './config.js';

// Can mutate properties:
state.map = L.map('mapId');  // ✅ WORKS
state.cupboards.push(newItem);  // ✅ WORKS
state.selectedPataka = pataka;  // ✅ WORKS
```

**Why it Works:** 
- `const` prevents reassigning the `state` variable itself
- But object PROPERTIES are still mutable
- Import creates read-only binding to the object, but object internals can change

---

### **Photo Handling That Works**

```javascript
// In photo-utils.js (ES6 module):
export async function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// In workflow file:
import { fileToDataURL } from './photo-utils.js';

async function handlePhotoSelection(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    
    const dataURL = await fileToDataURL(file);
    // Use dataURL for preview or processing
}
```

**Why it Works:** Proper async/await, ES6 module exports, Promise-based API

---

### **Dropdown Population That Works**

```javascript
// In app-core.js:
export async function populatePatakaDropdown(selectId) {
    // Ensure data loaded FIRST
    if (!Array.isArray(window.cupboards) || window.cupboards.length === 0) {
        await fetchCupboards();
    }
    
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Dropdown ${selectId} not found`);
        return;
    }
    
    select.innerHTML = '<option value="">Choose a pataka...</option>';
    
    window.cupboards.forEach(pataka => {
        const option = document.createElement('option');
        option.value = pataka.id;
        option.textContent = `${pataka.name} - ${pataka.address}`;
        select.appendChild(option);
    });
}

// In workflow file:
document.getElementById('unableToScanBtn').addEventListener('click', async () => {
    await stopQRScanner();
    await populatePatakaDropdown('mySelect'); // Wait for completion
    showManualSelectScreen();
});
```

**Why it Works:** Explicit async/await chain, data guaranteed loaded before population

---

### **Event Listeners That Work**

```javascript
// In workflow file (module):
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('myButton');
    if (btn) {
        btn.addEventListener('click', handleClick);
    }
});

function handleClick(event) {
    event.preventDefault();
    // Handle click
}
```

**Why it Works:** DOM ready check, existence verification, proper scope

---

### **Module Imports That Work**

```javascript
// In index.html:
<script type="module" src="js/config.js"></script>
<script type="module" src="js/app-core.js"></script>
<script type="module" src="js/photo-utils.js"></script>

// In config.js:
export const API_BASE_URL = 'https://...';
export let cupboards = [];

// In app-core.js:
import { API_BASE_URL, cupboards } from './config.js';
import { fileToDataURL } from './photo-utils.js';

// Use imports normally
console.log(API_BASE_URL);
```

**Why it Works:** Proper module syntax, consistent file paths, explicit exports/imports

---

## 🧪 TESTING METHODOLOGY

### **Systematic Button Testing Approach**

1. **Create Inventory:**
   - List all buttons in workflow (from index.html)
   - Document element IDs
   - Note expected behavior

2. **Test Each Button:**
   - Click button
   - Observe console for errors
   - Verify expected navigation/action
   - Mark ✅ or ❌ in matrix

3. **For Failures:**
   - Check element exists: `document.getElementById('buttonId')`
   - Check listener attached: Inspect in DevTools → Event Listeners tab
   - Check handler defined: Search workflow file for function name
   - Compare with v31 if needed

4. **Document Results:**
   - Update testing matrix
   - Add to TESTING_LOG.md
   - Include platform (Firefox/Brave)

---

### **Test Environments**

**Firefox Windows 11:**
- ✅ Camera error handling (no physical camera)
- ✅ Console error visibility (F12 DevTools)
- ✅ Module loading inspection
- ✅ Network tab for API calls
- ⚠️ Emoji rendering may differ from mobile

**Brave Android (Samsung Galaxy A34):**
- ✅ Real camera testing (QR scan, photo capture)
- ✅ Touch interactions
- ✅ Mobile viewport testing
- ⚠️ Remote debugging: chrome://inspect
- ⚠️ Console access requires USB debugging

---

### **Common Test Scenarios**

1. **Desktop No Camera:**
   - Should show "Camera Error" modal
   - "OK" button should close modal
   - "Unable to scan QR code?" should appear as fallback

2. **Mobile With Camera:**
   - Should request camera permission
   - Should show video feed in QR scanner
   - Should detect and decode QR codes
   - Should allow "Unable to scan" as alternative

3. **Manual Dropdown Selection:**
   - Should show loading state while fetching
   - Should populate with 3 pātaka options:
     - Bell Block Community Pataka
     - Marfell Neighbourhood Pataka
     - Waitara Foodbank - Pataka Kai
   - "Continue" button should activate when selection made

4. **Photo Selection:**
   - Camera button should trigger camera (mobile) or file picker (desktop)
   - Gallery button should always trigger file picker
   - Preview should appear after selection
   - Image should auto-resize if over 1600x1600px

---

## 📊 PERFORMANCE BENCHMARKS

**Page Load:**
- Target: < 2 seconds on 4G connection
- Current: ~3-4 seconds (acceptable for PWA first load)

**API Response Times:**
- GET /getCupboards: 200-500ms (after cold start)
- POST /ReportIssue: 300-800ms (with photo upload)
- Cold start (first request): 30-60 seconds (Azure limitation)

**Photo Processing:**
- File read: 50-200ms (depends on size)
- Resize: 100-500ms (1600x1600 target)
- Total time to preview: < 1 second (acceptable)

---

## 🔍 DEBUGGING TIPS

### **When Photo Buttons Don't Work:**
1. Check browser console for errors
2. Verify `<script type="module">` on photo-utils.js
3. Check import statement exists in workflow file
4. Verify input element IDs match between HTML and JS
5. Test with console.log in click handler

### **When Dropdowns Are Empty:**
1. Check console: "Populated ... with X options" message
2. Verify fetchCupboards() completed: `console.log(window.cupboards)`
3. Check if populateDropdown ran AFTER fetchCupboards
4. Inspect dropdown HTML: Should have 4 options (1 placeholder + 3 data)

### **When Map Doesn't Load:**
1. Check console for Leaflet errors
2. Verify internet connection (needs to load tiles)
3. Check map container has dimensions: Inspect element → Computed styles
4. Try manual `map.invalidateSize()` in console
5. Check if Leaflet CSS loaded properly

---

**Last Updated:** September 30, 2025 - 02:30 UTC  
**Total Sessions Logged:** 5  
**Total Dead Ends Documented:** 8  
**Total Proven Patterns:** 4

---

**REMEMBER:** This log grows over time. Never delete entries. Future instances rely on this accumulated knowledge to avoid wasting hours on already-failed approaches.