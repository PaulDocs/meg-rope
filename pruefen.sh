#!/usr/bin/env bash
# Pruefung dieses Repos. ~/.claude/hooks/pruefstand.py laesst Commit und Push der
# KI erst durch, wenn sie fuer den aktuellen Stand gruen war. Ablauf und Funktionen:
# 20-Infra/pruefung/lauf.sh, bekannte Funde der Browserpruefung: .pruefung-bekannt
#
# Meg Rope: Typpruefung, Physik-Tests, Bau mit Vite, gebautes Spiel im Browser.
source /home/node/work/20-Infra/pruefung/lauf.sh

abhaengigkeiten .
schritt "Typpruefung" npx tsc --noEmit
schritt "Tests" npm test
schritt "Bau Cloud" env VITE_CLOUD=1 npx vite build --outDir dist-cloud
schritt "Bau" npx vite build
seite dist
fertig
