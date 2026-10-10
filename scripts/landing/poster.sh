#!/usr/bin/env bash
# Builds a scene poster that matches its clip's first frame: the full-width
# canvas centre-cropped to the clip's exact aspect ratio (FLUX 3 Video returns
# 1280x704, slightly wider than 16:9). Poster and frame 0 then share framing,
# so the hand-off from still to video does not jump, and the poster keeps the
# canvas' 1920px sharpness.
#
# Usage: scripts/landing/poster.sh <canvas.png> <clip.mp4> <out.webp>
set -euo pipefail

canvas="${1:?usage: poster.sh <canvas.png> <clip.mp4> <out.webp>}"
clip="${2:?usage: poster.sh <canvas.png> <clip.mp4> <out.webp>}"
out="${3:?usage: poster.sh <canvas.png> <clip.mp4> <out.webp>}"

# tr strips the CR that Windows builds of ffprobe append.
size() { ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$1" | tr -d '\r'; }
IFS=x read -r cw ch < <(size "$clip")
IFS=x read -r iw ih < <(size "$canvas")
h=$(( iw * ch / cw ))
h=$(( h - h % 2 ))
if (( h > ih )); then
  echo "Clip ${cw}x${ch} is taller than the canvas ${iw}x${ih}; crop would exceed it" >&2
  exit 1
fi

ffmpeg -v error -y -i "$canvas" -vf "crop=${iw}:${h}" -c:v libwebp -quality 82 "$out"
echo "$out ${iw}x${h} (clip ${cw}x${ch})"
