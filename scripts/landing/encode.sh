#!/usr/bin/env bash
# Encodes a rendered clip for scroll scrubbing (scroll-world SKILL.md Step 6):
# native resolution, crf 20, small GOP (the engine seeks a Blob, so all-intra
# is not needed), no audio, faststart, and a light unsharp against softness.
#
# Usage: scripts/landing/encode.sh <src.mp4> <out.mp4>
set -euo pipefail

src="${1:?usage: encode.sh <src.mp4> <out.mp4>}"
out="${2:?usage: encode.sh <src.mp4> <out.mp4>}"
mkdir -p "$(dirname "$out")"

ffmpeg -v error -y -i "$src" -an -vf "unsharp=5:5:0.8:5:5:0.0" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart "$out"

ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,nb_frames -of csv=p=0 "$out"
du -h "$out" | cut -f1
