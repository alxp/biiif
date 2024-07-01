"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Directory = void 0;
const Canvas_1 = require("./Canvas");
const path_1 = require("path");
const glob_promise_1 = require("glob-promise");
const url_1 = require("url");
const Utils_1 = require("./Utils");
// import urljoin from "url-join";
const urljoin = require("url-join");
// boilerplate json
const canvas_json_1 = __importDefault(require("./boilerplate/canvas.json"));
const collection_json_1 = __importDefault(require("./boilerplate/collection.json"));
const collectionitem_json_1 = __importDefault(require("./boilerplate/collectionitem.json"));
const manifest_json_1 = __importDefault(require("./boilerplate/manifest.json"));
const manifestitem_json_1 = __importDefault(require("./boilerplate/manifestitem.json"));
const thumbnail_json_1 = __importDefault(require("./boilerplate/thumbnail.json"));
class Directory {
    constructor(directoryFilePath, url, virtualName, parentDirectory) {
        this.directories = [];
        this.isCanvas = false;
        this.isCollection = false;
        this.isManifest = false;
        this.items = [];
        this.directoryFilePath = directoryFilePath;
        this.url = new url_1.URL(url);
        this.parentDirectory = parentDirectory;
        this.virtualName = virtualName;
    }
    async read() {
        // canvases are directories starting with an underscore
        const canvasesPattern = this.directoryFilePath + "/_*";
        const canvases = await glob_promise_1.promise(canvasesPattern, {
            ignore: ["**/*.yml", "**/thumb.*", "**/!*"],
        });
        // sort canvases
        canvases.sort((a, b) => {
            return Utils_1.compare(a, b);
        });
        await Promise.all(canvases.map(async (canvas) => {
            Utils_1.log(`creating canvas for: ${canvas}`);
            this.items.push(new Canvas_1.Canvas(canvas, this));
        }));
        // directories not starting with an underscore
        // these can be child manifests or child collections
        const directoriesPattern = this.directoryFilePath + "/*";
        const directories = await glob_promise_1.promise(directoriesPattern, {
            ignore: [
                "**/*.{crt,drc,epub,glb,gltf,gz,stl,jpg,jpeg,json,md,mp3,mp4,nii,obj,opf,pdf,ply,png,tif,tiff,toml,usdz,vtt,yml}",
                "**/_*",
                "**/+*",
                "**/!*",
            ],
        });
        // sort
        directories.sort((a, b) => {
            return Utils_1.compare(a, b);
        });
        if (canvases.length) {
            this.isManifest = true;
        }
        else if (directories.length > 0 ||
            (await Utils_1.hasManifestsYml(this.directoryFilePath))) {
            this.isCollection = true;
        }
        await Promise.all(directories.map(async (directory) => {
            Utils_1.log(`creating directory for: ${directory}`);
            const name = path_1.basename(directory);
            const url = urljoin(this.url.href, name);
            const newDirectory = new Directory(directory, url, undefined, this);
            await newDirectory.read();
            this.directories.push(newDirectory);
        }));
        // if there are no canvas, manifest, or collection directories to read,
        // but there are paintable files in the current directory,
        // create a canvas for each.
        if (!this.directories.length && !canvases.length) {
            const paintableFiles = await glob_promise_1.promise(this.directoryFilePath + "/*.*", {
                ignore: ["**/*.yml", "**/thumb.*", "**/index.json"],
            });
            // sort files
            paintableFiles.sort((a, b) => {
                return Utils_1.compare(a, b);
            });
            paintableFiles.forEach((file) => {
                Utils_1.log(`creating canvas for: ${file}`);
                this.items.push(new Canvas_1.Canvas(file, this));
            });
        }
        await this._getInfo();
        await this._createIndexJson();
        if (this.isCollection) {
            Utils_1.log(`created collection: ${this.directoryFilePath}`);
            // if there are canvases, warn that they are being ignored
            if (this.items.length) {
                Utils_1.warn(`${this.items.length} unused canvas directories (starting with an underscore) found in the ${this.directoryFilePath} collection. Remove directories not starting with an underscore to convert into a manifest.`);
            }
        }
        else {
            Utils_1.log(`created manifest: ${this.directoryFilePath}`);
            // if there aren't any canvases, warn that there should be
            if (!this.items.length) {
                Utils_1.warn(`${this.directoryFilePath} is a manifest, but no canvases (directories starting with an underscore) were found. Therefore it will not have any content.`);
            }
        }
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
    async _createIndexJson() {
        if (this.isCollection) {
            this.indexJson = Utils_1.cloneJson(collection_json_1.default);
            // for each child directory, add a collectionitem or manifestitem json boilerplate to items.
            await Promise.all(this.directories.map(async (directory) => {
                let itemJson;
                if (directory.isCollection) {
                    itemJson = Utils_1.cloneJson(collectionitem_json_1.default);
                }
                else {
                    itemJson = Utils_1.cloneJson(manifestitem_json_1.default);
                }
                itemJson.id = urljoin(directory.url.href, "index.json");
                itemJson.label = Utils_1.getLabel(directory.infoYml.label);
                await Utils_1.getThumbnail(itemJson, directory);
                this.indexJson.items.push(itemJson);
            }));
            // check for manifests.yml. if it exists, parse and add to items
            const hasYml = await Utils_1.hasManifestsYml(this.directoryFilePath);
            if (hasYml) {
                const manifestsPath = path_1.join(this.directoryFilePath, "manifests.yml");
                const manifestsYml = await Utils_1.readYml(manifestsPath);
                manifestsYml.manifests.forEach((manifest) => {
                    const itemJson = Utils_1.cloneJson(manifestitem_json_1.default);
                    itemJson.id = manifest.id;
                    if (manifest.label) {
                        itemJson.label = Utils_1.getLabel(manifest.label);
                    }
                    else {
                        // no label supplied, use the last fragment of the url
                        const url = new url_1.URL(itemJson.id);
                        const pathname = url.pathname.split("/");
                        if (pathname.length > 1) {
                            itemJson.label = Utils_1.getLabel(pathname[pathname.length - 2]);
                        }
                    }
                    if (manifest.thumbnail) {
                        if (typeof manifest.thumbnail === "string") {
                            const thumbnail = Utils_1.cloneJson(thumbnail_json_1.default);
                            thumbnail[0].id = manifest.thumbnail;
                            itemJson.thumbnail = thumbnail;
                        }
                        else {
                            itemJson.thumbnail = manifest.thumbnail;
                        }
                    }
                    this.indexJson.items.push(itemJson);
                });
                Utils_1.log(`parsed manifests.yml for ${this.directoryFilePath}`);
            }
            else {
                Utils_1.log(`no manifests.yml found for: ${this.directoryFilePath}`);
            }
            // sort items
            this.indexJson.items.sort((a, b) => {
                return Utils_1.compare(a.label["@none"][0].toLowerCase(), b.label["@none"][0].toLowerCase());
            });
        }
        else {
            this.indexJson = Utils_1.cloneJson(manifest_json_1.default);
            // for each canvas, add canvas json
            let index = 0;
            for (const canvas of this.items) {
                const canvasJson = Utils_1.cloneJson(canvas_json_1.default);
                canvasJson.id = urljoin(this.url.href, "index.json/canvas", index);
                canvasJson.items[0].id = urljoin(this.url.href, "index.json/canvas", index, "annotationpage/0");
                await canvas.read(canvasJson);
                // add canvas to items
                this.indexJson.items.push(canvasJson);
                index++;
            }
            this.indexJson.items.sort((a, b) => {
                return Utils_1.compare(a.id, b.id);
            });
        }
        this.indexJson.id = urljoin(this.url.href, "index.json");
        this._applyInfo();
        await Utils_1.getThumbnail(this.indexJson, this);
        // write index.json
        const path = path_1.join(this.directoryFilePath, "index.json");
        const json = JSON.stringify(this.indexJson, null, "  ");
        Utils_1.log(`creating index.json for: ${this.directoryFilePath}`);
        await Utils_1.writeJson(path, json);
    }
    _applyInfo() {
        this.indexJson.label = Utils_1.getLabel(this.infoYml.label); // defaults to directory name
        if (this.infoYml.metadata) {
            this.indexJson.metadata = Utils_1.formatMetadata(this.infoYml.metadata);
        }
        // add manifest-specific properties
        if (!this.isCollection) {
            if (this.infoYml.attribution) {
                this.indexJson.attribution = this.infoYml.attribution;
            }
            if (this.infoYml.description) {
                this.indexJson.description = this.infoYml.description;
            }
            if (this.infoYml.behavior) {
                this.indexJson.behavior = [];
                if (Array.isArray(this.infoYml.behavior)) {
                    this.infoYml.behavior.forEach((behavior) => {
                        this.indexJson.behavior.push(behavior);
                    });
                }
                else {
                    this.indexJson.behavior.push(this.infoYml.behavior);
                }
            }
        }
    }
}
exports.Directory = Directory;
//# sourceMappingURL=Directory.js.map