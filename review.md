# Review di compatibilità GetMessage: services-func → messages-app

## Obiettivo ed esito

Portare l'endpoint GetMessage da `services-func` a `messages-app`, mantenendo il
comportamento osservabile e il contratto pubblico durante lo switch del traffico.

**L'implementazione attuale non è ancora equivalente al legacy.** Sono state
riprodotte incompatibilità sui documenti persistiti, sui controlli di accesso e
sulla gestione degli errori. È inoltre necessario adeguare APIM prima dello
switch.

La review confronta il codice introdotto dal branch con l'implementazione legacy
e con gli adapter esistenti riutilizzati dal nuovo endpoint. Non costituisce una
verifica della configurazione o dei dati effettivi di produzione.

I rilievi sono ordinati per gravità:

- **P1:** problemi da risolvere prima dello switch.
- **P2:** differenze di compatibilità da correggere o accettare esplicitamente;
  dove indicato, l'impatto dipende dai dati storici.

Gli schemi rimangono di proprietà del rispettivo layer: le soluzioni proposte
non richiedono di condividere schemi fra inbound adapter, porte e outbound adapter.

## 1. [P1] Manca la verifica del permesso base `ApiMessageRead`

### Riferimenti

- `apps/messages-app/src/adapters/inbound/fastify/get-service-message.handler.ts:45-58`
- `apps/services-func/src/functions/GetMessage/handler.ts:461`

### Comportamento legacy

Il wrapper legacy applica:

```ts
AzureApiAuthMiddleware(new Set([UserGroup.ApiMessageRead]));
```

Il middleware verifica le informazioni di autenticazione inoltrate da APIM e la
presenza del gruppo richiesto. In assenza del permesso base, la richiesta viene
rifiutata con HTTP 403 prima di eseguire il caso d'uso.

### Differenza e impatto

Il nuovo handler estrae i gruppi, ma non verifica `ApiMessageRead`. Il caso d'uso
controlla la proprietà del messaggio e usa `ApiMessageReadAdvanced` per decidere
l'arricchimento: nessuno dei due controlli sostituisce il permesso base.

Una richiesta con `x-user-groups: ApiMessageWrite` è stata rifiutata dal middleware
legacy con 403 e accettata dal nuovo endpoint con 200.

Anche gli header di autenticazione mancanti hanno una semantica diversa: nel
nuovo handler alcuni producono 400 per validazione, mentre il middleware legacy
li tratta come errori di autorizzazione.

### Soluzione proposta

Introdurre una pre-autorizzazione nell'inbound adapter, prima della normale
validazione della richiesta, coerente con il middleware già adottato per
CreateMessage. Deve verificare il permesso base e preservare la semantica legacy
degli header necessari all'autenticazione.

L'eventuale trasferimento di queste responsabilità ad APIM deve essere esplicito,
versionato e verificato; non va dato per implicito nel cambio di backend.

### Test necessari

Coprire gruppo valido, gruppo estraneo, solo gruppo ADVANCED, gruppi assenti o
vuoti e header di autenticazione mancanti. Verificare che le richieste non
autorizzate non eseguano il caso d'uso.

## 2. [P1] Mancano la risoluzione del servizio e il controllo `authorizedCIDRs`

### Riferimenti

- `apps/messages-app/src/adapters/inbound/fastify/get-service-message.handler.ts:45-58`
- `apps/services-func/src/functions/GetMessage/handler.ts:463-470`
- Middleware legacy `AzureUserAttributesMiddleware` e `checkSourceIpForHandler`.

### Comportamento legacy

Il legacy recupera il servizio associato alla subscription e ne usa gli attributi
per autorizzare la richiesta. In particolare, verifica l'indirizzo sorgente
rispetto ad `authorizedCIDRs`.

Un servizio non trovato viene rifiutato. Un errore nel recupero del servizio
produce un errore server. Una richiesta proveniente da un IP non autorizzato
riceve HTTP 403.

### Differenza e impatto

Il nuovo endpoint usa direttamente `x-service-id`, senza risolvere il servizio
dalla subscription e senza verificare i CIDR autorizzati.

È stato riprodotto il caso di un IP esterno ai CIDR consentiti: il wrapper legacy
restituisce 403, mentre il nuovo endpoint restituisce 200.

