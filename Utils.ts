import {
  AnnotationMotivation,
  ExternalResourceType,
} from "@iiif/vocabulary/dist-commonjs/";
import { Directory } from "./Directory";
import { dirname, extname } from "path";
import { IConfigJSON } from "./IConfigJSON";
import { join, basename } from "path";
import { promise as glob } from "glob-promise";
import { TypeFormat } from "./TypeFormat";
import chalk from "chalk";
import config from "./config.json";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import isURL from "is-url";
import Jimp from "jimp";
import jsonfile from "jsonfile";
import labelBoilerplate from "./boilerplate/label.json";
import thumbnailBoilerplate from "./boilerplate/thumbnail.json";
import urljoin from "url-join";
import yaml from "js-yaml";

export class Utils {
  private static _config: IConfigJSON = config;

  public static compare(a: string, b: string): number {
    const collator: Intl.Collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return collator.compare(a, b);
  }

  public static normaliseType(type: string): string {
    type = type.toLowerCase();

    if (type.indexOf(":") !== -1) {
      const split: string[] = type.split(":");
      return split[1];
    }

    return type;
  }

  public static getTypeByExtension(
    motivation: string,
    extension: string
  ): string | null {
    motivation = Utils.normaliseType(motivation);

    const m: any = this._config.annotation.motivations[motivation];

    if (m) {
      if (m[extension] && m[extension].length) {
        return m[extension][0].type;
      }
    }

    return null;
  }

  public static getFormatByExtension(
    motivation: string,
    extension: string
  ): string | null {
    motivation = Utils.normaliseType(motivation);

    const m: any = this._config.annotation.motivations[motivation];

    if (m) {
      if (m[extension] && m[extension].length) {
        return m[extension][0].format;
      }
    }

    return null;
  }

  public static getFormatByExtensionAndType(
    motivation: string,
    extension: string,
    type: string
  ): string | null {
    motivation = Utils.normaliseType(motivation);

    const m: any = this._config.annotation.motivations[motivation];

    if (m) {
      if (m[extension] && m[extension].length) {
        const typeformats: TypeFormat[] = m[extension];
        for (let i = 0; i < typeformats.length; i++) {
          const typeformat: TypeFormat = typeformats[i];
          if (typeformat.type === type) {
            return typeformat.format;
          }
        }
      }
    }

    return null;
  }

  public static getTypeByFormat(
    motivation: string,
    format: string
  ): string | null {
    motivation = Utils.normaliseType(motivation);

    const m: any = this._config.annotation.motivations[motivation];

    if (m) {
      for (const extension in m) {
        const typeformats: TypeFormat[] = m[extension];
        for (let i = 0; i < typeformats.length; i++) {
          const typeformat: TypeFormat = typeformats[i];
          if (typeformat.format === format) {
            return typeformat.type;
          }
        }
      }
    }

    return null;
  }

  public static getFormatByType(
    motivation: string,
    type: string
  ): string | null {
    motivation = Utils.normaliseType(motivation);

    const m: any = this._config.annotation.motivations[motivation];

    // only able to categorically say there's a matching format
    // if there's a single extension with a single type

    if (m) {
      if (Object.keys(m).length === 1) {
        const typeformats: TypeFormat[] = m[Object.keys(m)[0]];

        if (typeformats.length === 1) {
          return typeformats[0].format;
        }
      }
    }

    return null;
  }

