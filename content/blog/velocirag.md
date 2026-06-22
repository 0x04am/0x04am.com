+++
title = "Searching My Second Brain in Half a Second"
date = 2026-06-22
description = "I built a four-layer search engine so I could actually find my own notes. No PyTorch, no GPU, runs anywhere. Here's how it came together."
draft = false

[taxonomies]
tags = ["ai", "rag", "search", "deep-dive", "velocirag"]
+++

yo. First off, sorry for the three-week gap. I really thought I'd be more punctual this time. I keep thinking that. Anyway.

So I take a lot of notes. Like, a stupid amount.

It's the cybersec degree. Class notes, labs, CTF writeups, dumb ideas at 3am, all of it goes into markdown. Thousands of files by now. And none of it mattered, because I could never find anything. Ever. I knew the thing I needed was in there. I just couldn't get to it.

grep doesn't cut it. grep needs the exact word you used, and I never remember the exact word. It matches the string, not what I actually meant.

So I looked up how to do this properly. Two options, every time. One: stand up a vector DB and pull down 2GB of PyTorch. Two: some basic single-layer search that confidently hands you the wrong note. Nah. Neither one was it.

So I built it myself. VelociRAG. It's on PyPI, you can install it right now, and this whole post is me walking through what it does, why I bothered when LangChain already exists, and how it actually got built.

## Why I Built It

Yeah, I know LangChain exists. I know LlamaIndex exists. Built my own anyway. Two reasons.

The first one's petty. I wanted it light. Stupidly, aggressively light. Everything out there is bloated past the point of reason, 2GB of torch, wants a GPU, drags in a whole framework that does forty things when I needed it to do exactly one. No thanks. Fast and tiny, or I wasn't shipping it.

The second reason is the one that actually got me to open the editor at midnight: I wanted to *understand* the thing. Not the blog-post version of understanding. The real kind, the kind you can only get by building every single layer with your own hands and then watching each one faceplant in some fresh, humbling way you never saw coming.

## What It Is (and What It Isn't)

So what is it, actually. A search engine for my own brain. Point it at a folder, ask it something the way you'd ask a person who'd actually read your notes, and it throws back what matters. Half a second, give or take.

Here, watch me ask it something straight out of my CS 646 notes:

```text
$ velocirag search "how does dns cache poisoning work"

Found 3 results in 311ms  [daemon]  [vector + metadata + graph]

1. [0.582]  Concepts/DNS Attack.md            rerank=1.00 · via vector
   # DNS Attack → Types of DNS Attacks
   DNS Cache Poisoning (DNS Spoofing): corrupts a resolver's
   cache with false information so it returns the wrong IP...

2. [0.601]  College/CS 646 L12.md             rerank=0.98 · via vector
   # CS 646 L12  (lecture, 2026-04-08)
   DNS stuff still → subdomain cache poisoning...

3. [1.000]  Templates/Show.md                 via metadata
   Show
```

Two solid hits: my DNS attack notes, and the actual CS 646 lecture where we covered it. And one dumb one, result three is a template literally called "Show" that the metadata layer flagged just because the title shared a word.

Quick note on the numbers, because they look backwards at first: the score in brackets is each layer's own confidence, and the layers run on totally different scales. The metadata layer slapping a 1.000 on "Show" just means "exact title-word match," not "best result." The number that actually decides the final order is the rerank score, which is why the two real hits (1.00, 0.98) sit up top and the template sinks to the bottom. Warts and all, but the reranker earns its paycheck.

Four searches run at the same time, and the whole point is that they each cover for what the others are bad at. Embeddings for meaning. BM25 for the exact words that embeddings always fumble, your error codes, your CVE numbers, that one weirdly-named function. A graph for the stuff that's connected without sharing a single keyword. And metadata, for when I just want to filter the pile down. No PyTorch, no GPU, no API keys, nothing phoning home to anyone. I built it to live inside an agent, not rot in a notebook.

## It Started as Just Vector Search

Every RAG starts in the same place. Embed everything, dump the vectors into FAISS, run cosine similarity, call it a day. Mine was no different. v0.1 was basically that and a prayer.

And honestly? It works. It works right up until the moment you go looking for something specific, and then it falls apart in the dumbest possible way. Ask it for an exact error code. A function name. A CVE number. It'll squint, think real hard, and confidently hand you something that's *in the same general vibe*. Cool. Not even close to what I asked for.

## Vector Search Can't Spell, So BM25

Turns out, and nobody warns you about this part, vector search is genuinely terrible at exact matches. It's built for meaning, so a literal string like `CVE-2021-44228` gets smeared into "eh, close enough" mush. Useless right when you need it most.

The fix is embarrassingly old. BM25, straight out of SQLite's FTS5. Type the exact thing, get the exact thing back. Two layers now, each one quietly papering over the other's blind spots.

While I had the hood up anyway, I bolted on a metadata layer too. Frontmatter tags, dates, source paths. So I can say "just my CS 646 notes" instead of dragging all 2,400 documents into every single search.

## The Graph: Related, Not Just Similar

Two layers deep and it was already useful. But useful wasn't the goal. I wanted it to find things that are *connected*, not just things that happen to look alike.

So, a knowledge graph. GLiNER runs over everything and pulls out the entities, the people and tools and concepts. It's extractive, which is the part that matters: it can only tag stuff that's actually sitting in the text, so it never goes off inventing entities that were never there. A second pass then works out how they all wire together. The payoff is the good part. Now I can search for one tool and surface the writeup that never once mentions it by name but is, top to bottom, entirely about it.

