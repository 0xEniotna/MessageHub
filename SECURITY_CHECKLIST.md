# 🔒 Security Checklist

## ⚠️ BEFORE PUSHING TO GITHUB

**CRITICAL**: Ensure you complete this checklist before pushing to any public repository!

### ✅ Configuration Files

- [ ] `config/config.env` is NOT committed (should be in .gitignore)
- [ ] Only `config/config.env.example` with placeholder values is committed
- [ ] All environment variables in example file use placeholder values
- [ ] No real API keys, secrets, or credentials in any committed files

### ✅ Session Files

- [ ] No `*.session` files are committed
- [ ] No `*.session-journal` files are committed
- [ ] `sessions/` directory is empty or not committed
- [ ] No phone numbers in file names or paths

### ✅ Database Files

- [ ] No `*.db` files are committed
- [ ] No `*.sqlite` files are committed
- [ ] `data/` directory is empty or not committed
- [ ] No user data or personal information in committed files

### ✅ Logs and Temporary Files

- [ ] No `*.log` files are committed
- [ ] No temporary files with sensitive data
- [ ] No backup files (`.bak`, `.backup`, etc.)
- [ ] No editor temporary files

### ✅ Git Configuration

- [ ] `.gitignore` includes all sensitive file patterns
- [ ] Git history doesn't contain sensitive data
- [ ] No sensitive data in commit messages

## 🛡️ SENSITIVE DATA PATTERNS TO AVOID

Never commit files containing:

### API Credentials

```bash
API_ID=12345678
API_HASH=abcdef1234567890
SECRET_KEY=real-secret-key
ENCRYPTION_KEY=real-encryption-key
```

### Phone Numbers

```bash
+1234567890.session
sessions/+1234567890.session
```

### Database Content

```bash
telegram_sender.db
user_sessions.sqlite
```

### Session Data

```bash
session.session
*.session-journal
```

## 🔍 HOW TO CHECK

### 1. Check Git Status

```bash
git status
# Should NOT show any sensitive files
```

### 2. Check What Will Be Committed

```bash
git add .
git status
# Review carefully - no sensitive files should be staged
```

### 3. Search for Sensitive Patterns

```bash
# Check for API keys
grep -r "API_ID=" . --exclude-dir=venv --exclude-dir=.git

# Check for real phone numbers
find . -name "*+*" -type f

# Check for session files
find . -name "*.session*" -type f

# Check for database files
find . -name "*.db" -o -name "*.sqlite*" | grep -v venv
```

### 4. Verify .gitignore

```bash
# Test if sensitive files are ignored
echo "config/config.env" | git check-ignore --stdin
echo "sessions/test.session" | git check-ignore --stdin
echo "data/test.db" | git check-ignore --stdin
# All should return the file path (meaning they're ignored)
```

## 🚨 IF YOU ACCIDENTALLY COMMITTED SENSITIVE DATA

### 1. Remove from Latest Commit

```bash
git rm --cached config/config.env
git rm -r --cached sessions/
git rm -r --cached data/
git commit --amend -m "Remove sensitive data"
```

### 2. Remove from Git History (if already pushed)

```bash
# WARNING: This rewrites history - coordinate with team
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch config/config.env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (dangerous!)
git push origin --force --all
```

### 3. Rotate Compromised Credentials

- [ ] Generate new API_ID and API_HASH from https://my.telegram.org
- [ ] Generate new SECRET_KEY and ENCRYPTION_KEY
- [ ] Update all deployment environments
- [ ] Revoke old sessions if possible

## ✅ SAFE TO COMMIT

These files are safe to commit:

### Configuration

- `config/config.env.example` (with placeholders only)
- `docker-compose.yml` (no secrets)
- `Dockerfile` (no secrets)

### Code Files

- All `.py`, `.js`, `.ts`, `.tsx` files (without hardcoded secrets)
- Documentation files (`.md`)
- Package files (`package.json`, `requirements.txt`)

### Deployment

- Deployment scripts (without secrets)
- Docker configurations (without secrets)
- CI/CD configurations (using environment variables)

## 🔐 PRODUCTION SECURITY

### Environment Variables

- Use environment variables for all secrets
- Never hardcode credentials in code
- Use different keys for development and production

### Access Control

- Limit repository access to necessary team members
- Use branch protection rules
- Require code reviews for sensitive changes

### Monitoring

- Monitor for accidental credential commits
- Use tools like GitGuardian or GitHub secret scanning
- Regular security audits

## 📞 EMERGENCY CONTACTS

If sensitive data is accidentally exposed:

1. **Immediately** remove from repository
2. **Rotate all compromised credentials**
3. **Check access logs** for unauthorized usage
4. **Notify team members** about the incident
5. **Update security procedures** to prevent recurrence

---

**Remember**: It's better to be overly cautious than to expose sensitive data!
 