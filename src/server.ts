import dotenv from "dotenv";
import fastify, {
  FastifyInstance,
  FastifyServerOptions,
  RawServerDefault,
} from "fastify";
import fs from "fs";
import path from "path";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";
import { initialize as initializeSocket } from "./config/socket";

// Configuração do ambiente
dotenv.config();
const PORT: number = Number(process.env.SERVER_PORT) || 3333;
const NODE_ENV: string = process.env.NODE_ENV || "development";

// Configurações de diretórios
const DIRECTORIES = {
  uploads: path.join(__dirname, "../uploads"),
  public: path.join(__dirname, "../public"),
};

// Configurações do servidor
const SERVER_CONFIG: FastifyServerOptions = {
  logger: {
    level: NODE_ENV === "development" ? "info" : "warn",
  },
  bodyLimit: 100 * 1024 * 1024, // 100MB
  trustProxy: true,
  connectionTimeout: 180 * 1000, // 3 minutos
  keepAliveTimeout: 180 * 1000, // 3 minutos
};

// Configurações de plugins
const PLUGIN_CONFIG = {
  multipart: {
    attachFieldsToBody: true,
    limits: {
      fieldSize: 100 * 1024 * 1024,
      fileSize: 100 * 1024 * 1024,
    },
  },
  publicStatic: {
    root: DIRECTORIES.public,
    prefix: "/public/",
  },
  uploadsStatic: {
    root: DIRECTORIES.uploads,
    prefix: "/uploads/",
    decorateReply: false,
    setHeaders: (res: any) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=31536000");
    },
    list: true,
    wildcard: true,
  },
};

/**
 * Configura e retorna uma instância do Fastify com todos os plugins e rotas
 */
const createFastifyServer = async (): Promise<
  FastifyInstance<RawServerDefault>
> => {
  // Criar diretório de uploads se não existir
  if (!fs.existsSync(DIRECTORIES.uploads)) {
    fs.mkdirSync(DIRECTORIES.uploads, { recursive: true });
  }

  const server = fastify(SERVER_CONFIG);

  // Registrar plugins
  server.register(cors, {
    origin: ["*"], // Frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  server.register(multipart, PLUGIN_CONFIG.multipart);
  server.register(fastifyStatic, PLUGIN_CONFIG.publicStatic);
  server.register(fastifyStatic, PLUGIN_CONFIG.uploadsStatic);

  // Registrar rotas
  await registerRoutes(server);

  return server;
};

/**
 * Configura handlers de erro e eventos do servidor
 */
const configureServerHandlers = (server: FastifyInstance) => {
  // Error handler
  server.setErrorHandler((error: Error, request: any, reply: any) => {
    console.error(`Erro na rota ${request.url}:`, error);
    reply.status(500).send({
      error: "Internal Server Error",
      message: NODE_ENV === "development" ? error.message : "Ocorreu um erro",
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n🛑 Recebido ${signal}, encerrando servidor...`);
    await server.close();
    console.log("✅ Servidor encerrado com sucesso");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("unhandledRejection", (reason: any) => {
    console.error("Unhandled Rejection:", reason);
  });
};

/**
 * Inicia o servidor
 */
const startServer = async (): Promise<void> => {
  try {
    const server = await createFastifyServer();
    configureServerHandlers(server);

    // Inicializa o Socket.IO
    const io = initializeSocket(server);
    console.log("🔌 Socket.IO inicializado");

    await server.listen({
      port: PORT,
      host: "0.0.0.0",
    });

    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${NODE_ENV}`);
  } catch (err: any) {
    console.error("💥 Falha crítica ao iniciar o servidor:", err);
    process.exit(1);
  }
};

// Inicia o servidor
startServer().catch((err: Error) => {
  console.error("Erro ao iniciar o servidor:", err);
  process.exit(1);
});
