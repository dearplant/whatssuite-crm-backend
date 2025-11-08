# Auto Git Push - Quick Setup Guide

## 🚀 Quick Start

### 1. Verify Installation

```bash
cd backend
npm run auto-push:dry-run
```

If you see the script output, you're ready to go!

### 2. Complete a Task

1. Work on your task
2. Mark it complete in `.kiro/specs/whatsapp-crm-backend/tasks.md`:
   ```markdown
   - [x] 1.1 Your completed task
   ```

### 3. Run Auto Push

```bash
npm run auto-push
```

That's it! The script will:
- ✅ Check for errors
- ✅ Run tests
- ✅ Create commit
- ✅ Push to git

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run auto-push` | Full validation + push |
| `npm run auto-push:dry-run` | Test without pushing |
| `npm run auto-push:no-tests` | Skip tests (faster) |

## ⚙️ Configuration

### Skip Tests (Faster)
```bash
npm run auto-push:no-tests
```

### Dry Run (Safe Testing)
```bash
npm run auto-push:dry-run
```

### Custom Environment
```bash
AUTO_PUSH_RUN_TESTS=false npm run auto-push
```

## 🔍 What Gets Checked

Before pushing, the script validates:

1. **Changes Exist** - Are there uncommitted changes?
2. **Task Complete** - Is the task marked `[x]` in tasks.md?
3. **Sub-Tasks Done** - Are all sub-tasks complete?
4. **Linting Passes** - No ESLint errors?
5. **Tests Pass** - All tests green?

## 📝 Commit Message Format

The script generates commits like:

```
feat: Task 1.2 - Implement user authentication

Completed task 1.2: Implement user authentication

Changes:
- Implemented all required functionality
- All sub-tasks completed
- Tests passing
- No linting errors

Task reference: .kiro/specs/whatsapp-crm-backend/tasks.md
```

## ❌ Common Issues

### "No completed tasks found"
**Solution**: Mark your task as `[x]` in tasks.md

### "Sub-tasks incomplete"
**Solution**: Complete all sub-tasks or remove them

### "Linting failed"
**Solution**: Run `npm run lint:fix`

### "Tests failed"
**Solution**: Fix failing tests with `npm test`

## 🎯 Best Practices

1. ✅ Complete all sub-tasks before marking main task done
2. ✅ Run `npm test` locally before auto-push
3. ✅ Use dry-run to preview commit message
4. ✅ Keep tasks atomic and focused

## 📚 Full Documentation

See `docs/AUTO_GIT_PUSH.md` for complete documentation.

## 🔗 Integration with Kiro

To auto-run after task completion:

1. Open Kiro Hook UI
2. Create hook: "On Task Complete"
3. Action: `npm run auto-push`

## 🆘 Need Help?

1. Check `docs/AUTO_GIT_PUSH.md`
2. Run with `--dry-run` to test
3. Review error messages in output
