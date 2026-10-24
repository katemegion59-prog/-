#!/usr/bin/env bash
# Полный цикл: видео -> субтитры по словам -> вертикальный ролик 9:16.
# Использование: scripts/make.sh путь/к/видео.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${1:?укажите путь к видео}"
PY="${PY:-.venv/bin/python}"
# Перекодируем в H.264/AAC, чтобы браузер-рендерер гарантированно прочитал файл
ffmpeg -v error -y -i "$SRC" -c:v libx264 -crf 16 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart public/input.mp4
"$PY" scripts/transcribe.py public/input.mp4 public/captions.json
OUT="нейропрофи/$(basename "${SRC%.*}")-9x16.mp4"
mkdir -p нейропрофи
npx remotion render TikTok "$OUT" --codec=h264 --crf=18
echo "Готово: $(pwd)/$OUT"