Fidarsi degli header inoltrati da APIM non equivale a preservare questi controlli:
nel percorso legacy è l'applicazione a eseguirli.

### Soluzione proposta

Ripristinare la risoluzione del servizio e la verifica dell'IP nel percorso
applicativo, oppure trasferire esplicitamente questi controlli al gateway prima
dello switch.

In entrambi i casi, preservare la relazione fra subscription e servizio, il
comportamento per un servizio assente e la distinzione fra accesso negato ed errore
di recupero. Non usare il solo header `x-service-id` come sostituto dell'intera
catena di autorizzazione.

### Test necessari

Coprire servizio esistente, servizio assente, errore di recupero, CIDR vuoti, IP
consentito, IP non consentito e IP non estraibile dalla richiesta.

## 3. [P1 — prerequisito di switch] La policy APIM attuale non soddisfa il nuovo ingresso

### Riferimenti

- `infra/resources/_modules/apim/api/messages/policy.xml:11-23`
- `apps/messages-app/src/adapters/inbound/fastify/get-service-message.handler.ts:19-24`
- `infra/resources/_modules/container_apps/messages.tf`: autenticazione Entra ID.

### Comportamento legacy

La policy inoltra le richieste a `services-func`, usa la function key e imposta
header come `x-user-id`, `x-user-groups`, `x-subscription-id` e `x-user-email`.
Il servizio viene poi risolto dal backend legacy.

### Differenza e impatto

Il nuovo handler richiede anche `x-service-id`, che la policy attuale non imposta.
Inoltrando al nuovo endpoint gli header prodotti dalla policy attuale si ottiene
HTTP 400: il caso è stato riprodotto localmente.

Cambiano inoltre il percorso interno del backend e il meccanismo di
autenticazione verso Container Apps. Il solo cambio dell'indirizzo del backend
non completa la migrazione.

Questo è un prerequisito del futuro switch, non una richiesta di spostare subito
il traffico nel branch attuale.

### Soluzione proposta

Preparare la policy di migrazione preservando l'URL pubblico e configurando:

- riscrittura verso `/api/services/messages/{fiscal_code}/{id}`;
- valorizzazione affidabile di `x-service-id`, coerente con la risoluzione legacy;
- autenticazione prevista dal nuovo backend;
- conservazione dei controlli di autorizzazione descritti nei punti precedenti.

### Test necessari

Eseguire una richiesta attraverso APIM, non soltanto un'iniezione diretta nel
server Fastify, e confrontare status, body e autorizzazioni con il percorso
legacy.

## 4. [P2] Alcuni default legacy vengono sostituiti da errori server

### Riferimenti

- `apps/messages-app/src/adapters/outbound/profile/profile.adapter.ts:32-33`
- `apps/messages-app/src/adapters/outbound/service-preferences/service-preferences.adapter.ts:33-39`
- Codec legacy e funzione `withDefault` di `@pagopa/ts-commons`.

### Comportamento legacy e differenza

| Dato persistito                               | Risultato legacy                  | Risultato del nuovo adapter |
| --------------------------------------------- | --------------------------------- | --------------------------- |
| `servicePreferencesSettings` assente o `null` | `{ mode: "LEGACY", version: -1 }` | `MalformedEntityError`      |
| `lastAppVersion: null`                        | `"UNKNOWN"`                       | `MalformedEntityError`      |
| `accessReadMessageStatus: null`               | `"UNKNOWN"`                       | `MalformedEntityError`      |

Il `withDefault` legacy gestisce sia `undefined` sia `null`; un `.default()` Zod
non applica automaticamente lo stesso trattamento a `null`.

### Impatto

Sono rappresentazioni accettate dal legacy, non necessariamente dati corrotti.
In una richiesta ADVANCED il nuovo percorso può trasformare un HTTP 200 in 500.
I casi della tabella sono stati riprodotti con i codec legacy e i nuovi adapter.

### Soluzione proposta

Riprodurre negli schemi outbound i default legacy per i valori mancanti o nulli,
mantenendo il rifiuto dei valori effettivamente invalidi. In particolare:

- normalizzare le impostazioni assenti a `LEGACY/-1`;
- normalizzare la versione app nulla a `UNKNOWN`;
- normalizzare la preferenza di lettura nulla a `UNKNOWN`.

