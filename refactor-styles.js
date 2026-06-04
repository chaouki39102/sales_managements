#!/usr/bin/env node

/**
 * Batch refactor inline styles to utility classes
 * This identifies common patterns and suggests replacements
 */

const fs = require('fs');
const path = require('path');

const commonPatterns = [
  // Flexbox + gap patterns
  { pattern: /style=\{\{\s*display:\s*['"]flex['"]\s*,\s*flexDirection:\s*['"]column['"]\s*,\s*gap:\s*(\d+)\s*\}\}/g, replacement: 'className="flex flex-col gap-$1"' },
  { pattern: /style=\{\{\s*display:\s*['"]flex['"]\s*,\s*alignItems:\s*['"]center['"]\s*,\s*gap:\s*(\d+)\s*\}\}/g, replacement: 'className="flex items-center gap-$1"' },
  { pattern: /style=\{\{\s*display:\s*['"]flex['"]\s*,\s*gap:\s*(\d+)\s*\}\}/g, replacement: 'className="flex gap-$1"' },
  
  // Display none/block
  { pattern: /style=\{\{\s*display:\s*['"]none['"]\s*\}\}/g, replacement: 'className="hidden"' },
  { pattern: /style=\{\{\s*display:\s*['"]block['"]\s*\}\}/g, replacement: 'className="block"' },
  
  // Font sizing
  { pattern: /style=\{\{\s*fontSize:\s*(\d+)\s*\}\}/g, replacement: (match, size) => {
    const fontMap = { 8: 'text-8', 10: 'text-xs', 11: 'text-sm', 12: 'text-md', 13: 'text-base', 14: 'text-lg', 18: 'text-2xl', 22: 'text-22', 36: 'text-5xl' };
    return fontMap[size] ? `className="${fontMap[size]}"` : match;
  }},
];

console.log('Batch refactor patterns ready. Use VS Code Find-Replace with regex enabled.');
console.log('See refactor-styles.js for patterns to copy-paste into Find-Replace dialog.');

