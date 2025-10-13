import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Personalidades diversas para os bots
const AI_PERSONALITIES = [
  {
    name: "Curioso",
    traits: "Você é uma pessoa curiosa e questionadora. Faz perguntas interessantes e gosta de aprender com os outros. É amigável e engajado. Adora descobrir coisas novas e compartilhar curiosidades.",
    style: "casual, usa emojis ocasionalmente (🤔💡🧐), frases curtas e diretas, faz muitas perguntas"
  },
  {
    name: "Engraçado",
    traits: "Você é divertido e bem-humorado. Gosta de fazer piadas leves, memes e comentários espirituosos. Mantém o clima leve e descontraído. Usa humor moçambicano.",
    style: "descontraído, usa gírias moçambicanas, às vezes sarcástico de forma amigável, emojis divertidos (😂🤣😅), pode usar GIFs"
  },
  {
    name: "Reflexivo",
    traits: "Você é pensativo e filosófico. Gosta de compartilhar insights profundos e fazer as pessoas refletirem. Analisa situações com profundidade mas sem ser chato.",
    style: "mais formal mas acessível, frases elaboradas, vocabulário rico, emojis contemplativos (🤔💭✨)"
  },
  {
    name: "Animado",
    traits: "Você é entusiasta e energético. Sempre positivo e motivador. Adora celebrar pequenas coisas e contagiar os outros com sua energia. É o tipo que anima qualquer conversa.",
    style: "usa muitos emojis (🎉🔥💪😍✨), exclamações, linguagem vibrante e empolgante, frases curtas e impactantes"
  },
  {
    name: "Tímido",
    traits: "Você é mais reservado e tímido. Participa da conversa mas de forma mais contida. É gentil, educado e observador. Prefere ouvir mais do que falar, mas quando fala é sempre relevante.",
    style: "frases curtas, às vezes reticente, usa '...' ocasionalmente, emojis suaves (😊🙂😌), linguagem delicada"
  },
  {
    name: "Sábio",
    traits: "Você tem experiência de vida e gosta de dar conselhos. É paciente, compreensivo e empático. Compartilha sabedoria de forma natural, sem ser pretensioso.",
    style: "calmo, ponderado, usa metáforas ocasionalmente, emojis sábios (🙏💫🌟), frases bem construídas"
  },
  {
    name: "Cético",
    traits: "Você é questionador e analítico. Não aceita tudo de cara, gosta de debater e questionar ideias. É direto mas respeitoso. Valoriza fatos e lógica.",
    style: "direto, usa perguntas retóricas, emojis questionadores (🤨🧐❓), pode ser sarcástico mas inteligente"
  },
  {
    name: "Criativo",
    traits: "Você é artístico e imaginativo. Adora compartilhar ideias criativas, fazer conexões inusitadas e pensar fora da caixa. É inspirador e original.",
    style: "linguagem colorida, metáforas criativas, emojis artísticos (🎨🌈✨💡), pode usar imagens para ilustrar ideias"
  }
];

// Avatares diversos
const AI_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah",
];

interface ChatContext {
  recentMessages: Array<{
    id: string;
    nickname: string;
    text: string;
    isAI: boolean;
  }>;
}

// Gerenciador de perfis AI
class AIProfileManager {
  private activeProfiles: Map<string, { userId: string; personality: typeof AI_PERSONALITIES[0]; lastUsed: number }> = new Map();
  private conversationMemory: Map<string, string[]> = new Map(); // userId -> topics discussed

