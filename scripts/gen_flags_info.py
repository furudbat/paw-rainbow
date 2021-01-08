#! /usr/bin/python

import os, sys
import json
from pprint import pprint
import re
import yaml
from pyquery import PyQuery as pq

def count_words(string):
    string = string.strip()
    count=1
    for i in string:
        if i == ' ':
            count = count + 1
     
    return count

def genFlags(flags):
    new_flags = []
    for i in range(len(flags)):
        flag = flags[i]
        flag_name = flag['name']
        if 'link' in  flag:
            url = flag['link']

            if url:
                print("open {}".format(url))
                page = pq(url, headers={'user-agent': 'pyquery'})
                new_flag = dict()
                new_flag['name'] = flag_name
                new_flag['link'] = url
                new_flag['id'] = flag_name.lower().replace(' ', '_').replace("'", '').replace('+', '').replace('-', '_').replace('/', '_').replace('\\', '_')

                if 'lgbta.wikia.org' in url:
                    img = page('.WikiaArticle figure.pi-image img')
                    if not img.attr('src'):
                        aimg = page('.WikiaArticle figure.tright a.image')
                        if aimg.attr('href') and not re.search(r'scale-to-width-down', aimg.attr('href')):
                            new_flag['img'] = aimg.attr('href')
                            new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?[\d]+$', '', new_flag['img'])
                            new_flag['img'] = re.sub(r'\/revision\/latest\/scale-to-width-down\/\d+$', '', new_flag['img'])
                            new_flag['img'] = re.sub(r'\/revision\/latest$', '', new_flag['img'])
                        else:
                            img = page('.WikiaArticle figure.tright img')
                            if img:
                                new_flag['img'] = img.attr('src')
                                new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?[\d]+$', '', new_flag['img'])
                                new_flag['img'] = re.sub(r'\/revision\/latest\/scale-to-width-down\/\d+$', '', new_flag['img'])
                                new_flag['img'] = re.sub(r'\/revision\/latest$', '', new_flag['img'])
                    else:
                        if img:
                            new_flag['img'] = img.attr('src')
                            new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?[\d]+$', '', new_flag['img'])
                            new_flag['img'] = re.sub(r'\/revision\/latest\/scale-to-width-down\/\d+$', '', new_flag['img'])
                            new_flag['img'] = re.sub(r'\/revision\/latest$', '', new_flag['img'])

                    description = ''
                    page.find('aside').empty()
                    page.find('table').empty()
                    page.find('figure').empty()
                    for dp in page('.WikiaArticle div.mw-parser-output').items('p, h2'):
                        if dp.is_('p') and dp.not_('.caption') and dp.text().strip():
                            add_text = dp.text()
                            description = description + "<p>{}</p>".format(add_text)
                        elif dp.is_('h2') or dp.is_('.toc'):
                            break

                        if(count_words(description) >= 30):
                            break
                    if description:
                        new_flag['description'] = description
                        new_flag['description'] = re.sub(r'\[\d\]', '', new_flag['description'])
                elif 'lgbt.wikia.org' in url:
                    aimg = page('.WikiaArticle .floatright a.image')
                    if not aimg.attr('href'):
                        img = page('.WikiaArticle .floatright img')
                        if img:
                            new_flag['img'] = img.attr('src')
                            new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?[\d]+$', '', new_flag['img'])
                            new_flag['img'] = re.sub(r'\/revision\/latest\/scale-to-width-down\/\d+$', '', new_flag['img'])
                            new_flag['img'] = re.sub(r'\/revision\/latest$', '', new_flag['img'])
                    else:
                        new_flag['img'] = aimg.attr('href')
                        new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?[\d]+$', '', new_flag['img'])
                        new_flag['img'] = re.sub(r'\/revision\/latest\/scale-to-width-down\/\d+$', '', new_flag['img'])
                        new_flag['img'] = re.sub(r'\/revision\/latest$', '', new_flag['img'])

                    description = ''
                    page.find('aside').empty()
                    page.find('table').empty()
                    page.find('figure').empty()
                    for dp in page('.WikiaArticle div.mw-parser-output').items('p, h2'):
                        if dp.is_('p') and dp.not_('.caption') and dp.text().strip():
                            add_text = dp.text()
                            description = description + "<p>{}</p>".format(add_text)
                        elif dp.is_('h2') or dp.is_('.toc'):
                            break

                        if(count_words(description) >= 10):
                            break
                    if description:
                        new_flag['description'] = description
                        new_flag['description'] = re.sub(r'\[\d\]', '', new_flag['description'])
                elif 'en.wikipedia.org' in url:
                    aimg = page('.mw-parser-output div.tright a.image')
                    if aimg:
                        img_page = pq('https://en.wikipedia.org/' + aimg.attr('href'), headers={'user-agent': 'pyquery'})
                        img = img_page('.fullImageLink img')
                        new_flag['img'] = img.attr('src')
                        new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?\d+$', '', new_flag['img'])
                    
                    description = ''
                    page.find('aside').empty()
                    page.find('table').empty()
                    for dp in page('.mw-body #mw-content-text div.mw-parser-output').items('p, h2'):
                        if dp.is_('.mw-empty-elt') or dp.is_('.tright'):
                            continue
                        
                        if dp.is_('p') and dp.not_('.caption') and dp.text().strip():
                            add_text = dp.text()
                            description = description + "<p>{}</p>".format(add_text)
                        elif dp.is_('h2') or dp.is_('.toc'):
                            break

                        if(count_words(description) >= 80):
                            break
                    if description:
                        new_flag['description'] = description
                        new_flag['description'] = re.sub(r'\[\d\]', '', new_flag['description'])
                elif 'nonbinary.wiki' in url:
                    aimg = page('.mw-parser-output table.infobox tbody img')
                    if not aimg.attr('src'):
                        aimg = page('.mw-parser-output div.tright a.image')
                        if aimg:
                            img_page = pq('https://nonbinary.wiki/' + aimg.attr('href'), headers={'user-agent': 'pyquery'})
                            img = img_page('.fullImageLink img')
                            new_flag['img'] = img.attr('src')
                            new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?\d+$', '', new_flag['img'])
                    else:
                        if aimg:
                            new_flag['img'] = aimg.attr('src')

                    description = ''
                    page.find('aside').empty()
                    page.find('table').empty()
                    page.find('mw-parser-output i:first').empty()
                    for dp in page('.mw-body #mw-content-text div.mw-parser-output').items('p, h2'):
                        if dp.is_('.mw-empty-elt') or dp.is_('.tright') or dp.is_('i'):
                            continue
                        
                        if dp.is_('p') and dp.not_('.caption') and dp.text().strip():
                            add_text = dp.text()
                            if re.search(r'^See also [a-zA-z0-9_\s]+.$', add_text):
                                continue
                            description = description + "<p>{}</p>".format(add_text)
                            break
                        elif dp.is_('h2') or dp.is_('.toc'):
                            break

                        if(count_words(description) >= 20):
                            break
                    
                    if description:
                        new_flag['description'] = description
                        new_flag['description'] = re.sub(r'\[\d\]', '', new_flag['description'])

                if 'img' in flag and flag['img']:
                    new_flag['img'] = flag['img']

                new_flags.append(new_flag)

    return new_flags

