+++
title = "Building an Agent Harness From Scratch, the Arch Way"
date = 2026-07-12
description = "I got tired of agent frameworks deciding everything for me. So I built a harness with nothing in it on purpose. Workflow, stack, behavior, data: you get all of it back."
draft = false

[taxonomies]
tags = ["ai", "agents", "rust", "deep-dive", "synaps"]
+++

yo. So I've been living inside other people's agent frameworks for about a year and I finally snapped.

Every single one of them decides something for you. The system prompt is locked away in some `prompts/` directory you're not supposed to touch. The tool list is whatever the vendor thought was reasonable. The model is whatever the vendor sells. Your turns and your tokens phone home to somewhere, and you find out where by reading a blog post six months later. You install the thing and it shows up already convinced it knows who you are and what you're doing.

I wanted to understand the thing. Not the README version of understanding, the kind you only get by writing every layer yourself in a language that doesn't let you handwave. So I sat down and started writing an agent harness in Rust. It's called SynapsCLI. This post is about why I built it the way I did, and why I think most of the industry is currently building it wrong.

Disclaimer: I haven't solved the agent problem. My claim is smaller: the people trying to solve it for everyone at once are going to lose.

## You Can't Build One Agent for Everyone

Nobody wants to say this part out loud. A pentester, a novelist, a data scientist, and a sysadmin do not share a workflow. They share maybe 10% of one. The pentester wants a shell and a fuzzer and zero guardrails. The novelist wants long-context drafting and a file tree that doesn't get reformatted behind her back. The data scientist wants a notebook kernel. The sysadmin wants a tool that won't `rm -rf` his cluster when it gets confused.

You cannot ship one product that nails all four of those. You can ship one product that's mediocre at all four, which is what we have right now. And the "features" pile up on top of that mediocrity forever, because every team complains about something different and the only answer the vendor knows is "add a setting." That's the bloat. Bloat is the corpse left behind by an impossible goal.

So stop building the product. Build the substrate. Hand people sharp parts and get out of the way. Let them assemble the agent that fits the workflow they actually have, not the workflow some PM drew on a whiteboard in San Francisco.

That's the bet. The whole thing is downstream of that bet.

## Ownership Is the Whole Point

Every complaint I had about every agent I'd used came down to the same thing. The product had decided something for me that should have been mine. There are four faces of this, and they're all the same crime.

**Your workflow.** One-size-fits-all defaults, a hardcoded loop, a tool list you can't shrink. Synaps ships a `disabled_tools` config. Even the builtins are opt-out. If you don't want a web tool in your agent, delete it from the list, it's gone. Nothing is forced.

**Your stack.** Vendor lock-in dressed up as "we picked the best model for you." Synaps runs on Ollama, LM Studio, vLLM, llama.cpp, or any of the hosted APIs. The app starts without Anthropic credentials. It starts without any credentials. Bring whatever you want, swap it mid-session if you feel like it.

**Your agent's behavior.** This one bothers me the most. You cannot read the system prompt steering your own agent in most of these tools. That is insane. The single most important piece of context driving every response is hidden from the user it's acting on behalf of. In Synaps the system prompt has been a plain file on disk since around the fifth commit. Read it, edit it, delete it, write your own. There's also no hardcoded Claude Code identity smuggled into the API preamble, because I ripped that out the moment I noticed it was there.

**Your data.** Telemetry, prompt logging, "we use your conversations to improve the product." No. Your turns are yours.

All four of these are solvable by just... not doing them.

## A Base That Does Nothing, and the AUR for Everything Else

The part I'm proud of: the core is small. Like, embarrassingly small for what it does. It boots to a prompt and waits. No personality, no opinion about what kind of work you're about to do, no "hi I'm Synaps, here's what I can help with today." A REPL, a model client, a tool dispatcher, a conversation log. The whole base.

Everything else is an extension.

I wanted it to feel like the AUR. That was the reference point for the whole extension story. Arch boots to nothing. You install what you want. The package ecosystem, not the base, is where the actual product lives. Synaps is the same shape on purpose. The base is the substrate. The extensions are where your agent actually becomes your agent. Pentester pack, writing pack, ops pack, whatever. You install the sharp parts you want and skip the ones you don't.

The host had to be aggressively dumb for any of this to work, and that part I cannot take credit for. JR, a good friend of mine who's been on Synaps with me from the start, did the heaviest lifting on the extension platform and the host-side surgery that made it possible, including the work that finally got the host to stop assuming anything about what a plugin was for. One commit message from that stretch still makes me smile: *"lego-block sidecar, total modality neutralization."* That's the moment the host stopped having a personality.

Most of that extension platform came together in a single 72-hour weekend sprint. Somewhere around 350 commits. I don't recommend it as a lifestyle but I do recommend it as a forcing function. You find out very fast which abstractions are real and which ones you were just being precious about.

## Lean Is Fast

Minimalism here is not an aesthetic. It's a performance budget.

Every assumption the base layer makes costs you on every single turn. Every default tool you have to skip past, every middleware your prompt has to crawl through, every Python import resolved on startup, every framework abstraction that was built for someone else's use case. It adds up, and you feel it every time you hit enter.

Synaps is from-scratch Rust. There is no framework tax. There is no Python interpreter warming up. You own every millisecond and you own every token. The less the base assumes, the less it costs you every turn. Same idea as ownership, measured in latency instead of features.

One honest engineering note, because I'd rather tell on myself than pretend I got everything right the first time. I tried an auto-cache toggle for prompt caching. Idea was the harness would figure out the best cache breakpoints on its own. Built it, A/B tested it against the manual version, and the manual breakpoints won. Cleanly. So I killed the auto version. Prompt caching itself has been in since day two, but the smart thing was leaving the breakpoints in the user's hands. Which, yeah, on theme.

## The Arch Way

That's it. That's the post.

The substrate doesn't trap you in a workflow. It doesn't hide its prompt from you. It doesn't watch you. It doesn't decide who you are before you've typed anything. It boots to a prompt and waits. You build the agent you actually need on top of it, using the parts you actually want, against the model you actually picked, with the system prompt you actually wrote.

That's the whole pitch. I don't think the industry gets there by piling more features onto frameworks that were already too opinionated on day one. It gets there when somebody ships the boring base that does nothing and lets users do the rest.

Synaps is my version of that bet. v0 is close. If you want to poke at it early, it's on [GitHub](https://github.com/0x04am). Bring your own model. Bring your own prompt. Bring your own tools. Build your own agent.

Next time I'll write about what the extension system looks like from the inside, and why writing a plugin for it feels more like writing a PKGBUILD than configuring a chatbot. See you there.
