# Setting Up Pull Request Status Checks

This guide explains how to configure GitHub status checks to require that tests pass before pull requests can be merged.

## Overview

Pull request status checks ensure code quality by automatically running tests on every pull request. The tests must pass before the PR can be merged into the main branch.

## Prerequisites

- Repository admin access
- GitHub Actions workflows configured (see `github-actions.md`)

## Step-by-Step Configuration

### 1. Access Branch Protection Settings

1. Navigate to your repository on GitHub
2. Click on **Settings** (top navigation bar)
3. In the left sidebar, click **Branches** (under "Code and automation")
4. Find the **Branch protection rules** section
5. Click **Add rule** (or edit existing rule for `main` branch)

### 2. Configure Branch Name Pattern

In the **Branch name pattern** field, enter:
```
main
```

This applies the protection rules to the `main` branch.

### 3. Enable Required Status Checks

1. Check the box for **Require status checks to pass before merging**

2. This enables two sub-options:
   - **Require branches to be up to date before merging** (recommended)
   - Search for specific status checks to require

### 4. Select Required Status Checks

In the status checks search box, you need to add the following checks from the `test.yml` workflow:

Required checks:
- `Backend Tests`
- `Frontend Tests`
- `Test Summary`

To add each check:
1. Type the check name in the search box
2. Click on it when it appears
3. Repeat for all three checks

**Note**: Status checks will only appear in the list after they have run at least once. You may need to:
1. Save the branch protection rule first
2. Create a test pull request to trigger the workflow
3. Return to edit the branch protection rule to add the checks

### 5. Additional Recommended Settings

Consider enabling these additional protections:

- ✅ **Require a pull request before merging**
  - Requires at least one approving review (optional)
  - Dismiss stale pull request approvals when new commits are pushed

- ✅ **Require conversation resolution before merging**
  - All review comments must be resolved

- ✅ **Require linear history** (optional)
  - Prevents merge commits

- ❌ **Do not require status checks for administrators** (not recommended)
  - Even admins should follow the same rules

### 6. Save Changes

1. Scroll to the bottom of the page
2. Click **Create** (for new rule) or **Save changes** (for existing rule)

## Verification

To verify the status checks are working:

1. Create a new branch:
   ```bash
   git checkout -b test-status-checks
   ```

2. Make a small change (e.g., update README.md)
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test status checks"
   git push origin test-status-checks
   ```

3. Create a pull request from this branch to `main`

4. Verify that:
   - GitHub Actions workflow starts automatically
   - Status checks appear on the PR
   - Tests run and complete
   - Merge button is disabled until checks pass

## Troubleshooting

### Status Checks Don't Appear

**Problem**: The status checks you want to require don't show up in the search box.

**Solution**: 
- Status checks only appear after they've run at least once
- Create a test PR to trigger the workflows
- Wait for the workflows to complete
- Return to branch protection settings and add the checks

### Tests Fail on Every PR

**Problem**: Tests consistently fail even though they pass locally.

**Solution**:
- Check GitHub Actions logs for specific errors
- Ensure dependencies are correctly specified in `package.json`
- Verify test configurations work in CI environment
- Check that tests don't depend on local files or configurations

### Cannot Merge Even Though Tests Pass

**Problem**: Merge button is still disabled after tests pass.

**Solution**:
- Check if "Require branches to be up to date before merging" is enabled
- If so, update your branch with latest main:
  ```bash
  git checkout your-branch
  git merge main
  git push
  ```
- Check for other required checks or reviews

### Workflows Don't Trigger

**Problem**: GitHub Actions workflows don't start when creating a PR.

**Solution**:
- Verify workflow files are in `.github/workflows/` directory
- Check workflow trigger configuration (`on: pull_request`)
- Ensure you have Actions enabled in repository settings
- Check if your changes match `paths-ignore` patterns

## Managing Status Checks

### Updating Required Checks

When you add new test jobs to your workflows:

1. Go to Settings → Branches
2. Edit the branch protection rule for `main`
3. Add the new check names
4. Save changes

### Temporarily Bypassing Checks

**For Administrators Only** (not recommended for regular use):

1. If absolutely necessary, admins can bypass checks using:
   - Admin override option in branch protection settings
   - Or by temporarily disabling the rule

2. **Best Practice**: Always try to fix the failing tests instead of bypassing

### Removing Status Checks

To remove a status check requirement:

1. Go to Settings → Branches
2. Edit the branch protection rule
3. Click the X next to the check name
4. Save changes

## Best Practices

1. **Always require core test suites**: Backend and Frontend tests should always be required

2. **Keep checks fast**: Optimize tests to run quickly (aim for < 5 minutes total)

3. **Don't overdo it**: Only require checks that provide real value

4. **Monitor check stability**: If checks frequently fail due to flakiness, fix or remove them

5. **Document exceptions**: If you must bypass checks, document why in the PR

6. **Review regularly**: Periodically review and update required checks

## Additional Resources

- [GitHub Documentation: About Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Documentation: About Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review GitHub Actions workflow logs
3. Open an issue with details about the problem
