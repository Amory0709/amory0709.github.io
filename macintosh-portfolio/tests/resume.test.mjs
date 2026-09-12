import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeConfig } from '../configuration.mjs';
import { ResumeView, fetchResumePDF } from '../resume.mjs';

const source=()=>JSON.parse(readFileSync(new URL('../config.json',import.meta.url)));
const pdf=()=>new Blob(['%PDF-1.7\nTest fixture only'],{type:'application/pdf'});
const response=()=>({ok:true,blob:async()=>pdf()});
function fixture(fetcher=async()=>response()) {
  const nodes=new Map(),revoked=[];
  const doc={getElementById(id){
    if(!nodes.has(id)) nodes.set(id,{hidden:false,events:{},
      addEventListener(name,fn){this.events[name]=fn;},removeAttribute(name){delete this[name];},
      setAttribute(name,value){this[name]=value;},focus(){this.focused=true;},
      showModal(){this.open=true;},close(){this.open=false;this.events.close?.();}});
    return nodes.get(id);
  }};
  const config={enabled:true,label:'CV',defaultLanguage:'zh',zh:{src:'./zh.pdf',filename:'my-zh.pdf'},en:{src:'./en.pdf',filename:'my-en.pdf'}};
  let serial=0;
  const view=new ResumeView(config,doc,fetcher,{createObjectURL:()=>`blob:test-${++serial}`,revokeObjectURL:url=>revoked.push(url)});
  view.dialog.showModal();
  return {view,doc,revoked};
}

test('resume configuration keeps bilingual file paths, download names and optional visibility',()=>{
  const raw=source();
  raw.resume={enabled:false,defaultLanguage:'en',zh:{src:'./assets/resume/zh.pdf'},en:{src:'https://example.com/en.pdf',filename:'Amori-Han.pdf'}};
  const resume=normalizeConfig(raw).resume;
  assert.equal(resume.defaultLanguage,'en');assert.equal(resume.enabled,false);
  assert.equal(resume.zh.filename,'resume-zh.pdf');assert.equal(resume.en.filename,'Amori-Han.pdf');
  for(const invalid of [{defaultLanguage:'fr'},{zh:{src:'javascript:alert(1)'}},{en:{filename:'../bad.pdf'}},{zh:{src:'mailto:a@b.com'}},{enabled:'true'}]) {
    raw.resume=invalid;assert.throws(()=>normalizeConfig(raw),/resume/);
  }
});

test('only real PDF bytes are previewed, with HTTP failures and non-PDF files rejected',async()=>{
  assert.equal((await fetchResumePDF('./test.pdf',undefined,async(src,options)=>{
    assert.equal(src,'./test.pdf');
    assert.equal(options.cache,'no-store','published resume updates must bypass old PDF responses');
    return response();
  })).type,'application/pdf');
  await assert.rejects(fetchResumePDF('missing',undefined,async()=>({ok:false,status:404})),/404/);
  await assert.rejects(fetchResumePDF('html',undefined,async()=>({ok:true,blob:async()=>new Blob(['<html>Error</html>'])})),/must be a PDF/);
});

test('both configured resume files are actual downloadable PDFs',async()=>{
  const resume=normalizeConfig(source()).resume;
  for(const language of ['zh','en']) {
    const file=resume[language];
    const bytes=readFileSync(new URL(`../${file.src}`,import.meta.url));
    const blob=await fetchResumePDF(file.src,undefined,async()=>({ok:true,blob:async()=>new Blob([bytes])}));
    assert.equal(blob.size,bytes.length);
    assert.match(file.filename,/\.pdf$/);
  }
});

test('language switch changes preview and download together and revokes previous blob URLs',async()=>{
  const {view,doc,revoked}=fixture();
  await view.select('zh');
  assert.equal(view.download.download,'my-zh.pdf');assert.ok(view.frame.src.includes(encodeURIComponent(view.download.href)));
  assert.equal(view.frame.title,'中文版简历 PDF');assert.equal(view.download.hidden,false);
  await view.select('en');
  assert.deepEqual(revoked,['blob:test-1']);assert.equal(view.download.download,'my-en.pdf');
  assert.equal(view.frame.src,'./resume-preview.html?v=2&file=blob%3Atest-2&lang=en');assert.equal(doc.getElementById('resume-en')['aria-pressed'],'true');
  view.dialog.close();assert.deepEqual(revoked,['blob:test-1','blob:test-2']);
  assert.equal(view.frame.src,undefined);assert.equal(view.button.focused,true);
});

test('missing language and failed files show honest status without broken download links',async()=>{
  const {view}=fixture(async()=>({ok:false,status:404}));
  await view.select('zh');assert.equal(view.download.hidden,true);assert.equal(view.frame.hidden,true);
  assert.equal(view.external.href,'./zh.pdf');assert.match(view.status.textContent,/无法预览/);
  view.config.en.src='';await view.select('en');
  assert.equal(view.external.hidden,true);assert.equal(view.download.hidden,true);assert.match(view.status.textContent,/not available/);
});

test('late responses cannot replace a newly selected language or reopen a closed preview',async()=>{
  let resolve;
  const {view}=fixture(src=>src.includes('zh')?new Promise(r=>resolve=r):Promise.resolve(response()));
  const old=view.select('zh');await view.select('en');resolve(response());await old;
  assert.equal(view.download.download,'my-en.pdf');assert.equal(view.frame.src,'./resume-preview.html?v=2&file=blob%3Atest-1&lang=en');
  const pending=view.select('zh');view.dialog.close();resolve(response());await pending;
  assert.equal(view.frame.src,undefined);assert.equal(view.download.hidden,true);
});

test('Escape is contained in the resume dialog instead of reaching scene ejection',()=>{
  const {view}=fixture();let stopped=false;
  view.dialog.events.keydown({key:'Escape',stopPropagation(){stopped=true;}});
  assert.equal(stopped,true);
});

test('icon-only resume trigger retains a configurable accessible name and tooltip',()=>{
  const {view}=fixture();
  assert.equal(view.button['aria-label'],'CV');
  assert.equal(view.button.title,'CV');
  assert.equal(view.button.textContent,undefined,'initialization does not overwrite the SVG');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html, /id="resumeButton"[^>]*aria-haspopup="dialog"[^>]*><svg/);
  const desktop = view.doc.getElementById('desktopResume');
  assert.equal(desktop.hidden, false);
  assert.equal(desktop['aria-label'], 'CV');
  new ResumeView({ ...view.config, enabled: false }, view.doc);
  assert.equal(desktop.hidden, true);
  assert.equal(view.button.hidden, true);
});
