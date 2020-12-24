#! /usr/bin/python

import os, sys
import json
from pprint import pprint
import re
import yaml
from PIL import Image
from colour import Color

def rgb_to_hex(rgb):
    return '#%02x%02x%02x' % rgb

def hex_to_rgb(hex):
  hex = hex.replace('#', '')
  return tuple(int(hex[i:i+2], 16) for i in (0, 2, 4))

def scanImage(paw_img, parts_from_config, color_code_map, transparent_color, outline_color, part, orientation):
    assert (orientation == "horizontal" or orientation == "vertical"), 'orientation must be "horizontal" or "vertical"'

    for part_color in parts_from_config[part][orientation]:
        paw_width = paw_img.size[0]
        paw_height = paw_img.size[1]
        for y in range(paw_height):
            for x in range(paw_width):
                coordinate = x, y
                rgba = r, g ,b, a = paw_img.getpixel(coordinate)
                rgb = r, g, b

                if a > 0:
                    px_color = Color(rgb_to_hex(rgb))
                    if px_color == Color(part_color):
                        find_exist_coord = False
                        replace_coord_index = None

                        for i in range(len(color_code_map[part]['start_' + orientation])):
                            if orientation == "horizontal":
                                if color_code_map[part]['start_' + orientation][i][1] == y and x < color_code_map[part]['start_' + orientation][i][0]:
                                    replace_coord_index = i
                                    find_exist_coord = True
                                elif color_code_map[part]['start_' + orientation][i][1] == y and color_code_map[part]['start_' + orientation][i][0] <= x:
                                    find_exist_coord = True
                            elif orientation == "vertical":
                                if color_code_map[part]['start_' + orientation][i][0] == x and y < color_code_map[part]['start_' + orientation][i][1]:
                                    replace_coord_index = i
                                    find_exist_coord = True
                                elif color_code_map[part]['start_' + orientation][i][0] == x and color_code_map[part]['start_' + orientation][i][1] <= y:
                                    find_exist_coord = True
                            if find_exist_coord:
                                break
                        
                        if replace_coord_index is not None and replace_coord_index >= 0:
                            color_code_map[part]['start_' + orientation][replace_coord_index] = coordinate
                        elif not find_exist_coord:
                            color_code_map[part]['start_' + orientation].append(coordinate)


    if orientation == "horizontal":
        color_code_map[part]['start_' + orientation].sort(key=lambda coord: coord[0])
    elif orientation == "vertical":
        color_code_map[part]['start_' + orientation].sort(key=lambda coord: coord[1])

    for start_coord in color_code_map[part]['start_' + orientation]:
        x = sx = start_coord[0]
        y = sy = start_coord[1]
        prev_coord = x, y
        find_end = False

        # TODO: optimize, was lazy, copy&paste code x.x
        if orientation == "horizontal":
            for x in range(sx, paw_width):
                coordinate = x, y
                rgba = r, g ,b, a = paw_img.getpixel(coordinate)
                rgb= r, g, b
                if a > 0:
                    px_color = Color(rgb_to_hex(rgb))

                    find_end = part != 'whole' and (px_color == outline_color or px_color == transparent_color)
                    find_end = find_end or (part == 'whole' and px_color == transparent_color)

                    if find_end:
                        color_code_map[part]['end_' + orientation].append(coordinate)
                prev_coord = coordinate
                if find_end:
                    break
        elif orientation == "vertical":
            for y in range(sy, paw_height):
                coordinate = x, y
                rgba = r, g ,b, a = paw_img.getpixel(coordinate)
                rgb= r, g, b
                if a > 0:
                    px_color = Color(rgb_to_hex(rgb))
                    
                    find_end = part != 'whole' and (px_color == outline_color or px_color == transparent_color)
                    find_end = find_end or (part == 'whole' and px_color == transparent_color)

                    if find_end:
                        color_code_map[part]['end_' + orientation].append(coordinate)
                        find_end = True
                prev_coord = coordinate
                if find_end:
                    break
        
        if not find_end:
            color_code_map[part]['end_' + orientation].append(prev_coord)
            
    if len(color_code_map[part]['start_' + orientation]) != len(color_code_map[part]['end_' + orientation]) or len(color_code_map[part]['start_' + orientation]) != len(color_code_map[part]['end_' + orientation]):
        pprint(color_code_map[part])
        print('start_{} length different from end_{} length: {} {}'.format(orientation, orientation, len(color_code_map[part]['start_' + orientation]), len(color_code_map[part]['end_' + orientation])))
        exit()

