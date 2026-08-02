+++
title = "Building Myx: A Terminal Spotify Player in Rust, in One Night"
date = 2026-08-02
description = "I asked my agent for a terminal Spotify player at 19:16 on a Wednesday. By 2 AM it was on the internet. The full night, in order, with receipts."
draft = false

[taxonomies]
tags = ["rust", "ratatui", "myx", "synaps", "ai", "agents", "deep-dive"]
+++

> id like to create a terminal based spotify player using rust and ratatui. i want it to be lean as fuck and beautiful as fuck.

That's what I said to my agent at 19:16 on a Wednesday night.

By 2:27 AM there was a released music player on the internet with my name on it. Local playback, album art in the terminal, colors that follow the record, an FFT visualizer running on live audio, synced lyrics, a queue that survives restarts. v0.1.3, on crates.io and the AUR. It's called [Myx](https://github.com/HaseebKhalid1507/Myx).

I know. "Built an app in one night with AI" is the most devalued sentence on the internet right now. Half my feed is landing pages people's agents made while they slept. So before anything else, the receipts: over seven hours I sent 109 messages and my agent ran 773 actions. Research, code, builds, deploys, debugging. I didn't write the Rust. I also didn't sleep through it. About every twenty minutes the build hit a fork where somebody needed taste, and the agent doesn't have mine.

The night, in order.

## The one decision that forks everything

A terminal Spotify app can be one of two animals, and you have to pick before you write a line.

Animal one talks to Spotify's Web API and remote-controls whatever device already has Spotify open. Play, pause, skip, search. Tiny binary, zero audio dependencies, lean as hell. Also not a player. Your phone does the playing, somewhere else, and you never see a single audio sample.

