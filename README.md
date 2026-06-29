# MBC충북 충주연주소 주조정실 근무 일지

라디오·TV 주조정실의 일일 근무/장비 점검 일지를 작성·보관·출력하는 사내 웹앱입니다. 외부 의존성 없이 Node.js 기본 모듈만 사용합니다.

## 주요 기능

- **채널·근무자·날짜 선택** 후 해당 일지 작성 (한 날짜·매체당 1건)
- **라디오**: 라디오주조·IMC렉실 점검표 (정상/Fault 토글)
- **TV**: 기술일지 + TV주조 장비점검일지 (정상/Fault·단일선택·측정값)
- 달력의 **T/R 배지**로 저장된 일지 확인(팝업), 수정·삭제
- **기간(월/분기)·매체별 출력** — A4 한 장에 맞춘 점검표 인쇄
- **관리자 모드**(공용 비밀번호): 일지 확인(사인 대체)·삭제, 활동 로그, 출력 패널
- 작성/수정/삭제/확인 **감사 로그** 기록

## 실행

```bash
npm start
# http://localhost:3000
```

테스트:

```bash
npm test
```

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3000` | 서버 포트 |
| `DATA_FILE` | `data/logs.json` | 일지 데이터 파일 |
| `AUDIT_FILE` | `data/audit.json` | 감사 로그 파일 |
| `ADMIN_PASSWORD` | `admin1234` | 관리자 비밀번호 (운영 시 반드시 변경) |

```bash
ADMIN_PASSWORD=원하는비밀번호 npm start
```

## 구조

- `server.js` — Node 기본 http 서버 (REST API + 정적 파일)
- `public/` — 프런트엔드 (`index.html`, `app.js`, `styles.css`)
- `test/app.test.js` — API 테스트 (`node --test`)
- `data/` — 일지·감사 로그 저장
