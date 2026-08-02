+++
title = "Myx"
description = "Terminal Spotify player with local playback. Album-art-reactive theming, FFT visualizer, synced lyrics."
weight = 2
date = 2026-07-22

[extra]
image = "/img/projects/myx.svg"
github = "https://github.com/HaseebKhalid1507/Myx"
tech = ["Rust", "ratatui", "librespot", "FFT"]

[taxonomies]
tags = ["myx"]
+++

Terminal Spotify client that plays audio locally as a real Spotify Connect device via librespot. No remote-controlling another app.

The theme derives from the album art: dominant colors extracted, mapped to semantic roles with contrast enforcement, cross-faded on track change. FFT visualizer runs on the live PCM stream. Synced lyrics, full library, search, radio, queue and context resume across restarts. Media keys. Linux, macOS, Windows.

Built in one night, hardened the week after. ~12K LOC, 200 tests. On crates.io, the AUR, Homebrew and .deb.
