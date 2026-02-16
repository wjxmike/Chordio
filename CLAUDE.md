# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chord Hero is a WeChat Mini Program for chord recognition training. Users identify missing chords in a progression by ear.

## Development

Open the `miniprogram/` directory in WeChat Developer Tools. The main entry point is `page/practice/practice`.

## Architecture

### Core Modules

**`utils/chords.js`** - Chord data and question generation
- Pre-computed `SCALE_TRIADS` for all 12 keys (using flat names: C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B)
- Each key has 7 diatonic triads: I, ii, iii, IV, V, vi, vii
- `generateQuestion(rootNote)` returns progression, blankIndex, correctAnswer, and 4 shuffled options
- Weighted random selection: vii has lower probability (weight 5 vs 15 for I/IV/V)

**`utils/audio.js`** - Web Audio API synthesis
- Uses `wx.createWebAudioContext()` (not browser AudioContext)
- ADSR envelope for piano-like attack/decay
- `playProgression()` plays chords with 1.6s interval
- `playOneChord()` for individual chord playback on tap

**`page/practice/`** - Main practice page
- State machine: `idle` → `playing` → `idle` → `selected` → `correct`/`wrong`
- On correct: blank block turns green and shows answer
- On wrong: 600ms delay, then reset selection with hasWronged=true
- Root note is randomly selected once per 15-question session

### Design Specifications

Colors: Background #1C1C1C, Default card #535353, Selected border #FF7A15, Correct #78C04B

Layout based on 402×874 design mockup (multiply by 2 for rpx values).

### WXML Constraints

WXML does not support multi-line attribute values. Keep all class bindings on a single line:
```html
<!-- Wrong -->
<view class="foo
  {{condition ? 'bar' : ''}}
">

<!-- Correct -->
<view class="foo {{condition ? 'bar' : ''}}">
```
