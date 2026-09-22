import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

function harness(failingPath = '') {
  const events:Record<string,(e:any)=>void> = {};
  const entries = new Map<string,Response>();
  const fetched:string[] = [];
  const cache = { put:async(key:string,response:Response)=>entries.set(key,response.clone()), match:async(key:string)=>entries.get(key)?.clone() };
  const caches = {open:async()=>cache, match:cache.match, keys:async()=>[], delete:async()=>true};
  runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8').replace('const BUILD_ASSETS = [];', 'const BUILD_ASSETS = ["/assets/chunk.js", "/assets/font.woff2"];'), {
    self:{location:{origin:'https://studio.test'},addEventListener:(key:string,fn:any)=>events[key]=fn,clients:{claim:async()=>{}}},
    caches, URL, Response,
    Request:class {url:string;constructor(input:any,public options?:any){this.url=typeof input==='string'?input:input.url;}},
    fetch:async(req:any)=>{fetched.push(req.url);if(req.url===failingPath)throw Error('network failed');return new Response(req.url==='/index.html'?'<html><body>studio</body></html>':'asset');},
  });
  return {events,entries,fetched};
}

describe('cache hors ligne',()=>{
  it('précache aussi les chunks et les polices avant de réussir',async()=>{
    const h=harness();let installed:Promise<unknown>=Promise.resolve();h.events.install({waitUntil:(p:Promise<unknown>)=>installed=p});await installed;
    expect(h.entries.has('/index.html')).toBe(true);expect(h.entries.has('/assets/chunk.js')).toBe(true);expect(h.entries.has('/assets/font.woff2')).toBe(true);
  });
  it('refuse une installation incomplète et ignore les API privées',async()=>{
    const h=harness('/assets/font.woff2');let installed:Promise<unknown>=Promise.resolve();h.events.install({waitUntil:(p:Promise<unknown>)=>installed=p});await expect(installed).rejects.toThrow('network failed');
    let intercepted=false;h.events.fetch({request:{method:'GET',url:'https://studio.test/api/workspace',headers:new Headers()},respondWith:()=>intercepted=true});expect(intercepted).toBe(false);
  });
  it('sert le shell en cache lorsque la navigation échoue',async()=>{
    const h=harness('https://studio.test/');h.entries.set('/index.html',new Response('studio offline'));
    let response:Promise<Response>=Promise.resolve(new Response());h.events.fetch({request:{method:'GET',url:'https://studio.test/',mode:'navigate',headers:new Headers()},respondWith:(p:Promise<Response>)=>response=p});
    expect(await (await response).text()).toBe('studio offline');
  });
});
