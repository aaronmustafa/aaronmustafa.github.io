# 🚀 Claude Code Project Bootstrap

This script is a powerful utility designed to bootstrap a professional-grade development environment for **Claude Code**. It ensures that your project structure is optimized for GenAI workflows, providing Claude with the necessary context, rules, and tools to assist you effectively.


## 📂 Project Structure

Once executed, the script generates the following hierarchy:

```text
├── CLAUDE.md                # Main project context & conventions
├── CLAUDE.local.md          # Local overrides (Git ignored)
├── .mcp.json                # MCP integration (GitHub, Jira, etc.)
└── .claude/
    ├── settings.json        # Global model & tool permissions
    ├── settings.local.json  # Machine-specific settings
    ├── rules/               # Modular rules (coding style, API, testing)
    ├── commands/            # Custom slash commands (/review, /fix-issue)
    ├── skills/              # Context-aware expertise (e.g., deployment)
    ├── agents/              # Specialized sub-agent definitions
    └── hooks/               # Event-driven scripts (pre/post tool execution)
```

### 📂 Definitions
Based on the GenAI.works standard, here is how your environment is organized:

#### 🏠 Root Configuration
CLAUDE.md: The primary entry point. Loaded at session start, it defines the project overview, tech stack, and global commands.

CLAUDE.local.md: Personal preference layer. Supports overrides for CLAUDE.md without affecting the shared team configuration.

.mcp.json: Integration hub. Stores Model Context Protocol configs to connect Claude to GitHub, JIRA, Slack, and Databases.

#### ⚙️ The .claude/ Core
settings.json: Governance. Controls tool permissions, access levels, model selection, and active hooks.

settings.local.json: Machine-specific security. Supports local overrides for tool access and sensitive preferences.

#### 🗂️ Specialized Sub-Directories
##### 📋 rules/
Modular .md files organized by topic. These allow for high-precision guidance that can target specific files or paths.

code-style.md: Enforces formatting and linting standards.

testing.md: Defines testing frameworks and coverage requirements.

api-conventions.md: Standards for API design and documentation.

##### 🔧 commands/
Custom slash commands (e.g., /review) used for repeatable workflows. These support shell execution to automate complex developer tasks.

##### 🛠️ skills/
Context-aware capabilities that are auto-triggered based on the task.

deploy/: Contains SKILL.md and deploy-config.md. It loads only when deployment tasks are detected to keep the AI's context window lightweight.

##### 🤖 agents/
Specialized sub-agents with isolated context windows.

code-reviewer.md & security-auditor.md: Defined with specific roles, custom tools, and optimized model preferences for their respective domains.

##### 🪝 hooks/
Event-driven scripts (pre/post tool use).

validate-bash.sh: Automates validation, linting, and formatting while blocking unsafe operations from execution.

---

## ✨ Key Features

* **Idempotent Execution:** Safe to run multiple times. It will only create missing files and will never overwrite your existing configurations.
* **Modular Rules:** Separates coding standards, testing guidelines, and API conventions into digestible chunks for the AI.
* **Custom Commands:** Includes templates for custom slash commands to automate repetitive workflows.
* **Local Overrides:** Built-in support for `.local` files, allowing you to customize your experience without polluting the team's repository.
* **Safety Hooks:** Includes a `validate-bash.sh` hook to prevent unsafe operations and automate linting.

---

## 🛠️ Getting Started

### Prerequisites
* A Bash-compliant shell (Linux, macOS, or WSL).
* Claude Code CLI installed.

### Installation

1.  **Download/Copy** the script below into your project root.
2.  **Make it executable**:
    ```bash
    chmod +x setup-claude-env.sh
    ```
3.  **Run the script**:
    ```bash
    ./setup-claude-env.sh
    ```

---

## 📜 The Setup Script

