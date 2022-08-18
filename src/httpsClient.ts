interface FileError extends Error {
  code: string
}

import * as fs from "fs";
import * as https from "https";

export class httpsClient {
  public static download(url: string, dest: string): Promise<void> {
    console.log('\t\ttéléchargement ' + url + ' vers ' + dest);
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest, { flags: "w" });

      const request = https.get(url, response => {
        if (response.statusCode === 200) {
          response.pipe(file);
        } else {
          file.close();
          fs.unlink(dest, () => { console.log('deleting file', new Error("1")) }); // Delete temp file
          reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
        }
      });

      request.on("error", err => {
        file.close();
        fs.unlink(dest, () => { console.log('deleting file', new Error("2")) }); // Delete temp file
        reject(err.message);
      });

      file.on("finish", () => resolve());

      file.on("error", (err: FileError)  => {
        if (err.code !== "EEXIST") {
          file.close();
          fs.unlink(dest, () => { console.log('deleting file', new Error("3")) }); // Delete temp file
          reject(err.message);
        }
      });
    });
  }
}