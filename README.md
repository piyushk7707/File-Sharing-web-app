# File Sharing (Droply)

A secure, client-side encrypted file sharing web app built with React, TypeScript, Vite, and Firebase. Designed for fast private sharing with optional expiry and AES encryption.

## Demo
Open locally after following the setup instructions below. The dev server runs at http://localhost:5173 (or next available port).

## Key Features
- Client-side AES encryption/decryption
- Password-protected file downloads
- File expiry metadata (expires after configurable time)
- Firebase Storage + Firestore metadata backend
- Simple, modern React + TypeScript UI

## Tech Stack
- React 18 + TypeScript
- Vite
- Firebase (Storage & Firestore)
- CryptoJS (AES)
- Node email proxy for local email testing

## Quick Start
1. Install dependencies

```bash
npm install
```

2. Create a `.env` file (see `src/config/appConfig.ts` for required keys).

3. Start the local email helper and dev server:

```bash
npm run email-server
npm run dev
# or run both together
npm run dev:full
```

4. Open the app: `http://localhost:5173` (or the port shown by Vite).

## Project Structure
- `src/` — React app
- `functions/` — serverless/email helper typescript functions
- `public/` — static assets

## What I changed for the public repo
- Cleaned unused backend scaffolding and build artifacts
- Added client-side AES encrypt/decrypt UI
- Added file expiry metadata wiring

## Screenshots
(Add screenshots to `public/` and update links below)

![App screenshot](public/screenshot.png)

## Contributing
Feel free to open an issue or a PR. For quick fixes, fork and submit a pull request.

## License
This repository is available under the MIT License. See `LICENSE`.

## Contact
Your Name — your.email@example.com

Project maintained by you. Replace contact details before publishing.
