#!/usr/bin/env python3
"""Sequential, timestamp-faithful chapter assembly. Dry validation by default.

python3 submission/video/compose-chapters.py --check
python3 submission/video/compose-chapters.py --encode

No network/provider/browser calls. Never reads or writes narration. All inputs
are hashed before rendering; source frame timestamps are not time-compressed.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / 'submission/video/edit-plan.json'
WIDTH, HEIGHT, FPS = 1920, 872, 30


def require(value, message):
    if not value:
        raise ValueError(message)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def asset(rel):
    p = (ROOT / rel).resolve()
    require(p.is_relative_to(ROOT), f'Asset outside workspace: {rel}')
    require(p.is_file(), f'Missing asset: {rel}')
    return p


def dimensions(path):
    with path.open('rb') as f:
        head = f.read(24)
        if head[:8] == b'\x89PNG\r\n\x1a\n':
            return struct.unpack('>II', head[16:24])
        require(head[:2] == b'\xff\xd8', f'Unsupported image: {path.name}')
        f.seek(2)
        while True:
            b = f.read(1)
            require(b, f'Invalid JPEG: {path.name}')
            if b != b'\xff':
                continue
            while b == b'\xff':
                b = f.read(1)
            marker = b[0]
            if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                continue
            length = struct.unpack('>H', f.read(2))[0]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                _, h, w = struct.unpack('>BHH', f.read(5))
                return w, h
            f.seek(length - 2, 1)


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)
    ], text=True))


def validate_segment(s):
    require(s.get('visual_reviewed') is True, f'Crop still needs visual review: {s["name"]}')
    duration = float(s['seconds'])
    require(duration > 0 and abs(duration * FPS - round(duration * FPS)) < 1e-7,
            f'Duration must be exact whole film frames: {s["name"]}')
    x, y, w, h = s['crop']
    require(all(isinstance(v, int) for v in s['crop']) and x >= 0 and y >= 0 and w > 0 and h > 0,
            f'Invalid crop: {s["name"]}')
    entry = dict(s)
    entry['outputFrames'] = round(duration * FPS)
    if s.get('receiptManifest'):
        binding_path=asset(s['receiptManifest'])
        binding=json.loads(binding_path.read_text())
        require(digest(asset(binding['source']))==binding['sourceSha256'], 'Documentary source receipt changed')
        require(digest(asset(s['source']))==binding['pngSha256'], 'Documentary plate changed since receipt binding')
        entry['receiptBinding']=binding
        entry['receiptManifestSha256']=digest(binding_path)
    if s['type'] == 'frames':
        source = asset(s['source'] + '/frames.json')
        data = json.loads(source.read_text())
        source_in = float(s.get('in', 0))
        require(source_in >= 0, 'Negative frame source in-point')
        require(float(data['seconds']) + 1e-8 >= source_in + duration, f'Source too short: {s["name"]}')
        require(data['frames'], f'Empty source: {s["name"]}')
        prior = -1.0
        used = []
        source_dim = None
        selected = []
        for f in data['frames']:
            t = float(f['time'])
            require(math.isfinite(t) and t > prior and t >= 0 and t <= float(data['seconds']),
                    f'Invalid/non-monotonic timestamp: {s["name"]}')
            prior = t
            if t >= source_in + duration:
                continue
            if t <= source_in:
                selected = [f]
            else:
                selected.append(f)
        for f in selected:
            t = float(f['time'])
            require(Path(f['file']).name == f['file'], f'Unsafe frame path: {s["name"]}')
            p = asset(str(source.parent.relative_to(ROOT) / f['file']))
            dim = dimensions(p)
            if source_dim is None:
                source_dim = dim
            require(dim == source_dim, f'Dimension change within recording: {s["name"]}')
            used.append({'file':str(p.relative_to(ROOT)), 'time':max(0,t-source_in),
                         'sourceTime':t, 'sha256':digest(p)})
        require(used and used[0]['time'] <= 0.1, f'Missing opening recorded frame: {s["name"]}')
        entry.update(sourceManifestSha256=digest(source), sourceSeconds=data['seconds'],
                     sourceDimensions=list(source_dim), frames=used,
                     firstFrameLeadInSeconds=used[0]['time'],
                     timing='Original wall-clock frame timestamps; first frame covers initial capture latency; trim only at requested endpoint')
    else:
        source = asset(s['source'])
        if s['type'] == 'image':
            source_dim = dimensions(source)
            entry['timing'] = 'Editorial hold of disclosed documentary receipt plate'
        elif s['type'] == 'video':
            info = probe(source)
            videos = [v for v in info['streams'] if v['codec_type'] == 'video']
            require(len(videos) == 1, f'Unexpected video streams: {s["name"]}')
            source_dim = videos[0]['width'], videos[0]['height']
            hold = float(s.get('endHoldSeconds', 0))
            require(0 <= hold < 1, 'Only a disclosed subsecond saved-observation hold is allowed')
            require(float(info['format']['duration']) + 1e-7 >= s['in'] + duration - hold, f'Source too short: {s["name"]}')
            if hold:
                require('saved observation' in s.get('disclosure','').lower(), 'End hold needs explicit disclosure')
            require(y >= 90, 'Shopper recording must exclude its browser address bar')
            entry['timing'] = 'Continuous source interval; 1x speed; no audio; final hold only if explicitly recorded in endHoldSeconds'
            entry['sourceSeconds'] = float(info['format']['duration'])
        else:
            raise ValueError(f'Unknown source type: {s["type"]}')
        entry.update(sourceSha256=digest(source), sourceDimensions=list(source_dim))
    require(x + w <= source_dim[0] and y + h <= source_dim[1],
            f'Crop out of bounds: {s["name"]}: {s["crop"]} vs {source_dim}')
    return entry


def preflight(plan):
    for tool in ('ffmpeg', 'ffprobe', 'node'):
        require(shutil.which(tool), f'Missing executable: {tool}')
    require(plan['width'] == WIDTH and plan['height'] == HEIGHT and plan['fps'] == FPS,
            'Unexpected output specification')
    require([c['seconds'] for c in plan['chapters']] == [12,25,22,28,32,23,23], 'Chapter timings changed')
    art = json.loads(asset('artifacts/control-art/manifest.json').read_text())
    require(digest(asset(art['source'])) == art['sourceSha256'], 'Control receipt changed since art generation')
    for output in art['outputs']:
        require(digest(asset('artifacts/control-art/' + output['name'] + '.png')) == output['pngSha256'],
                'Documentary control plate changed since review')
    chapters = []
    failures = []
    for chapter in plan['chapters']:
        require(sum(s['seconds'] for s in chapter['segments']) == chapter['seconds'], 'Segment total mismatch')
        segments = []
        for s in chapter['segments']:
            try:
                segments.append(validate_segment(s))
            except (ValueError, KeyError, OSError) as e:
                failures.append(str(e))
        chapters.append({**chapter, 'segments':segments})
    require(not failures, 'Preflight blocked:\n' + '\n'.join(failures))
    return {
        'schemaVersion':1, 'createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
        'planSha256':digest(PLAN), 'scriptSha256':digest(Path(__file__)),
        'format':{'width':WIDTH,'height':HEIGHT,'fps':FPS,'codec':'h264','silent':True},
        'policy':{'threads':2,'sequential':True,'speed':1,'inventedActions':False,'networkCalls':False},
        'chapters':chapters,
        'evidenceLimit':'CUA frame sequences document actual observed UI at original timestamps. Saved-event views are labelled. Control artwork visualizes the bound Sandbox receipt. Synthetic bench is not provider qualification.',
    }


def ffquote(value):
    return "'" + str(value).replace("'", "'\\''") + "'"


def frame_concat(entry, path):
    lines = ['ffconcat version 1.0']
    frames = entry['frames']
    for index, frame in enumerate(frames):
        # First observed image covers only the short initial capture latency.
        start = frame['time'] if index else 0.0
        end = frames[index+1]['time'] if index+1 < len(frames) else entry['seconds']
        require(end > start, 'Non-positive image duration')
        lines += ['file '+ffquote(ROOT/frame['file']), 'option framerate 1000', f'duration {end-start:.9f}']
    # The concat demuxer needs a final repeated packet to honour last duration.
    lines += ['file '+ffquote(ROOT/frames[-1]['file']), 'option framerate 1000']
    path.write_text('\n'.join(lines)+'\n')


STRIP_JS = r'''
const fs=require('node:fs');const path=require('node:path');
const sharp=require('sharp');
const font=require('next/dist/compiled/@next/font/dist/fontkit').default(fs.readFileSync('video/assets/geist-latin.woff2'));
const label=process.argv[1], out=process.argv[2];
let x=0;const size=24;const scale=size/font.unitsPerEm;
const run=font.layout(label);
const glyphs=run.glyphs.map((g,i)=>{const p=run.positions[i];const d=`<path transform="translate(${(x+p.xOffset)*scale},${-p.yOffset*scale}) scale(${scale},${-scale})" d="${g.path.toSVG()}"/>`;x+=p.xAdvance;return d;}).join('');
if(x*scale>1800)throw Error('Disclosure text exceeds width');
const safe=label.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="48"><title>${safe}</title><rect width="1920" height="48" fill="#fbfcfd"/><path d="M0 47.5h1920" stroke="#d9dee5"/><rect x="28" y="15" width="4" height="18" fill="#0b63f6"/><g fill="#34475c" transform="translate(45,32)">${glyphs}</g></svg>`;
fs.writeFileSync(out+'.svg',svg);sharp(Buffer.from(svg)).png().toFile(out+'.png').catch(e=>{console.error(e.message);process.exit(1)});
'''


def execute(command, log):
    with log.open('wb') as f:
        result = subprocess.run(command, cwd=ROOT, stdout=f, stderr=subprocess.STDOUT)
    require(result.returncode == 0, f'FFmpeg failed. Inspect local log: {log.relative_to(ROOT)}')


def encode_segment(entry, folder):
    name = entry['name']
    target = folder / (name+'.mp4')
    cmd = ['ffmpeg','-hide_banner','-nostdin','-y','-loglevel','warning',
           '-threads','2','-filter_threads','2','-filter_complex_threads','2']
    if entry['type'] == 'frames':
        listing = folder/(name+'.ffconcat')
        frame_concat(entry, listing)
        cmd += ['-f','concat','-safe','0','-i',str(listing)]
    elif entry['type'] == 'image':
        cmd += ['-loop','1','-framerate',str(FPS),'-i',str(ROOT/entry['source'])]
    else:
        cmd += ['-ss',str(entry['in']),'-i',str(ROOT/entry['source'])]
    label = entry.get('disclosure')
    if label:
        strip = folder/(name+'-disclosure')
        subprocess.run(['node','-e',STRIP_JS,label,str(strip)],cwd=ROOT,check=True)
        cmd += ['-threads','2','-loop','1','-framerate',str(FPS),'-i',str(strip)+'.png']
    x,y,w,h=entry['crop']
    content_h=HEIGHT-48 if label else HEIGHT
    timing = 'setpts=PTS-STARTPTS,'
    if entry.get('endHoldSeconds'):
        timing += f'trim=duration={entry["seconds"]-entry["endHoldSeconds"]},tpad=stop_mode=clone:stop_duration={entry["endHoldSeconds"]},'
    vf=(f'[0:v]crop={w}:{h}:{x}:{y},'+timing+
        f'scale={WIDTH}:{content_h}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos:out_range=tv,'
        f'pad={WIDTH}:{content_h}:(ow-iw)/2:(oh-ih)/2:color=0xf4f6f9,setsar=1,'
        f'fps={FPS}:round=near,format=yuv420p')
    if label:
        vf+=f',pad={WIDTH}:{HEIGHT}:0:48:color=white[base];[base][1:v]overlay=0:0:shortest=1[v]'
    else:
        vf+='[v]'
    cmd += ['-filter_complex',vf,'-map','[v]','-an','-frames:v',str(entry['outputFrames']),
            '-c:v','libx264','-threads','2','-preset','medium','-crf','17','-pix_fmt','yuv420p','-color_range','tv',
            '-r',str(FPS),'-fps_mode','cfr','-video_track_timescale','30000','-map_metadata','-1',
            '-movflags','+faststart',str(target)]
    entry['encodeCommand']=cmd
    execute(cmd,folder/(name+'.log'))
    verify_output(target,entry['seconds'])
    entry['encodedSha256']=digest(target)
    return target


def verify_output(path, seconds):
    info=probe(path)
    video=[s for s in info['streams'] if s['codec_type']=='video']
    require(len(video)==1 and len(info['streams'])==1, f'Output must be silent single video: {path.name}')
    s=video[0]
    require((s['width'],s['height'])==(WIDTH,HEIGHT), f'Wrong dimensions: {path.name}')
    require(s['codec_name']=='h264' and s['pix_fmt']=='yuv420p' and s['r_frame_rate']=='30/1',
            f'Wrong output format: {path.name}')
    require(int(s['nb_frames'])==round(seconds*FPS), f'Wrong frame count: {path.name}')
    require(abs(float(s['duration'])-seconds)<0.001, f'Wrong duration: {path.name}')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--check',action='store_true',help='Validate inputs; never encode (default)')
    mode.add_argument('--encode',action='store_true',help='Sequentially encode and atomically publish seven clips')
    args=parser.parse_args()
    plan=json.loads(PLAN.read_text())
    ledger=preflight(plan)
    if not args.encode:
        print('PASS: all inputs, timestamps, crops, control bindings and 165 seconds validated. No encode.')
        return
    work=ROOT/'artifacts/film-composition'
    work.mkdir(exist_ok=True)
    lock=work/'encode.lock'
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    os.write(fd,str(os.getpid()).encode());os.close(fd)
    stage=Path(tempfile.mkdtemp(prefix='stage-',dir=work))
    ledger_path=stage/'edit-ledger.json'
    ledger['status']='encoding'
    ledger_path.write_text(json.dumps(ledger,indent=2)+'\n')
    try:
        completed=[]
        for chapter in ledger['chapters']:
            print('Encoding '+chapter['name'],flush=True)
            clips=[encode_segment(s,stage) for s in chapter['segments']]
            listing=stage/(chapter['name']+'-join.ffconcat')
            listing.write_text('ffconcat version 1.0\n'+'\n'.join('file '+ffquote(c) for c in clips)+'\n')
            output=stage/(chapter['name']+'.mp4')
            execute(['ffmpeg','-hide_banner','-nostdin','-y','-loglevel','warning','-threads','2',
                     '-f','concat','-safe','0','-i',str(listing),'-map','0:v:0','-an','-c:v','copy',
                     '-video_track_timescale','30000','-map_metadata','-1','-movflags','+faststart',str(output)],
                    stage/(chapter['name']+'-join.log'))
            verify_output(output,chapter['seconds'])
            chapter['outputSha256']=digest(output)
            completed.append((output,ROOT/chapter['output']))
            ledger_path.write_text(json.dumps(ledger,indent=2)+'\n')
        # All seven have passed duration/stream validation before any public file changes.
        for source,dest in completed:
            dest.parent.mkdir(parents=True,exist_ok=True)
            os.replace(source,dest)
        ledger['status']='complete'
        ledger_path.write_text(json.dumps(ledger,indent=2)+'\n')
        final_ledger=ROOT/'artifacts/film-edit-ledger.json'
        temp_ledger=work/'edit-ledger.next.json'
        temp_ledger.write_text(json.dumps(ledger,indent=2)+'\n')
        os.replace(temp_ledger,final_ledger)
        print('PASS: seven silent 1920x872 30fps H.264 chapters, exact total 165 seconds. Visual review remains required.')
    except BaseException as e:
        ledger['status']='failed'
        ledger['error']=str(e)
        ledger_path.write_text(json.dumps(ledger,indent=2)+'\n')
        raise
    finally:
        lock.unlink(missing_ok=True)


if __name__=='__main__':
    try:
        main()
    except (ValueError,OSError,subprocess.CalledProcessError) as exc:
        print(str(exc),file=sys.stderr)
        sys.exit(1)
