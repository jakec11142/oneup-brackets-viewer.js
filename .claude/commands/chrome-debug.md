---
description: Start Chrome with debugging and optionally navigate to a URL
---

Start Chrome in WSL with remote debugging, wait for it to be ready, then optionally navigate to a URL.

## Usage

```
/chrome-debug [URL]
```

**Examples:**
- `/chrome-debug http://localhost:3000` - Start Chrome and navigate to local dev server
- `/chrome-debug https://google.com` - Start Chrome and navigate to Google
- `/chrome-debug` - Just start Chrome without navigating

## Implementation Steps

1. **Start Chrome with debugging:**
```bash
pkill -9 chrome 2>/dev/null
sleep 2
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug > /dev/null 2>&1 &
```

2. **Wait for Chrome to be ready:**
```bash
for i in {1..10}; do
  if curl -s http://localhost:9222/json/version >/dev/null 2>&1; then
    echo "Chrome is ready!"
    break
  fi
  sleep 1
done
```

3. **Navigate to URL (if provided):**
- Use `mcp__chrome-devtools__navigate_page` with the URL and 30-second timeout
- Use `mcp__chrome-devtools__take_screenshot` to verify page loaded

## Details

- **Kills existing Chrome** to avoid port conflicts
- **Isolated profile**: Uses `/tmp/chrome-debug` for a clean slate
- **Background process**: Chrome runs in the background
- **Auto-waits**: Polls port 9222 until Chrome is ready (max 10 seconds)

## Advanced Options

### Use a Custom Profile

```bash
pkill -9 chrome 2>/dev/null
sleep 2
google-chrome --remote-debugging-port=9222 --profile-directory=testing > /dev/null 2>&1 &
```

### Headless Mode (no GUI)

```bash
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug > /dev/null 2>&1 &
```

### With Window Size

```bash
google-chrome --remote-debugging-port=9222 --window-size=1920,1080 --user-data-dir=/tmp/chrome-debug > /dev/null 2>&1 &
```

### Disable Security (for local development only!)

```bash
google-chrome --remote-debugging-port=9222 \
  --disable-web-security \
  --disable-features=IsolateOrigins,site-per-process \
  --user-data-dir=/tmp/chrome-debug > /dev/null 2>&1 &
```

### With Extensions Disabled

```bash
google-chrome --remote-debugging-port=9222 --disable-extensions --user-data-dir=/tmp/chrome-debug > /dev/null 2>&1 &
```

### Mobile Device Emulation

```bash
google-chrome --remote-debugging-port=9222 \
  --user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)" \
  --window-size=375,812 \
  --user-data-dir=/tmp/chrome-debug > /dev/null 2>&1 &
```

### Useful Flags Combination

```bash
google-chrome --remote-debugging-port=9222 \
  --disable-gpu \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-extensions \
  --window-size=1920,1080 \
  --user-data-dir=/tmp/chrome-debug > /dev/null 2>&1 &
```

## Available MCP Tools

Once Chrome is running, these MCP tools will work automatically:
- `mcp__chrome-devtools__list_pages` - See open tabs
- `mcp__chrome-devtools__navigate_page` - Navigate to URL
- `mcp__chrome-devtools__take_screenshot` - Capture screenshot
- `mcp__chrome-devtools__click` - Click elements
- And more...

## Troubleshooting

**Chrome not accessible:**
```bash
# Check if running
ps aux | grep chrome

# Test port 9222
curl http://localhost:9222/json/version

# Restart Chrome
pkill -9 chrome && sleep 2 && google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

**MCP connection issues:**
- Restart Claude Code session to reload MCP servers
- Verify: `claude mcp list` (should show chrome-devtools connected)
