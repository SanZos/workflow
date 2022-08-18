import { colors } from "./const";
import * as stream from "stream";

export interface executor {
  nom: string;
  fonction: (arg?: any, ...args: Array<any>) => Promise<any>;
  allowFailing?: boolean;
  timeout?: number;
  skip?: boolean;
}

export class workflow {
  private _i: number = 0;
  private _task: Map<number, executor> = new Map();
  private _noInit: boolean = true;
  private _nom: string;
  private _hasErrors: boolean;
  private _resolve: (value?: any) => void;
  private _reject: (value?: any) => void;
  private _outputStream: stream.Writable;
  private _errorStream: stream.Writable;

  [Symbol.iterator]() {
    return {
      next: () => {
        if (this._i < this._task.size) {
          return { value: this._task.get(this._i++), done: false };
        } else {
          return { value: undefined, done: true };
        }
      }
    }
  }

  get nom() {
    return this._nom;
  }

  constructor(nom: string = 'default', output: stream.Writable = process.stdout, error: stream.Writable = process.stderr) {
    this._outputStream = output;
    this._errorStream = error;
    this._nom = nom;
    this._task.set(0, { nom: "d'initialisation", fonction: () => Promise.resolve() });
    this._task.set(1, { nom: "dummy", fonction: workflow.errorGenerator, allowFailing: true });
    this._resolve = () => { };
    this._reject = () => { };
  }

  public addTask(task: executor, ordre?: number): workflow {
    if (this._noInit && ordre === void 0) { this._noInit = false; ordre = 1; }
    if (!ordre) { ordre = this._task.size; }
    this._task.set(ordre, task);
    return this;
  }

  public proceed(i: number = 0): workflow {
    this.execute(i);
    return this;
  }

  private execute(i: number, followParameter?: any): Promise<any> {
    let task: executor = this._task.get(i);
    if (task === void 0) return Promise.resolve(this.wrapUp());
    if (task.skip) return this.execute(++i);
    
    this._outputStream.write(`\t➡️  Lancement de la tâche ${colors.other.CyanClair}${task.nom}${colors.Reset} du workflow ${colors.other.CyanClair}${this._nom}${colors.Reset}${colors.Dim}\r\n`);
    let timer:NodeJS.Timeout = null;
    return new Promise((resolve, reject) => {
      if(task.timeout) timer = setTimeout(reject, task.timeout);
      return task.fonction(followParameter).then(resolve).catch(reject);
    }).then(data => {
      this._outputStream.write(`\t${colors.Reset}✔️  Fin d'exécution de la tâche ${colors.other.CyanClair}${task.nom}${colors.Reset}\r\n`);
      return this.execute(++i, data);
    })
    .catch((error) => {
      this._hasErrors = true;
      if (!(error instanceof Error)) {
        error = new Error(error);
      }
      this._errorStream.write(`\t${colors.Reset}❌ ${JSON.stringify({ message: error.message, stack: error.stack })}\r\n`);
      if (task.allowFailing) this.execute(++i);
      else return this.wrapUp(true);
    })
    .finally(() => {
      clearTimeout(timer);
    });
  }

  private wrapUp(fail?: boolean) {
    this._outputStream.write(`${colors.Reset}Fin de l'exécution du workflow ${colors.other.CyanClair}${this._nom}${colors.Reset}${this._hasErrors ? ' avec des erreurs' : ''}${colors.Reset}.\r\n`)
    if (fail) this._reject(`\t${colors.Reset}❌ ${colors.other.Rouge}Workflow ${colors.other.CyanClair}${this._nom}${colors.other.Rouge} en erreur.${colors.Reset}`);
    else this._resolve();
    return this;
  }

  public static errorGenerator(name?: string): Promise<any> {
    if (name === void 0 && this instanceof workflow) name = this._nom;
    return Promise.reject(`Pas d'action défini pour le workflow ${colors.other.CyanClair}${name}`);
  }

  public toPromise(): Promise<any> {
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    })
  }
}

export default workflow;
