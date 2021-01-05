#! /usr/bin/python

import os, sys
import json
from pprint import pprint
import re
import yaml
from PIL import Image, ImageDraw
from colour import Color

def rgb_to_hex(rgb):
    return '#%02x%02x%02x' % rgb

def hex_to_rgb(hex):
  hex = hex.replace('#', '')
  return tuple(int(hex[i:i+2], 16) for i in (0, 2, 4))

def genFlags(flags, category, strip_size_factor=1):
    base_strip_size = 8
    for i in range(len(flags)):
        flag = flags[i]
        flag_name = flag['name']

        strip_size = base_strip_size * strip_size_factor
        line_size = 0
        flag_line_color = None
        if len(flag['colors']) == 1:
            strip_size = int(2*base_strip_size * strip_size_factor)
        elif len(flag['colors']) == 2:
            strip_size = int(1.5*base_strip_size * strip_size_factor)
        elif len(flag['colors']) >= 5:
            strip_size = int(base_strip_size/2 * strip_size_factor)
            if len(flag['colors']) % 2 == 0:
                if 'triangle' in flag:
                    strip_size = strip_size + base_strip_size * strip_size_factor

        if 'line' in flag:
            line_size = int(max(strip_size/2, 1))
            flag_line_color = Color(flag['line'])
        
        height = len(flag['colors']) * strip_size + line_size
        width = 2 * height
        output_img = Image.new(mode="RGBA", size=(width, height))
        sy = 0
        offset = 0
        if len(flag['colors']) % 2 == 0:
            offset = 1
        for j in range(len(flag['colors'])):
            flag_color = Color(flag['colors'][j])
            for y in range(strip_size):
                for x in range(width):
                    output_img.putpixel((x, sy + y), hex_to_rgb(flag_color.hex_l))
            sy = sy + strip_size
            if j == int(len(flag['colors'])/2)-offset and line_size > 0:
                for y in range(line_size):
                    for x in range(width):
                        output_img.putpixel((x, sy + y), hex_to_rgb(flag_line_color.hex_l))       
                sy = sy + line_size

        if 'triangle' in flag:
            draw = ImageDraw.Draw(output_img)
            shrink_triangle_size = 0
            for j in range(len(flag['triangle'])):
                triangle = flag['triangle'][j]
                triangle_size = (len(flag['triangle']) - j) * int(max(strip_size/2, 1))
                offset = 0
                if len(flag['colors']) % 2 == 0:
                    offset = 2
                if len(flag['colors']) >= 5:
                    offset = 4
                if strip_size_factor > 1:
                    offset = offset * strip_size_factor/2

                point_1 = (0, height/2 - offset - triangle_size)
                point_2 = (triangle_size + offset, height/2)
                point_3 = (0, height/2 + offset + triangle_size)

                triangle_color = Color(triangle)
                draw.polygon((point_1, point_2, point_3), fill=hex_to_rgb(triangle_color.hex_l))

                shrink_triangle_size = shrink_triangle_size + 1
        if 'circle' in flag:
            circle_color = Color(flag['circle'])

            offset = 0
            if len(flag['colors']) % 2 != 0:
                offset = 1

            circle_size = height/2
            out_r = circle_size - height/8
            out_point_1 = (width/2 - out_r - offset, height/2 - out_r - offset)
            out_point_4 = (width/2 + out_r, height/2 + out_r)

            if strip_size_factor == 1:
                draw = ImageDraw.Draw(output_img)

                draw.ellipse((out_point_1, out_point_4), fill=None, outline=hex_to_rgb(circle_color.hex_l))
            else:
                circle_img = Image.new(mode="RGBA", size=(width, height))
                draw_circle = ImageDraw.Draw(circle_img)

                in_r = circle_size/2
                in_point_1 = (width/2 - in_r - offset, height/2 - in_r - offset)
                in_point_4 = (width/2 + in_r, height/2 + in_r)

                draw_circle.ellipse((out_point_1, out_point_4), fill=hex_to_rgb(circle_color.hex_l))
                draw_circle.ellipse((in_point_1, in_point_4), fill=(0, 0 ,0 ,0))

                output_img.paste(circle_img, (0, 0), circle_img)
        

        flag_filename_part = flag_name.lower().replace(' ', '_').replace("'", '').replace('+', '').replace('-', '_').replace('/', '_').replace('\\', '_')

        output_dir = "assets/img/flags/{}".format(flag_filename_part)

        filename_key = 'filename'
        output_filename = os.path.join(output_dir, "{}.png".format(flag_filename_part)).replace('\\', '/')

        filenames = {}
        if 'filename_set' in flags[i]:
            filenames = flags[i]['filename_set']

        if strip_size_factor > 1:
            filename_key = None
            output_filename = os.path.join(output_dir, "{}-{}x.png".format(flag_filename_part, strip_size_factor)).replace('\\', '/')
            filenames["{}w".format(width)] = output_filename
        else:
            filenames["{}w".format(width)] = output_filename

        os.makedirs(os.path.join('..', output_dir), exist_ok=True)
        output_img.save(os.path.join('../', output_filename))
        if filename_key:
            flags[i][filename_key] = output_filename
        flags[i]['filename_set'] = filenames

        flags[i]['category'] = category

        print("genFlags: {} -> {}".format(flag_name, output_filename))

    return flags

def main():
    config = dict()
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

    for scale in [1, 2, 4, 8, 16]:
        pride_flags = genFlags(pride_flags, 'pride', scale)
        sexual_flags = genFlags(sexual_flags, 'sexual', scale)
        gender_flags = genFlags(gender_flags, 'gender', scale)
        relationship_flags = genFlags(relationship_flags, 'relationship', scale)
        romantic_flags = genFlags(romantic_flags, 'romantic', scale)
        sub_culture_flags = genFlags(sub_culture_flags, 'sub_culture', scale)

    all_flags = []
    all_flags.extend(pride_flags)
    all_flags.extend(sexual_flags)
    all_flags.extend(gender_flags)
    all_flags.extend(relationship_flags)
    all_flags.extend(romantic_flags)
    all_flags.extend(sub_culture_flags)

    print("Flags count: {}".format(len(all_flags)))

    with open(r'output/flags.json', 'w') as file:
        json.dump(all_flags, file, indent=4)

    with open(r'output/flags.json', 'r') as json_file:
        with open(r'../_data/flags.yml', 'w') as yaml_file:
            yaml.safe_dump(json.load(json_file), yaml_file, default_flow_style=False, allow_unicode=True)
    

if __name__ == "__main__":
    main()