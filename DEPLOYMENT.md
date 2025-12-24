# 🚀 Deployment Guide for WhistlerBrew.com

Your site is ready to deploy! Follow these steps to get it live on GitHub Pages.

## Option 1: GitHub Pages (Recommended - FREE!)

### Step 1: Merge Your Changes to Main

You have two options:

**Option A: Via GitHub Web Interface (Easiest)**
1. Go to: https://github.com/MikeBrew123/whistlerbrew-demos
2. You should see a yellow banner saying "claude/whistlerbrew-homepage-Y6o0Y had recent pushes"
3. Click "Compare & pull request"
4. Review the changes and click "Create pull request"
5. Click "Merge pull request" → "Confirm merge"

**Option B: Via Git Locally**
```bash
# Fetch the latest changes
git fetch origin

# Checkout to main (or master)
git checkout main

# Merge your feature branch
git merge claude/whistlerbrew-homepage-Y6o0Y

# Push to remote
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository: https://github.com/MikeBrew123/whistlerbrew-demos
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar under "Code and automation")
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
5. Click **Save**

### Step 3: Wait for Deployment

1. Go to the **Actions** tab in your repository
2. You should see a workflow called "Deploy to GitHub Pages" running
3. Wait for it to complete (usually takes 1-2 minutes)
4. Once complete, go back to **Settings → Pages**
5. You'll see your site URL: `https://mikebrew123.github.io/whistlerbrew-demos/`

### Step 4: Visit Your Site! 🎉

Your site will be live at:
```
https://mikebrew123.github.io/whistlerbrew-demos/
```

---

## Option 2: Custom Domain (Optional)

Want to use **WhistlerBrew.com** instead of the GitHub Pages URL?

### Prerequisites:
- You need to own the domain `whistlerbrew.com`
- Access to your domain's DNS settings

### Steps:

1. **In GitHub:**
   - Go to **Settings → Pages**
   - Under "Custom domain", enter: `whistlerbrew.com`
   - Click **Save**
   - Check "Enforce HTTPS" (after DNS propagates)

2. **In Your Domain Registrar (GoDaddy, Namecheap, etc.):**

   Add these DNS records:

   **For root domain (whistlerbrew.com):**
   ```
   Type: A
   Name: @
   Value: 185.199.108.153

   Type: A
   Name: @
   Value: 185.199.109.153

   Type: A
   Name: @
   Value: 185.199.110.153

   Type: A
   Name: @
   Value: 185.199.111.153
   ```

   **For www subdomain (optional):**
   ```
   Type: CNAME
   Name: www
   Value: mikebrew123.github.io
   ```

3. **Wait for DNS Propagation** (can take 24-48 hours)

4. **Verify:**
   - Visit `https://whistlerbrew.com`
   - Your site should be live!

---

## Option 3: Other Hosting Platforms

### Netlify (Free)
1. Go to https://netlify.com
2. Drag and drop your project folder
3. Done! You get a free URL like `whistlerbrew.netlify.app`

### Vercel (Free)
1. Go to https://vercel.com
2. Import your GitHub repository
3. Done! Auto-deploys on every commit

### Cloudflare Pages (Free)
1. Go to https://pages.cloudflare.com
2. Connect your GitHub repository
3. Done! Fast global CDN included

---

## Troubleshooting

### "404 - Page Not Found"
- Make sure the workflow in `.github/workflows/deploy.yml` ran successfully
- Check that GitHub Pages is enabled in Settings → Pages
- Ensure your main/master branch contains the latest code

### "Workflow not running"
- Make sure you merged the feature branch into main/master
- Check the Actions tab for any errors
- GitHub Pages source must be set to "GitHub Actions"

### "Site looks broken"
- Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors (F12)

---

## Need Help?

If you run into issues:
1. Check the **Actions** tab for workflow errors
2. Look at **Settings → Pages** for deployment status
3. Visit GitHub Pages docs: https://docs.github.com/pages

Happy deploying! 🎮✨
