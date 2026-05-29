#!/bin/bash
# 将本地素材同步到 chordio-assets 仓库（需先 clone 到 ../chordio-assets）
set -euo pipefail

SRC_LIB="/Users/mikewang/Desktop/Chordio小程序材料/歌曲库"
BOUNCES="/Users/mikewang/Music/Logic/02 - 工作/Chordio/Songs/Bounces"
REPO="/Users/mikewang/WeChatProjects/chordio-assets"

if [[ ! -d "$REPO/.git" ]]; then
  echo "请先 clone: git clone https://github.com/wjxmike/chordio-assets.git $REPO"
  exit 1
fi

# 封面 1.jpeg … 20.jpeg
mkdir -p "$REPO/covers"
for i in $(seq 1 20); do
  src="$SRC_LIB/${i}.jpeg"
  if [[ -f "$src" ]]; then
    cp "$src" "$REPO/covers/${i}.jpeg"
    echo "cover: ${i}.jpeg"
  else
    echo "WARN: missing $src" >&2
  fi
done

# 题目音频：优先 Logic Bounces（1-1.mp3 …），否则回退 歌曲库/{songId}.mp3
mkdir -p "$REPO/song-audio"
QUESTION_IDS=(
  1-1 1-2
  2-1 2-2 2-3
  3-1 3-2 3-3
  4-1 4-2
  5-1 5-2
  6-1 6-2 6-3
  7-1 7-2
  8-1 8-2
  9-1 9-2
  10-1 10-2 10-3
  11-1 11-2
  12-1 12-2 12-3
  13-1 13-2
  14-1 14-2 14-3
  15-1 15-2
  16-1 16-2
  17-1 17-2
  18-1 18-2
  19-1 19-2 19-3
  20-1 20-2
)

for qid in "${QUESTION_IDS[@]}"; do
  songId="${qid%%-*}"
  dest="$REPO/song-audio/${qid}.mp3"
  if [[ -f "$BOUNCES/${qid}.mp3" ]]; then
    cp "$BOUNCES/${qid}.mp3" "$dest"
    echo "audio: ${qid}.mp3 <- Bounces"
  elif [[ -f "$SRC_LIB/${songId}.mp3" ]]; then
    cp "$SRC_LIB/${songId}.mp3" "$dest"
    echo "audio: ${qid}.mp3 <- ${songId}.mp3 (fallback)"
  else
    echo "WARN: missing audio for $qid" >&2
  fi
done

echo "Done. covers=$(ls "$REPO/covers" | wc -l | tr -d ' ') song-audio=$(ls "$REPO/song-audio" | wc -l | tr -d ' ')"
