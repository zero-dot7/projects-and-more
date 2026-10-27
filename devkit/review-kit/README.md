# review-kit — standard review dla nowych projektów

Kopiuj do każdego nowego repo (aktualne + przyszłe projekty). Kopiujesz raz, masz stały element procesu.

## Zawartość (źródło: root tego repo)

| Plik | Dokąd w nowym repo |
|---|---|
| `.github/scripts/ai_review.py` | bez zmian |
| `.github/workflows/ai-review.yml` | bez zmian |
| `.github/workflows/gitleaks.yml` | bez zmian |
| `.github/workflows/ci.yml` | dostosuj joby (testy/ lint danego stacku) |
| `.github/PULL_REQUEST_TEMPLATE.md` | bez zmian |
| `CLAUDE.md`, `REVIEW.md`, `INCIDENTS.md` | dostosuj ścieżki testów w CLAUDE.md |

## Instalacja (5 kroków)

1. Skopiuj pliki (tabela wyżej).
2. `gh secret set OPENROUTER_API_KEY < ~/.hermes/scripts/.openrouter_key -R <owner>/<repo>`
3. Opcjonalnie model: `gh variable set REVIEW_MODEL -R <owner>/<repo> -b "<model-openrouter>"` (domyślnie łańcuch darmowych: qwen3-coder → deepseek → glm, płatny qwen3-coder jako fallback).
4. Reguły brancha (PR-owy pipeline, bez blokowania direct-push admina):
   ```bash
   gh api -X POST repos/<owner>/<repo>/rulesets -f name=required-checks \
     -f "target=branch" -f "enforcement=active" -f "conditions[ref_name][include][]=refs/heads/main" \
     -F "rules[][type]=required_status_checks" \
     -f 'rules[][parameters][required_checks][][context]=ai-review' \
     -f 'rules[][parameters][required_checks][][context]=gitleaks'
   ```
   (dodaj konteksty jobów z ci.yml, np. `js-syntax`, `speed-dial-tests`)
5. Otwórz testowy PR — `ai-review` musi zadać komentarz z tabelą findings. Bez tego instalacja nie zaliczona.

## Stały element pracy z kodem (niezależnie od repo)

1. PR (nie push na main) dla wszystkiego poza trywialiami.
2. Template PR wypełniony naprawdę — Testing z wklejonym outputem, Revert plan.
3. Maks. 3 cykle fix→review, potem tylko nowy diff; powrót problemu = redesign.
4. high-risk zmiana = człowiek czyta diff przed merge (AI approval nie wystarcza).
5. Incydent → wpis w INCIDENTS.md → poprawka procesu.
