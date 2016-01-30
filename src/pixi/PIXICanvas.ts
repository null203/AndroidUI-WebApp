/**
 * Created by linfaxin on 16/1/28.
 */
///<reference path="../android/graphics/Canvas.ts"/>
///<reference path="../android/graphics/Matrix.ts"/>
///<reference path="../android/graphics/Rect.ts"/>
///<reference path="../android/graphics/Color.ts"/>
///<reference path="../android/graphics/RectF.ts"/>
///<reference path="../android/graphics/Paint.ts"/>
///<reference path="../androidui/image/NetImage.ts"/>
///<reference path="pixi.js.d.ts"/>


module PIXI {
    import Canvas = android.graphics.Canvas;
    import Rect = android.graphics.Rect;
    import Color = android.graphics.Color;
    import RectF = android.graphics.RectF;
    import Paint = android.graphics.Paint;
    import Matrix = android.graphics.Matrix;
    import NetImage = androidui.image.NetImage;

    //Canvas render on Pixi.js
    //https://github.com/pixijs/pixi.js
    export class PIXICanvas extends Canvas {
        private stage:PIXI.Container;
        private stageDestroyFunc:(destroyChildren:boolean)=>void;

        private saveData:SaveData;
        private saveDataArray:SaveData[];
        private get drawContent():Container {
            return this.stage;
        }
        private get matrix():android.graphics.Matrix {
            return this.saveData.matrix;
        }

        private addDisplay(child:DisplayObject){

            let values = Canvas.TempMatrixValue;
            this.matrix.getValues(values);

            child.setTransform(values[Matrix.MTRANS_X] + child.x, values[Matrix.MTRANS_Y] + child.y,
                values[Matrix.MSCALE_X] * child.scale.x, values[Matrix.MSCALE_Y] * child.scale.y,
                child.rotation,
                values[Matrix.MSKEW_X], values[Matrix.MSKEW_Y]);
            child.alpha = this.saveData.globalAlpha;

            this.drawContent.addChild(child);
        }

        private addClip(clip:Graphics){
            //this.addDisplay(clip);
            this.saveData.clipShape = clip;
            //let newContainer = new PIXI.Container();
            //newContainer.mask = clip;
            //this.addDisplay(newContainer);
            //this.saveData.contentUnderClip = newContainer;

            //this.matrix.reset();//reset transform, transform is set to content
        }

        protected initImpl():void {
            this.saveData = new SaveData();
            this.saveDataArray = [this.saveData];
            this.stage = new PIXI.Container();
            //this.stage.addChild(this.saveData.contentUnderClip);
            this.clearRectImpl(0, 0, this.getWidth(), this.getHeight());

            //stage can't destroy by parent. only destroy by canvas's recycle
            this.stageDestroyFunc = this.stage.destroy;
            this.stage.destroy = ()=>{};
        }

        protected recycleImpl():void {
            this.stageDestroyFunc.call(this.stage, true);
        }

        protected translateImpl(dx:number, dy:number):void {
            this.matrix.postTranslate(dx, dy);
        }

        protected scaleImpl(sx:number, sy:number):void {
            this.matrix.postScale(sx, sy);
        }

        protected rotateImpl(degrees:number):void {
            this.matrix.postRotate(degrees);
        }

        concat(m:android.graphics.Matrix):void {
            this.matrix.postConcat(m);
        }

        //protected concatImpl(MSCALE_X:number, MSKEW_X:number, MTRANS_X:number, MSKEW_Y:number, MSCALE_Y:number,
        //                     MTRANS_Y:number, MPERSP_0:number, MPERSP_1:number, MPERSP_2:number){
        //}


        protected drawARGBImpl(a:number, r:number, g:number, b:number):void {
            let graph = new PIXI.Graphics();
            graph.beginFill(Color.argb(a, r, g, b));
            graph.drawRect(this.mCurrentClip.left, this.mCurrentClip.top, this.mCurrentClip.width(), this.mCurrentClip.height());
            this.addDisplay(graph);
        }

        protected clearRectImpl(left:number, top:number, width:number, height:number):void {
            let graph = new PIXI.Graphics();
            graph.beginFill(Color.WHITE);
            graph.drawRect(left, top, width, height);
            this.addDisplay(graph);
        }

        protected saveImpl():void {
            let clone = this.saveData.clone();
            this.saveDataArray.push(clone);
            this.saveData = clone;
        }

        protected restoreImpl():void {
            this.saveData = this.saveDataArray.pop();
        }

        protected clipRectImpl(left:number, top:number, width:number, height:number):void {
            let graph = new PIXI.Graphics();
            graph.beginFill(Color.TRANSPARENT);
            graph.drawRect(left, top, width, height);
            this.addClip(graph);
        }

