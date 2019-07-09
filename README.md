# workflow

## Création d'un worflow manuel
```typescript
import workflow from './workflow';
import { ssh } from './sshClient';

const wf = new workflow('Test')
    .addTask({ nom: "vérification de la connectivité avec la déstination", fonction: () => ssh("localhost 'echo connection établie!'") });
```

## Création d'un workflow depuis un fichier de configuration
```typescript
import workflow from './workflow';
import configuration from './configuration';


const autoload = new configuration(conf);
let exec: Array<workflow> = autoload.generateAll();

const wf = exec[0]; // Pour l'exemple ci-dessous
```

## Lancement d'un workflow 
```typescript
// Lacement en tâche de fond
wf.proceed();

// Lancement en mode promesse
wf.proceed().toPromise();
```