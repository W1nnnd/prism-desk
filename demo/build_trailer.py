#!/usr/bin/env python3
"""Edit the Prism Desk trailer from IWER screencast frames + offline Piper narration.
Inputs: RECORD_DIR frames (t<epoch>.jpg), MARKS file, docs/screenshots stills.
Outputs: demo/prism_desk_trailer.mp4 (+ .srt)."""
import glob, json, os, re, subprocess, wave
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FR = os.environ.get('RECORD_DIR', '/tmp/trailer-frames')
MARKS = os.environ.get('MARKS', '/tmp/marks.txt')
WORK = '/tmp/trailer-build'
PIPER = os.environ.get('PIPER', '/tmp/piperenv/bin/piper')
VOICE = os.environ.get('VOICE', '/workspace/tts/en_US-ljspeech-high.onnx')
FONT = '/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf'
W, H, FPS = 1280, 720, 30
os.makedirs(WORK, exist_ok=True)
URL = 'w1nnnd.github.io/prism-desk'

SCENES = [
  ('card', ['Prism Desk', 'A daily light puzzle that lives on your real desk'],
   "Prism Desk. A daily light puzzle that lives on your real desk."),
  ('frames', 'placement', None,
   "Put on your Quest and sit down. Prism Desk finds the table in front of you, and sets a small puzzle board within easy reach, about two feet away."),
  ('frames', 'tutorial1', None,
   "No controllers, and no wall of text. A glowing ring marks the first mirror. Touch it with your fingertip, and the light reaches the crystal."),
  ('frames', 'tutorial2', None,
   "Mirror out of reach? Point your hand and pinch. The second lesson teaches the pinch ray in seconds."),
  ('frames', 'finish', None,
   "Then the real game begins. Every day brings three new puzzles, generated from the date, so everyone plays the same set. A solver checks each one, so there is always an answer."),
  ('frames', 'spill', None,
   "When the beam misses, the light doesn't stop at the board. It spills into your room, and lands on your real walls."),
  ('frames', 'dwell', None,
   "Prism Desk is designed for seated, one-handed play. Dwell mode selects a mirror when you hold your aim. No pinch needed."),
  ('still', 'docs/screenshots/xr_07_high_contrast.png',
   "High contrast mode keeps every tile and beam easy to read, and the control dock can swap to either side."),
  ('frames', 'daycomplete', None,
   "Finish the day, and a new crystal grows in your garden."),
  ('frames', 'garden_view', 'Demo save - 21 days of play',
   "Come back tomorrow to keep your streak and grow the garden. This is a demo save with three weeks of play."),
  ('frames', 'anchor_exit', None,
   "Spatial anchors remember your desk. Leave, come back, and the board is right where you left it."),
  ('card', ['Prism Desk', 'Play now in Meta Quest Browser', URL, 'Gaming  ·  New Experience', 'Built with the Immersive Web SDK  ·  Footage: Meta Quest 3 emulator (IWER)'],
   "Prism Desk. Built with the Immersive Web SDK. Play it now in the Meta Quest Browser."),
]

def run(*a):
    subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def font(size, weight=400):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_axes([min(32, max(14, size)), weight])
    except Exception: pass
    return f

