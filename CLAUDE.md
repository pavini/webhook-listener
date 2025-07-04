# HookDebug Project Guidelines

## Project Overview
HookDebug is a React 18+ application built with Vite that allows developers to create HTTP endpoints for testing webhooks and API requests in real-time, similar to webhook.site.

## Core Features
- Create multiple HTTP endpoints for listening to requests
- Real-time request monitoring using WebSockets
- Navigate between different endpoints
- View request details and history

## Development Guidelines

### Testing & Development
- **IMPORTANT**: All tests MUST be run using Docker containers
- NEVER run tests locally on the development machine
- **CRITICAL**: When testing the application, ALWAYS use Docker or Docker Compose
- NEVER run the application locally for testing purposes
- Use the provided Docker configuration for consistent testing environments
- This ensures consistent behavior across different development environments

### Code Standards
- Use TypeScript for type safety
- Follow React 18+ patterns and best practices
- Implement proper error handling
- Use modern JavaScript/TypeScript features
- **ALWAYS run `npm run lint` before committing code changes**
- **ALWAYS run `npm run typecheck` to verify TypeScript compilation**
- Fix all ESLint errors and warnings before submitting PRs

### Project Structure
- Keep components modular and reusable
- Separate business logic from UI components
- Use proper state management patterns
- Implement clean architecture principles

## Technical Stack
- React 18+
- Vite
- TypeScript
- WebSockets for real-time communication
- Docker for testing environment

## Getting Started

### Development
1. Install dependencies: `npm install`
2. Start the backend server: `npm run server:dev`
3. Start the React app: `npm run dev`
4. Visit `http://localhost:5173` to use the application

### Running with Docker
- Build and run (frontend + backend in single container): `docker-compose up --build`
- Access the app at `http://localhost:5173`
- Backend API runs on `http://localhost:3001`
- Stop services: `docker-compose down`

### Usage
1. Create a new endpoint by providing a name and path
2. Send HTTP requests to `http://localhost:3001/your-endpoint-path`
3. View requests in real-time through the web interface
4. Navigate between different endpoints to filter requests
5. Click on any request to view detailed information

## Important Notes
- Never reference AI assistance in code, comments, PRs, or commits
- Focus on clean, maintainable code
- Prioritize user experience and real-time functionality
- Ensure proper error handling and edge cases

## Commit Guidelines
- NEVER reference AI assistance (Claude, AI, etc.) in commit messages
- NEVER add "Co-Authored-By: Claude" or similar AI references
- NEVER use AI-generated footers like "🤖 Generated with [Claude Code]"
- Keep commit messages professional and focused on technical changes
- Use conventional commit format when appropriate