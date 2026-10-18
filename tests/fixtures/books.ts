import { zipSync, strToU8 } from 'fflate';
// Small, wholly authored fixtures. No third-party books or artwork.
export function epubFixture(options: { malformed?: boolean; drm?: boolean; long?: boolean; epub2?: boolean } = {}) {
  const files: Record<string, Uint8Array> = {};
  const put=(name:string,text:string)=>{files[name]=strToU8(text);};
  put('mimetype','application/epub+zip');
  put('META-INF/container.xml','<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="BOOK/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  put('BOOK/package.opf',`<package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>A quiet journey</dc:title><dc:creator>Stillword fixtures</dc:creator></metadata><manifest><item id="first" href="z-first.xhtml" media-type="application/xhtml+xml"/><item id="last" href="a-last.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="${options.malformed?'missing':'first'}"/><itemref idref="nav"/><itemref idref="last"/></spine></package>`);
  put('BOOK/nav.xhtml','<html><body><nav><ol><li><a href="z-first.xhtml">First light</a></li><li><a href="a-last.xhtml">The garden</a></li></ol></nav></body></html>');
  put('BOOK/z-first.xhtml',`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Noise</title><link rel="stylesheet" href="book.css"/></head><body><nav>Navigation noise</nav><h1>First light</h1><p>¡Hola, café! A quiet morning begins.</p><script>window.evil=true;fetch('https://tracker.invalid/epub-script')</script><img src="https://tracker.invalid/image" onerror="window.evil=true"/><iframe src="https://tracker.invalid/frame"></iframe><p hidden>Hidden attribute</p><p style="display:none">Hidden inline</p><p class="secret">Hidden CSS</p>${options.long?'<p>'+Array.from({length:3000},(_,i)=>'word'+i).join(' ')+'</p>':''}</body></html>`);
  put('BOOK/book.css','.secret { display: none; } body { background:url(https://tracker.invalid/style); }');
  put('BOOK/a-last.xhtml','<html><body><h1>The garden</h1><p>Último capítulo. The garden is peaceful.</p></body></html>');
  if(options.epub2) {
    put('BOOK/package.opf','<package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>EPUB two</dc:title></metadata><manifest><item id="first" href="z-first.xhtml" media-type="application/xhtml+xml"/><item id="last" href="a-last.xhtml" media-type="application/xhtml+xml"/><item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine toc="toc"><itemref idref="first"/><itemref idref="last"/></spine></package>');
    put('BOOK/toc.ncx','<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd"><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap><navPoint><navLabel><text>Dawn</text></navLabel><content src="z-first.xhtml"/></navPoint><navPoint><navLabel><text>Evening</text></navLabel><content src="a-last.xhtml"/></navPoint></navMap></ncx>');
  }
  if(options.drm)put('META-INF/encryption.xml','<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#"><EncryptionMethod Algorithm="drm"/></EncryptedData></encryption>');
  return Buffer.from(zipSync(files,{level:0}));
}
export function pdfFixture(blank=false,pages=3) {
  const objects:string[]=[];const add=(value:string)=>{objects.push(value);return objects.length;};
  add('<< /Type /Catalog /Pages 2 0 R >>');add('');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const ids:number[]=[];
  for(let n=1;n<=pages;n++) {
    const lines=[{x:40,y:770,text:'A QUIET JOURNEY'},{x:40,y:710,text:`Page ${n} begins here.`},{x:40,y:690,text:'Extraordinary atten-'},{x:40,y:674,text:'tional reading stays calm.'},{x:40,y:650,text:'Left column ends.'},{x:330,y:710,text:'Right column begins.'},{x:330,y:690,text:'Right middle line.'},{x:330,y:670,text:'Right column ends.'},{x:290,y:30,text:String(n)}];
    const stream=blank?'':lines.map(l=>`BT /F1 12 Tf ${l.x} ${l.y} Td (${l.text}) Tj ET`).join('\n');
    const streamId=add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    ids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`));
  }
  objects[1]=`<< /Type /Pages /Count ${pages} /Kids [${ids.map(id=>`${id} 0 R`).join(' ')}] >>`;
  let text='%PDF-1.4\n';const offsets=[0];
  objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const xref=Buffer.byteLength(text);text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(text);
}
