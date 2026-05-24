+++
title = "Memkoshi"
description = "Memory system for AI agents. Three-tier extraction, HMAC signing, cross-agent compatible."
weight = 4
date = 2026-05-23

[extra]
image = "/img/projects/memkoshi.svg"
github = "https://github.com/0x04am"
tech = ["Python", "SQLite", "VelociRAG"]

[taxonomies]
tags = ["memkoshi"]
+++

Open-source memory system for AI agents. Three-tier extraction (local regex, LLM API, pi RPC), staged review pipeline with HMAC-SHA256 integrity signing, and 4-layer semantic search via VelociRAG.

Features pattern learning with access-weighted importance scoring, tiered boot context, staleness caveats, and bulk document ingestion. Cross-agent compatible - works with Claude Code, Gemini CLI, or any MCP agent.

321 tests.