Non cambiare la gestione applicativa di `MalformedEntityError`, che deve
continuare a produrre un errore server per documenti realmente malformati.

### Test necessari

Per ciascun campo, coprire valore assente, `null`, valore valido e valore invalido.
Verificare anche la risposta completa del caso d'uso, non soltanto il parsing.

## 5. [P2] Il throttling delle dipendenze produce uno status HTTP diverso

### Riferimenti

- `apps/messages-app/src/application/use-cases/get-service-message.use-case.ts`:
  propagazione degli errori dei repository.
- `apps/messages-app/src/adapters/inbound/fastify/get-service-message.handler.ts:36`
- `apps/services-func/src/functions/GetMessage/handler.ts:294`, `:336`, `:360`

### Comportamento legacy

Gli errori di lettura dei metadata, del contenuto e dello stato vengono tradotti
in errori server. In particolare, il throttling della query sullo stato viene
restituito come HTTP 500.

### Differenza e impatto

Il nuovo caso d'uso propaga `TooManyRequestsError` e il mapper HTTP restituisce 429. Il confronto diretto fra i due handler/casi d'uso ha riprodotto
**500 nel legacy e 429 nel nuovo percorso** per il throttling della lettura dello
stato.

Il 429 è contemplato dall'OpenAPI legacy, ma questo non rende identico il
comportamento concreto dei due backend. La differenza può modificare la logica
di retry dei client.

### Soluzione proposta

Per mantenere la parità comportamentale, normalizzare a errore server il
throttling delle letture nel percorso specifico di GetMessage per i servizi,
senza modificare globalmente gli adapter condivisi con altri endpoint.

In alternativa, accettare e documentare esplicitamente il cambiamento a 429: in
quel caso non si tratta più di una migrazione completamente trasparente.

### Test necessari

Confrontare le risposte HTTP per il throttling di metadata, contenuto e stato.
La sola asserzione che il caso d'uso propaghi l'errore non dimostra la parità.

## 6. [P2] Il body degli errori non coincide con quello legacy

### Riferimenti

- `apps/messages-app/src/adapters/inbound/fastify/get-service-message.handler.ts`:
  uso del mapper standard di `hexagonal-fastify`.
- `apps/services-func/src/functions/GetMessage/handler.ts:303-306`
- Costruttori legacy delle risposte in `@pagopa/ts-commons/lib/responses`.

### Comportamento legacy e differenza

Per un messaggio inesistente, il legacy restituisce:

```json
{
  "detail": "The message that you requested was not found in the system.",
  "status": 404,
  "title": "Message not found"
}
```

Il nuovo mapper restituisce invece un titolo `"Not Found"`, un dettaglio
costruito dall'errore del repository e il campo `type: "about:blank"`.

Il confronto è stato riprodotto. Anche la costruzione delle risposte 403 e 500
usa convenzioni differenti fra i due framework.

### Impatto

Il formato generale rimane Problem JSON, ma i body non sono identici.
Non è dimostrato che i client dipendano da questi testi: è una differenza da
valutare rispetto al requisito di conservare il contratto osservabile.

### Soluzione proposta

Se si richiede parità esatta, introdurre una traduzione degli errori specifica
dell'inbound adapter di questo endpoint, preservando status, campi e messaggi
legacy. Evitare di modificare il mapper globale e influenzare gli altri endpoint.

Se invece i testi e i campi aggiuntivi sono considerati non vincolanti, registrare
esplicitamente questa eccezione al requisito di equivalenza.

### Test necessari

Confrontare status, content type e body serializzato per i principali errori:
validazione, accesso negato, messaggio assente ed errore di dipendenza.

## 7. [P2 — impatto condizionato allo storico] Gli identificativi non ULID vengono rifiutati

### Riferimenti

- `apps/messages-app/src/application/use-cases/get-service-message.use-case.ts:108`:
  riuso del repository metadata.
- `apps/messages-app/src/adapters/outbound/message/message-metadata.adapter.ts`:
  vincoli `z.ulid()` su `id` e `indexedId`.
- `apps/messages-app/src/adapters/outbound/message/message-status.adapter.ts`:
  validazione degli identificativi dello stato.
- Modelli legacy `RetrievedMessageWithoutContent` e `RetrievedMessageStatus`.

