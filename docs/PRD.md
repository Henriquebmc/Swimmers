# Swimmers - Product Requirements Document (PRD)

## 1. Visão do Produto
O **Swimmers** é uma plataforma de alta performance voltada para nadadores amadores e profissionais, com o objetivo de registrar, rastrear e analisar tempos de provas e histórico competitivo. O diferencial central é a extração automatizada de resultados de natação via leitura de PDFs de campeonatos alimentados por Inteligência Artificial (Gemini).  
Os nadadores podem visualizar seus recordes e progressos em um dashboard encantador e superintuitivo, construído com foco na temática "Deep Water Performance" e navegação ágil. Durante o onboarding, o atleta cria sua conta (OAuth do Google) e pode selecionar o seu Clube/Técnico atual, preparando a base de dados para um futuro portal de Técnicos.

## 2. Tech Stack e Decisão Arquitetural
**Arquitetura Escolhida:** Monolito Modular
A divisão modular permite separar domínios claros (Atletas, Técnicos, Corridas/Provas, Processamento de PDF), com potencial escalabilidade para o futuro.

**Módulo Tecnológico Core:**
- **Framework Frontend/Backend:** Next.js (App Router)
- **Database e ORM:** PostgreSQL no Servidor Node.js Local (IP 192.168.15.5) + Prisma ORM.
- **Autenticação:** NextAuth (Google OAuth conectado ao painel do atleta).
- **Processamento IA:** Google Gemini via SDK e Google Generative AI (para extração dos tickets de PDF).
- **Estilo e UI:** Tailwind CSS, Glassmorphism UI Cards (componentes Radix/Shadcn UI modernizados) e Recharts (para renderização de linhas de evolução).

## 3. Wireframe da Estrutura de Pastas (Monolito Modular)
```text
/Swimmers
├── docs/                       # PRDs, Arquitetura e Modelagem de DB
├── src/
│   ├── app/                    # Next.js App Router (Páginas principais)
│   │   ├── (auth)/             # Login, Onboarding
│   │   ├── dashboard/          # Área Privada do Atleta
│   │   └── api/                # Rotas da API (Monolito)
│   ├── modules/                # Regras de Negócio e Lógica de Domínio
│   │   ├── athletes/           # Modelos, serviços e schemas de atletas
│   │   ├── coaches/            # Estrutura base para a conexão dos técnicos
│   │   └── results-ai/         # Fluxo de IA, upload, e parser do PDF (Gemini)
│   ├── components/
│   │   ├── ui/                 # Botões Magnéticos, Inputs Tailwind, Glass Cards
│   │   └── shared/             # Layouts, Menus de Navegação
│   ├── lib/                    # Utils Globais, Instância Prisma
│   └── styles/                 # Tailwind Base, Variáveis "Deep Water" Dark Mode
├── prisma/                     # Schema do PostgreSQL com relação Atleta <-> Técnico
├── .env                        # Chaves do projeto local
└── package.json
```

## 4. Fluxo Principal do App (Happy Path)
1. **Landing & Onboarding:** O nadador visualiza uma Landing Page com estética "Neon Deep Water" e utiliza o clique rápido para login pelo Google.
2. **Setup do Atleta:** Primeira vez acessando, ele preenche sua data de nascimento, gênero e seleciona (ou informa) seu Clube / Técnico atual.
3. **Upload de Prova:** Na dashboard do Atleta, ele clica para submeter um novo PDF do resultado oficial.
4. **Extração Geminificada:** O documento via API é repassado ao Gemini, que extrai perfeitamente as baterias, tempos parciais, posições e as salva de volta.
5. **Dashboard Analytics:** A dashboard atualiza com um "Glow Effect" e desenha um Gráfico de Área fluido demonstrando as melhorias do Atleta na sua base individual.
