# CLICK Internet Cafe Management System

A sophisticated, high-performance internet cafe management solution with advanced features and crystal-clear UI.

## Features

- Real-time user management with cabin allocation
- Advanced financial tracking and reporting
- 3D analytics with predictive modeling
- Crystal glass UI theme with smooth animations
- Offline-first architecture with local data persistence
- AI-powered assistant for quick queries
- Comprehensive user graph with top spender analysis
- Gallery view with crystal glass effects
- Automated digital backup system with email delivery
- Smart data merger for seamless version upgrades
- One-click manual backup functionality

## Installation

1. Install Node.js (v18 or higher)
2. Clone the repository
3. Navigate to the project directory
4. Run `npm install`

## Development

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production Build

To create a production build:

```bash
npm run build
```

## Packaging for Distribution

To package the application as a single executable file:

1. First install pkg globally:
```bash
npm install -g pkg
```

2. Then run the packaging script:
```bash
npm run package
```

This will create a `CLICK-Software.exe` file that contains the entire application and can be distributed as a standalone executable.

## Key Functionality

- **10-Minute Warning System**: Visual alerts when user sessions are approaching timeout
- **3D User Graph**: Interactive visualization of top spenders with AI predictions
- **Crystal Glass Gallery**: Beautiful image gallery with premium glass-morphism effects
- **Offline Capability**: Works completely offline with local data storage
- **Auto-Save**: Automatic saving of all data with visual indicators
- **Multi-Themed UI**: Multiple themes including the premium Crystal Glass Edition

## Tech Stack

- Next.js 14 with App Router
- React 18 with TypeScript
- Tailwind CSS with custom animations
- Framer Motion for advanced animations
- LocalStorage for data persistence
- Nodemailer for email backup delivery
- Custom backup service with scheduling

## Backup System

The application includes an advanced digital backup system:

- **Automated Nightly Backups**: Automatically creates and emails backup files every night at 12:00 AM
- **Smart Data Merger**: Imports legacy data from backup.json when upgrading to new versions
- **Manual Backup**: One-click backup functionality accessible from the sidebar
- **Queue System**: Queues backups when internet is unavailable and sends when connection is restored
- **Fast Migration**: Migrates data in under 2 seconds for seamless upgrades

### Email Configuration

To enable email backups, create a `.env.local` file with your Yahoo SMTP settings:

```
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=wellbornson@yahoo.com
EMAIL_PASS=your-app-password
```

Note: For Yahoo Mail, you'll need to generate an app-specific password. Go to Yahoo Account Settings > Security > Generate app password.

## Architecture

The application uses an offline-first approach with local data storage, ensuring reliability even without internet connectivity. All data is automatically saved to the browser's localStorage and can be synchronized when connectivity is restored.

## Security

- Admin PIN protection for sensitive operations
- Secure data handling with client-side encryption
- Blacklist functionality to block specific users
- Role-based access controls