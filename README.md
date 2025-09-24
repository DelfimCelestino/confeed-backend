# Confeed  🚀

Uma codebase robusta para aplicativos sociais, desenvolvida por Delfim Celestino. Este projeto serve como base para construção de aplicativos com funcionalidades sociais, chat em tempo real e gerenciamento de eventos.

## 🎯 Sobre o Projeto

Este é um template de codebase que pode ser utilizado para criar aplicativos sociais com:
- Autenticação segura
- Chat em tempo real
- Upload de mídia
- Gerenciamento de eventos
- Sistema de notificações
- API RESTful

## 🛠️ Stack Tecnológica

### Backend
- [Node.js](https://nodejs.org) - Runtime JavaScript
- [Fastify](https://www.fastify.io) - Framework web rápido
- [TypeScript](https://www.typescriptlang.org) - Superset JavaScript
- [Socket.IO](https://socket.io) - Comunicação em tempo real
- [Prisma](https://www.prisma.io) - ORM moderno
- [AWS S3](https://aws.amazon.com/s3) - Armazenamento de arquivos
- [JWT](https://jwt.io) - Autenticação

### Frontend (Exemplo)
- [React Native](https://reactnative.dev)
- [Expo](https://expo.dev)
- [TypeScript](https://www.typescriptlang.org)

## 🏗️ Estrutura do Projeto

```
backend/
├── src/
│   ├── config/          # Configurações (DB, AWS, etc)
│   ├── controllers/     # Controladores da API
│   ├── middlewares/     # Middlewares
│   ├── routes/          # Rotas da API
│   ├── services/        # Lógica de negócio
│   └── types/          # Tipos TypeScript
├── prisma/             # Schema e migrações
└── tests/             # Testes
```

## 🚀 Começando

1. Clone o repositório
   ```bash
   git clone https://github.com/Delfimcelestino/planaki.git
   cd planaki/backend
   ```

2. Instale as dependências
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente
   ```bash
   cp .env.example .env
   ```
   Edite o arquivo `.env` com suas configurações

4. Inicie o servidor de desenvolvimento
   ```bash
   npm run dev
   ```

## 📚 Documentação da API

A documentação completa da API está disponível em `/api-docs` quando o servidor estiver rodando.

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila o projeto
- `npm run start` - Inicia o servidor em produção
- `npm run prisma:generate` - Gera o cliente Prisma
- `npm run prisma:migrate` - Executa migrações do banco de dados

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Delfim Celestino**
- GitHub: [@Delfimcelestino](https://github.com/Delfimcelestino)
- Email: delfimcelestinoamissepastola@gmail.com

## 📧 Contato

Para suporte ou dúvidas, entre em contato:
- Email: delfimcelestinoamissepastola@gmail.com
- LinkedIn: [Delfim Celestino](https://linkedin.com/in/seu-linkedin) 