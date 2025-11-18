# GitHub Actions Workflows Documentation

This document provides detailed information about the GitHub Actions workflows configured for this project.

## Overview

This project uses GitHub Actions for continuous integration and testing. There are two main workflows:

1. **Pull Request Tests** (`test.yml`) - Runs on every pull request
2. **Main Branch Health Check** (`main-health.yml`) - Runs on main branch pushes and daily schedule

## Workflow Files Location

All workflow files are located in:
```
.github/workflows/
├── test.yml           # PR testing workflow
└── main-health.yml    # Main branch health monitoring
```

## Workflow 1: Pull Request Tests

**File**: `.github/workflows/test.yml`

### Purpose

Automatically tests every pull request to ensure:
- Backend tests pass
- Frontend tests pass
- No regressions are introduced

### Trigger Conditions

This workflow runs when:
- A pull request is opened
- New commits are pushed to an open PR
- A draft PR is marked ready for review

**Target branches**: `main`, `develop`

**Excluded paths**: The workflow won't run if changes only affect:
- Markdown files (`**.md`)
- Documentation (`docs/**`)
- `.gitignore`
- `LICENSE`

### Jobs

#### 1. Backend Tests (`test-backend`)

**Runs on**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 18 with npm caching
3. Install backend dependencies (`npm ci`)
4. Run backend tests (`npm test`)
5. Upload coverage reports as artifacts

**Artifacts**:
- Name: `backend-coverage`
- Retention: 30 days
- Contains: Code coverage reports from Jest

#### 2. Frontend Tests (`test-frontend`)

**Runs on**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 18 with npm caching
3. Install frontend dependencies (`npm ci`)
4. Run frontend tests with coverage
5. Upload coverage reports as artifacts

**Artifacts**:
- Name: `frontend-coverage`
- Retention: 30 days
- Contains: Code coverage reports from Jest

#### 3. Test Summary (`test-summary`)

**Runs on**: `ubuntu-latest`  
**Depends on**: `test-backend`, `test-frontend`

**Purpose**: Provides a single summary status for the entire test suite

**Steps**:
1. Check results of both backend and frontend tests
2. If any tests failed, mark the workflow as failed
3. If all tests passed, mark the workflow as successful

### Usage

This workflow runs automatically. No manual intervention is required.

To view results:
1. Go to your pull request on GitHub
2. Scroll to the status checks section
3. Click "Details" next to any check to see logs

## Workflow 2: Main Branch Health Check

**File**: `.github/workflows/main-health.yml`

### Purpose

Monitors the health of the main branch by:
- Running comprehensive tests after every merge
- Performing daily scheduled health checks
- Verifying builds work correctly
- Providing detailed health reports

### Trigger Conditions

This workflow runs when:
- Code is pushed to `main` branch
- Daily at 9 AM UTC (scheduled)
- Manually triggered via GitHub Actions UI

**Excluded paths**: Same as PR workflow (markdown, docs, etc.)

### Jobs

#### 1. Backend Tests (`test-backend`)

**Runs on**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 18 with npm caching
3. Install backend dependencies
4. Run backend tests
5. Generate coverage report
6. Upload coverage artifacts

**Artifacts**:
- Name: `backend-coverage-main`
- Retention: 90 days (longer than PR artifacts)

#### 2. Frontend Tests (`test-frontend`)

**Runs on**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 18 with npm caching
3. Install frontend dependencies
4. Run frontend tests with coverage
5. Upload coverage artifacts

**Artifacts**:
- Name: `frontend-coverage-main`
- Retention: 90 days

#### 3. Build Verification (`build-check`)

**Runs on**: `ubuntu-latest`  
**Depends on**: `test-backend`, `test-frontend`

**Steps**:
1. Checkout code
2. Setup Node.js 18
3. Install root dependencies
4. Install frontend dependencies
5. Install backend dependencies
6. Build frontend
7. Verify build artifacts exist:
   - `frontend/build/` directory exists
   - `frontend/build/index.html` exists

**Purpose**: Ensures the production build process works correctly

#### 4. Health Summary (`health-summary`)

**Runs on**: `ubuntu-latest`  
**Depends on**: All previous jobs  
**Always runs**: Even if previous jobs fail

**Steps**:
1. Generate comprehensive health report
2. Add results to GitHub Step Summary
3. Indicate overall health status
4. Exit with failure if any checks failed

**Report includes**:
- Backend test status (✅/❌)
- Frontend test status (✅/❌)
- Build verification status (✅/❌)
- Overall health assessment

### Usage

**Automatic**: Runs after merges to main and daily

**Manual trigger**:
1. Go to Actions tab in GitHub
2. Select "Main Branch Health Check"
3. Click "Run workflow"
4. Choose branch and click "Run workflow" button

## Test Commands

### Backend Tests

Location: `backend/`

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Frontend Tests

Location: `frontend/`

```bash
# Run tests once
npm test -- --watchAll=false

# Run tests in watch mode
npm test

# Run tests with coverage
npm test -- --watchAll=false --coverage
```

### All Tests (from root)