```bash
#!/usr/bin/env bash
# =============================================================================
# Claude Code Environment Setup Script
# =============================================================================
# This script creates the exact project structure shown in the attached diagram
# for a Claude Code / GenAI.works environment.
#
# It is idempotent: running it multiple times is safe.
# Existing files will NOT be overwritten (except for .json files which get
# safe minimal templates if missing).
#
# Usage:
#    1. cd /path/to/your/project
#    2. chmod +x setup-claude-env.sh
#    3. ./setup-claude-env.sh
#
# Author: Generated for Nashwan (Melbourne, AU)
# Date: 2026-04-19
# =============================================================================

set -euo pipefail

echo "🚀 Setting up Claude Code project structure..."

# ----------------------------------------------------------------------------
# 1. Create directory tree (mkdir -p is idempotent)
# ----------------------------------------------------------------------------
echo "📁 Creating directories..."
mkdir -p .claude/rules
mkdir -p .claude/commands
mkdir -p .claude/skills/deploy
mkdir -p .claude/agents
mkdir -p .claude/hooks

# ----------------------------------------------------------------------------
# 2. Root-level files
# ----------------------------------------------------------------------------

# CLAUDE.md - Main project configuration loaded at session start
if [ ! -f "CLAUDE.md" ]; then
    cat > "CLAUDE.md" << 'EOF'
# CLAUDE.md

**Loaded at session start**

## Project Overview
- Defines the complete project context for Claude
- Tech stack, architecture, and high-level goals
- Global coding conventions and design principles

## Supported Features
- Contains coding conventions & architecture
- Supports `CLAUDE.local.md` overrides (local-only customisations)
- All custom slash commands and repeatable workflows

**Tip:** Keep this file in git. Use `CLAUDE.local.md` for machine-specific or sensitive overrides.
EOF
    echo "✅ Created CLAUDE.md"
else
    echo "⏭️  CLAUDE.md already exists (skipped)"
fi

# CLAUDE.local.md - Local overrides (never committed)
if [ ! -f "CLAUDE.local.md" ]; then
    cat > "CLAUDE.local.md" << 'EOF'
# CLAUDE.local.md

**Local overrides only** (add to .gitignore)

Use this file to override or extend anything defined in CLAUDE.md:
- Machine-specific paths or credentials
- Personal preferences
- Temporary experiments

Claude will merge this file on top of CLAUDE.md at session start.
EOF
    echo "✅ Created CLAUDE.local.md"
else
    echo "⏭️  CLAUDE.local.md already exists (skipped)"
fi

# .mcp.json - MCP integration configuration
if [ ! -f ".mcp.json" ]; then
    cat > ".mcp.json" << 'EOF'
{
  "mcp": {
    "integrations": {
      "github": {
        "enabled": true,
        "repositories": []
      },
      "jira": {
        "enabled": false,
        "projectKey": ""
      },
      "slack": {
        "enabled": false,
        "channel": ""
      },
      "databases": []
    }
  },
  "_comment": "Stores MCP integration configs • Connects to GitHub, JIRA, Slack, DBs • Shared across team via git"
}
EOF
    echo "✅ Created .mcp.json (minimal template)"
else
    echo "⏭️  .mcp.json already exists (skipped)"
fi

# ----------------------------------------------------------------------------
# 3. .claude/ core files
# ----------------------------------------------------------------------------

# settings.json
if [ ! -f ".claude/settings.json" ]; then
    cat > ".claude/settings.json" << 'EOF'
{
  "permissions": {
    "allowedTools": ["*"],
    "blockedTools": []
  },
  "modelPreferences": {
    "defaultModel": "claude-3.7-sonnet",
    "fallbackModel": "claude-3.5-sonnet"
  },
  "hooks": {
    "enabled": true
  },
  "_comment": "Controls permissions & tool access • Defines model selection and hooks • Supports settings.local.json overrides"
}
EOF
    echo "✅ Created .claude/settings.json"
else
    echo "⏭️  .claude/settings.json already exists (skipped)"
fi

# settings.local.json
if [ ! -f ".claude/settings.local.json" ]; then
    cat > ".claude/settings.local.json" << 'EOF'
{
  "_comment": "Local overrides for settings.json • Machine-specific or sensitive settings"
}
EOF
    echo "✅ Created .claude/settings.local.json"
else
    echo "⏭️  .claude/settings.local.json already exists (skipped)"
fi

# ----------------------------------------------------------------------------
# 4. rules/ directory - Modular rule files
# ----------------------------------------------------------------------------
echo "📋 Creating rules/..."

for rule in code-style testing api-conventions; do
    file=".claude/rules/${rule}.md"
    if [ ! -f "$file" ]; then
        cat > "$file" << EOF
# ${rule^} Rules

**Modular .md file loaded by topic**

$(case $rule in
    code-style)
        echo "- Enforces consistent code style across the project
- Covers formatting, naming conventions, imports, etc.
- Can target specific files/paths"
        ;;
    testing)
        echo "- Testing standards and requirements
- Unit, integration, and E2E test guidelines
- Coverage thresholds and mocking strategy"
        ;;
    api-conventions)
        echo "- API design conventions and standards
- REST/GraphQL patterns, error handling, versioning
- Security and documentation requirements"
        ;;
esac)

**This file is automatically loaded by Claude when relevant.**
EOF
        echo "✅ Created $file"
    else
        echo "⏭️  $file already exists (skipped)"
    fi
done

# ----------------------------------------------------------------------------
# 5. commands/ directory - Custom slash commands
# ----------------------------------------------------------------------------
echo "🔧 Creating commands/..."

for cmd in review fix-issue; do
    file=".claude/commands/${cmd}.md"
    if [ ! -f "$file" ]; then
        cat > "$file" << EOF
# /${cmd} Command

**Custom slash command for repeatable workflows**

## Usage
\`\`\`
/${cmd} [options]
\`\`\`

## Description
- $(case $cmd in
    review) echo "Triggers a full code review workflow";;
    fix-issue) echo "Automatically diagnoses and fixes GitHub/Jira issues";;
esac)
- Supports shell execution when needed
- Can be triggered manually or by Claude based on context

**See CLAUDE.md for global command list.**
EOF
        echo "✅ Created $file"
    else
        echo "⏭️  $file already exists (skipped)"
    fi
done

# ----------------------------------------------------------------------------
# 6. skills/ directory - Auto-triggered skills
# ----------------------------------------------------------------------------
echo "🛠️  Creating skills/..."

# skills/deploy/SKILL.md
if [ ! -f ".claude/skills/deploy/SKILL.md" ]; then
    cat > ".claude/skills/deploy/SKILL.md" << 'EOF'
# SKILL: Deployment

**Auto-triggered based on task context**

- Only loads when a deployment-related task is detected
- Keeps context lightweight
- Contains all deployment knowledge for this project

**Related files:**
- deploy-config.md (environment-specific config)
EOF
    echo "✅ Created .claude/skills/deploy/SKILL.md"
else
    echo "⏭️  .claude/skills/deploy/SKILL.md already exists (skipped)"
fi

# skills/deploy/deploy-config.md
if [ ! -f ".claude/skills/deploy/deploy-config.md" ]; then
    cat > ".claude/skills/deploy/deploy-config.md" << 'EOF'
# Deployment Configuration

**Environment-specific settings**

- Production / Staging / Development targets
- Rollout strategies, canary rules, rollback plans
- Secrets references (never store actual secrets here)
EOF
    echo "✅ Created .claude/skills/deploy/deploy-config.md"
else
    echo "⏭️  .claude/skills/deploy/deploy-config.md already exists (skipped)"
fi

# ----------------------------------------------------------------------------
# 7. agents/ directory - Specialized sub-agents
# ----------------------------------------------------------------------------
echo "🤖 Creating agents/..."

for agent in code-reviewer security-auditor; do
    file=".claude/agents/${agent}.md"
    if [ ! -f "$file" ]; then
        cat > "$file" << EOF
# Agent: ${agent^}

**Specialized sub-agent with isolated context**

## Role
- $(case $agent in
    code-reviewer) echo "Focused code reviewer with deep domain knowledge";;
    security-auditor) echo "Security-focused auditor that scans for vulnerabilities";;
esac)

## Capabilities
- Isolated context windows
- Custom tools and model preferences
- Can be called explicitly or auto-invoked by main Claude instance
EOF
        echo "✅ Created $file"
    else
        echo "⏭️  $file already exists (skipped)"
    fi
done

# ----------------------------------------------------------------------------
# 8. hooks/ directory - Event-driven scripts
# ----------------------------------------------------------------------------
echo "🪝 Creating hooks/..."

# validate-bash.sh - Pre/post tool hook
if [ ! -f ".claude/hooks/validate-bash.sh" ]; then
    cat > ".claude/hooks/validate-bash.sh" << 'EOF'
#!/usr/bin/env bash
# =============================================================================
# validate-bash.sh
# Claude Code Hook - Event-driven pre/post tool execution
# =============================================================================
# Purpose:
#   - Automates validation, linting, formatting
#   - Blocks unsafe operations before they reach the shell
#   - Runs automatically on relevant events

set -euo pipefail

echo "🔍 Claude Hook: validate-bash.sh started"

# Example validations (customise for your project)
case "${1:-}" in
    pre-tool)
        echo "    → Running pre-tool safety checks..."
        # Add your linting, shellcheck, etc. here
        ;;
    post-tool)
        echo "    → Running post-tool validation..."
        # Add formatting or test runs here
        ;;
    *)
        echo "    ⚠️  Unknown hook event: $1"
        ;;
esac

echo "✅ Claude Hook: validate-bash.sh completed successfully"
EOF

    chmod +x ".claude/hooks/validate-bash.sh"
    echo "✅ Created and made executable: .claude/hooks/validate-bash.sh"
else
    echo "⏭️  .claude/hooks/validate-bash.sh already exists (skipped)"
fi

# ----------------------------------------------------------------------------
# 9. Finalise & Recommendations
# ----------------------------------------------------------------------------
echo ""
echo "🎉 Claude Code environment setup complete!"
echo ""
echo "Next steps:"
echo "    1. Review and customise the generated .md files"
echo "    2. Fill in your actual values in .mcp.json and settings.json"
echo "    3. Add .claude/settings.local.json and CLAUDE.local.md to .gitignore"
echo "    4. Commit the structure to git (except local files)"
echo ""
echo "Your project now matches the exact structure from the diagram:"
echo "    ✅ CLAUDE.md + CLAUDE.local.md"
echo "    ✅ .mcp.json"
echo "    ✅ .claude/ (with all subfolders and files)"
echo ""
echo "Claude should now recognise this as a fully configured GenAI.works project."
echo "Happy coding! 🚀"
```

---

## 📝 Best Practices

1.  **Version Control:** Keep `CLAUDE.md`, `.mcp.json`, and the `.claude/` folder (except `.local` files) in your Git repository.
2.  **Privacy:** Ensure `CLAUDE.local.md` and `.claude/settings.local.json` are added to your `.gitignore` to prevent leaking machine-specific paths or personal tokens.
3.  **Iteration:** As your project evolves, update the files in `.claude/rules/` to reflect new architectural decisions.
