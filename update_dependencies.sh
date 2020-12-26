#! /bin/sh

# install dep. for python ./scripts
#pip install -r requirements.txt


# A useful script to download the latest version of bootstrap and jquery

rm -rf node_modules package-lock.json
npm install

cp node_modules/jquery/dist/jquery.min.* assets/js

mkdir assets/js/bootstrap
mkdir assets/css/bootstrap
cp -r node_modules/bootstrap/scss/* _sass/bootstrap
cp node_modules/bootstrap/dist/js/bootstrap.bundle.min.* assets/js/bootstrap

cp node_modules/bootstrap-toggle/js/*.min.js assets/js/bootstrap
cp node_modules/bootstrap-toggle/css/*.min.css assets/css/bootstrap

mkdir assets/js/font-awesome
mkdir assets/css/font-awesome
mkdir assets/css/webfonts
cp node_modules/@fortawesome/fontawesome-free/js/*.min.js assets/js/font-awesome
cp node_modules/@fortawesome/fontawesome-free/css/*.min.css assets/css/font-awesome
cp node_modules/@fortawesome/fontawesome-free/webfonts/*.* assets/css/webfonts


## add more JAVASCRIPT dependencies here
mkdir assets/js/pixi
cp node_modules/pixi.js/dist/*.min.js assets/js/pixi
cp node_modules/pixi.js/dist/*.min.js.map assets/js/pixi