#!/usr/bin/env python3
"""Read article HTML and refresh the marked list in the learning homepage."""
from __future__ import annotations
import argparse
import html
from html.parser import HTMLParser
from pathlib import Path
import re
import time
from urllib.parse import quote

START = '<!-- ARTICLES:START -->'
END = '<!-- ARTICLES:END -->'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.title = []
        self.intro = []
        self.meta_description = ''
        self.is_article = False
        self.draft = False
        self.seen_title = False
        self.seen_intro = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get('class', '').split()
        parent = self.stack[-1] if self.stack else {'hidden': False, 'title': False, 'intro': False, 'header': False}
        hidden = parent['hidden'] or tag in {'script', 'style', 'template', 'noscript'} or 'hidden' in attrs or attrs.get('aria-hidden') == 'true'
        in_header = parent['header'] or 'page-header' in classes
        title = parent['title']
        intro = parent['intro']
        if not hidden and tag == 'h1' and not self.seen_title:
            self.seen_title = True
            title = True
        if not hidden and 'intro' in classes and in_header and not self.seen_intro:
            self.seen_intro = True
            intro = True
        if not hidden and tag == 'article' and 'article-body' in classes:
            self.is_article = True
        if tag == 'meta':
            name = attrs.get('name', '').lower()
            if name == 'description':
                self.meta_description = attrs.get('content', '')
            elif name == 'zeksa-draft':
                self.draft = attrs.get('content', '').lower() == 'true'
        if tag == 'br' and not hidden:
            if title: self.title.append(' ')
            if intro: self.intro.append(' ')
        if tag not in VOID:
            self.stack.append({'tag': tag, 'hidden': hidden, 'header': in_header, 'title': title, 'intro': intro})

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]['tag'] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if self.stack and not self.stack[-1]['hidden']:
            if self.stack[-1]['title']: self.title.append(data)
            if self.stack[-1]['intro']: self.intro.append(data)


def clean(value):
    return re.sub(r'\s+', ' ', value).strip()


def collect_articles(folder, home):
    articles = []
    files = sorted(folder.glob('*.html'), key=lambda path: path.name.casefold())
    for file in files:
        if file.name in {home, 'article-template.html'} or file.is_symlink():
            continue
        parser = ArticleParser()
        parser.feed(file.read_text(encoding='utf-8-sig'))
        title = clean(''.join(parser.title))
        if not parser.is_article or parser.draft or not title or title == '【文章标题】':
            continue
        intro = clean(''.join(parser.intro)) or clean(parser.meta_description)
        if intro == '【文章简介】':
            intro = ''
        articles.append((file.name, title, intro))
    return articles


def render_cards(articles):
    if not articles:
        return '      <p class="intro">暂无学习文章。</p>'
    cards = []
    for filename, title, intro in articles:
        lines = [f'      <a class="entry article-link" href="{quote(filename, safe="")}">',
                 f'        <h2>{html.escape(title)}</h2>']
        if intro:
            lines.append(f'        <p>{html.escape(intro)}</p>')
        lines.extend(['        <span class="read-more">阅读文章 →</span>', '      </a>'])
        cards.append('\n'.join(lines))
    return '\n'.join(cards)


def update(folder, home='tindex.html'):
    home_path = folder / home
    source = home_path.read_text(encoding='utf-8')
    if source.count(START) != 1 or source.count(END) != 1 or source.index(START) > source.index(END):
        raise ValueError(f'{home} 中必须有且仅有一对 ARTICLES 标记。')
    articles = collect_articles(folder, home)
    before, rest = source.split(START, 1)
    _, after = rest.split(END, 1)
    result = before + START + '\n' + render_cards(articles) + '\n      ' + END + after
    changed = result != source
    if changed:
        # Replace only the generated list; all surrounding user edits remain intact.
        temp = home_path.with_name(home_path.name + '.tmp')
        temp.write_text(result, encoding='utf-8')
        temp.replace(home_path)
    return len(articles), changed


def main():
    parser = argparse.ArgumentParser(description='自动读取同目录文章的标题与简介，更新学习主页。')
    parser.add_argument('--home', default='tindex.html', help='主页文件名（默认 tindex.html）')
    parser.add_argument('--watch', action='store_true', help='保持运行，自动同步文章的新增、修改和删除')
    args = parser.parse_args()
    if Path(args.home).name != args.home:
        parser.error('--home 必须是同目录的 HTML 文件名。')
    folder = Path(__file__).resolve().parent
    first = True
    previous_error = None
    try:
        while True:
            try:
                count, changed = update(folder, args.home)
                if first or changed or previous_error:
                    print(f'已同步 {count} 篇文章 → {args.home}', flush=True)
                previous_error = None
            except (OSError, ValueError) as error:
                if not args.watch:
                    raise
                message = str(error)
                if message != previous_error:
                    print(f'暂未更新：{message}', flush=True)
                previous_error = message
            if not args.watch:
                break
            if first:
                print('正在监测文章变化。保存文章后会自动更新列表；浏览器刷新后可见。按 Ctrl+C 退出。', flush=True)
            first = False
            time.sleep(1)
    except KeyboardInterrupt:
        print('\n已停止自动更新。')
    except (OSError, ValueError) as error:
        parser.exit(1, f'更新失败：{error}\n')


if __name__ == '__main__':
    main()
