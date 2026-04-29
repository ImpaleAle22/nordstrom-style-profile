# Push to GitHub - Quick Guide

Your code is ready to push! Follow these steps:

## Step 1: Create Repository on GitHub

Go to: **https://github.com/new**

Fill in:
- **Repository name:** `nordstrom-style-profile`
- **Description:** `Personalized style intelligence app with AI-powered swipe UI`
- **Visibility:** ✅ Public
- **Initialize:** ❌ Leave all checkboxes UNCHECKED (no README, no .gitignore, no license)

Click **"Create repository"**

## Step 2: Push Your Code

After creating the repository, copy your GitHub username and repository name, then run:

```bash
# Set your GitHub username here
GITHUB_USER="YOUR_USERNAME_HERE"

# Add remote and push
git remote add origin https://github.com/$GITHUB_USER/nordstrom-style-profile.git
git branch -M main
git push -u origin main
```

Or simply run these commands with your actual username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/nordstrom-style-profile.git
git branch -M main
git push -u origin main
```

## Step 3: Verify

After pushing, your repository will be at:
`https://github.com/YOUR_USERNAME/nordstrom-style-profile`

## Next: Deploy to Vercel

Once pushed to GitHub:

1. Go to: https://vercel.com/new
2. Import your repository
3. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Deploy!

Your app will be live in ~2 minutes at: `https://nordstrom-style-profile.vercel.app`
