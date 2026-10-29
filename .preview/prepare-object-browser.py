"""One-time, non-executing import of the user-supplied Object Browser DOM."""
from html import escape
from html.parser import HTMLParser
from pathlib import Path

root = Path(__file__).resolve().parent.parent
capture = Path(r'C:\Users\James\.codex\attachments\be6301b9-8deb-43e0-ba7c-481d9f76fd78\pasted-text.txt')

class Capture(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.script = False
        self.parts = []
    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if not self.depth:
            if tag != 'div' or attributes.get('class') != 'ObjectBrowserWrapper':
                return
            self.depth = 1
        elif tag == 'div':
            self.depth += 1
        if tag == 'script':
            self.script = True
            return
        if self.script or (tag == 'input' and attributes.get('type') == 'hidden'):
            return
        safe = []
        for key, value in attrs:
            if key.startswith('on') or key.startswith('data-') or key in ('name', 'allow', 'accesskey'):
                continue
            if tag == 'iframe' and key == 'src':
                continue
            if key == 'href':
                value = '#object-browser-preview'
            if key == 'style':
                value = value.replace('display:;', '')
            safe.append(key if value is None else key + '="' + escape(value, quote=True) + '"')
        if tag == 'iframe':
            safe.append('title="Example folder summary"')
        self.parts.append('<' + tag + (' ' if safe else '') + ' '.join(safe) + '>')
    def handle_endtag(self, tag):
        if not self.depth:
            return
        if tag == 'script':
            self.script = False
            return
        if self.script:
            return
        self.parts.append('</' + tag + '>')
        if tag == 'div':
            self.depth -= 1
    def handle_data(self, data):
        if self.depth and not self.script:
            self.parts.append(escape(data))

parser = Capture()
parser.feed(capture.read_text(encoding='utf-8-sig'))
html = ''.join(parser.parts)
assert html.count('ObjectBrowserWrapper') == 2
assert 'WebForm_' not in html and '<script' not in html and 'SummaryFrame' in html
(root / 'Theme/UnionSuite/docs/object-browser-example.html').write_text(
    '<!-- Captured native structure; scripts, postbacks, navigation and hidden state removed. -->\n' + html,
    encoding='utf-8')
print('Prepared native Object Browser fixture.')