def getOutlineImage(paw_img, outline_color):
    paw_width = paw_img.size[0]
    paw_height = paw_img.size[1]
    paw_outlines_img = Image.new( mode = "RGBA", size = (paw_width, paw_height) )
    paw_outlines_pixels = paw_outlines_img.load()
    for y in range(paw_height):
        for x in range(paw_width):
            coordinate = x, y
            rgba = r, g ,b, a = paw_img.getpixel(coordinate)
            rgb = r, g, b
            px_color = Color(rgb_to_hex(rgb))
            if px_color == outline_color:
                paw_outlines_pixels[x, y] = rgba

    return paw_outlines_img

def generateColorCodeMap(config, parts, paw_img, transparent_color, outline_color):
    parts_from_config = dict()
    color_code_map = dict()

    parts_from_config['whole'] = dict()
    for part in parts:
        parts_from_config[part] = dict()
        parts_from_config[part]['horizontal'] = config['paw_colors'][part]['horizontal']
        parts_from_config[part]['vertical'] = config['paw_colors'][part]['vertical']

        color_code_map[part] = { 'start_horizontal': [], 'start_vertical': [], 'end_horizontal': [], 'end_vertical': [] }

        scanImage(paw_img, parts_from_config, color_code_map, transparent_color, outline_color, part, 'horizontal')
        scanImage(paw_img, parts_from_config, color_code_map, transparent_color, outline_color, part, 'vertical')
    
    color_code_map['center']['line'] = []
    color_code_map['center']['triangle'] = []
    color_code_map['craws'] = []
    color_code_map['extra_outline'] = []

    paw_width = paw_img.size[0]
    paw_height = paw_img.size[1]
    for y in range(paw_height):
        for x in range(paw_width):
            coordinate = x, y
            rgba = r, g ,b, a = paw_img.getpixel(coordinate)
            rgb = r, g, b
            px_color = Color(rgb_to_hex(rgb))

            for part_color in config['paw_colors']['center']['line']:
                if px_color == Color(part_color):
                    color_code_map['center']['line'].append(coordinate)
                    
            for i in range(len(config['paw_colors']['center']['triangle'])):
                part_color = config['paw_colors']['center']['triangle'][i]
                if i >= len(color_code_map['center']['triangle']):
                    color_code_map['center']['triangle'].append([])
                if px_color == Color(part_color):
                    color_code_map['center']['triangle'][i].append(coordinate)
                    
            for part_color in config['paw_colors']['craws']:
                if px_color == Color(part_color):
                    color_code_map['craws'].append(coordinate)
                    
            part_color = config['paw_colors']['extra_outline']
            if px_color == Color(part_color):
                color_code_map['extra_outline'].append(coordinate)

    return color_code_map

