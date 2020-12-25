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

def scanImage(paw_img, parts_from_config, color_code_map, transparent_colors, outline_color, part, orientation):
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

                        if part == 'whole':
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
        color_code_map[part]['start_' + orientation].sort(key=lambda coord: coord[1])
    elif orientation == "vertical":
        color_code_map[part]['start_' + orientation].sort(key=lambda coord: coord[0])

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
                rgba = r, g ,b, a = paw_img.getpixel(coordinate)
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

def generateColorCodeMap(colors_config, parts, paw_img, transparent_colors, outline_color):
    parts_from_config = dict()
    color_code_map = dict()

    parts_from_config['whole'] = dict()
    parts_from_config['whole']['horizontal'] = []
    parts_from_config['whole']['vertical'] = []
    color_code_map['whole'] = { 'start_horizontal': [], 'start_vertical': [], 'end_horizontal': [], 'end_vertical': [] }
    for part in parts:
        parts_from_config[part] = dict()
        parts_from_config[part]['horizontal'] = colors_config[part]['horizontal']
        parts_from_config[part]['vertical'] = colors_config[part]['vertical']

        parts_from_config['whole']['horizontal'].extend(parts_from_config[part]['horizontal'])
        parts_from_config['whole']['vertical'].extend(parts_from_config[part]['vertical'])

        color_code_map[part] = { 'start_horizontal': [], 'start_vertical': [], 'end_horizontal': [], 'end_vertical': [] }

        scanImage(paw_img, parts_from_config, color_code_map, transparent_colors, outline_color, part, 'horizontal')
        scanImage(paw_img, parts_from_config, color_code_map, transparent_colors, outline_color, part, 'vertical')
    
    scanImage(paw_img, parts_from_config, color_code_map, transparent_colors, outline_color, 'whole', 'horizontal')
    scanImage(paw_img, parts_from_config, color_code_map, transparent_colors, outline_color, 'whole', 'vertical')

    color_code_map['center']['line'] = { 'start_horizontal': [], 'start_vertical': [], 'end_horizontal': [], 'end_vertical': [] }
    color_code_map['center']['triangle'] = []
    color_code_map['whole']['line'] = { 'start_horizontal': [], 'start_vertical': [], 'end_horizontal': [], 'end_vertical': [] }
    color_code_map['whole']['triangle'] = []
    color_code_map['craws'] = []
    color_code_map['extra_outline'] = []

    parts_from_config['line'] = colors_config['center']['line']
    color_code_map['line'] = { 'start_horizontal': [], 'start_vertical': [], 'end_horizontal': [], 'end_vertical': [] }
    scanImage(paw_img, parts_from_config, color_code_map, transparent_colors, outline_color, 'line', 'vertical')
    color_code_map['center']['line'] = color_code_map['line']
    color_code_map['whole']['line'] = color_code_map['line']
    del color_code_map['line'] 

    paw_width = paw_img.size[0]
    paw_height = paw_img.size[1]
    for y in range(paw_height):
        for x in range(paw_width):
            coordinate = x, y
            rgba = r, g ,b, a = paw_img.getpixel(coordinate)
            rgb = r, g, b
            px_color = Color(rgb_to_hex(rgb))
                    
            for i in range(len(colors_config['center']['triangle'])):
                part_color = colors_config['center']['triangle'][i]
                if i >= len(color_code_map['center']['triangle']):
                    color_code_map['center']['triangle'].append([])
                    color_code_map['whole']['triangle'].append([])
                if px_color == Color(part_color):
                    color_code_map['center']['triangle'][i].append(coordinate)
                    color_code_map['whole']['triangle'][i].append(coordinate)
                    
            if 'craws' in colors_config:
                for part_color in colors_config['craws']:
                    if px_color == Color(part_color):
                        color_code_map['craws'].append(coordinate)
                    
            if 'extra_outline' in colors_config:
                part_color = colors_config['extra_outline']
                if px_color == Color(part_color):
                    color_code_map['extra_outline'].append(coordinate)

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

            stripes_middle_center = stripes - stripes_start_part - stripes_end_part + 1
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
                    if orientation == 'horizontal':
                        stripes_start_part = stripes_start_part + add_rest_stripes
                    elif orientation == 'vertical':
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
                    if orientation == 'horizontal':
                        stripes_start_part = stripes_start_part + add_rest_stripes
                    elif orientation == 'vertical':
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
                pprint('genStripesParts: something went wrong, can elminate rest stripes')
            break
        loop_counter = loop_counter + 1

    return stripes_start_part, stripes_start_center, stripes_middle_center, stripes_end_center, stripes_end_part

def getFlagColorsPalette(flag_colors, stripes_start_part, stripes_start_center, stripes_middle_center, stripes_end_center, stripes_end_part):
    flag_colors_size = len(flag_colors)
    flag_color_palette = []
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

