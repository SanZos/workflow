import { colors } from "./const";
import { workflow, executor } from "./workflow";
import { ssh } from "./sshClient";
import { httpsClient } from "./httpsClient";

interface workflowFormat {
  nom: string;
  task: Array<taskFormat>;
}

interface taskFormat {
  nom: string;
  type: "ssh" | "https" | "ssh+https";
  from: string;
  to: string;
  target: "all" | string | Array<string>;
  compression: "tar.gz";
  file: string | fileFormat | Array<fileFormat>;
  commande: string;
  path: Array<string> | string;
  allowFailing?: boolean;
}

interface expandedTaskFormat {
  nom: string;
  type: "ssh" | "https" | "ssh+https";
  from: string;
  to: string;
  target: string;
  compression: "tar.gz";
  file: string | fileFormat;
  commande: string;
  path: string;
  allowFailing?: boolean;
  [index: string]: any;
}

interface fileFormat {
  source: string;
  dest: string;
  compressed?: boolean;
}

interface serverFormat {
  server: string;
  user: string;
  type: "ssh" | "https" | "ssh+https";
}

interface configFormat {
  workflow: Array<workflowFormat>;
  server: {
    repo: serverFormat;
    source: serverFormat;
    target: Array<serverFormat>;
    [index: string]: serverFormat | Array<serverFormat>;
  }
}

export class configuration {
  private _configFile: configFormat;

  constructor(config?: string) {
    try {
      let conf: configFormat;
      if (!config) {
        conf = require('../static/configuration.json');
      } else {
        conf = require(config);
      }
      this._configFile = conf;
    } catch (e) {
      this._configFile = null;
      console.log(`${colors.fg.Red}Erreur lors du chargement de la configuration.${colors.Reset}`)
    }
  }

  public generateAll(): Array<workflow> {
    let aw: Array<workflow> = [];
    this._configFile.workflow.forEach(a => aw.push(this.toWorkflow(a)));
    return aw;
  }

  public toWorkflow(wf: workflowFormat): workflow {
    if (this._configFile === null) throw 'Pas de fichier de configuration chargé.';
    let w = new workflow(wf.nom);
    this.toTask(w.nom).forEach(t => w.addTask(t));
    return w;
  }

  public toTask(wf: string): Array<executor> {
    let _w = this._configFile.workflow.find(w => w.nom === wf);
    let _a: Array<executor> = [];
    _w.task.forEach(t => _a = [..._a, ...this.expandTask(t)]);
    return _a;
  }

  private expandTask(task: taskFormat): Array<executor> {
    let eTask: expandedTaskFormat;
    let disociateTask: Array<executor> = [];
    let serverList: Array<string> = [];
    let fileList: Array<fileFormat | string> = [];
    let pathList: Array<string> = [];

    if (Array.isArray(task.target)) {
      task.target.forEach(server => serverList.push(server));
    } else if (task.target === "all") {
      this._configFile.server.target.forEach(s => serverList.push(s.server));
    } else {
      serverList.push(task.target);
    }

    task = this.replaceServer(task);

    if (Array.isArray(task.file)) {
      task.file.forEach(file => {
        fileList.push(file);
      });
    } else if (task.file !== void 0) {
      fileList.push(task.file);
    }
    if (Array.isArray(task.path)) {
      task.path.forEach(path => {
        pathList.push(path);
      });
    } else if (task.path !== void 0) {
      pathList.push(task.path);
    }

    serverList.forEach(s => {
      if (Array.isArray(fileList) && fileList.length !== 0) {
        fileList.forEach(f => {
          eTask = {
            nom: task.nom,
            type: task.type,
            to: task.to,
            from: task.from,
            target: s,
            compression: task.compression,
            file: f,
            commande: task.commande,
            path: undefined,
            allowFailing: task.allowFailing
          };
          disociateTask.push(this.computeTask(eTask));
        });
      }
      if (Array.isArray(pathList) && pathList.length !== 0) {
        pathList.forEach(p => {
          eTask = {
            nom: task.nom,
            type: task.type,
            to: task.to,
            from: task.from,
            target: s,
            compression: task.compression,
            file: undefined,
            commande: task.commande,
            path: p,
            allowFailing: task.allowFailing
          };
          disociateTask.push(this.computeTask(eTask));
        });
      }
      if (fileList.length === 0 && pathList.length === 0) {
        eTask = {
          nom: task.nom,
          type: task.type,
          to: task.to,
          from: task.from,
          target: s,
          compression: task.compression,
          file: undefined,
          commande: task.commande,
          path: undefined,
          allowFailing: task.allowFailing
        };
        disociateTask.push(this.computeTask(eTask));
      }
    });

    return disociateTask;
  }

  private replaceServer(task: taskFormat): taskFormat {
    if (task.from !== undefined) task.from = (<serverFormat>this._configFile.server[task.from]).server;
    if (task.to !== undefined) task.to = (<serverFormat>this._configFile.server[task.to]).server;
    return task;
  }

  private computeTask(task: expandedTaskFormat): executor {
    let handler: (arg?: any, ...args: Array<any>) => Promise<any> = workflow.errorGenerator;
    switch (task.type) {
      case "https":
        handler = () => httpsClient.download(`https://${task.from}${task.path}`, `/r3c/r3cadmaa/www${task.path}`);
        break;
      case "ssh":
        if (task.commande === void 0) {
          task.commande = `tar -czf ${task.file}-${Date.now()}.${task.compression} ${task.file} && rm -r ${task.file}`;
        }
        handler = () => ssh(`${task.target} '${task.commande}'`);
        break;
      case "ssh+https":
        if (!!(<fileFormat>task.file).compressed) {
          task.commande = `tar -xzf ${(<fileFormat>task.file).dest}`;
        } else {
          task.commande = '';
        }
        handler = () => ssh(`${task.target} 'curl -s -o ${(<fileFormat>task.file).dest} https://${task.from}${(<fileFormat>task.file).source}'`)
          .then(() => { if (task.commande !== '') ssh(`${task.target} '${task.commande}'`); else return Promise.resolve() });
        break;
    }
    return { nom: this.computeName(task), fonction: handler, allowFailing: !!task.allowFailing };
  }

  private computeName(task: expandedTaskFormat): string {
    return task.nom.replace(/{{([^{}]*)}}/g, (...args: Array<string | number>) => this.populate(task, args));
  }

  private populate(task: expandedTaskFormat, args: Array<string | number>): string {
    if (task[args[1]] !== void 0) {
      if (typeof task[args[1]] === "string") {
        return `${colors.other.JauneClair}${task[args[1]]}${colors.Reset}`;
      } else {
        return `${colors.other.JauneClair}${task[args[1]]}${colors.Reset}`;
      }
    }
  }
}
export default configuration;