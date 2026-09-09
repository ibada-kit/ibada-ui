# Vercel Deployment & Azure Integration Guide

This guide explains how to deploy the React Charity Portal to **Vercel** and connect it with your backend **Azure Web API** (`ML.Charity.API.Client`).

---

## 📁 Project Architecture & Files

- **Frontend Project Path**: `charity-web/`
- **Backend API Path**: `ML.Charity.API.Client/`
- **Key Files Configured**:
  - `charity-web/vercel.json` - Handles client-side SPA routing fallback on Vercel.
  - `charity-web/src/services/api.ts` - Direct API communication layer with live Azure App Service endpoints.
  - `charity-web/src/types/index.ts` - TypeScript DTOs matching the C# backend models.

---

## 🚀 Step-by-Step Vercel Deployment

You can deploy using either **GitHub Integration** (Recommended for CI/CD) or **Vercel CLI** directly from your terminal.

---

### Method A: Deploy via GitHub (Recommended)

1. **Initialize Git in the frontend repository** (if not already done):
   ```powershell
   cd "e:\mlg\source\other work\charity-web"
   git init
   git add .
   git commit -m "feat: initial charity web portal"
   git branch -M main
   ```

2. **Push to your GitHub repository**:
   ```powershell
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

3. **Import into Vercel**:
   - Navigate to [https://vercel.com](https://vercel.com) and sign in.
   - Click **"Add New..."** > **"Project"**.
   - Select your GitHub repository and click **"Import"**.

4. **Project Settings on Vercel**:
   - **Framework Preset**: `Vite` *(detected automatically)*
   - **Root Directory**:
     - If the repository only contains `charity-web`, leave as `./`.
     - If the git repository contains the entire solution, set Root Directory to `charity-web`.
   - **Build Command**: `npm run build` *(auto-detected)*
   - **Output Directory**: `dist` *(auto-detected)*

5. **Click "Deploy"**:
   - Vercel builds and hosts your app with an SSL HTTPS domain (e.g. `https://your-charity-portal.vercel.app`).

---

### Method B: Deploy via Vercel CLI (Quickest)

1. Open PowerShell in `charity-web`:
   ```powershell
   cd "e:\mlg\source\other work\charity-web"
   ```

2. Run Vercel CLI:
   ```powershell
   npx vercel
   ```

3. Answer the setup prompts:
   - **Set up and deploy?**: `y`
   - **Which scope?**: Select your account.
   - **Link to existing project?**: `N`
   - **Project Name**: `charity-web`
   - **Directory location**: `./`
   - **Modify settings?**: `N`

4. Deploy to production:
   ```powershell
   npx vercel --prod
   ```

---

## ⚙️ Vercel Routing Configuration (`vercel.json`)

To prevent HTTP 404 errors when users refresh on client routes, `charity-web/vercel.json` is configured as follows:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 🔗 Connecting to Azure Web API (`ML.Charity.API.Client`)

The frontend application uses environment variables to switch between offline dummy data and the live Azure App Service backend.

### Environment Variables

### Environment Variables

| Variable Name | Description | Default / Production Value |
|---|---|---|
| `VITE_API_BASE_URL` | Hosted .NET 8 Web API endpoint | `https://mlcharitywebapi-g6evcsavaqf6drej.centralindia-01.azurewebsites.net/api` |

### Adding Environment Variables on Vercel

1. Open your project on the **Vercel Dashboard**.
2. Go to **Settings** > **Environment Variables**.
3. Add:
   - **Key**: `VITE_API_BASE_URL`, **Value**: `https://mlcharitywebapi-g6evcsavaqf6drej.centralindia-01.azurewebsites.net/api`
4. Trigger a **Redeploy** from the Deployments tab to apply the new variables.

---

### Backend CORS Configuration (Azure API)

Ensure `Program.cs` in `ML.Charity.API.Client` allows cross-origin requests from your Vercel domain:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVercelApp", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "https://*.vercel.app",
            "https://your-custom-domain.com"
        )
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

// Inside app pipeline:
app.UseCors("AllowVercelApp");
```

---

## 🧪 Local Testing Before Deployment

```powershell
# Run local dev server
cd "e:\mlg\source\other work\charity-web"
npm run dev

# Test production build locally
npm run build
npm run preview
```
