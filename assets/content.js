/* ===========================================================
   Codec C-Model Lab — 콘텐츠 (assets/content.js)
   공식 AV1(libaom) / AV2(AVM) 레퍼런스 C 모델을 직접 빌드·실행·디버그하며
   익히는 학습 앱. 공개용 — 교육 내용만(HW/RTL 분석은 비공개 스터디에 보관).
   콘텐츠는 공부하며 한 챕터씩 채운다.
   =========================================================== */

const APP_ID = "codec_cmodel_v1";
const FOOTER = "공식 AV1/AV2 레퍼런스 SW 학습용 · 출처: AOMedia (aomedia.org)";

const SUBJECT = {
  brand: "🎬 Codec C-Model Lab",
  brandSub: "공식 AV1/AV2 레퍼런스 SW 직접 다뤄보기",
  title: "Codec C-Model Lab — libaom & AVM 직접 빌드·디버그하며 익히기",
  subtitle: "공식 레퍼런스 C 모델로 비디오 코덱 디코더를 손에 익히는 실습 노트",
  story: "비디오 코덱은 <b>스펙(문서)</b>과 <b>레퍼런스 C 모델(코드)</b>이 한 쌍이다. AV1은 <b>libaom</b>, AV2는 <b>AVM</b>이 공식 레퍼런스다. 이 앱은 그 C 모델을 직접 <b>빌드 → 실행 → gdb로 디코드 경로 추적 → 스펙과 코드 잇기</b> 순서로, 실제 명령과 관찰을 챕터로 정리한다. '코덱 C 모델을 처음/오랜만에 만지는' 사람을 위한 실습 가이드."
};

/* 자료 — 공식 링크만 (재배포 X) */
const SOURCES = [
  { kind:"📘 스펙", title:"AV2 Bitstream & Decoding Process Specification",
    sub:"Alliance for Open Media · Final, 2026-05-28", meta:[["버전","v1.0.0"],["분량","1169p"],["도구","Syntax Browser 제공"]],
    url:"https://av2.aomedia.org/", urlLabel:"av2.aomedia.org (PDF·Syntax Browser)",
    note:"AV1과 동일한 descriptor 프레임워크(f(n)/uvlc()/leb128()/ns(n)…)" },
  { kind:"📗 스펙", title:"AV1 Bitstream & Decoding Process Specification",
    sub:"Alliance for Open Media", meta:[["분량","약 680p"],["용도","AV2 비교 기준축"]],
    url:"https://aomediacodec.github.io/av1-spec/av1-spec.pdf", urlLabel:"AV1 spec PDF",
    note:"AV2 독해의 전이 기반" },
  { kind:"💻 레퍼런스 SW", title:"libaom — AV1 공식 레퍼런스 코덱",
    sub:"Alliance for Open Media", meta:[["clone","aomedia.googlesource.com/aom"],["바이너리","aomenc / aomdec"]],
    url:"https://aomedia.googlesource.com/aom", urlLabel:"libaom 저장소",
    note:"branch main" },
  { kind:"💻 레퍼런스 SW", title:"AVM — AV2 공식 레퍼런스 코덱 (AOMedia Video Model)",
    sub:"libaom 포크", meta:[["clone","github.com/AOMediaCodec/avm"],["tag","v1.0.0"],["바이너리","avmenc / avmdec"]],
    url:"https://github.com/AOMediaCodec/avm", urlLabel:"AVM 저장소 (GitHub)",
    note:"⚠️ GitLab 저장소는 deprecated → GitHub로 이전됨" }
];

