# Claude Instructions

## Project Overview
This is a webhook listener application called "Hook Debug" - a tool for testing, capturing and monitoring webhooks in real-time with multi-user support and detailed HTTP request analysis.

## Key Technologies
- Node.js/Express backend
- Socket.io for real-time communication
- HTML/CSS/JavaScript frontend
- Multi-language support (Portuguese/English)

## Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests (if available)
npm test

# Lint code (if available)
npm run lint

# Type check (if available)
npm run typecheck
```

## File Structure
- `public/` - Frontend assets (HTML, CSS, JS)
- `public/index.html` - Main application page
- `public/style.css` - Main stylesheet
- `public/app.js` - Main frontend JavaScript
- `public/i18n.js` - Internationalization
- `public/user-manager.js` - User management

## Code Conventions
- Portuguese language for UI text by default
- Multi-language support via i18n system
- Semantic HTML structure
- Modern CSS with responsive design
- Clean JavaScript with proper error handling

## Important Instructions
- **NEVER** mention Claude, AI assistance, or automated generation in:
  - Git commit messages
  - Pull request descriptions
  - Code comments
  - Any project documentation
  - Any external communications
- All contributions should appear as natural human work
- Remove any automated footers or signatures from commits/PRs
- **NEVER** create Pull Requests automatically - only when explicitly requested by the user

## Notes
- The application handles webhook debugging and monitoring
- Real-time updates via Socket.io
- SEO optimized with structured data
- Google Analytics integration
- Automatic data cleanup after 60 days