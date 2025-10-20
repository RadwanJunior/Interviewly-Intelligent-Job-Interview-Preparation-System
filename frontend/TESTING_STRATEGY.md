# Testing Strategy for Interviewly

## Current State
- **946 tests** across 37 test suites
- **45.25% coverage** 
- **Problem**: Writing too many redundant tests instead of focused, comprehensive ones

## Goal
- Target: **70%+ coverage** with **~300 well-designed tests**
- Focus on critical business logic and user workflows
- Avoid testing third-party libraries (shadcn/ui, Radix UI)

## Testing Principles

### 1. **Don't Test Third-Party Code**
❌ **STOP** testing shadcn/ui components individually:
- These are pre-built, tested components from Radix UI
- No need to test if Button renders or Switch toggles
- **Remove**: All `src/components/ui/__tests__/` files except integration tests

### 2. **Focus on Integration Over Units**
✅ **DO** test user workflows end-to-end:
- Can user complete signup → login → upload resume → start interview?
- Does the workflow state persist correctly across steps?
- Do error messages appear when API calls fail?

### 3. **Test Critical Business Logic Only**
✅ **DO** test files with actual logic:
- API calls (`lib/api.ts`)
- Context providers (`AuthContext`, `WorkflowContext`)
- Complex components with state management (Interview page, Workflow pages)
- Form validation and submission logic

### 4. **One Test Suite Per Feature, Not Per Component**
Instead of:
```
❌ AnswerSection.test.tsx (65 tests)
❌ InterviewHeader.test.tsx (42 tests)  
❌ InterviewNavigation.test.tsx (82 tests)
❌ RecordingControls.test.tsx (133 tests)
```

Do this:
```
✅ Interview.integration.test.tsx (15-20 tests)
  - Can start interview
  - Can record answer
  - Can navigate between questions
  - Can submit interview
  - Handles errors gracefully
```

## Test File Structure

### Keep (Optimize):
1. **Page Tests** - But reduce from 50-70 tests to 10-15 per page
   - `src/app/*/__tests__/page.test.tsx`
   - Focus on: Rendering, user interactions, API integration, error states

2. **Context Tests** - Keep but simplify
   - `src/context/__tests__/AuthContext.test.tsx`
   - `src/context/__tests__/WorkflowContext.test.tsx`

3. **Integration Tests** - Expand these
   - `src/app/__tests__/page.integration.test.tsx`
   - Add more full-workflow tests

### Delete:
1. **All UI Component Tests** 
   - Delete `src/components/ui/__tests__/` entirely
   - These are third-party components, no need to test

2. **Over-detailed Component Tests**
   - Delete most individual component tests
   - Merge into integration tests

### Create (Missing Coverage):
1. **Workflow Components** - 0% coverage
   - `src/components/workflow/__tests__/workflow.integration.test.tsx`
   - Test entire workflow: Resume upload → Job details → Interview

2. **Dashboard Components** - 0% coverage  
   - `src/components/dashboard/__tests__/InterviewCard.test.tsx`

3. **Protected Route** - 0% coverage
   - `src/components/__tests__/ProtectedRoute.test.tsx`

## Recommended Test Counts

| Area | Files | Current Tests | Target Tests | Coverage Goal |
|------|-------|--------------|--------------|---------------|
| **Pages** | 8 | 731 | 100-120 | 90%+ |
| **UI Components** | 42 | 215 | 0 (delete) | N/A |
| **Interview Components** | 7 | 548 | 0 (delete, covered by page tests) | N/A |
| **Workflow Components** | 4 | 0 | 40-50 | 80%+ |
| **Dashboard Components** | 1 | 0 | 10 | 80%+ |
| **Context/Hooks** | 2 | 34 | 30 | 90%+ |
| **API/Utils** | 2 | 66 | 50 | 80%+ |
| **Integration Tests** | 2-3 | 52 | 90-100 | N/A |
| **TOTAL** | ~25 | **946** | **~320-360** | **70%+** |

## Example: Optimized Interview Page Tests

### Before (72 tests):
```typescript
describe("Interview Page", () => {
  // 15 tests for rendering
  it("should render header")
  it("should render question display")
  it("should render answer section")
  // ... 12 more

  // 20 tests for individual component interactions  
  it("should show countdown")
  it("should hide countdown after 0")
  // ... 18 more

  // 37 tests for state management
  // ... 37 individual state tests
});
```

### After (12 tests):
```typescript
describe("Interview Page", () => {
  describe("Interview Initialization", () => {
    it("loads questions and starts interview")
    it("shows error if no questions available")
  });

  describe("Recording Workflow", () => {
    it("displays countdown → starts recording → stops recording → shows playback")
    it("handles recording errors gracefully")
  });

  describe("Navigation", () => {
    it("advances to next question after submitting answer")
    it("completes interview on last question")
    it("prevents navigation without answering")
  });

  describe("Error Handling", () => {
    it("shows error when upload fails")
    it("allows retry after failure")
  });

  describe("Session Management", () => {
    it("ends call and redirects to feedback")
  });
});
```

## Action Plan

### Phase 1: Clean Up (Priority 1)
1. ✅ Delete all files in `src/components/ui/__tests__/`
2. ✅ Delete all files in `src/components/interview/__tests__/`
3. ✅ Reduce page tests from 731 to ~120 (keep critical workflows)

### Phase 2: Fill Gaps (Priority 2)
4. Create `workflow.integration.test.tsx` (40 tests)
5. Create `InterviewCard.test.tsx` (10 tests)
6. Create `ProtectedRoute.test.tsx` (10 tests)

### Phase 3: Optimize (Priority 3)
7. Simplify API tests
8. Simplify context tests
9. Add more integration tests

## Expected Outcome
- **From 946 → ~320 tests** (66% reduction)
- **From 45% → 70%+ coverage** (55% increase)
- **Faster test execution** (fewer tests to run)
- **Better test maintenance** (fewer files to update)
- **More meaningful tests** (focus on user experience, not implementation details)