/* 챕터 — 실제 실습 순서. 명령은 WSL2 Ubuntu 기준. */
const CHAPTERS = [
  { id:"c1", title:"레퍼런스 C 모델이란 무엇인가",
    tldr:"스펙=정답 문서, C 모델=그 정답을 그대로 구현한 코드. 둘을 나란히 봐야 코덱이 보인다.",
    body:[
      "비디오 코덱 표준은 <b>비트스트림과 디코딩 과정</b>을 글로 정의한 스펙과, 그것을 비트 단위로 똑같이 재현하는 <b>레퍼런스 소프트웨어(C 모델)</b>가 한 쌍으로 배포된다.",
      "AV1의 공식 레퍼런스는 <b>libaom</b>, AV2는 <b>AVM(AOMedia Video Model)</b>이다. AVM은 libaom을 포크해 만들었기 때문에, 한쪽을 익히면 다른 쪽도 거의 그대로 익는다.",
      "학습 전략: 스펙의 의사코드와 C 모델의 함수는 1:1로 대응한다. 그래서 '스펙 한 줄 ↔ 코드 한 줄'을 잇는 연습이 코덱 이해의 핵심이 된다."
    ],
    terms:[
      {t:"레퍼런스 C 모델", d:"표준을 bit-exact하게 구현한 공식 코드. 정확성의 기준."},
      {t:"libaom / AVM", d:"각각 AV1 / AV2의 공식 레퍼런스 코덱. AVM은 libaom 포크."},
      {t:"디코더", d:"비트스트림 → 영상. 이 앱은 디코더 관점에 집중."}
    ],
    src:"개요" },

  { id:"c2", title:"빌드하기 — cmake + ninja",
    tldr:"Release(빠름) + Debug C-only(gdb용) 두 가지를 빌드. SIMD를 끄면 코드 읽기가 깨끗해진다.",
    body:[
      "두 코덱 모두 <b>cmake + ninja</b>로 빌드한다. Linux 툴체인 의존이 있어 Windows에서는 <b>WSL2 Ubuntu</b>가 가장 매끄럽다.",
      "Release 빌드(성능 확인용): <code>cmake -B build-rel -G Ninja -DCMAKE_BUILD_TYPE=Release && cmake --build build-rel</code>",
      "워크스루용 Debug 빌드는 <code>-DCMAKE_BUILD_TYPE=Debug -DAOM_TARGET_CPU=generic</code>로 <b>SIMD/어셈블리를 끄면</b>, gdb 스텝이 단순해지고 '스펙↔C 코드' 매핑이 깨끗해진다(C 레퍼런스 경로만 탐).",
      "주의: AVM은 빌드 규모가 libaom보다 훨씬 크다(예제·테스트 포함 시 오브젝트 수천 개). 필요한 타깃만 지정(<code>--target avmenc avmdec</code>)하면 빠르고 메모리도 덜 쓴다. 메모리가 적은 머신은 병렬도를 낮추고(<code>-j4</code>~<code>-j6</code>) swap을 넉넉히."
    ],
    terms:[
      {t:"ninja", d:"빠른 빌드 실행기. cmake가 생성, ninja가 컴파일."},
      {t:"C-only 빌드", d:"AOM_TARGET_CPU=generic 으로 SIMD 제외. 디버깅·학습에 유리."},
      {t:"바이너리", d:"libaom=aomenc/aomdec, AVM=avmenc/avmdec."}
    ],
    src:"실습 — 빌드" },

  { id:"c3", title:"첫 실행 — encode → decode → md5",
    tldr:"짧은 영상을 만들어 인코드→디코드하고 결과를 md5로 확인하면 파이프라인이 검증된다.",
    body:[
      "테스트 입력은 ffmpeg로 즉석 생성: <code>ffmpeg -f lavfi -i testsrc2=size=352x288:rate=30 -frames:v 16 -pix_fmt yuv420p test.y4m</code>",
      "AV1: <code>aomenc test.y4m -o av1.ivf --limit=16</code> → <code>aomdec av1.ivf -o out.y4m</code> → <code>md5sum out.y4m</code>",
      "AV2도 동일 패턴(avmenc/avmdec). 단, <b>AVM 인코더는 레퍼런스 연구용이라 매우 느리다</b>(초당 프레임이 1 미만일 수 있음) — 테스트는 프레임 수를 적게 유지한다.",
      "디코드 출력의 md5가 안정적으로 같게 나오면(빌드 종류가 달라도) 디코더가 정상 동작한다는 첫 신호다."
    ],
    terms:[
      {t:"y4m", d:"비압축 영상 컨테이너(테스트 입력용)."},
      {t:"ivf", d:"간단한 비트스트림 컨테이너."},
      {t:"bit-exact", d:"빌드·플랫폼이 달라도 디코드 결과가 비트까지 동일해야 함."}
    ],
    src:"실습 — 스모크 테스트" },

  { id:"c4", title:"소스트리 지도 + 디코더 진입점",
    tldr:"AVM은 디렉토리를 av2/·avm_*로 리브랜딩했다. 디코더 진입은 av2_receive_compressed_data().",
    body:[
      "AVM v1.0.0은 libaom의 <code>av1/</code>를 <b><code>av2/</code></b>로, <code>aom_*</code> 모듈을 <b><code>avm_*</code></b>로 리브랜딩했다(예: avm_dsp, avm_util). 디코더 코드는 <code>av2/decoder/</code>에 있다.",
      "프레임 디코드 진입 함수는 <code>av2_receive_compressed_data()</code>(<code>av2/decoder/decoder.c</code>). 비트스트림은 OBU 단위로 파싱된다(<code>av2/decoder/obu.c</code>).",
      "블록 레벨로 내려가는 경로: <code>decode_tiles → decode_tile → decode_partition_sb → decode_partition(재귀) → decode_block</code>. 모든 단계가 공통 컨텍스트 <code>AV2Decoder *pbi</code>를 들고 다닌다.",
      "팁: <code>grep -rn</code>으로 함수 정의를 찾고, 디렉토리 구조부터 손으로 그려보면 전체 그림이 빨리 잡힌다."
    ],
    terms:[
      {t:"OBU", d:"Open Bitstream Unit. AV1/AV2 비트스트림의 패킷 단위."},
      {t:"tile / superblock / partition", d:"프레임을 나누는 계층. tile→SB→재귀 partition→block."},
      {t:"AV2Decoder (pbi)", d:"디코더 상태를 담는 최상위 컨텍스트 구조체."}
    ],
    src:"실습 — 소스트리" },

  { id:"c5", title:"gdb로 디코드 경로 따라가기",
    tldr:"진입점에 break를 걸고 backtrace를 찍으면 main부터 블록 디코드까지 호출 경로가 한눈에 보인다.",
    body:[
      "Debug(C-only) 빌드를 gdb로 실행: <code>gdb --args build-dbg/avmdec test.ivf -o /dev/null</code> 후 <code>break av2_receive_compressed_data</code> → <code>run</code> → <code>bt</code>.",
      "프레임 진입 backtrace: <code>main → main_loop → avm_codec_decode → decoder_decode → (worker thread) → av2_receive_compressed_data</code>. 디코드가 별도 <b>frame-worker 스레드</b>에서 도는 구조가 보인다.",
      "블록 레벨에 break(<code>decode_partition</code>)를 걸고 bt를 찍으면: <code>… → decode_tiles → decode_tile → decode_partition_sb → decode_partition</code>. 여기서 <code>print bsize</code>, <code>print mi_row</code> 등으로 상태를 직접 관찰한다.",
      "이렇게 '코드가 실제로 어떤 순서로 실행되는가'를 눈으로 보면, 스펙의 디코딩 과정 章이 살아 움직이는 그림으로 바뀐다."
    ],
    terms:[
      {t:"backtrace (bt)", d:"현재 멈춘 지점까지의 함수 호출 스택."},
      {t:"breakpoint", d:"특정 함수/줄에서 실행을 멈추는 디버거 표시."},
      {t:"frame worker", d:"프레임 디코드를 수행하는 워커 스레드."}
    ],
    src:"실습 — gdb 워크스루" },

  { id:"c6", title:"(작성 예정) 스펙 ↔ 코드 잇기",
    tldr:"Syntax Browser에서 syntax element 하나를 골라 스펙 의사코드 → C 함수까지 end-to-end로 추적.",
    body:[
      "이 챕터는 학습을 진행하며 채운다: AV2 Syntax Browser에서 간단한 헤더 파싱 요소를 하나 골라, 스펙의 의사코드 한 줄이 AVM C 코드의 어느 read 함수로 구현되는지 잇는 연습.",
      "descriptor(f(n)/uvlc()/leb128()/ns(n)…)가 AV1과 동일하므로, AV1 경험이 그대로 전이된다는 점을 직접 확인하는 단계."
    ],
    terms:[{t:"Syntax Browser", d:"AV2 스펙의 syntax element ↔ semantics를 나란히 보여주는 공식 도구."}],
    src:"실습 — 스펙↔코드 (예정)" },

  /* ───── Track B — Spec ↔ C-Model 투어 (디코드 순서, 실측 기반) ───── */

  { id:"b1", title:"[Spec투어] OBU — 비트스트림의 골격",
    tldr:"AV2 비트스트림은 OBU(패킷) 열. AV1의 9종에서 약 20종으로 크게 늘었다.",
    body:[
      "<b>spec §5.2</b> OBU syntax. 각 OBU는 헤더(타입·크기)와 페이로드로 구성된다. 코드에서는 <code>av2/decoder/obu.c</code>가 OBU를 파싱하고, OBU 종류별로 <code>obu_lcr.c / obu_atlas.c / obu_ci.c / obu_ops.c / obu_qm.c / obu_fgm.c</code>로 파일이 분리돼 있다 — spec의 OBU 章들과 거의 1:1.",
      "<b>AV1 → AV2 델타(실측):</b> AV1 OBU는 ~9종(SEQUENCE_HEADER, FRAME, FRAME_HEADER, TILE_GROUP, TILE_LIST, METADATA, TEMPORAL_DELIMITER, PADDING, REDUNDANT_FRAME_HEADER). AV2는 ~20종으로 확장된다.",
      "신규 OBU 예: 키프레임이 <code>OBU_CLOSED_LOOP_KEY</code>/<code>OPEN_LOOP_KEY</code>로 분화, <code>OBU_REGULAR_TIP</code>/<code>LEADING_TIP</code>(TIP 프레임), <code>OBU_*_SEF</code>(show-existing 계열), <code>OBU_ATLAS_SEGMENT</code>(분할 화면), <code>OBU_LAYER_CONFIGURATION_RECORD</code>(스케일러빌리티), <code>OBU_MULTI_STREAM_DECODER_OPERATION</code>, <code>OBU_OPERATING_POINT_SET</code>, <code>OBU_QUANTIZATION_MATRIX</code>.",
      "→ OBU 종류만 봐도 AV2가 노린 방향(다중 프로그램·AR/VR·스케일러빌리티)이 드러난다. 자세한 신규 OBU는 챕터 'AV2 신규 OBU 투어' 참조."
    ],
    terms:[
      {t:"OBU", d:"Open Bitstream Unit. AV1/AV2 비트스트림의 패킷 단위."},
      {t:"Temporal Delimiter", d:"시간 프레임 경계를 표시하는 OBU."},
      {t:"TIP", d:"Temporal Interpolated Prediction. AV2 신규 — OBU 타입으로도 존재."}
    ],
    src:"spec §5.2 · av2/decoder/obu.c, obu_*.c" },

  { id:"b2", title:"[Spec투어] Sequence Header — 시퀀스 설정",
    tldr:"한 시퀀스 전체의 코딩 설정. AV2는 config가 기능별로 잘게 나뉘고 멀티레이어 의존성이 추가됐다.",
    body:[
      "<b>spec §5.4</b> Sequence header OBU. 해상도·비트심도·프로파일과, 시퀀스 차원의 도구 on/off를 담는다. 코드에서는 <code>av2/decoder/obu.c</code>가 읽어 <code>SequenceHeader</code> 구조체(<code>av2/common/av2_common_int.h</code>)를 채운다.",
      "<b>델타:</b> spec §5.4가 5.4.2~5.4.13으로 세분화 — tile config / <b>partition config</b> / segment / intra / inter / screen content / <b>transform-quant-entropy config</b> / filter config / user-defined QM 등 기능별 sub-syntax로 쪼개졌다(AV1보다 모듈화).",
      "<code>SequenceHeader</code> 실측 필드에는 멀티레이어 스케일러빌리티가 보인다: <code>max_tlayer_id / max_mlayer_id</code>, <code>tlayer_dependency_map[][][]</code>, <code>mlayer_dependency_map[][]</code> — T-layer(시간)·M-layer 의존성 구조. AV1보다 계층 신호가 풍부하다.",
      "끝에 <code>op_params[]</code>(operating points)가 있고, 주석에 'memcmp로 헤더 일관성 비교를 위해 맨 끝에 둔다'고 명시 — 디코더가 시퀀스 헤더 일관성을 어떻게 검사하는지의 단서."
    ],
    terms:[
      {t:"SequenceHeader", d:"시퀀스 단위 설정 구조체 (av2_common_int.h)."},
      {t:"T-layer / M-layer", d:"시간/계층 스케일러빌리티 레이어. AV2에서 의존성 맵으로 신호."},
      {t:"operating point", d:"디코더가 추출·디코드할 레이어 부분집합 정의."}
    ],
    src:"spec §5.4 · obu.c · SequenceHeader@av2_common_int.h" },

  { id:"b3", title:"[Spec투어] Frame Header — 프레임 설정",
    tldr:"한 프레임의 참조·필터·양자화·세그먼트 설정. 디코드 파이프라인의 모든 스위치가 여기서 결정된다.",
    body:[
      "<b>spec §5.18</b> Frame header syntax. 프레임 타입·참조 프레임·크기, 그리고 이 프레임에 쓸 도구 파라미터를 담는다. 코드에서는 <code>av2/decoder/decoder.c</code>·<code>obu.c</code> 경로가 읽어 <code>AV2_COMMON</code>(<code>av2_common_int.h</code>)에 채운다(예: <code>av2_read_frame_size</code>).",
      "<b>델타:</b> §5.18이 5.18.3~5.18.10의 '구조체' 묶음으로 정리됨 — frame config / frame size / <b>filtering</b> / quantization / <b>segmentation·tiling</b> / transform·coding mode / global motion / film grain structures. AV2의 늘어난 도구 설정이 프레임 헤더에 반영된다.",
      "디코더 관점에서 프레임 헤더는 '이번 프레임 파이프라인 구성표'다 — 어떤 인루프 필터를 켤지, 어떤 참조를 쓸지가 여기서 갈린다.",
      "(주의) 세부 syntax element의 비트 구성은 spec 본문·Syntax Browser로 확인하며 챕터를 보강 예정 — 현재는 구조 수준."
    ],
    terms:[
      {t:"AV2_COMMON", d:"프레임/시퀀스 공통 디코드 상태를 담는 핵심 구조체."},
      {t:"frame header", d:"프레임 단위 설정. 참조·필터·양자화·세그먼트."},
      {t:"global motion", d:"프레임 전역 움직임 모델 파라미터."}
    ],
    src:"spec §5.18 · decoder.c, obu.c · AV2_COMMON@av2_common_int.h" },

  { id:"b4", title:"[Spec투어] Tile & Tile Group — 병렬 분할",
    tldr:"프레임을 타일로 나눠 병렬·독립 디코드. 비트스트림에서는 tile group OBU로 운반된다.",
    body:[
      "<b>spec §5.19 (Tile group OBU) · §5.20.2 (Tile-level structures).</b> 코드에서는 <code>av2/decoder/decodeframe.c</code>의 <code>decode_tiles → decode_tile</code>이 타일 루프를 돈다. 타일 경계 정보는 <code>TileInfo</code>(av2_common_int.h)에 담긴다.",
      "타일은 서로 의존하지 않게 설계돼 병렬 디코드의 단위가 된다(엔트로피 컨텍스트도 타일 경계에서 리셋).",
      "<b>델타:</b> tile group OBU가 <code>OBU_REGULAR_TILE_GROUP</code>/<code>OBU_LEADING_TILE_GROUP</code>로 변형이 생겼다(스케일러빌리티/저지연 시나리오 관련).",
      "M0 gdb에서 본 호출 경로: <code>av2_decode_tg_tiles_and_wrapup → decode_tiles → decode_tile → decode_partition_sb</code> — 타일 안에서 슈퍼블록 루프로 들어간다."
    ],
    terms:[
      {t:"tile", d:"독립 디코드 가능한 프레임 분할 단위. 병렬화의 기본."},
      {t:"tile group", d:"타일들을 묶어 운반하는 OBU."},
      {t:"superblock (SB)", d:"타일 안에서 디코드하는 최상위 블록(파티션 루트)."}
    ],
    src:"spec §5.19, §5.20.2 · decodeframe.c:decode_tiles/decode_tile · TileInfo" },

  { id:"b5", title:"[Spec투어] ⭐ Partition — 슈퍼블록 분할 트리",
    tldr:"SB를 재귀적으로 쪼개 블록을 만든다. AV2는 비대칭 분할이 대폭 추가되고, luma/chroma를 분리(SDP)한다.",
    body:[
      "<b>spec §5.20.3 Partition structures.</b> 코드: <code>av2/decoder/decodeframe.c</code>의 <code>decode_partition_sb → decode_partition</code>(재귀). 트리 노드는 <code>PARTITION_TREE</code>(<code>av2/common/blockd.h</code>) — <code>parent</code>, <code>sub_tree[4]</code>, <code>partition</code>, <code>bsize</code>, <code>mi_row/col</code>.",
      "<b>델타 ① 분할 타입 확장(실측):</b> AV1은 PARTITION_NONE/HORZ/VERT/SPLIT 중심. AV2는 비대칭·다분할을 추가 — <code>PARTITION_HORZ_3</code>, <code>HORZ_4A/4B</code>, <code>VERT_3</code>, <code>VERT_4A/4B</code>, <code>HORZ_A/B</code>, <code>VERT_A/B</code> 등. 블록을 더 유연하게 자른다.",
      "<b>델타 ② SDP(Semantically Decoupled Partitioning):</b> <code>PARTITION_TREE</code>에 <code>region_type</code>, <code>extended_sdp_allowed_flag</code>, <code>chroma_ref_info</code>, <code>is_cfl_allowed_for_this_chroma_partition</code>가 있다. M0 gdb에서 <code>decode_partition</code>이 <code>ptree</code>와 <b><code>ptree_luma</code> 두 트리</b>를 받는 것을 직접 확인 — AV2는 luma/chroma 파티션을 분리할 수 있다(AV1은 단일 트리).",
      "직접 보기: <code>~/work/gdb_avmdec.sh</code> → <code>decode_partition</code>에서 <code>print bsize</code>, <code>print partition</code>, <code>print ptree_luma</code>."
    ],
    terms:[
      {t:"PARTITION_TREE", d:"SB 분할 구조를 담는 재귀 트리 노드 (blockd.h)."},
      {t:"SDP", d:"Semantically Decoupled Partitioning. AV2의 luma/chroma 분리 파티셔닝."},
      {t:"비대칭 분할", d:"HORZ_3/4A/4B 등 균등하지 않은 분할 타입(AV2 신규)."}
    ],
    src:"spec §5.20.3 · decodeframe.c:decode_partition · PARTITION_TREE@blockd.h" },

  { id:"b6", title:"[Spec투어] Block Decode & Mode Info",
    tldr:"파티션의 리프 = 실제 디코드 블록. 모드 정보(예측 모드·MV·참조)가 여기서 읽힌다.",
    body:[
      "<b>spec §5.20.4 (Block decoding) · §5.20.5 (Mode information).</b> 코드: <code>decodeframe.c</code>의 <code>decode_block → parse_decode_block</code>, 모드 정보는 <code>av2/decoder/decodemv.c</code>의 <code>av2_read_mode_info</code>가 읽어 <code>MB_MODE_INFO</code>(<code>av2/common/blockd.h</code>)에 채운다.",
      "<code>MB_MODE_INFO</code>는 블록 하나의 '정체' — intra/inter 여부, 예측 모드, 움직임 벡터, 참조 프레임, 변환 정보 등을 담는다. 이웃 블록의 이 정보가 컨텍스트가 되어 다음 블록 파싱에 쓰인다(공간 의존성).",
      "<b>델타:</b> AV2는 모드·파티션 확장에 맞춰 모드 정보 필드가 늘었다(세부는 spec §5.20.5와 blockd.h 대조로 보강 예정).",
      "디코더 흐름: 모드 정보를 읽고(parse) → 예측 → 잔차(역변환) → 복원, 순서로 블록을 완성한다."
    ],
    terms:[
      {t:"MB_MODE_INFO", d:"블록 단위 모드/예측/MV 정보 구조체 (blockd.h)."},
      {t:"mode info", d:"블록의 예측 방식과 파라미터. 이웃 컨텍스트로도 쓰임."},
      {t:"parse vs decode", d:"비트스트림에서 값을 읽는 단계와 실제 복원 단계 구분."}
    ],
    src:"spec §5.20.4-5 · decode_block, decodemv.c · MB_MODE_INFO@blockd.h" },

  { id:"b7", title:"[Spec투어] Transform & Quantization",
    tldr:"잔차 계수를 읽고(엔트로피) 역양자화·역변환해 잔차 픽셀을 복원한다.",
    body:[
      "<b>spec §5.20.6 Transform and quantization structures.</b> 코드: 계수 파싱 <code>av2/decoder/decodetxb.c</code>(<code>av2_read_coeffs_txb</code>)·<code>detokenize.c</code>, 역변환 <code>av2/common/av2_inv_txfm2d.c</code>·<code>av2_txfm.c</code>.",
      "변환 종류는 AV1과 같은 계열(실측 enum): <code>DCT_DCT</code>, <code>ADST_ADST</code>, <code>FLIPADST_*</code>, <code>V_DCT</code>, <code>H_DCT</code>, <code>IDTX</code>(항등) — 방향·형태별 분리형 변환.",
      "<b>델타:</b> AV2는 변환 커널/크기와 계수 코딩이 확장된다. 신규 파일 <code>common/hr_coding.c</code>가 보이는데(AV1엔 없음), 고율(high-rate) 계수 코딩 관련으로 추정 — 정확한 역할은 spec §과 대조로 보강 예정.",
      "역양자화 계수는 LUT/QM(quantizer matrix, <code>OBU_QUANTIZATION_MATRIX</code>·<code>predefined_qm.c</code>)로 정의된다 — 받아둔 <code>av2_all_tables.h</code>의 테이블과 연결된다."
    ],
    terms:[
      {t:"TXB (transform block)", d:"변환 단위 블록. 계수가 엔트로피로 코딩됨."},
      {t:"inverse transform", d:"주파수 계수 → 잔차 픽셀. DCT/ADST/IDTX 계열."},
      {t:"quantizer matrix (QM)", d:"주파수별 양자화 가중. AV2는 전용 OBU로도 운반."}
    ],
    src:"spec §5.20.6 · decodetxb.c, av2_inv_txfm2d.c" },

  { id:"b8", title:"[Spec투어] Motion Vector & Prediction",
    tldr:"인터 예측: 참조 프레임에서 움직임 보상(MC)으로 예측 블록을 만든다. AV2는 TIP가 신규.",
    body:[
      "<b>spec §5.20.7 Motion vector and prediction structures.</b> 코드: 보간 기반 움직임 보상은 <code>av2/common/convolve.c</code>(서브픽셀 보간 필터)가 핵심.",
      "<b>델타 — TIP:</b> AV2 신규 파일 <code>av2/common/tip.c</code> = <b>Temporal Interpolated Prediction</b>. 비트스트림에도 <code>OBU_REGULAR_TIP</code>/<code>LEADING_TIP</code> 타입이 있다. 시간축으로 보간한 예측을 추가 도구로 쓴다.",
      "MC는 디코더에서 메모리 접근이 가장 큰 블록이다(참조 프레임을 많이 읽는다). 참조 프레임 수·보간 필터 변화가 AV2의 관전 포인트.",
      "(심화 예정) MV 예측 컨텍스트·참조 리스트 구성의 AV1 대비 변화는 spec §5.20.7과 코드 대조로 보강."
    ],
    terms:[
      {t:"MC (motion compensation)", d:"참조 프레임에서 움직임만큼 옮겨 예측. 서브픽셀 보간 사용."},
      {t:"TIP", d:"Temporal Interpolated Prediction. AV2 신규 시간 보간 예측."},
      {t:"convolve", d:"보간 필터 적용 함수(서브픽셀 MC)."}
    ],
    src:"spec §5.20.7 · common/convolve.c, tip.c" },

  { id:"b9", title:"[Spec투어] Coding Tools (Intra·CfL 등)",
    tldr:"인트라 예측과 보조 코딩 도구들. AV2는 행렬 기반 인트라 등 결정론적 신규 도구를 더한다.",
    body:[
      "<b>spec §5.20.8 Coding tools structures.</b> 코드(AV2 신규 파일): <code>av2/common/intra_matrix.c</code>(행렬 기반 인트라 예측), <code>cfl.c</code>(Chroma-from-Luma), <code>bru.c</code> 등.",
      "<b>행렬 기반 인트라(matrix intra):</b> 미리 정의된 행렬 계수로 예측 블록을 만든다 — VVC의 MIP와 유사한 결정론적 행렬곱(디코더에서 학습/추론이 아니라 고정 계수 적용).",
      "<b>정확성 노트 — AV2와 ML:</b> AVM 빌드가 TensorFlow Lite를 링크하지만, 실측 결과 TFLite 사용처는 전부 <b>인코더 쪽</b>(파티션/인트라 모드 가지치기: <code>partition_ml.c</code>, <code>part_split_prune_tflite</code>, <code>intra_dip_mode_prune_tflite</code>)이다 — <b>탐색 가속용, 비규범적</b>. 디코더 규범 경로의 신규 도구(matrix intra·CCSO·GDF)는 결정론적이다.",
      "(심화 예정) 각 도구의 동작 원리는 spec semantics(§6)와 코드로 보강."
    ],
    terms:[
      {t:"CfL", d:"Chroma-from-Luma. 복원된 luma로 chroma를 예측."},
      {t:"matrix intra", d:"고정 행렬 계수로 만드는 인트라 예측(AV2 신규, 결정론적)."},
      {t:"인코더 ML (비규범)", d:"AV2 레퍼런스 인코더의 탐색 가속용 NN. 디코더와 무관."}
    ],
    src:"spec §5.20.8 · common/intra_matrix.c, cfl.c · (ML=encoder-side)" },

  { id:"b10", title:"[Spec투어] ⭐ In-loop Filters — 복원 후처리 체인",
    tldr:"복원 프레임에 deblock→CDEF→CCSO(신규)→restoration 필터를 순서로 적용. CCSO·GDF가 AV2 신규.",
    body:[
      "<b>spec §5.20.10 / §5.18.5 (Filtering).</b> 코드(av2/common): <code>av2_loopfilter.c</code>(디블록), <code>cdef.c</code>(CDEF), <code>ccso.c</code>(CCSO), <code>restoration.c</code>(loop restoration), <code>gdf.c</code>(GDF).",
      "<b>델타 — CCSO:</b> <code>ccso.c</code>는 AV1에 없는 신규 파일 = <b>Cross-Component Sample Offset</b>. luma 정보를 이용해 chroma 샘플에 오프셋을 주는 인루프 필터. <code>gdf.c</code>(GDF)도 AV2 신규.",
      "인루프 필터는 '루프 안'에서 적용된다 — 필터링된 프레임이 다음 프레임의 참조가 되므로 디코더가 반드시 동일하게 수행해야 한다(bit-exact). 멀티패스라 라인버퍼를 많이 쓰는 단계.",
      "AV1 체인(deblock→CDEF→restoration)에 AV2가 CCSO(+GDF)를 더한 모습 — 필터 단계가 늘었다."
    ],
    terms:[
      {t:"deblock", d:"블록 경계의 불연속을 완화하는 필터."},
      {t:"CDEF", d:"Constrained Directional Enhancement Filter. 방향성 디링잉."},
      {t:"CCSO", d:"Cross-Component Sample Offset. AV2 신규 — luma로 chroma 보정."}
    ],
    src:"spec §5.20.10, §5.18.5 · av2_loopfilter.c, cdef.c, ccso.c, restoration.c, gdf.c" },

  { id:"b11", title:"[Spec투어] AV2 신규 OBU 투어 — AR/VR·다중 프로그램·스케일러빌리티",
    tldr:"AV2가 새로 도입한 시스템 레벨 OBU들. AV2의 응용 방향(분할 화면·AR/VR)이 여기 담겼다.",
    body:[
      "AV2는 프레임 데이터 외에 시스템/전달 레벨 OBU를 다수 추가했다. 코드도 OBU별 파일로 분리: <code>obu_ops.c</code>, <code>obu_lcr.c</code>, <code>obu_atlas.c</code>, <code>obu_ci.c</code>.",
      "<b>Atlas (§5.9, <code>obu_atlas.c</code>):</b> 여러 프로그램을 한 화면에 배치(분할 화면)·합성을 위한 정보. AV2가 강조한 '다중 프로그램 동시 전달' 시나리오의 핵심.",
      "<b>Layer Config Record / LCR (§5.8, <code>obu_lcr.c</code>):</b> 레이어 구성·의존성 기록 = 스케일러빌리티(해상도/품질/시간 레이어). <code>SequenceHeader</code>의 tlayer/mlayer 의존성 맵과 연결.",
      "<b>Multi-Stream Decoder Operation (§5.6) · Operating Point Set (§5.10-11, <code>obu_ops.c</code>) · Content Interpretation (§5.15, <code>obu_ci.c</code>):</b> 여러 스트림 동시 디코드, 디코드할 레이어 부분집합 정의, 콘텐츠 해석 힌트 — AR/VR·멀티뷰를 겨냥한 신규 구조."
    ],
    terms:[
      {t:"Atlas", d:"다중 프로그램 배치/합성 정보 OBU (AV2 신규)."},
      {t:"LCR", d:"Layer Configuration Record. 레이어 구성·의존성(스케일러빌리티)."},
      {t:"Operating Point Set", d:"디코더가 추출·디코드할 레이어 부분집합 정의."}
    ],
    src:"spec §5.6/5.8/5.9/5.10-11/5.15 · obu_ops/lcr/atlas/ci.c" }
];

