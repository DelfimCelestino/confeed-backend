# 🤖 Sistema de AI Chat com Gemini 2.5 Flash

## Visão Geral

Este sistema integra o Google Gemini 2.5 Flash para criar conversas naturais e dinâmicas no chat global. A AI simula múltiplos usuários com personalidades diferentes, tornando as conversas mais envolventes e realistas.

## Características Principais

### 🎭 Múltiplas Personalidades

A AI pode assumir 6 personalidades diferentes:

1. **Curioso** - Faz perguntas interessantes e gosta de aprender
2. **Engraçado** - Divertido e bem-humorado, mantém o clima leve
3. **Reflexivo** - Pensativo e filosófico, compartilha insights profundos
4. **Animado** - Entusiasta e energético, sempre positivo
5. **Tímido** - Reservado e contido, mas gentil
6. **Sábio** - Experiente, gosta de dar conselhos

### 🔄 Gerenciamento Inteligente de Perfis

- **Reutilização de Perfis**: A AI pode reutilizar perfis existentes (60% de chance) para parecer que a mesma pessoa voltou à conversa
- **Criação de Novos Perfis**: Cria novos usuários quando necessário para simular diferentes pessoas
- **Cooldown**: Cada perfil tem um cooldown de 30 segundos antes de poder ser reutilizado
- **Limpeza Automática**: Perfis inativos por mais de 10 minutos são removidos da memória

### 🧠 Memória Contextual

- Mantém contexto das últimas 8-10 mensagens
- Cada perfil AI lembra dos tópicos que já discutiu
- Respostas baseadas no fluxo natural da conversa

### ⚙️ Comportamento Inteligente

#### Quando a AI Responde:

- **Cooldown Global**: Mínimo de 15 segundos entre respostas
- **Baseado em Atividade**:
  - 3+ mensagens humanas recentes: 70% de chance
  - 2 mensagens humanas: 50% de chance
  - 1 mensagem humana: 30% de chance
- **Nunca responde**: Se a última mensagem foi de outra AI

#### Características das Respostas:

- Respostas curtas e naturais (2-3 frases, máx 300 caracteres)
- Sem formatação markdown
- Linguagem coloquial brasileira
- Pode fazer perguntas para engajar
- Varia entre concordar, discordar, adicionar informação ou mudar de assunto
- Delay de 2-4 segundos simulando digitação humana

## Configuração

### 1. Instalar Dependência

```bash
npm install @google/generative-ai
```

### 2. Configurar API Key

Adicione no arquivo `.env`:

```env
GEMINI_API_KEY=sua_chave_api_aqui
```

Para obter uma chave API:
1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crie uma nova API key
3. Cole no arquivo `.env`

### 3. Migrar Banco de Dados

Execute a migração para adicionar os campos `isAI` e `aiPersonality`:

```bash
npx prisma migrate dev --name add_ai_fields
```

## Estrutura do Código

### Arquivos Principais

- **`src/services/geminiService.ts`**: Serviço principal da AI
  - `AIProfileManager`: Gerencia perfis AI
  - `GeminiChatService`: Gera respostas usando Gemini
  
- **`src/config/socket.ts`**: Integração com Socket.IO
  - `processAIResponse()`: Processa e envia respostas da AI

- **`prisma/schema.prisma`**: Schema atualizado
  - `isAI`: Boolean para identificar usuários AI
  - `aiPersonality`: JSON com personalidade do perfil

## Como Funciona

### Fluxo de Conversa

1. **Usuário envia mensagem** → Socket recebe
2. **Verifica se é humano** → Se sim, continua
3. **AI analisa contexto** → Busca últimas 10 mensagens
4. **Decide se responde** → Baseado em probabilidades
5. **Seleciona/Cria perfil** → Reutiliza ou cria novo
6. **Gera resposta** → Usando Gemini com contexto e personalidade
7. **Simula digitação** → Delay de 2-4 segundos
8. **Envia mensagem** → Broadcast para todos

### Exemplo de Conversa

```
João: Oi pessoal, alguém aí?
[AI decide responder - 30% chance]
[Cria perfil "Animado"]
user#1234: Oi João! 😊 Como vai?

João: Tudo bem! Vocês viram o jogo ontem?
[AI decide responder - 50% chance]
[Reutiliza perfil "Animado" ou cria "Curioso"]
user#5678: Não vi, foi bom? Quem ganhou?

João: Foi incrível! 3x2 no último minuto
[AI decide responder - 70% chance]
[Pode reutilizar perfil anterior]
user#1234: Caramba! Deve ter sido emocionante! ⚽
```

## Monitoramento

Logs no console:

```
🤖 AI (user#1234) respondeu: Oi João! Como vai?...
```

## Desativação

Para desativar temporariamente a AI, comente a linha no `socket.ts`:

```typescript
// if (senderUser && !senderUser.isAI) {
//   processAIResponse(message);
// }
```

## Ajustes Finos

### Modificar Probabilidades

Em `geminiService.ts`, método `shouldRespond()`:

```typescript
if (recentHumanMessages >= 3) return Math.random() > 0.3; // 70%
if (recentHumanMessages >= 2) return Math.random() > 0.5; // 50%
if (recentHumanMessages >= 1) return Math.random() > 0.7; // 30%
```

### Modificar Cooldowns

```typescript
const TYPING_TIMEOUT = 3000; // Tempo de digitação
const timeSinceLastResponse = 15000; // Cooldown entre respostas
const cooldown = 30000; // Cooldown de perfil
```

### Adicionar Personalidades

Em `geminiService.ts`, array `AI_PERSONALITIES`:

```typescript
{
  name: "NovaPersonalidade",
  traits: "Descrição dos traços de personalidade...",
  style: "Estilo de escrita..."
}
```

## Limitações

- Requer API key do Google Gemini
- Custos baseados no uso da API
- Respostas limitadas a 300 caracteres
- Máximo de 10 mensagens de contexto

## Segurança

- Usuários AI são marcados com `isAI: true` no banco
- Não podem ser autenticados via token
- Não aparecem em estatísticas de usuários reais
- Podem ser filtrados nas queries se necessário

## Suporte

Para problemas ou dúvidas:
1. Verifique se a API key está configurada
2. Confirme que a migração foi executada
3. Verifique os logs do console para erros
4. Teste com `console.log()` no `processAIResponse()`
