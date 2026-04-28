Leggi la skill @.agents/skills/record-replay-backend-tests/ e aiutami a redigere una RFC con questo indice

- contesto
- motivazione
- proposta

## Contesto

I team di prodotto si trovano spesso ad affrontare la necessità di effettuare refactoring del codice backend per migliorare la manutenibilità, le prestazioni o per integrare nuove funzionalità.

## Motivazione

I refactoring pesanti (es. librerie o framework) richiedono test di regressione automatici per assicurare che le funzionalità esistenti non vengano compromesse. Tuttavia, la creazione e la manutenzione di test di regressione può essere laboriosa e soggetta a errori, specialmente quando si tratta di test di backend complessi.

Rimangono fuori dall'ambito di questa RFC test di unità per refactoring leggeri e/o implementazione di nuove funzionalità. Questo tipo di test non è l'obiettivo principale di questa proposta, che si concentra invece sui test di regressione per refactoring significativi che richiederebbero (eventualmente) modifiche anche ai test esistenti.

## Stelle polari

- **Feedback rapido e affidabile** sui test di regressione durante i refactoring nell'ambiente di sviluppo: i coding agent devono essere in grado di identificare rapidamente se un refactoring ha introdotto regressioni
- **Riduzione del tempo e dello sforzo** richiesto ai software engineer per creare e mantenere test di regressione: i coding agent devono essere in grado di generare automaticamente test di regressione

## Proposta

La proposta prevede l'implementazione di test di tipo "Characterization" (altrimenti detti anche "Approval" / "Snapshot" / "Black Box" test), che consentano di registrare il comportamento del sistema prima del refactoring e di confrontarlo con il comportamento dopo il refactoring.

I test sono implementati dai coding agent attraverso l'ispezione della codebase e l'osservazione del comportamento del sistema, senza richiedere una conoscenza approfondita del dominio o del codice. I test sono progettati per essere eseguiti automaticamente durante i refactoring, fornendo un feedback rapido e affidabile sui risultati.

In particolare, i coding agent possono:

- Ispezionare la codebase per identificare le funzionalità chiave e i side effect del sistema
- Ispezionare lo IaC e la codebase per identificare i servizi esterni e le dipendenze del sistema
- Implementare un harness per il bootstrapping dell'ambiente di test tramite ad es. test container, che consenta di isolare l'ambiente di test e di eseguire i test in modo affidabile
- Integrare nel bootstrapping le fixture necessarie per preparare l'ambiente di test, ad esempio popolando il database con dati di test o mockando i servizi esterni

La suite, laddove eseguita in modalità "record", provvede a registrare le richieste e le risposte del backend, nonché ulteriori side effect (es. modifiche al database, invio di email, chiamate a servizi esterni) creando un set di test che può essere eseguito automaticamente, in qualsiasi momento, per verificare che il comportamento del sistema rimanga coerente durante i refactoring.

Viene qui condivisa una prima bozza di implementazione, che sarà ulteriormente raffinata e migliorata in base al feedback ricevuto:
la skill @.agents/skills/record-replay-backend-tests/ offre una soluzione automatizzata per registrare e riprodurre i test di backend, facilitando il processo di verifica durante i refactoring.

La skill è attualmente focalizzata su applicativi TypeScript dispiegati in ambiente Azure, ma è facilmente estendibile ad altri linguaggi e ambienti di esecuzione.
