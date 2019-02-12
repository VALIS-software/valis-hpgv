export class CSSUtil {

    static parseColor(color: string) {
        // use canvas 2d api to write a pixel given a CSS color, then read the written pixel RGBA
        let ctx = this.get1pxCtx();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        let rgbaUInt8 = ctx.getImageData(0, 0, 1, 1).data;
        return [
            rgbaUInt8[0] / 0xff,
            rgbaUInt8[1] / 0xff,
            rgbaUInt8[2] / 0xff,
            rgbaUInt8[3] / 0xff
        ];
    }

    private static _1pxCtx: CanvasRenderingContext2D;
    private static get1pxCtx() {
        if (this._1pxCtx == null) {
            let canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            this._1pxCtx = canvas.getContext('2d');
            this._1pxCtx.globalCompositeOperation = 'copy';
        }
        return this._1pxCtx;
    }

}