        protected clipRoundRectImpl(left:number, top:number, width:number, height:number, radiusTopLeft:number,
                                    radiusTopRight:number, radiusBottomRight:number, radiusBottomLeft:number):void {
            let graph = this.getRoundRectShape(left, top, width, height, radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft);
            this.addClip(graph);
        }

        private getRoundRectShape(left:number, top:number, width:number, height:number, radiusTopLeft:number,
                                radiusTopRight:number, radiusBottomRight:number, radiusBottomLeft:number, style?:Paint.Style):Graphics {
            let graph = new PIXI.Graphics();
            if(style!=null) this.applyFillOrStroke(graph, style);

            let scale1 = height / (radiusTopLeft + radiusBottomLeft);
            let scale2 = height / (radiusTopRight + radiusBottomRight);
            let scale3 = width / (radiusTopLeft + radiusTopRight);
            let scale4 = width / (radiusBottomLeft + radiusBottomRight);
            let scale = Math.min(scale1, scale2, scale3, scale4);
            if(scale<1) {
                radiusTopLeft *= scale;
                radiusTopRight *= scale;
                radiusBottomRight *= scale;
                radiusBottomLeft *= scale;
            }

            graph.moveTo(left+radiusTopLeft, top);
            graph.arcTo(left+width, top, left+width, top+radiusTopRight, radiusTopRight);
            graph.arcTo(left+width, top+height, left+width-radiusBottomRight, top+height, radiusBottomRight);
            graph.arcTo(left, top+height, left, top+height-radiusBottomLeft, radiusBottomLeft);
            graph.arcTo(left, top, left+radiusTopLeft, top, radiusTopLeft);

            graph.endFill();

            return graph;
        }


        protected drawCanvasImpl(canvas:Canvas, offsetX:number, offsetY:number):void {
            this.translateImpl(offsetX, offsetY);
            if(canvas instanceof PIXICanvas){
                this.addDisplay(canvas.stage);
                if(canvas.getWidth()<=2048 && canvas.getHeight()<=2048) canvas.stage.cacheAsBitmap = true;
            }else{
                let sprite = new PIXI.Sprite(Texture.fromCanvas(canvas.mCanvasElement));
                this.addDisplay(sprite);
                sprite.cacheAsBitmap = true;
            }
            this.translateImpl(-offsetX, -offsetY);
        }

        protected drawImageImpl(image:NetImage, srcRect?:Rect, dstRect?:Rect):void {
            let texture:PIXI.Texture;
            if(srcRect){
                texture = new Texture(BaseTexture.fromImage(image.src), new Rectangle(srcRect.left, srcRect.top, srcRect.width(), srcRect.height()));
            }else{
                texture = new Texture(BaseTexture.fromImage(image.src));
            }
            let sprite = new Sprite(texture);
            if(dstRect){
                sprite.x = dstRect.left;
                sprite.y = dstRect.top;
                sprite.width = dstRect.width();
                sprite.height = dstRect.height();
            }
            this.addDisplay(sprite);
        }

        private applyFillOrStroke(graph:Graphics, style:Paint.Style){
            switch (style){
                case Paint.Style.STROKE:
                    graph.lineStyle(this.saveData.lineWidth, this.saveData.lineColor);
                    break;
                case Paint.Style.FILL_AND_STROKE:
                    graph.lineStyle(this.saveData.lineWidth, this.saveData.lineColor);
                    graph.beginFill(this.saveData.color);
                    break;
                case Paint.Style.FILL:
                default :
                    graph.beginFill(this.saveData.color);
                    break;
            }
        }

        protected drawRectImpl(left:number, top:number, width:number, height:number, style:Paint.Style){
            let graph = new PIXI.Graphics();
            this.applyFillOrStroke(graph, style);
            graph.drawRect(left, top, width, height);
            graph.endFill();
            this.addDisplay(graph);
        }

        protected drawOvalImpl(oval:RectF, style:Paint.Style):void {
            let graph = new PIXI.Graphics();
            this.applyFillOrStroke(graph, style);

            let cx = oval.centerX();
            let cy = oval.centerY();
            let rx = oval.width()/2;
            let ry = oval.height()/2;

            graph.x = (cx-rx) / rx;
            graph.y = (cy-ry) / ry;
            graph.scale.x = rx;
            graph.scale.y = ry;
            graph.arc(1, 1, 1, 0, 2 * Math.PI, false);
            graph.endFill();
            this.addDisplay(graph);
        }

        protected drawCircleImpl(cx:number, cy:number, radius:number, style:Paint.Style):void  {
            let graph = new PIXI.Graphics();
            this.applyFillOrStroke(graph, style);
            graph.arc(cx, cy, radius, 0, 2 * Math.PI, false);
            graph.endFill();
            this.addDisplay(graph);
        }

