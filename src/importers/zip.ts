import { Inflate } from 'fflate';
export const ZIP_LIMIT = 80 * 1024 * 1024;
const bad = () => { throw new Error('This EPUB archive is invalid, encrypted, or exceeds safe archive limits.'); };
export function safeArchivePath(path: string) {
  if (!path || path.includes('\\') || path.startsWith('/') || path.includes(':') || Array.from(path).some(c => c.charCodeAt(0)<32) || path.split('/').some(p => p === '..' || p === '.')) return bad();
  return path;
}
// Validate the central directory before decompressing any entry. All inflation runs in a terminable worker.
export function readArchive(data: Uint8Array, progress: (done: number,total: number) => void = () => {}) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength), u16 = (p:number) => view.getUint16(p,true), u32 = (p:number) => view.getUint32(p,true);
  let end = data.length-22;
  for (;end>=Math.max(0,data.length-65557);end--) if (u32(end)===0x06054b50 && end+22+u16(end+20)===data.length) break;
  if (end<0 || end<Math.max(0,data.length-65557)) return bad();
  if (u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10)) return bad();
  const count=u16(end+10), size=u32(end+12), offset=u32(end+16);
  if (!count||count>2000||offset+size!==end) return bad();
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const entries: {name:string;method:number;compressed:number;expanded:number;local:number;crc:number}[]=[];
  let p=offset, budget=0; const names=new Set<string>();
  for(let n=0;n<count;n++) {
    if(p+46>end||u32(p)!==0x02014b50) return bad();
    const flags=u16(p+8), method=u16(p+10), compressed=u32(p+20), expanded=u32(p+24), nameLength=u16(p+28), extra=u16(p+30), comment=u16(p+32), local=u32(p+42);
    if(p+46+nameLength+extra+comment>end||flags&1||![0,8].includes(method)||expanded>20*1024*1024||expanded>Math.max(1024,compressed*100)||u16(p+34)!==0) return bad();
    const name=safeArchivePath(decoder.decode(data.subarray(p+46,p+46+nameLength)));
    if(names.has(name)) return bad(); names.add(name); budget+=expanded;
    if(budget>ZIP_LIMIT) return bad();
    entries.push({name,method,compressed,expanded,local,crc:u32(p+16)});
    p+=46+nameLength+extra+comment;
  }
  if(p!==end) return bad();
  const files: Record<string,Uint8Array> = Object.create(null); let actualTotal=0;
  for(const [index,e] of entries.entries()) {
    const l=e.local;
    if(l+30>offset||u32(l)!==0x04034b50||u16(l+6)&1||u16(l+8)!==e.method) return bad();
    const nameLength=u16(l+26), start=l+30+nameLength+u16(l+28);
    if(start+e.compressed>offset||decoder.decode(data.subarray(l+30,l+30+nameLength))!==e.name) return bad();
    const compressed=data.subarray(start,start+e.compressed); let result:Uint8Array;
    if(e.method===0) result=compressed.slice();
    else {
      const chunks:Uint8Array[]=[]; let length=0;
      const inflater=new Inflate(chunk=>{ length+=chunk.length; if(length>e.expanded||actualTotal+length>ZIP_LIMIT) return bad(); chunks.push(chunk); });
      // Small chunks cap a dishonest stream's allocation before ondata enforces its actual output budget.
      for(let i=0;i<compressed.length;i+=256) inflater.push(compressed.subarray(i,i+256),i+256>=compressed.length);
      result=new Uint8Array(length); let cursor=0; for(const chunk of chunks) {result.set(chunk,cursor);cursor+=chunk.length;}
    }
    if(result.length!==e.expanded||crc32(result)!==e.crc) return bad();
    actualTotal+=result.length;
    // Keep only publication text/metadata/CSS; never decode media into DOM.
    if(/\.(?:xml|opf|ncx|xhtml|html|htm|css)$/i.test(e.name)||e.name==='mimetype') files[e.name]=result;
    progress(index+1,count);
  }
  return files;
}
export function crc32(data:Uint8Array) { let crc=0xffffffff; for(const b of data) {crc^=b;for(let n=0;n<8;n++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);} return (crc^0xffffffff)>>>0; }