def card(lines, path):
    img = Image.new('RGB', (W, H), (8, 10, 22))
    d = ImageDraw.Draw(img)
    # soft prism glow
    for r in range(260, 0, -4):
        a = int(40 * (1 - r / 260))
        d.ellipse([W/2 - r*2, H/2 - r, W/2 + r*2, H/2 + r], fill=(8 + a//2, 10 + a//2, 22 + a))
    sizes = [(84, 700), (34, 400), (30, 500), (26, 400), (20, 400)]
    y = 200 if len(lines) > 2 else 270
    for i, t in enumerate(lines):
        s, wgt = sizes[min(i, len(sizes) - 1)]
        f = font(s, wgt)
        tw = d.textlength(t, font=f)
        col = (255, 244, 214) if i == 0 else (196, 210, 255) if i != 2 else (255, 226, 122)
        d.text(((W - tw) / 2, y), t, font=f, fill=col)
        y += s + (40 if i == 0 else 26)
    d.line([(W*0.36, y + 34), (W*0.5, y + 6), (W*0.64, y + 34)], fill=(255, 226, 122), width=3)
    img.save(path)

def tts(text, path):
    p = subprocess.run([PIPER, '-m', VOICE, '-f', path, '--length_scale', '1.0', '--sentence_silence', '0.25'],
                       input=text.encode(), stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if p.returncode: raise SystemExit(p.stderr.decode()[-800:])
    with wave.open(path) as w: return w.getnframes() / w.getframerate()

frames = sorted(glob.glob(f'{FR}/t*.jpg'), key=lambda f: float(os.path.basename(f)[1:-4]))
ts = [float(os.path.basename(f)[1:-4]) for f in frames]
marks = [(float(a), b) for a, b in (l.split() for l in open(MARKS) if l.strip())]
def mark_range(name):
    i = [m[1] for m in marks].index(name)
    t0 = marks[i][0]
    # anchor_exit continues through the 'anchor' beat
    j = i + 1
    while marks[j][1] in ('anchor',): j += 1
    return t0, marks[j][0]

LEAD, TAIL = 0.35, 0.55
clips, srt, audio_parts, t = [], [], [], 0.0
def ts_srt(x):
    ms = int(round(x * 1000)); return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

for k, sc in enumerate(SCENES):
    kind, src, extra, text = sc if len(sc) == 4 else (sc[0], sc[1], None, sc[2])
    wav = f'{WORK}/n{k:02}.wav'
    dur_n = tts(text, wav)
    dur = round(LEAD + dur_n + TAIL, 2)
    if kind == 'card': dur = max(dur, 4.5)
    out = f'{WORK}/c{k:02}.mp4'
    fade = f'fade=t=in:st=0:d=0.3,fade=t=out:st={dur-0.3}:d=0.3'
    if kind == 'card':
        png = f'{WORK}/card{k}.png'; card(src, png)
        run('ffmpeg', '-y', '-loop', '1', '-i', png, '-t', str(dur), '-vf', f'fps={FPS},format=yuv420p,{fade}', '-c:v', 'libx264', '-crf', '18', out)
    elif kind == 'still':
        z = f"zoompan=z='1+0.06*on/({dur}*{FPS})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(dur*FPS)}:s={W}x{H}:fps={FPS}"
        run('ffmpeg', '-y', '-i', os.path.join(ROOT, src), '-vf', f'scale=1920:-2,crop=1920:1080,{z},format=yuv420p,{fade}', '-t', str(dur), '-c:v', 'libx264', '-crf', '18', out)
    else:
        t0, t1 = mark_range(src)
        sel = [(f, x) for f, x in zip(frames, ts) if t0 <= x < t1]
        lst = f'{WORK}/f{k:02}.txt'
        with open(lst, 'w') as fh:
            for i, (f, x) in enumerate(sel):
                nxt = sel[i + 1][1] if i + 1 < len(sel) else t1
                fh.write(f"file '{f}'\nduration {max(0.02, nxt - x):.4f}\n")
            fh.write(f"file '{sel[-1][0]}'\n")
        natural = t1 - sel[0][1]
        k_speed = dur / natural
        vf = f'crop=952:536:0:40,scale={W}:{H}:flags=lanczos,setpts={k_speed:.5f}*PTS,fps={FPS}'
        if extra:
            vf += f",drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='{extra}':x=w-tw-36:y=30:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=12"
        run('ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'{vf},format=yuv420p,{fade}', '-t', str(dur), '-c:v', 'libx264', '-crf', '18', out)
        print(f'{src}: {natural:.1f}s natural -> {dur:.1f}s (x{1/k_speed:.2f})')
    clips.append(out)
    # audio: lead silence + narration + tail silence
    a = f'{WORK}/a{k:02}.wav'
    run('ffmpeg', '-y', '-i', wav, '-af', f'adelay={int(LEAD*1000)}:all=1,apad,aresample=48000', '-t', str(dur), '-ac', '2', a)
    audio_parts.append(a)
    # captions: split into sentences, timed by length
    sents = [s.strip() for s in re.split(r'(?<=[.?!])\s+', text) if s.strip()]
    tot = sum(len(s) for s in sents); cur = t + LEAD
    for s in sents:
        d = dur_n * len(s) / tot
        srt.append((cur, cur + d, s)); cur += d
    t += dur

with open(f'{WORK}/v.txt', 'w') as fh: fh.writelines(f"file '{c}'\n" for c in clips)
with open(f'{WORK}/a.txt', 'w') as fh: fh.writelines(f"file '{c}'\n" for c in audio_parts)
srt_path = os.path.join(ROOT, 'demo', 'prism_desk_trailer.srt')
with open(srt_path, 'w') as fh:
    for i, (a, b, s) in enumerate(srt, 1): fh.write(f'{i}\n{ts_srt(a)} --> {ts_srt(b)}\n{s}\n\n')
run('ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', f'{WORK}/v.txt', '-c', 'copy', f'{WORK}/video.mp4')
run('ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', f'{WORK}/a.txt', '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '48000', f'{WORK}/audio.wav')
style = "FontName=Inter,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H80000000,BorderStyle=4,Outline=1,Shadow=0,MarginV=28"
out = os.path.join(ROOT, 'demo', 'prism_desk_trailer.mp4')
run('ffmpeg', '-y', '-i', f'{WORK}/video.mp4', '-i', f'{WORK}/audio.wav', '-vf', f"subtitles={srt_path}:force_style='{style}'",
    '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', out)
print(json.dumps({'duration_s': round(t, 2), 'out': out, 'srt': srt_path}))
