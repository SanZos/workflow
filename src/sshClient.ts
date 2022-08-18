import { exec } from "child_process";
import { colors } from "./const";

export function ssh(commande: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(colors.other.BleuClair + '\t\tssh ' + commande + colors.Reset);
    return exec('ssh ' + commande, (error, stdout) => {
      if (error) {
        return reject(`exec error: ${error}`);
      }
      return resolve(stdout);
    })
  })
}