def main():
    pride_flags = dict()
    sexual_flags = dict()
    gender_flags = dict()
    relationship_flags = dict()
    romantic_flags = dict()
    sub_culture_flags = dict()
    
    with open('config.yaml') as f:
        config = yaml.load(f, Loader=yaml.FullLoader)

    with open('pride_flags.yaml') as f:
        pride_flags = yaml.load(f, Loader=yaml.FullLoader)
    with open('sexual_flags.yaml') as f:
        sexual_flags = yaml.load(f, Loader=yaml.FullLoader)
    with open('gender_flags.yaml') as f:
        gender_flags = yaml.load(f, Loader=yaml.FullLoader)
    with open('relationship_flags.yaml') as f:
        relationship_flags = yaml.load(f, Loader=yaml.FullLoader)
    with open('romantic_flags.yaml') as f:
        romantic_flags = yaml.load(f, Loader=yaml.FullLoader)
    with open('sub_culture_flags.yaml') as f:
        sub_culture_flags = yaml.load(f, Loader=yaml.FullLoader)

    pride_flags = genFlags(pride_flags)
    sexual_flags = genFlags(sexual_flags)
    gender_flags = genFlags(gender_flags)
    relationship_flags = genFlags(relationship_flags)
    romantic_flags = genFlags(romantic_flags)
    sub_culture_flags = genFlags(sub_culture_flags)

    all_flags = []
    all_flags.extend(pride_flags)
    all_flags.extend(sexual_flags)
    all_flags.extend(gender_flags)
    all_flags.extend(relationship_flags)
    all_flags.extend(romantic_flags)
    all_flags.extend(sub_culture_flags)

    all_flags = sorted(all_flags, key=lambda k: k['name']) 

    print("Flags count: {}".format(len(all_flags)))

    with open(r'output/flags_info.json', 'w') as file:
        json.dump(all_flags, file, indent=4)

    with open(r'output/flags_info.json', 'r') as json_file:
        with open(r'../_data/flags_info.yml', 'w') as yaml_file:
            yaml.safe_dump(json.load(json_file), yaml_file, default_flow_style=False, allow_unicode=True)
    

if __name__ == "__main__":
    main()