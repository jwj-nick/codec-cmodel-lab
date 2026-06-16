# Codec C-Model Lab — 콘텐츠 계획 (content roadmap)

## 0. 콘텐츠 아키텍처 (이 앱의 척추)
**spec 챕터 ↔ AVM C-model(파일·함수·구조체) ↔ AV1/AV2 비교**를 한 축으로 엮는다.
- M0에서 검증한 방법론(spec↔code)을 그대로 콘텐츠화 = 공부의 부산물.
- AV2 spec이 AV1과 동일 descriptor 프레임워크 → "AV1 baseline → AV2 delta"가 자연스러운 비교축.
- 차별성: 공식 spec을 **실제 C 코드와 이어** 설명 + AV1 비교. 어디에도 없는 자료.

## 1. 불변 원칙 (먼저 박아둠)
1. **정확성 = 실측만.** 모든 spec↔함수↔구조체 매핑은 clone된 `~/work/avm`(av2/), `~/work/aom`(av1/)을
   **grep·gdb로 확인한 것만** 기재. LLM 추측 금지. spec §번호/제목은 받은 PDF에서 직접 확인.
2. **공개 경계.** 앱은 public. **교육 내용만**(spec/코드/델타). HW/RTL 분석(파이프라인·라인버퍼·대역폭·추출)은
   private repo `25_VideoCodec`에만. → 두 repo 경계는 거기 CLAUDE.md에 명시됨.
3. **증류.** "Nick이 이해한 것 / 코드로 확인된 것"만. 불확실은 "미확인"으로 표시, 지어내지 않음.

## 2. 2-트랙 구성
- **Track A — 도구 익히기** (기존 c1~c6): C모델 개념/빌드/스모크/소스트리/gdb/스펙↔코드 입문. ✅ 시드됨.
- **Track B — Spec ↔ C-Model 투어** (신규, 본 계획): 디코드 파이프라인 순서로 spec §를 따라가며 코드 매핑 + AV1/AV2 비교.

## 3. 챕터 템플릿 (Track B 각 챕터)
content.js `CHAPTERS[]` 한 항목 = 다음을 채운다:
- **title**: `[Spec투어] <주제>`
- **tldr**: 한 줄 (이 단계가 비트스트림/디코드에서 하는 일)
- **body**: ① spec 위치(§번호·제목) ② AVM 코드(파일·진입 함수·핵심 구조체) ③ **AV1→AV2 델타** ④ (선택) gdb로 본 것
- **terms**: 핵심 용어 3개 내외
- **src**: spec § + 코드 파일:함수
- 딸린 **퀴즈 1~2** (사실=초급, 적용=중급) + 필요 시 **THINK 1**

## 4. Track B 챕터 스파인 (실측 근거 — 디코드 순서)

| # | 챕터 | spec § | AVM 코드 (실측) | AV1↔AV2 델타(가설→확정 대상) | 깊이 |
|---|---|---|---|---|---|
| B1 | OBU — 비트스트림 골격 | 5.2 | `av2/decoder/obu.c`, `obu.h` | OBU 종류 대폭 확장(아래 B-NEW) | 자율 |
| B2 | Sequence Header | 5.4 | `obu.c`, `SequenceHeader`@`av2_common_int.h` | config가 partition/intra/inter/screen/transform-quant-entropy로 **세분화** | 자율 |
| B3 | Frame Header | 5.18 | `decoder.c`, `av2_read_frame_size`, `AV2_COMMON` | frame config/filtering/quant/seg 구조 변화 | 자율 |
| B4 | Tile & Tile Group | 5.19, 5.20.2 | `decodeframe.c:decode_tiles/decode_tile`, `TileInfo` | tile 구조 변화 | 자율 |
| B5 | Partition (SB 분할) | 5.20.3 | `decodeframe.c:decode_partition`, `PARTITION_TREE`@`blockd.h` | ⭐ **luma/chroma 분리 트리**(ptree+ptree_luma, gdb 확인) | 자율→심화 |
| B6 | Block decode & Mode info | 5.20.4-5 | `decodeframe.c:decode_block`, `decodemv.c`, `MB_MODE_INFO` | mode 정보 확장 | 자율→심화 |
| B7 | Transform & Quant | 5.20.6 | `decodetxb.c`, `detokenize.c`, `av2_inv_txfm2d.c` | 신규 변환 커널/크기 | 심화 |
| B8 | MV & Prediction | 5.20.7 | `common/convolve.c`(MC), inter pred 경로 | 참조프레임/보간/TIP 계열 | 심화 |
| B9 | Coding tools | 5.20.8 | `common/cfl.c`(chroma-from-luma) 등 | 신규 tool들 | 심화 |
| B10 | In-loop filters | 5.20.10, 5.18.5 | `av2_loopfilter.c`, `cdef.c`, ⭐`ccso.c` | **CCSO**(Cross-Component Sample Offset) = AV2 신규 필터 | 심화 |
| B-NEW | AV2 신규 OBU 투어 | 5.6/5.8/5.9/5.15 | `obu_ops.c`, `obu_lcr.c`, `obu_atlas.c`, `obu_ci.c` | Multi-Stream Decoder, Layer Config Record, **Atlas**(split-screen/AR·VR), Content interpretation = **순수 AV2 신규** | 자율 |

