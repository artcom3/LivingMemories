#!/usr/bin/env bash
# PSNR between two frames, e.g. a canvas and frame 0 of its clip, or the two
# sides of a seam. The second image is scaled to the first one's size.
#
# Qualifying a model: frame 0 vs its start_frame should reach ~30 dB.
# Seams between rendered clips can read ~18-25 dB from detail shimmer alone;
# judge those by composition, not by the number (SKILL.md Step 8).
#
# Usage: scripts/landing/seam-check.sh <a.png> <b.png>
set -euo pipefail

a="${1:?usage: seam-check.sh <a.png> <b.png>}"
b="${2:?usage: seam-check.sh <a.png> <b.png>}"

ffmpeg -v info -i "$a" -i "$b" \
  -lavfi "[1:v][0:v]scale2ref[b][a];[a][b]psnr" -f null - 2>&1 |
  grep -o 'average:[0-9.inf]*' | sed 's/average:/PSNR dB: /'
