# AGENTS.md — konwencje dla agentów kodujących w tym repo

## Zasada nr 1: pokaż wynik, nie deklarację
Nie mów „testy przechodzą". Uruchom je i wklej rzeczywisty output (ostatnie linie + liczba passed). To samo dla buildów i syntax checków. Jeśli czegoś nie możesz uruchomić — napisz to wprost.

## Review przed PR
Zanim otworzysz PR, przeczytaj swój własny diff na świeżym kontekście (nowa sesja/subagent, bez pamięci o „co miałem na myśli"). Sprawdź: czy zmiana realizuje intencję, czy nie psuje niczego poza plikami, które dotknęła, czy da się cofnąć jednym krokiem.

## Limit 3 cykli
Maksymalnie 3 rundy fix→review na PR. Potem reviewer patrzy tylko na nowy diff. Jeśli po 3 cyklach problem wraca — to sygnał architektoniczny: przestań iterować, przeprojektuj podejście.

## PR template obowiązuje
Każdy PR ma sekcje: intencja, Testing (output), Ryzyko (low/medium/high), Revert plan. high = auth/billing/auto-update/migracja → człowiek musi zobaczyć przed merge.

## Incydent = wpis do INCIDENTS.md
Cokolwiek trafiło na main i zepsuło się: opisz, która warstwa review miała to złapać, dopisz poprawkę do procesu. Reviewer uczy się jak model z benchmarkiem — każdy incydent to case treningowy.

## Co robi człowiek
Decyzje „czy to w ogóle budować", architektura, audit kodu high-risk, branie odpowiedzialności za merge. Reszta jest automatyczna: `ai-review` (bug+security+verify), `gitleaks`, `ci` (syntax + 116 testów functional).
