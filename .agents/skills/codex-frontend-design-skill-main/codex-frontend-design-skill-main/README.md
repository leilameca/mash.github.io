# Codex Frontend Design Skill

A Codex skill for creating distinctive, production-grade frontend interfaces and landing pages with stronger visual direction, better asset choices, and browser-based visual QA.

This skill is a Codex-focused port of Anthropic's Apache-licensed `frontend-design` skill from the [`anthropics/claude-plugins-official`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) marketplace. It keeps the original goal of avoiding generic AI-generated UI and adds extra guidance for Codex, including broader trigger wording, landing page composition rules, anti-patterns, UI type fit, asset discipline, and browser-based visual QA.

## What It Improves

- Clearer design direction before implementation
- Better landing page first view composition
- Less generic SaaS UI and placeholder copy
- Stronger typography, layout, imagery, and interaction guidance
- Practical desktop, tablet, and mobile visual QA

## Install

Ask Codex on the target computer:

```text
Install the skill from https://github.com/dobromirdikov/codex-frontend-design-skill/tree/main/skills/frontend-design
```

Then restart Codex so the new skill is loaded.

## Use

Invoke it explicitly when you want polished frontend work:

```text
Use $frontend-design to build a distinctive landing page for ...
```

The skill is also designed to trigger for frontend UI work such as landing pages, websites, dashboards, web apps, components, prototypes, games, and visual QA.

## Files

```text
skills/frontend-design/SKILL.md
skills/frontend-design/agents/openai.yaml
```

## Attribution

Based on Anthropic's `frontend-design` skill in `anthropics/claude-plugins-official`, licensed under Apache License 2.0.

This version has been modified for Codex with broader trigger wording, landing page rules, UI anti-patterns, asset guidance, and browser-based visual QA.

## License

Apache License 2.0. See `LICENSE`.
