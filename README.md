# superset-bi-metrics

Apache Superset 기반 오픈소스 지향 BI Metrics 확장 및 실시간 처리 프로젝트입니다.

---

## 📁 프로젝트 구조 및 모듈 현황

| 모듈 / 디렉토리  | 기술 스택                | 설명                                                                                                   |
| :--------------- | :----------------------- | :----------------------------------------------------------------------------------------------------- |
| **`websocket/`** | Go (gorilla/websocket)   | 실시간 이벤트 및 비동기 쿼리 알림을 위한 WebSocket 서버 (Hub 패턴, Read/Write Pump, `/healthz`, `/ws`) |
| **`extension/`** | Python (FAB, SQLAlchemy) | Superset Core 연동용 Extension 모델 인터페이스 (`CoreModel`, `Database` 등) 및 MCP 구조                |
| **`cli/`**       | Python (Click, Jinja2)   | Extension 템플릿 생성, 검증 및 번들링을 위한 CLI 도구                                                  |
| **`core/`**      | Python                   | Superset Core 앱 및 기본 설정 스캐폴딩                                                                 |
| **`client/`**    | Node.js (pnpm)           | 프론트엔드 클라이언트 모듈                                                                             |
| **`docker/`**    | Docker Compose           | 로컬 개발/테스트용 인프라 (PostgreSQL 15, Redis 7)                                                     |

---

## 🚀 로컬 인프라 및 모듈 실행

### 1. 인프라 실행 (PostgreSQL & Redis)

```bash
docker compose -f docker/docker-compose.yaml up -d
```

### 2. WebSocket 서버 (Go)

```bash
cd websocket
make run        # 로컬 서버 실행 (:8080)
make test       # 단위 테스트 실행
```

---

## 📝 개발 진행 현황 (최근 커밋 기준)

- [x] Docker Compose 기반 PostgreSQL & Redis 로컬 인프라 구성
- [x] Extension Core 모델 인터페이스 및 MCP 데코레이터 초안 구성
- [x] Jinja2 템플릿 기반 CLI 스캐폴딩 구축
- [x] Go 기반 WebSocket 서버 레이어 구현 (Hub, Client 관리, Graceful shutdown, 단위 테스트)
