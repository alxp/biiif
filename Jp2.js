import { extname } from "path";
import chalk from "chalk";
import fs from "fs";
import sharp from "sharp";
// JPEG 2000 support: sharp's prebuilt binaries don't include the OpenJPEG
// loader, so when sharp can't decode a .jp2 file we fall back to a WASM
// build of OpenJPEG and feed the raw pixels to sharp for everything else.
let wasmModule;
let sharpJp2Support;
const getWasm = async () => {
    if (!wasmModule) {
        const init = (await import("@cornerstonejs/codec-openjpeg/wasmjs")).default;
        // Silence the decoder's [INFO] logging; printErr is left as the default
        // so genuine diagnostics still surface.
        wasmModule = await (typeof init === "function"
            ? init({ print: () => { } })
            : init);
    }
    return wasmModule;
};
export const isJp2 = (file) => extname(file).toLowerCase() === ".jp2";
// Detects whether sharp can decode JPEG 2000 natively (e.g. when built
// against a libvips that includes OpenJPEG). Cached after the first check.
export const sharpSupportsJp2 = async (file) => {
    if (sharpJp2Support === undefined) {
        try {
            await sharp(file, { limitInputPixels: true }).metadata();
            sharpJp2Support = true;
        }
        catch (_a) {
            sharpJp2Support = false;
        }
    }
    return sharpJp2Support;
};
export const decodeJp2ToRaw = async (file) => {
    const openjpeg = await getWasm();
    const bytes = fs.readFileSync(file);
    try {
        const decoder = new openjpeg.J2KDecoder();
        decoder.getEncodedBuffer(bytes.length).set(bytes);
        decoder.decode();
        const frame = decoder.getFrameInfo();
        return {
            buffer: Buffer.from(decoder.getDecodedBuffer()),
            width: frame.width,
            height: frame.height,
            channels: (frame.componentCount || 3),
        };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`Couldn't decode JPEG 2000 image ${file}: ${message}. ` +
            "If this file is valid, rebuilding sharp against a libvips that " +
            "includes OpenJPEG will enable native JPEG 2000 support (see README).");
    }
};
// Returns a sharp pipeline for the image, decoding JPEG 2000 via the WASM
// OpenJPEG fallback when sharp can't read it natively.
export const readImage = async (file) => {
    if (!isJp2(file)) {
        return sharp(file, { limitInputPixels: true });
    }
    const native = await sharpSupportsJp2(file);
    logJp2Mode(native);
    if (native) {
        return sharp(file, { limitInputPixels: true });
    }
    const raw = await decodeJp2ToRaw(file);
    return sharp(raw.buffer, {
        limitInputPixels: true,
        raw: { width: raw.width, height: raw.height, channels: raw.channels },
    });
};
// Reports which JPEG 2000 decoder is in use, once per process.
let jp2ModeLogged = false;
const logJp2Mode = (native) => {
    if (!jp2ModeLogged) {
        jp2ModeLogged = true;
        console.log(chalk.green(native
            ? "using sharp (native) for JPEG 2000 decoding"
            : "using OpenJPEG (WASM) for JPEG 2000 decoding"));
    }
};
//# sourceMappingURL=Jp2.js.map