const QUIZ = {
  basic:[
    { type:"mc", q:"AV2의 공식 레퍼런스 C 모델 이름은?", choices:["libaom","AVM","ffmpeg","dav1d"], answer:1,
      why:"AV2의 공식 레퍼런스는 AVM(AOMedia Video Model). libaom은 AV1용." },
    { type:"ox", q:"AVM은 libaom을 포크해서 만들어졌다.", answer:true,
      why:"그래서 디렉토리·옵션 체계가 유사하고, 한쪽을 익히면 다른 쪽도 익는다." },
    { type:"mc", q:"AVM 디코더 바이너리 이름은?", choices:["aomdec","avmdec","av2dec","decoder"], answer:1,
      why:"AVM은 aomenc/aomdec를 avmenc/avmdec로 리네임했다." },
    { type:"ox", q:"워크스루용 빌드에서는 SIMD를 끄는 편이 코드 읽기에 유리하다.", answer:true,
      why:"AOM_TARGET_CPU=generic으로 C 레퍼런스 경로만 타면 gdb·매핑이 깨끗해진다." },
    { type:"mc", q:"AVM 소스에서 OBU 종류별로 파일이 분리된 예가 아닌 것은?",
      choices:["obu_lcr.c","obu_atlas.c","obu_ops.c","obu_rdo.c"], answer:3,
      why:"obu_lcr/atlas/ops.c는 실제 존재(spec OBU와 1:1). RDO는 인코더 개념." },
    { type:"ox", q:"AV2는 AV1보다 OBU 종류가 크게 늘었다(약 9종 → 약 20종).", answer:true,
      why:"키프레임 분화·TIP·Atlas·LCR·Operating Point Set 등 신규 OBU가 추가됐다." },
    { type:"mc", q:"AV2 신규 인루프 필터 CCSO가 구현된 파일은?",
      choices:["cdef.c","ccso.c","restoration.c","av2_loopfilter.c"], answer:1,
      why:"ccso.c가 AV1에 없는 신규 파일 = Cross-Component Sample Offset." },
    { type:"mc", q:"AV2 디코더의 슈퍼블록 분할 트리 구조체는?",
      choices:["MB_MODE_INFO","PARTITION_TREE","TileInfo","SequenceHeader"], answer:1,
      why:"PARTITION_TREE(blockd.h)가 재귀 분할 노드. decode_partition이 다룬다." }
  ],
  inter:[
    { type:"mc", q:"AVM 디코더의 프레임 디코드 진입 함수는?",
      choices:["main","av2_receive_compressed_data","decode_block","avmdec_main"], answer:1,
      why:"av2/decoder/decoder.c의 av2_receive_compressed_data()가 프레임 진입점." },
    { type:"mc", q:"블록까지 내려가는 호출 순서로 맞는 것은?",
      choices:["decode_block → decode_tile → decode_partition","decode_tiles → decode_tile → decode_partition_sb → decode_partition","decode_partition → decode_tiles → decode_block","main → decode_block"], answer:1,
      why:"tile→SB→재귀 partition 순으로 내려간다." },
    { type:"ox", q:"AVM 인코더는 일반적으로 매우 느리다(레퍼런스 연구용).", answer:true,
      why:"속도보다 정확성·실험성이 목적이라 초당 1프레임 미만도 흔하다. 테스트는 짧게." },
    { type:"mc", q:"AV2 partition에서 PARTITION_TREE가 ptree와 ptree_luma 두 트리를 받는 이유는?",
      choices:["멀티스레드 때문","luma/chroma 분리 파티셔닝(SDP)","압축률 측정","에러 복구"], answer:1,
      why:"AV2는 SDP로 luma/chroma 파티션을 분리할 수 있다(AV1은 단일 트리)." },
    { type:"mc", q:"AV2 디코더 인루프 필터 체인에 새로 끼어든 단계는?",
      choices:["deblock","CDEF","CCSO","restoration"], answer:2,
      why:"AV1의 deblock→CDEF→restoration에 AV2가 CCSO(+GDF)를 추가." },
    { type:"ox", q:"AVM이 TensorFlow Lite를 링크하므로 AV2 디코더 규범 경로에서 NN 추론이 일어난다.", answer:false,
      why:"실측상 TFLite 사용처는 전부 인코더(파티션/모드 가지치기). 디코더 규범 도구(CCSO·matrix intra)는 결정론적." },
    { type:"mc", q:"AV2가 다중 프로그램(분할 화면) 전달을 위해 추가한 OBU/구조는?",
      choices:["Atlas","Film grain","Temporal delimiter","Padding"], answer:0,
      why:"Atlas(obu_atlas.c, §5.9)가 다중 프로그램 배치/합성 정보를 담는다." }
  ]
};

