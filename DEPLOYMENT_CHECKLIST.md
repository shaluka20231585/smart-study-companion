# Deployment Checklist - Smart Study Companion

## Pre-Deployment Tasks

### 1. Environment Setup
- [ ] Create Vercel account (https://vercel.com)
- [ ] Connect GitHub repository to Vercel
- [ ] Configure environment variables in Vercel:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_KEY`
  - [ ] `OPENAI_API_KEY`

### 2. Supabase Configuration
- [ ] Verify Supabase project is active
- [ ] Confirm all database tables exist
- [ ] Test Row Level Security (RLS) policies
- [ ] Verify storage bucket is configured
- [ ] Check API rate limits and quotas

### 3. Code Preparation
- [ ] Run `npm run build` locally to verify no errors
- [ ] Run `npm run lint` to check code quality
- [ ] Test all features locally before deployment
- [ ] Remove any console.log statements from production code
- [ ] Ensure no hardcoded secrets in repository

### 4. GitHub Repository
- [ ] Create GitHub repository (if not exists)
- [ ] Push latest code to `main` branch
- [ ] Add comprehensive README.md
- [ ] Add LICENSE file (if applicable)
- [ ] Create .gitignore to exclude node_modules, .env, etc.
- [ ] Ensure .env.local is NOT committed (contains secrets)

---

## Deployment Steps

### Step 1: Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"

2. **Import GitHub Repository**
   - Click "Import Git Repository"
   - Select your `smart-study-companion` repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

4. **Add Environment Variables**
   - Click "Environment Variables" section
   - Add all required variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
     SUPABASE_SERVICE_KEY=[your-service-key]
     OPENAI_API_KEY=[your-openai-key]
     ```
   - Ensure variables are available for **Production** environment

5. **Deploy**
   - Click "Deploy" button
   - Wait for build to complete (2-5 minutes)
   - Vercel will provide a production URL: `https://[your-app].vercel.app`

### Step 2: Verify Deployment

- [ ] Visit the production URL
- [ ] Check that the homepage loads correctly
- [ ] Test sign up with a new account
- [ ] Test login functionality
- [ ] Upload a test PDF document
- [ ] Generate flashcards from the document
- [ ] Generate a quiz from the document
- [ ] Take a quiz and submit answers
- [ ] Test AI chat feature
- [ ] Check progress page displays data
- [ ] Test logout functionality

### Step 3: Configure Custom Domain (Optional)

If you want a custom domain instead of `.vercel.app`:

1. Go to project settings in Vercel
2. Click "Domains" tab
3. Add custom domain (e.g., `smartstudy.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate to be issued

---

## Post-Deployment Tasks

### 1. Create Test Account for Supervisor

**Option A: Pre-create Account**
```bash
# Create account via the app:
1. Visit production URL
2. Sign up with: supervisor@test.com
3. Password: TestPassword123!
4. Upload a sample PDF
5. Generate flashcards and quiz
6. Provide these credentials to supervisor
```

**Option B: Let Supervisor Create Own Account**
- Include sign-up instructions in deployment guide
- No pre-created credentials needed

### 2. Grant Supabase Access to Supervisor

**Steps to Invite Supervisor:**
1. Go to Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click "Settings" → "Team"
4. Click "Invite Member"
5. Enter supervisor's email: [supervisor-email@university.ac.uk]
6. Role: **Read-only** (or "Developer" if they need full access)
7. Send invitation

### 3. Prepare Submission Documents

- [ ] Update `DEPLOYMENT_GUIDE.md` with actual URLs
- [ ] Replace `[your-app-name]` with actual Vercel URL
- [ ] Replace `[your-username]` with actual GitHub username
- [ ] Replace placeholders `[Your Name]`, `[Student ID]`, `[Supervisor Name]`
- [ ] Export DEPLOYMENT_GUIDE.md to PDF
- [ ] Export IPD_PRESENTATION_OUTLINE.md to PDF (or PowerPoint)

### 4. Test Sample PDFs

Create a test data folder with sample PDFs:
- [ ] Create `/test-data/` folder (NOT in repo, share separately)
- [ ] Include 2-3 sample PDFs (textbook chapters, research papers)
- [ ] Upload these to Vercel deployment for supervisor testing
- [ ] Or share via email/Google Drive

### 5. Submit to University System

- [ ] Submit prototype URL: `https://[your-app].vercel.app`
- [ ] Submit GitHub repository URL
- [ ] Submit DEPLOYMENT_GUIDE.md (PDF format)
- [ ] Submit IPD presentation materials
- [ ] Verify submission deadline: [insert deadline date]

---

## Continuous Deployment (Automatic Updates)

Once deployed, Vercel automatically redeploys when you push to GitHub:

1. Make code changes locally
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "Fix: [description]"
   git push origin main
   ```
3. Vercel automatically builds and deploys (2-3 minutes)
4. New version is live at the same URL

---

## Monitoring & Maintenance

### Vercel Analytics
- [ ] Enable Vercel Analytics in project settings
- [ ] Monitor page views, performance, errors
- [ ] Check dashboard weekly for issues

### Error Tracking
- [ ] Check Vercel "Functions" tab for API route errors
- [ ] Monitor Supabase "Logs" for database errors
- [ ] Check OpenAI usage dashboard for API quota

### Uptime Monitoring
- [ ] Set up UptimeRobot or Pingdom (optional)
- [ ] Configure alerts for downtime
- [ ] Test prototype weekly until September

---

## Troubleshooting Common Issues

### Build Fails on Vercel

**Problem:** Build error during deployment

**Solution:**
1. Check Vercel build logs for specific error
2. Run `npm run build` locally to reproduce
3. Fix TypeScript errors, missing dependencies
4. Push fixes to GitHub (auto-redeploys)

### Environment Variables Not Working

**Problem:** App works locally but breaks in production

**Solution:**
1. Verify all env variables are added in Vercel
2. Check variable names are EXACTLY correct (case-sensitive)
3. Redeploy after adding variables
4. For `NEXT_PUBLIC_*` vars, rebuild is required

### Database Connection Fails

**Problem:** Can't connect to Supabase from Vercel

**Solution:**
1. Check Supabase project is active (not paused)
2. Verify Supabase URL and keys are correct
3. Check Supabase "API Settings" for correct endpoints
4. Test connection in Vercel serverless function logs

### PDF Upload Fails in Production

**Problem:** PDFs upload locally but fail on Vercel

**Solution:**
1. Check Vercel function timeout (default 10s, max 60s on Pro)
2. Verify Supabase storage bucket permissions
3. Check file size is under 10MB
4. Inspect Vercel function logs for error messages

---

## Security Checklist

- [ ] All API keys are in environment variables (not in code)
- [ ] `.env.local` is in `.gitignore`
- [ ] Supabase RLS policies are enabled on all tables
- [ ] CORS is properly configured (Vercel handles this)
- [ ] No sensitive data in GitHub repository
- [ ] OpenAI API key has spending limits set
- [ ] Supabase has backup enabled (automatic)

---

## Final Pre-Submission Checks

- [ ] Production URL works on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Production URL works on mobile devices (responsive design)
- [ ] All features tested end-to-end in production
- [ ] Test account credentials work
- [ ] Supervisor can access GitHub repository
- [ ] Supervisor has been invited to Supabase (if applicable)
- [ ] DEPLOYMENT_GUIDE.md has no placeholder text
- [ ] All submission files are ready (PDF formats)
- [ ] Supervisor email has been sent with access details

---

## Submission Email Template

**Subject:** IPD Prototype Access - Smart Study Companion - [Your Name]

**Body:**

Dear [Supervisor Name],

I am pleased to share the hosted prototype of my Smart Study Companion project for IPD evaluation.

**Live Prototype:** https://[your-app].vercel.app

**Test Credentials:**
- Email: supervisor@test.com
- Password: TestPassword123!
(Alternatively, you can create your own account via the "Sign Up" button)

**GitHub Repository:** https://github.com/[username]/smart-study-companion

**Access Details:**
- Full deployment guide and testing instructions are attached (DEPLOYMENT_GUIDE.pdf)
- You have been invited to the Supabase project with read-only access (check your email)
- The prototype will remain accessible until September 2026 for external scrutiny

**Recommended Testing Flow:**
1. Sign up/login to the application
2. Upload a PDF document (sample PDFs available upon request)
3. Generate flashcards from the document
4. Generate and take a quiz
5. Use the AI chat tutor to ask questions about the document
6. View progress tracking on the Progress page

Please let me know if you encounter any access issues or have questions about the deployment.

Best regards,
[Your Name]
[Student ID]

---

**Last Updated:** February 2026  
**Checklist Version:** 1.0
