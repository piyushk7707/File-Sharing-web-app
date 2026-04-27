# Droply - Secure File Sharing

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple.svg)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10.0-orange.svg)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Droply is a secure, client-side encrypted file sharing application. It empowers users to securely share files with end-to-end encryption, password protection, and automated file expiry capabilities. Built with modern web technologies, it ensures high performance, security, and a seamless user experience.

## ✨ Key Features

- **End-to-End Encryption:** Client-side AES encryption ensures files are encrypted before leaving the browser.
- **Secure Authentication:** Complete authentication flow with Email/Password and Google OAuth integration.
- **Access Control:** Password-protected file downloads and shareable secure links.
- **Time-Limited Sharing:** Configurable file expiry metadata (e.g., auto-expire after 24 hours).
- **Backend Architecture:** Powered by Firebase Storage and Firestore for scalable, reliable data management.
- **Email Notifications:** Integrated Node.js backend proxy for secure email sharing and download delivery.

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend Services:** Firebase Authentication, Firestore Database, Firebase Storage
- **Server/Proxy:** Node.js, Express, Nodemailer
- **Security:** CryptoJS (AES Encryption)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase Project (with Auth, Firestore, and Storage enabled)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/piyushk7707/File-Sharing.git
   cd File-Sharing
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Configuration:
   Create a `.env` file in the root directory based on the `.env.example` file and provide your Firebase and SMTP credentials:
   ```env
   # Example required keys
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   # ... refer to .env.example for the full list
   ```

4. Start the development servers:
   ```bash
   # Starts both the React frontend and the Node.js email server
   npm run dev:full
   ```

5. Access the application:
   Open your browser and navigate to `http://localhost:5173`.

## 📁 Architecture Overview

```text
├── src/                  # React Application Source Code
│   ├── components/       # Reusable UI components
│   ├── config/           # Application and Firebase configuration
│   ├── context/          # React Context (Auth State)
│   └── utils/            # Core business logic (Crypto, Auth, Firebase services)
├── emailServer.js        # Node.js backend for email delivery & download proxy
└── public/               # Static assets
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

**Piyush**  
Email: pk29200405@gmail.com  
GitHub: [@piyushk7707](https://github.com/piyushk7707)

---
*Built with ❤️ for secure, seamless file sharing.*
