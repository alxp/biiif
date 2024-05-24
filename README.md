# About This Fork

So far this fork does the following:

- Minor updates to support building with current versions of the TypeScript compiler
- Add hOCR text overlay support

If there is a file with a .hocr extension in a folder with an image, then a 'seeAlso' section will be
 automatically added with a link to the hOCR file.

This was tested with the Mirador 3 viewer compiled with the [Text Overlay](https://github.com/dbmdz/mirador-textoverlay) plugin.

# biiif (build iiif) 👷✨📃

[![Node version](https://img.shields.io/node/v/biiif.svg?style=flat)](http://nodejs.org/download/)

<!-- ![IIIF Presentation API 3 compliant](https://img.shields.io/badge/iiif--presentation--api-%3E=3-blue.png) -->

```bash
npm i biiif --save
```

```bash
const { build } = require('biiif');
build('myfolder', 'http://example.com/myfolder');
```

Organise your files according to a simple [naming convention](https://github.com/edsilv/biiif#examples) to generate [IIIF](http://iiif.io) content/data using 100% node.js! [IPFS](https://github.com/ipfs) compatible.

Use [biiif-cli](https://github.com/edsilv/biiif-cli) to run from a terminal.

Note: This uses the [IIIF Presentation API v3](http://prezi3.iiif.io/api/presentation/3.0/), and is compatible with the [Universal Viewer](http://universalviewer.io) v3.

Github template repo for hosting IIIF on Netlify and Vercel: https://github.com/iiif-commons/biiif-template

Building static sites with biiif workshop: https://github.com/edsilv/biiif-workshop

## Parameters

| Parameter     | Type   | Description                                                                                                                                     |
| :------------ | :----- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `folder`      | string | The source folder of your IIIF collection/manifest on disk                                                                                      |
| `url`         | string | The Url to use as the root for all generated manifest, asset identifiers                                                                        |
| `virtualName` | string | Overrides the source folder name when generating identifiers e.g. a dat archive id you need to appear in Urls instead of the source folder name |

## Conventions

A collection is a folder with sub-folders whose names _do not_ start with an underscore.

A manifest is a folder with sub-folders whose names _do_ start with an underscore.

A collection's sub-folders (no underscore) are treated as further nested collections.

A manifest's sub-folders (with underscore) are treated as canvases to add to the manifest.

Files within 'canvas folders' (.jpg, .pdf, .mp4, .obj) are annotated onto the canvas with a `painting` motivation.

## Annotations

IIIF Presentation 3.0 uses the [Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) to annotate canvases.

By default, biiif will annotate any files it finds in a canvas directory (except `info.yml` and `thumb.jpg`) onto the canvas with a `painting` motivation.

This is handy as a quick way to generate simple manifests. However, what if you want to annotate some text onto a canvas with a `commenting` motivation?

Or what happens when you have obj or gltf files that require image textures to be located in the same directory? You don't want these files to be annotated onto the canvas too!

This is where custom annotations come in. Just create a file `my-annotation.yml` in the canvas directory and set the desired properties in that.

For example, here is `my-comment.yml`:

```yml
motivation: commenting
value: This is my comment on the image
```

Here we've excluded the `type` (`TextualBody` is assumed), and `format` (`text/plain` is assumed).

What about the gltf example? Here's how `my-3d-object.yml` could look:

```yml
value: assets/myobject.gltf
```

Here we've excluded the `motivation` (`painting` is assumed), `type` (`Model` is assumed), and `format` (`model/gltf+json` is assumed).

biiif knows that because it's a gltf file, it's likely to have all of the above values. You just need to include a `value` property pointing to where you've put the gltf file itself. In this case, an `assets` folder within the canvas directory. The associated image textures can live in the `assets` folder too, they won't get annotated unless you specifically ask for them to be.

## Image Tile Services

biiif will automatically generate IIIF image tiles for any image it finds and put them in a `+tiles` directory, along with an associated `info.json`. The `+` is prepended to any directories generated by biiif and means it ignores them when generating manifests.
The image service is added to the generated annotation for each image in your IIIF manifest.

## Metadata

Metadata is not mandatory, but can be included as an `info.yml` file within a collection, manifest, or canvas folder. e.g.

```yml
label: The Lord of the Rings
description: The Lord of the Rings Trilogy
attribution: J. R. R. Tolkien
metadata:
  License: Copyright Tolkien Estate
  Author: J. R. R. Tolkien
  Published Date: 29 July 1954
```

Here's an example of an `info.yml` supplying descriptive + rights properties and metadata for a gold-broach image manifest:

https://github.com/nomadproject/objects/blob/gh-pages/collection/gold-broach/info.yml

This manifest contains a single canvas folder `_gold-broach` with an image to be painted onto the canvas. If there were many canvases in this manifest it might make sense to add an `info.yml` to each subfolder with extra image-specific metadata.

Within the `info.yml` you can set the `label`, `description`, and `attribution` [descriptive and rights properties](https://iiif.io/api/presentation/3.0/#appendices) at the top-level. IIIF Presentation 3 (in beta) has renamed `description` to `summary`, and `attribution` to `requiredStatement` but these will still work in IIIF viewers.

Under these you can add a `metadata` section that is essentially a list of key value pairs containing any info you like (there is deliberately no specification for this as the IIIF spec writers feel it falls outside of their remit).

## Thumbnails

To add a thumbnail to your collection, manifest, or canvas simply include a file named `thumb.jpg` (any image file extension will work) in the directory.

If no thumb image is found in a canvas directory, biiif checks to see if an image is being annotated onto the canvas with a painting motivation. If so, a thumb is generated (100 x 100px) from that.

## Linked Manifests

Often it's necessary to include IIIF manifests in your collection from elsewhere. To do this, include a `manifests.yml` file in your collection folder e.g.

```yml
manifests:
  - id: http://test.com/collection/linkedmanifest1/index.json
    label: Linked Manifest 1
    thumbnail: http://test.com/collection/linkedmanifest1/thumb.jpg
  - id: http://test.com/collection/linkedmanifest2/index.json
    label: Linked Manifest 2
  - id: http://test.com/collection/linkedmanifest3/index.json
```

If you leave the `label` property blank, it will default to the name of the last folder in the `id` URL.

Including a `manifests.yml` file in a folder without any sub-folders forces it to behave like a collection.

## Examples

<!--MozFest zine workshop published on glitch: https://glitch.com/~edsilv-mozfest-zine-->

A repo of test manifests: https://github.com/edsilv/biiif-test-manifests

Collection for the [Nomad Project](https://nomad-project.co.uk): https://github.com/nomadproject/objects

IIIF 3D manifests: https://github.com/edsilv/iiif-3d-manifests

...

Here is an example of how to organise your files/folders for biiif.

This example only has a single root collection, but biiif will happily build collections to any nested depth.

biiif will accept a manifest folder too, generating a single manifest `index.json`.

```yml
lord-of-the-rings                  // collection
├── info.yml                       // collection metadata
├── thumb.jpg                      // collection thumbnail
├── 0-the-fellowship-of-the-ring   // manifest
|   ├── _page-1                    // canvas
|   |   ├── page-1.jpg             // content annotation
|   |   └── info.yml               // canvas metadata
|   ├── _page-2                    // canvas
|   |   ├── page-2.jpg             // content annotation
|   |   └── info.yml               // canvas metadata
|   ├── _page-n                    // canvas
|   |   ├── page-n.jpg             // content annotation
|   |   └── info.yml               // canvas metadata
|   ├── info.yml                   // manifest metadata
|   └── thumb.jpg                  // manifest thumbnail
├── 1-the-two-towers               // manifest
|   ├── _page-1                    // canvas
|   ├── _page-2                    // canvas
|   ├── _page-n                    // canvas
|   ├── info.yml                   // manifest metadata
|   └── thumb.jpg                  // manifest thumbnail
└── 2-the-return-of-the-king       // manifest
├── _page-1                    // canvas
├── _page-2                    // canvas
├── _page-n                    // canvas
├── info.yml                   // manifest metadata
└── thumb.jpg                  // manifest thumbnail
```

## Tips

If you need to include a folder in your project but don't want biiif to treat it as a manifest, add a `!` to the start of its name, e.g. `!ignorethisfolder`.

Watch out for ":" in metadata descriptions, these will throw an error when parsing the YML.
