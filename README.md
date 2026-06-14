# 링크 스타또 (starto)

솔로 스킬 아레나 · 8웨이브 · WASD + J 연타 + K/L 스킬

## 로컬 실행

```powershell
npm install
npm run dev
```

http://localhost:3456

## GitHub

https://github.com/juyeon0303/starto

## Render 배포 (GitHub 연동)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. GitHub 계정 연결 후 **`juyeon0303/starto`** 저장소 선택
3. `render.yaml`이 자동 적용됨 → **Apply**
4. 배포 완료 후 `https://starto.onrender.com` 형태 URL 확인

### 수동 Static Site로 만들 때

| 항목 | 값 |
|---|---|
| **Build Command** | *(비움)* |
| **Publish Directory** | `.` |

ES module(`type="module"`)을 쓰므로 **Static Site**면 충분합니다. Node 서버가 필요하면 Web Service + `npm start`를 사용하세요.
