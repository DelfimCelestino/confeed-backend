
# 📘 Guia de Conventional Commits

**Conventional Commits** é uma convenção de nomenclatura para mensagens de commit no Git. Ela padroniza o formato das mensagens para tornar o histórico mais claro, facilitar a automação (como geração de changelogs) e ajudar no controle de versionamento semântico.

---

## ✍️ Estrutura Básica

```
<tipo>[escopo opcional]: <mensagem curta>
```

### Exemplos:

```bash
feat: adicionar funcionalidade de login
fix: corrigir bug no cálculo de frete
chore: atualizar dependências do projeto
```

---

## 🔠 Tipos Mais Comuns

| Tipo        | Descrição                                                  |
|-------------|------------------------------------------------------------|
| `feat`      | Nova funcionalidade para o sistema                         |
| `fix`       | Correção de bug                                            |
| `docs`      | Mudança apenas na documentação                             |
| `style`     | Mudanças de formatação (espaços, ponto e vírgula, etc.)    |
| `refactor`  | Refatoração sem adicionar funcionalidade ou corrigir bugs |
| `test`      | Adição ou modificação de testes                            |
| `chore`     | Alterações em build, scripts ou dependências               |

---

## 🧩 Uso com Escopo

O escopo é opcional e representa a área do sistema afetada pela mudança.

```bash
feat(auth): adicionar JWT na autenticação
```

---

## ✅ Benefícios

- Histórico de commits mais organizado e legível
- Facilita a **geração automática de changelogs**
- Suporte ao **versionamento semântico automático**
- Melhora a colaboração entre times

---

## 💡 Dica

Evite mensagens genéricas como `update` ou `fix bug`. Usar Conventional Commits deixa o histórico muito mais útil e profissional!

---

## 🔧 Ferramentas Relacionadas

- [`commitlint`](https://commitlint.js.org/): Linter para mensagens de commit baseado em Conventional Commits
- [`semantic-release`](https://semantic-release.gitbook.io/): Geração automática de changelogs e versionamento baseado nos commits
