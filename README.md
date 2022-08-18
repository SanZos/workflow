# workflow

## Création d'un worflow manuel

```typescript
import { workflow, ssh } from 'workflow';

const wf = new workflow('Test')
    .addTask({ nom: "vérification de la connectivité avec la déstination", fonction: () => ssh("localhost 'echo connection établie!'") });
```

## Création d'un workflow depuis un fichier de configuration

```typescript
import { workflow, configuration } from 'workflow';

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

## Ittération sur un workflow

```typescript
import { workflow, ssh } from 'workflow';

const wf = new workflow('Test')
    .addTask({ nom: "vérification de la connectivité avec la déstination", fonction: () => ssh("localhost 'echo connection établie!'") });

const run = async () => {
  let retourDeLaFonction = '';
  for (const task of install) {
    // task correspond a la task qui est défini avec le addTask
    try {
      retourDeLaFonction = await task.fonction(retourDeLaFonction);
      console.log(`${colors.other.Cyan} isOk`)
    } catch (error) {
      console.error(`${colors.fg.Red} ${error}`)
    }
  }
}

run().then(() => console.log('done')).catch(e => console.error(e))
```