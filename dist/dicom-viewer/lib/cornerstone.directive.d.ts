import { ElementRef, OnInit, AfterViewChecked } from '@angular/core';
import * as ɵngcc0 from '@angular/core';
export declare class CornerstoneDirective implements OnInit, AfterViewChecked {
    private elementRef;
    element: any;
    imageList: any[];
    private imageIdList;
    currentIndex: number;
    currentImage: any;
    patientName: string;
    hospital: string;
    instanceNumber: string;
    private WwwcTool;
    private PanTool;
    private ZoomTool;
    private ProbeTool;
    private LengthTool;
    private AngleTool;
    private EllipticalRoiTool;
    private RectangleRoiTool;
    private DragProbeTool;
    private ZoomTouchPinchTool;
    private PanMultiTouchTool;
    private StackScrollTool;
    private StackScrollMouseWheelTool;
    get windowingValue(): string;
    get zoomValue(): string;
    private isCornerstoneEnabled;
    constructor(elementRef: ElementRef);
    onResize(event: any): void;
    onMouseWheel(event: any): void;
    ngOnInit(): void;
    ngAfterViewChecked(): void;
    resetViewer(): void;
    disableViewer(): void;
    resetImageCache(): void;
    previousImage(): void;
    nextImage(): void;
    addImageData(imageData: any): void;
    displayImage(image: any): void;
    resetAllTools(): void;
    static ɵfac: ɵngcc0.ɵɵFactoryDef<CornerstoneDirective, never>;
    static ɵdir: ɵngcc0.ɵɵDirectiveDefWithMeta<CornerstoneDirective, "[cornerstone]", never, {}, {}, never>;
}

//# sourceMappingURL=cornerstone.directive.d.ts.map