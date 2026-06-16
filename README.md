# Codec C-Model Lab

공식 **AV1(libaom)** / **AV2(AVM)** 레퍼런스 C 모델을 직접 **빌드 → 실행 → gdb 디버그 → 스펙↔코드 잇기**로 익히는 실습 학습 앱.

🔗 **Live:** https://jwj-nick.github.io/codec-cmodel-lab/

## 무엇인가
- 비디오 코덱 레퍼런스 C 모델을 처음/오랜만에 다루는 사람을 위한 **실습 가이드**.
- 챕터: 레퍼런스 C 모델 개념 → 빌드 → 스모크 테스트 → 소스트리/진입점 → gdb 워크스루 → 스펙↔코드(예정).
- 퀴즈(초급/중급)·생각해볼 주제·연관 주제·학습 노트 가이드 포함.
- 바닐라 HTML/CSS/JS, **빌드 없음**. `index.html`을 브라우저로 열면 끝. 진행 상황은 브라우저 localStorage에 저장.

## 구조
```
index.html            # 진입(셸)
assets/content.js     # ⭐ 콘텐츠 전부 (이 파일만 채우면 됨)
assets/app.js         # 로직 (수정 불필요)
assets/styles.css     # 테마 (:root 변수로 색만 조정)
```
콘텐츠를 더하려면 `assets/content.js`의 `CHAPTERS`/`QUIZ` 등에 항목을 추가한다.

## 범위 / 경계
- 출처: 모두 공식 자료 — [AOMedia](https://aomedia.org/), [libaom](https://aomedia.googlesource.com/aom), [AVM](https://github.com/AOMediaCodec/avm), AV1/AV2 스펙.
- **교육 목적의 공개 콘텐츠만** 담는다 (오픈소스 코드·공개 스펙 기반). HW/RTL 설계 분석은 포함하지 않는다.
- 코드/스펙 본문 통째 복사 없이 자기 말로 정리, 원문은 공식 링크로 연결.

*학습용. AV1/AV2/AVM은 Alliance for Open Media의 것.*
