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

def scanImage(img, parts_from_config, color_code_map, transparent_colors, outline_color, part, orientation):
    assert (orientation == "horizontal" or orientation == "vertical"), 'orientation must be "horizontal" or "vertical"'
    if not part in parts_from_config:
        return

    if not part in color_code_map:
        color_code_map[part] = { 'start_horizontal': [], 'start_vertical': [], 'end_horizontal': [], 'end_vertical': [] }

    if part in parts_from_config and orientation in parts_from_config[part] and ('start_' + orientation) in color_code_map[part]:
        for part_color in parts_from_config[part][orientation]:
            paw_width = img.size[0]
            paw_height = img.size[1]
            for y in range(paw_height):
                for x in range(paw_width):
                    coordinate = x, y
                    rgba = r, g ,b, a = img.getpixel(coordinate)
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
            color_code_map[part]['start_' + orientation] = list(dict.fromkeys(color_code_map[part]['start_' + orientation]))
            color_code_map[part]['start_' + orientation].sort(key=lambda coord: coord[1])
        elif orientation == "vertical":
            color_code_map[part]['start_' + orientation] = list(dict.fromkeys(color_code_map[part]['start_' + orientation]))
            color_code_map[part]['start_' + orientation].sort(key=lambda coord: coord[0])

    if part in color_code_map and 'start_' + orientation in color_code_map[part] and color_code_map[part]['start_' + orientation]:
        for start_coord in color_code_map[part]['start_' + orientation]:
            x = sx = start_coord[0]
            y = sy = start_coord[1]
            prev_coord = x, y
            find_end = False

            # TODO: optimize, was lazy, copy&paste code x.x
            if orientation == "horizontal":
                for x in range(sx, paw_width):
                    coordinate = x, y
                    rgba = r, g ,b, a = img.getpixel(coordinate)
                    rgb= r, g, b
                    if a > 0:
                        px_color = Color(rgb_to_hex(rgb))

                        find_end = part != 'whole' and px_color == outline_color
                        for transparent_color in transparent_colors:
                            find_end = find_end or (part != 'whole' and px_color == transparent_color)
                        for transparent_color in transparent_colors:
                            find_end = find_end or (part == 'whole' and px_color == transparent_color)

                        if find_end:
                            color_code_map[part]['end_' + orientation].append(coordinate)
                    prev_coord = coordinate
                    if find_end:
                        break
            elif orientation == "vertical":
                for y in range(sy, paw_height):
                    coordinate = x, y
                    rgba = r, g ,b, a = img.getpixel(coordinate)
                    rgb= r, g, b
                    if a > 0:
                        px_color = Color(rgb_to_hex(rgb))
                        
                        find_end = part != 'whole' and px_color == outline_color
                        for transparent_color in transparent_colors:
                            find_end = find_end or (part != 'whole' and px_color == transparent_color)
                        for transparent_color in transparent_colors:
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

def getOutlineImage(img, outline_color):
    paw_width = img.size[0]
    paw_height = img.size[1]
    paw_outlines_img = Image.new( mode = "RGBA", size = (paw_width, paw_height) )
    paw_outlines_pixels = paw_outlines_img.load()
    for y in range(paw_height):
        for x in range(paw_width):
            coordinate = x, y
            rgba = r, g ,b, a = img.getpixel(coordinate)
            rgb = r, g, b
            px_color = Color(rgb_to_hex(rgb))
            if px_color == outline_color:
                paw_outlines_pixels[x, y] = rgba

    return paw_outlines_img

