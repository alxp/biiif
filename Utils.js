import { AnnotationMotivation, ExternalResourceType, } from "@iiif/vocabulary/dist-commonjs/index.js";
import { dirname, extname } from "path";
import { join, basename } from "path";
import { glob } from "glob";
import chalk from "chalk";
import config from "./config.json" with { type: "json" };
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import isurl from "is-url";
import jsonfile from "jsonfile";
import labelBoilerplate from "./boilerplate/label.json" with { type: "json" };
import thumbnailBoilerplate from "./boilerplate/thumbnail.json" with { type: "json" };
import urljoin from "url-join";
import yaml from "js-yaml";
import sharp from "sharp";
const _config = config;
export const compare = (a, b) => {
    const collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: "base",
    });
    return collator.compare(a, b);
};
export const normaliseType = (type) => {
    type = type.toLowerCase();
    if (type.indexOf(":") !== -1) {
        const split = type.split(":");
        return split[1];
    }
    return type;
};
export const getTypeByExtension = (motivation, extension) => {
    motivation = normaliseType(motivation);
    const m = _config.annotation.motivations[motivation];
    if (m) {
        if (m[extension] && m[extension].length) {
            return m[extension][0].type;
        }
    }
    return null;
};
export const getFormatByExtension = (motivation, extension) => {
    motivation = normaliseType(motivation);
    const m = _config.annotation.motivations[motivation];
    if (m) {
        if (m[extension] && m[extension].length) {
            return m[extension][0].format;
        }
    }
    return null;
};
export const getFormatByExtensionAndType = (motivation, extension, type) => {
    motivation = normaliseType(motivation);
    const m = _config.annotation.motivations[motivation];
    if (m) {
        if (m[extension] && m[extension].length) {
            const typeformats = m[extension];
            for (let i = 0; i < typeformats.length; i++) {
                const typeformat = typeformats[i];
                if (typeformat.type === type) {
                    return typeformat.format;
                }
            }
        }
    }
    return null;
};
export const getTypeByFormat = (motivation, format) => {
    motivation = normaliseType(motivation);
    const m = _config.annotation.motivations[motivation];
    if (m) {
        for (const extension in m) {
            const typeformats = m[extension];
            for (let i = 0; i < typeformats.length; i++) {
                const typeformat = typeformats[i];
                if (typeformat.format === format) {
                    return typeformat.type;
                }
            }
        }
    }
    return null;
};
export const getFormatByType = (motivation, type) => {
    motivation = normaliseType(motivation);
    const m = _config.annotation.motivations[motivation];
    // only able to categorically say there's a matching format
    // if there's a single extension with a single type
    if (m) {
        if (Object.keys(m).length === 1) {
            const typeformats = m[Object.keys(m)[0]];
            if (typeformats.length === 1) {
                return typeformats[0].format;
            }
        }
    }
    return null;
};
export const timeout = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
export const cloneJson = (json) => {
    return JSON.parse(JSON.stringify(json));
};
export const formatMetadata = (metadata) => {
    const formattedMetadata = [];
    for (let key in metadata) {
        if (metadata.hasOwnProperty(key)) {
            const value = metadata[key];
            const item = {};
            item.label = getLabel(key);
            item.value = getLabel(value);
            formattedMetadata.push(item);
        }
    }
    return formattedMetadata;
};
// If filePath is:
// C://Users/edsilv/github/edsilv/biiif-workshop/collection/_abyssinian/thumb.jpeg
// and 'collection' has been replaced by the top-level virtual name 'virtualname'
// it should return:
// C://Users/edsilv/github/edsilv/biiif-workshop/virtualname/_abyssinian/thumb.jpeg
// virtual names are needed when using dat or ipfs ids as the root directory.
export const getVirtualFilePath = (filePath, directory) => {
    // walk up directory parents building the realPath and virtualPath array as we go.
    // at the top level directory, use the real name for realPath and the virtual name for virtualPath.
    // reverse the arrays and join with a '/'.
    // replace the realPath section of filePath with virtualPath.
    let realPath = [basename(filePath)];
    let virtualPath = [basename(filePath)];
    while (directory) {
        const realName = basename(directory.directoryFilePath);
        const virtualName = directory.virtualName || realName;
        realPath.push(realName);
        virtualPath.push(virtualName);
        directory = directory.parentDirectory;
    }
    realPath = realPath.reverse();
    virtualPath = virtualPath.reverse();
    const realPathString = realPath.join("/");
    const virtualPathString = virtualPath.join("/");
    filePath = normaliseFilePath(filePath);
    filePath = filePath.replace(realPathString, virtualPathString);
    return filePath;
};
export const isJsonFile = (path) => {
    return extname(path) === ".json";
};
export const isDirectory = (path) => {
    return fs.lstatSync(path).isDirectory();
};
export const getThumbnail = async (json, directory, filePath) => {
    let fp = filePath || directory.directoryFilePath;
    fp = normaliseFilePath(fp);
    const thumbnailPattern = fp + "/thumb.*";
    const thumbnails = await glob(thumbnailPattern);
    if (thumbnails.length) {
        // there's alrady a thumbnail in the directory, add it to the canvas
        log(`found thumbnail for: ${fp}`);
        let thumbnail = thumbnails[0];
        const thumbnailJson = cloneJson(thumbnailBoilerplate);
        const virtualFilePath = getVirtualFilePath(thumbnail, directory);
        thumbnailJson[0].id = mergePaths(directory.url, virtualFilePath);
        json.thumbnail = thumbnailJson;
    }
    else {
        // there isn't a thumbnail in the directory, so we'll need to generate it.
        // generate thumbnail
        if (json.items && json.items.length && json.items[0].items) {
            // find an annotation with a painting motivation of type image.
            const items = json.items[0].items;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const body = item.body;
                if (body &&
                    item.motivation === normaliseType(AnnotationMotivation.PAINTING)) {
                    // is it an image? (without an info.json)
                    if (body.type.toLowerCase() === ExternalResourceType.IMAGE &&
                        !isJsonFile(body.id)) {
                        let imageName = body.id.substr(body.id.lastIndexOf("/"));
                        if (imageName.includes("#")) {
                            imageName = imageName.substr(0, imageName.lastIndexOf("#"));
                        }
                        const imagePath = normaliseFilePath(join(fp, imageName));
                        let pathToThumb = normaliseFilePath(join(dirname(imagePath), "thumb.jpg"));
                        // todo: this currently assumes that the image to generate a thumb from is within the directory,
                        // but it may be in an assets folder and painted by a custom annotation.
                        // see canvas-with-dimensions-manifest.js
                        if (await fileExists(imagePath)) {
                            //const image: any = await Jimp.read(imagePath);
                            //const thumb: any = image.clone();
                            // write image buffer to disk for testing
                            // image.getBuffer(Jimp.AUTO, (err, buffer) => {
                            //     const arrBuffer = [...buffer];
                            //     const pathToBuffer: string = imagePath.substr(0, imagePath.lastIndexOf('/')) + '/buffer.txt';
                            //     fs.writeFile(pathToBuffer, arrBuffer);
                            // });
                            //thumb.cover(_config.thumbnails.width, _config.thumbnails.height);
                            //thumb.resize(_config.thumbnails.width, Jimp.AUTO);
                            //pathToThumb += image.getExtension();
                            // a thumbnail may already exist at this path (when generating from a flat collection of images)
                            const thumbExists = await fileExists(pathToThumb);
                            if (!thumbExists) {
                                try {
                                    await sharp(imagePath, {
                                        limitInputPixels: true,
                                    })
                                        .resize({
                                        width: _config.thumbnails.width,
                                        height: _config.thumbnails.height,
                                        fit: sharp.fit.cover,
                                    })
                                        .toFormat("jpeg")
                                        .toFile(pathToThumb);
                                    // thumb.write(pathToThumb, () => {
                                    log(`generated thumbnail for: ${fp}`);
                                }
                                catch (_a) {
                                    warn(`unable to generate thumbnail for: ${fp}`);
                                }
                            }
                            else {
                                log(`found thumbnail for: ${fp}`);
                            }
                        }
                        else {
                            // placeholder img path
                            pathToThumb += "jpg";
                        }
                        const thumbnailJson = cloneJson(thumbnailBoilerplate);
                        // const virtualPath: string = getVirtualFilePath(
                        //   pathToThumb,
                        //   directory
                        // );
                        // const mergedPath: string = mergePaths(directory.url, virtualPath);
                        // thumbnailJson[0].id = mergedPath;
                        let path = getThumbnailUrl(directory);
                        thumbnailJson[0].id = path;
                        json.thumbnail = thumbnailJson;
                    }
                }
            }
        }
    }
};
const getThumbnailUrl = (directory) => {
    let path = "";
    while (directory) {
        // if the directory is a manifest and doesn't have a parent collection
        if (directory.isManifest &&
            (!directory.parentDirectory || !directory.parentDirectory.isCollection)) {
            break;
        }
        if (directory.isCollection && !directory.parentDirectory) {
            break;
        }
        const name = basename(directory.directoryFilePath);
        path = urljoin(path, name);
        directory = directory.parentDirectory;
        // todo: keep going unless you reach a manifest directory with no collection directory parent
        // if (directory.parentDirectory && directory.parentDirectory.isManifest) {
        //   break;
        // } else {
        // }
    }
    return urljoin(directory.url.href, path, "thumb.jpg");
};
export const getLabel = (value) => {
    const labelJson = cloneJson(labelBoilerplate);
    labelJson["@none"].push(value);
    return labelJson;
};
export const getFileDimensions = async (type, file, canvasJson, annotationJson) => {
    log(`getting file dimensions for: ${file}`);
    if (!isJsonFile(file)) {
        switch (type.toLowerCase()) {
            // if it's an image, get the width and height and add to the annotation body and canvas
            case ExternalResourceType.IMAGE:
                try {
                    const image = await sharp(file, {
                        limitInputPixels: true,
                    }).metadata();
                    const width = image.width;
                    const height = image.height;
                    canvasJson.width = Math.max(canvasJson.width || 0, width);
                    canvasJson.height = Math.max(canvasJson.height || 0, height);
                    annotationJson.body.width = width;
                    annotationJson.body.height = height;
                }
                catch (e) {
                    warn(`getting file dimensions failed for: ${file}`);
                }
                break;
            // if it's a sound, get the duration and add to the canvas
            case ExternalResourceType.SOUND:
            case ExternalResourceType.VIDEO:
                try {
                    const info = await ffprobe(file, { path: ffprobeStatic.path });
                    if (info && info.streams && info.streams.length) {
                        const duration = Number(info.streams[0].duration);
                        canvasJson.duration = duration;
                    }
                }
                catch (error) {
                    warn(`ffprobe couldn't load ${file}`);
                }
                break;
        }
    }
};
export const generateImageTiles = async (image, url, directoryName, directory, annotationJson) => {
    try {
        log(`generating image tiles for: ${image}`);
        const id = urljoin(url, directoryName, "+tiles");
        annotationJson.body.service = [
            {
                "@id": id,
                "@type": "ImageService2",
                profile: "http://iiif.io/api/image/2/level2.json",
            },
        ];
        await sharp(image, {
            limitInputPixels: true,
        })
            .tile({
            layout: "iiif",
            id: urljoin(url, directoryName),
        })
            .toFile(join(directory, "+tiles"));
    }
    catch (_a) {
        warn(`generating image tiles failed for: ${image}`);
    }
};
/*
      merge these two example paths:
      url:        http://test.com/collection/manifest
      filePath:   c:/user/documents/collection/manifest/_canvas/thumb.png

      into:       http://test.com/collection/manifest/_canvas/thumb.png
  */