> spec §5.x OBU가 AVM 소스 파일과 거의 1:1(`obu_lcr.c`↔§5.8 등), `av2_read_*` 함수가 syntax element명과 일치 →
> B1~B4, B-NEW는 **구조 매핑이 명확해 자율 작성 가능**. B5~B10은 알고리즘 깊이가 필요해 자율(구조)→Nick과 심화.

## 5. 자율 vs Nick 분담
- **Claude 자율(실측 가능):** spec §번호·제목, AVM 파일/함수/구조체명, `av2_read_*` 대응, 신규 OBU/파일(ccso 등),
  partition 트리 분리 같은 **구조적 델타**, gdb call path. → 즉시 챕터화.
- **Nick과 심화(이해 증류):** 각 tool의 "왜/어떻게"(CCSO 동작 원리, 새 partition이 코딩효율에 주는 영향 등).
  Claude가 구조까지 초안 → Nick 이해를 얹어 증류. (선보강 금지 원칙)

## 6. 제작 프로세스 (B-챕터 1개당)
1. **spec**: 해당 § PDF 페이지 Read → 정확한 §번호·제목·핵심 syntax element 확보.
2. **code**: `~/work/avm` grep → 실제 파일·함수·구조체 확인. AV1은 `~/work/aom`에서 대응 확인(델타).
3. **(선택) gdb**: 그 함수에 break → 디코드 중 실제 호출/값 관찰(`gdb_avmdec.sh` 재사용).
4. **write**: `content.js` CHAPTER + 퀴즈/THINK 작성. `node --check`로 검증.
5. **deploy**: commit → push → Pages 자동 배포 → 라이브 200 확인.
6. **sync**: 같은 매핑을 private `25_VideoCodec/10_av2_decoder/mapping/spec_func_hw_map.json`에 HW 열 얹어 누적
   (앱=공개 교육 SSOT, private=거기에 HW 분석 추가). 중복 아닌 계층.

## 7. 롤아웃 / 카덴스
- **1차 배치(자율, 포맷 증명):** B1 OBU · B2 Sequence Header · B5 Partition(이미 gdb로 일부 확인) — 3챕터.
  → Nick 리뷰로 톤·깊이·길이 합의.
- **이후:** "틈날 때마다" 소배치(1~2챕터)로 B3·B4·B-NEW(자율) → B6~B10(자율 초안+Nick 심화).
- 각 배치: content.js 갱신 + 배포 + 라이브 확인. worklog는 private repo에.

## 8. 미해결 / Nick 확인
- B 챕터를 Track A와 어떻게 보여줄지: 현재 CHAPTERS는 평면 리스트 → `[Spec투어]` 접두로 구분(단순) vs app.js에
  트랙 그룹핑 추가(기능). 1차엔 접두로, 반응 보고 그룹핑.
- 1차 배치(B1/B2/B5) 자율 착수 OK? (Nick GO 시 바로 진행)
