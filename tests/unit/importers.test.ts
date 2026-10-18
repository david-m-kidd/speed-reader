import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { readArchive } from '../../src/importers/zip';
import { pdfSections, groupLines, defaultCleanup, type PdfPage } from '../../src/importers/pdf-layout';
import { structuredDocument } from '../../src/importers/structured';
describe('guarded EPUB archives',()=>{
  it('extracts valid entries and rejects corruption, truncation and path traversal',()=>{
    const valid=zipSync({'book.xhtml':strToU8('hello')},{level:0});expect(new TextDecoder().decode(readArchive(valid)['book.xhtml'])).toBe('hello');
    const corrupt=valid.slice();corrupt[40]^=1;expect(()=>readArchive(corrupt)).toThrow();expect(()=>readArchive(valid.subarray(0,30))).toThrow();
    for(const name of ['../escape.xhtml','/absolute.xhtml','C:/file.xhtml','a/../file.xhtml','a\\file.xhtml'])expect(()=>readArchive(zipSync({[name]:strToU8('bad')}))).toThrow();
  });
  it('rejects excessive ratios, entry counts and dishonest output sizes',()=>{
    expect(()=>readArchive(zipSync({'bomb.xhtml':strToU8('a'.repeat(100_000))}))).toThrow();
    expect(()=>readArchive(zipSync(Object.fromEntries(Array.from({length:2001},(_,i)=>[`${i}.xml`,strToU8('x')]))))).toThrow();
    const zip=zipSync({'book.xhtml':strToU8('abcdef'.repeat(100))});const view=new DataView(zip.buffer);for(let i=0;i<zip.length-4;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,1,true);break;}expect(()=>readArchive(zip)).toThrow();
  });
});
describe('conservative PDF cleanup and source mapping',()=>{
  const pages:PdfPage[]=Array.from({length:3},(_,i)=>({number:i+1,width:600,height:800,lines:[{text:'Header',x:40,y:770,width:70,height:12},{text:'Extraordinary atten-',x:40,y:700,width:140,height:12},{text:'tional reading.',x:40,y:684,width:100,height:12},{text:'Left end.',x:40,y:668,width:60,height:12},{text:'Right start.',x:340,y:700,width:90,height:12},{text:'Right middle.',x:340,y:684,width:90,height:12},{text:'Right end.',x:340,y:668,width:70,height:12},{text:String(i+1),x:300,y:30,width:8,height:12}]}));
  it('leaves source text alone by default and makes all cleanup reversible',()=>{
    const raw=pdfSections(pages,defaultCleanup);expect(raw[0].text).toContain('Header');expect(raw[0].text).toMatch(/1$/);
    const clean=pdfSections(pages,{margins:true,pageNumbers:true,columns:true,hyphens:true});expect(clean[0].text).not.toContain('Header');expect(clean[0].text).toContain('attentional');expect(clean[0].text.indexOf('Left end.')).toBeLessThan(clean[0].text.indexOf('Right start.'));expect(clean[0].text).not.toMatch(/1$/);expect(pdfSections(pages,defaultCleanup)).toEqual(raw);
  });
  it('groups fragments by geometric position and preserves explicit hyphens',()=>{
    expect(groupLines([{text:'quiet',x:45,y:100,width:30,height:12},{text:'A',x:30,y:100,width:8,height:12}])[0].text).toBe('A quiet');
    const modified=structuredClone(pages);modified[0].lines[1].text='state-of-the-art';expect(pdfSections(modified,{...defaultCleanup,hyphens:true})[0].text).toContain('state-of-the-art');
  });
  it('retains empty pages and recalculates UTF-16 offsets after edits',()=>{
    const document=structuredDocument('Test',{warnings:[],sections:[{kind:'page',label:'1',text:''},{kind:'page',label:'2',text:' café 👩‍💻 '},{kind:'page',label:'3',text:''},{kind:'page',label:'4',text:' Final. '},{kind:'page',label:'5',text:''}]},'pdf');
    expect(document.text).toBe('café 👩‍💻\n\nFinal.');expect(document.locations?.map(l=>document.text.slice(l.start,l.end))).toEqual(['','café 👩‍💻','','Final.','']);
  });
});