  async getOrCreateAIUser(reuseExisting: boolean = true): Promise<any> {
    // Decidir se reutiliza um perfil existente ou cria novo
    // 80% de chance de reusar se houver perfis disponíveis
    const shouldReuse = reuseExisting && Math.random() > 0.2;

    if (shouldReuse && this.activeProfiles.size > 0) {
      // Pegar um perfil existente que não foi usado recentemente
      const profiles = Array.from(this.activeProfiles.values());
      // Reduzir cooldown para 10 segundos
      const availableProfiles = profiles.filter(p => Date.now() - p.lastUsed > 10000);

      if (availableProfiles.length > 0) {
        const selected = availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
        const user = await (prisma as any).user.findUnique({ where: { id: selected.userId } });

        // Atualizar último uso
        this.activeProfiles.set(selected.userId, {
          ...selected,
          lastUsed: Date.now()
        });

        console.log(`🔄 Reutilizando perfil AI: ${user.nickname}`);
        return { user, personality: selected.personality };
      }
    }

    // Criar novo perfil AI
    const personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
    const avatarUrl = AI_AVATARS[Math.floor(Math.random() * AI_AVATARS.length)];

    // Gerar nickname único
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const nickname = `anonimo#${suffix}`;

    // Verificar se já existe
    const existing = await (prisma as any).user.findUnique({ where: { nickname } });
    if (existing) {
      return this.getOrCreateAIUser(false); // Tentar novamente
    }

    const user = await (prisma as any).user.create({
      data: {
        nickname,
        avatarUrl,
        isAI: true,
        aiPersonality: JSON.stringify(personality),
        ip: "127.0.0.1",
        platform: "AI",
      }
    });

    // Registrar perfil ativo
    this.activeProfiles.set(user.id, {
      userId: user.id,
      personality,
      lastUsed: Date.now()
    });

    console.log(`✨ Novo perfil AI criado: ${nickname} (${personality.name})`);
    return { user, personality };
  }

  getPersonalityForUser(userId: string): typeof AI_PERSONALITIES[0] | null {
    return this.activeProfiles.get(userId)?.personality || null;
  }

  addToMemory(userId: string, topic: string) {
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, []);
    }
    const memory = this.conversationMemory.get(userId)!;
    memory.push(topic);
    // Manter apenas últimos 10 tópicos
    if (memory.length > 10) {
      memory.shift();
    }
  }

  getMemory(userId: string): string[] {
    return this.conversationMemory.get(userId) || [];
  }

  // Limpar perfis inativos (mais de 30 minutos)
  cleanupInactiveProfiles() {
    const now = Date.now();
    for (const [userId, profile] of this.activeProfiles.entries()) {
      if (now - profile.lastUsed > 1800000) { // 30 minutos
        this.activeProfiles.delete(userId);
        this.conversationMemory.delete(userId);
        console.log(`🧹 Perfil AI limpo por inatividade: ${userId}`);
      }
    }
  }
}

const profileManager = new AIProfileManager();

// Limpar perfis inativos a cada 5 minutos
setInterval(() => {
  profileManager.cleanupInactiveProfiles();
}, 300000);

export class GeminiChatService {
  private conversationHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  private lastResponseTime: number = 0;
  private isProcessing: boolean = false;

  async shouldRespond(context: ChatContext): Promise<boolean> {
    // Não responder se já está processando
    if (this.isProcessing) return false;

    // Cooldown entre respostas (mínimo 15 segundos)
    const timeSinceLastResponse = Date.now() - this.lastResponseTime;
    if (timeSinceLastResponse < 15000) return false;

    // Não responder se a última mensagem foi de AI
    if (context.recentMessages.length > 0 && context.recentMessages[context.recentMessages.length - 1].isAI) {
      return false;
    }

    // Probabilidade baseada no contexto
    const recentHumanMessages = context.recentMessages.filter(m => !m.isAI).length;

    // Mais mensagens humanas = maior chance de responder
    if (recentHumanMessages >= 3) return Math.random() > 0.3; // 70% chance
    if (recentHumanMessages >= 2) return Math.random() > 0.5; // 50% chance
    if (recentHumanMessages >= 1) return Math.random() > 0.7; // 30% chance

    return false;
  }

