---
name: board-builder
description: GitHub API와 Vercel Serverless를 이용해 서버 없이 동작하는 정적 부동산 게시판을 구축하고 관리하는 스킬
---

# Board Builder Skill

이 스킬은 GitHub API를 백엔드 DB 및 스토리지로 활용하고 Vercel로 무료 호스팅되는 정적 게시판 홈페이지를 구축하고 유지보수합니다.

## 아키텍처
1. **GitHub Repository**: `data/posts.json` 파일을 데이터베이스처럼 활용하여 커밋/업데이트
2. **Vercel Serverless Function**: `api/config.js`를 통해 Vercel 환경 변수에 주입된 `GITHUB_TOKEN` 및 `ADMIN_PASSWORD`를 프론트엔드로 안전하게 전달
3. **Clean URL**: `vercel.json`의 `cleanUrls: true`로 `.html` 확장자 없이 주소 라우팅
4. **마크다운 렌더링**: 외부 라이브러리 의존성 없이 순수 자바스크립트로 구현된 정밀 마크다운 렌더러 탑재
