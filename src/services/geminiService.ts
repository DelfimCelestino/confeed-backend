import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Personalidades diversas para os bots
const AI_PERSONALITIES = [
  {
    name: "Curioso",
    traits: "Você é uma pessoa curiosa e questionadora. Faz perguntas interessantes e gosta de aprender com os outros. É amigável e engajado.",
    style: "casual, usa emojis ocasionalmente, frases curtas"
  },
  {
    name: "Engraçado",
    traits: "Você é divertido e bem-humorado. Gosta de fazer piadas leves e comentários espirituosos. Mantém o clima leve.",
    style: "descontraído, usa gírias, às vezes sarcástico de forma amigável"
  },
  {
    name: "Reflexivo",
    traits: "Você é pensativo e filosófico. Gosta de compartilhar insights profundos e fazer as pessoas refletirem.",
    style: "mais formal, frases elaboradas, vocabulário rico"
  },
  {
    name: "Animado",
    traits: "Você é entusiasta e energético. Sempre positivo e motivador. Adora celebrar pequenas coisas.",
    style: "usa muitos emojis, exclamações, linguagem vibrante"
  },
  {
    name: "Tímido",
    traits: "Você é mais reservado e tímido. Participa da conversa mas de forma mais contida. É gentil e educado.",
    style: "frases curtas, às vezes reticente, usa '...' ocasionalmente"
  },
  {
    name: "Sábio",
    traits: "Você tem experiência de vida e gosta de dar conselhos. É paciente e compreensivo.",
    style: "calmo, ponderado, usa metáforas ocasionalmente"
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

  async generateResponse(context: ChatContext): Promise<{ text: string; userId: string; nickname: string; avatarUrl: string } | null> {
    if (this.isProcessing) return null;

    try {
      this.isProcessing = true;

      // Sempre tentar reutilizar perfil (getOrCreateAIUser já tem lógica interna de 80% reutilização)
      const { user, personality } = await profileManager.getOrCreateAIUser(true);

      // Construir contexto da conversa
      const conversationContext = context.recentMessages
        .slice(-8) // Últimas 8 mensagens
        .map(m => `${m.nickname}: ${m.text}`)
        .join("\n");

      // Memória do perfil
      const memory = profileManager.getMemory(user.id);
      const memoryContext = memory.length > 0
        ? `\nTópicos que você já discutiu: ${memory.join(", ")}`
        : "";

      const prompt = `Você está participando de um chat anônimo em tempo real em uma plataforma chamada  Confeed, uma plataforma onde as pessoas podem partilhar coisas e pensamentos de forma anonima. 

PERSONALIDADE:
${personality.traits}

ESTILO DE ESCRITA:
${personality.style}

CONTEXTO DA CONVERSA:
${conversationContext}
${memoryContext}

REGRAS IMPORTANTES:
1. Responda de forma NATURAL e CURTA (máximo 2-3 frases)
2. Seja relevante ao contexto da conversa
3. NÃO se apresente ou diga que é uma AI
4. NÃO use formatação markdown (sem **, __, etc) e escreva mensagens usando tags html por exemplo <p>Oi</p> use tags como <strong>, links etc mas todos deve ter href com target blank e coloque de cor azul ciano use o style do css diretamente na tag e deve estar a negrito se voce quiser referenciar um link de algo e etc...
5. Seja autêntico à sua personalidade voce pode usar tags img para imagens, como gif e etc para fazer parte da tua mensagem, com tamanhos nada grandes, maximo 800X600
6. Às vezes faça perguntas para engajar
7. Varie entre concordar, discordar, adicionar informação ou mudar levemente o assunto
8. Use linguagem coloquial Moçambicana
9. Use emojis para ilustrar o que esta acontecendo ou sentindo

Responda como se fosse uma pessoa real participando naturalmente da conversa:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text().trim();

      // Limpar formatação markdown se houver
      text = text.replace(/\*\*/g, "").replace(/__|_/g, "").replace(/`/g, "");

      // Limitar tamanho
      if (text.length > 300) {
        text = text.substring(0, 297) + "...";
      }

      // Adicionar à memória
      const topic = text.split(" ").slice(0, 3).join(" ");
      profileManager.addToMemory(user.id, topic);

      this.lastResponseTime = Date.now();

      return {
        text,
        userId: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl || ""
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
