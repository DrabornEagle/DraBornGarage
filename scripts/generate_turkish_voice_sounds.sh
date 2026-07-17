#!/usr/bin/env bash
set -euo pipefail

OUT="assets/sounds"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

make_voice() {
  local filename="$1"
  local phrase="$2"
  local raw="$TMP/${filename%.wav}-raw.wav"
  espeak -v tr -s 120 -p 40 -a 190 -g 7 -w "$raw" "$phrase"
  ffmpeg -y -loglevel error -i "$raw" \
    -af "adelay=120,highpass=f=105,lowpass=f=7600,acompressor=threshold=-21dB:ratio=2.4:attack=8:release=140,loudnorm=I=-15:TP=-1.3:LRA=6,apad=pad_dur=0.22,aresample=44100" \
    -ar 44100 -ac 1 -c:a pcm_s16le "$OUT/$filename"
}

make_voice garage_voice_appointment.wav "Yeni randevu var. Lütfen kontrol edin."
make_voice garage_voice_customer_link.wav "Yeni müşteri bağlantı talebi var. Lütfen kontrol edin."
make_voice garage_voice_service.wav "Yeni servis bildirimi var. Lütfen kontrol edin."
make_voice garage_voice_payment.wav "Yeni ödeme bildirimi var. Lütfen kontrol edin."
make_voice garage_voice_generic.wav "Yeni bildirim var. Lütfen kontrol edin."

for file in "$OUT"/garage_voice_*.wav; do
  test -s "$file"
  echo "Generated $file ($(stat -c%s "$file") bytes)"
done
