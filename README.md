# Lapkit remote drawing app

This a a nodejs app to draw labkit labels in the browser. It synchronizes the labels in case multiple devices access the labeling page.


## Installation
- [install nodejs and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- open terminal and navigate to this directory
- run `npm install`

## Run
- open terminal and navigate to this directory
- run `node app.js`
- open http://YOURDEVICEIP:8080/ with your phone or tablet
	- replace `YOURDEVICEIP` with the IP of your device
- use your fingers to draw labels
- use the buttons to change between background and foreground
- one can use multiple devices, the labels will be synchronized (I hope)
- to clear all labels, press `clear all`

## Preparation
- the input image for the labkit segmentation has to be saved to `/public/img/segmentationinput.png`
- labkit needs to access / listen to file changes of `/public/img/labeling.png` and load the file as a labeling

## Restrictions
- 2D only
- fixed labels, background and foreground
- fixed stroke with
- no undo
- no partial clearing