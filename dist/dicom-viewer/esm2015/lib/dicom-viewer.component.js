import { Component, ViewChild, Input, ViewChildren } from '@angular/core';
import { CornerstoneDirective } from './cornerstone.directive';
import { ThumbnailDirective } from './thumbnail.directive';
export class DICOMViewerComponent {
    constructor() {
        this.enableViewerTools = false; // enable viewer tools
        this.enablePlayTools = false; // enable Play Clip tools
        this.downloadImagesURL = ''; // download images URL
        this.maxImagesToLoad = 20; // limit for the automatic loading of study images
        this.seriesList = []; // list of series on the images being displayed
        this.currentSeriesIndex = 0;
        this.currentSeries = {};
        this.imageCount = 0; // total image count being viewed
        // control exhibition of a loading images progress indicator
        this.loadingImages = false;
        this.loadedImages = [];
        this.imageIdList = [];
        this.targetImageCount = 0;
    }
    // control enable/disable image scroll buttons
    get hidePreviousImage() { return { color: (this.viewPort.currentIndex < 1) ? 'black' : 'white' }; }
    get hideNextImage() { return { color: (this.viewPort.currentIndex >= (this.imageCount - 1)) ? 'black' : 'white' }; }
    // control message for more images to load
    get moreImagestoLoad() {
        if (this.loadedImages.length < this.imageIdList.length && !this.loadingImages) { // are there any more images to load?
            const imagesToLoad = (this.maxImagesToLoad <= 0) ? (this.imageIdList.length - this.loadedImages.length) : Math.min(this.maxImagesToLoad, this.imageIdList.length - this.loadedImages.length);
            return imagesToLoad.toString();
        }
        else
            return '';
    }
    get showProgress() { return { display: (this.loadingImages) ? 'inline-block' : 'none' }; }
    ;
    ngOnInit() {
        this.element = this.viewPort.element;
    }
    /**
     * Load dicom images for display
     *
     * @param imageIdList list of imageIds to load and display
     */
    loadStudyImages(imageIdList) {
        this.element = this.viewPort.element;
        this.imageIdList = imageIdList;
        this.viewPort.resetViewer();
        this.viewPort.resetImageCache(); // clean up image cache
        this.seriesList = []; // start a new series list
        this.currentSeriesIndex = 0; // always display first series
        this.loadedImages = []; // reset list of images already loaded
        //
        // loop thru all imageIds, load and cache them for exhibition (up the the maximum limit defined)
        //
        const maxImages = (this.maxImagesToLoad <= 0) ? imageIdList.length : Math.min(this.maxImagesToLoad, imageIdList.length);
        this.loadingImages = true; // activate progress indicator
        this.targetImageCount = maxImages;
        for (let index = 0; index < maxImages; index++) {
            const imageId = imageIdList[index];
            cornerstone.loadAndCacheImage(imageId).then(imageData => { this.imageLoaded(imageData); });
        }
    }
    /**
     * Load the next batch of images
     */
    loadMoreImages() {
        this.element = this.viewPort.element;
        //
        // loop thru all imageIds, load and cache them for exhibition (up the the maximum limit defined)
        //
        const maxImages = (this.maxImagesToLoad <= 0) ? (this.imageIdList.length - this.loadedImages.length) : Math.min(this.maxImagesToLoad, this.imageIdList.length - this.loadedImages.length);
        this.loadingImages = true; // activate progress indicator
        this.targetImageCount += maxImages;
        let nextImageIndex = this.loadedImages.length;
        for (let index = 0; index < maxImages; index++) {
            const imageId = this.imageIdList[nextImageIndex++];
            cornerstone.loadAndCacheImage(imageId)
                .then(imageData => { this.imageLoaded(imageData); })
                .catch(err => { this.targetImageCount--; });
        }
    }
    /**
     *
     * @param imageData the dicom image data
     */
    imageLoaded(imageData) {
        //console.log(imageData.imageId)
        // build list of series in all loadded images
        const series = {
            studyID: imageData.data.string('x0020000d'),
            seriesID: imageData.data.string('x0020000e'),
            seriesNumber: imageData.data.intString('x00200011'),
            studyDescription: imageData.data.string('x00081030'),
            seriesDescription: imageData.data.string('x0008103e'),
            imageCount: 1,
            imageList: [imageData]
        };
        // if this is a new series, add it to the list
        let seriesIndex = this.seriesList.findIndex(item => item.seriesID === series.seriesID);
        if (seriesIndex < 0) {
            seriesIndex = this.seriesList.length;
            this.seriesList.push(series);
            this.seriesList.sort((a, b) => {
                if (a.seriesNumber > b.seriesNumber)
                    return 1;
                if (a.seriesNumber < b.seriesNumber)
                    return -1;
                return 0;
            });
        }
        else {
            let seriesItem = this.seriesList[seriesIndex];
            seriesItem.imageCount++;
            seriesItem.imageList.push(imageData);
            seriesItem.imageList.sort((a, b) => {
                if (a.data.intString('x00200013') > b.data.intString('x00200013'))
                    return 1;
                if (a.data.intString('x00200013') < b.data.intString('x00200013'))
                    return -1;
                return 0;
            });
        }
        this.loadedImages.push(imageData); // save to images loaded
        if (seriesIndex === this.currentSeriesIndex) {
            //this.currentSeries = this.seriesList[seriesIndex];
            //this.imageCount = this.currentSeries.imageCount; // get total image count
            //this.viewPort.addImageData(imageData);
            this.showSeries(this.currentSeriesIndex);
        }
        if (this.loadedImages.length >= this.targetImageCount) { // did we finish loading images?
            this.loadingImages = false; // deactivate progress indicator
        }
    }
    showSeries(index) {
        //        this.resetAllTools();
        this.currentSeriesIndex = index;
        this.currentSeries = this.seriesList[index];
        this.imageCount = this.currentSeries.imageCount; // get total image count
        this.viewPort.resetImageCache(); // clean up image cache
        //        this.loadingImages = true; // activate progress indicator
        for (let i = 0; i < this.currentSeries.imageList.length; i++) {
            const imageData = this.currentSeries.imageList[i];
            this.viewPort.addImageData(imageData);
        }
        //        this.loadingImages = false; // de-activate progress indicator
    }
    saveAs() {
        cornerstoneTools.saveAs(this.element, "teste.jpg");
    }
    /**
     * Image scroll methods
     */
    nextImage() {
        if (this.viewPort.currentIndex < this.imageCount) {
            this.viewPort.nextImage();
        }
    }
    previousImage() {
        if (this.viewPort.currentIndex > 0) {
            this.viewPort.previousImage();
        }
    }
    /**
     * Methods to activate/deactivate viewer tools
     */
    // deactivate all tools
    resetAllTools() {
        if (this.imageCount > 0) {
            this.viewPort.resetAllTools();
            this.stopClip();
        }
    }
    // activate windowing
    enableWindowing() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.wwwc.activate(this.element, 1);
            // cornerstoneTools.wwwcTouchDrag.activate(this.element);
            cornerstoneTools.setToolActiveForElement(this.element, 'Wwwc', { mouseButtonMask: 1 }, ['Mouse']);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 2 }, ['Mouse']); // pan right mouse
        }
    }
    // activate zoom
    enableZoom() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.zoom.activate(this.element, 5); // 5 is right mouse button and left mouse button
            // cornerstoneTools.zoomTouchDrag.activate(this.element);
            cornerstoneTools.setToolActiveForElement(this.element, 'Zoom', { mouseButtonMask: 1 }, ['Mouse']); // zoom left mouse
            // cornerstoneTools.setToolActiveForElement(this.element, 'ZoomTouchPinch', { }, ['Mouse']);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 2 }, ['Mouse']); // pan right mouse
        }
    }
    // activate pan
    enablePan() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.pan.activate(this.element, 3); // 3 is middle mouse button and left mouse button
            // cornerstoneTools.panTouchDrag.activate(this.element);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 1 }, ['Mouse']);
        }
    }
    // activate image scroll
    enableScroll() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.stackScroll.activate(this.element, 1);
            // cornerstoneTools.stackScrollTouchDrag.activate(this.element);
            // cornerstoneTools.stackScrollKeyboard.activate(this.element);
            cornerstoneTools.setToolActiveForElement(this.element, 'StackScroll', { mouseButtonMask: 1 }, ['Mouse']);
        }
    }
    // activate length measurement
    enableLength() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.length.activate(this.element, 1);
            cornerstoneTools.setToolActiveForElement(this.element, 'Length', { mouseButtonMask: 1 }, ['Mouse']);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 2 }, ['Mouse']); // pan right mouse
        }
    }
    // activate angle measurement
    enableAngle() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.simpleAngle.activate(this.element, 1);
            cornerstoneTools.setToolActiveForElement(this.element, 'Angle', { mouseButtonMask: 1 }, ['Mouse']);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 2 }, ['Mouse']); // pan right mouse
        }
    }
    // activate pixel probe
    enableProbe() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.probe.activate(this.element, 1);
            cornerstoneTools.setToolActiveForElement(this.element, 'Probe', { mouseButtonMask: 1 }, ['Mouse']);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 2 }, ['Mouse']); // pan right mouse
        }
    }
    // activate Elliptical ROI
    enableElliptical() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.ellipticalRoi.activate(this.element, 1);
            cornerstoneTools.setToolActiveForElement(this.element, 'EllipticalRoi', { mouseButtonMask: 1 }, ['Mouse']);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 2 }, ['Mouse']); // pan right mouse
        }
    }
    // activate Rectangle ROI
    enableRectangle() {
        if (this.imageCount > 0) {
            this.resetAllTools();
            // cornerstoneTools.rectangleRoi.activate(this.element, 1);
            cornerstoneTools.setToolActiveForElement(this.element, 'RectangleRoi', { mouseButtonMask: 1 }, ['Mouse']);
            cornerstoneTools.setToolActiveForElement(this.element, 'Pan', { mouseButtonMask: 2 }, ['Mouse']); // pan right mouse
        }
    }
    // Play Clip
    playClip() {
        if (this.imageCount > 0) {
            let frameRate = 10;
            let stackState = cornerstoneTools.getToolState(this.element, 'stack');
            if (stackState) {
                frameRate = stackState.data[0].frameRate;
                // Play at a default 10 FPS if the framerate is not specified
                if (frameRate === undefined || frameRate === null || frameRate === 0) {
                    frameRate = 10;
                }
            }
            cornerstoneTools.playClip(this.element, frameRate);
        }
    }
    // Stop Clip
    stopClip() {
        cornerstoneTools.stopClip(this.element);
    }
    // invert image
    invertImage() {
        if (this.imageCount > 0) {
            let viewport = cornerstone.getViewport(this.element);
            // Toggle invert
            if (viewport.invert === true) {
                viewport.invert = false;
            }
            else {
                viewport.invert = true;
            }
            cornerstone.setViewport(this.element, viewport);
        }
    }
    // reset image
    resetImage() {
        if (this.imageCount > 0) {
            let toolStateManager = cornerstoneTools.getElementToolStateManager(this.element);
            // Note that this only works on ImageId-specific tool state managers (for now)
            //toolStateManager.clear(this.element);
            cornerstoneTools.clearToolState(this.element, "Length");
            cornerstoneTools.clearToolState(this.element, "Angle");
            // cornerstoneTools.clearToolState(this.element, "simpleAngle");
            cornerstoneTools.clearToolState(this.element, "Probe");
            cornerstoneTools.clearToolState(this.element, "EllipticalRoi");
            cornerstoneTools.clearToolState(this.element, "RectangleRoi");
            cornerstone.updateImage(this.element);
            this.resetAllTools();
        }
    }
    clearImage() {
        this.viewPort.resetViewer();
        this.viewPort.resetImageCache();
        this.seriesList = []; // list of series on the images being displayed
        this.currentSeriesIndex = 0;
        this.currentSeries = {};
        this.imageCount = 0; // total image count being viewed
    }
}
DICOMViewerComponent.decorators = [
    { type: Component, args: [{
                selector: 'dicom-viewer',
                template: "<div style=\"display: flex; width:100%; height: 100%;\">\n    <div class=\"thumbnailSelector\" *ngIf=\"seriesList.length > -1\" style=\"margin-right: 1px;\">\n        <div class=\"thumbnails list-group\" style=\"height: 100%;\">\n            <a *ngFor=\"let series of seriesList; let i=index\" [ngClass]=\"{'active': currentSeriesIndex === i}\" class=\"list-group-item\"\n                oncontextmenu=\"return false\" unselectable=\"on\" onselectstart=\"return false;\" onmousedown=\"return false;\"\n                (click)=\"showSeries(i)\">\n                <div thumbnail [imageData]=\"series.imageList[0]\" class=\"csthumbnail\" oncontextmenu=\"return false\"\n                    unselectable=\"on\" onselectstart=\"return false;\" onmousedown=\"return false;\">\n                </div>\n                <div class=\"text-center small\" style=\"color:white;\">{{series.seriesDescription}}</div>\n                <div id=\"mrtopright\" style=\"position: absolute;top:3px; right:3px\">\n                    <div id=\"imageCount\" style=\"color: #838383; font-size: 14pt\">{{series.imageCount}}</div>\n                </div>\n            </a>\n        </div>\n    </div>\n\n    <!--container where image will be loaded-->\n    <div style=\"overflow: hidden; width: 100%; height: 100%; background-color: #252525;\">\n\n        <!-- Toolbar -->\n        <div>\n            <div class=\"btn-group\">\n                <div class=\"btn-group\" *ngIf=\"enableViewerTools\">\n                    <!-- Pan -->\n                    <button type=\"button\" (click)=\"enablePan()\" class=\"btn btn-sm btn-default\" data-container='body' data-toggle=\"tooltip\"\n                      data-placement=\"bottom\" title=\"Pan\"><span class=\"fa fa-arrows-alt\"></span></button>\n                    <!-- Zoom -->\n                    <button type=\"button\" (click)=\"enableZoom()\" class=\"btn btn-sm btn-default\" data-container='body'\n                      data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Zoom\"><span class=\"fa fa-search\"></span></button>\n                    <!-- WW/WL -->\n                    <button type=\"button\" (click)=\"enableWindowing()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Windowing\"><span class=\"fa fa-sun\"></span></button>\n                    <!-- Invert -->\n                    <button type=\"button\" (click)=\"invertImage()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Invert\"><span class=\"fa fa-adjust\"></span></button>\n                    <button type=\"button\" (click)=\"enableRectangle()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Rectangle ROI\"><span class=\"far fa-square\"></span></button>\n                    <!-- Length measurement -->\n                    <button type=\"button\" (click)=\"enableLength()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Length\"><span class=\"fas fa-ruler-horizontal\"></span></button>\n                    <!-- Reset Image -->\n                    <button type=\"button\" (click)=\"resetImage()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Reset Image\"><span class=\"fas fa-undo\"></span></button>\n                    <!-- Stack scroll -->\n                    <!-- <button type=\"button\" (click)=\"enableScroll()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Scroll\"><span class=\"fa fa-bars\"></span></button> -->\n                    <!-- Angle measurement -->\n                    <!-- <button type=\"button\" (click)=\"enableAngle()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Angle\"><span class=\"fa fa-angle-left\"></span></button> -->\n                    <!-- Pixel probe -->\n                    <!-- <button type=\"button\" (click)=\"enableProbe()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Pixel Probe\"><span class=\"fa fa-dot-circle\"></span></button> -->\n                    <!-- Elliptical ROI -->\n                    <!-- <button type=\"button\" (click)=\"enableElliptical()\" class=\"btn btn-sm btn-default\" data-container='body'\n                        data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Elliptical ROI\"><span class=\"fa fa-circle\"></span></button> -->\n                    <!-- Rectangle ROI -->\n                </div>\n                <div class=\"btn-group\">\n                    <!-- Download -->\n                    <a *ngIf=\"downloadImagesURL != ''\" [href]=\"downloadImagesURL\" download style=\"border-left: 1px dotted white;\"\n                        class=\"btn btn-sm btn-default\" data-container='body' data-toggle=\"tooltip\" data-placement=\"bottom\"\n                        title=\"Download Imagens\">\n                        <span class=\"fa fa-download\"></span>\n                    </a>\n                    <!-- Imagem Anterior -->\n                    <!-- <button type=\"button\" (click)=\"previousImage()\" [ngStyle]=\"hidePreviousImage\" style=\"border-left: 1px dotted white;\"\n                        class=\"btn btn-sm btn-default\" data-container='body' data-toggle=\"tooltip\" data-placement=\"bottom\"\n                        title=\"Imagem Anterior\"><span class=\"fa fa-backward\"></span></button> -->\n                    <!-- Pr\u00F3xima Imagem -->\n                    <!-- <button type=\"button\" (click)=\"nextImage()\" [ngStyle]=\"hideNextImage\" class=\"btn btn-sm btn-default\"\n                        data-container='body' data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Pr\u00F3xima Imagem\"><span\n                            class=\"fa fa-forward\"></span></button> -->\n                    <!-- Load Next Batch -->\n                    <a type=\"button\" *ngIf=\"moreImagestoLoad != ''\" (click)=\"loadMoreImages()\" style=\"border-left: 1px dotted white;color: white;white-space: nowrap;\"\n                        class=\"btn btn-sm btn-default\" data-container='body' data-toggle=\"tooltip\" data-placement=\"bottom\"\n                        title=\"Carrega mais imagens...\"><i class=\"fas fa-cloud-download-alt\"></i> clique aqui para trazer as pr\u00F3ximas {{moreImagestoLoad}} imagens\n                    </a>\n                    <!-- Progress Spinner -->\n                    <div style=\"padding-left: 15px; padding-top: 15px;\" [ngStyle]=\"showProgress\">\n                        <mat-spinner style=\"display: inline-block;\" diameter=\"30\" strokeWidth=\"5\" color=\"warn\"></mat-spinner>\n                    </div>\n                    \n                </div>\n            </div>\n        </div>\n        <div style=\"width: 100%; height: calc(100% - 60px); position:relative; display:inline-block; color:white;\"\n            oncontextmenu=\"return false\" class='cornerstone-enabled-image' unselectable='on' onselectstart='return false;'\n            onmousedown='return false;'>\n            <div cornerstone style=\"width: 100%; height: 100%; top:0px; left:0px; position:absolute; outline:none; margin: 0 auto;\"\n                id=\"dicomImage\">\n            </div>\n            <div id=\"mrtopright\" style=\"position:absolute; right:3px; top:3x;\">\n                <div *ngIf=\"viewPort.patientName != ''\">\n                    <b>Patient:</b> {{viewPort.patientName}}\n                </div>\n                <div *ngIf=\"viewPort.instanceNumber != ''\">\n                    <b>Instance:</b> {{viewPort.instanceNumber}}\n                </div>\n            </div>\n            <div id=\"mrbottomleft\" style=\"position:absolute; bottom:3px; left:3px\">\n                <div>\n                    <b>WW/WC:</b> {{viewPort.windowingValue}}\n                </div>\n                <div id=\"zoomText\"><b>Zoom:</b> {{viewPort.zoomValue}}</div>\n            </div>\n            <div id=\"mrbottomright\" style=\"position:absolute; bottom:6px; right:3px\">\n                <div id=\"sliceText\"><b>Image:</b> {{(imageCount > 0)?viewPort.currentIndex+1:0}}/{{imageCount}}</div>\n            </div>\n        </div>\n\n    </div>\n\n</div>\n",
                styles: [".btn-default{color:#fff;background-color:#424242;border-color:#424242;font-size:24pt;background-image:none;text-shadow:none}.thumbnailSelector{width:10%;float:left;margin-left:0;height:100%;background-color:#2e2e2e}.thumbnails{margin:3px 2px 0;overflow-y:scroll;overflow-x:hidden}.csthumbnail{color:#fff;background-color:#000;width:100px;height:100px;border:0;padding:0}.version{position:absolute;bottom:20px;width:106px;text-align:center}a.list-group-item{background-color:#000;padding:2px;border:1px solid #838383;margin-bottom:6px;margin-left:0}a.list-group-item.active,a.list-group-item.active:focus,a.list-group-item.active:hover{background-color:#4d4d4d;border-color:#d32251}"]
            },] }
];
DICOMViewerComponent.ctorParameters = () => [];
DICOMViewerComponent.propDecorators = {
    enableViewerTools: [{ type: Input }],
    enablePlayTools: [{ type: Input }],
    downloadImagesURL: [{ type: Input }],
    maxImagesToLoad: [{ type: Input }],
    viewPort: [{ type: ViewChild, args: [CornerstoneDirective, { static: true },] }],
    thumbnails: [{ type: ViewChildren, args: [ThumbnailDirective,] }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGljb20tdmlld2VyLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2RpY29tLXZpZXdlci9zcmMvbGliL2RpY29tLXZpZXdlci5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQVUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQVczRCxNQUFNLE9BQU8sb0JBQW9CO0lBb0MvQjtRQWxDZ0Isc0JBQWlCLEdBQUcsS0FBSyxDQUFDLENBQUMsc0JBQXNCO1FBQ2pELG9CQUFlLEdBQUcsS0FBSyxDQUFDLENBQUMseUJBQXlCO1FBQ2xELHNCQUFpQixHQUFHLEVBQUUsQ0FBQSxDQUFDLHNCQUFzQjtRQUM3QyxvQkFBZSxHQUFHLEVBQUUsQ0FBQyxDQUFDLGtEQUFrRDtRQUVqRixlQUFVLEdBQUcsRUFBRSxDQUFDLENBQUMsK0NBQStDO1FBQ2hFLHVCQUFrQixHQUFHLENBQUMsQ0FBQztRQUN2QixrQkFBYSxHQUFRLEVBQUUsQ0FBQztRQUN4QixlQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUNBQWlDO1FBY3hELDREQUE0RDtRQUNyRCxrQkFBYSxHQUFHLEtBQUssQ0FBQztRQU1yQixpQkFBWSxHQUFHLEVBQUUsQ0FBQztRQUNsQixnQkFBVyxHQUFHLEVBQUUsQ0FBQztRQUVqQixxQkFBZ0IsR0FBRyxDQUFDLENBQUM7SUFFYixDQUFDO0lBeEJqQiw4Q0FBOEM7SUFDOUMsSUFBVyxpQkFBaUIsS0FBVSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9B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QWdCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDOUQsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1NBQ3RCO0lBQ0gsQ0FBQztJQUVNLFVBQVU7UUFDZixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsQ0FBQywrQ0FBK0M7UUFDckUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQztJQUV4RCxDQUFDOzs7WUEzVkYsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxjQUFjO2dCQUN4Qix1OVFBQTRDOzthQUU3Qzs7OztnQ0FHRSxLQUFLOzhCQUNMLEtBQUs7Z0NBQ0wsS0FBSzs4QkFDTCxLQUFLO3VCQXVCTCxTQUFTLFNBQUMsb0JBQW9CLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO3lCQUNoRCxZQUFZLFNBQUMsa0JBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBWaWV3Q2hpbGQsIE9uSW5pdCwgSW5wdXQsIFZpZXdDaGlsZHJlbiB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQ29ybmVyc3RvbmVEaXJlY3RpdmUgfSBmcm9tICcuL2Nvcm5lcnN0b25lLmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyBUaHVtYm5haWxEaXJlY3RpdmUgfSBmcm9tICcuL3RodW1ibmFpbC5kaXJlY3RpdmUnO1xuXG5cbmRlY2xhcmUgY29uc3QgY29ybmVyc3RvbmU7XG5kZWNsYXJlIGNvbnN0IGNvcm5lcnN0b25lVG9vbHM7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2RpY29tLXZpZXdlcicsXG4gIHRlbXBsYXRlVXJsOiAnLi9kaWNvbS12aWV3ZXIuY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybHM6IFsnLi9kaWNvbS12aWV3ZXIuY29tcG9uZW50LmNzcyddXG59KVxuZXhwb3J0IGNsYXNzIERJQ09NVmlld2VyQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcblxuICBASW5wdXQoKSBwdWJsaWMgZW5hYmxlVmlld2VyVG9vbHMgPSBmYWxzZTsgLy8gZW5hYmxlIHZpZXdlciB0b29sc1xuICBASW5wdXQoKSBwdWJsaWMgZW5hYmxlUGxheVRvb2xzID0gZmFsc2U7IC8vIGVuYWJsZSBQbGF5IENsaXAgdG9vbHNcbiAgQElucHV0KCkgcHVibGljIGRvd25sb2FkSW1hZ2VzVVJMID0gJycgLy8gZG93bmxvYWQgaW1hZ2VzIFVSTFxuICBASW5wdXQoKSBwdWJsaWMgbWF4SW1hZ2VzVG9Mb2FkID0gMjA7IC8vIGxpbWl0IGZvciB0aGUgYXV0b21hdGljIGxvYWRpbmcgb2Ygc3R1ZHkgaW1hZ2VzXG5cbiAgcHVibGljIHNlcmllc0xpc3QgPSBbXTsgLy8gbGlzdCBvZiBzZXJpZXMgb24gdGhlIGltYWdlcyBiZWluZyBkaXNwbGF5ZWRcbiAgcHVibGljIGN1cnJlbnRTZXJpZXNJbmRleCA9IDA7XG4gIHB1YmxpYyBjdXJyZW50U2VyaWVzOiBhbnkgPSB7fTtcbiAgcHVibGljIGltYWdlQ291bnQgPSAwOyAvLyB0b3RhbCBpbWFnZSBjb3VudCBiZWluZyB2aWV3ZWRcblxuICAvLyBjb250cm9sIGVuYWJsZS9kaXNhYmxlIGltYWdlIHNjcm9sbCBidXR0b25zXG4gIHB1YmxpYyBnZXQgaGlkZVByZXZpb3VzSW1hZ2UoKTogYW55IHsgcmV0dXJuIHsgY29sb3I6ICh0aGlzLnZpZXdQb3J0LmN1cnJlbnRJbmRleCA8IDEpID8gJ2JsYWNrJyA6ICd3aGl0ZScgfTsgfVxuICBwdWJsaWMgZ2V0IGhpZGVOZXh0SW1hZ2UoKTogYW55IHsgcmV0dXJuIHsgY29sb3I6ICh0aGlzLnZpZXdQb3J0LmN1cnJlbnRJbmRleCA+PSAodGhpcy5pbWFnZUNvdW50IC0gMSkpID8gJ2JsYWNrJyA6ICd3aGl0ZScgfTsgfVxuXG4gIC8vIGNvbnRyb2wgbWVzc2FnZSBmb3IgbW9yZSBpbWFnZXMgdG8gbG9hZFxuICBwdWJsaWMgZ2V0IG1vcmVJbWFnZXN0b0xvYWQoKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy5sb2FkZWRJbWFnZXMubGVuZ3RoIDwgdGhpcy5pbWFnZUlkTGlzdC5sZW5ndGggJiYgIXRoaXMubG9hZGluZ0ltYWdlcykgeyAvLyBhcmUgdGhlcmUgYW55IG1vcmUgaW1hZ2VzIHRvIGxvYWQ/XG4gICAgICBjb25zdCBpbWFnZXNUb0xvYWQgPSAodGhpcy5tYXhJbWFnZXNUb0xvYWQgPD0gMCkgPyAodGhpcy5pbWFnZUlkTGlzdC5sZW5ndGggLSB0aGlzLmxvYWRlZEltYWdlcy5sZW5ndGgpIDogTWF0aC5taW4odGhpcy5tYXhJbWFnZXNUb0xvYWQsIHRoaXMuaW1hZ2VJZExpc3QubGVuZ3RoIC0gdGhpcy5sb2FkZWRJbWFnZXMubGVuZ3RoKTtcbiAgICAgIHJldHVybiBpbWFnZXNUb0xvYWQudG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgcmV0dXJuICcnO1xuICB9XG5cbiAgLy8gY29udHJvbCBleGhpYml0aW9uIG9mIGEgbG9hZGluZyBpbWFnZXMgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gIHB1YmxpYyBsb2FkaW5nSW1hZ2VzID0gZmFsc2U7XG4gIHB1YmxpYyBnZXQgc2hvd1Byb2dyZXNzKCk6IGFueSB7IHJldHVybiB7IGRpc3BsYXk6ICh0aGlzLmxvYWRpbmdJbWFnZXMpID8gJ2lubGluZS1ibG9jaycgOiAnbm9uZScgfSB9O1xuXG4gIEBWaWV3Q2hpbGQoQ29ybmVyc3RvbmVEaXJlY3RpdmUsIHsgc3RhdGljOiB0cnVlIH0pIHZpZXdQb3J0OiBDb3JuZXJzdG9uZURpcmVjdGl2ZTsgLy8gdGhlIG1haW4gY29ybmVyc3RvbmUgdmlld3BvcnRcbiAgQFZpZXdDaGlsZHJlbihUaHVtYm5haWxEaXJlY3RpdmUpIHRodW1ibmFpbHM6IEFycmF5PFRodW1ibmFpbERpcmVjdGl2ZT47XG5cbiAgcHJpdmF0ZSBsb2FkZWRJbWFnZXMgPSBbXTtcbiAgcHJpdmF0ZSBpbWFnZUlkTGlzdCA9IFtdO1xuICBwcml2YXRlIGVsZW1lbnQ6IGFueTtcbiAgcHJpdmF0ZSB0YXJnZXRJbWFnZUNvdW50ID0gMDtcblxuICBjb25zdHJ1Y3RvcigpIHsgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIHRoaXMuZWxlbWVudCA9IHRoaXMudmlld1BvcnQuZWxlbWVudDtcbiAgfVxuIFxuICAvKipcbiAgICogTG9hZCBkaWNvbSBpbWFnZXMgZm9yIGRpc3BsYXlcbiAgICpcbiAgICogQHBhcmFtIGltYWdlSWRMaXN0IGxpc3Qgb2YgaW1hZ2VJZHMgdG8gbG9hZCBhbmQgZGlzcGxheVxuICAgKi9cbiAgbG9hZFN0dWR5SW1hZ2VzKGltYWdlSWRMaXN0OiBBcnJheTxhbnk+KSB7XG4gICAgdGhpcy5lbGVtZW50ID0gdGhpcy52aWV3UG9ydC5lbGVtZW50O1xuICAgIHRoaXMuaW1hZ2VJZExpc3QgPSBpbWFnZUlkTGlzdDtcbiAgICB0aGlzLnZpZXdQb3J0LnJlc2V0Vmlld2VyKCk7XG4gICAgdGhpcy52aWV3UG9ydC5yZXNldEltYWdlQ2FjaGUoKTsgLy8gY2xlYW4gdXAgaW1hZ2UgY2FjaGVcbiAgICB0aGlzLnNlcmllc0xpc3QgPSBbXTsgLy8gc3RhcnQgYSBuZXcgc2VyaWVzIGxpc3RcbiAgICB0aGlzLmN1cnJlbnRTZXJpZXNJbmRleCA9IDA7IC8vIGFsd2F5cyBkaXNwbGF5IGZpcnN0IHNlcmllc1xuICAgIHRoaXMubG9hZGVkSW1hZ2VzID0gW107IC8vIHJlc2V0IGxpc3Qgb2YgaW1hZ2VzIGFscmVhZHkgbG9hZGVkXG5cbiAgICAvL1xuICAgIC8vIGxvb3AgdGhydSBhbGwgaW1hZ2VJZHMsIGxvYWQgYW5kIGNhY2hlIHRoZW0gZm9yIGV4aGliaXRpb24gKHVwIHRoZSB0aGUgbWF4aW11bSBsaW1pdCBkZWZpbmVkKVxuICAgIC8vXG4gICAgY29uc3QgbWF4SW1hZ2VzID0gKHRoaXMubWF4SW1hZ2VzVG9Mb2FkIDw9IDApID8gaW1hZ2VJZExpc3QubGVuZ3RoIDogTWF0aC5taW4odGhpcy5tYXhJbWFnZXNUb0xvYWQsIGltYWdlSWRMaXN0Lmxlbmd0aCk7XG4gICAgdGhpcy5sb2FkaW5nSW1hZ2VzID0gdHJ1ZTsgLy8gYWN0aXZhdGUgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gICAgdGhpcy50YXJnZXRJbWFnZUNvdW50ID0gbWF4SW1hZ2VzO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBtYXhJbWFnZXM7IGluZGV4KyspIHtcbiAgICAgIGNvbnN0IGltYWdlSWQgPSBpbWFnZUlkTGlzdFtpbmRleF07XG4gICAgICBjb3JuZXJzdG9uZS5sb2FkQW5kQ2FjaGVJbWFnZShpbWFnZUlkKS50aGVuKGltYWdlRGF0YSA9PiB7IHRoaXMuaW1hZ2VMb2FkZWQoaW1hZ2VEYXRhKSB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkIHRoZSBuZXh0IGJhdGNoIG9mIGltYWdlc1xuICAgKi9cbiAgcHVibGljIGxvYWRNb3JlSW1hZ2VzKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IHRoaXMudmlld1BvcnQuZWxlbWVudDtcbiAgICAvL1xuICAgIC8vIGxvb3AgdGhydSBhbGwgaW1hZ2VJZHMsIGxvYWQgYW5kIGNhY2hlIHRoZW0gZm9yIGV4aGliaXRpb24gKHVwIHRoZSB0aGUgbWF4aW11bSBsaW1pdCBkZWZpbmVkKVxuICAgIC8vXG4gICAgY29uc3QgbWF4SW1hZ2VzID0gKHRoaXMubWF4SW1hZ2VzVG9Mb2FkIDw9IDApID8gKHRoaXMuaW1hZ2VJZExpc3QubGVuZ3RoIC0gdGhpcy5sb2FkZWRJbWFnZXMubGVuZ3RoKSA6IE1hdGgubWluKHRoaXMubWF4SW1hZ2VzVG9Mb2FkLCB0aGlzLmltYWdlSWRMaXN0Lmxlbmd0aCAtIHRoaXMubG9hZGVkSW1hZ2VzLmxlbmd0aCk7XG4gICAgdGhpcy5sb2FkaW5nSW1hZ2VzID0gdHJ1ZTsgLy8gYWN0aXZhdGUgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gICAgdGhpcy50YXJnZXRJbWFnZUNvdW50ICs9IG1heEltYWdlcztcbiAgICBsZXQgbmV4dEltYWdlSW5kZXggPSB0aGlzLmxvYWRlZEltYWdlcy5sZW5ndGg7XG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG1heEltYWdlczsgaW5kZXgrKykge1xuICAgICAgY29uc3QgaW1hZ2VJZCA9IHRoaXMuaW1hZ2VJZExpc3RbbmV4dEltYWdlSW5kZXgrK107XG4gICAgICBjb3JuZXJzdG9uZS5sb2FkQW5kQ2FjaGVJbWFnZShpbWFnZUlkKVxuICAgICAgICAudGhlbihpbWFnZURhdGEgPT4geyB0aGlzLmltYWdlTG9hZGVkKGltYWdlRGF0YSkgfSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiB7IHRoaXMudGFyZ2V0SW1hZ2VDb3VudC0tOyB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gaW1hZ2VEYXRhIHRoZSBkaWNvbSBpbWFnZSBkYXRhXG4gICAqL1xuICBwcml2YXRlIGltYWdlTG9hZGVkKGltYWdlRGF0YSkge1xuICAgIC8vY29uc29sZS5sb2coaW1hZ2VEYXRhLmltYWdlSWQpXG4gICAgLy8gYnVpbGQgbGlzdCBvZiBzZXJpZXMgaW4gYWxsIGxvYWRkZWQgaW1hZ2VzXG4gICAgY29uc3Qgc2VyaWVzID0ge1xuICAgICAgc3R1ZHlJRDogaW1hZ2VEYXRhLmRhdGEuc3RyaW5nKCd4MDAyMDAwMGQnKSxcbiAgICAgIHNlcmllc0lEOiBpbWFnZURhdGEuZGF0YS5zdHJpbmcoJ3gwMDIwMDAwZScpLFxuICAgICAgc2VyaWVzTnVtYmVyOiBpbWFnZURhdGEuZGF0YS5pbnRTdHJpbmcoJ3gwMDIwMDAxMScpLFxuICAgICAgc3R1ZHlEZXNjcmlwdGlvbjogaW1hZ2VEYXRhLmRhdGEuc3RyaW5nKCd4MDAwODEwMzAnKSxcbiAgICAgIHNlcmllc0Rlc2NyaXB0aW9uOiBpbWFnZURhdGEuZGF0YS5zdHJpbmcoJ3gwMDA4MTAzZScpLFxuICAgICAgaW1hZ2VDb3VudDogMSxcbiAgICAgIGltYWdlTGlzdDogW2ltYWdlRGF0YV1cbiAgICB9XG4gICAgLy8gaWYgdGhpcyBpcyBhIG5ldyBzZXJpZXMsIGFkZCBpdCB0byB0aGUgbGlzdFxuICAgIGxldCBzZXJpZXNJbmRleCA9IHRoaXMuc2VyaWVzTGlzdC5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLnNlcmllc0lEID09PSBzZXJpZXMuc2VyaWVzSUQpO1xuICAgIGlmIChzZXJpZXNJbmRleCA8IDApIHtcbiAgICAgIHNlcmllc0luZGV4ID0gdGhpcy5zZXJpZXNMaXN0Lmxlbmd0aDtcbiAgICAgIHRoaXMuc2VyaWVzTGlzdC5wdXNoKHNlcmllcyk7XG4gICAgICB0aGlzLnNlcmllc0xpc3Quc29ydCgoYSwgYikgPT4ge1xuICAgICAgICBpZiAoYS5zZXJpZXNOdW1iZXIgPiBiLnNlcmllc051bWJlcikgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhLnNlcmllc051bWJlciA8IGIuc2VyaWVzTnVtYmVyKSByZXR1cm4gLTE7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHNlcmllc0l0ZW0gPSB0aGlzLnNlcmllc0xpc3Rbc2VyaWVzSW5kZXhdO1xuICAgICAgc2VyaWVzSXRlbS5pbWFnZUNvdW50Kys7XG4gICAgICBzZXJpZXNJdGVtLmltYWdlTGlzdC5wdXNoKGltYWdlRGF0YSk7XG4gICAgICBzZXJpZXNJdGVtLmltYWdlTGlzdC5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGlmIChhLmRhdGEuaW50U3RyaW5nKCd4MDAyMDAwMTMnKSA+IGIuZGF0YS5pbnRTdHJpbmcoJ3gwMDIwMDAxMycpKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEuZGF0YS5pbnRTdHJpbmcoJ3gwMDIwMDAxMycpIDwgYi5kYXRhLmludFN0cmluZygneDAwMjAwMDEzJykpIHJldHVybiAtMTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9KVxuICAgIH1cblxuICAgIHRoaXMubG9hZGVkSW1hZ2VzLnB1c2goaW1hZ2VEYXRhKTsgLy8gc2F2ZSB0byBpbWFnZXMgbG9hZGVkXG5cbiAgICBpZiAoc2VyaWVzSW5kZXggPT09IHRoaXMuY3VycmVudFNlcmllc0luZGV4KSB7XG4gICAgICAvL3RoaXMuY3VycmVudFNlcmllcyA9IHRoaXMuc2VyaWVzTGlzdFtzZXJpZXNJbmRleF07XG4gICAgICAvL3RoaXMuaW1hZ2VDb3VudCA9IHRoaXMuY3VycmVudFNlcmllcy5pbWFnZUNvdW50OyAvLyBnZXQgdG90YWwgaW1hZ2UgY291bnRcbiAgICAgIC8vdGhpcy52aWV3UG9ydC5hZGRJbWFnZURhdGEoaW1hZ2VEYXRhKTtcbiAgICAgIHRoaXMuc2hvd1Nlcmllcyh0aGlzLmN1cnJlbnRTZXJpZXNJbmRleClcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sb2FkZWRJbWFnZXMubGVuZ3RoID49IHRoaXMudGFyZ2V0SW1hZ2VDb3VudCkgeyAvLyBkaWQgd2UgZmluaXNoIGxvYWRpbmcgaW1hZ2VzP1xuICAgICAgdGhpcy5sb2FkaW5nSW1hZ2VzID0gZmFsc2U7IC8vIGRlYWN0aXZhdGUgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gICAgfVxuXG4gIH1cblxuICBwdWJsaWMgc2hvd1NlcmllcyhpbmRleCkge1xuICAgIC8vICAgICAgICB0aGlzLnJlc2V0QWxsVG9vbHMoKTtcbiAgICB0aGlzLmN1cnJlbnRTZXJpZXNJbmRleCA9IGluZGV4O1xuICAgIHRoaXMuY3VycmVudFNlcmllcyA9IHRoaXMuc2VyaWVzTGlzdFtpbmRleF07XG4gICAgdGhpcy5pbWFnZUNvdW50ID0gdGhpcy5jdXJyZW50U2VyaWVzLmltYWdlQ291bnQ7IC8vIGdldCB0b3RhbCBpbWFnZSBjb3VudFxuICAgIHRoaXMudmlld1BvcnQucmVzZXRJbWFnZUNhY2hlKCk7IC8vIGNsZWFuIHVwIGltYWdlIGNhY2hlXG4gICAgLy8gICAgICAgIHRoaXMubG9hZGluZ0ltYWdlcyA9IHRydWU7IC8vIGFjdGl2YXRlIHByb2dyZXNzIGluZGljYXRvclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jdXJyZW50U2VyaWVzLmltYWdlTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgaW1hZ2VEYXRhID0gdGhpcy5jdXJyZW50U2VyaWVzLmltYWdlTGlzdFtpXTtcbiAgICAgIHRoaXMudmlld1BvcnQuYWRkSW1hZ2VEYXRhKGltYWdlRGF0YSk7XG4gICAgfVxuICAgIC8vICAgICAgICB0aGlzLmxvYWRpbmdJbWFnZXMgPSBmYWxzZTsgLy8gZGUtYWN0aXZhdGUgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gIH1cblxuICBwdWJsaWMgc2F2ZUFzKCkge1xuICAgIGNvcm5lcnN0b25lVG9vbHMuc2F2ZUFzKHRoaXMuZWxlbWVudCwgXCJ0ZXN0ZS5qcGdcIilcbiAgfVxuXG4gIC8qKlxuICAgKiBJbWFnZSBzY3JvbGwgbWV0aG9kc1xuICAgKi9cbiAgcHVibGljIG5leHRJbWFnZSgpIHtcbiAgICBpZiAodGhpcy52aWV3UG9ydC5jdXJyZW50SW5kZXggPCB0aGlzLmltYWdlQ291bnQpIHtcbiAgICAgIHRoaXMudmlld1BvcnQubmV4dEltYWdlKCk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHByZXZpb3VzSW1hZ2UoKSB7XG4gICAgaWYgKHRoaXMudmlld1BvcnQuY3VycmVudEluZGV4ID4gMCkge1xuICAgICAgdGhpcy52aWV3UG9ydC5wcmV2aW91c0ltYWdlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZHMgdG8gYWN0aXZhdGUvZGVhY3RpdmF0ZSB2aWV3ZXIgdG9vbHNcbiAgICovXG5cbiAgLy8gZGVhY3RpdmF0ZSBhbGwgdG9vbHNcbiAgcHVibGljIHJlc2V0QWxsVG9vbHMoKSB7XG4gICAgaWYgKHRoaXMuaW1hZ2VDb3VudCA+IDApIHtcbiAgICAgIHRoaXMudmlld1BvcnQucmVzZXRBbGxUb29scygpXG4gICAgICB0aGlzLnN0b3BDbGlwKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gYWN0aXZhdGUgd2luZG93aW5nXG4gIHB1YmxpYyBlbmFibGVXaW5kb3dpbmcoKSB7XG4gICAgaWYgKHRoaXMuaW1hZ2VDb3VudCA+IDApIHtcbiAgICAgIHRoaXMucmVzZXRBbGxUb29scygpO1xuICAgICAgLy8gY29ybmVyc3RvbmVUb29scy53d3djLmFjdGl2YXRlKHRoaXMuZWxlbWVudCwgMSk7XG4gICAgICAvLyBjb3JuZXJzdG9uZVRvb2xzLnd3d2NUb3VjaERyYWcuYWN0aXZhdGUodGhpcy5lbGVtZW50KTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuc2V0VG9vbEFjdGl2ZUZvckVsZW1lbnQodGhpcy5lbGVtZW50LCAnV3d3YycsIHsgbW91c2VCdXR0b25NYXNrOiAxIH0sIFsnTW91c2UnXSk7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnNldFRvb2xBY3RpdmVGb3JFbGVtZW50KHRoaXMuZWxlbWVudCwgJ1BhbicsIHsgbW91c2VCdXR0b25NYXNrOiAyIH0sIFsnTW91c2UnXSk7IC8vIHBhbiByaWdodCBtb3VzZVxuICAgIH1cbiAgfVxuXG4gIC8vIGFjdGl2YXRlIHpvb21cbiAgcHVibGljIGVuYWJsZVpvb20oKSB7XG4gICAgaWYgKHRoaXMuaW1hZ2VDb3VudCA+IDApIHtcbiAgICAgIHRoaXMucmVzZXRBbGxUb29scygpO1xuICAgICAgLy8gY29ybmVyc3RvbmVUb29scy56b29tLmFjdGl2YXRlKHRoaXMuZWxlbWVudCwgNSk7IC8vIDUgaXMgcmlnaHQgbW91c2UgYnV0dG9uIGFuZCBsZWZ0IG1vdXNlIGJ1dHRvblxuICAgICAgLy8gY29ybmVyc3RvbmVUb29scy56b29tVG91Y2hEcmFnLmFjdGl2YXRlKHRoaXMuZWxlbWVudCk7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnNldFRvb2xBY3RpdmVGb3JFbGVtZW50KHRoaXMuZWxlbWVudCwgJ1pvb20nLCB7IG1vdXNlQnV0dG9uTWFzazogMSB9LCBbJ01vdXNlJ10pOyAvLyB6b29tIGxlZnQgbW91c2VcbiAgICAgIC8vIGNvcm5lcnN0b25lVG9vbHMuc2V0VG9vbEFjdGl2ZUZvckVsZW1lbnQodGhpcy5lbGVtZW50LCAnWm9vbVRvdWNoUGluY2gnLCB7IH0sIFsnTW91c2UnXSk7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnNldFRvb2xBY3RpdmVGb3JFbGVtZW50KHRoaXMuZWxlbWVudCwgJ1BhbicsIHsgbW91c2VCdXR0b25NYXNrOiAyIH0sIFsnTW91c2UnXSk7IC8vIHBhbiByaWdodCBtb3VzZVxuXG4gICAgfVxuICB9XG5cbiAgLy8gYWN0aXZhdGUgcGFuXG4gIHB1YmxpYyBlbmFibGVQYW4oKSB7XG4gICAgaWYgKHRoaXMuaW1hZ2VDb3VudCA+IDApIHtcbiAgICAgIHRoaXMucmVzZXRBbGxUb29scygpO1xuICAgICAgLy8gY29ybmVyc3RvbmVUb29scy5wYW4uYWN0aXZhdGUodGhpcy5lbGVtZW50LCAzKTsgLy8gMyBpcyBtaWRkbGUgbW91c2UgYnV0dG9uIGFuZCBsZWZ0IG1vdXNlIGJ1dHRvblxuICAgICAgLy8gY29ybmVyc3RvbmVUb29scy5wYW5Ub3VjaERyYWcuYWN0aXZhdGUodGhpcy5lbGVtZW50KTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuc2V0VG9vbEFjdGl2ZUZvckVsZW1lbnQodGhpcy5lbGVtZW50LCAnUGFuJywgeyBtb3VzZUJ1dHRvbk1hc2s6IDEgfSwgWydNb3VzZSddKTtcbiAgICB9XG4gIH1cblxuICAvLyBhY3RpdmF0ZSBpbWFnZSBzY3JvbGxcbiAgcHVibGljIGVuYWJsZVNjcm9sbCgpIHtcbiAgICBpZiAodGhpcy5pbWFnZUNvdW50ID4gMCkge1xuICAgICAgdGhpcy5yZXNldEFsbFRvb2xzKCk7XG4gICAgICAvLyBjb3JuZXJzdG9uZVRvb2xzLnN0YWNrU2Nyb2xsLmFjdGl2YXRlKHRoaXMuZWxlbWVudCwgMSk7XG4gICAgICAvLyBjb3JuZXJzdG9uZVRvb2xzLnN0YWNrU2Nyb2xsVG91Y2hEcmFnLmFjdGl2YXRlKHRoaXMuZWxlbWVudCk7XG4gICAgICAvLyBjb3JuZXJzdG9uZVRvb2xzLnN0YWNrU2Nyb2xsS2V5Ym9hcmQuYWN0aXZhdGUodGhpcy5lbGVtZW50KTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuc2V0VG9vbEFjdGl2ZUZvckVsZW1lbnQodGhpcy5lbGVtZW50LCAnU3RhY2tTY3JvbGwnLCB7IG1vdXNlQnV0dG9uTWFzazogMSB9LCBbJ01vdXNlJ10pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGFjdGl2YXRlIGxlbmd0aCBtZWFzdXJlbWVudFxuICBwdWJsaWMgZW5hYmxlTGVuZ3RoKCkge1xuICAgIGlmICh0aGlzLmltYWdlQ291bnQgPiAwKSB7XG4gICAgICB0aGlzLnJlc2V0QWxsVG9vbHMoKTtcbiAgICAgIC8vIGNvcm5lcnN0b25lVG9vbHMubGVuZ3RoLmFjdGl2YXRlKHRoaXMuZWxlbWVudCwgMSk7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnNldFRvb2xBY3RpdmVGb3JFbGVtZW50KHRoaXMuZWxlbWVudCwgJ0xlbmd0aCcsIHsgbW91c2VCdXR0b25NYXNrOiAxIH0sIFsnTW91c2UnXSk7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnNldFRvb2xBY3RpdmVGb3JFbGVtZW50KHRoaXMuZWxlbWVudCwgJ1BhbicsIHsgbW91c2VCdXR0b25NYXNrOiAyIH0sIFsnTW91c2UnXSk7IC8vIHBhbiByaWdodCBtb3VzZVxuICAgIH1cbiAgfVxuXG4gIC8vIGFjdGl2YXRlIGFuZ2xlIG1lYXN1cmVtZW50XG4gIHB1YmxpYyBlbmFibGVBbmdsZSgpIHtcbiAgICBpZiAodGhpcy5pbWFnZUNvdW50ID4gMCkge1xuICAgICAgdGhpcy5yZXNldEFsbFRvb2xzKCk7XG4gICAgICAvLyBjb3JuZXJzdG9uZVRvb2xzLnNpbXBsZUFuZ2xlLmFjdGl2YXRlKHRoaXMuZWxlbWVudCwgMSk7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnNldFRvb2xBY3RpdmVGb3JFbGVtZW50KHRoaXMuZWxlbWVudCwgJ0FuZ2xlJywgeyBtb3VzZUJ1dHRvbk1hc2s6IDEgfSwgWydNb3VzZSddKTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuc2V0VG9vbEFjdGl2ZUZvckVsZW1lbnQodGhpcy5lbGVtZW50LCAnUGFuJywgeyBtb3VzZUJ1dHRvbk1hc2s6IDIgfSwgWydNb3VzZSddKTsgLy8gcGFuIHJpZ2h0IG1vdXNlXG4gICAgfVxuICB9XG5cbiAgLy8gYWN0aXZhdGUgcGl4ZWwgcHJvYmVcbiAgcHVibGljIGVuYWJsZVByb2JlKCkge1xuICAgIGlmICh0aGlzLmltYWdlQ291bnQgPiAwKSB7XG4gICAgICB0aGlzLnJlc2V0QWxsVG9vbHMoKTtcbiAgICAgIC8vIGNvcm5lcnN0b25lVG9vbHMucHJvYmUuYWN0aXZhdGUodGhpcy5lbGVtZW50LCAxKTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuc2V0VG9vbEFjdGl2ZUZvckVsZW1lbnQodGhpcy5lbGVtZW50LCAnUHJvYmUnLCB7IG1vdXNlQnV0dG9uTWFzazogMSB9LCBbJ01vdXNlJ10pO1xuICAgICAgY29ybmVyc3RvbmVUb29scy5zZXRUb29sQWN0aXZlRm9yRWxlbWVudCh0aGlzLmVsZW1lbnQsICdQYW4nLCB7IG1vdXNlQnV0dG9uTWFzazogMiB9LCBbJ01vdXNlJ10pOyAvLyBwYW4gcmlnaHQgbW91c2VcbiAgICB9XG4gIH1cblxuICAvLyBhY3RpdmF0ZSBFbGxpcHRpY2FsIFJPSVxuICBwdWJsaWMgZW5hYmxlRWxsaXB0aWNhbCgpIHtcbiAgICBpZiAodGhpcy5pbWFnZUNvdW50ID4gMCkge1xuICAgICAgdGhpcy5yZXNldEFsbFRvb2xzKCk7XG4gICAgICAvLyBjb3JuZXJzdG9uZVRvb2xzLmVsbGlwdGljYWxSb2kuYWN0aXZhdGUodGhpcy5lbGVtZW50LCAxKTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuc2V0VG9vbEFjdGl2ZUZvckVsZW1lbnQodGhpcy5lbGVtZW50LCAnRWxsaXB0aWNhbFJvaScsIHsgbW91c2VCdXR0b25NYXNrOiAxIH0sIFsnTW91c2UnXSk7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnNldFRvb2xBY3RpdmVGb3JFbGVtZW50KHRoaXMuZWxlbWVudCwgJ1BhbicsIHsgbW91c2VCdXR0b25NYXNrOiAyIH0sIFsnTW91c2UnXSk7IC8vIHBhbiByaWdodCBtb3VzZVxuICAgIH1cbiAgfVxuXG4gIC8vIGFjdGl2YXRlIFJlY3RhbmdsZSBST0lcbiAgcHVibGljIGVuYWJsZVJlY3RhbmdsZSgpIHtcbiAgICBpZiAodGhpcy5pbWFnZUNvdW50ID4gMCkge1xuICAgICAgdGhpcy5yZXNldEFsbFRvb2xzKCk7XG4gICAgICAvLyBjb3JuZXJzdG9uZVRvb2xzLnJlY3RhbmdsZVJvaS5hY3RpdmF0ZSh0aGlzLmVsZW1lbnQsIDEpO1xuICAgICAgY29ybmVyc3RvbmVUb29scy5zZXRUb29sQWN0aXZlRm9yRWxlbWVudCh0aGlzLmVsZW1lbnQsICdSZWN0YW5nbGVSb2knLCB7IG1vdXNlQnV0dG9uTWFzazogMSB9LCBbJ01vdXNlJ10pO1xuICAgICAgY29ybmVyc3RvbmVUb29scy5zZXRUb29sQWN0aXZlRm9yRWxlbWVudCh0aGlzLmVsZW1lbnQsICdQYW4nLCB7IG1vdXNlQnV0dG9uTWFzazogMiB9LCBbJ01vdXNlJ10pOyAvLyBwYW4gcmlnaHQgbW91c2VcbiAgICB9XG4gIH1cblxuICAvLyBQbGF5IENsaXBcbiAgcHVibGljIHBsYXlDbGlwKCkge1xuICAgIGlmICh0aGlzLmltYWdlQ291bnQgPiAwKSB7XG4gICAgICBsZXQgZnJhbWVSYXRlID0gMTA7XG4gICAgICBsZXQgc3RhY2tTdGF0ZSA9IGNvcm5lcnN0b25lVG9vbHMuZ2V0VG9vbFN0YXRlKHRoaXMuZWxlbWVudCwgJ3N0YWNrJyk7XG4gICAgICBpZiAoc3RhY2tTdGF0ZSkge1xuICAgICAgICBmcmFtZVJhdGUgPSBzdGFja1N0YXRlLmRhdGFbMF0uZnJhbWVSYXRlO1xuICAgICAgICAvLyBQbGF5IGF0IGEgZGVmYXVsdCAxMCBGUFMgaWYgdGhlIGZyYW1lcmF0ZSBpcyBub3Qgc3BlY2lmaWVkXG4gICAgICAgIGlmIChmcmFtZVJhdGUgPT09IHVuZGVmaW5lZCB8fCBmcmFtZVJhdGUgPT09IG51bGwgfHwgZnJhbWVSYXRlID09PSAwKSB7XG4gICAgICAgICAgZnJhbWVSYXRlID0gMTA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvcm5lcnN0b25lVG9vbHMucGxheUNsaXAodGhpcy5lbGVtZW50LCBmcmFtZVJhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFN0b3AgQ2xpcFxuICBwdWJsaWMgc3RvcENsaXAoKSB7XG4gICAgY29ybmVyc3RvbmVUb29scy5zdG9wQ2xpcCh0aGlzLmVsZW1lbnQpO1xuICB9XG5cbiAgLy8gaW52ZXJ0IGltYWdlXG4gIHB1YmxpYyBpbnZlcnRJbWFnZSgpIHtcbiAgICBpZiAodGhpcy5pbWFnZUNvdW50ID4gMCkge1xuICAgICAgbGV0IHZpZXdwb3J0ID0gY29ybmVyc3RvbmUuZ2V0Vmlld3BvcnQodGhpcy5lbGVtZW50KTtcbiAgICAgIC8vIFRvZ2dsZSBpbnZlcnRcbiAgICAgIGlmICh2aWV3cG9ydC5pbnZlcnQgPT09IHRydWUpIHtcbiAgICAgICAgdmlld3BvcnQuaW52ZXJ0ID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3cG9ydC5pbnZlcnQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgY29ybmVyc3RvbmUuc2V0Vmlld3BvcnQodGhpcy5lbGVtZW50LCB2aWV3cG9ydCk7XG4gICAgfVxuICB9XG5cbiAgLy8gcmVzZXQgaW1hZ2VcbiAgcHVibGljIHJlc2V0SW1hZ2UoKSB7XG4gICAgaWYgKHRoaXMuaW1hZ2VDb3VudCA+IDApIHtcbiAgICAgIGxldCB0b29sU3RhdGVNYW5hZ2VyID0gY29ybmVyc3RvbmVUb29scy5nZXRFbGVtZW50VG9vbFN0YXRlTWFuYWdlcih0aGlzLmVsZW1lbnQpO1xuICAgICAgLy8gTm90ZSB0aGF0IHRoaXMgb25seSB3b3JrcyBvbiBJbWFnZUlkLXNwZWNpZmljIHRvb2wgc3RhdGUgbWFuYWdlcnMgKGZvciBub3cpXG4gICAgICAvL3Rvb2xTdGF0ZU1hbmFnZXIuY2xlYXIodGhpcy5lbGVtZW50KTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuY2xlYXJUb29sU3RhdGUodGhpcy5lbGVtZW50LCBcIkxlbmd0aFwiKTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuY2xlYXJUb29sU3RhdGUodGhpcy5lbGVtZW50LCBcIkFuZ2xlXCIpO1xuICAgICAgLy8gY29ybmVyc3RvbmVUb29scy5jbGVhclRvb2xTdGF0ZSh0aGlzLmVsZW1lbnQsIFwic2ltcGxlQW5nbGVcIik7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLmNsZWFyVG9vbFN0YXRlKHRoaXMuZWxlbWVudCwgXCJQcm9iZVwiKTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuY2xlYXJUb29sU3RhdGUodGhpcy5lbGVtZW50LCBcIkVsbGlwdGljYWxSb2lcIik7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLmNsZWFyVG9vbFN0YXRlKHRoaXMuZWxlbWVudCwgXCJSZWN0YW5nbGVSb2lcIik7XG4gICAgICBjb3JuZXJzdG9uZS51cGRhdGVJbWFnZSh0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy5yZXNldEFsbFRvb2xzKCk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNsZWFySW1hZ2UoKSB7XG4gICAgdGhpcy52aWV3UG9ydC5yZXNldFZpZXdlcigpO1xuICAgIHRoaXMudmlld1BvcnQucmVzZXRJbWFnZUNhY2hlKCk7XG4gICAgdGhpcy5zZXJpZXNMaXN0ID0gW107IC8vIGxpc3Qgb2Ygc2VyaWVzIG9uIHRoZSBpbWFnZXMgYmVpbmcgZGlzcGxheWVkXG4gICAgdGhpcy5jdXJyZW50U2VyaWVzSW5kZXggPSAwO1xuICAgIHRoaXMuY3VycmVudFNlcmllcyA9IHt9O1xuICAgIHRoaXMuaW1hZ2VDb3VudCA9IDA7IC8vIHRvdGFsIGltYWdlIGNvdW50IGJlaW5nIHZpZXdlZFxuXG4gIH1cbn1cbiJdfQ==