const THINK = [
  { q:"스펙(문서)과 C 모델(코드)이 어긋난다면, 무엇이 '정답'일까? 왜 둘 다 배포할까?",
    hint:"표준의 정의 주체와, bit-exact 검증의 기준이 무엇인지 생각." },
  { q:"디코더만 공부해도 코덱을 이해할 수 있을까? 인코더를 봐야만 알 수 있는 건 무엇일까?",
    hint:"비트스트림은 디코더가 '읽는' 대상. 인코더의 선택(RDO 등)은 스트림에 결과로만 남는다." },
  { q:"AVM이 libaom 포크라는 사실은 학습 순서를 어떻게 바꿔줄까?",
    hint:"공통 골격을 먼저 잡고 '델타(차이)'만 깊게 보는 전략." },
  { q:"AV2가 partition 타입을 비대칭(HORZ_3/4A/4B 등)으로 늘리고 luma/chroma를 분리(SDP)한 건 무엇을 노린 걸까?",
    hint:"콘텐츠 적응적 분할의 표현력 ↔ 시그널링/복잡도 비용의 트레이드오프." },
  { q:"AV2의 NN이 '디코더'가 아니라 '인코더 탐색 가속'에만 쓰인 설계 선택의 의미는?",
    hint:"디코더는 모든 기기에서 bit-exact·결정론적이어야 한다. 비규범 vs 규범의 경계." },
  { q:"OBU 종류만 봐도 코덱이 노린 응용을 읽을 수 있다 — AV2의 Atlas·LCR·Multi-Stream은 어떤 미래를 겨냥할까?",
    hint:"분할 화면 다중 프로그램, AR/VR, 스케일러블 전달." }
];

