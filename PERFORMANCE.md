# Performance Optimization Guide

This document outlines the performance optimizations implemented in HookDebug and provides guidelines for maintaining optimal performance.

## Build Optimizations

### Vite Configuration
- **Code Splitting**: Vendor libraries are split into separate chunks for better caching
- **Asset Optimization**: Images are inlined when small, compressed when large
- **Compression**: Both Gzip and Brotli compression are enabled for production builds
- **Source Maps**: Generated for production debugging while maintaining performance

### Bundle Analysis
```bash
# Analyze bundle size and composition
npm run build:analyze

# Check if bundle size exceeds limits
npm run build:size

# Full build validation
npm run build:check
```

## Performance Budgets

### Bundle Size Limits
- **JavaScript**: Maximum 250 kB per chunk
- **CSS**: Maximum 50 kB total
- **Images**: Maximum 100 kB total
- **Total Bundle**: Maximum 500 kB

### Performance Metrics
- **First Contentful Paint**: < 2 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Cumulative Layout Shift**: < 0.1
- **Total Blocking Time**: < 300ms

## React Optimizations

### Lazy Loading
- `RequestDetails` component is lazy-loaded to reduce initial bundle size
- Components are loaded only when needed using `React.lazy()` and `Suspense`

### Code Splitting
- Vendor libraries (React, ReactDOM) are bundled separately
- Socket.io client is in its own chunk
- Utility libraries are grouped together

## Docker Optimizations

### Multi-stage Builds
- **Frontend Build Stage**: Optimized Node.js Alpine image for building
- **Production Stage**: Minimal runtime image with only necessary files
- **Security**: Non-root user for container security

### Production Dockerfile Features
- Layer caching optimization
- Health check endpoint
- Resource limits and monitoring
- Optimized dependency installation

## CI/CD Performance

### GitHub Actions
- **Parallel Jobs**: Build, test, and security scans run in parallel
- **Caching**: Node modules and Docker layers are cached
- **Artifact Management**: Build outputs are stored with retention policies

### Performance Monitoring
- **Daily Audits**: Automated Lighthouse CI runs
- **Bundle Size Checks**: Automated on every PR
- **Performance Budgets**: Enforced in CI pipeline

## Development Performance

### Hot Module Replacement
- Fast refresh enabled for React components
- Optimized development server configuration
- Efficient file watching and compilation

### TypeScript Configuration
- Incremental compilation enabled
- Build info cached for faster subsequent builds
- Strict mode enabled for early error detection

## Production Performance

### Server Optimizations
- Health check endpoint for monitoring
- Efficient SQLite database operations
- Proper CORS and security headers
- Session management optimization

### Asset Delivery
- Compressed static assets (gzip/brotli)
- Proper caching headers
- Optimized image formats
- CDN-ready asset structure

## Monitoring and Maintenance

### Performance Scripts
```bash
# Run performance audit
npm run performance:audit

# Check performance budgets
npm run performance:budget

# Build and analyze
npm run build:analyze

# Full CI validation
npm run ci:validate
```

### Metrics to Monitor
- Bundle size over time
- Build times
- Runtime performance metrics
- Memory usage
- Network requests

## Best Practices

1. **Regular Audits**: Run performance audits before major releases
2. **Bundle Analysis**: Monitor bundle size growth and composition
3. **Lazy Loading**: Implement for non-critical components
4. **Caching**: Leverage browser and CDN caching
5. **Monitoring**: Set up continuous performance monitoring

## Troubleshooting

### Large Bundle Size
- Check `npm run build:analyze` output
- Identify heavy dependencies
- Implement code splitting
- Consider lazy loading

### Slow Build Times
- Clear `node_modules` and reinstall
- Check TypeScript incremental compilation
- Optimize Docker layer caching
- Review GitHub Actions cache usage

### Performance Regression
- Compare Lighthouse CI results
- Check bundle size trends
- Review recent dependency updates
- Analyze runtime performance metrics