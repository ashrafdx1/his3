# Hospital Information System (HIS)

A production-ready Modular Monolith Hospital Information System (HIS) with a TypeScript monorepo, NestJS backend, React frontend web portal, Flutter cross-platform mobile client, and PostgreSQL database integration.

---

## 1. Project Directory Layout

```
HIS/
├── apps/
│   ├── backend/                # NestJS Modular Monolith API
│   │   ├── src/
│   │   │   ├── core/           # Core concerns (guards, database, filters, decorators)
│   │   │   ├── modules/        # Bounded Context Modules
│   │   │   │   ├── auth/       # JWT and session management
│   │   │   │   ├── rbac/       # Role-Based Access Control
│   │   │   │   ├── audit/      # Global audit logging
│   │   │   │   ├── notifications/ # Email, SMS, In-App alerts
│   │   │   │   ├── storage/    # Multi-driver file upload client
│   │   │   │   ├── suggestions/# Practitioner feedback board
│   │   │   │   └── management/ # Tenant metadata configurations
│   │   │   ├── app.module.ts   # Main app module
│   │   │   └── main.ts         # App entrypoint (Swagger configuration)
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend-web/           # React Web Client
│   │   ├── src/
│   │   │   ├── services/       # Axios API client & queries
│   │   │   ├── App.tsx         # Dashboard views & login routing
│   │   │   ├── index.css       # Premium styling system
│   │   │   └── main.tsx        # React entrypoint (Query Client Providers)
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── frontend-mobile/        # Flutter Mobile Client
│       ├── lib/
│       │   └── main.dart       # Theme and responsive dashboard setup
│       ├── pubspec.yaml
│       └── README.md
├── docs/                       # Shared Documentation
│   ├── architecture.md         # Architecture blueprint & boundary rules
│   ├── db-schema.md            # Conceptual database entities catalog
│   └── modules.md              # Infrastructure module routing guides
├── docker/                     # Dockerfiles & PostgreSQL setups
│   ├── postgres/
│   │   └── init.sql
│   ├── backend.Dockerfile
│   └── frontend-web.Dockerfile
├── .env.example                # Configuration templates
├── tsconfig.base.json          # Shared TypeScript settings
├── docker-compose.yml          # Container configuration
└── package.json                # Monorepo workspaces coordinator
```

---

## 2. Key Architecture Principles

1. **Modular Separation**: Domain modules are isolated and can only integrate through public service boundaries. Direct database table manipulation or folder exports bypasses are forbidden.
2. **Stateless Authentication**: Security routes issue standard JWT access tokens and long-lived refresh tokens.
3. **Uniform Error Structure**: A global exception filter maps exceptions to standard JSON formats.
4. **Adaptive Dark Aesthetics**: React web app utilizes modern Outfit & Inter typography with responsive glassmorphism interfaces and transition hover effects.

---

## 3. Recommended Development Workflow

### Getting Started

1. **Clone and Setup Environments**:
   ```bash
   copy .env.example .env
   ```

2. **Install Workspace Dependencies**:
   From the root folder, run:
   ```bash
   npm run bootstrap
   ```

3. **Start Containers**:
   To boot PostgreSQL database node, backend server, and the web portal simultaneously:
   ```bash
   npm run docker:up
   ```

### Individual Workspace Launch (Optional)

If running services locally outside of Docker containers:
- **Backend API**:
  ```bash
  npm run dev:backend
  ```
- **React Frontend**:
  ```bash
  npm run dev:frontend
  ```
- **Flutter Mobile Client**:
  ```bash
  cd apps/frontend-mobile
  flutter pub get
  flutter run
  ```

---

## 4. Verification Checklists

- **Swagger Documentation**: Available at `http://localhost:3000/api/v1/docs` once the NestJS server is running.
- **Docker validation**: Inspect config mappings via:
  ```bash
  docker compose config
  ```
# his2
