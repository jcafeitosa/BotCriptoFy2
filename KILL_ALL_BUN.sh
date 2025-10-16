#!/bin/bash

echo "🔴 Matando todos os processos Bun..."
echo ""

# Método 1: killall
killall -9 bun 2>/dev/null
sleep 1

# Método 2: pkill
pkill -9 bun 2>/dev/null
sleep 1

# Método 3: Por PID direto
ps aux | grep "bun.*index.ts" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
sleep 1

# Verificar
REMAINING=$(ps aux | grep bun | grep -v grep | wc -l)

echo "✅ Processos restantes: $REMAINING"
echo ""

if [ "$REMAINING" -eq "0" ]; then
    echo "✅ Todos os processos foram mortos com sucesso!"
    echo "✅ Você pode deletar este script agora."
else
    echo "⚠️  Ainda há $REMAINING processos rodando."
    echo "⚠️  Tente fechar e reabrir o terminal."
fi

echo ""
echo "📋 Para continuar:"
echo "   1. Leia: QUICK_START_DIA_3_5.md"
echo "   2. Execute: cd backend && bunx tsc --noEmit"