def generateColorCodeMap(colors_config, parts, img, transparent_colors, outline_color):
    parts_from_config = dict()
    color_code_map = dict()

    parts_from_config['whole'] = dict()
    if 'whole' in parts:
        parts.remove('whole')
    for part in parts:
        parts_from_config[part] = dict()
        parts_from_config[part]['horizontal'] = colors_config[part]['horizontal'] if 'horizontal' in colors_config[part] else []
        parts_from_config[part]['vertical'] = colors_config[part]['vertical'] if 'vertical' in colors_config[part] else []

        if parts_from_config[part]['horizontal']:
            if not 'horizontal' in parts_from_config['whole']:
                parts_from_config['whole']['horizontal'] = []
            parts_from_config['whole']['horizontal'].extend(parts_from_config[part]['horizontal'])

        if parts_from_config[part]['vertical']:
            if not 'vertical' in parts_from_config['whole']:
                parts_from_config['whole']['vertical'] = []
            parts_from_config['whole']['vertical'].extend(parts_from_config[part]['vertical'])

        scanImage(img, parts_from_config, color_code_map, transparent_colors, outline_color, part, 'horizontal')
        scanImage(img, parts_from_config, color_code_map, transparent_colors, outline_color, part, 'vertical')

    scanImage(img, parts_from_config, color_code_map, transparent_colors, outline_color, 'whole', 'horizontal')
    scanImage(img, parts_from_config, color_code_map, transparent_colors, outline_color, 'whole', 'vertical')

    if 'center' in colors_config:
        if 'line' in colors_config['center']:
            parts_from_config['horizontal_line'] = colors_config['center']['line']
            parts_from_config['vertical_line'] = colors_config['center']['line']
    if 'main' in colors_config:
        if 'line' in colors_config['main']:
            parts_from_config['horizontal_line'] = colors_config['main']['line']
            parts_from_config['vertical_line'] = colors_config['main']['line']

    scanImage(img, parts_from_config, color_code_map, transparent_colors, outline_color, 'horizontal_line', 'horizontal')
    scanImage(img, parts_from_config, color_code_map, transparent_colors, outline_color, 'vertical_line', 'vertical')

    if 'center' in colors_config:
        color_code_map['center']['horizontal_line'] = color_code_map['horizontal_line'] if 'horizontal_line' in color_code_map else []
        color_code_map['center']['vertical_line'] = color_code_map['vertical_line'] if 'vertical_line' in color_code_map else []
    if 'main' in colors_config:
        color_code_map['main']['horizontal_line'] = color_code_map['horizontal_line'] if 'horizontal_line' in color_code_map else []
        color_code_map['main']['vertical_line'] = color_code_map['vertical_line'] if 'vertical_line' in color_code_map else []
    
    color_code_map['whole']['horizontal_line'] = color_code_map['horizontal_line'] if 'horizontal_line' in color_code_map else []
    color_code_map['whole']['vertical_line'] = color_code_map['vertical_line'] if 'vertical_line' in color_code_map else []

    if 'horizontal_line' in color_code_map:
        del color_code_map['horizontal_line']
    if 'vertical_line' in color_code_map:
        del color_code_map['vertical_line']
    if 'line' in color_code_map:
        del color_code_map['line']

    color_code_map['transparents'] = []

    img_width = img.size[0]
    img_height = img.size[1]
    for y in range(img_height):
        for x in range(img_width):
            coordinate = x, y
            rgba = r, g ,b, a = img.getpixel(coordinate)
            rgb = r, g, b
            px_color = Color(rgb_to_hex(rgb))

            for trans_color in transparent_colors:
                if px_color == trans_color:
                    color_code_map['transparents'].append(coordinate)
            
            extras = ['triangle', 'circle']
            for extra in extras:
                for part in parts:
                    if part in colors_config and extra in colors_config[part]:
                        for orientation in ['horizontal', 'vertical']:
                            extra_name = "{}_{}".format(orientation, extra)

                            if orientation in colors_config[part][extra]:
                                if not extra_name in color_code_map[part]:
                                    color_code_map[part][extra_name] = []
                                if not extra_name in color_code_map['whole']:
                                    color_code_map['whole'][extra_name] = []
                                
                                for i in range(len(colors_config[part][extra][orientation])):
                                    if isinstance(colors_config[part][extra][orientation][i], list):
                                        part_colors = colors_config[part][extra][orientation][i]
                                    else:
                                        part_colors = [ colors_config[part][extra][orientation][i] ]

                                    for part_color in part_colors:
                                        if i >= len(color_code_map[part][extra_name]):
                                            color_code_map[part][extra_name].append([])
                                            color_code_map['whole'][extra_name].append([])
                                        
                                        if px_color == Color(part_color):
                                            color_code_map[part][extra_name][i].append(coordinate)
                                            color_code_map['whole'][extra_name][i].append(coordinate)
            
            if 'craws' in colors_config:
                if not 'craws' in color_code_map:
                    color_code_map['craws'] = []
                for part_color in colors_config['craws']:
                    if px_color == Color(part_color):
                        color_code_map['craws'].append(coordinate)
                    
            if 'extra_outline' in colors_config:
                if not 'extra_outline' in color_code_map:
                    color_code_map['extra_outline'] = []
                part_color = colors_config['extra_outline']
                if px_color == Color(part_color):
                    color_code_map['extra_outline'].append(coordinate)

            if 'outlines' in colors_config:
                if not 'outlines' in color_code_map:
                    color_code_map['outlines'] = []
                for part_color in colors_config['outlines']:
                    if px_color == Color(part_color):
                        color_code_map['outlines'].append(coordinate)

    return color_code_map

