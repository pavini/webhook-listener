module.exports = {
  ci: {
    collect: {
      // Collect performance metrics from the built static files
      staticDistDir: './dist',
      // Number of runs to perform
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': 'off',
        // Bundle size checks
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        // Resource hints
        'unused-javascript': ['warn', { maxNumericValue: 20000 }],
        'unused-css-rules': ['warn', { maxNumericValue: 20000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};