const RELATED = [
  { t:"AV1 → AV2 코딩 툴 변화", d:"파티션·변환·예측·인루프 필터 등에서 무엇이 새로 추가됐나.", kw:"AV2 AVM new coding tools vs AV1" },
  { t:"엔트로피 코딩 (MSAC 계열)", d:"비트스트림을 심볼로 푸는 산술 디코더.", kw:"AV1 AV2 entropy coding multi-symbol arithmetic decoder" },
  { t:"OBU 구조", d:"AV1/AV2 비트스트림의 패킷(OBU) 종류와 역할.", kw:"AV1 OBU open bitstream unit types" },
  { t:"dav1d (고속 디코더)", d:"레퍼런스가 아닌 production AV1 디코더와의 차이.", kw:"dav1d AV1 decoder vs libaom" },
  { t:"CCSO (Cross-Component Sample Offset)", d:"AV2 신규 인루프 필터 — luma로 chroma 보정.", kw:"AV2 CCSO cross component sample offset in-loop filter" },
  { t:"TIP (Temporal Interpolated Prediction)", d:"AV2 신규 시간 보간 예측.", kw:"AV2 temporal interpolated prediction TIP" },
  { t:"SDP / 확장 partition", d:"AV2의 luma/chroma 분리 및 비대칭 분할.", kw:"AV2 semantically decoupled partitioning luma chroma" },
  { t:"인코더 ML 가속 (비규범)", d:"파티션/모드 가지치기에 쓰인 학습 모델.", kw:"AV2 AVM machine learning partition pruning encoder" }
];

const GUIDE = {
  title: "C 모델 학습 노트 가이드",
  intro: "한 모듈/한 세션을 공부했으면 이 틀로 한 장 정리하세요.",
  structure: [
    ["① 무엇을 했나", "빌드/실행/디버그 등 실제로 친 명령과 목표."],
    ["② 관찰", "출력·backtrace·자료구조 등 눈으로 본 사실."],
    ["③ 알게 된 것", "스펙/코드 구조에 대해 새로 이해한 1~3줄."],
    ["④ 막힌 점", "에러·미해결 질문(다음 세션 입력)."],
    ["⑤ 출처", "스펙 섹션 번호 / 코드 파일·함수."]
  ],
  rules: ["코드/스펙 본문 통째 복사 금지 — 자기 말로.", "함수·파일명은 정확히 인용.", "확실치 않으면 '미확인'으로 표시."],
  checklist: ["실제 명령과 출력이 있는가?", "스펙 또는 코드 위치를 적었는가?", "내가 이해한 한 줄이 있는가?"],
  current: ""
};