def genStripesParts(small_start, small_end, stripes, flag_colors_size, orientation):
    rest_stripes = int(stripes - flag_colors_size)
    stripes_start_part = int(rest_stripes / 2) 
    stripes_end_part = int(rest_stripes / 2) 

    stripes_middle_center = 1
    stripes_start_center = rest_stripes - stripes_start_part - stripes_end_part + stripes_middle_center
    stripes_end_center = rest_stripes - stripes_start_part - stripes_end_part + stripes_middle_center

    if small_start:
        stripes_start_part = stripes_start_part + 1
        stripes_start_center = stripes_start_center - 1

    if small_end:
        stripes_end_part = stripes_end_part + 1
        stripes_end_center = stripes_end_center - 1

    if flag_colors_size % 2 != 0:
        stripes_middle_center = stripes_middle_center + 1
    elif flag_colors_size == 2 and stripes % 2 == 0:
        stripes_start_center = 0
        stripes_middle_center = 0
        stripes_end_center = 0
        stripes_start_part = int(stripes / 2)
        stripes_end_part = int(stripes / 2)
    elif flag_colors_size == 2 and stripes % 2 != 0:
        stripes_start_center = 0
        stripes_end_center = 0
        stripes_start_part = int(stripes / 2)
        stripes_end_part = int(stripes / 2)
        if stripes >= flag_colors_size*4:
            if flag_colors_size % 2 != 0:
                stripes_start_part = stripes_start_part - int(stripes / 4)
                stripes_end_part = stripes_end_part - int(stripes / 4)
                stripes_start_center = stripes_start_center + int(stripes / 4) - 2
            else:
                stripes_start_part = stripes_start_part - int(stripes / 4)
                stripes_end_part = stripes_end_part - int(stripes / 4)
                stripes_start_center = stripes_start_center + int(stripes / 4) - 2
                stripes_end_center = stripes_end_center + int(stripes / 4) - 2

            stripes_end_part = stripes_end_part + 1
            stripes_middle_center = stripes - stripes_start_part - stripes_end_part 
        else:
            stripes_middle_center = stripes - stripes_start_part - stripes_end_part

    loop_counter = 0
    while(True):
        has_stripes_start_center = False
        has_stripes_middle_center = False
        has_stripes_end_center = False
        rest_strips = stripes - stripes_start_part 
        for i in range(1, flag_colors_size-1):
            if i == int(flag_colors_size/2-1) and stripes_start_center > 0:
                rest_strips = rest_strips - stripes_start_center
                has_stripes_start_center = True
            elif i == int(flag_colors_size/2) and (stripes_middle_center > 0):
                rest_strips = rest_strips - stripes_middle_center
                has_stripes_middle_center = True
            elif i == int(flag_colors_size/2+1) and (stripes_end_center > 0):
                rest_strips = rest_strips - stripes_end_center
                has_stripes_end_center = True
            else:
                rest_strips = rest_strips - 1
        rest_strips = rest_strips - stripes_end_part
        if rest_strips > 0 and loop_counter < stripes:
            if rest_strips == 1:
                add_rest_stripes = rest_strips
                if flag_colors_size == 2:
                    if orientation == 'vertical':
                        stripes_start_part = stripes_start_part + add_rest_stripes
                    elif orientation == 'horizontal':
                        stripes_end_part = stripes_end_part + add_rest_stripes
                else:
                    if orientation == 'horizontal':
                        if has_stripes_start_center:
                            stripes_start_part = stripes_start_part + add_rest_stripes
                        elif has_stripes_middle_center:
                            stripes_middle_center = stripes_middle_center + add_rest_stripes
                    elif orientation == 'vertical':
                        if flag_colors_size % 2 == 0:
                            if has_stripes_start_center:
                                stripes_start_part = stripes_start_part + add_rest_stripes
                            elif has_stripes_middle_center:
                                stripes_middle_center = stripes_middle_center + add_rest_stripes
                        else:
                            if has_stripes_middle_center:
                                stripes_middle_center = stripes_middle_center + add_rest_stripes
                            elif has_stripes_end_center:
                                stripes_end_center = stripes_end_center + add_rest_stripes
            elif rest_strips % 2 == 0:
                add_rest_stripes = int(rest_strips / 2)
                if flag_colors_size == 2:
                    stripes_start_part = stripes_start_part + add_rest_stripes
                    stripes_end_part = stripes_end_part + add_rest_stripes
                elif flag_colors_size % 2 == 0:
                    stripes_start_center = stripes_start_center + add_rest_stripes
                    stripes_middle_center = stripes_middle_center + add_rest_stripes
                else:
                    stripes_middle_center = stripes_middle_center + add_rest_stripes
                    stripes_end_center = stripes_end_center + add_rest_stripes
            elif rest_strips % 3 == 0:
                add_rest_stripes = int(rest_strips / 3)
                stripes_start_center = stripes_start_center + add_rest_stripes
                stripes_middle_center = stripes_middle_center + add_rest_stripes
                stripes_end_center = stripes_end_center + add_rest_stripes
            else:
                add_rest_stripes = rest_strips
                if flag_colors_size == 2:
                    if orientation == 'vertical':
                        stripes_start_part = stripes_start_part + add_rest_stripes
                    elif orientation == 'horizontal':
                        stripes_end_part = stripes_end_part + add_rest_stripes
                elif flag_colors_size % 2 == 0:
                    if orientation == 'horizontal':
                        if has_stripes_start_center:
                            stripes_start_part = stripes_start_part + add_rest_stripes
                        elif has_stripes_middle_center:
                            stripes_middle_center = stripes_middle_center + add_rest_stripes
                    elif orientation == 'vertical':
                        stripes_end_center = stripes_end_center + add_rest_stripes
                else:
                    if orientation == 'horizontal':
                        stripes_middle_center = stripes_middle_center + add_rest_stripes
                    elif orientation == 'vertical':
                        stripes_end_center = stripes_end_center + add_rest_stripes
        else:
            if loop_counter >= stripes:
                pprint(flag_colors_size)
                pprint((stripes_start_center, stripes_middle_center, stripes_end_center))
                pprint((stripes_start_part, stripes_end_part))
                pprint(rest_strips)
                print('genStripesParts: something went wrong, can eliminate rest stripes')
            break
        loop_counter = loop_counter + 1

    return stripes_start_part, stripes_start_center, stripes_middle_center, stripes_end_center, stripes_end_part

def getFlagColorsPalette(stripes, flag_colors, stripes_start_part, stripes_start_center, stripes_middle_center, stripes_end_center, stripes_end_part):
    flag_colors_size = len(flag_colors)
    flag_color_palette = []

    if stripes >= flag_colors_size and stripes % 2 == 0 and flag_colors_size % 2 == 0 and stripes % flag_colors_size == 0:
        for i in range(flag_colors_size):
            flag_color = flag_colors[i]
            for j in range(int(stripes/flag_colors_size)):
                flag_color_palette.append(Color(flag_color))
    else:
        for i in range(stripes_start_part):
            flag_color = flag_colors[0]
            flag_color_palette.append(Color(flag_color))
        for i in range(1, flag_colors_size-1):
            flag_color = flag_colors[i]
            if i == int(flag_colors_size/2-1) and stripes_start_center > 0:
                for j in range(stripes_start_center):
                    flag_color_palette.append(Color(flag_color))
            elif i == int(flag_colors_size/2) and (stripes_middle_center > 0):
                for j in range(stripes_middle_center):
                    flag_color_palette.append(Color(flag_color))
            elif i == int(flag_colors_size/2+1) and (stripes_end_center > 0):
                for j in range(stripes_end_center):
                    flag_color_palette.append(Color(flag_color))
            else:
                flag_color_palette.append(Color(flag_color))
        for i in range(stripes_end_part):
            flag_color = flag_colors[-1]
            flag_color_palette.append(Color(flag_color))

    return flag_color_palette

