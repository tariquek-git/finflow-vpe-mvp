# Vercel Setup (MVP)

1. Connect the GitHub repository in Vercel.
2. Set framework to Vite (auto-detected) or leave default.
3. Confirm build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Set environment variables for both Preview and Production:
   - `VITE_ENABLE_AI=false`
   - `VITE_FEEDBACK_URL=mailto:feedback@finflow.app`
5. Set production branch to `main`.
6. Enable preview deployments for pull requests.
