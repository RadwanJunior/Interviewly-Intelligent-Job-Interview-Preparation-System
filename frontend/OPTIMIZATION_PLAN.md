# Test Optimization Plan

## Current State
- **588 tests** (after deleting UI component tests)
- **~45% coverage**
- Many redundant tests checking implementation details

## Goal
- **~200-300 focused tests**
- **75-80% coverage** of critical business logic
- Focus on user workflows, integration, and error handling

---

## Phase 1: Delete Redundant Component Tests ✓ DONE
- ✅ Deleted src/components/ui/__tests__ (157 tests)
- Result: 588 tests remaining

---

## Phase 2: Consolidate Interview Component Tests (Priority 1)

### Current: 215 tests across 7 files
```
52 tests - RecordingControls.test.tsx    → Reduce to 8-10 tests
37 tests - QuestionDisplay.test.tsx      → Reduce to 6-8 tests  
34 tests - ProgressIndicator.test.tsx    → Reduce to 5-6 tests
32 tests - LoadingStates.test.tsx        → Reduce to 4-5 tests
26 tests - InterviewNavigation.test.tsx  → Reduce to 5-6 tests
18 tests - InterviewHeader.test.tsx      → Reduce to 4-5 tests
16 tests - AnswerSection.test.tsx        → Reduce to 5-6 tests
```

### Target: 40-50 integration tests
**Instead of testing each component separately, test them working together:**

**Create:** `src/components/interview/__tests__/integration.test.tsx`
- Full interview flow (record → navigate → upload)
- Recording controls with progress tracking
- Error handling across components
- State synchronization

**Keep minimal unit tests for:**
- Complex time formatting logic
- Critical edge cases
- Error boundaries

**Expected Reduction:** 215 → 50 tests (-165 tests, -77%)

---

## Phase 3: Optimize Page Tests (Priority 2)

### Current: 308 tests across 11 page files

#### Interview Page: 72 tests → 15-20 tests
**Current issues:**
- Testing every state combination separately
- Redundant rendering tests
- Too granular component interaction tests

**Focus on:**
- Full interview completion flow
- Error handling (recording, upload, network)
- Edge cases (session timeout, call dropped)
- Integration with components

#### Dashboard Page: 52 tests → 12-15 tests
**Current issues:**
- Testing every card display variation
- Redundant empty state tests
- Over-testing loading states

**Focus on:**
- Data fetching and display
- Navigation to interview prep
- Error states
- Interview history interactions

#### Prepare Page: 50 tests → 12-15 tests
**Similar approach - focus on workflows**

#### Other Pages: 134 tests → 40-50 tests
- Auth pages: Focus on form validation, API calls, error handling
- Profile: Focus on data updates, validation
- Workflow: Focus on step navigation, state management
- Feedback: Focus on data display, navigation

**Expected Reduction:** 308 → 110 tests (-198 tests, -64%)

---

## Phase 4: Keep Essential Tests (No changes needed)

### Keep as-is:
- **lib/__tests__/api.test.ts** - API utility tests
- **context/__tests__/AuthContext.test.tsx** - State management
- **components/__tests__/Navbar.test.tsx** - 8 tests (reasonable)
- **components/__tests__/Footer.test.tsx** - 29 tests (review if needed)

---

## Phase 5: Add Missing Critical Tests (Priority 3)

### What's missing (0% coverage):
1. **Workflow Components** (Critical!)
   - WorkflowStages.tsx - 0% coverage
   - WorkflowStepper.tsx - 0% coverage
   - ResumeUpload.tsx - 0% coverage
   - JobDescriptionInput.tsx - 0% coverage

2. **Dashboard Components**
   - InterviewCard.tsx - 0% coverage
   - StatsCard.tsx - 0% coverage

3. **ProtectedRoute.tsx** - 0% coverage (Security critical!)

**Add ~30-40 focused tests for these**

---

## Expected Final Result

### Before Optimization:
- 588 tests
- 45% coverage
- Many redundant tests

### After Optimization:
- ~200-250 tests (-60%)
- 75-80% coverage (+35%)
- All tests focused on critical functionality

---

## Execution Order

1. ✅ Phase 1: Delete UI tests (DONE)
2. **Phase 2: Interview components** (Start here)
   - Create integration test file
   - Delete/consolidate redundant tests
   - Run coverage to verify
3. **Phase 3: Optimize Interview page tests** (Biggest impact)
4. **Phase 3b: Optimize other page tests**
5. **Phase 5: Add missing critical tests**
6. **Phase 4: Final cleanup** (Footer tests, etc.)

---

## Success Metrics

After each phase, we should see:
- ✅ Test count decreasing
- ✅ Coverage percentage increasing
- ✅ Test execution time improving
- ✅ All critical user flows tested
- ✅ No false confidence from trivial tests
