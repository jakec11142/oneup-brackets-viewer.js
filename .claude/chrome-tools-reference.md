# Tools That Work With Chrome Remote Debugging

This document outlines tools and workflows that integrate with Chrome's remote debugging setup.

## 1. Chrome DevTools MCP Tools (Built-in)

Already available through the MCP server:

### Navigation & Page Control
- `mcp__chrome-devtools__navigate_page` - Navigate to URL
- `mcp__chrome-devtools__new_page` - Open new tab
- `mcp__chrome-devtools__list_pages` - List all open tabs

### Visual Inspection
- `mcp__chrome-devtools__take_screenshot` - Capture page screenshots
- `mcp__chrome-devtools__take_snapshot` - Get text-only DOM snapshot (fast)

### Interaction
- `mcp__chrome-devtools__click` - Click elements
- `mcp__chrome-devtools__hover` - Hover over elements
- `mcp__chrome-devtools__type` - Type into inputs

### Analysis
- `mcp__chrome-devtools__list_console_messages` - View console logs/errors
- `mcp__chrome-devtools__list_network_requests` - See all network activity
- `mcp__chrome-devtools__performance_start_trace` - Record performance traces
- `mcp__chrome-devtools__get_performance_insights` - Analyze LCP, CLS, etc.

## 2. Performance Testing Tools

### Lighthouse (Google's Performance Auditor)
```bash
# Install globally
npm install -g lighthouse

# Run audit on port 9222
lighthouse http://localhost:3000 --port=9222 --output=html --output-path=./report.html

# Run with specific categories
lighthouse http://localhost:3000 --port=9222 --only-categories=performance,accessibility
```

**What it tests:**
- Performance (LCP, FCP, TTI, TBT, CLS)
- Accessibility
- Best Practices
- SEO
- PWA compliance

### Chrome DevTools Protocol Performance
```bash
# Use MCP tools for performance traces
mcp__chrome-devtools__performance_start_trace
mcp__chrome-devtools__get_performance_insights
```

## 3. Automation & Scripting

### Puppeteer (Chrome automation library)
```javascript
// Connect to running Chrome instead of launching new one
const puppeteer = require('puppeteer-core');

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222'
});

const page = await browser.newPage();
await page.goto('http://localhost:3000');
await page.screenshot({ path: 'screenshot.png' });
```

### Playwright (Cross-browser automation)
```javascript
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = await context.newPage();
```

## 4. Screenshot & Visual Testing

### Using MCP Tools
```bash
# Take screenshot via MCP
mcp__chrome-devtools__take_screenshot
```

### Percy (Visual regression testing)
```bash
npm install --save-dev @percy/cli @percy/puppeteer

# Connect to existing Chrome and capture snapshots
```

### BackstopJS (Visual regression)
Configure to use existing Chrome instance for comparing UI changes.

## 5. Accessibility Testing

### axe-core (Accessibility engine)
```javascript
// Via Puppeteer connected to port 9222
const { AxePuppeteer } = require('@axe-core/puppeteer');

const results = await new AxePuppeteer(page)
  .analyze();
```

### pa11y (Automated accessibility testing)
```bash
npm install -g pa11y

# Test using Chrome on port 9222
pa11y --runner axe http://localhost:3000
```

## 6. Network Analysis

### Chrome DevTools MCP
```bash
# List all network requests
mcp__chrome-devtools__list_network_requests

# Analyze:
# - API calls
# - Resource loading times
# - Failed requests
# - Response sizes
```

### HAR (HTTP Archive) Files
Export network activity as HAR files for detailed analysis in tools like:
- WebPageTest
- Charles Proxy
- Fiddler

## 7. Console & Error Monitoring

### Using MCP
```bash
# Monitor console logs and errors
mcp__chrome-devtools__list_console_messages
```

### Sentry Integration
Configure Sentry to capture errors from your running app.

## 8. Mobile Device Testing

### Device Emulation
```bash
# Start Chrome with mobile emulation
google-chrome --remote-debugging-port=9222 \
  --user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)" \
  --window-size=375,812 \
  --user-data-dir=/tmp/chrome-debug &
```

### BrowserStack / Sauce Labs
Connect to remote browsers while using local debugging.

## 9. Testing Frameworks

### Jest + Puppeteer
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-puppeteer',
  testEnvironmentOptions: {
    browserURL: 'http://localhost:9222'
  }
};
```

### Cypress
While Cypress uses its own browser control, you can run Chrome separately for comparison testing.

## 10. Development Workflows

### Hot Reload Testing
1. Start your dev server (e.g., `npm run dev`)
2. Start Chrome with debugging: `/chrome-debug http://localhost:3000`
3. Use MCP tools to interact and test
4. Changes auto-reload, MCP connection stays active

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Start Chrome
  run: |
    google-chrome --headless=new --remote-debugging-port=9222 &

- name: Run tests
  run: npm test

- name: Run Lighthouse
  run: lighthouse http://localhost:3000 --port=9222
```

### Performance Monitoring Workflow
1. Start Chrome: `/chrome-debug http://localhost:3000`
2. Record performance: `mcp__chrome-devtools__performance_start_trace`
3. Get insights: `mcp__chrome-devtools__get_performance_insights`
4. Run Lighthouse: `lighthouse http://localhost:3000 --port=9222`
5. Compare results over time

## 11. Debugging Tools

### React DevTools
Works automatically when Chrome has debugging enabled.

### Redux DevTools
Available in your Chrome profile if installed.

### Vue DevTools
Works with debugging enabled.

## Quick Reference Commands

```bash
# Start Chrome with debugging
/chrome-debug http://localhost:3000

# Performance audit with Lighthouse
lighthouse http://localhost:3000 --port=9222 --view

# Take screenshot via curl
curl http://localhost:9222/json | jq '.[0].webSocketDebuggerUrl'

# List all pages
curl http://localhost:9222/json | jq '.[] | {title, url}'

# Monitor console in real-time
mcp__chrome-devtools__list_console_messages
```

## Best Practices

1. **Use headless mode** for CI/CD (faster, less resources)
2. **Keep debugging port consistent** (always use 9222)
3. **Clean profile** for reproducible tests (use `/tmp/chrome-debug`)
4. **Custom profile** for realistic testing (use `--profile-directory`)
5. **Monitor performance** regularly with traces and Lighthouse
6. **Automate visual regression** to catch UI bugs early

## Recommended Tool Stack

**For Performance:**
- Chrome DevTools MCP (built-in)
- Lighthouse (comprehensive audits)

**For Automation:**
- Puppeteer (JavaScript automation)
- MCP tools (quick interactions)

**For Visual Testing:**
- MCP screenshots (quick checks)
- Percy or BackstopJS (regression testing)

**For Accessibility:**
- axe-core (comprehensive checks)
- Lighthouse accessibility audit

**For Debugging:**
- MCP console messages (error monitoring)
- MCP network requests (API debugging)
