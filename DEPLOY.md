# Deploy to GitHub Pages

Run these two commands to push and deploy:

```bash
gh auth login
gh repo create leetcode-tracker --public --source=. --remote=origin --push
```

GitHub Pages will auto-deploy via the Actions workflow on every push to `main`.
The live URL will be: https://<your-github-username>.github.io/leetcode-tracker/
