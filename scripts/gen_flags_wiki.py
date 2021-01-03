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

                if 'lgbta.wikia.org' in url:
                    description = ''
                    for dp in page('.WikiaArticle div.mw-parser-output').items('p, h2'):
                        dp.find('aside').empty()
                        dp.find('table').empty()
                        dp.find('figure').empty()
                        pprint(dp.html())
                        if dp.is_('p') and dp.not_('.caption') and dp.text().strip():
                            add_text = dp.text()
                            description = description + "<p>{}</p>".format(add_text)
                        elif dp.is_('h2') or dp.is_('.toc'):
                            break

                        print("description: {} words".format(count_words(description)))

                        if(count_words(description) >= 10):
                            break

                    aimg = page('.WikiaArticle figure.tright a.image img')
                    if not aimg:
                        aimg = page('.WikiaArticle aside figure a.image img')

                    if description:
                        new_flag['description'] = description
                    if aimg:
                        new_flag['img'] = aimg.attr('src')
                        new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?[\d]+$', '', new_flag['img'])
                        new_flag['img'] = re.sub(r'\/revision\/latest\/scale-to-width-down\/\d+$', '', new_flag['img'])
                elif 'en.wikipedia.org' in url:
                    description = ''
                    for dp in page('.mw-body #mw-content-text div.mw-parser-output').items('p, h2'):
                        dp.find('aside').empty()
                        dp.find('table').empty()
                        if dp.is_('.mw-empty-elt') or dp.is_('.tright'):
                            continue
                        
                        if dp.is_('p') and dp.not_('.caption') and dp.text().strip():
                            add_text = dp.text()
                            description = description + "<p>{}</p>".format(add_text)
                        elif dp.is_('h2') or dp.is_('.toc'):
                            break

                        print("description: {} words".format(count_words(description)))

                        if(count_words(description) >= 80):
                            break

                    aimg = page('.mw-parser-output div.tright a.image')

                    if description:
                        new_flag['description'] = description
                    if aimg:
                        img_page = pq('https://en.wikipedia.org/' + aimg.attr('href'), headers={'user-agent': 'pyquery'})
                        img = img_page('.fullImageLink img')
                        new_flag['img'] = img.attr('src')
                        new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?\d+$', '', new_flag['img'])
                elif 'nonbinary.wiki' in url:
                    description = ''
                    for dp in page('.mw-body #mw-content-text div.mw-parser-output').items('p, h2'):
                        if dp.find('aside') or dp.find('table') or dp.is_('.mw-empty-elt') or dp.is_('.tright'):
                            continue
                        
                        if dp.is_('p') and dp.not_('.caption') and dp.text().strip():
                            add_text = dp.text()
                            description = description + "<p>{}</p>".format(add_text)
                            break
                        elif dp.is_('h2') or dp.is_('.toc'):
                            break

                        print("description: {} words".format(count_words(description)))

                        if(count_words(description) >= 10):
                            break

                    aimg = page('.mw-parser-output div.tright a.image')

                    if description:
                        new_flag['description'] = description
                    if aimg:
                        img_page = pq('https://nonbinary.wiki/' + aimg.attr('href'), headers={'user-agent': 'pyquery'})
                        img = img_page('.fullImageLink img')
                        new_flag['img'] = img.attr('src')
                        new_flag['img'] = re.sub(r'[&\?][a-zA-z-]*=?\d+$', '', new_flag['img'])


                new_flags.append(new_flag)

    return new_flags

def main():
    config = dict()
    pride_flags = dict()
    sexual_flags = dict()
    gender_flags = dict()
    relationship_flags = dict()
    romantic_flags = dict()
    tribe_flags = dict()
    
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
    with open('tribe_flags.yaml') as f:
        tribe_flags = yaml.load(f, Loader=yaml.FullLoader)

    pride_flags = genFlags(pride_flags)
    sexual_flags = genFlags(sexual_flags)
    gender_flags = genFlags(gender_flags)
    relationship_flags = genFlags(relationship_flags)
    romantic_flags = genFlags(romantic_flags)
    tribe_flags = genFlags(tribe_flags)

    all_flags = []
    all_flags.extend(pride_flags)
    all_flags.extend(sexual_flags)
    all_flags.extend(gender_flags)
    all_flags.extend(relationship_flags)
    all_flags.extend(romantic_flags)
    all_flags.extend(tribe_flags)

    print("Flags count: {}".format(len(all_flags)))

    with open(r'flags_wiki.json', 'w') as file:
        json.dump(all_flags, file, indent=4)

    with open(r'flags_wiki.json', 'r') as json_file:
        with open(r'../_data/flags_wiki.yml', 'w') as yaml_file:
            yaml.safe_dump(json.load(json_file), yaml_file, default_flow_style=False, allow_unicode=True)
    

if __name__ == "__main__":
    main()