def generateSpriteLine(output_map, paw_outlines_img, outline_color, flag, orientation, color_code_map):
    assert (orientation == "horizontal" or orientation == "vertical"), 'orientation must be "horizontal" or "vertical"'

    paw_width = paw_outlines_img.size[0]
    paw_height = paw_outlines_img.size[1]

    output_flage_frames_map = dict()
    for part, color_coords in color_code_map.items():
        output_flage_part = Image.new(mode = "RGBA", size= (paw_width, paw_height))
        output_flage_part_pixels = output_flage_part.load()

        key = orientation + '_' + part

        if 'start_' + orientation in color_coords and 'end_' + orientation in color_coords:
            stripes = len(color_coords['start_' + orientation])
            flag_colors_size = len(flag['colors'])
            flag_name = flag['name']

            if not flag_name in output_map:
                output_map[flag_name] = {}
            if not key in output_map[flag_name]:
                output_map[flag_name][key] = { 'flag_name': flag_name, 'part': part, 'orientation': orientation }

            flag_color_palette = []

            small_start = False
            small_end = False
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
                output_map[flag_name][key]['flags_fits'] = True
                for i in range(stripes):
                    flag_color_palette.append(Color(flag['colors'][0]))
            elif stripes == flag_colors_size:
                output_map[flag_name][key]['flags_fits'] = True
                output_map[flag_name][key]['flags_fits_perfect'] = True
                for flag_color in flag['colors']:
                    flag_color_palette.append(Color(flag_color))
            elif stripes > flag_colors_size:
                output_map[flag_name][key]['flags_fits'] = True
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
                    flag_color_palette = getFlagColorsPalette(flag['colors'], stripes_start_part, stripes_start_center, stripes_middle_center, stripes_end_center, stripes_end_part)
            else:
                output_map[flag_name][key]['flags_fits'] = False
                flag_color_palette = getFlagColorPaletteStriped(flag['colors'], stripes, orientation)

            if len(flag_color_palette) < stripes:
                pprint(flag['colors'])
                pprint(flag_color_palette)
                print('generateSpriteLine: flag_color_palette size < stripes: {} < {}'.format(len(flag_color_palette), stripes))

            for i in range(stripes):
                x = sx = color_coords['start_' + orientation][i][0]
                y = sy = color_coords['start_' + orientation][i][1]
                ex = color_coords['end_' + orientation][i][0]
                ey = color_coords['end_' + orientation][i][1]
                #line_width = ex - sx - 2
                #line_height = ey - sy - 2

                if i < len(flag_color_palette):
                    if orientation == 'horizontal':
                        if sx == ex:
                            output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)
                        else:
                            for x in range(sx, ex):
                                output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)
                    elif orientation == 'vertical':
                        if sy == ey:
                            output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)
                        else:
                            for y in range(sy, ey):
                                output_flage_part_pixels[x ,y] = hex_to_rgb(flag_color_palette[i].hex_l)

            if orientation == 'vertical':
                if part == 'center' or part == 'whole':
                    if 'line' in flag and 'line' in color_coords:
                        line_flag_color = Color(flag['line'])
                        for i in range(len(color_coords['line']['start_' + orientation])):
                            if 'line' in color_coords:
                                x = sx = color_coords['line']['start_' + orientation][i][0]
                                y = sy = color_coords['line']['start_' + orientation][i][1]
                                ex = color_coords['line']['end_' + orientation][i][0]
                                ey = color_coords['line']['end_' + orientation][i][1]
                                #line_width = ex - sx - 2
                                #line_height = ey - sy - 2

                                if orientation == 'horizontal':
                                    if sx == ex:
                                        output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                                    else:
                                        for x in range(sx, ex):
                                            output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                                elif orientation == 'vertical':
                                    if sy == ey:
                                        output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                                    else:
                                        for y in range(sy, ey):
                                            output_flage_part_pixels[x ,y] = hex_to_rgb(line_flag_color.hex_l)
                        
                    if 'triangle' in flag and 'triangle' in color_coords:
                        triangle_flag_colors = flag['triangle']

                        if len(triangle_flag_colors) == 1:
                            triangle_flag_color = Color(triangle_flag_colors[0])
                            for i in range(len(color_coords['triangle'])-1):
                                for color_cooord in color_coords['triangle'][i]:
                                    x, y = color_cooord
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(triangle_flag_color.hex_l)
                        elif color_coords == 2 and len(triangle_flag_colors) >= 2:
                            start_triangle_flag_color = Color(triangle_flag_colors[0])
                            end_triangle_flag_color = Color(triangle_flag_colors[1])
                            for color_cooord in color_coords['triangle'][0]:
                                x, y = color_cooord
                                output_flage_part_pixels[x ,y] = hex_to_rgb(start_triangle_flag_color.hex_l)
                            for color_cooord in color_coords['triangle'][-1]:
                                x, y = color_cooord
                                output_flage_part_pixels[x ,y] = hex_to_rgb(end_triangle_flag_color.hex_l)
                        else:
                            start_triangle_flag_color = Color(triangle_flag_colors[0])
                            end_triangle_flag_color = Color(triangle_flag_colors[-1])
                            for color_cooord in color_coords['triangle'][0]:
                                x, y = color_cooord
                                output_flage_part_pixels[x ,y] = hex_to_rgb(start_triangle_flag_color.hex_l)
                            for i in range(1, len(color_coords['triangle'])-1):
                                for color_cooord in color_coords['triangle'][i]:
                                    x, y = color_cooord
                                    output_flage_part_pixels[x ,y] = hex_to_rgb(start_triangle_flag_color.hex_l)
                            for color_cooord in color_coords['triangle'][-1]:
                                x, y = color_cooord
                                output_flage_part_pixels[x ,y] = hex_to_rgb(end_triangle_flag_color.hex_l)

            output_flage_part.paste(paw_outlines_img, (0, 0), paw_outlines_img)

            if 'extra_outline' in color_code_map:
                for coord in color_code_map['extra_outline']:
                    x, y = coord
                    output_flage_part_pixels[x ,y] = hex_to_rgb(outline_color.hex_l)

            output_flage_frames_map[key] = output_flage_part

    return output_flage_frames_map
        