        protected drawArcImpl(oval:RectF, startAngle:number, sweepAngle:number, useCenter:boolean, style:Paint.Style):void  {
            let graph = new PIXI.Graphics();
            this.applyFillOrStroke(graph, style);

            let cx = oval.centerX();
            let cy = oval.centerY();
            let rx = oval.width()/2;
            let ry = oval.height()/2;

            graph.x = (cx-rx) / rx;
            graph.y = (cy-ry) / ry;
            graph.scale.x = rx;
            graph.scale.y = ry;
            graph.arc(1, 1, 1, startAngle / 180 * Math.PI, (sweepAngle+startAngle) / 180 * Math.PI, false);
            if(useCenter){
                graph.lineTo(1, 1);
            }
            graph.endFill();
            this.addDisplay(graph);
        }

        protected drawRoundRectImpl(rect:RectF, radiusTopLeft:number,
                                    radiusTopRight:number, radiusBottomRight:number, radiusBottomLeft:number, style:Paint.Style):void  {
            let graph = this.getRoundRectShape(rect.left, rect.top, rect.width(), rect.height(),
                radiusTopLeft, radiusTopRight, radiusBottomRight, radiusBottomLeft, style);
            this.addDisplay(graph);
        }

        protected drawTextImpl(text:string, x:number, y:number, style:Paint.Style):void {
            let textShape = new Text(text);
            textShape.x = x;
            textShape.y = y;

            switch (style){
                case Paint.Style.STROKE:
                    textShape.style.stroke = this.saveData.lineColor;
                    break;
                case Paint.Style.FILL_AND_STROKE:
                    textShape.style.stroke = this.saveData.color;
                    textShape.style.stroke = this.saveData.lineColor;
                    break;
                case Paint.Style.FILL:
                default :
                    textShape.style.stroke = this.saveData.color;
                    break;
            }
            if(this.saveData.textAlign) textShape.style.align = this.saveData.textAlign;
            if(this.saveData.font) textShape.style.font = this.saveData.font;

            this.addDisplay(textShape);
        }

        protected setColorImpl(color:number, style?:Paint.Style):void {
            switch (style){
                case Paint.Style.STROKE:
                    this.saveData.lineColor = color;
                    break;
                case Paint.Style.FILL:
                    this.saveData.color = color;
                    break;
                default :
                case Paint.Style.FILL_AND_STROKE:
                    this.saveData.color = color;
                    this.saveData.lineColor = color;
                    break;
            }
        }

        protected multiplyAlphaImpl(alpha:number):void {
            this.saveData.globalAlpha *= alpha;
        }

        protected setAlphaImpl(alpha:number):void {
            this.saveData.globalAlpha = alpha;
        }

        protected setTextAlignImpl(align:string):void {
            this.saveData.textAlign = align;
        }

        protected setLineWidthImpl(width:number):void {
            this.saveData.lineWidth = width;
        }

        protected setLineCapImpl(lineCap:string):void {

        }

        protected setLineJoinImpl(lineJoin:string):void {

        }

        protected setShadowImpl(radius:number, dx:number, dy:number, color:number):void {

        }

        protected setFontSizeImpl(size:number):void {
            //font
            const fontStyles = [];
            if (size != null) {
                fontStyles.push(size + 'px');
            }
            if (fontStyles.length > 0) {
                let cFont = this.saveData.font;
                let fontParts = cFont.split(' ');
                fontStyles.push(fontParts[fontParts.length - 1]);//font family
                let font = fontStyles.join(' ');
                if(font!=cFont) this.saveData.font = font;
            }
        }

        protected setFontImpl(fontName:string):void {
            let cFont = this.saveData.font;
            let fontParts = cFont.split(' ');
            fontParts[fontParts.length - 1] = fontName;//font family
            let font = fontParts.join(' ');
            if(font!=cFont) this.saveData.font = font;
        }
    }


    class SaveData {
        private static DefaultFont = Canvas._measureTextContext.font;

        matrix:android.graphics.Matrix;
        clipShape:Graphics;
        contentUnderClip:Container;

        lineWidth = 0;
        lineColor = 0;
        color = 0;
        globalAlpha = 1;
        textAlign:string;
        font=SaveData.DefaultFont;

        constructor(clone?:SaveData) {
            if(clone){
                this.matrix = new android.graphics.Matrix(clone.matrix);
                this.clipShape = clone.clipShape;
                this.contentUnderClip = clone.contentUnderClip;

                this.lineWidth = clone.lineWidth;
                this.lineColor = clone.lineColor;
                this.color = clone.color;
                this.globalAlpha = clone.globalAlpha;
                this.textAlign = clone.textAlign;
                this.font = clone.font;

            }else{
                this.matrix = new android.graphics.Matrix();
                this.contentUnderClip = new Container();
            }

        }

        clone():SaveData {
            return new SaveData(this);
        }
    }
}