One honest caveat before someone opens an issue about it: this layer is an optional extra, and it does drag PyTorch back into the room (GLiNER's the one piece that needs it). The base install stays torch-free on purpose. You opt into the heavy NER only when you actually want it.

## Four Lists, One Answer: RRF + Reranking

So now four searches are running and, shocker, they all disagree. Vector swears the answer is doc A. BM25 is adamant it's doc C. The graph is off in the corner pointing at doc F. Somebody has to make the call.

That somebody is RRF. Reciprocal Rank Fusion. The idea is almost insultingly simple: throw the raw scores out (they're on totally different scales, comparing them is nonsense) and look only at where each doc landed in each list. Show up near the top of more than one list, you float up. [Someone smarter than me does the actual math here](https://blog.serghei.pl/posts/reciprocal-rank-fusion-explained/) if that's your thing.

Then a cross-encoder reranker takes whatever survives and does one last slow, careful pass over the top of the pile. Fusion narrows it down to a handful. The reranker picks the winner.

## The Night I Ripped Out PyTorch

11:25pm. A Thursday. That's the exact commit where this thing stopped being a toy and turned into itself. I ripped out PyTorch.

Here's the corner I'd painted myself into. To embed text you need a model, and the default, normal, everyone-does-it way to run one drags in 2GB of PyTorch plus a heap of CUDA junk you will never once touch. For a project whose entire personality is "light," that's not a dependency, that's a punchline. So I tore the embedder out and dropped ONNX Runtime in its place. 16x faster. 14x smaller. The reranker got the same treatment a bit later, which finally killed the last torch import for good.

And look, I'll be straight with you, the idea wasn't some bolt of genius on my end. Qdrant's FastEmbed did the no-torch thing first. The difference here is that I run the *whole* pipeline on ONNX, embedder and reranker both, not just one corner of it.

## Killing the Feature I Named It After

Okay, story time. VelociRAG started life as a "progressive RAG engine." Progressive search was the entire pitch. The word was right there in the name, in the very first commit, baked into the whole identity of the thing.

About a week in, I deleted it. Just cut it out. It wasn't earning its keep, and the second it was gone everything got simpler and faster and flat-out better. Funny how that goes. Sometimes shipping means taking the feature you literally named the project after and dragging it to the trash. Felt rough for maybe ten minutes. Then it felt great.

## Surviving 7,000 Docs

Early on I tested on, like, fifty notes. Gorgeous. Instant. I was real pleased with myself. Then I pointed it at the actual pile, all seven thousand of them, and watched it inhale my entire RAM and just DIE.

The culprit, once I stopped panicking and actually read the code: building the graph naively is O(n²) on the edges, and FAISS does not enjoy being handed everything at once. The fixes were boring, which is how it usually goes. Batch the indexing. Free the vector store the instant I'm done with it. Cap the edge math before it spirals into the millions. RAM stopped detonating.

Speed was the other half of it. Cold-loading the models on every single search is genuinely painful to sit through, so VelociRAG runs as a daemon now. Warm engine parked on a Unix socket, models already sitting in memory, ready to go. Every search comes back preem, under half a second, no waiting around for the thing to stretch and yawn itself awake.

## Chunking Is Half the Battle

Here's the part everybody skips, and it quietly decides everything: how you chop the documents up. Get the chunking wrong and it does not matter how clever the four layers above it are. They're all just working off garbage.

Most tools hack the text every N characters, which means they'll cheerfully guillotine a sentence clean in half and strand both pieces with zero context. Dumb. So VelociRAG does two things instead. One, every chunk carries a little breadcrumb of where it came from in the doc (contextual headers). Two, it splits on actual topic boundaries instead of blindly counting characters (semantic chunking). Hybrid's the default. Tedious, unglamorous, genuinely no fun to build. And it matters more than almost anything else in here.

## Giving It to Agents: MCP

This whole thing started because I wanted to search my own notes. But the second it actually worked, the next move was obvious and honestly kind of irresistible. Hand it to an agent.

So VelociRAG ships an MCP server. Anything that speaks MCP can reach in and use the full four-layer engine as a tool. And that's not me dreaming up a hypothetical for the blog, it is the literal backbone of my own agent's memory. It remembers things because it can search them. That's the entire trick.

## Indexing Anything: LiteParse Out Front

One catch. VelociRAG only eats markdown. Sounds limiting, right up until you stick something clever in front of it.

What I use is LiteParse (run-llama's parser, not mine, and not part of VelociRAG, I just bolt it on myself). Feed it basically anything, PDFs, slide decks, scanned docs, even images, and it spits clean markdown out the other side. Pipe that into the index and suddenly I'm not searching notes anymore, I'm searching everything I've ever touched. Drop in a research paper, ask it questions half a second later. That's the exact setup that dragged this from "fun weekend toy" to "thing I genuinely can't work without." And you can rig the same with any tool that produces markdown.

## Where It Is Now

So where's it at. v0.7.4. MIT licensed. Up on PyPI, the AUR, and the official MCP registry. 550-odd tests, somewhere around 24K lines once you count source and tests together. For a thing I built to find my own homework, that's faintly ridiculous, and I mean that in the best possible way.

Is it finished? God no. The graph build still drags its feet on a cold index, and I keep finding fresh, creative new ways to break the chunker. But it nails the one thing I set out to do. I can search my entire brain in under half a second. And now, so can my agent.

## Try It

```bash
pip install velocirag
```

Point it at a folder, fire off a search, watch all four layers light up at once. The code's all on [GitHub](https://github.com/0x04am). Go build your own brain, choom.

Next time I'll get into what happened when I finally got sick of Python and rewrote this entire thing in Rust. That one's called Axel. See you there.
