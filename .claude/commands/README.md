# Claude Code Slash Commands

Quick reference for all available slash commands in this project.

## 🔍 Exploration & Research

### `/explore <query>`

Fast codebase exploration and search.

- **Agent:** Explore (fast)
- **Use for:** Finding code, understanding patterns, quick questions
- **Examples:**
  - `/explore how does auth work?`
  - `/explore find all API endpoints`
  - `/explore where is the Button component?`

### `/research <question>`

Deep research on complex codebase questions.

- **Agent:** General-purpose
- **Use for:** Complex multi-step questions, architectural understanding
- **Examples:**
  - `/research how is state management handled?`
  - `/research trace the user login flow`

---

## 🎨 UI Development

### `/ui-build <feature>`

Build new UI features or components.

- **Agent:** ui-feature-builder
- **Use for:** Creating new UI, adding features, building pages
- **Examples:**
  - `/ui-build add a notification dropdown to header`
  - `/ui-build create settings page`
  - `/ui-build implement the search modal`

### `/ui-fix <reference>`

Refactor existing UI to match reference design.

- **Agent:** ui-revamp-reuse-first
- **Use for:** Redesigns, mockup implementations, UI updates
- **Best with:** Screenshot, Figma link, or design description
- **Examples:**
  - `/ui-fix update navbar to match [screenshot]`
  - `/ui-fix redesign profile header`

---

## 📋 Planning & Review

### `/plan <task>`

Create detailed implementation plan before coding.

- **Agent:** Plan
- **Use for:** Complex features needing planning
- **Examples:**
  - `/plan implement team management system`
  - `/plan add real-time notifications`

### `/review <target>`

Code review with standards compliance check.

- **Use for:** Review changes, check compliance
- **Checks:** Design system, accessibility, performance, security
- **Examples:**
  - `/review recent changes`
  - `/review components/auth/`

---

## 🛠️ Utilities

### `/chrome-start`

Start Chrome headless for debugging.

- Launches Chrome on port 9222
- Points to http://localhost:3001
- Enables DevTools Protocol

---

## 💡 Tips

**Combine commands with context:**

```
/explore auth system
[after response]
/plan add OAuth support
[after plan]
/ui-build login form with OAuth
```

**Use with file context:**

- Attach files before using `/review`
- Share screenshots with `/ui-build` or `/ui-fix`

**Agent selection:**

- Fast task? Use `/explore`
- Complex task? Use `/research` or `/plan`
- UI work? Use `/ui-build` or `/ui-fix`

---

## 📁 Location

All commands are in: `.claude/commands/`

To add new commands:

1. Create `<name>.md` file
2. Write the instruction/prompt
3. Use `/name` to invoke

Commands reload automatically!
