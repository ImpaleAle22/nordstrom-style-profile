#!/bin/bash

# ============================================================
# DEPLOY TO VERCEL - QUICK START SCRIPT
# ============================================================

echo "🚀 Nordstrom Style Profile - Vercel Deployment"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: Run this script from /customer-app directory"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Check git status
echo "📋 Git Status:"
git status --short
echo ""

# Option selection
echo "Choose deployment method:"
echo "  1) Deploy via Vercel CLI (recommended)"
echo "  2) Push to GitHub and deploy via Vercel website"
echo "  3) Just show me the commands"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Deploying via Vercel CLI..."
        echo ""
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "📦 Installing Vercel CLI..."
            npm i -g vercel
        fi
        
        echo "🔐 Logging in to Vercel..."
        vercel login
        
        echo ""
        echo "🚀 Deploying to production..."
        vercel --prod
        
        echo ""
        echo "✅ Deployment complete!"
        echo "🌐 Your app is now live!"
        ;;
    
    2)
        echo ""
        echo "📝 GitHub + Vercel Website Deployment"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        echo "Step 1: Push to GitHub"
        echo "----------------------"
        echo ""
        read -p "Enter your GitHub username: " github_user
        read -p "Enter repository name (default: nordstrom-style-profile): " repo_name
        repo_name=${repo_name:-nordstrom-style-profile}
        
        echo ""
        echo "Creating GitHub repository..."
        
        if command -v gh &> /dev/null; then
            gh repo create $repo_name --public --source=. --remote=origin --push
            echo ""
            echo "✅ Repository created and pushed!"
        else
            echo ""
            echo "Run these commands manually:"
            echo ""
            echo "  # Create repo on GitHub: https://github.com/new"
            echo "  git remote add origin https://github.com/$github_user/$repo_name.git"
            echo "  git push -u origin main"
        fi
        
        echo ""
        echo "Step 2: Import to Vercel"
        echo "------------------------"
        echo ""
        echo "1. Go to: https://vercel.com/new"
        echo "2. Click 'Import Git Repository'"
        echo "3. Select: $github_user/$repo_name"
        echo "4. Framework: Next.js (auto-detected)"
        echo "5. Click 'Deploy'"
        echo ""
        echo "Step 3: Add Environment Variables"
        echo "----------------------------------"
        echo ""
        echo "In Vercel dashboard → Settings → Environment Variables, add:"
        echo ""
        echo "  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url"
        echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
        echo ""
        echo "Done! Your app will be live in ~2 minutes."
        ;;
    
    3)
        echo ""
        echo "📋 Manual Deployment Commands"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        echo "Option A: Vercel CLI"
        echo "--------------------"
        echo "npm i -g vercel"
        echo "vercel login"
        echo "vercel --prod"
        echo ""
        echo "Option B: GitHub + Vercel Website"
        echo "----------------------------------"
        echo "# 1. Create repo on GitHub: https://github.com/new"
        echo "# 2. Push code:"
        echo "git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
        echo "git push -u origin main"
        echo ""
        echo "# 3. Import to Vercel: https://vercel.com/new"
        echo "# 4. Add environment variables in Vercel dashboard"
        echo ""
        echo "Environment Variables:"
        echo "  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url"
        echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
        ;;
    
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📖 For detailed instructions, see: DEPLOYMENT.md"
echo ""
