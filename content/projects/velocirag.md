+++
title = "VelociRAG"
description = "4-layer retrieval engine. Vector + BM25 + knowledge graph + metadata. No GPU, no API keys."
weight = 3
date = 2026-05-23

[extra]
image = "/img/projects/velocirag.svg"
github = "https://github.com/0x04am"
tech = ["Python", "FAISS", "ONNX", "MCP"]

[taxonomies]
tags = ["velocirag"]
+++

Open-source 4-layer retrieval engine fusing vector search, BM25 keywords, knowledge graph traversal, and metadata filtering with RRF + cross-encoder reranking.

ONNX-only. No PyTorch, no GPU, no API keys. Sub-200ms warm search. Ships with MCP server, CLI, and Unix socket daemon.

Published on PyPI, AUR, and the official MCP Registry. 654 tests, 36K LOC.
