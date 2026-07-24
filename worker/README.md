# Cloudflare Worker Relay — Le livret de l'étudiant

Ce projet contient le relais Cloudflare Worker permettant de transmettre en toute sécurité les réponses des étudiants depuis le site statique (GitHub Pages) vers les enseignants via Telegram.

## Architecture

```
Navigateur (GitHub Pages) ──POST /submit──▶ Worker ──sendMessage × N──▶ Abonnés Telegram
Telegram ──webhook──▶ POST /telegram/webhook ──▶ Worker (gestion de /start, /stop, /status)
```

- Le jeton Telegram (`TELEGRAM_BOT_TOKEN`) et le secret webhook (`TELEGRAM_WEBHOOK_SECRET`) sont stockés de manière sécurisée en tant que **Secrets Cloudflare**.
- La liste des abonnés (enseignants) est gérée dynamiquement via un espace de stockage **Cloudflare KV (`SUBSCRIBERS`)**.

---

## Installation rapide (script automatisé)

```bash
npm install -g wrangler
wrangler login          # interactif, ouvre le navigateur
./worker/setup.sh       # fait tout le reste
```

`setup.sh` lit les vraies valeurs dans `worker/.dev.vars` (ignoré par git, `chmod 600`),
crée le namespace KV, téléverse les secrets chiffrés, déploie le Worker, enregistre le
webhook Telegram, puis inscrit l'URL du Worker dans `src/config/config.js`.
Le jeton n'est jamais affiché ni passé en argument de ligne de commande.

Les étapes manuelles équivalentes sont détaillées ci-dessous.

---

## Guide d'installation et de déploiement (manuel)

### 1. Prérequis et Connexion

Installez l'outil de ligne de commande `wrangler` et connectez-vous à votre compte Cloudflare :

```bash
npm install -g wrangler
wrangler login
```

### 2. Création du Namespace KV

Créez l'espace de stockage KV pour enregistrer les abonnés :

```bash
wrangler kv namespace create SUBSCRIBERS
```

L'outil affichera un identifiant (ex. `id = "abc123xyz..."`). Copiez cet ID et collez-le dans le fichier `worker/wrangler.toml` à la ligne correspondant à `id` :

```toml
[[kv_namespaces]]
binding = "SUBSCRIBERS"
id = "VOTRE_KV_NAMESPACE_ID"
```

### 3. Configuration des Secrets (Encrypted)

Configurez les secrets requis sur Cloudflare (les valeurs réelles ne doivent **jamais** être écrites dans le code) :

```bash
# Entrez le jeton fourni par @BotFather
wrangler secret put TELEGRAM_BOT_TOKEN

# Entrez une chaîne aléatoire sécurisée (ex. générée via `openssl rand -hex 32`)
wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

### 4. Déploiement du Worker

Déployez le Worker sur Cloudflare :

```bash
cd worker
wrangler deploy
```

Une fois déployé, notez l'URL publique de votre Worker (ex. `https://faculty-bot-relay.<subdomain>.workers.dev`).

### 5. Enregistrement du Webhook Telegram

Associez le bot Telegram à votre Worker en exécutant la commande suivante (remplacez `<TELEGRAM_BOT_TOKEN>`, `<WORKER_URL>` et `<TELEGRAM_WEBHOOK_SECRET>`) :

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "<WORKER_URL>/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

### 6. Activation par l'enseignant

Chaque enseignant doit ouvrir le bot Telegram et envoyer la commande `/start`. Le bot confirmera l'inscription. Désormais, chaque soumission d'étudiant sera transmise à tous les abonnés enregistrés.

---

## Développement local

Pour tester localement :
1. Copiez `.dev.vars.example` vers `.dev.vars`.
2. Complétez `.dev.vars` avec vos jetons de test.
3. Exécutez `npx wrangler dev`.

---

## Tests

```bash
cd worker && npm test        # 6 tests de découpage + 8 tests d'intégration
```

- `test-split.mjs` — le découpage des messages : aucune partie ne dépasse 4096
  caractères, y compris pour une ligne unique très longue, et le découpage ne coupe
  jamais au milieu d'une entité HTML (`&amp;`) ni d'une paire de substitution (emoji).
- `test-relay.mjs` — le chemin complet (validation → formatage → découpage → diffusion)
  avec un KV et une API Telegram simulés.

## Notes techniques

### Limites Telegram
- `sendMessage` est plafonné à **4096 caractères**. Le Worker découpe à **3900**, ce qui
  laisse la place au marqueur `(partie n/N)`, et vérifie chaque partie avant l'envoi.
- Environ **30 messages/seconde** au total. En cas de HTTP 429, le Worker respecte
  `retry_after` et réessaie jusqu'à 3 fois.
- `parse_mode` est **HTML** (et non Markdown) : les réponses des étudiants contiennent
  souvent `*` ou `_`, ce qui faisait échouer l'envoi. Toutes les valeurs sont échappées.

### Limite de sous-requêtes Cloudflare
Une invocation de Worker est limitée à **50 sous-requêtes** (plan gratuit ; 1000 en plan
payant). Envoyer `P` parties à `S` abonnés coûte `P × S` appels. Le Worker traite donc
autant d'abonnés qu'il peut, puis transmet le reste à une nouvelle invocation de
lui-même via `POST /internal/fanout` (protégée par `TELEGRAM_WEBHOOK_SECRET`), qui
dispose de son propre budget. Testé jusqu'à 60 abonnés × 3 parties = 180 messages.

### Abonnés
Chaque abonné est stocké dans KV sous `sub:<chat_id>`, **à la fois** dans la valeur et
dans les métadonnées de la clé, pour qu'un seul `list()` suffise à tous les récupérer.
Un abonné qui bloque le bot est automatiquement supprimé lors de l'envoi suivant.

### Routes
| Route | Méthode | Rôle |
|---|---|---|
| `/submit` | POST | Réception des réponses depuis le site (origine sur liste blanche, 20 envois/h/IP) |
| `/telegram/webhook` | POST | Webhook Telegram : `/start`, `/stop`, `/status` |
| `/internal/fanout` | POST | Continuation interne de la diffusion |
| `/health` | GET | État + nombre d'abonnés |