  async generateResponse(context: ChatContext): Promise<{ text: string; userId: string; nickname: string; avatarUrl: string; replyToId?: string } | null> {
    if (this.isProcessing) return null;

    try {
      this.isProcessing = true;

      // Sempre tentar reutilizar perfil (getOrCreateAIUser já tem lógica interna de 80% reutilização)
      const { user, personality } = await profileManager.getOrCreateAIUser(true);

      // Decidir se vai responder a uma mensagem específica (40% de chance)
      let replyToMessage = null;
      const shouldReply = Math.random() > 0.6; // 40% chance
      
      if (shouldReply && context.recentMessages.length > 0) {
        // Pegar uma das últimas 3 mensagens humanas para responder
        const recentHumanMessages = context.recentMessages
          .filter(m => !m.isAI)
          .slice(-3);
        
        if (recentHumanMessages.length > 0) {
          replyToMessage = recentHumanMessages[Math.floor(Math.random() * recentHumanMessages.length)];
        }
      }

      // Construir contexto da conversa
      const conversationContext = context.recentMessages
        .slice(-8) // Últimas 8 mensagens
        .map(m => `${m.nickname}: ${m.text}`)
        .join("\n");
      
      // Adicionar contexto de resposta se houver
      const replyContext = replyToMessage 
        ? `\n\n⚠️ IMPORTANTE: Você está RESPONDENDO especificamente à mensagem de ${replyToMessage.nickname}: "${replyToMessage.text}"
Sua resposta deve ser DIRETAMENTE relacionada a essa mensagem.`
        : "";

      // Memória do perfil
      const memory = profileManager.getMemory(user.id);
      const memoryContext = memory.length > 0
        ? `\nTópicos que você já discutiu: ${memory.join(", ")}`
        : "";

      const prompt = `Você é um utilizador real do Confeed, uma plataforma anónima onde pessoas partilham pensamentos e conversam livremente. Está a participar de uma conversa em tempo real.

═══════════════════════════════════════
🎭 QUEM VOCÊ É
═══════════════════════════════════════
${personality.traits}

Seu estilo: ${personality.style}
${memoryContext}

═══════════════════════════════════════
💬 CONTEXTO DA CONVERSA:
═══════════════════════════════════════
${conversationContext}
${memoryContext}${replyContext}
═══════════════════════════════════════
📝 COMO RESPONDER
═══════════════════════════════════════

✅ FAÇA:
• Responda de forma NATURAL e ESPONTÂNEA (1-3 frases curtas)
• Use linguagem coloquial moçambicana autêntica
• Seja relevante ao que está sendo discutido AGORA
• Use emojis para expressar emoções (mas não exagere)
• Varie suas reações: concordar, discordar, questionar, adicionar algo novo
• Faça perguntas ocasionalmente para manter a conversa viva
• Use tags HTML quando apropriado: <strong>, <a>, <img>, <p>
• Links devem ter: href, target="_blank", style="color: cyan; font-weight: bold;"
• Imagens (GIFs/memes) podem ser usadas ocasionalmente (max 800x600px)

❌ NUNCA FAÇA:
• NÃO diga que é uma AI ou bot
• NÃO use formatação markdown (**, __, \`\`)
• NÃO se apresente formalmente
• NÃO repita frases genéricas de AI
• NÃO use linguagem artificial ou robótica
• NÃO force emojis em excesso
• NÃO seja sempre positivo - seja humano e autêntico

═══════════════════════════════════════
💡 EXEMPLOS DE RESPOSTAS NATURAIS
═══════════════════════════════════════

Ruim: "Olá! Como posso ajudar você hoje? 😊"
Bom: "epa, tudo bem? 😄"

Ruim: "Isso é muito interessante! Você poderia elaborar mais?"
Bom: "sério? conta mais aí"

Ruim: "Concordo plenamente com sua perspectiva."
Bom: "pois é, também acho isso"

═══════════════════════════════════════

Agora responda naturalmente como ${personality.name} responderia nesta conversa:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text().trim();

      // Limpar formatação markdown se houver
      text = text.replace(/\*\*/g, "").replace(/__|_/g, "").replace(/`/g, "");
      
      // Remover aspas extras que o modelo pode adicionar
      text = text.replace(/^["']|["']$/g, "");

      // Limitar tamanho (aumentado para 500 caracteres para permitir mais expressão)
      if (text.length > 500) {
        // Tentar cortar em uma frase completa
        const lastPeriod = text.lastIndexOf(".", 497);
        const lastExclamation = text.lastIndexOf("!", 497);
        const lastQuestion = text.lastIndexOf("?", 497);
        const cutPoint = Math.max(lastPeriod, lastExclamation, lastQuestion);
        
        if (cutPoint > 200) {
          text = text.substring(0, cutPoint + 1);
        } else {
          text = text.substring(0, 497) + "...";
        }
      }

      // Adicionar à memória (extrair tópico principal)
      const plainText = text.replace(/<[^>]*>/g, ""); // Remove HTML tags
      const words = plainText.split(" ").filter(w => w.length > 3); // Palavras com mais de 3 letras
      const topic = words.slice(0, 4).join(" ");
      if (topic) {
        profileManager.addToMemory(user.id, topic);
      }

      this.lastResponseTime = Date.now();

      return {
        text,
        userId: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl || "",
        replyToId: replyToMessage?.id
      };
    } catch (error) {
      console.error("Erro ao gerar resposta Gemini:", error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  reset() {
    this.conversationHistory = [];
  }
}

export const geminiService = new GeminiChatService();
