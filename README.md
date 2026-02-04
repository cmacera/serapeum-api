# Serapeum API

AI orchestration service powered by Genkit - A portable, container-ready API that connects Serapeum App with external knowledge sources.

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- npm or yarn
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cmacera/serapeum-api.git
   cd serapeum-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_GENAI_API_KEY
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

   The Genkit Developer UI will be available at `http://localhost:3000`

## 📦 Available Scripts

- `npm run dev` - Start development server with hot reload and Genkit UI
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

## 🏗️ Project Structure

```
src/
├── flows/          # Genkit Flows (API Logic)
├── tools/          # External API integrations
├── lib/            # Shared infrastructure
├── prompts/        # Dotprompt files
└── index.ts        # Server entry point
```

## 🔧 Tech Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript 5.x (Strict Mode)
- **Framework**: Genkit Core + Google AI Plugin
- **Validation**: Zod
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Docker / OCI Container

## 🐳 Docker Deployment

### Build the image

```bash
docker build -t serapeum-api .
```

### Run the container

```bash
docker run -p 3000:3000 \
  -e GOOGLE_GENAI_API_KEY=your_key_here \
  -e PORT=3000 \
  serapeum-api
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server listening port | No (default: 3000) |
| `GOOGLE_GENAI_API_KEY` | Google AI API key | Yes |
| `GENKIT_ENV` | Environment: `dev` or `prod` | No (default: dev) |
| `CORS_ORIGINS` | Comma-separated allowed origins | No |

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical blueprint
- [RULES.md](./RULES.md) - Coding standards and conventions
- [AGENTS.md](./AGENTS.md) - AI agent operational manifest

## 🤝 Contributing

This project follows strict coding standards:

- **Language**: All code, comments, and documentation in English
- **TypeScript**: Strict mode enabled
- **Commits**: Conventional Commits format enforced
- **Branching**: All branches must start with Linear issue key (e.g., `SER-123/feature-name`)
- **Quality**: Pre-commit hooks run linting, formatting, and type-checking

## 📝 License

ISC
