# Standalone AVS

A platform-agnostic version of the Natterbox Advanced Voice Services (AVS) management application.

## Overview

This project provides a modern, standalone implementation of the Natterbox AVS platform that can operate independently of Salesforce or integrate with multiple CRM platforms including:

- **Salesforce** (initial implementation)
- **Microsoft Dynamics** (future)
- **Standalone mode** (no CRM)

## Tech Stack

- **Frontend**: [SvelteKit](https://kit.svelte.dev/) with TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Light/Dark/Salesforce themes
- **Backend**: Node.js
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Package Manager**: pnpm (monorepo)

## Features

- 🎨 **Three themes**: Light, Dark, and Salesforce Lightning
- 🔐 **Platform-agnostic auth**: Abstract authentication supporting multiple providers
- 📦 **Monorepo architecture**: Separated core logic, platform adapters, and web app
- ✅ **95% test coverage target**: Comprehensive unit, integration, and E2E tests
- 🔌 **Sapien API integration**: Full support for Natterbox voice platform

## Documentation

- **[Architecture Documentation](docs/ARCHITECTURE.md)** - Detailed technical architecture, design decisions, and implementation guide
- **[Setup Guide](docs/SETUP.md)** - How to configure Salesforce OAuth and environment variables

## Quick Start

```bash
# Clone the repository
git clone git@github.com:SemiConscious/standalone-avs.git
cd standalone-avs

# Install dependencies
pnpm install

# Configure Salesforce OAuth (see docs/SETUP.md for details)
# Create packages/web/.env with your Salesforce credentials

# Start development server
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### Environment Configuration

Create a `.env` file in `packages/web/`:

```bash
# packages/web/.env
SF_CLIENT_ID=your-salesforce-consumer-key
SF_CLIENT_SECRET=your-salesforce-consumer-secret
SF_REDIRECT_URI=http://localhost:5173/auth/callback
SF_LOGIN_URL=https://login.salesforce.com
```

See the [Setup Guide](docs/SETUP.md) for detailed instructions on creating a Salesforce External Client App or Connected App.

## Project Structure

```
standalone-avs/
├── packages/
│   ├── core/                  # Platform-agnostic business logic
│   ├── platform-salesforce/   # Salesforce adapter
│   ├── platform-dynamics/     # Dynamics adapter (future)
│   └── web/                   # SvelteKit application
├── e2e/                       # End-to-end tests
├── docs/                      # Documentation
└── .storybook/               # Component documentation
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Lint all packages |
| `pnpm storybook` | Start Storybook component explorer |

## Deployment

### Vercel

This project is configured for deployment to Vercel. The project uses the SvelteKit Vercel adapter and is configured as a monorepo.

#### Prerequisites

1. Install the Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`

#### Environment Variables

Set the following environment variables in your Vercel project settings:

**Required:**
- `SF_CLIENT_ID` - Salesforce OAuth Consumer Key
- `SF_CLIENT_SECRET` - Salesforce OAuth Consumer Secret
- `SF_REDIRECT_URI` - OAuth callback URL (e.g., `https://your-app.vercel.app/auth/callback`)

**Optional:**
- `SF_LOGIN_URL` - Salesforce login URL (defaults to `https://login.salesforce.com`)
- `SALESFORCE_PACKAGE_NAMESPACE` - Salesforce package namespace (defaults to `nbavs`)
- `SAPIEN_HOST` - Sapien API host URL
- `SAPIEN_ORGANIZATION_ID` - Sapien organization ID
- `TTS_HOST` - Text-to-speech service host URL
- `PUBLIC_DEMO_MODE` - Enable demo mode (set to `true` or `1`)
- `DEMO_MODE` - Alternative demo mode flag

#### Deploy

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

**Note for Monorepo Setup:** When linking your project to Vercel for the first time, you may need to configure the root directory in the Vercel dashboard. Set the root directory to the repository root (where `vercel.json` is located). The build command will handle building the correct package.

The Vercel configuration (`vercel.json`) is set up to:
- Build the `@avs/web` package using pnpm workspace filters
- Use pnpm for package management
- Use the SvelteKit framework (auto-detected)
- Deploy to the `iad1` region (US East)

## Contributing

1. Create a feature branch from `develop`
2. Make your changes following [conventional commits](https://www.conventionalcommits.org/)
3. Ensure tests pass and coverage thresholds are met
4. Submit a pull request

## License

Proprietary - Natterbox Ltd.

