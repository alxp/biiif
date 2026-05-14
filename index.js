import { Directory } from "./Directory.js";
import { fileExists, log } from "./Utils.js";
export const build = async (dir, url, virtualName) => {
    log(`started biiifing ${dir}`);
    // validate inputs
    const exists = await fileExists(dir);
    if (!exists) {
        throw new Error("Directory does not exist");
    }
    if (!url) {
        // if a url hasn't been passed, check if running on Netlify or Vercel and use the appropriate url
        if (process.env.NETLIFY) {
            url =
                process.env.PULL_REQUEST === "true"
                    ? process.env.DEPLOY_PRIME_URL
                    : process.env.URL;
        }
        else if (process.env.VERCEL) {
            url = `https://${process.env.VERCEL_URL}`;
        }
        else {
            throw new Error("You must pass a url parameter");
        }
    }
    const directory = new Directory(dir, url, virtualName);
    await directory.read();
    log(`finished biiifing ${dir}`);
};
//# sourceMappingURL=index.js.map