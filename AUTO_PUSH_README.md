# 🚀 Auto Git Push - Quick Reference

## What is it?

Automatically commits and pushes your code after completing tasks - but only if everything passes validation!

## Quick Start

```bash
# 1. Complete your task
# 2. Mark it done in tasks.md: - [x] 1.1 Your task
# 3. Run:
npm run auto-push
```

## Commands

```bash
npm run auto-push              # Full validation + push
npm run auto-push:dry-run      # Test without pushing
npm run auto-push:no-tests     # Skip tests (faster)
```

## What It Checks

✅ Git changes exist  
✅ Task marked complete  
✅ All sub-tasks done  
✅ ESLint passes  
✅ Tests pass  

## Example Output

```
🚀 Auto Git Push Script
==================================================

📝 Changes detected
✅ Last completed task: 1.2 - Implement authentication
✅ All sub-tasks completed

📋 Running ESLint...
✅ Linting passed

🧪 Running tests...
✅ Tests passed

💾 Committing changes...
🚀 Pushing to remote...
✨ Successfully pushed changes!
```

## Generated Commit

```
feat: Task 1.2 - Implement authentication

Completed task 1.2: Implement authentication

Changes:
- Implemented all required functionality
- All sub-tasks completed
- Tests passing
- No linting errors

Task reference: .kiro/specs/whatsapp-crm-backend/tasks.md
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No completed tasks" | Mark task as `[x]` in tasks.md |
| "Sub-tasks incomplete" | Complete all sub-tasks first |
| "Linting failed" | Run `npm run lint:fix` |
| "Tests failed" | Fix tests with `npm test` |

## Documentation

- 📖 **Full Docs**: `docs/AUTO_GIT_PUSH.md`
- 🚀 **Setup Guide**: `AUTO_PUSH_SETUP.md`
- 📋 **Implementation**: `AUTO_PUSH_IMPLEMENTATION.md`

## Configuration

```bash
# Skip tests
AUTO_PUSH_RUN_TESTS=false npm run auto-push

# Skip linting  
AUTO_PUSH_RUN_LINT=false npm run auto-push

# Dry run
AUTO_PUSH_DRY_RUN=true npm run auto-push
```

---

**Ready to try it?**
```bash
npm run auto-push:dry-run
```
