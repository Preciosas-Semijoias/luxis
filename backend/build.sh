#!/usr/bin/env bash
set -e  # Faz o script parar se algum comando falhar

# Instala dependências incluindo devDependencies (necessário para nest CLI e ts-node)
npm install --include=dev

# Build do projeto
npm run build

# Roda as migrations do TypeORM
npm run prod:migration:run

# Cria ou atualiza o superusuário inicial
npm run prod:seed:superuser

# Remove devDependencies após o build para reduzir tamanho do deploy
npm prune --omit=dev