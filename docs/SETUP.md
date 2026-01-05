# Setup Guide

This guide will help you configure the Standalone AVS application for Salesforce authentication.

## Prerequisites

- Node.js 20+
- pnpm 9+
- A Salesforce org with API access

## Salesforce Authentication Setup

You can use either **External Client Apps** (recommended, newer) or **Connected Apps** (legacy) to enable OAuth authentication.

---

## Option 1: External Client App (Recommended)

External Client Apps are Salesforce's modern approach for third-party integrations, offering enhanced security and better admin controls.

### 1. Create an External Client App

1. Log in to your Salesforce org
2. Go to **Setup** → **External Client Apps** → **New External Client App**
3. Fill in the basic information:
   - **Name**: `Standalone AVS`
   - **API Name**: `Standalone_AVS`
   - **Contact Email**: Your email
   - **Description**: AVS Platform Management Application

### 2. Configure OAuth Settings

1. In the **App Settings** section, click **Add** under OAuth Settings
2. Configure the following:
   - **Enable OAuth**: Checked
   - **Callback URL**: 
     ```
     http://localhost:5173/auth/callback
     http://localhost:5174/auth/callback
     ```
     (Add both for local development; add production URLs as needed)
   
3. Select **OAuth Scopes**:
   - `Access the identity URL service (id, profile, email, address, phone)`
   - `Manage user data via APIs (api)`
   - `Perform requests at any time (refresh_token, offline_access)`

4. Under **Client Credentials Flow**:
   - Select **Require Secret for Web Server Flow** (recommended)
   - Optionally enable **Require Proof Key for Code Exchange (PKCE)**

5. Click **Save**

### 3. Get Your Credentials

1. After saving, go to the **OAuth Settings** tab
2. Click **Manage Consumer Details** (you may need to verify your identity)
3. Copy:
   - **Consumer Key** → This is your `SF_CLIENT_ID`
   - **Consumer Secret** → This is your `SF_CLIENT_SECRET`

### 4. Assign Policies (Admin Task)

For users to authenticate, an admin must:

1. Go to **Setup** → **External Client Apps** → Select your app
2. Click **Manage Policies**
3. Configure:
   - **Permitted Users**: `All users may self-authorize` or `Admin approved users are pre-authorized`
   - **IP Relaxation**: Choose based on your security requirements
   - **Refresh Token Policy**: Recommended to set an expiration

---

## Option 2: Connected App (Legacy)

Connected Apps are the traditional method and remain fully supported. Use this if your org hasn't adopted External Client Apps yet.

### 1. Create a Connected App

1. Log in to your Salesforce org
2. Go to **Setup** → **App Manager** → **New Connected App**
3. Fill in the basic information:
   - **Connected App Name**: `Standalone AVS`
   - **API Name**: `Standalone_AVS`
   - **Contact Email**: Your email

### 2. Enable OAuth Settings

1. Check **Enable OAuth Settings**
2. Set **Callback URL**:
   ```
   http://localhost:5173/auth/callback
   http://localhost:5174/auth/callback
   ```
   (Add multiple URLs, one per line)

3. Select **OAuth Scopes**:
   - `Access the identity URL service (id, profile, email, address, phone)`
   - `Manage user data via APIs (api)`
   - `Perform requests at any time (refresh_token, offline_access)`

4. Optionally uncheck **Require Proof Key for Code Exchange (PKCE)** for simpler setup

5. Click **Save**

### 3. Get Your Credentials

After saving, wait 2-10 minutes for the Connected App to activate, then:

1. Go to **Setup** → **App Manager**
2. Find your app and click the dropdown → **View**
3. Click **Manage Consumer Details** (verify your identity if prompted)
4. Copy:
   - **Consumer Key** → This is your `SF_CLIENT_ID`
   - **Consumer Secret** → This is your `SF_CLIENT_SECRET`

### 4. Configure Policies (Optional but Recommended)

1. From the App Manager, click **Manage** on your Connected App
2. Click **Edit Policies**
3. Configure:
   - **Permitted Users**: `All users may self-authorize`
   - **IP Relaxation**: `Relax IP restrictions` (for development)
   - **Refresh Token Policy**: Set based on your security needs

