"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Canvas = void 0;
const dist_commonjs_1 = require("@iiif/vocabulary/dist-commonjs/");
const path_1 = require("path");
const Directory_1 = require("./Directory");
const glob_promise_1 = require("glob-promise");
const Utils_1 = require("./Utils");
const annotation_json_1 = __importDefault(require("./boilerplate/annotation.json"));
const config_json_1 = __importDefault(require("./config.json"));
const hocr_json_1 = __importDefault(require("./boilerplate/hocr.json"));
const imageservice_json_1 = __importDefault(require("./boilerplate/imageservice.json"));
const url_join_1 = __importDefault(require("url-join"));
class Canvas {
    constructor(filePath, parentDirectory) {
        this.infoYml = {};
        this._config = config_json_1.default;
        this.filePath = filePath;
        if (!Utils_1.isDirectory(this.filePath)) {
            this.directoryFilePath = path_1.dirname(this.filePath);
        }
        else {
            this.directoryFilePath = this.filePath;
        }
        this.parentDirectory = parentDirectory;
        // we only need a directory object to reference the parent directory when determining the virtual path of this canvas
        // this.directory.read() is never called.
        this.directory = new Directory_1.Directory(this.directoryFilePath, this.parentDirectory.url.href, undefined, this.parentDirectory);
        this.url = parentDirectory.url;
    }
    _isCanvasDirectory() {
        return path_1.basename(this.directoryFilePath).startsWith("_");
    }
    async read(canvasJson) {
        if (this.directory.parentDirectory.isManifest) {
            this.directory.isCanvas = true;
        }
        else {
            // there's no parent manifest directory, so this must be a manifest directory
            this.directory.isManifest = true;
        }
        this.canvasJson = canvasJson;
        await this._getInfo();
        this._applyInfo();
        // if the directoryPath starts with an underscore
        if (this._isCanvasDirectory()) {
            // first, determine if there are any custom annotations (files ending in .yml that aren't info.yml)
            // if there are, loop through them creating the custom annotations.
            // if none of them has a motivation of 'painting', loop through all paintable file types adding them to the canvas.
            const customAnnotationFiles = await glob_promise_1.promise(this.directoryFilePath + "/*.yml", {
                ignore: ["**/info.yml"],
            });
            // sort files
            customAnnotationFiles.sort((a, b) => {
                return Utils_1.compare(a, b);
            });
            await Promise.all(customAnnotationFiles.map(async (file) => {
                let directoryName = path_1.dirname(file);
                directoryName = directoryName.substr(directoryName.lastIndexOf("/"));
                const name = path_1.basename(file, path_1.extname(file));
                const annotationJson = Utils_1.cloneJson(annotation_json_1.default);
                const yml = await Utils_1.readYml(file);
                annotationJson.id = url_join_1.default(canvasJson.id, "annotation", canvasJson.items[0].items.length);
                let motivation = yml.motivation;
                if (!motivation) {
                    // assume painting
                    motivation = Utils_1.normaliseType(dist_commonjs_1.AnnotationMotivation.PAINTING);
                    Utils_1.warn(`motivation property missing in ${file} guessed ${motivation}`);
                }
                motivation = Utils_1.normaliseType(motivation);
                annotationJson.motivation = motivation;
                annotationJson.target = canvasJson.id;
                let id;
                // if the motivation is painting, or isn't recognised, set the id to the path of the yml value
                if ((motivation.toLowerCase() ===
                    Utils_1.normaliseType(dist_commonjs_1.AnnotationMotivation.PAINTING) ||
                    !this._config.annotation.motivations[motivation]) &&
                    yml.value &&
                    path_1.extname(yml.value)) {
                    if (Utils_1.isURL(yml.value)) {
                        id = yml.value;
                    }
                    else {
                        id = url_join_1.default(this.url.href, directoryName, yml.value);
                    }
                    // if the painting annotation has a target.
                    if (yml.xywh) {
                        id += "#xywh=" + yml.xywh;
                    }
                }
                else {
                    id = url_join_1.default(this.url.href, "index.json", "annotations", name);
                }
                annotationJson.body.id = id;
                if (yml.type) {
                    annotationJson.body.type = yml.type;
                }
                else if (yml.value && path_1.extname(yml.value)) {
                    // guess the type from the extension
                    const type = Utils_1.getTypeByExtension(motivation, path_1.extname(yml.value));
                    if (type) {
                        annotationJson.body.type = type;
                        Utils_1.warn(`type property missing in ${file}, guessed ${type}`);
                    }
                }
                else if (yml.format) {
                    // guess the type from the format
                    const type = Utils_1.getTypeByFormat(motivation, yml.format);
                    if (type) {
                        annotationJson.body.type = type;
                        Utils_1.warn(`type property missing in ${file}, guessed ${type}`);
                    }
                }
                if (!annotationJson.body.type) {
                    delete annotationJson.body.type;
                    Utils_1.warn(`unable to determine type of ${file}`);
                }
                if (yml.format) {
                    annotationJson.body.format = yml.format;
                }
                else if (yml.value && path_1.extname(yml.value) && yml.type) {
                    // guess the format from the extension and type
                    const format = Utils_1.getFormatByExtensionAndType(motivation, path_1.extname(yml.value), yml.type);
                    if (format) {
                        annotationJson.body.format = format;
                        Utils_1.warn(`format property missing in ${file}, guessed ${format}`);
                    }
                }
                else if (yml.value && path_1.extname(yml.value)) {
                    // guess the format from the extension
                    const format = Utils_1.getFormatByExtension(motivation, path_1.extname(yml.value));
                    if (format) {
                        annotationJson.body.format = format;
                        Utils_1.warn(`format property missing in ${file}, guessed ${format}`);
                    }
                }
                else if (yml.type) {
                    // can only guess the format from the type if there is one typeformat for this motivation.
                    const format = Utils_1.getFormatByType(motivation, yml.type);
                    if (format) {
                        annotationJson.body.format = format;
                        Utils_1.warn(`format property missing in ${file}, guessed ${format}`);
                    }
                }
                if (!annotationJson.body.format) {
                    delete annotationJson.body.format;
                    Utils_1.warn(`unable to determine format of ${file}`);
                }
                if (yml.label) {
                    annotationJson.body.label = Utils_1.getLabel(yml.label);
                    canvasJson.label = Utils_1.getLabel(yml.label);
                }
                else {
                    annotationJson.body.label = Utils_1.getLabel(this.infoYml.label);
                }
                // if the annotation is an image and the id points to an info.json
                // add an image service pointing to the info.json
                if (annotationJson.body.type &&
                    annotationJson.body.type.toLowerCase() ===
                        dist_commonjs_1.ExternalResourceType.IMAGE &&
                    path_1.extname(annotationJson.body.id) === ".json") {
                    const service = Utils_1.cloneJson(imageservice_json_1.default);
                    service[0].id = annotationJson.body.id.substr(0, annotationJson.body.id.lastIndexOf("/"));
                    annotationJson.body.service = service;
                }
                // if there's a value, and we're using a recognised motivation (except painting)
                if (yml.value &&
                    this._config.annotation.motivations[motivation] &&
                    motivation !== Utils_1.normaliseType(dist_commonjs_1.AnnotationMotivation.PAINTING)) {
                    annotationJson.body.value = yml.value;
                }
                if (yml.value && !Utils_1.isURL(yml.value) && annotationJson.body.type) {
                    // get the path to the annotated file
                    const dirName = path_1.dirname(file);
                    let path = path_1.join(dirName, yml.value);
                    path = Utils_1.normaliseFilePath(path);
                    await Utils_1.getFileDimensions(annotationJson.body.type, path, canvasJson, annotationJson);
                }
                canvasJson.items[0].items.push(annotationJson);
            }));
            // for each jpg/pdf/mp4/obj in the canvas directory
            // add a painting annotation
            const paintableFiles = await glob_promise_1.promise(this.directoryFilePath + "/*.*", {
                ignore: [
                    "**/thumb.*",
                    "**/info.yml*",
                ],
            });
            // sort files
            paintableFiles.sort((a, b) => {
                return Utils_1.compare(a, b);
            });
            await this._annotateFiles(canvasJson, paintableFiles);
        }
        else {
            // a file was passed (not a directory starting with an underscore)
            // therefore, just annotate that file onto the canvas.
            await this._annotateFiles(canvasJson, [this.filePath]);
        }
        if (!canvasJson.items[0].items.length) {
            Utils_1.warn(`Could not find any files to annotate onto ${this.directoryFilePath}`);
        }
        // if there's no thumb.[jpg, gif, png]
        // generate one from the first painted image
        await Utils_1.getThumbnail(this.canvasJson, this.directory, this.directoryFilePath);
    }
    async _annotateFiles(canvasJson, files) {
        await Promise.all(files.map(async (file) => {
            file = Utils_1.normaliseFilePath(file);
            const extName = path_1.extname(file);
            // if this._config.annotation has a matching extension
            let defaultPaintingExtension = this._config.annotation.motivations.painting[extName];
            let directoryName = "";
            // if the canvas is being generated from a canvas directory (starts with an _)
            if (this._isCanvasDirectory()) {
                directoryName = path_1.dirname(file);
                directoryName = directoryName.substr(directoryName.lastIndexOf("/"));
            }
            const fileName = path_1.basename(file);
            const id = url_join_1.default(this.url.href, directoryName, fileName);
            if (defaultPaintingExtension) {
                defaultPaintingExtension = defaultPaintingExtension[0];
                const annotationJson = Utils_1.cloneJson(annotation_json_1.default);
                annotationJson.id = url_join_1.default(canvasJson.id, "annotation", canvasJson.items[0].items.length);
                annotationJson.motivation = Utils_1.normaliseType(dist_commonjs_1.AnnotationMotivation.PAINTING);
                annotationJson.target = canvasJson.id;
                annotationJson.body.id = id;
                annotationJson.body.type = defaultPaintingExtension.type;
                annotationJson.body.format = defaultPaintingExtension.format;
                annotationJson.body.label = Utils_1.getLabel(this.infoYml.label);
                canvasJson.items[0].items.push(annotationJson);
                await Utils_1.getFileDimensions(defaultPaintingExtension.type, file, canvasJson, annotationJson);
                const hocrFiles = await glob_promise_1.promise(this.directoryFilePath + "/*.hocr");
                if (hocrFiles) {
                    const hocrFile = hocrFiles[0];
                    if (hocrFile) {
                        console.log("Found hOCR file " + hocrFiles[0]);
                        if (this._isCanvasDirectory()) {
                            directoryName = path_1.dirname(hocrFile);
                            directoryName = directoryName.substr(directoryName.lastIndexOf("/"));
                        }
                        const hocrFileName = path_1.basename(hocrFile);
                        const hocrId = url_join_1.default(this.url.href, directoryName, hocrFileName);
                        const hocrJson = Utils_1.cloneJson(hocr_json_1.default);
                        hocrJson["@id"] = hocrId;
                        canvasJson.seeAlso = hocrJson;
                    }
                }
                if (defaultPaintingExtension.type.toLowerCase() ===
                    dist_commonjs_1.ExternalResourceType.IMAGE) {
                    await Utils_1.generateImageTiles(file, this.url.href, directoryName, this.directoryFilePath, annotationJson);
                }
            }
        }));
    }
    async _getInfo() {
        this.infoYml = {};
        // if there's an info.yml
        const ymlPath = path_1.join(this.directoryFilePath, "info.yml");
        const exists = await Utils_1.fileExists(ymlPath);
        if (exists) {
            this.infoYml = await Utils_1.readYml(ymlPath);
            Utils_1.log(`got metadata for: ${this.directoryFilePath}`);
        }
        else {
            Utils_1.log(`no metadata found for: ${this.directoryFilePath}`);
        }
        if (!this.infoYml.label) {
            // default to the directory name
            this.infoYml.label = path_1.basename(this.directoryFilePath);
        }
    }
    _applyInfo() {
        this.canvasJson.label = Utils_1.getLabel(this.infoYml.label); // defaults to directory name
        if (this.infoYml.width) {
            this.canvasJson.width = this.infoYml.width;
        }
        if (this.infoYml.height) {
            this.canvasJson.height = this.infoYml.height;
        }
        if (this.infoYml.duration) {
            this.canvasJson.duration = this.infoYml.duration;
        }
        if (this.infoYml.metadata) {
            this.canvasJson.metadata = Utils_1.formatMetadata(this.infoYml.metadata);
        }
    }
}
exports.Canvas = Canvas;
//# sourceMappingURL=Canvas.js.map