def getFlagColorPaletteStriped(flag_colors, stripes, orientation):
    flag_colors_size = len(flag_colors)
    overflow_stripes = int(flag_colors_size - stripes)
    flag_color_palette = []
    for i in range(flag_colors_size):
        flag_color = flag_colors[i]
        if orientation == 'vertical':
            if overflow_stripes == 1 and i == 0:
                continue
            if overflow_stripes == 1 and i == int(flag_colors_size/2):
                flag_color_palette.append(Color(flag_color))
        if overflow_stripes == 2 and i == 0:
            continue
        if overflow_stripes == 2 and i == flag_colors_size-1:
            continue
        flag_color_palette.append(Color(flag_color))

    return flag_color_palette

def generateSpriteLine(output_map, paw_outlines_img, outline_color, form, flag, parts, orientation, color_code_map, mask_output):
    assert (orientation == "horizontal" or orientation == "vertical"), 'orientation must be "horizontal" or "vertical"'

    paw_width = paw_outlines_img.size[0]
    paw_height = paw_outlines_img.size[1]

    output_flage_frames = dict()
    frame_counter = 0
    for part in parts:
        color_coords = color_code_map[part]
        output_flage_part = Image.new(mode = "RGBA", size = (paw_width, paw_height))
        output_flage_part_pixels = output_flage_part.load()

        flag_colors_size = len(flag['colors'])
        flag_name = flag['name']

        key_name = flag_name.lower().replace(' ', '_').replace("'", '').replace('+', '').replace('-', '_').replace('/', '_').replace('\\', '_')
        mask_key = form + '_' + orientation + '_' + str(frame_counter)
        key = key_name + mask_key
        if not key in output_map:
            output_map[key] = { 'flag_name': flag_name, 'part': part, 'orientation': orientation, 'mask_key': mask_key }

        flags_fits = False
        flags_fits_perfect = False

        flag_color_palette = []
        if 'start_' + orientation in color_coords and 'end_' + orientation in color_coords and color_coords['start_' + orientation] and color_coords['end_' + orientation]:
            stripes = len(color_coords['start_' + orientation])

            small_start = False
            small_end = False
            if color_coords['start_' + orientation] and color_coords['end_' + orientation]:
                if orientation == "horizontal":
                    start_line_size = color_coords['end_' + orientation][0][0] - color_coords['start_' + orientation][0][0]
                    end_line_size = color_coords['end_' + orientation][-1][0] - color_coords['start_' + orientation][-1][0]
                    small_start = start_line_size <= 1
                    small_end = end_line_size <= 1
                elif orientation == "vertical":
                    start_line_size = color_coords['end_' + orientation][0][1] - color_coords['start_' + orientation][0][1]
                    end_line_size = color_coords['end_' + orientation][-1][1] - color_coords['start_' + orientation][-1][1]
                    small_start = start_line_size <= 1
                    small_end = end_line_size <= 1

            if flag_colors_size == 1:
                flags_fits = True
                for i in range(stripes):
                    flag_color_palette.append(Color(flag['colors'][0]))
            elif stripes == flag_colors_size:
                flags_fits = True
                flags_fits_perfect = True
                for flag_color in flag['colors']:
                    flag_color_palette.append(Color(flag_color))
            elif stripes > flag_colors_size:
                flags_fits = True
                rest_stripes = int(stripes - flag_colors_size)
                if rest_stripes == 1:
                    for i in range(0, int(flag_colors_size / 2)):
                        flag_color = flag['colors'][i]
                        flag_color_palette.append(Color(flag_color))

                    i = int(flag_colors_size / 2)
                    if i < flag_colors_size:
                        flag_color = flag['colors'][i]
                        for j in range(rest_stripes+1):
                            flag_color_palette.append(Color(flag_color))

                    for i in range(int(flag_colors_size / 2) + 1, flag_colors_size):
                        flag_color = flag['colors'][i]
                        flag_color_palette.append(Color(flag_color))
                else:
                    stripes_start_part, stripes_start_center, stripes_middle_center, stripes_end_center, stripes_end_part = genStripesParts(small_start, small_end, stripes, flag_colors_size, orientation)
                    flag_color_palette = getFlagColorsPalette(stripes, flag['colors'], stripes_start_part, stripes_start_center, stripes_middle_center, stripes_end_center, stripes_end_part)
            else:
                flags_fits = False
                flag_color_palette = getFlagColorPaletteStriped(flag['colors'], stripes, orientation)

            if len(flag_color_palette) < stripes:
                pprint(flag['colors'])
                pprint(flag_color_palette)
                print('generateSpriteLine: flag_color_palette size < stripes: {} < {}'.format(len(flag_color_palette), stripes))

            if color_coords['start_' + orientation] and color_coords['end_' + orientation]:
                for i in range(stripes):
                    x = sx = color_coords['start_' + orientation][i][0]
                    y = sy = color_coords['start_' + orientation][i][1]
                    ex = color_coords['end_' + orientation][i][0]
                    ey = color_coords['end_' + orientation][i][1]

                    coordinate = x, y
                    if coordinate in color_code_map['transparents']:
                        continue

                    if i < len(flag_color_palette):
                        if orientation == 'horizontal':
                            if sx == ex:
                                output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)
                            else:
                                for x in range(sx, ex):
                                    coordinate = x, y
                                    if coordinate in color_code_map['transparents']:
                                        continue
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)
                        elif orientation == 'vertical':
                            if sy == ey:
                                output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)
                            else:
                                for y in range(sy, ey):
                                    coordinate = x, y
                                    if coordinate in color_code_map['transparents']:
                                        continue
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)

                line_name = "{}_line".format(orientation)
                if not line_name in color_coords and 'line' in color_coords:
                    line_name = 'line'
                if 'line' in flag and line_name in color_coords:
                    line_flag_color = Color(flag['line'])
                    if ('start_' + orientation) in color_coords[line_name] and ('end_' + orientation) in color_coords[line_name]:
                        for i in range(len(color_coords[line_name]['start_' + orientation])):
                            x = sx = color_coords[line_name]['start_' + orientation][i][0]
                            y = sy = color_coords[line_name]['start_' + orientation][i][1]
                            ex = color_coords[line_name]['end_' + orientation][i][0]
                            ey = color_coords[line_name]['end_' + orientation][i][1]

                            coordinate = x, y
                            if coordinate in color_code_map['transparents']:
                                continue

                            if orientation == 'horizontal':
                                if sx == ex:
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                                else:
                                    for x in range(sx, ex):
                                        coordinate = x, y
                                        if coordinate in color_code_map['transparents']:
                                            continue
                                        output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                            elif orientation == 'vertical':
                                if sy == ey:
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                                else:
                                    for y in range(sy, ey):
                                        coordinate = x, y
                                        if coordinate in color_code_map['transparents']:
                                            continue
                                        output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                
                triangle_name = "{}_triangle".format(orientation)
                circle_name = "{}_circle".format(orientation)

                if 'triangle' in flag:
                    flags_fits = triangle_name in color_coords and len(color_coords[triangle_name]) > 0
                if 'circle' in flag:
                    flags_fits = circle_name in color_coords and len(color_coords[circle_name]) > 0

                if 'triangle' in flag and triangle_name in color_coords:
                    opp_extra_name = circle_name
                    opp_extra_in_flag = 'circle' in flag
                    
                    triangle_flag_colors = flag['triangle']
                    color_coords_triangle = color_coords[triangle_name]
                    color_coords_triangle_size = len(color_coords_triangle)
                    triangle_flag_colors_size = len(triangle_flag_colors) 

                    flags_fits_perfect = flags_fits_perfect and color_coords_triangle_size == triangle_flag_colors_size

                    if triangle_flag_colors_size == 1:
                        triangle_flag_color = Color(triangle_flag_colors[0])
                        for i in range(color_coords_triangle_size-1):
                            for color_coord in color_coords_triangle[i]:
                                find_opp_extra = False
                                if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                    for find_opp_color_coord in color_coords[opp_extra_name]:
                                        for opp_color_coord in find_opp_color_coord:
                                            find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                                if not find_opp_extra:
                                    x, y = color_coord
                                    if color_coord in color_code_map['transparents']:
                                        continue
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(triangle_flag_color.hex_l)
                    elif color_coords_triangle_size == triangle_flag_colors_size:
                        for i in range(color_coords_triangle_size):
                            for color_coord in color_coords_triangle[i]:
                                find_opp_extra = False
                                if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                    for find_opp_color_coord in color_coords[opp_extra_name]:
                                        for opp_color_coord in find_opp_color_coord:
                                            find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                                if not find_opp_extra:
                                    x, y = color_coord
                                    if color_coord in color_code_map['transparents']:
                                        continue
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(Color(triangle_flag_colors[i]).hex_l)
                    elif color_coords_triangle_size == 2 and triangle_flag_colors_size >= 2:
                        start_triangle_flag_color = Color(triangle_flag_colors[0])
                        end_triangle_flag_color = Color(triangle_flag_colors[-1])
                        for color_coord in color_coords_triangle[0]:
                            find_opp_extra = False
                            if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                for find_opp_color_coord in color_coords[opp_extra_name]:
                                    for opp_color_coord in find_opp_color_coord:
                                        find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                            if not find_opp_extra:
                                x, y = color_coord
                                if color_coord in color_code_map['transparents']:
                                    continue
                                output_flage_part_pixels[x ,y] = hex_to_rgb(start_triangle_flag_color.hex_l)
                        for color_coord in color_coords_triangle[-1]:
                            find_opp_extra = False
                            if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                for find_opp_color_coord in color_coords[opp_extra_name]:
                                    for opp_color_coord in find_opp_color_coord:
                                        find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                            if not find_opp_extra:
                                x, y = color_coord
                                if color_coord in color_code_map['transparents']:
                                    continue
                                output_flage_part_pixels[x ,y] = hex_to_rgb(end_triangle_flag_color.hex_l)
                    else:
                        start_triangle_flag_color = Color(triangle_flag_colors[0])
                        end_triangle_flag_color = Color(triangle_flag_colors[-1])
                        for color_coord in color_coords_triangle[0]:
                            find_opp_extra = False
                            if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                for find_opp_color_coord in color_coords[opp_extra_name]:
                                    for opp_color_coord in find_opp_color_coord:
                                        find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                            if not find_opp_extra:
                                x, y = color_coord
                                if color_coord in color_code_map['transparents']:
                                    continue
                                output_flage_part_pixels[x ,y] = hex_to_rgb(start_triangle_flag_color.hex_l)
                        for i in range(1, color_coords_triangle-1):
                            for color_coord in color_coords_triangle[i]:
                                find_opp_extra = False
                                if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                    for find_opp_color_coord in color_coords[opp_extra_name]:
                                        for opp_color_coord in find_opp_color_coord:
                                            find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                                if not find_opp_extra:
                                    x, y = color_coord
                                    if color_coord in color_code_map['transparents']:
                                        continue
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(start_triangle_flag_color.hex_l)
                        for color_coord in color_coords_triangle[-1]:
                            find_opp_extra = False
                            if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                for find_opp_color_coord in color_coords[opp_extra_name]:
                                    for opp_color_coord in find_opp_color_coord:
                                        find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                            if not find_opp_extra:
                                x, y = color_coord
                                if color_coord in color_code_map['transparents']:
                                    continue
                                output_flage_part_pixels[x ,y] = hex_to_rgb(end_triangle_flag_color.hex_l)
                if 'circle' in flag and circle_name in color_coords:
                    opp_extra_name = triangle_name
                    opp_extra_in_flag = 'triangle' in flag

                    circle_flag_color = Color(flag['circle'])
                    color_coords_circle = color_coords[circle_name]
                    color_coords_circle_size = len(color_coords_circle)

                    for i in range(color_coords_circle_size):
                        for color_coord in color_coords_circle[i]:
                            find_opp_extra = False
                            if opp_extra_in_flag and opp_extra_name and opp_extra_name in color_coords and len(color_coords[opp_extra_name]) > 0:
                                for find_opp_color_coord in color_coords[opp_extra_name]:
                                    for opp_color_coord in find_opp_color_coord:
                                        find_opp_extra = find_opp_extra or color_coord == opp_color_coord

                            if not find_opp_extra:
                                x, y = color_coord
                                if color_coord in color_code_map['transparents']:
                                    continue
                                output_flage_part_pixels[x ,y] = hex_to_rgb(circle_flag_color.hex_l)
        else:
            if key in output_map:
                output_map[key]['empty'] = True

        if key in output_map:
            output_map[key]['flags_fits'] = flags_fits
            output_map[key]['flags_fits_perfect'] = flags_fits_perfect

        output_flage_part.paste(paw_outlines_img, (0, 0), paw_outlines_img)

        if 'extra_outline' in color_code_map:
            for coord in color_code_map['extra_outline']:
                x, y = coord
                if coord in color_code_map['transparents']:
                    continue
                output_flage_part_pixels[x ,y] = hex_to_rgb(outline_color.hex_l)

        frame_width = output_flage_part.size[0]
        frame_height = output_flage_part.size[1]

        mask = None
        mask_filename = None
        for m in mask_output:
            if m['mask_key'] == mask_key:
                mask_filename = os.path.join('..', m['filename'])
                with open(mask_filename, 'rb') as f:
                    mask = Image.open(f)
                    mask.load()
                    mask_filename = m['filename']
        
        new_output_flage_part = Image.new(mode = "RGBA", size = (paw_width, paw_height))
        if mask:
            new_output_flage_part.paste(output_flage_part, (0, 0), mask)
        else:
            new_output_flage_part = output_flage_part
        

        output_flage_frames[key] = new_output_flage_part
        if mask_filename:
            output_map[key]['mask_filename'] = mask_filename
        if 'default' in flag:
            output_map[key]['default'] = flag['default']
        if 'mask' in flag:
            output_map[key]['mask'] = flag['mask']
        output_map[key]['rotated'] = False
        output_map[key]['trimmed'] = False
        output_map[key]['spriteSourceSize'] = { 'x': 0, 'y': 0, 'w': frame_width, 'h': frame_height }
        output_map[key]['sourceSize'] = { 'w': frame_width,'h': frame_height }
        
        frame_counter = frame_counter + 1

    return output_flage_frames
    
