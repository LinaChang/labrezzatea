"""Rebuild the public offline snapshot with Python's standard library."""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, html, json, mimetypes, os, posixpath, re, time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote, quote, parse_qsl, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'offline'
CACHE = ROOT / '.mirror-cache'
ORIGIN = 'https://www.labrezzatea.com/'
HOSTS = {'www.labrezzatea.com', 'labrezzatea.com'}
ASSET_EXT = {'.css','.js','.jpg','.jpeg','.png','.gif','.svg','.webp','.ico','.woff','.woff2','.ttf','.eot','.otf','.pdf','.doc','.docx','.xls','.xlsx','.zip','.mp4','.webm','.mp3','.swf'}
CACHED_ONLY = False
ATTR = re.compile(r'''(?P<prefix>\b(?:href|src|poster|data-src|data-original|action)\s*=\s*)(?P<q>["'])(?P<url>.*?)(?P=q)''', re.I|re.S)
CSS = re.compile(r'''url\(\s*(["']?)(.*?)\1\s*\)''', re.I)
IMPORT = re.compile(r'''(@import\s+)(["'])(.*?)\2''', re.I)
LITERAL = re.compile(r'''(["'])((?:(?:https?:)?//[^"'\s<>]+|/?(?:images|media|templates|modules|components|plugins)/[^"'\s<>]+))\1''', re.I)

def canonical(raw, base):
    raw = html.unescape(raw).replace('\\/', '/').strip()
    if not raw or raw.startswith(('#','data:','javascript:','mailto:','tel:','blob:')):
        return None
    p = urlsplit(urljoin(base, raw))
    if p.scheme not in ('http','https'): return None
    host = p.netloc.lower()
    if host in HOSTS: host = 'www.labrezzatea.com'
    path = quote(unquote(p.path or '/'), safe='/@:+,;=-_.!~*()')
    query = p.query
    if Path(unquote(path)).suffix.lower() in ASSET_EXT:
        query = ''
    return urlunsplit(('https',host,path,query,''))

def internal(u): return urlsplit(u).hostname in HOSTS

def localpath(u, content_type=''):
    p = urlsplit(u)
    path = unquote(p.path).lstrip('/')
    path = '/'.join(re.sub(r'[<>:"\\|?*\x00-\x1f]', '_', x).rstrip('. ') for x in path.split('/') if x not in ('.','..'))
    if not internal(u): path = '_external/' + p.netloc + '/' + path
    if not path or path.endswith('/'): path += 'index.html'
    suffix = Path(path).suffix
    if not suffix:
        ext = '.html' if internal(u) else ('.css' if 'css' in content_type or p.netloc == 'fonts.googleapis.com' else mimetypes.guess_extension(content_type.split(';')[0]) or '.bin')
        path += ext
    if p.query:
        qhash = hashlib.sha256(p.query.encode()).hexdigest()[:12]
        stem, ext = posixpath.splitext(path)
        path = stem + '__q_' + qhash + ext
    return path

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.refs=[]; self.title=''; self.in_title=False; self.base=None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag=='base': self.base=a.get('href'); return
        if tag=='iframe': return
        if tag=='title': self.in_title=True
        for name in ('href','src','poster','data-src','data-original'):
            if a.get(name): self.refs.append((a[name], tag in ('a','area') and name=='href'))
        for v in a.get('srcset','').split(','):
            if v.strip(): self.refs.append((v.strip().split()[0],False))
    def handle_endtag(self, tag):
        if tag=='title': self.in_title=False
    def handle_data(self, data):
        if self.in_title: self.title += data

def fetch(u):
    key=hashlib.sha256(u.encode()).hexdigest(); meta=CACHE/(key+'.json'); data=CACHE/(key+'.bin')
    if meta.exists() and data.exists(): return json.loads(meta.read_text('utf-8')), data.read_bytes()
    if CACHED_ONLY: return {'url':u,'error':'Not present in downloaded snapshot (not requested in cache-only mode)'},None
    error='Download failed'
    for attempt in range(3):
        try:
            req=Request(u,headers={'User-Agent':'Mozilla/5.0 (compatible; OfflineArchive/1.0)','Accept-Encoding':'identity'})
            with urlopen(req,timeout=35) as r:
                b=r.read(); m={'url':u,'final_url':r.url,'status':r.status,'content_type':r.headers.get('Content-Type',''),'bytes':len(b)}
            data.write_bytes(b); meta.write_text(json.dumps(m,ensure_ascii=False),'utf-8')
            return m,b
        except Exception as e:
            error=str(e)
            if isinstance(e,HTTPError) and e.code in (400,403,404,410): break
            time.sleep(attempt+1)
    return {'url':u,'error':error},None

