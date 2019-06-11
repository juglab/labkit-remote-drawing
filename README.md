# Labkit remote drawing app

This a a nodejs app to draw labkit labels in the browser. It synchronizes the labels in case multiple devices access the labeling page.


## Installation
- [install nodejs and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- open terminal and navigate to this directory
- run `npm install`

## Adjust URL
- in order to run it on a mobile device, you either need to run this on a server or use the IP of your computer in a local network (`ifconfig`)
- replace `localhost` with your IP / URL in `public/js/script.js`, line 2:
```
var url = 'http://localhost:8080/';
```

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