export const mergePaths = (url, filePath) => {
    // split the url (minus origin) and filePath into arrays
    //                            ['collection', 'manifest']
    // ['c:', 'user', 'documents', 'collection', 'manifest', '_canvas', 'thumb.jpg']
    // walk backwards through the filePath array adding to the newPath array until the last item of the url array is found.
    // then while the next url item matches the next filePath item, add it to newPath.
    // the final path is the url origin plus a reversed newPath joined with a '/'
    let origin = url.origin;
    if (url.protocol === "dat:") {
        origin = "dat://";
    }
    const urlParts = getUrlParts(url);
    filePath = normaliseFilePath(filePath);
    const fileParts = filePath.split("/");
    let newPath = [];
    // if there's a single root folder and none of the file path matches
    if (urlParts.length === 1 && !fileParts.includes(urlParts[0])) {
        newPath.push(fileParts[fileParts.length - 1]);
        newPath.push(urlParts[0]);
    }
    else {
        for (let f = fileParts.length - 1; f >= 0; f--) {
            const filePart = fileParts[f];
            newPath.push(filePart);
            if (filePart === urlParts[urlParts.length - 1]) {
                if (urlParts.length > 1) {
                    for (let u = urlParts.length - 2; u >= 0; u--) {
                        f--;
                        if (fileParts[f] === urlParts[u]) {
                            newPath.push(fileParts[f]);
                        }
                        else {
                            newPath.push(urlParts[u]);
                        }
                    }
                }
                break;
            }
        }
    }
    let id = urljoin(origin, ...newPath.reverse());
    return id;
};
export const normaliseFilePath = (filePath) => {
    return filePath.replace(/\\/g, "/").replace(/\/\//g, "/");
};
export const getUrlParts = (url) => {
    let origin = url.origin;
    let urlParts;
    let href = url.href;
    if (href.endsWith("/")) {
        href = href.slice(0, -1);
    }
    if (url.protocol === "dat:") {
        origin = "dat://";
        urlParts = href.replace(origin, "").split("/");
    }
    else {
        urlParts = href.replace(origin + "/", "").split("/");
    }
    return urlParts;
};
export const readJson = (path) => {
    return new Promise((resolve, reject) => {
        jsonfile.readFile(path, (err, json) => {
            if (err)
                reject(err);
            else
                resolve(json);
        });
    });
};
export const writeJson = (path, json) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, json, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
export const readYml = (path) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = yaml.load(fs.readFileSync(path, "utf8"));
            resolve(doc);
        }
        catch (e) {
            reject(e);
        }
    });
};
export const fileExists = (path) => {
    return new Promise((resolve, reject) => {
        const exists = fs.existsSync(path);
        resolve(exists);
    });
};
export const hasManifestsYml = (path) => {
    return new Promise((resolve, reject) => {
        const manifestsPath = join(path, "manifests.yml");
        fileExists(manifestsPath).then((exists) => {
            resolve(exists);
        });
    });
};
export const isURL = (path) => {
    return isurl(path);
};
export const log = (message) => {
    console.log(chalk.green(message));
};
export const warn = (message) => {
    console.warn(chalk.yellow(message));
};
export const error = (message) => {
    console.warn(chalk.red(message));
};
//# sourceMappingURL=Utils.js.map