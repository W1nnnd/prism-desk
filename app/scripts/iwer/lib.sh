# Helpers for driving the IWER emulator from bash (requires a running `iwsdk dev up --allow-browser-automation`).
IWSDK_BIN="node $(pwd)/node_modules/@iwsdk/cli/dist/cli.js"
iw() { $IWSDK_BIN "$@" 2>&1; }
ev() { PRISM_EXPR="$1" $IWSDK_BIN browser run scripts/iwer/eval.mjs 2>&1 | grep '^RESULT ' | head -1 | cut -c8-; }
shot() { local p; p=$($IWSDK_BIN browser screenshot 2>&1 | grep -o '/tmp/iwsdk-screenshot[^"]*' | head -1); cp "$p" "$1" && echo "saved $1"; }
seat() { # sit at the emulated dining table, facing it
  iw xr set-transform --input-json '{"device":"headset","position":{"x":-0.15,"y":1.15,"z":1.35},"orientation":{"pitch":-38,"yaw":90,"roll":0}}' >/dev/null
  ev '__prism.place(), 1' >/dev/null; sleep 1.5; ev '__prism.state().pose'
}
press_cell() { # poke a board cell with the right index fingertip
  local pos; pos=$(ev "__prism.cellWorld($1)")
  local x y z; read -r x y z < <(python3 -c "import json;p=json.loads('$pos');print(p[0],p[1],p[2])")
  iw xr run-sequence --input-json "{\"device\":\"hand-right\",\"steps\":[{\"label\":\"poke\",\"position\":{\"x\":$x,\"y\":$y,\"z\":$z,\"normal\":\"up\"},\"press\":{\"depth\":0.012,\"hold\":0.15,\"retract\":0.05}}]}" | python3 -c "import sys,json;t=sys.stdin.read();d=json.loads(t[t.find('{'):]);print('ok' if d.get('ok') else d.get('error',{}).get('message'))"
}
closeup() { iw xr set-transform --input-json '{"device":"headset","position":{"x":-0.38,"y":1.08,"z":1.35},"orientation":{"pitch":-48,"yaw":90,"roll":0}}' >/dev/null; iw xr set-transform --input-json '{"device":"hand-right","position":{"x":0.1,"y":0.9,"z":1.6}}' >/dev/null; iw xr set-transform --input-json '{"device":"hand-left","position":{"x":0.1,"y":0.9,"z":1.1}}' >/dev/null; sleep 1; }
fresh() { # $1 = JS that prepares localStorage; reload; enter XR seated with hands
  ev "$1" >/dev/null; iw browser reload >/dev/null; sleep 8; iw xr enter >/dev/null; iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null; seat >/dev/null; closeup
}
press_at() { # $1 = JSON [x,y,z] world point; poke it with the right index fingertip
  local x y z; read -r x y z < <(python3 -c "import json;p=json.loads('$1');print(p[0],p[1],p[2])")
  iw xr run-sequence --input-json "{\"device\":\"hand-right\",\"steps\":[{\"label\":\"poke\",\"position\":{\"x\":$x,\"y\":$y,\"z\":$z,\"normal\":\"up\"},\"press\":{\"depth\":0.012,\"hold\":0.2,\"retract\":0.06}},{\"label\":\"rest\",\"position\":{\"relativeTo\":\"body\",\"x\":0.25,\"y\":0.85,\"z\":-0.05},\"anchor\":\"wrist\",\"duration\":0.6}]}" >/dev/null
}
press_button() { press_at "$(ev "__prism.buttonWorld('$1')")"; }
aim_cell() { # point the right hand's ray at a cell (no pinch)
  local P; P=$(ev "__prism.cellWorld($1)"); local x y z; read -r x y z < <(python3 -c "import json;p=json.loads('$P');print(p[0],p[1],p[2])")
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":{\"x\":$x,\"y\":$y,\"z\":$z}}" >/dev/null
}
mark() { echo "$(date +%s.%N) $1" >> "$MARKS"; }
