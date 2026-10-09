# Superset WebSocket Service (Go)

Superset 실시간 이벤트 및 비동기 쿼리 알림 처리를 위한 Go WebSocket 모듈입니다.

## 디렉토리 구조

```
websocket/
├── cmd/
│   └── server/
│       └── main.go           # 서버 엔트리포인트 (Graceful shutdown 지원)
├── internal/
│   ├── config/
│   │   └── config.go         # 환경 변수 기반 설정 로더
│   ├── handler/
│   │   ├── health.go         # 헬스체크 핸들러 (/healthz)
│   │   ├── health_test.go    # 헬스체크 단위 테스트
│   │   └── websocket.go      # WebSocket 업그레이드 및 요청 핸들러 (/ws)
│   └── ws/
│       ├── client.go         # WebSocket Client 및 Read/Write Pump 관리
│       ├── hub.go            # Hub 기반 클라이언트 연결/해제 및 브로드캐스트
│       └── hub_test.go       # Hub 단위 테스트
├── .env.example              # 환경 변수 예시
├── .gitignore
├── Dockerfile                # 멀티 스테이지 빌드 Dockerfile
├── Makefile                  # 개발/빌드 편의 명령어
├── go.mod
└── go.sum
```

## 주요 기능

- **WebSocket Hub 패턴**: 다중 클라이언트 세션 등록/해제 및 안전한 브로드캐스트
- **Read/Write Pump**: Ping/Pong 하트비트 감지, 커넥션 정리 및 버퍼링된 메시지 전송
- **Graceful Shutdown**: SIGINT / SIGTERM 수신 시 안전한 서버 종료 처리
- **엔드포인트**:
  - `GET /healthz`: 서버 상태 및 Uptime 반환
  - `GET /ws`: WebSocket 연결 업그레이드

## 실행 방법

### 로컬 실행

```bash
# 의존성 정리
make tidy

# 로컬 서버 실행 (기본 포트: 8080)
make run
```

### 테스트 실행

```bash
make test
```

### 바이너리 빌드

```bash
make build
# bin/websocket-server 생성
```

### 환경 변수

`.env.example`을 참고하여 설정할 수 있습니다:

- `PORT`: 서버 포트 (기본값: `8080`)
- `REDIS_ADDR`: Redis 주소 (기본값: `localhost:6379`)
- `ALLOWED_ORIGINS`: 허용할 Origin (기본값: `*`)
