# 🚀 Setup Rápido - AI Chat

## Passo a Passo

### 1. Instalar Dependência

```bash
cd Backend
npm install @google/generative-ai
```

### 2. Configurar API Key

1. Acesse: https://makersuite.google.com/app/apikey
2. Crie uma nova API key
3. Adicione no arquivo `.env`:

```env
GEMINI_API_KEY=sua_chave_aqui
```

### 3. Migrar Banco de Dados

```bash
npx prisma migrate dev --name add_ai_fields
```

Ou se preferir criar a migração manualmente:

```bash
npx prisma migrate dev
```

### 4. Reiniciar Servidor

```bash
npm run dev
```

## Verificação

1. Abra o chat
2. Envie algumas mensagens
3. Aguarde 15-30 segundos
4. A AI deve responder automaticamente

## Logs

Você verá no console:

```
🤖 AI (user#1234) respondeu: Oi! Como vai?...
```

## Troubleshooting

### AI não responde?

1. Verifique se `GEMINI_API_KEY` está no `.env`
2. Confirme que a migração foi executada
3. Verifique os logs do console
4. Tente enviar 2-3 mensagens seguidas (aumenta probabilidade)

### Erro de módulo não encontrado?

```bash
npm install @google/generative-ai
```

### Erro no Prisma?

```bash
npx prisma generate
npx prisma migrate dev
```

## Desativar AI

Comente no arquivo `Backend/src/config/socket.ts` (linha ~216):

```typescript
// if (senderUser && !senderUser.isAI) {
//   processAIResponse(message);
// }
```