  public static timeout(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static cloneJson(json: any): any {
    return JSON.parse(JSON.stringify(json));
  }

  public static formatMetadata(metadata: any): any {
    const formattedMetadata: any[] = [];

    for (let key in metadata) {
      if (metadata.hasOwnProperty(key)) {
        const value: string = metadata[key];

        const item: any = {};

        item.label = Utils.getLabel(key);
        item.value = Utils.getLabel(value);

        formattedMetadata.push(item);
      }
    }

    return formattedMetadata;
  }

  // If filePath is:
  // C://Users/edsilv/github/edsilv/biiif-workshop/collection/_abyssinian/thumb.jpeg
  // and 'collection' has been replaced by the top-level virtual name 'virtualname'
  // it should return:
  // C://Users/edsilv/github/edsilv/biiif-workshop/virtualname/_abyssinian/thumb.jpeg
  // virtual names are needed when using dat or ipfs ids as the root directory.
  public static getVirtualFilePath(
    filePath: string,
    directory: Directory
  ): string {
    // walk up directory parents building the realPath and virtualPath array as we go.
    // at the top level directory, use the real name for realPath and the virtual name for virtualPath.
    // reverse the arrays and join with a '/'.
    // replace the realPath section of filePath with virtualPath.

    let realPath: string[] = [basename(filePath)];
    let virtualPath: string[] = [basename(filePath)];

    while (directory) {
      const realName: string = basename(directory.directoryPath);
      const virtualName: string = directory.virtualName || realName;
      realPath.push(realName);
      virtualPath.push(virtualName);
      directory = directory.parentDirectory;
    }

    realPath = realPath.reverse();
    virtualPath = virtualPath.reverse();

    const realPathString: string = realPath.join("/");
    const virtualPathString: string = virtualPath.join("/");

    filePath = Utils.normaliseFilePath(filePath);
    filePath = filePath.replace(realPathString, virtualPathString);

    return filePath;
  }

  public static isJsonFile(path: string): boolean {
    return extname(path) === ".json";
  }

  public static isDirectory(path: string): boolean {
    return fs.lstatSync(path).isDirectory();
  }

  public static async getThumbnail(
    json: any,
    directory: Directory,
    filePath?: string
  ): Promise<void> {
    let fp: string = filePath || directory.directoryPath;
    fp = Utils.normaliseFilePath(fp);

    const thumbnailPattern: string = fp + "/thumb.*";
    const thumbnails: string[] = await glob(thumbnailPattern);

    if (thumbnails.length) {
      // there's alrady a thumbnail in the directory, add it to the canvas
      console.log(chalk.green("found thumbnail for: ") + fp);
      let thumbnail: string = thumbnails[0];
      const thumbnailJson: any = Utils.cloneJson(thumbnailBoilerplate);
      thumbnailJson[0].id = Utils.mergePaths(
        directory.url,
        Utils.getVirtualFilePath(thumbnail, directory)
      );
      json.thumbnail = thumbnailJson;
    } else if (directory.generateThumbs) {
      // there isn't a thumbnail in the directory, so we'll need to generate it.

      // if debugging: jimp item.getitem is not a function
      // generate thumbnail
      if (json.items && json.items.length && json.items[0].items) {
        // find an annotation with a painting motivation of type image.
        const items: any[] = json.items[0].items;

        for (let i = 0; i < items.length; i++) {
          const item: any = items[i];
          const body: any = item.body;
          if (
            body &&
            item.motivation ===
              Utils.normaliseType(AnnotationMotivation.PAINTING)
          ) {
            // is it an image? (without an info.json)
            if (
              body.type.toLowerCase() === ExternalResourceType.IMAGE &&
              !Utils.isJsonFile(body.id)
            ) {
              let imageName: string = body.id.substr(body.id.lastIndexOf("/"));
              if (imageName.includes("#")) {
                imageName = imageName.substr(0, imageName.lastIndexOf("#"));
              }
              const imagePath: string = Utils.normaliseFilePath(
                join(fp, imageName)
              );
              let pathToThumb: string = Utils.normaliseFilePath(
                join(dirname(imagePath), "thumb.")
              );

              // todo: this currently assumes that the image to generate a thumb from is within the directory,
              // but it may be in an assets folder and painted by a custom annotation.
              // see canvas-with-dimensions-manifest.js
              if (
                this._config.settings.jimpEnabled &&
                (await Utils.fileExists(imagePath))
              ) {
                const image: any = await Jimp.read(imagePath);
                const thumb: any = image.clone();
                // write image buffer to disk for testing
                // image.getBuffer(Jimp.AUTO, (err, buffer) => {
                //     const arrBuffer = [...buffer];
                //     const pathToBuffer: string = imagePath.substr(0, imagePath.lastIndexOf('/')) + '/buffer.txt';
                //     fs.writeFile(pathToBuffer, arrBuffer);
                // });
                //thumb.cover(this._config.thumbnails.width, this._config.thumbnails.height);
                thumb.resize(this._config.thumbnails.width, Jimp.AUTO);
                pathToThumb += image.getExtension();

                // a thumbnail may already exist at this path (when generating from a flat collection of images)
                const thumbExists: boolean = await Utils.fileExists(
                  pathToThumb
                );

                if (!thumbExists) {
                  thumb.write(pathToThumb, () => {
                    console.log(chalk.green("generated thumbnail for: ") + fp);
                  });
                } else {
                  console.log(chalk.green("found thumbnail for: ") + fp);
                }
              } else {
                // placeholder img path
                pathToThumb += "jpeg";
              }

              const thumbnailJson: any = Utils.cloneJson(thumbnailBoilerplate);
              const virtualPath: string = Utils.getVirtualFilePath(
                pathToThumb,
                directory
              );
              const mergedPath: string = Utils.mergePaths(
                directory.url,
                virtualPath
              );
              thumbnailJson[0].id = mergedPath;
              json.thumbnail = thumbnailJson;
            }
          }
        }
      }
    }
  }

  public static getLabel(value: string): any {
    const labelJson: any = Utils.cloneJson(labelBoilerplate);
    labelJson["@none"].push(value);
    return labelJson;
  }

  public static async getFileDimensions(
    type: string,
    file: string,
    canvasJson: any,
    annotationJson: any
  ): Promise<void> {
    console.log(chalk.green("getting file dimensions for: ") + file);

    if (!Utils.isJsonFile(file)) {
      switch (type.toLowerCase()) {
        // if it's an image, get the width and height and add to the annotation body and canvas
        case ExternalResourceType.IMAGE:
          const image: any = await Jimp.read(file);
          const width: number = image.bitmap.width;
          const height: number = image.bitmap.height;
          canvasJson.width = Math.max(canvasJson.width || 0, width);
          canvasJson.height = Math.max(canvasJson.height || 0, height);
          annotationJson.body.width = width;
          annotationJson.body.height = height;
          break;
        // if it's a sound, get the duration and add to the canvas
        case ExternalResourceType.SOUND:
        case ExternalResourceType.VIDEO:
          try {
            const info: any = await ffprobe(file, { path: ffprobeStatic.path });
            if (info && info.streams && info.streams.length) {
              const duration: number = Number(info.streams[0].duration);
              canvasJson.duration = duration;
            }
          } catch {
            console.warn(`ffprobe couldn't load ${file}`);
          }

          break;
      }
    }
  }

  /*
        merge these two example paths:
        url:        http://test.com/collection/manifest
        filePath:   c:/user/documents/collection/manifest/_canvas/thumb.png

        into:       http://test.com/collection/manifest/_canvas/thumb.png
    */
  public static mergePaths(url: URL, filePath: string): string {
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

    const urlParts = Utils.getUrlParts(url);
    filePath = Utils.normaliseFilePath(filePath);
    const fileParts: string[] = filePath.split("/");
    let newPath: string[] = [];

    // if there's a single root folder and none of the file path matches
    if (urlParts.length === 1 && !fileParts.includes(urlParts[0])) {
      newPath.push(fileParts[fileParts.length - 1]);
      newPath.push(urlParts[0]);
    } else {
      for (let f = fileParts.length - 1; f >= 0; f--) {
        const filePart: string = fileParts[f];
        newPath.push(filePart);

        if (filePart === urlParts[urlParts.length - 1]) {
          if (urlParts.length > 1) {
            for (let u = urlParts.length - 2; u >= 0; u--) {
              f--;
              if (fileParts[f] === urlParts[u]) {
                newPath.push(fileParts[f]);
              } else {
                newPath.push(urlParts[u]);
              }
            }
          }
          break;
        }
      }
    }

    let id: string = urljoin(origin, ...newPath.reverse());

    return id;
  }

  public static normaliseFilePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").replace(/\/\//g, "/");
  }

  public static getUrlParts(url: URL): string[] {
    let origin: string = url.origin;
    let urlParts: string[];

    let href: string = url.href;

    if (href.endsWith("/")) {
      href = href.slice(0, -1);
    }

    if (url.protocol === "dat:") {
      origin = "dat://";
      urlParts = href.replace(origin, "").split("/");
    } else {
      urlParts = href.replace(origin + "/", "").split("/");
    }

    return urlParts;
  }

  public static async readJson(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      jsonfile.readFile(path, (err, json) => {
        if (err) reject(err);
        else resolve(json);
      });
    });
  }

  public static async writeJson(path: string, json: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, json, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public static async readYml(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      fs.readFile(path, (err, fileBuffer) => {
        if (err) {
          reject(err);
        } else {
          const yml: string = yaml.safeLoad(fileBuffer);
          resolve(yml);
        }
      });
    });
  }

  public static async fileExists(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const exists: boolean = fs.existsSync(path);
      resolve(exists);
    });
  }

  public static async hasManifestsYml(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const manifestsPath: string = join(path, "manifests.yml");

      Utils.fileExists(manifestsPath).then((exists) => {
        resolve(exists);
      });
    });
  }

  public static isURL(path: string): boolean {
    return isURL(path);
  }
}
