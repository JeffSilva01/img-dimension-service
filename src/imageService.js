"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processImage = processImage;
const sharp_1 = __importDefault(require("sharp"));
const exifreader_1 = __importDefault(require("exifreader"));
const DEFAULT_DPI = 72;
async function processImage(buffer) {
    const metadata = await getImageMetadata(buffer);
    return calculatePhysicalDimensions(metadata);
}
async function getImageMetadata(buffer) {
    const sharpMetadata = await (0, sharp_1.default)(buffer).metadata();
    let dpi_x = DEFAULT_DPI;
    let dpi_y = DEFAULT_DPI;
    try {
        const exifTags = exifreader_1.default.load(buffer);
        if (exifTags['XResolution'] && exifTags['YResolution']) {
            const xRes = exifTags['XResolution'];
            const yRes = exifTags['YResolution'];
            if (xRes.value && yRes.value) {
                if (Array.isArray(xRes.value) && xRes.value.length >= 2) {
                    dpi_x = Number(xRes.value[0]) / Number(xRes.value[1]);
                }
                else if (typeof xRes.value === 'number') {
                    dpi_x = xRes.value;
                }
                if (Array.isArray(yRes.value) && yRes.value.length >= 2) {
                    dpi_y = Number(yRes.value[0]) / Number(yRes.value[1]);
                }
                else if (typeof yRes.value === 'number') {
                    dpi_y = yRes.value;
                }
            }
        }
    }
    catch (error) {
        console.warn('Could not read EXIF data, using default DPI:', error);
    }
    return {
        width: sharpMetadata.width || 0,
        height: sharpMetadata.height || 0,
        dpi_x,
        dpi_y,
    };
}
function calculatePhysicalDimensions(metadata) {
    const dpi_x = metadata.dpi_x || DEFAULT_DPI;
    const dpi_y = metadata.dpi_y || DEFAULT_DPI;
    const width_mm = (metadata.width / dpi_x) * 25.4;
    const height_mm = (metadata.height / dpi_y) * 25.4;
    return {
        width_mm: Math.round(width_mm * 100) / 100,
        height_mm: Math.round(height_mm * 100) / 100,
        dpi_x,
        dpi_y,
    };
}
//# sourceMappingURL=imageService.js.map