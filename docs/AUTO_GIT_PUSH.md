# Auto Git Push System

Automated git commit and push system that runs after task completion with comprehensive validation.

## Features

✅ **Automatic Commit Generation**
- Generates meaningful commit messages from completed tasks
- Follows conventional commit format (`feat:`, `fix:`, etc.)
- Includes task number and description

✅ **Comprehensive Validation**
- Runs ESLint to check for code quality issues
- Executes test suite to ensure functionality
- Verifies all sub-tasks are completed
- Only pushes if everything passes

✅ **Smart Task Detection**
- Reads from `.kiro/specs/whatsapp-crm-backend/tasks.md`
- Identifies last completed task
- Checks sub-task completion status

✅ **Safety Features**
- Dry-run mode for testing
- Option to skip tests or linting
- Clear error messages and logging

## Usage

### Basic Usage

After completing a task and marking it as done in `tasks.md`:

```bash
npm run auto-push
```

### Dry Run (Test Without Pushing)

```bash
npm run auto-push:dry-run
```

### Skip Tests (Faster, Less Safe)

```bash
npm run auto-push:no-tests
```

### Manual Execution

```bash
node scripts/auto-git-push.js
```

## How It Works

### 1. Change Detection
- Checks if there are uncommitted changes using `git status`
- Exits early if no changes detected

### 2. Task Validation
- Reads `tasks.md` to find last completed task
- Extracts task number and description
- Verifies all sub-tasks are marked as complete

### 3. Code Quality Checks
- **Linting**: Runs ESLint to check code quality
- **Testing**: Executes test suite with Jest
- Fails fast if any check fails

### 4. Commit Generation
- Creates commit title: `feat: Task X.Y - Description`
- Generates detailed commit body with:
  - Task description
  - Changes summary
  - Task reference link

### 5. Git Operations
- Stages all changes (`git add .`)
- Commits with generated message
- Pushes to remote repository

## Configuration

### Environment Variables

```bash
# Dry run mode (no actual commit/push)
AUTO_PUSH_DRY_RUN=true

# Skip test execution
AUTO_PUSH_RUN_TESTS=false

# Skip linting
AUTO_PUSH_RUN_LINT=false
```

### Example Configurations

**Development (Safe)**
```bash
# Run with all checks
npm run auto-push
```

**Quick Push (Skip Tests)**
```bash
# Faster but less safe
npm run auto-push:no-tests
```

**Test Mode**
```bash
# See what would happen without actually pushing
npm run auto-push:dry-run
```

## Commit Message Format

### Generated Commit Title
```
feat: Task 1.2 - Implement user authentication
```

### Generated Commit Body
```
Completed task 1.2: Implement user authentication

Changes:
- Implemented all required functionality
- All sub-tasks completed
- Tests passing
- No linting errors

Task reference: .kiro/specs/whatsapp-crm-backend/tasks.md
```

## Task File Format

The script expects tasks in this format in `tasks.md`:

```markdown
- [x] 1. Main Task Title
- [x] 1.1 Sub-task one
- [x] 1.2 Sub-task two
- [ ] 1.3 Incomplete sub-task

- [ ] 2. Next Task
```

### Requirements
- Main tasks should be at root level or minimal indentation
- Sub-tasks should be indented under main tasks
- Use `[x]` or `[X]` for completed tasks
- Use `[ ]` for incomplete tasks

## Validation Rules

### When Push is Allowed
✅ Changes detected in git  
✅ Last task is marked complete  
✅ All sub-tasks are complete  
✅ ESLint passes (no errors)  
✅ All tests pass  

### When Push is Blocked
❌ No changes to commit  
❌ No completed tasks found  
❌ Sub-tasks still incomplete  
❌ Linting errors detected  
❌ Test failures  

## Integration with Kiro Hooks

You can set up this script to run automatically after task completion using Kiro hooks.

### Create a Hook

1. Open Kiro Hook UI (Command Palette → "Open Kiro Hook UI")
2. Create new hook with trigger: "On Task Complete"
3. Add action: Run command `npm run auto-push`

### Hook Configuration Example

```json
{
  "name": "Auto Push on Task Complete",
  "trigger": "onTaskComplete",
  "actions": [
    {
      "type": "runCommand",
      "command": "npm run auto-push",
      "cwd": "backend"
    }
  ]
}
```

## Troubleshooting

### "No completed tasks found"
- Ensure tasks are marked with `[x]` in tasks.md
- Check task file path is correct

### "Sub-tasks incomplete"
- Mark all sub-tasks as complete before pushing
- Or remove incomplete sub-tasks if not needed

### "Linting failed"
- Run `npm run lint:fix` to auto-fix issues
- Manually fix remaining errors

### "Tests failed"
- Run `npm test` to see which tests are failing
- Fix failing tests before pushing

### "Failed to push"
- Check git remote is configured
- Ensure you have push permissions
- May need to pull latest changes first

## Best Practices

1. **Complete All Sub-Tasks First**
   - Don't mark main task complete until all sub-tasks are done
   - This ensures comprehensive implementation

2. **Run Tests Locally**
   - Test your changes before marking task complete
   - Faster feedback loop

3. **Use Dry Run for Testing**
   - Test the script with `--dry-run` first
   - Verify commit message looks good

4. **Keep Tasks Atomic**
   - Each task should be a logical unit of work
   - Makes commit history cleaner

5. **Review Before Push**
   - Check `git status` before running script
   - Ensure only intended files are staged

## Examples

### Example 1: Complete Feature Implementation

```bash
# 1. Complete your work
# 2. Mark task as complete in tasks.md
# 3. Run auto-push
npm run auto-push

# Output:
# 🚀 Auto Git Push Script
# ✅ Last completed task: 1.2 - Implement user authentication
# ✅ All sub-tasks completed
# 📋 Running ESLint...
# ✅ Linting passed
# 🧪 Running tests...
# ✅ Tests passed
# 💾 Committing changes...
# 🚀 Pushing to remote...
# ✨ Successfully pushed changes!
```

### Example 2: Dry Run Test

```bash
npm run auto-push:dry-run

# Output:
# 🚀 Auto Git Push Script
# ✅ Last completed task: 2.1 - Add validation middleware
# ✅ All sub-tasks completed
# 📋 Running ESLint...
# ✅ Linting passed
# 🧪 Running tests...
# ✅ Tests passed
# 🔍 DRY RUN MODE - No actual commit/push
```

### Example 3: Blocked by Incomplete Sub-Tasks

```bash
npm run auto-push

# Output:
# 🚀 Auto Git Push Script
# ✅ Last completed task: 3.1 - Setup database schema
# ⚠️  Task 3.1 has incomplete sub-tasks
# Skipping auto-push until all sub-tasks are completed
```

## Security Considerations

- Script only pushes to configured remote
- Requires git credentials to be set up
- Does not expose sensitive information in commits
- Validates code before pushing

## Maintenance

### Updating the Script

The script is located at `backend/scripts/auto-git-push.js`

### Customizing Commit Messages

Edit the `generateCommitMessage()` function to customize format.

### Adding Custom Validations

Add new validation functions before the push operation.

## Support

For issues or questions:
1. Check this documentation
2. Review script logs for error messages
3. Test with dry-run mode first
4. Verify task file format is correct
