#!/usr/bin/env bash
# Records trailer footage from the IWER emulator in four short segments (each < 110 s browser lease).
# Needs `npx iwsdk dev up --headless --allow-browser-automation` running in app/.
set -euo pipefail
cd "$(dirname "$0")/../app"
. scripts/iwer/lib.sh
export RECORD_DIR=${RECORD_DIR:-/tmp/trailer-frames} MARKS=${MARKS:-/tmp/marks.txt}
rm -rf "$RECORD_DIR" "$MARKS"
seg() { SEGMENT=$1 $IWSDK_BIN browser run scripts/iwer/storyboard.mjs --timeout 109000 2>&1 | grep -E '^\{"frames' || echo "segment $1: no summary"; }
enter_xr() {
  iw xr enter >/dev/null; iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null
  iw xr set-transform --input-json "{\"device\":\"headset\",\"position\":{\"x\":-0.15,\"y\":1.15,\"z\":1.35},\"orientation\":{\"pitch\":-8,\"yaw\":$1,\"roll\":0}}" >/dev/null
  iw xr set-transform --input-json '{"device":"hand-right","position":{"x":0.1,"y":0.9,"z":1.6}}' >/dev/null
  iw xr set-transform --input-json '{"device":"hand-left","position":{"x":0.1,"y":0.9,"z":1.1}}' >/dev/null
}
# fresh player
ev 'localStorage.clear(), 1' >/dev/null; iw browser reload >/dev/null; sleep 8
enter_xr 150; sleep 2
seg A; seg B; seg C
# returning player with a 21-day demo save (labelled as such in the trailer)
ev "(()=>{const p=JSON.parse(localStorage.getItem('prism-desk-v1'));const d=new Date();for(let i=1;i<=21;i++){const x=new Date(d);x.setDate(d.getDate()-i);const k=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');if(!p.solvedDays.includes(k))p.solvedDays.push(k);}p.solvedDays.sort();localStorage.setItem('prism-desk-v1',JSON.stringify(p));return p.solvedDays.length})()"
iw browser reload >/dev/null; sleep 8
enter_xr 90; sleep 4
seg R
cat "$MARKS"
