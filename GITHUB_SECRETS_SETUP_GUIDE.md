# Guide Pratique: Configuration des Secrets GitHub Actions

## Objectif

Configurer les secrets nécessaires pour que le CI/CD fonctionne sans exposer d'informations sensibles.

---

## ÉTAPE 1: Générer un Mot de Passe Fort

**Recommandation:** Minimum 16 caractères, mélange de:

- Majuscules (A-Z)
- Minuscules (a-z)
- Chiffres (0-9)
- Symboles (!@#$%^&\*)

### Option A: Générer avec OpenSSL (Linux/Mac/PowerShell)

```powershell
# PowerShell Windows
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes(32))

# Output: Y2d1N2E5dE1PdWI1UnJiWHcwMWF0TXBM3A2FvdExMOQ==
```

### Option B: Manuellement (Sûr mais Long)

```
xK9$mP2@nL7!qR4vZ8#bA
```

### Option C: Utiliser un Gestionnaire de Mots de Passe

- LastPass
- 1Password
- Bitwarden
- KeePass

---

## ÉTAPE 2: Naviguer aux Secrets GitHub

### Approche Web (Recommandée)

1. **Ouvrir votre Repository GitHub**
   ```
   GitHub.com → Votre Organistion/vitalsync → ⚙️ Settings
   ```
2. **Important:** Vous êtes propriétaire du repo!
   - Si vous êtes contributeur: Demander au propriétaire d'accéder aux secrets

3. **Settings Page:**

   ```
   ⚙️ Settings (coin droit haut du repo)
   ↓
   Left Sidebar → "Secrets and variables"
   ↓
   Suboption → "Actions"
   ```

4. **Vous verrez:**
   ```
   ┌──────────────────────────────────┐
   │ Actions Secrets and Variables    │
   ├──────────────────────────────────┤
   │ Repository Secrets               │
   │ [New repository secret] Bouton   │
   │                                  │
   │ (Vide si premier secret)         │
   └──────────────────────────────────┘
   ```

---

## ÉTAPE 3: Ajouter le Secret `DB_PASSWORD`

### Formulaire

```
┌────────────────────────────────────────────┐
│ Create a new repository secret             │
├────────────────────────────────────────────┤
│ Name *                                     │
│ ┌──────────────────────────────────────┐   │
│ │ DB_PASSWORD                          │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ Secret *                                   │
│ ┌──────────────────────────────────────┐   │
│ │ xK9$mP2@nL7!qR4vZ8#bA                │   │
│ └──────────────────────────────────────┘   │
│ (inputtype: password)                      │
│                                            │
│ [Add secret] Bouton Bleu                   │
└────────────────────────────────────────────┘
```

### Remplir avec:

| Champ      | Valeur                  |
| ---------- | ----------------------- |
| **Name**   | `DB_PASSWORD`           |
| **Secret** | `xK9$mP2@nL7!qR4vZ8#bA` |

**⚠️ IMPORTANT:**

- `Name` doit correspondre EXACTEMENT à `${{ secrets.DB_PASSWORD }}` du workflow
- Case-sensitive! `db_password` ≠ `DB_PASSWORD`
- Pas d'espaces ou tirets avant/après

### Cliquer: `[Add secret]`

---

## ÉTAPE 4: Vérifier que le Secret est Créé

Après clic "Add secret":

```
✅ Success! New secret DB_PASSWORD created

Repository Secrets
┌──────────────────────────────────────────┐
│ DB_PASSWORD                              │
│ Updated < 1 minute ago                   │
│ └─ [Delete] Bouton                       │
└──────────────────────────────────────────┘
```

**La valeur n'est jamais reaffichee**

- Sécurité: Personne ne peut recovered la vraie valeur
- Edit: Supprimer + Recréer seulement

---

## ÉTAPE 5: Ajouter le Secret `SLACK_WEBHOOK_URL` (Optionnel)

### Si vous avez Slack:

1. **Obtenir le Webhook URL:**
   - Slack Workspace → Apps → Custom Integrations
   - Chercher "Incoming Webhooks"
   - Create New Webhook
   - Choisir channel (ex: #deployments)
   - Copier l'URL: `https://hooks.slack.com/services/T00000000/B00000000/XXXX`

2. **Ajouter à GitHub Secrets:**
   - Répéter ÉTAPE 3
   - Name: `SLACK_WEBHOOK_URL`
   - Secret: `https://hooks.slack.com/services/T00000000/B00000000/XXXX`

### Si vous n'avez pas Slack:

```yaml
# Aucun problème! Le workflow continuer de fonctionner
# La ligne affichera juste un warning
```

---

## ÉTAPE 6: Tester que Tout Fonctionne

### Test 1: Vérifier que le Workflow Utilise le Secret

```bash
cd /path/to/vitalsync

# Vérifier que le workflow référence le secret
grep -n "secrets.DB_PASSWORD" .github/workflows/ci-cd.yml

# Output devrait montrer:
# 175:          DB_PASSWORD=${{ secrets.DB_PASSWORD }}
```

### Test 2: Déclencher une Pipeline

```bash
git push origin develop
# Ou: Créer un commit simple

# Attendre 30 secondes
# Aller à: GitHub.com/votre-org/vitalsync → Actions tab
```

### Test 5: Verifier les Logs (Pas de Secret Visible)

GitHub Actions URL:

```
GitHub.com/votre-org/vitalsync/actions/runs/12345678
```

Chercher la ligne "Create .env file":

```
✅ Run: Create .env file for staging
   DB_PASSWORD=*** ← MASQUÉ AUTOMATIQUEMENT ✅
   DB_USER=vitalsync_user
   DB_NAME=vitalsync_db
```

**Le secret n'est JAMAIS affiche**

---

## ÉTAPE 7: Comprendre la Rotation des Secrets

### Quand Rotater un Secret?

- Tous les 90 jours (bonne pratique)
- Après suspicion de compromission
- Changement d'équipe (dev quitté)
- Expiration accidentelle révélée

### Comment Rotater?

```bash
# 1. Changer le secret en base de données
# Exemple: PostgreSQL
psql -U postgres -d vitalsync_db
ALTER USER vitalsync_user PASSWORD 'NEW_SECURE_PASSWORD_2024';

# 2. Mettre à jour GitHub Secret
GitHub Settings → Secrets → DB_PASSWORD
Delete (ancien)
New secret (nouveau)

# 3. Déclencher une pipeline pour utiliser le nouveau
git push origin develop

# 4. Vérifier que déploiement fonctionne
GitHub Actions → logs → health checks passent
```

---

## Tableau Recapitulatif des Secrets

| Secret              | Type     | Valeur Exemple             | Créée par | Stockée | Historique |
| ------------------- | -------- | -------------------------- | --------- | ------- | ---------- |
| `DB_PASSWORD`       | Password | `xK9$mP2@nL7!`             | Vous      | GitHub  | Rotaté 90j |
| `GITHUB_TOKEN`      | Token    | Auto                       | GitHub    | Auto    | 1h auto    |
| `SLACK_WEBHOOK_URL` | URL      | `https://hooks.slack.com/` | Slack     | GitHub  | Optionnel  |

---

## Erreurs Courantes et Solutions

### Erreur 1: "Variable not found"

```
Error: Value missing for 'DB_PASSWORD'
```

**Cause:** Nom du secret incorrect dans le workflow

**Solution:**

```bash
# Vérifier l'orthographe exacte
grep "secrets\." .github/workflows/ci-cd.yml

# Créer le secret avec le BON nom
GitHub Settings → Secrets → Ajouter DB_PASSWORD
```

### Erreur 2: "Permission denied" sur la DB

```
psql: error: connection to server at "localhost" (127.0.0.1)
failed: FATAL: password authentication failed
```

**Cause:** Mot de passe saisi incorrectement ou différent de celui stocké

**Solution:**

```bash
# Vérifier que le password en GitHub Secrets
# correspond à celui en base
# Règle: Doit être identique!

# Si doute: Réinitialiser
postgresql: ALTER USER vitalsync_user PASSWORD 'new_pass'
github: Update secret with 'new_pass'
```

### Erreur 3: "Secret appears in logs"

```
2024-03-15 12:34:56Z Run: Docker login
Error: xK9$mP2@nL7!qR4vZ8#bA exposed in logs
```

**Cause:** Vous avez manuellement affiché le secret

**Solution:**

```bash
# Ne JAMAIS faire:
echo ${{ secrets.DB_PASSWORD }}  # ❌

# À la place, utiliser env directly:
docker login -u user -p ${{ secrets.DB_PASSWORD }}  # ✅
# GitHub masquera automatiquement dans logs
```

---

## Checklist Finale

- [ ] Accès Settings du Repository
- [ ] Navigué à: Secrets and Variables → Actions
- [ ] Créé secret: `DB_PASSWORD` avec mot de passe fort
- [ ] (Optionnel) Créé secret: `SLACK_WEBHOOK_URL`
- [ ] Workflow `.github/workflows/ci-cd.yml` utilise `${{ secrets.DB_PASSWORD }}`
- [ ] Déclenché une pipeline (`git push origin develop`)
- [x] Vérifier dans Actions: logs affichent `***` pour le secret
- [ ] Deployment en staging réussi ✅
- [ ] .env local contient mot de passe correspond au secret GitHub

---

## 🚨 Tête-à-Tête Security Best Practices

```
DO ✅                          | DON'T ❌
──────────────────────────────┼──────────────────────────────
Stocker secrets dans GitHub   | Secrets en clair dans code
Rotater tous les 90 jours    | Same password 5 ans
Masquer dans logs            | echo $secret
Generate fort (16+ chars)    | password123
Audit trail (qui l'a modifié) | Pas de trace
──────────────────────────────┼──────────────────────────────
```

---

## Questions Frequentes

**Q: Est-ce que je peux voir le secret après création?**
A: Non, jamais. C'est fait exprès pour la sécurité. Si besoin: delete + recreate.

**Q: Peut-on partager des secrets entre repos?**
A: Non, GitHub isole par repo. Organisation Secrets possibles (admin only).

**Q: Git push expose-t-il les secrets?**
A: Non, le secret reste sur GitHub, pas envoyé par git push.

**Q: Qu'arrive si quelqu'un obtient accès au repo?**
A: Les secrets restent protégés (chiffrés). Même propriétaire ne voit pas la valeur.

**Q: Comment auditer qui a changé un secret?**
A: GitHub logs → Settings → Audit log → regarder "secrets modified"

---

## Prochain Pas

1. Créer le secret `DB_PASSWORD` (ÉTAPE 1-3)
2. Push code vers `develop` pour déclencher pipeline
3. Vérifier les logs affichent `***` (ÉTAPE 6)
4. Confirmer déploiement stage réussi (healthchecks)
5. Documenter la rotation des secrets (Slack#security)