def generateSprite(in_img_filename, parts, category, form, colors_config, flags, transparent_colors, mask_output):
    output_name = category + '_' + form
    outline_color = Color(colors_config['outline']) if 'outline' in colors_config else None
    color_code_map = dict()

    paw_outlines_img = Image.new(mode = "RGBA", size= (0, 0))
    with Image.open(in_img_filename) as img:
        paw_outlines_img = getOutlineImage(img, outline_color)
        color_code_map = generateColorCodeMap(colors_config, parts, img, transparent_colors, outline_color)

    with open("output/{}_map.json".format(output_name), 'w') as f:
        json.dump(color_code_map, f, indent=4)

    output_map = dict()

    new_parts = parts
    if not 'whole' in new_parts:
        new_parts.append('whole')

    output_flages_map = dict()
    x = 0
    y = 0
    width = 0
    height = 0
    for flag in flags:
        x = 0
        frames_width = 0

        frame_width = 0
        frame_height = 0
        for key, value in generateSpriteLine(output_map, paw_outlines_img, outline_color, form, flag, new_parts, 'horizontal', color_code_map, mask_output).items():
            output_flages_map[key] = value
            frame_width = value.size[0]
            frame_height = value.size[1]

            if key in output_map:
                output_map[key]['frame'] = { 'x': x, 'y': y, 'w': frame_width, 'h': frame_height }

            x = x + frame_width
            frames_width = frames_width + frame_width
            width = max(width, frames_width)

        frame_width = 0
        frame_height = 0
        for key, value in generateSpriteLine(output_map, paw_outlines_img, outline_color, form, flag, new_parts, 'vertical', color_code_map, mask_output).items():
            output_flages_map[key] = value
            frame_width = value.size[0]
            frame_height = value.size[1]

            if key in output_map:
                output_map[key]['frame'] = { 'x': x, 'y': y, 'w': frame_width,'h': frame_height }
            
            x = x + frame_width
            frames_width = frames_width + frame_width
            width = max(width, frames_width)
        
        y = y + frame_height
        height = height + frame_height

    output_img = Image.new(mode="RGBA", size=(width, height))
    new_output_frames = dict()
    for name, img in output_flages_map.items():
        if name in output_map:
            if (not 'empty' in output_map[name] or ('empty' in output_map[name] and not output_map[name]['empty'])):
                dir_name = 'assets/img/sprites/{}'.format(output_name)
                sprite_filename = os.path.normpath(os.path.join(dir_name, "{}_{}.png".format(output_name, name))).replace("\\", "/")
                os.makedirs(os.path.join('..', dir_name), exist_ok=True)
                img.save(os.path.join('..', sprite_filename))

                output_map[name]['id'] = sprite_filename
                output_map[name]['filename'] = sprite_filename
                new_output_frames[sprite_filename] = output_map[name]

            if name in output_map and 'frame' in output_map[name]:
                output_img.paste(img, (output_map[name]['frame']['x'], output_map[name]['frame']['y']))
        else:
            print("{} not in output_map".format(name))

    output_sprite_filename = "{}.png".format(output_name)
    output_img.save(os.path.join('../assets/img/sprites', output_sprite_filename))
    new_output_map = { 'frames': new_output_frames, 'meta': { 'size': {'w': width, 'h': height}, 'image': output_sprite_filename, 'format': 'RGBA8888', 'scale': 1 } }

    sheet_filename = 'assets/img/sprites/{}.json'.format(output_name)
    output_json_filename = os.path.join('..', sheet_filename)
    with open(output_json_filename, 'w') as f:
        json.dump(new_output_map, f, indent=4)
        
    output_arr = []
    for name, data in output_map.items():
        data['category'] = category
        data['form'] = form
        data['sheet'] = sheet_filename
        if name in output_map and (not 'empty' in output_map[name] or ('empty' in output_map[name] and not output_map[name]['empty'])):
            output_arr.append(data)

    print("generateSprite: generate {} and {}".format(output_sprite_filename, sheet_filename))

    return output_arr