```bash
# Run all tests (backend + frontend)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

## Coverage Reports

### Viewing Coverage Locally

After running tests with coverage:

**Backend**:
```bash
cd backend
npm run test:coverage
open coverage/lcov-report/index.html
```

**Frontend**:
```bash
cd frontend
npm test -- --watchAll=false --coverage
open coverage/lcov-report/index.html
```

### Viewing Coverage from GitHub Actions

1. Go to the Actions tab
2. Select a completed workflow run
3. Scroll to the bottom to find "Artifacts"
4. Download the coverage artifact (e.g., `backend-coverage`)
5. Extract and open `lcov-report/index.html`

## Node.js Caching

Both workflows use npm caching to speed up dependency installation:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'
    cache-dependency-path: backend/package-lock.json
```

**Benefits**:
- Faster workflow runs
- Reduced GitHub Actions minutes usage
- More reliable (cached dependencies)

**How it works**:
- First run: Downloads and caches dependencies
- Subsequent runs: Restores from cache if `package-lock.json` unchanged

## Workflow Optimization

### Speed Optimization

Current optimizations:
- ✅ Parallel job execution (backend and frontend tests run simultaneously)
- ✅ npm caching
- ✅ `npm ci` instead of `npm install` (faster, more reliable)
- ✅ Path filtering (skip workflows for documentation changes)

### Cost Optimization

To minimize GitHub Actions usage:
- Tests only run when relevant files change
- Coverage artifacts have appropriate retention periods
- Workflows are optimized for speed

## Troubleshooting

### Workflow Doesn't Start

**Check**:
- Workflow files are in `.github/workflows/`
- YAML syntax is valid
- GitHub Actions is enabled in repository settings
- Changes don't match `paths-ignore` patterns

**Validate YAML**:
```bash
# Install yamllint
pip install yamllint

# Check workflow files
yamllint .github/workflows/*.yml
```

### Tests Pass Locally But Fail in CI

**Common causes**:

1. **Missing dependencies**: Ensure all dependencies are in `package.json`

2. **Environment differences**: 
   - CI uses fresh environment each time
   - No local configuration files
   - Different Node.js version

3. **Timing issues**: Add delays for async operations

4. **File paths**: Use absolute or properly relative paths

**Debug steps**:
```bash
# Match CI environment
docker run -it -v $(pwd):/app node:18 bash
cd /app/backend
npm ci
npm test
```

### Dependency Installation Fails

**Solutions**:

1. **Clear cache**: 
   - Go to Actions → Select workflow → Three dots → "Clear cache"

2. **Update package-lock.json**:
   ```bash
   cd backend
   rm package-lock.json
   npm install
   git add package-lock.json
   git commit -m "Update package-lock.json"
   ```

3. **Check Node version compatibility**

### Workflow Timeout

**Default timeout**: 6 hours (GitHub limit)

**Set custom timeout**:
```yaml
jobs:
  test-backend:
    timeout-minutes: 10  # Add this
    runs-on: ubuntu-latest
```

### Artifacts Upload Fails

**Common issues**:
- Coverage directory doesn't exist (test command failed)
- Path is incorrect
- Artifact name conflicts

**Solution**: Check that tests ran successfully before artifact upload

## Security Considerations

### Secrets Management

Currently, no secrets are required for tests. If you need to add secrets:

1. Go to Settings → Secrets and variables → Actions
2. Add repository secrets
3. Reference in workflow:
   ```yaml
   env:
     MY_SECRET: ${{ secrets.MY_SECRET }}
   ```

### Permissions

Workflows use default permissions. To restrict:

```yaml
permissions:
  contents: read
  checks: write
```

## Maintenance

### Updating Node.js Version

To update Node.js version used in workflows:

1. Edit both workflow files
2. Update `node-version` value:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '20'  # Update this
   ```

### Updating Action Versions

Check for action updates periodically:
- `actions/checkout@v4` → check for v5
- `actions/setup-node@v4` → check for v5
- `actions/upload-artifact@v4` → check for v5

### Adding New Test Jobs

To add a new test job:

1. Add job to workflow file
2. Update `test-summary` dependencies
3. Update branch protection rules (see `status-checks.md`)

## Monitoring

### Viewing Workflow Status

**For PR workflows**:
- Status appears directly on pull request

**For main branch workflows**:
1. Go to Actions tab
2. Select workflow
3. View run history and status

### Email Notifications

GitHub sends notifications when:
- Workflow fails on a branch you pushed to
- Workflow fails on scheduled run

Configure in: Settings → Notifications → Actions

## Best Practices

1. **Keep workflows fast**: Aim for < 5 minutes total runtime
2. **Use caching**: Cache dependencies and build outputs
3. **Run jobs in parallel**: When they don't depend on each other
4. **Set timeouts**: Prevent hanging workflows
5. **Monitor costs**: Check Actions usage in billing
6. **Test locally first**: Don't rely on CI for basic testing

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/guides/best-practices-for-github-actions)

## Support

For issues with GitHub Actions:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Search existing GitHub issues
4. Open a new issue with workflow run link