def generatePaws(in_img_filename, parts, output_name, colors_config, flags, transparent_colors, outline_color):
    color_code_map = dict()

    paw_outlines_img = Image.new(mode = "RGBA", size= (0, 0))
    with Image.open(in_img_filename) as paw_img:
        paw_outlines_img = getOutlineImage(paw_img, outline_color)
        color_code_map = generateColorCodeMap(colors_config, parts, paw_img, transparent_colors, outline_color)

    with open('color_code_map.json', 'w') as f:
        json.dump(color_code_map, f, indent=4)

    output_map = dict()

    output_flages_map = dict()
    frames_line_count = 0
    for flag in flags:
        output_flage_frames = dict()
        for key, value in generateSpriteLine(output_map, paw_outlines_img, outline_color, flag, 'vertical', color_code_map).items():
            output_flage_frames[key] = value
        for key, value in generateSpriteLine(output_map, paw_outlines_img, outline_color, flag, 'horizontal', color_code_map).items():
            output_flage_frames[key] = value
        frames_line_count = len(output_flage_frames)
        output_flages_map[flag['name']] = output_flage_frames


    paw_width = paw_outlines_img.size[0]
    paw_height = paw_outlines_img.size[1]
    output = Image.new(mode = "RGBA", size=(paw_width * frames_line_count, paw_height * len(output_flages_map.values())))
    y = 0
    x = 0
    for flag_name, output_flages in output_flages_map.items():
        x = 0
        if not flag_name in output_map:
            output_map[flag_name] = dict()
        for part, output_flage in output_flages.items():
            output.paste(output_flage, (x, y))
            if not part in output_map[flag_name]:
                output_map[flag_name][part] = { 'flag_name': flag_name, 'part': part }
            output_map[flag_name][part]['coord'] = (x, y, paw_width, paw_height)
            x += paw_width
        y += paw_height

    output_map_filename = '{}_map.json'.format(output_name)
    with open(output_map_filename, 'w') as f:
        json.dump(output_map, f, indent=4)
    with open(output_map_filename, 'r') as json_file:
        with open("../_data/{}.yml".format(output_name), 'w') as yaml_file:
            yaml.safe_dump(json.load(json_file), yaml_file, default_flow_style=False, allow_unicode=True)

    #output.show()
    output.save("../assets/img/{}.png".format(output_name)) 

def main():
    config = dict()
    pride_flags = dict()
    gender_flags = dict()
    with open('config.yaml') as f:
        config = yaml.load(f, Loader=yaml.FullLoader)
    with open('pride_flags.yaml') as f:
        pride_flags = yaml.load(f, Loader=yaml.FullLoader)
    with open('gender_flags.yaml') as f:
        gender_flags = yaml.load(f, Loader=yaml.FullLoader)


    transparent_colors = []
    for transparent_color in config['transparent_colors']:
        transparent_colors.append(Color(transparent_color))
    outline_color = Color(config['paw_colors']['outline'])

    parts = [
        'left_part_1',
        'left_part_2',
        'right_part_1',
        'right_part_2',
        'center'
    ]

    generatePaws('./paw.png', parts, 'pride_paws', config['paw_colors'], pride_flags, transparent_colors, outline_color)
    generatePaws('./paw.png', parts, 'gender_paws', config['paw_colors'], gender_flags, transparent_colors, outline_color)


if __name__ == "__main__":
    main()