def generateCustomSpriteLine(output_map, paw_outlines_img, outline_color, flag, parts, orientation, color_code_map, extra_name):
    assert (orientation == "horizontal" or orientation == "vertical"), 'orientation must be "horizontal" or "vertical"'

    paw_width = paw_outlines_img.size[0]
    paw_height = paw_outlines_img.size[1]

    output_flage_frames = dict()
    frame_counter = 0
    for part in parts:
        output_flage_part = Image.new(mode = "RGBA", size = (paw_width, paw_height))
        output_flage_part_pixels = output_flage_part.load()

        flag_name = flag['name']

        key_name = flag_name.lower().replace(' ', '_').replace("'", '').replace('+', '').replace('-', '_').replace('/', '_').replace('\\', '_')
        extra_key = '_' + orientation + '_' + str(frame_counter) + '_' + extra_name
        key = key_name + extra_key
        if not key in output_map:
            output_map[key] = { 'flag_name': flag_name, 'part': part, 'orientation': orientation, extra_name+'_key': extra_key, 'mask_key': extra_key }

        if extra_name in color_code_map:
            for coord in color_code_map[extra_name]:
                x, y = coord
                if coord in color_code_map['transparents']:
                    continue
                output_flage_part_pixels[x ,y] = hex_to_rgb(outline_color.hex_l)

        frame_width = output_flage_part.size[0]
        frame_height = output_flage_part.size[1]
        
        new_output_flage_part = output_flage_part
        output_flage_frames[key] = new_output_flage_part
        output_map[key][extra_name] = True
        output_map[key]['mask'] = True
        output_map[key]['rotated'] = False
        output_map[key]['trimmed'] = False
        output_map[key]['spriteSourceSize'] = { 'x': 0, 'y': 0, 'w': frame_width, 'h': frame_height }
        output_map[key]['sourceSize'] = { 'w': frame_width,'h': frame_height }
        
        frame_counter = frame_counter + 1

    return output_flage_frames
    