---

## Environment Variables

After obtaining your credentials, create a `.env` file in the **`packages/web/`** directory:

```bash
# File: packages/web/.env

# Salesforce OAuth Configuration
SF_CLIENT_ID=your-consumer-key-here
SF_CLIENT_SECRET=your-consumer-secret-here
SF_REDIRECT_URI=http://localhost:5173/auth/callback
SF_LOGIN_URL=https://login.salesforce.com
```

> **Note**: The `.env` file must be in `packages/web/` (where the SvelteKit app runs), not the repository root.

### Environment Variable Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `SF_CLIENT_ID` | Consumer Key from your Salesforce app | **Required** |
| `SF_CLIENT_SECRET` | Consumer Secret from your Salesforce app | **Required** |
| `SF_REDIRECT_URI` | OAuth callback URL | `http://localhost:5173/auth/callback` |
| `SF_LOGIN_URL` | Salesforce login endpoint | `https://login.salesforce.com` |

### For Salesforce Sandbox

If using a sandbox org, change the login URL:

```bash
SF_LOGIN_URL=https://test.salesforce.com
```

---

## Running the Application

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create your `.env` file with credentials (see above)

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open http://localhost:5173 in your browser

5. Click **Sign in with Salesforce** to authenticate

---

## Troubleshooting

### `invalid_client_id` Error

**Cause**: The `SF_CLIENT_ID` is not set or is incorrect.

**Solution**:
- Verify the `.env` file exists in the project root
- Confirm `SF_CLIENT_ID` matches your app's Consumer Key exactly
- For new apps, wait 2-10 minutes for activation
- Restart the dev server after changing `.env`

### `redirect_uri_mismatch` Error

**Cause**: The callback URL doesn't match what's configured in Salesforce.

**Solution**:
- Check the port number (5173 vs 5174)
- Ensure the exact URL is in your Salesforce app's callback URLs
- URLs are case-sensitive and must match exactly

### `invalid_grant` Error

**Cause**: Authorization code issues.

**Solution**:
- Authorization codes are single-use and expire quickly
- Try the login flow again from the beginning
- Verify your app has the required OAuth scopes

### `PKCE verification failed` Error

**Cause**: PKCE code_challenge doesn't match code_verifier.

**Solution**:
- Clear cookies and try logging in again
- This can happen if the browser session was interrupted during login
- The application fully supports PKCE - ensure your Salesforce app has PKCE enabled

### `user hasn't approved this consumer` Error

**Cause**: The user hasn't authorized the app, or admin approval is required.

**Solution**:
- Check the app's "Permitted Users" policy
- Set to "All users may self-authorize" for development
- Or have an admin pre-authorize users

---

## Demo Mode

For development, testing, or demonstrations without Salesforce authentication, you can enable **Demo Mode**.

### Enabling Demo Mode

Add to your `packages/web/.env` file:

```bash
# Enable demo mode with sample data
DEMO_MODE=true
```

### What Demo Mode Does

- Shows the dashboard with sample data (142 users, 24 groups, etc.)
- Allows UI development and testing without Salesforce credentials
- Displays a "Demo Mode" banner to indicate sample data is being shown
- Navigation and UI features work normally

### When to Use Demo Mode

- Local UI development
- Design reviews and demos
- Testing themes and layouts
- CI/CD visual testing
- When Salesforce credentials are unavailable

### Disabling Demo Mode

Set `DEMO_MODE=false` or remove the variable to require real Salesforce authentication.

---

## Security Considerations

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| Callback URLs | `http://localhost:*` | `https://your-domain.com/auth/callback` |
| IP Relaxation | Relaxed | Enforce login IP ranges |
| PKCE | Optional | Recommended |
| Refresh Token Expiry | Longer (7 days) | Shorter (1-2 hours) |

### Production Checklist

- [ ] Use HTTPS callback URLs only
- [ ] Enable IP restrictions
- [ ] Consider implementing PKCE
- [ ] Set appropriate refresh token expiration
- [ ] Review and restrict OAuth scopes to minimum required
- [ ] Use "Admin approved users" if appropriate
- [ ] Monitor Connected App usage in Setup → Security → Connected Apps OAuth Usage
