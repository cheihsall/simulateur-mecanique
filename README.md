# Simulateur de Torréfacteur de Café — Way2tech.ai integration demo

Ce dépôt contient un prototype de simulateur de torréfacteur (React + Vite + Tailwind) qui illustre le protocole d'intégration décrit pour Way2tech.ai.

Fonctionnalités principales
- Lecture des paramètres obligatoires depuis l'URL: `session_id`, `learner_id`, `resource_id`, `api_key`, `callback_url`.
- Simulation simplifiée (progression temporelle, température) avec collecte d'événements et métriques.
- Envoi du résultat au `callback_url` en POST JSON avec l'en-tête `x-api-key` et réessais exponentiels (3 tentatives).

Pré-requis
- Node.js 18+ recommandé

Installation et exécution
1. Installer les dépendances:

```bash
npm install
```

2. Démarrer en mode développement:

```bash
npm run dev
```

Test local (exemple d'URL de démarrage)

Ouvrez le navigateur à l'adresse suivante (adaptez l'hôte/port si nécessaire) :

```
http://localhost:5173/?session_id=abc123&learner_id=learner-1&resource_id=res-1&api_key=abc-SECRET&callback_url=https://example.com/api/simulation/result
```

Notes techniques
- Le simulateur vérifie que `callback_url` commence par `https://` avant d'envoyer.
- Le payload respecte le schéma minimal `schema_version: "1.0.0"` demandé par Way2tech.ai.
- Les artefacts sont inclus en tant qu'URL data: base64 pour simplifier le prototype.

Sécurité
- Ne mettez jamais de clés API réelles dans des URL publiques. Ce prototype illustre le flux décrit dans le guide.

Prochaines améliorations possibles
- Upload réel d'artefacts vers un stockage et fournir des URLs
- Visualisation plus riche du profil de torréfaction
- Tests unitaires et e2e
# simulateur-mecanique
# simulateur-mecanique
