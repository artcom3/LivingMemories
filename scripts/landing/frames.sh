#!/usr/bin/env bash
# Extracts the boundary frames of a rendered clip for the seam rule
# (scroll-world SKILL.md Step 5): a connector starts on the previous clip's
# ACTUAL last frame and ends on the next clip's ACTUAL first frame.
#
# Usage: scripts/landing/frames.sh <clip.mp4> [out_dir]
# Writes <out_dir>/<clip>-first.png and <out_dir>/<clip>-last.png.
set -euo pipefail

clip="${1:?usage: frames.sh <clip.mp4> [out_dir]}"
out="${2:-$(dirname "$clip")}"
name="$(basename "$clip" .mp4)"
mkdir -p "$out"

ffmpeg -v error -y -ss 0 -i "$clip" -frames:v 1 "$out/$name-first.png"
ffmpeg -v error -y -sseof -0.15 -i "$clip" -frames:v 1 "$out/$name-last.png"
echo "$out/$name-first.png"
echo "$out/$name-last.png"
