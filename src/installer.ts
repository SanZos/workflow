import * as path from "path";

import workflow from './workflow';
import configuration from "./configuration";
import { colors } from "./const";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
const args = process.argv.slice(2);
var asConfig = args.indexOf("-c");
var conf = undefined;
if (asConfig != -1) {
    conf = path.resolve(args[asConfig + 1]);
}
const autoload = new configuration(conf);
let exec: Array<workflow> = autoload.generateAll()

let nbWorkflow = exec.length;

console.log("Lancement de l'installation");
doNextWf().then(() => console.log(`✔️  ${colors.fg.Green}Fin de l'éxecution du programe sans erreurs bloquantes.${colors.Reset}`)).catch(e => console.error(e))

function doNextWf(): Promise<any> {
    let a = exec.shift();
    if (a) {
        console.log(`Lancement de du worflow ${a.nom} ${nbWorkflow - exec.length}/${nbWorkflow}`)
        return a.proceed().toPromise().then(doNextWf)
    }
}
