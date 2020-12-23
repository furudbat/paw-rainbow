#! /usr/bin/python

import os, sys
import json
from pprint import pprint
import re
import yaml
from PIL import Image
from colour import Color


def main():
    with open('config.yaml') as f:
        data = yaml.load(f, Loader=yaml.FullLoader)
    
    in_filename = './paw.png'
    with Image.open(in_filename) as im:


if __name__ == "__main__":
    main()