import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Setup CSS variables for tests
beforeAll(() => {
  // Add CSS variables to the document for tests
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --text-primary: rgba(255, 255, 255, 0.87);
      --text-secondary: rgba(255, 255, 255, 0.6);
      --bg-primary: #242424;
      --bg-secondary: #1a1a1a;
      --bg-card: #2d2d2d;
      --border-color: #404040;
    }
  `;
  document.head.appendChild(style);
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
