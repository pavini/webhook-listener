// Simple script to help generate favicon content
// This creates the base64 data for different sized favicons

import fs from 'fs';

// Function to create SVG favicon with specific size
function createFaviconSVG(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#282a36"/>
  <circle cx="8" cy="12" r="2" fill="#50fa7b"/>
  <circle cx="16" cy="8" r="2" fill="#8be9fd"/>
  <circle cx="24" cy="12" r="2" fill="#ffb86c"/>
  <path d="M8 14 L16 18 L24 14" stroke="#bd93f9" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8 18 L16 22 L24 18" stroke="#bd93f9" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="16" cy="26" r="1.5" fill="#f8f8f2"/>
</svg>`;
}

// Generate different sizes
const sizes = [16, 32, 96, 192];

sizes.forEach(size => {
  const svg = createFaviconSVG(size);
  fs.writeFileSync(`./public/favicon-${size}x${size}.svg`, svg);
  console.log(`Generated favicon-${size}x${size}.svg`);
});

console.log('Favicon generation complete!');