def generateCustomSprite(in_img_filename, parts, category, form, colors_config, flags, transparent_colors, extra_name):
    output_name = category + '_' + form
    outline_color = Color('white')
    color_code_map = dict()

    paw_outlines_img = Image.new(mode = "RGBA", size= (0, 0))
    with Image.open(in_img_filename) as img:
        paw_outlines_img = getOutlineImage(img, outline_color)
        color_code_map = generateColorCodeMap(colors_config, parts, img, transparent_colors, outline_color)

    with open("output/{}_map.json".format(output_name), 'w') as f:
        json.dump(color_code_map, f, indent=4)

    output_map = dict()

    new_parts = parts
    if not 'whole' in new_parts:
        new_parts.append('whole')

    output_flages_map = dict()
    x = 0
    y = 0
    width = 0
    height = 0
    for flag in flags:
        x = 0
        frames_width = 0

        frame_width = 0
        frame_height = 0
        for key, value in generateCustomSpriteLine(output_map, paw_outlines_img, outline_color, flag, new_parts, 'horizontal', color_code_map, extra_name).items():
            output_flages_map[key] = value
            frame_width = value.size[0]
            frame_height = value.size[1]

            if key in output_map:
                output_map[key]['frame'] = { 'x': x, 'y': y, 'w': frame_width, 'h': frame_height }

            x = x + frame_width
            frames_width = frames_width + frame_width
            width = max(width, frames_width)

        frame_width = 0
        frame_height = 0
        for key, value in generateCustomSpriteLine(output_map, paw_outlines_img, outline_color, flag, new_parts, 'vertical', color_code_map, extra_name).items():
            output_flages_map[key] = value
            frame_width = value.size[0]
            frame_height = value.size[1]

            if key in output_map:
                output_map[key]['frame'] = { 'x': x, 'y': y, 'w': frame_width,'h': frame_height }
            
            x = x + frame_width
            frames_width = frames_width + frame_width
            width = max(width, frames_width)
        
        y = y + frame_height
        height = height + frame_height

    output_img = Image.new(mode="RGBA", size=(width, height))
    new_output_frames = dict()
    for name, img in output_flages_map.items():
        if name in output_map:
            if (not 'empty' in output_map[name] or ('empty' in output_map[name] and not output_map[name]['empty'])):
                dir_name = 'assets/img/sprites/{}'.format(output_name)
                sprite_filename = os.path.normpath(os.path.join(dir_name, "{}_{}.png".format(output_name, name))).replace("\\", "/")
                os.makedirs(os.path.join('..', dir_name), exist_ok=True)
                img.save(os.path.join('..', sprite_filename))

                output_map[name]['id'] = sprite_filename
                output_map[name]['filename'] = sprite_filename
                output_map[name]['mask_filename'] = sprite_filename
                new_output_frames[sprite_filename] = output_map[name]

            if name in output_map and 'frame' in output_map[name]:
                output_img.paste(img, (output_map[name]['frame']['x'], output_map[name]['frame']['y']))
        else:
            print("{} not in output_map".format(name))

    output_sprite_filename = "{}.png".format(output_name)
    output_img.save(os.path.join('../assets/img/sprites', output_sprite_filename))
    new_output_map = { 'frames': new_output_frames, 'meta': { 'size': {'w': width, 'h': height}, 'image': output_sprite_filename, 'format': 'RGBA8888', 'scale': 1 } }

    sheet_filename = 'assets/img/sprites/{}.json'.format(output_name)
    output_json_filename = os.path.join('..', sheet_filename)
    with open(output_json_filename, 'w') as f:
        json.dump(new_output_map, f, indent=4)
        
    output_arr = []
    for name, data in output_map.items():
        data['category'] = category
        data['form'] = form
        data['sheet'] = sheet_filename
        if name in output_map and (not 'empty' in output_map[name] or ('empty' in output_map[name] and not output_map[name]['empty'])):
            output_arr.append(data)

    print("generateSprite: generate {} and {}".format(output_sprite_filename, sheet_filename))

    return output_arr

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


    transparent_colors = []
    for transparent_color in config['transparent_colors']:
        transparent_colors.append(Color(transparent_color))

    forms = config['forms']
    categories = config['categories']

    mask_flag = dict()
    for flag in pride_flags:
        if 'mask' in flag and flag['mask']:
            mask_flag = flag
    mask_output = []
    for form in forms:
        if form in config:
            parts = config[form]['parts']
            mask_output.extend(generateSprite(config[form]['base_filename'], parts, 'mask', form, config[form], [mask_flag], transparent_colors, mask_output))
    
    output = []
    for form in forms:
        if form in config:
            parts = config[form]['parts']
            
            for category in categories:
                flags = []
                if category == 'pride':
                    flags = pride_flags
                elif category == 'sexual':
                    flags = sexual_flags
                elif category == 'gender':
                    flags = gender_flags
                elif category == 'relationship':
                    flags = relationship_flags
                elif category == 'romantic':
                    flags = romantic_flags
                elif category == 'sub_culture':
                    flags = sub_culture_flags
            
                output.extend(generateSprite(config[form]['base_filename'], parts, category, form, config[form], flags, transparent_colors, mask_output))
            
            if not 'whole' in config[form]['parts']:
                config[form]['parts'].append('whole')
    
    for form in forms:
        if form in config:
            parts = config[form]['parts']
            
            output.extend(generateCustomSprite(config[form]['base_filename'], parts, 'craws', form, config[form], [mask_flag], transparent_colors, 'craws'))
            output.extend(generateCustomSprite(config[form]['base_filename'], parts, 'outlines', form, config[form], [mask_flag], transparent_colors, 'outlines'))

    if not 'whole' in config[form]['parts']:
        config[form]['parts'].append('whole')

    with open(r'output/sprites.json', 'w') as file:
        json.dump(output, file, indent=4)

    with open(r'output/sprites.json', 'r') as json_file:
        with open(r'../_data/sprites.yml', 'w') as yaml_file:
            yaml.safe_dump(json.load(json_file), yaml_file, default_flow_style=False, allow_unicode=True)

    with open(r'../_data/flags_config.yml', 'w') as yaml_file:
        yaml.safe_dump(config, yaml_file, default_flow_style=False, allow_unicode=True)

if __name__ == "__main__":
    main()