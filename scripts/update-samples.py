"""Refresh three bounded chapter samples from verified public-domain editions.

No network request occurs in the running app. Full editions remain at their
source landing pages. Run from the repository root with Python 3.10+.
"""
from pathlib import Path
import hashlib
import json
import re
import urllib.request

BOOKS = [
    (11, 'alice', "Alice’s Adventures in Wonderland", 'Lewis Carroll', 'English',
     'Chapter I · Down the Rabbit-Hole', 'Alice was beginning', r'(?m)^CHAPTER II\.',
     'A curious rabbit. A very unusual afternoon.', 'Arthur DiBianca and David Widger'),
    (1342, 'pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen', 'English',
     'Chapter I', 'It is a truth', r'(?m)^CHAPTER II\.',
     'Sharp wit, first impressions, and the Bennet family.',
     'Chuck Greif and the Online Distributed Proofreading Team at www.pgdp.net'),
    (2000, 'don-quijote', 'Don Quijote', 'Miguel de Cervantes Saavedra', 'Español',
     'Primera parte · Capítulo I', 'En un lugar', r'(?m)^Cap.tulo II\.',
     'El comienzo de una aventura que cambió la literatura.',
     'An anonymous Project Gutenberg volunteer and Joaquin Cuenca Abela'),
]
root = Path(__file__).resolve().parents[1]
catalog = []
licenses = []
for number, slug, title, author, language, chapter, opening, ending, description, credits in BOOKS:
    source = f'https://www.gutenberg.org/cache/epub/{number}/pg{number}.txt'
    original_bytes = urllib.request.urlopen(source, timeout=30).read()
    original = original_bytes.decode('utf-8-sig').replace('\r\n', '\n')
    start = original.index(opening)
    boundary = re.search(ending, original[start:])
    if not boundary:
        raise ValueError(f'Missing chapter boundary for {number}')
    text = original[start:start + boundary.start()]
    if number == 1342:
        while '[Illustration' in text:
            left = text.index('[Illustration')
            depth = 0
            for right in range(left, len(text)):
                depth += (text[right] == '[') - (text[right] == ']')
                if depth == 0:
                    text = text[:left] + text[right + 1:]
                    break
            else:
                raise ValueError('Unclosed illustration caption')
    text = re.sub(r'(?m)^[ \t]*\*(?:[ \t]+\*)*[ \t]*$', '', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    paragraphs = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n', text)]
    text = '\n\n'.join(p for p in paragraphs if p)
    words = len(text.split())
    if not 500 <= words <= 4000 or 'PROJECT GUTENBERG' in text:
        raise ValueError(f'Unexpected sample extraction for {number}: {words} words')
    license_start = original.index('START: FULL LICENSE')
    licenses.append(original[license_start:].strip())
    catalog.append(dict(id=slug, title=title, author=author, language=language,
                        chapter=chapter, description=description, text=text,
                        words=words, sourceUrl=f'https://www.gutenberg.org/ebooks/{number}',
                        originalUrl=source, sourceSha256=hashlib.sha256(original_bytes).hexdigest(),
                        copyright='Public domain in the USA', credits=credits))
    print(f'{title}: {words} words')
if len(set(licenses)) != 1:
    raise ValueError('Edition licenses differ; review them before redistributing.')
(root / 'src/samples/catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
notice = """PUBLIC-DOMAIN CHAPTER SAMPLES

These are opening-chapter excerpts, not complete books. Authors' wording is
preserved. Line wrapping, plain-text emphasis markers, decorative separators
and illustration captions have been removed for RSVP reading. Book introductions,
modern commentary and illustrations are not included. No endorsement is implied.

This eBook is for the use of anyone anywhere in the United States and most
other parts of the world at no cost and with almost no restrictions
whatsoever. You may copy it, give it away or re-use it under the terms
of the Project Gutenberg License included with this eBook or online
at www.gutenberg.org. If you are not located in the United States,
you will have to check the laws of the country where you are located
before using this eBook.

FULL EDITIONS AND PRODUCTION CREDITS

"""
for b in catalog:
    notice += f"{b['title']} — {b['author']}\n{b['chapter']}\n{b['sourceUrl']}\nOriginal text: {b['originalUrl']}\nCredits: {b['credits']}\nCopyright status: {b['copyright']}\n\n"
notice += licenses[0] + '\n'
(root / 'public/samples/NOTICE.txt').write_text(notice, encoding='utf-8')
