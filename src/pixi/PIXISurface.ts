/**
 * Created by linfaxin on 16/1/29.
 */
///<reference path="../android/view/Surface.ts"/>
///<reference path="../android/graphics/Canvas.ts"/>
///<reference path="../android/graphics/Matrix.ts"/>
///<reference path="../android/graphics/Rect.ts"/>
///<reference path="../android/graphics/Color.ts"/>
///<reference path="../android/graphics/RectF.ts"/>
///<reference path="PIXICanvas.ts"/>
///<reference path="pixi.js.d.ts"/>

module PIXI {
    import Canvas = android.graphics.Canvas;
    import Rect = android.graphics.Rect;
    import Color = android.graphics.Color;
    import RectF = android.graphics.RectF;
    import Paint = android.graphics.Paint;

    export class PIXISurface extends android.view.Surface {
        pixiRender:PIXI.SystemRenderer;

        protected initImpl():void {
            this.initCanvasBound();

            let bound = this.mCanvasBound;
            this.pixiRender = PIXI.autoDetectRenderer(bound.width(), bound.height(), <any>{
                view: this.mCanvasElement,
                resolution: 1,
                transparent: false,
                clearBeforeRender: false,
                clearBeforeRendering: false,
                backgroundColor: Color.WHITE
            });
            if(this.pixiRender instanceof PIXI.WebGLRenderer){
                this.mSupportDirtyDraw = false;
            }
        }

        protected lockCanvasImpl(left:number, top:number, width:number, height:number):android.graphics.Canvas {
            let canvas = new PIXI.PIXICanvas(width, height);
            canvas.stage.x = left;
            canvas.stage.y = top;
            return canvas;
        }

        private lastRenderCanvas:PIXICanvas;
        unlockCanvasAndPost(canvas:android.graphics.Canvas):void {
            //if(this.lastRenderCanvas){
            //    this.lastRenderCanvas.recycle();
            //    this.lastRenderCanvas = null;
            //}

            if(canvas instanceof PIXICanvas){
                this.pixiRender.render(canvas.stage);
                this.lastRenderCanvas = canvas;
            }
        }
    }

    PIXI.utils['_saidHello'] = true;
    if(PIXI.Container){
        //Canvas.prototype = PIXICanvas.prototype;
        android.view.Surface.prototype = PIXISurface.prototype;
    }

}