def main():
    OUT.mkdir(exist_ok=True); CACHE.mkdir(exist_ok=True)
    old_report=json.loads((ROOT/'mirror-manifest.json').read_text('utf-8')) if (ROOT/'mirror-manifest.json').exists() else {}
    pending={ORIGIN,ORIGIN+'robots.txt',ORIGIN+'sitemap.xml'}
    # The homepage slideshow builds these filenames dynamically.
    pending.update(ORIGIN+'modules/mod_f5showslide/img/'+name+'.png' for name in ('f5downa','f5lefta','f5righta','play','play2'))
    seen=set(); records={}; rawtexts={}; excluded=set(); links={}
    while pending:
        batch=sorted(pending-seen); pending.clear()
        if not batch: break
        seen.update(batch)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for m,b in pool.map(fetch,batch):
                u=m['url']; records[u]=m
                if b is None: continue
                ct=m['content_type']; path=localpath(u,ct); m['path']=path
                dest=OUT/path; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(b)
                if not any(x in ct for x in ('html','css','javascript','xml','text/plain')): continue
                t=b.decode('utf-8-sig',errors='replace'); rawtexts[u]=t; refs=[]; base=u
                if 'html' in ct:
                    p=Parser(); p.feed(t); m['title']=p.title.strip(); base=urljoin(u,p.base) if p.base else u; refs+=p.refs
                if 'css' in ct or 'html' in ct:
                    cleaned=re.sub(r'/\*.*?\*/','',t,flags=re.S)
                    refs += [(x[1],False) for x in CSS.findall(cleaned)]
                    refs += [(x[2],False) for x in IMPORT.findall(cleaned)]
                # Includes JSON-escaped slideshow images and script-loaded static assets.
                for match in LITERAL.finditer(t.replace('\\/','/')):
                    val=match[2]
                    if Path(urlsplit(val).path).suffix.lower() in ASSET_EXT:
                        refs.append((urljoin(ORIGIN,val) if 'javascript' in ct and val.startswith(('images/','media/','templates/','modules/','components/','plugins/')) else val,False))
                if 'xml' in ct:
                    refs += [(html.unescape(x), True) for x in re.findall(r'<loc>(.*?)</loc>',t)]
                links[u]=[]
                for val,anchor in refs:
                    v=canonical(val,base)
                    if not v: continue
                    if anchor and not internal(v): excluded.add(v); continue
                    if not internal(v) and urlsplit(v).hostname not in ('fonts.googleapis.com','fonts.gstatic.com','cdn.hikashop.com'):
                        excluded.add(v); continue
                    if internal(v) and any(x in urlsplit(v).path for x in ('/administrator/','/component/users/')): excluded.add(v); continue
                    links[u].append(v)
                    if v not in seen: pending.add(v)
        print(f'Collected {sum("path" in r for r in records.values())} files; {len(pending-seen)} queued',flush=True)
        (ROOT/'crawl-progress.json').write_text(json.dumps({'downloaded':len(records),'queued':len(pending-seen)},indent=2),'utf-8')
        if len(seen)>5000: raise RuntimeError('Unexpected crawl size; inspect URL scope')

    def rewrite(raw,base,source):
        u=canonical(raw,base)
        if u in records and 'path' in records[u]:
            rel=posixpath.relpath(records[u]['path'],posixpath.dirname(source) or '.')
            fragment=urlsplit(html.unescape(raw)).fragment
            return quote(rel,safe='/_.-~')+('#'+fragment if fragment else '')
        return raw

    for u,t in rawtexts.items():
        m=records[u]; source=m['path']; ct=m['content_type']; base=u
        if 'html' in ct:
            p=Parser(); p.feed(t); base=urljoin(u,p.base) if p.base else u
            t=re.sub(r'<base\b[^>]*>','',t,flags=re.I)
            # Remote video APIs are unused by this site's image slideshow.
            t=re.sub(r'<script\b[^>]*src=["\'](?:https?:)?//(?:www\.youtube\.com|a\.vimeocdn\.com)[^>]*>\s*</script>','',t,flags=re.I)
            t=re.sub(r'<script\b[^>]*src=["\'][^"\']*(?:recaptcha|keepalive)[^"\']*["\'][^>]*>\s*</script>','',t,flags=re.I)
            t=ATTR.sub(lambda a:a['prefix']+a['q']+html.escape(rewrite(a['url'],base,source),quote=True)+a['q'],t)
            rootrel=posixpath.relpath('index.html',posixpath.dirname(source) or '.')
            rootdir=rootrel[:-len('index.html')]
            t=t.replace('f5baseurl:"https://www.labrezzatea.com/"','f5baseurl:'+json.dumps(rootdir or './'))
            t=re.sub(r'<iframe\b[^>]*>.*?</iframe>', '<p class="offline-note">此嵌入內容需連線至原網站檢視。</p>',t,flags=re.I|re.S)
            # FAQ print controls normally open a server-rendered PHP route.
            # Use this page's existing content for offline printing instead.
            t=re.sub(r'''window\.open\(['"][^'"]*(?:[?&](?:amp;)?print=1)[^'"]*['"],.*?\);\s*return false;''', 'window.print(); return false;',t)
            policy="connect-src 'none'; frame-src 'none'; form-action 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'"
            t=re.sub(r'(<head\b[^>]*>)',lambda a:a[1]+'\n<meta http-equiv="Content-Security-Policy" content="'+policy+'">',t,count=1,flags=re.I)
            t=re.sub(r'<form\b[^>]*>',lambda a:a[0]+'<p class="offline-note" role="note">離線預覽：此表單僅展示，無法送出。</p>',t,flags=re.I)
            t=t.replace('</body>','<script>document.addEventListener("submit",function(e){e.preventDefault();alert("離線預覽無法送出表單，請連線至原站聯絡。");},true);</script></body>')
            t=re.sub(r'\bsrcset\s*=\s*(["\'])(.*?)\1', lambda a:'srcset='+a[1]+', '.join(rewrite(v.strip().split()[0],base,source)+' '+ ' '.join(v.strip().split()[1:]) for v in a[2].split(',') if v.strip())+a[1],t,flags=re.I)
        t=CSS.sub(lambda a:'url('+a[1]+rewrite(a[2],base,source)+a[1]+')',t)
        t=IMPORT.sub(lambda a:a[1]+a[2]+rewrite(a[3],base,source)+a[2],t)
        (OUT/source).write_text(t,encoding='utf-8')

    pages=[m for m in records.values() if internal(m['url']) and 'html' in m.get('content_type','') and 'path' in m and '.feed' not in m['path']]
    pages.sort(key=lambda m:m['path'])
    rows='\n'.join('<li><a href="'+quote(m['path'],safe='/')+'">'+html.escape(m.get('title') or m['path'])+'</a><small> '+html.escape(urlsplit(m['url']).path + ('?'+urlsplit(m['url']).query if urlsplit(m['url']).query else ''))+'</small></li>' for m in pages)
    (OUT/'sitemap.html').write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>風玥茶研所｜離線 Sitemap</title><style>body{max-width:1000px;margin:40px auto;padding:0 24px;font:17px/1.8 system-ui;color:#243b31}a{color:#36624b}small{color:#666}li{margin:8px 0}</style><h1>風玥茶研所｜離線 Sitemap</h1><p>公開站內連結遞迴擷取；點選頁名即可離線瀏覽。</p><p><a href="index.html">回首頁</a></p><ul>'+rows+'</ul></html>',encoding='utf-8')
    from xml.sax.saxutils import escape
    (OUT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+ '\n'.join('<url><loc>'+escape(m['url'])+'</loc></url>' for m in pages)+'\n</urlset>',encoding='utf-8')
    report={'source':ORIGIN,'captured_at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'pages':len(pages),'files':sum('path' in m for m in records.values()),'bytes':sum(m.get('bytes',0) for m in records.values()),'records':list(records.values()),'external_or_excluded_links':sorted(excluded),'links':links}
    report['rebuild_mode']='cached-only' if CACHED_ONLY else 'online'
    # Remove only files produced by an earlier run that are outside the final crawl.
    current_paths={m['path'] for m in records.values() if 'path' in m}
    for m in old_report.get('records',[]):
        if m.get('path') and m['path'] not in current_paths:
            stale=(OUT/m['path']).resolve()
            if stale.is_relative_to(OUT.resolve()) and stale.is_file(): stale.unlink()
    (ROOT/'mirror-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'SITEMAP.md').write_text('# 風玥茶研所 Sitemap\n\n來源：'+ORIGIN+'\n\n'+ '\n'.join('- ['+(m.get('title') or m['path'])+'](offline/'+quote(m['path'],safe='/')+') — '+m['url'] for m in pages)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ('pages','files','bytes')},ensure_ascii=False),flush=True)
    failures=[m for m in records.values() if 'error' in m]
    print('Failed:',json.dumps(failures,ensure_ascii=False),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--cached-only',action='store_true',help='Rebuild without any network requests')
    CACHED_ONLY=parser.parse_args().cached_only
    main()