### Comportamento legacy

Il percorso legacy accetta un message ID non vuoto; i modelli non impongono gli
stessi vincoli ULID dei nuovi adapter. Anche il parametro pubblico `id` è
documentato come stringa senza vincolo ULID.

### Differenza e impatto

Un documento con `id` e `indexedId` uguali ad `A_MESSAGE_ID` è accettato dal codec
legacy e rifiutato dal repository metadata del nuovo percorso con
`MalformedEntityError`.

Il vincolo era già presente nell'adapter di `messages-app`, ma il suo riuso per
questo endpoint introduce una differenza rispetto al reader legacy.

**Non è stata verificata la presenza di identificativi non ULID nei dati di
produzione.** La differenza è riprodotta; il suo impatto operativo rimane
condizionato all'esistenza di questi documenti.

### Soluzione proposta

Verificare lo storico prima dello switch. Se esistono identificativi validi per
il legacy ma non ULID, rendere il percorso di lettura compatibile, preservando
separatamente i vincoli desiderati per la creazione di nuovi messaggi.

Non assumere che il formato attualmente generato per i nuovi messaggi descriva
necessariamente tutti i dati storici.

### Test necessari

Aggiungere casi di lettura con identificativi ammessi dal legacy, inclusa la
lettura dello stato associato. Documentare l'esito della verifica sullo storico.

## Comportamenti risultati allineati nei casi verificati

- Payload della risposta ordinaria confrontato direttamente fra implementazioni.
- Contenuto assente: omissione del campo, senza trasformare il caso in errore.
- Gestione prevista per stato assente e mancata esposizione dei campi ADVANCED.
- Policy applicativa per versioni supportate, impostazioni legacy e preferenze
  `ALLOW`, `UNKNOWN` e `DENY`, quando le entità vengono lette correttamente.
- Mapping pagoPA dei casi verificati: 200 e 404 verso `NOT_PAID`, 409 per pagamento
  duplicato verso `PAID`.
- Vincoli di lunghezza verificati delle risposte pagoPA: il limite superiore
  esclusivo dei codec legacy corrisponde al limite inclusivo generato in Zod.

Questi risultati non costituiscono una prova di equivalenza esaustiva di tutti i
payload e di tutte le condizioni operative.

## Verifiche eseguite e lacune di copertura

Sono passati:

- **162 test** in otto suite di `messages-app`: use case e handler GetMessage per
  servizi, profilo, preferenze, payment status, metadata, contenuto e stato.
- **43 test** in tre suite legacy: handler GetMessage e controlli delle preferenze
  sullo stato di lettura.

Sono state inoltre eseguite prove differenziali locali con dati sintetici,
utilizzando codec e middleware legacy, nuovi adapter e richieste Fastify.

La discrepanza sul nome del container delle preferenze è stata corretta in
Terraform, nello scope RBAC dichiarato, in Compose e nel setup locale. Una
verifica con SDK Cosmos simulato ha eseguito il seed e recuperato preferenze
`ALLOW` e `DENY` attraverso l'adapter reale nel container `services-preferences`.

L'aggiornamento di `.env.example` è stato confermato dall'utente: il contenuto non
è stato ispezionato perché escluso dalla policy di accesso. Non sono stati
eseguiti comandi Terraform; la validazione e la verifica dei permessi effettivi
nell'ambiente distribuito restano a carico dell'utente prima dello switch.

I test attuali non sono comunque sufficienti a garantire la compatibilità
complessiva dell'endpoint.

Prima dello switch occorre una matrice di parità che confronti i risultati
osservabili dei due backend, usando documenti nel formato prodotto dagli encoder
legacy e coprendo i casi descritti sopra.

La richiesta Bruno `bruno/messages-app/GetServiceMessage.bru` esiste, ma la sua
presenza non sostituisce questi test né una verifica end-to-end attraverso APIM.

## Ordine suggerito delle correzioni

1. Ripristinare la parità dei controlli di autorizzazione e dei default legacy.
2. Decidere e implementare la compatibilità di status e body degli errori.
3. Verificare i vincoli sugli identificativi rispetto allo storico.
4. Completare la matrice di parità e verificare la policy APIM prima di spostare
   il traffico.

La review non ha modificato il codice applicativo né la configurazione.