Animal two is [librespot](https://github.com/librespot-org/librespot), the open-source Rust implementation of Spotify Connect. The engine inside `ncspot` and `spotify-player`. Your app becomes a real Connect device: authenticates, pulls the encrypted stream, decodes it, plays it out your speakers. Costs you a Premium requirement, a fatter binary, and a dependency on an unofficial protocol lib that bites. Pays you back with the raw PCM stream.

I wanted a visualizer. A real one. Bars that dance because music is moving through the machine, not some fake equalizer widget doing its best Windows Media Player impression. That requires PCM, so animal two, and the lean-as-fuck half of my own pitch took the L on binary size twenty minutes in. Worth it. If I'd built the easy version first I'd have spent the next week trying to fake the one feature I cared about.

## Homework hour

I didn't ask the agent to invent Spotify playback from vibes. We cloned two repos and read them like homework.

First, [spotify-player](https://github.com/aome510/spotify-player). It already solved the miserable parts: librespot session management, Connect device registration, OAuth tokens, and, the crown jewel, a `VisualizationSink` that tees audio samples off to a visualizer. The exact tee'd-sink pattern I'd sketched on instinct, sitting there, proven, MIT licensed. My verdict after reading the whole spine: the backend is a Ferrari engine and the frontend is a spreadsheet.

Second, [noodle](https://github.com/wilfredinni/noodle). A terminal app I'd been admiring for its looks. Semantic theme tokens, gradient math, real surface hierarchy. It has nothing to do with music. Didn't matter, I wanted its design language, so we ported the token system to ratatui and left the rest.

One repo for the engine, one for the paint, and a hard line where each stopped being useful. Nobody's product got cloned. And a nice trick fell out of the reading: one OAuth PKCE flow, one token, fed to both librespot (streaming) and rspotify (Web API for search, library, playlists). One login, two engines.

This is most of my answer when people ask how the agent "knew" how to build this. It didn't. aome510 knew. We read his homework and then did our own assignment.

## where album art?

Verbatim message from me, about two hours in. `ratatui-image` got the cover rendering in the terminal, auto-detecting kitty, sixel or iTerm2 graphics. Looked great. Then I typed the sentence that turned this from "a Spotify TUI" into Myx:

> i want the theme to dynamically change based on album art

The naive version of this feature is a disaster. Pull the dominant colors off the artwork, paint the UI with them, done, right? Covers are neon green on white. Covers are five shades of mud. Covers are 90% black. Do it naively and your terminal's readability is hostage to whatever record comes on.

So the colors don't go straight to the screen. They go through a pipeline: color-thief pulls the dominant palette, RGB↔HSL math reshapes it, and the result gets mapped into semantic roles. Background, surface, text, accent, muted. Contrast gets enforced at that layer, so the vibe changes with the album while the text stays readable on every record I could throw at it.

Then the part that made me sit back in my chair: cross-fades. On track change, every theme token interpolates from the old palette to the new one. No snap. The record changes and the whole terminal shifts with it, smooth, like the room noticed.

Put an album on. Watched the screen breathe. Oh. This is a thing now.

## okay this is shit

Around 10 PM, Myx worked. OAuth worked, playback worked, songs came out of the speakers. And I sent this:

> okay this is shit. only 1 library? no liked songs, no shuffle no queue. Like this is unusable. and wheres the visualiser?

Rude, maybe, but that message was the sprint plan. A working demo answers "can this exist" and I'd stopped caring about that question the moment it did. The question after it is "would I open this tomorrow instead of what I use now," and the honest answer was hell no. No liked songs. No shuffle. No queue. Search was barely there.

So the next stretch was pure feature grind. Six library sections: Home, Liked, Playlists, Albums, Artists, Recent. Search that splits songs, artists and playlists. Synced lyrics in a pane. Radio, so playing one song from search fills the queue with more. Shuffle. A real queue. The visualizer, at last.

An agent will tell you the task is complete the second the stated requirement passes, and it isn't lying, the requirement did pass. The requirement was too small. That bar, "would I use this tomorrow," never came from the agent all night. It can't. It doesn't have to live with the app.

## together its a mess

Then the design review that mattered most, verbatim:

> imma keep it a buck with u, this works great. each individual element looks good. but together its a mess.

Every piece passed inspection alone. Art, library, lyrics, all fine. On screen at once, noise. Four tabs elbowing each other, the visualizer exiled to its own page like a shameful hobby, navigation that made you think about the interface instead of the music.

Note what I didn't say: "move that panel three columns left." When every component is fine and the whole is wrong, the layout math isn't broken, the information architecture is. The agent went and restructured it. Library got a stable left rail. The right side became one focused view at a time, Now Playing, Lyrics, Queue, with arrows and Tab to move between them. The visualizer got folded into Now Playing where it belongs, ambience you live in, not a page you visit.

After that, maybe fifteen rounds of "move the art down a lil," "vis a lil wider," "volume bar to the far right, make the first bar smol af then have them grow." Tedious. Also the difference between a screenshot and a product.

## loading library…

Now the humbling part.

I develop on Jade, my laptop-adjacent box, but Myx's home is Bella, the desktop with the speakers. Early in the night I'd moved the whole loop there: rsync the source, build over SSH, run it in a real tmux pane. Judged every iteration on the machine where the thing would live. Felt thorough. Felt smug about it, even.

Then, right after cutting the first release, Bella served me this:

```text
myx   loading library…

  ‹ Home ›  1/6 · 0

  (empty)
```

Binary built. Keybinds responded. Audio played. Library: empty, forever. The app was alive and dead at the same time, and my dev flow on Jade had hidden the entire bug class behind warm caches and a hot auth token.

My message, verbatim:

> keep fixing until u see that pane populate. something is blocking the ui for some reason

"Until u SEE it" is the load-bearing clause. Not until it compiles, not until tests pass. The agent could SSH into Bella, launch Myx inside a tmux pane, and look at what a user would see, so that pane became the acceptance test. The fixes shipped as v0.1.3: resilient library loading, single-instance safety, a UI that can't wedge itself on startup. The boring release. The one that decides if strangers trust your software.

## now we release it everywhere

Also a verbatim message, sent around midnight, and I meant it. The commit log:

```text
10:51 PM  first full commit: theming, visualizer, lyrics,
          library, search, radio, context resume
11:25 PM  queue persists; resume continues past first song
11:42 PM  adaptive framerate, tokio worker cap, seek + mouse seek
11:42 PM  bundled client id removed. bring your own
11:47 PM  fat-LTO release profile
12:03 AM  cargo-dist pipeline: GitHub Releases, linux + macOS
12:18 AM  Homebrew, AUR, .deb, crates.io publish jobs
 1:02 AM  v0.1.3: frozen UI fix, single-instance, resilient loading
```

Two of those deserve a word.

The 11:42 security commit: my Spotify client ID was baked into the binary from testing. Fine on my machine, mortifying in a public release. Out it came. Myx wants your own ID now, via `MYX_CLIENT_ID` or a config file. Five-minute fix at midnight, very bad blog post if a stranger had found it first.

And the pipeline went in the same night as the features, on purpose. A fresh `cargo install` on a clean machine exposes every assumption your dev shell was covering for. Mine fell over inside ten minutes, a dependency resolution thing, patched at 12:07. The gap between your repo and a stranger's machine is part of the product, and you only find out how wide it is by crossing it.

## the agent part

Alright, the elephant in the terminal.

I built this with [SynapsCLI](https://github.com/HaseebKhalid1507/SynapsCLI), my own harness. It already got its own post, [Building an Agent Harness From Scratch, the Arch Way](/blog/agent-harness-arch-way/), so I'll keep this to what the night looked like from my chair.

I decided what Myx should be. Local playback over remote control. Which repos to steal from. One binary, everything wired in. This is unusable. Together its a mess. Something Elliot Alderson would use. Ship it.

Synaps did the work between those sentences. Read the reference repos. Wrote the color math, ported the design system. Wired librespot, built the tee'd sink, fought OAuth. rsync'd to Bella, built there, launched Myx in tmux panes and debugged what it saw. Set up cargo-dist and the packaging jobs. 773 actions threaded between my 109.

And one confession, since I'm being honest about the workflow. Synaps runs parallel subagents, and on other nights I lean on them hard, some sessions I'm basically air traffic control for a dozen workers. That night I launched exactly one. It died in 47 seconds to a provider error and I didn't bother retrying, because this build was the wrong shape for a swarm. One tightly coupled chain, change code, build on Bella, look at it, feel what's wrong, say so. My eyes were the bottleneck. Ten agents don't make my eyes faster.

That's the whole method, if there is one. The agent carries the weight between decisions. It doesn't get to make them. The moment you stop looking, rejecting and deciding, you're not building fast anymore, you're just accepting output, and output is how you end up with a gorgeous fake demo and a haunted codebase.

## 2:27 AM

Vibe coding is real. So is vibe-coded garbage. The difference is whether you're still there when the thing starts making decisions you should have made yourself.

```bash
cargo install myx
```

GitHub, crates.io, AUR, Homebrew. Premium account and your own Spotify client ID required, blame Spotify for both. Put an album on. Watch the terminal change color.

And since the night was only the start: Myx has [contributors](https://github.com/HaseebKhalid1507/Myx/graphs/contributors) now. Actual humans showed up with PRs. Rafael Bradley built the media key support and chased Windows and macOS quirks I'd never have caught alone. odiumuniverse migrated Myx to the February 2026 Web API and fixed album art in tmux, twice. vishalmakwana111 gave playlists direct playback and fixed a dropped-cover bug. Takumi Ando added a Nix flake. Azamat reviewed and merged a stack of it. I shipped a one-night build and strangers made it better. That part never stops being cool.

At 2:27 AM I told the agent to end the session. "Good stuff today." Music was still going, through a player that didn't exist at dinner. Then I sent one more message. Not a task. Not anything really.

I live for this shit.