def generateSpriteLine(paw_outlines_img, outline_color, flag, orientation, color_code_map):
    assert (orientation == "horizontal" or orientation == "vertical"), 'orientation must be "horizontal" or "vertical"'

    paw_width = paw_outlines_img.size[0]
    paw_height = paw_outlines_img.size[1]

    output_flage_frames_map = dict()
    for part, color_coords in color_code_map.items():
        output_flage_part = Image.new(mode = "RGBA", size= (paw_width, paw_height))
        output_flage_part_pixels = output_flage_part.load()

        if 'start_' + orientation in color_coords and 'end_' + orientation in color_coords:
            stripes = len(color_coords['start_' + orientation])
            flag_colors_size = len(flag['colors'])

            flag_color_palette = []

            if flag_colors_size == 1:
                for i in range(stripes):
                    flag_color_palette.append(Color(flag['colors'][0]))
            elif stripes == flag_colors_size:
                for flag_color in flag['colors']:
                    flag_color_palette.append(Color(flag_color))
            elif stripes > flag_colors_size:
                stripe_size = int((stripes - flag_colors_size) / 2)
                if stripe_size > 0:
                    first_half = int(flag_colors_size / 2) - 1
                    second_half = int(flag_colors_size / 2) + 1

                    pprint(first_half)
                    pprint(second_half)

                    for i in range(first_half):
                        flag_color = flag['colors'][i]
                        flag_color_palette.append(Color(flag_color))
                    
                    flag_color = flag['colors'][int(len(flag['colors']) / 2)]
                    for j in range(stripe_size):
                        flag_color_palette.append(Color(flag_color))

                    for i in range(second_half, flag_colors_size):
                        flag_color = flag['colors'][i]
                        flag_color_palette.append(Color(flag_color))


            if len(flag_color_palette) < stripes:
                pprint(flag['colors'])
                pprint(flag_color_palette)
                print('generateSpriteLine: flag_color_palette size < stripes: {} < {}'.format(len(flag_color_palette), stripes))


            for i in range(stripes):
                x = sx = color_coords['start_' + orientation][i][0]
                y = sy = color_coords['start_' + orientation][i][1]
                ex = color_coords['end_' + orientation][i][0]
                ey = color_coords['end_' + orientation][i][1]

                if i < len(flag_color_palette):
                    if orientation == 'horizontal':
                        for x in range(sx, ex):
                            output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)
                    elif orientation == 'vertical':
                        for y in range(sy, ey):
                            output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)

            if orientation == 'vertical':
                if part == 'center':
                    if 'line' in flag:
                        line_flag_color = Color(flag['line'])
                        for coord in color_coords['line']:
                            x, y = coord
                            output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                        
                    if 'triangle' in flag:
                        triangle_flag_colors = flag['triangle']
                        for i in len(triangle_flag_colors):
                            triangle_flag_color = Color(triangle_flag_colors[i])
                            if i < len(color_coords['triangle']):
                                x, y = color_coords['triangle'][i]
                                output_flage_part_pixels[x ,y] = hex_to_rgb(triangle_flag_color.hex_l)

            output_flage_part.paste(paw_outlines_img, (0, 0), paw_outlines_img)

            if 'extra_outline' in color_code_map:
                for coord in color_code_map['extra_outline']:
                    x, y = coord
                    output_flage_part_pixels[x ,y] = hex_to_rgb(outline_color.hex_l)

            output_flage_frames_map[orientation + '_' + part] = output_flage_part

    return output_flage_frames_map
        


def main():
    config = dict()
    flags = dict()
    with open('config.yaml') as f:
        config = yaml.load(f, Loader=yaml.FullLoader)
    with open('flags.yaml') as f:
        flags = yaml.load(f, Loader=yaml.FullLoader)


    transparent_color = Color(config['transparent_color'])
    outline_color = Color(config['paw_colors']['outline'])

    parts = [
        'left_part_1',
        'left_part_2',
        'right_part_1',
        'right_part_2',
        'center'
    ]

    color_code_map = dict()
    paw_outlines_img = Image.new(mode = "RGBA", size= (0, 0))

    in_filename = './paw.png'
    with Image.open(in_filename) as paw_img:
        paw_outlines_img = getOutlineImage(paw_img, outline_color)
        color_code_map = generateColorCodeMap(config, parts, paw_img, transparent_color, outline_color)

    with open('color_code_map.json', 'w') as f:
        json.dump(color_code_map, f, indent=4)

    output_flages_map = dict()
    frames_line_count = 0
    for flag in flags:
        output_flage_frames = dict()
        for key, value in generateSpriteLine(paw_outlines_img, outline_color, flag, 'vertical', color_code_map).items():
            output_flage_frames[key] = value
        for key, value in generateSpriteLine(paw_outlines_img, outline_color, flag, 'horizontal', color_code_map).items():
            output_flage_frames[key] = value
        frames_line_count = len(output_flage_frames)
        output_flages_map[flag['name']] = output_flage_frames


    paw_width = paw_outlines_img.size[0]
    paw_height = paw_outlines_img.size[1]
    output = Image.new(mode = "RGBA", size=(paw_width * frames_line_count, paw_height * len(output_flages_map.values())))
    output_map = dict()
    y = 0
    x = 0
    for flag_name, output_flages in output_flages_map.items():
        x = 0
        output_map[flag_name] = dict()
        for part, output_flage in output_flages.items():
            output.paste(output_flage, (x, y))
            output_map[flag_name][part] = {'flag_name': flag_name, 'part': part, 'coord': (x, y, paw_width, paw_height)}
            x += paw_width
        y += paw_height

    with open('output_map.json', 'w') as f:
        json.dump(output_map, f, indent=4)

    #output.show()
    output.save("output.png") 



if __name__ == "__main__":
    main()