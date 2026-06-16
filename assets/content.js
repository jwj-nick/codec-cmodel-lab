/* ===========================================================
   Codec C-Model Lab — 콘텐츠 (assets/content.js)
   공식 AV1(libaom) / AV2(AVM) 레퍼런스 C 모델을 직접 빌드·실행·디버그하며 익히는 학습 앱.
   공개용 — 교육 내용만(HW/RTL 분석은 비공개 스터디에 보관).
   Track B의 모든 매핑은 ~/work/avm(AV2 v1.0.0) 소스를 grep·gdb로 실측해 작성. AV1 지식은 전제.
   =========================================================== */

const APP_ID = "codec_cmodel_v1";
const FOOTER = "공식 AV1/AV2 레퍼런스 SW 학습용 · 출처: AOMedia (aomedia.org)";

const SUBJECT = {
  brand: "🎬 Codec C-Model Lab",
  brandSub: "공식 AV1/AV2 레퍼런스 SW 직접 다뤄보기",
  title: "Codec C-Model Lab — libaom & AVM 직접 빌드·디버그하며 익히기",
  subtitle: "공식 레퍼런스 C 모델로 비디오 코덱 디코더를 손에 익히는 실습 노트",
  story: "비디오 코덱은 <b>스펙(문서)</b>과 <b>레퍼런스 C 모델(코드)</b>이 한 쌍이다. AV1은 <b>libaom</b>, AV2는 <b>AVM</b>이 공식 레퍼런스다. 이 앱은 그 C 모델을 직접 <b>빌드 → 실행 → gdb로 디코드 경로 추적 → 스펙과 코드 잇기</b> 순서로 정리하고, <b>Track B</b>에서는 AV2 spec의 각 章을 AVM 디코더의 실제 함수·구조체와 이어 <b>AV1 대비 무엇이 어떻게 바뀌었는지</b>까지 판다. AV1을 아는 사람이 AV2 디코더 C 모델을 손에 넣기 위한 실습 가이드."
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

/* 챕터 — Track A(도구 익히기) + Track B(Spec↔C-Model 투어, 디코드 순서) */
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

  { id:"c6", title:"스펙 ↔ 코드 잇기 (방법)",
    tldr:"Syntax Browser에서 syntax element 하나를 골라 스펙 의사코드 → C 함수까지 end-to-end로 추적한다.",
    body:[
      "AV2 Syntax Browser에서 간단한 요소(예: OBU 헤더, 시퀀스 헤더 한 필드)를 골라, 스펙의 의사코드 한 줄이 AVM C 코드의 어느 <code>av2_read_*</code> 함수로 구현되는지 잇는다.",
      "descriptor(f(n)/uvlc()/leb128()/ns(n)…)가 AV1과 동일하므로, AV1 경험이 그대로 전이된다. Track B의 각 챕터가 이 'spec § ↔ 함수/구조체' 매핑을 도구·필터별로 채워둔 결과다."
    ],
    terms:[{t:"Syntax Browser", d:"AV2 스펙의 syntax element ↔ semantics를 나란히 보여주는 공식 도구."}],
    src:"실습 — 스펙↔코드" },

  /* ───── Track B — Spec ↔ C-Model 투어 (디코드 순서, AVM 소스 실측) ───── */

  { id:"b1", title:"[Spec투어] OBU 계층 — 헤더부터 새로 짜였다",
    tldr:"AV2는 OBU '종류'만 늘린 게 아니라 OBU '헤더 비트 구조' 자체를 바꿨다. 3축 레이어(tlayer/mlayer/xlayer)가 헤더에 들어간다.",
    body:[
      "<b>spec §5.2 · 코드 <code>av2/common/obu_util.c:read_obu_header()</code>, 디스패치 <code>av2/decoder/obu.c</code>.</b>",
      "<b>헤더 비트 레이아웃이 AV1과 다르다.</b> AV1은 forbidden(1)+type(4)+ext(1)+has_size(1)+reserved(1). AV2 첫 바이트는 <code>ext_flag(1) | obu_type(<b>5</b>) | tlayer_id(2)</code> — forbidden·reserved·has_size 비트가 사라지고 type이 5비트로 넓어졌다(최대 32종). 또 <b>obu_size(ULEB128)가 헤더 앞에 항상 먼저</b> 오고, 그 크기는 헤더까지 포함한다.",
      "<b>3축 레이어가 헤더에 박혔다.</b> <code>tlayer_id</code>(시간, 2b, 항상) + 확장 바이트가 있으면 <code>mlayer_id</code>(임베디드, AV1의 spatial_id에 해당, 3b)와 <b>신규 <code>xlayer_id</code></b>(스트림/확장 레이어, 5b). 멀티스트림·스케일러빌리티의 토대.",
      "<b>OBU 종류 대폭 확장(실측 enum, <code>avm/avm_codec.h</code>):</b> AV1 ~9종 → AV2 25종 명명. 키프레임이 <code>OBU_CLOSED_LOOP_KEY</code>/<code>OPEN_LOOP_KEY</code>로 분화, 타일그룹이 <code>REGULAR/LEADING_TILE_GROUP</code>, 신규 <code>OBU_*_TIP</code>(TIP 프레임), <code>OBU_*_SEF</code>(show-existing), <code>OBU_SWITCH</code>, <code>OBU_RAS_FRAME</code>, <code>OBU_BRIDGE_FRAME</code>, 그리고 시스템 OBU <code>LAYER_CONFIGURATION_RECORD</code>·<code>ATLAS_SEGMENT</code>·<code>OPERATING_POINT_SET</code>·<code>MULTI_STREAM_DECODER_OPERATION</code>·<code>CONTENT_INTERPRETATION</code>.",
      "디스패치는 <code>obu.c</code>의 <code>switch(obu_header.type)</code>. 코딩된 프레임 계열(key/tile-group/SEF/TIP/switch/RAS/bridge)은 전부 <code>read_tilegroup_obu()</code>로 합류한다. <b>즉 '프레임의 종류'를 frame_type 비트가 아니라 OBU 타입 자체가 결정</b>하도록 바뀐 것이 큰 구조 변화다."
    ],
    terms:[
      {t:"OBU 헤더(AV2)", d:"ext_flag(1)|type(5)|tlayer(2), size(ULEB)가 앞에 선행. AV1과 비트구조 다름."},
      {t:"xlayer / mlayer / tlayer", d:"스트림 / 임베디드(구 spatial) / 시간 레이어. AV2 3축 계층."},
      {t:"typed frame OBU", d:"프레임 종류를 OBU 타입으로 구분(CLOSED/OPEN_LOOP_KEY, TIP, SEF…)."}
    ],
    src:"spec §5.2 · obu_util.c:read_obu_header, obu.c:switch · avm_codec.h:OBU_TYPE" },

  { id:"b2", title:"[Spec투어] Sequence Header — 8개 도구 그룹 + 레이어 의존성",
    tldr:"시퀀스 헤더가 '설정 가능한 도구 집합' 구조로 재편됐다. 8개 그룹으로 나뉘고, 256×256 SB·SDP·신규 필터/변환 플래그가 여기서 켜진다.",
    body:[
      "<b>spec §5.4 · 코드 <code>obu.c:read_sequence_header_obu()</code> → <code>decodeframe.c:av2_read_sequence_header()</code>.</b> 결과는 <code>SequenceHeader</code>(<code>av2/common/av2_common_int.h</code>).",
      "<b>핵심: 도구 플래그가 8개 그룹 함수로 모듈화됐다</b> — <code>read_sequence_{partition, segment, intra, inter, scc, transform_quant_entropy, filter}_group_tool_flags</code> + <code>tile_config</code>. AV2의 늘어난 도구들이 여기서 시퀀스 차원으로 on/off 된다.",
      "<b>partition 그룹:</b> 슈퍼블록 크기 선택에 <b>256×256(신규, AV1은 128 최대)</b> 포함, <code>enable_sdp</code>(luma/chroma 분리 파티셔닝), <code>enable_ext_partitions</code>, <code>enable_uneven_4way_partitions</code>.",
      "<b>inter 그룹(가장 큼):</b> <code>enable_tip</code>(TIP), <code>enable_bru</code>, <code>enable_refmvbank</code>, <code>enable_opfl_refine</code>/<code>refinemv</code>(광류·DMVR), <code>enable_flex_mvres</code>(유연 MV 정밀도), <code>enable_bawp</code>/<code>cwp</code>(가중 예측), DPB 크기 <code>ref_frames</code>(기본 8) 등 — 대부분 AV2 신규 인터 도구.",
      "<b>transform/quant/entropy 그룹:</b> <code>enable_ist</code>(2차 변환), <code>enable_cctx</code>(교차 크로마 변환), <code>enable_inter_ddt</code>(데이터 구동 변환), <b><code>enable_tcq</code></b>(트렐리스 코딩 양자화), <code>enable_parity_hiding</code>, <code>enable_avg_cdf</code>(CDF 평균 초기화). <b>filter 그룹:</b> <code>enable_cdef</code>, <b><code>enable_gdf</code></b>, <code>enable_restoration</code>+per-tool 마스크, <b><code>enable_ccso</code></b>.",
      "<b>레이어 의존성 맵:</b> <code>tlayer_dependency_map[][][]</code>, <code>mlayer_dependency_map[i][j]=\"mlayer i가 j에 의존\"</code> — AV1의 operating-point보다 풍부한 2축(시간·임베디드) 스케일러빌리티. 두 시퀀스 헤더 동일성은 <code>memcmp</code>로 비교하므로 <code>op_params</code>가 구조체 끝에 배치된다(코드 주석)."
    ],
    terms:[
      {t:"도구 그룹", d:"시퀀스 헤더가 partition/intra/inter/transform/filter 등 8개 그룹으로 도구 플래그를 묶음."},
      {t:"256×256 SB", d:"AV2 신규 최대 슈퍼블록 크기(AV1은 128×128)."},
      {t:"레이어 의존성 맵", d:"mlayer/tlayer 간 의존 관계 행렬. 프레임 헤더에서 참조 제약으로 강제됨."}
    ],
    src:"spec §5.4 · obu.c:read_sequence_header_obu, decodeframe.c:av2_read_sequence_header · SequenceHeader" },

  { id:"b3", title:"[Spec투어] Frame Header — typed OBU + MFH + 즉시/암시 출력",
    tldr:"프레임 종류가 OBU 타입으로 결정되고, Multi-Frame-Header로 공유 정보를 참조한다. 출력 모델·MV 정밀도·필터 체인이 모두 여기서 구성된다.",
    body:[
      "<b>spec §5.18 · 코드 <code>decodeframe.c:read_uncompressed_header()</code> (decoder.c/obu.c에서 호출).</b> 결과는 <code>AV2_COMMON *cm</code>의 서브구조(<code>features, quant_params, seg, lf, cdef_info, gdf_info, rst_info, ccso_info, delta_q_info, tiles</code>).",
      "<b>프레임 종류 = OBU 타입에서 파생.</b> <code>read_uncompressed_header</code>는 frame_type 비트를 읽기 전에 <code>obu_type</code>으로 분기한다(closed/open-loop key, TIP, SEF, switch, RAS, bridge). AV1의 단일 <code>OBU_FRAME</code>/<code>FRAME_HEADER</code>에서 크게 달라진 지점.",
      "<b>MFH(Multi-Frame-Header) 간접참조(신규):</b> 여러 프레임이 공유하는 크기·디블록·세그먼트 정보를 <code>OBU_MULTI_FRAME_HEADER</code>가 담고, 프레임 헤더는 id로 골라 레이어 의존성에 맞게 검증한다(<code>setup_multiframe_header_id</code>).",
      "<b>출력 모델 변경:</b> AV1의 <code>show_frame</code>/<code>showable_frame</code> 대신 <code>immediate_output_picture</code>/<code>implicit_output_picture</code>(monotonic 출력순서 모드와 연동)와 <code>display_order_hint</code>(DOH) 기반.",
      "<b>프레임 크기:</b> <code>av2_read_frame_size()</code>는 단순히 시퀀스가 정한 비트폭으로 width/height(+1)를 읽는다. 래퍼 <code>setup_frame_size</code>는 override가 없으면 선택된 MFH나 시퀀스 최대에서 상속한다.",
      "<b>프레임 차원의 도구 구성:</b> 유연 MV 정밀도(<code>fr_mv_precision</code>: QTR/1·8/HALF/1pel), <code>tip_frame_mode</code>(DISABLED/AS_REF/AS_OUTPUT), TCQ 프레임 플래그, delta-Q, 세그먼트, QM, 그리고 인루프 필터 체인(<code>setup_loopfilter → setup_gdf → setup_cdef → decode_restoration_mode → setup_ccso</code>)이 모두 여기서 켜진다. lossless면 필터 체인 전체가 0으로 단락된다."
    ],
    terms:[
      {t:"MFH", d:"Multi-Frame-Header. 여러 프레임이 공유하는 헤더 정보를 id로 참조(AV2 신규)."},
      {t:"DOH (display_order_hint)", d:"표시 순서 힌트. AV2의 즉시/암시 출력 모델의 기준."},
      {t:"flex MV precision", d:"프레임 단위로 MV 해상도를 선택(1/4·1/8·half·full)."}
    ],
    src:"spec §5.18 · decodeframe.c:read_uncompressed_header, av2_read_frame_size, setup_frame_size · AV2_COMMON" },

  { id:"b4", title:"[Spec투어] Tile — 독립 디코드 단위와 엔트로피 컨텍스트",
    tldr:"프레임을 타일로 나눠 병렬·독립 디코드. 각 타일은 자기 bit_reader와 '프레임 CDF의 복사본'으로 시작한다.",
    body:[
      "<b>spec §5.19, §5.20.2 · 코드 <code>decodeframe.c:decode_tiles → decode_tile</code>, 타일 경계 <code>TileInfo</code>(<code>av2/common/tile_common.h</code>).</b>",
      "<code>decode_tiles</code>는 <code>cm->tiles</code>에서 타일 격자를 읽고 <code>get_tile_buffers</code>로 입력 비트스트림을 타일별 바이트 슬라이스로 자른다. inverse tile order와 start/end-tile 윈도우(부분 디코드)도 지원.",
      "<b>핵심 — 타일 독립성:</b> 각 타일은 자기 슬라이스 위에 <code>setup_bool_decoder</code>로 <b>독립 <code>bit_reader</code></b>를 초기화하고, <code>tile_data->tctx = *cm->fc</code> 로 <b>프레임 컨텍스트(CDF)를 통째 복사</b>해 시작한다. 적응적 CDF 갱신이 타일 경계를 넘지 않으므로 타일은 진짜로 독립 디코드된다.",
      "<code>decode_tile</code>은 타일 안에서 MI 단위로 슈퍼블록 루프를 돌며, SB행마다 left 컨텍스트·<b>ref MV bank</b>·<b>warp param bank</b>(둘 다 AV2 예측 상태 뱅크)를 리셋하고 <code>decode_partition_sb(..., 0x3)</code>로 진입한다. <code>0x3</code>은 'parse+decode 단일 패스'(0x1 parse-only / 0x2 decode-only는 행-멀티스레드용).",
      "참고: <code>TileInfo</code>에 AV2 신규 <code>tile_active_mode</code> 필드가 있다 — BRU(블록 참조 업데이트) 활성영역 메커니즘과 연동."
    ],
    terms:[
      {t:"tile 독립성", d:"타일별 bit_reader + 프레임 CDF 복사로 시작 → 경계 넘는 의존 없음."},
      {t:"ref MV / warp bank", d:"SB행마다 리셋되는 AV2 예측 상태 저장소."},
      {t:"parse_decode_flag", d:"0x1 parse / 0x2 decode / 0x3 둘 다(단일패스)."}
    ],
    src:"spec §5.19, §5.20.2 · decodeframe.c:decode_tiles/decode_tile · TileInfo@tile_common.h" },

  { id:"b5", title:"[Spec투어] ⭐ Partition — 비대칭 분할 + SDP(luma/chroma 분리)",
    tldr:"AV2 분할 타입은 NONE/HORZ/VERT/HORZ_3/VERT_3/HORZ_4A/4B/VERT_4A/4B/SPLIT. 그리고 SDP로 luma와 chroma가 서로 다른 트리를 쓸 수 있다.",
    body:[
      "<b>spec §5.20.3 · 코드 <code>decodeframe.c:decode_partition_sb → decode_partition</code>(재귀), 노드 <code>PARTITION_TREE</code>(<code>av2/common/blockd.h</code>).</b>",
      "<b>실제 분할 타입(enums.h 실측):</b> <code>NONE, HORZ, VERT, HORZ_3, VERT_3, HORZ_4A, HORZ_4B, VERT_4A, VERT_4B, SPLIT</code>. <code>HORZ_3</code>=가로 3분할 <b>1:2:1</b> 비율, <code>HORZ_4A</code>=불균등 <b>1:2:4:1</b>, <code>HORZ_4B</code>=<b>1:4:2:1</b>(1/8 블록 단위 <code>ebs</code>로 누적). AV1의 균등 4분할·HORZ_A/B는 사라지고 3-way+불균등 4-way로 대체됐다(균등 4분할은 재귀 SPLIT로만 도달).",
      "<b>분할 타입은 단일 심볼이 아니라 계층적 다중 심볼</b>로 읽는다(<code>read_partition</code>): forced/implied 체크 → <code>do_split</code> → <code>do_square_split</code>(→SPLIT) → <code>rect_type</code>(HORZ/VERT) → <code>do_ext_partition</code> → <code>do_uneven_4way</code>+타입, 마지막에 <code>rect_part_table[...]</code>로 enum 결정. luma/chroma는 <code>plane</code>별 CDF 뱅크로 독립 적응.",
      "<b>⭐ SDP(Semantically Decoupled Partitioning):</b> chroma가 luma와 다른 분할을 쓸 수 있다. 그래서 <code>decode_partition</code>은 항상 두 트리 <code>ptree</code>+<code>ptree_luma</code>를 들고 다닌다(<code>SB_INFO::ptree_root[2]</code>, 0=luma/shared, 1=chroma). 인트라 프레임에선 <b>64×64에서 luma 트리를 먼저 디코드한 뒤 chroma 트리를 디코드</b>하며 luma를 참조한다(<code>total_loop_num==2</code> 인터리브).",
      "<b>chroma가 luma를 어떻게 참조하나:</b> <code>is_luma_chroma_share_same_partition</code>이 (a) 64×64 초과는 항상 공유, (b) luma가 NONE이면 chroma도 NONE, (c) 그 외엔 luma의 첫 분할 방향을 보고 공유할지/독립으로 자기 심볼을 읽을지 결정. 공유 시 <code>sdp_chroma_part_from_luma</code>가 서브샘플링·최소 chroma 블록 제약에 맞춰 luma 분할을 chroma 분할로 매핑(비트 추가 없이).",
      "<b>확장 SDP(인터):</b> <code>PARTITION_TREE.region_type</code>(INTRA_REGION/MIXED)와 <code>extended_sdp_allowed_flag</code>로, 인터 프레임 안의 한 영역을 순수 인트라 영역으로 분리해 luma-only 트리로 전환할 수 있다. <code>is_cfl_allowed_for_this_chroma_partition</code>은 분리된 chroma 파티션에서 CfL이 유효한지(co-located luma 매핑 성립 여부)를 인코딩."
    ],
    terms:[
      {t:"HORZ_3 / 4A / 4B", d:"가로 3분할(1:2:1) / 불균등 4분할(1:2:4:1, 1:4:2:1). AV2 신규 비대칭 분할."},
      {t:"SDP", d:"luma/chroma 분리 파티셔닝. chroma가 luma 트리를 참조하되 독립 분할 가능."},
      {t:"read_partition", d:"do_split→square→rect→ext→4way 계층 심볼로 분할 타입 결정."}
    ],
    src:"spec §5.20.3 · decodeframe.c:decode_partition/read_partition · PARTITION_TREE@blockd.h · enums.h:506" },

  { id:"b6", title:"[Spec투어] Block & Mode Info — TX 파티션 트리, 풍부한 모드 신호",
    tldr:"블록 = 파티션의 리프. 모드 정보를 읽고(intra: TU별 예측+역변환 인터리브, inter: 예측 후 잔차) 복원한다. MB_MODE_INFO에 AV2 신규 도구 필드가 가득.",
    body:[
      "<b>spec §5.20.4-5 · 코드 <code>decodeframe.c:parse_decode_block/decode_block → decode_token_recon_block</code>, 모드 <code>decodemv.c:av2_read_mode_info</code>, 구조체 <code>MB_MODE_INFO</code>(<code>blockd.h</code>).</b>",
      "<b>블록 1개의 연산 순서:</b> 모드 읽기(<code>decode_mbmi_block</code>) → 팔레트 → <b>TX 파티션/TX 크기</b> → per-segment 역양자화 셋업 → <code>decode_token_recon_block</code>. 인트라는 <b>TU별로 (계수 파싱 → 예측 → 역변환 → 가산)을 인터리브</b>(예측이 이웃 복원 픽셀을 필요로 하므로), 인터는 <b>블록 전체 예측 먼저 → TU별 (계수 파싱 → 역변환 → 가산)</b>.",
      "<b>256×256 지원:</b> <code>decode_token_recon_block</code>은 128×128 → 64×64 → TU 중첩 루프로 큰 코딩블록(256까지)을 처리한다(AV1 128 최대 대비).",
      "<b>TX 파티션 트리(AV2):</b> <code>tx_partition_type[]</code>/<code>sub_txs[]</code>로 변환 블록을 재귀 분할 — AV1의 var-tx depth 신호 방식에서 트리 구조로 바뀜.",
      "<b>parse/decode 분리:</b> 실제 예측·복원 작업은 <code>ThreadData</code>의 함수 포인터 'visitor'들로 호출된다(<code>read_coeffs_tx_*_block_visit</code>, <code>predict_*_block_visit</code>, <code>inverse_tx_*_block_visit</code>). parse-only 패스에선 no-op로 바뀌어 행-멀티스레드를 가능케 함.",
      "<b>MB_MODE_INFO 신규 필드(델타):</b> SDP용 <code>tree_type/region_type</code>, 인터 — <code>pb_mv_precision</code>(적응 MV 정밀도), <code>refinemv_flag</code>(DMVR), <code>bawp_*</code>, <code>cwp_idx</code>, <code>jmvd_scale_mode</code>, <code>use_amvd</code>, 풍부한 warp 신호, <code>morph_pred</code>; 인트라 — <code>use_intra_dip</code>(행렬 인트라), 적응 모드 리스트(<code>y_intra_mode_list[]</code>), wide-angle 리매핑, DPCM, MRL 다중라인, MHCCP. 필터 — <code>cdef_strength</code>, <code>ccso_blk_*</code>, <code>local_gdf_mode</code>."
    ],
    terms:[
      {t:"TX 파티션 트리", d:"변환 블록을 재귀 분할(tx_partition_type/sub_txs). AV1 var-tx의 후신."},
      {t:"visitor 함수 포인터", d:"parse/decode를 분리해 멀티스레드를 가능케 하는 호출 디스패치."},
      {t:"DIP (intra_dip)", d:"행렬 기반 인트라 예측(use_intra_dip). 결정론적."}
    ],
    src:"spec §5.20.4-5 · decodeframe.c:decode_token_recon_block, decodemv.c · MB_MODE_INFO@blockd.h" },

  { id:"b7", title:"[Spec투어] ⭐ Transform & Quant — IST·CCTX·DDT·TCQ",
    tldr:"AV2는 계수 엔트로피와 변환에 큰 변화를 줬다: 2차 변환(IST), 교차 크로마 변환(CCTX), 데이터구동 변환(DDT), 트렐리스 양자화(TCQ), 적응 Rice/Golomb 고범위 코딩.",
    body:[
      "<b>spec §5.20.6 · 코드 계수 <code>decodetxb.c:av2_read_coeffs_txb</code>, 역변환 <code>av2/common/idct.c:av2_inverse_transform_block</code>.</b> 분리형 2D 변환 타입(<code>TX_TYPE</code>: DCT/ADST/FLIPADST/IDTX/V_DCT/H_DCT…)은 AV1과 같은 16종 집합.",
      "<b>IST (Intra/Inter Secondary Transform):</b> 1차 변환 위에 얹는 비분리 2차 변환. <code>TX_TYPE</code> 한 값의 <b>상위 비트에 2차 커널·세트가 패킹</b>된다(<code>get_primary_tx_type=&0xF</code>, <code>get_secondary_tx_type=(>>4)&0x3</code>). 역변환은 <code>av2_inv_stxfm</code>이 좌상단 4×4/8×8에 mode-keyed 커널을 적용(VVC LFNST와 유사한 계열).",
      "<b>CCTX (Cross-Chroma Transform):</b> U·V 사이의 회전/Haar 변환(<code>CctxType</code>: 45/30/60도 등). 디코드 시 U에서 <code>av2_read_cctx_type</code>로 한 번 신호, per-plane 역변환 <b>전에</b> <code>av2_inv_cross_chroma_tx_block</code>으로 U/V를 결합 처리. AV1엔 없음.",
      "<b>DDT (Data-Driven Transform):</b> 조건 충족 시 ADST(DST7/DCT8) 자리를 학습 기반 커널 <code>DDTX</code>/<code>FDDT</code>가 대체(<code>replace_adst_by_ddt</code>).",
      "<b>TCQ (Trellis-Coded Quantization):</b> 계수 디코드에 상태 기계가 얽힌다(<code>tcq_init_state/next_state</code>). 역양자화 값이 <code>qIdx=max(0,(|coeff|<<1)-Qx)</code> 형태로 상태에 따라 재계산 — 비트스트림 안에 트렐리스가 결합된 AV2 신규.",
      "<b>엔트로피 디테일:</b> 저주파(LF) 전용 base CDF(<code>coeff_base_lf_*</code>), <b>parity hiding</b>(마지막 부호/레벨 대신 합의 패리티 1비트를 숨김), 그리고 레벨의 고범위 꼬리를 <b>적응 Truncated-Rice/Exp-Golomb</b>로 코딩(<code>hr_coding.c</code>: 컨텍스트로 Rice 파라미터 m을 키움). AV1의 고정 Exp-Golomb 꼬리에서 진화."
    ],
    terms:[
      {t:"IST", d:"Intra/Inter Secondary Transform. TX_TYPE 상위비트에 패킹된 비분리 2차 변환."},
      {t:"CCTX", d:"Cross-Chroma Transform. U·V 결합 회전 변환(AV2 신규)."},
      {t:"TCQ", d:"Trellis-Coded Quantization. 상태기계 결합 양자화."},
      {t:"DDT", d:"Data-Driven Transform(DDTX/FDDT). 조건부 ADST 대체."}
    ],
    src:"spec §5.20.6 · decodetxb.c, idct.c:av2_inv_stxfm, hr_coding.c · enums.h:TX_TYPE/CctxType" },

  { id:"b8", title:"[Spec투어] ⭐ Motion & Prediction — TIP, DMVR/광류, 유연 MV",
    tldr:"AV2 인터 예측의 큰 신규는 TIP(디코더가 두 참조 사이를 보간해 프레임 자체를 합성). 거기에 DMVR·광류 정밀화, 유연 MV 정밀도, 가중 예측이 더해진다.",
    body:[
      "<b>spec §5.20.7 · 코드 MC <code>av2/common/convolve.c</code>, TIP <code>av2/common/tip.c</code>.</b> 서브픽셀 보간은 8-tap(regular/smooth/sharp)+bilinear, 16위상, highbd(AV2는 내부 고비트심도)로 AV1과 같은 계열.",
      "<b>⭐ TIP (Temporal Interpolated Prediction):</b> 디코더가 <b>가장 가까운 전/후 참조 한 쌍 사이를 모션 보간해 프레임 전체를 합성</b>한다(잔차 없이). 모드 3종(<code>tip.h</code>): DISABLED / <b>AS_REF</b>(합성 프레임을 참조에 추가) / <b>AS_OUTPUT</b>(합성 프레임을 바로 출력).",
      "<b>TIP 동작:</b> per-8×8 시간 모션필드(<code>tpl_mvs</code>)를 두 참조에 표시순서 거리로 선형 투영(<code>tip_get_mv_projection</code>) → hole-fill로 빈 MV 전파 + 평균 필터 평활화 → 양방향 모션보상 예측을 <code>COMPOUND_AVERAGE</code>로 합성. luma는 <b>DMVR(<code>apply_mv_refinement</code>)</b>과 <b>광류 정밀화(<code>av2_get_optflow_based_mv</code>, 두 참조 SAD가 임계 미만이면 생략)</b>로 추가 정밀화.",
      "<b>유연 MV 정밀도:</b> 프레임/블록 단위로 1/4·1/8·half·full-pel 선택(<code>fr_mv_precision</code>, <code>pb_mv_precision</code>) — AV1의 high-precision/integer 2단보다 세분화.",
      "<b>그 외 신규 인터 도구:</b> <code>ref_mv_bank</code>(공간/시간 MVP를 넘는 MV 뱅크), warp param bank, <b>BAWP</b>(블록 적응 가중 예측)·<b>CWP</b>(컴파운드 가중)·<b>JMVD/AMVD</b>(결합/적응 MVD), <b>BRU</b>(블록 참조 업데이트) — 대부분 디코더 측 파생을 늘려 신호 비트를 줄이는 방향."
    ],
    terms:[
      {t:"TIP", d:"두 참조 사이 모션 보간으로 디코더가 프레임을 합성. AS_REF/AS_OUTPUT."},
      {t:"DMVR / OPFL", d:"디코더측 MV 정밀화(매칭)·광류 기반 세부 MV. luma."},
      {t:"flex MV precision", d:"MV 해상도를 프레임/블록 단위로 선택."}
    ],
    src:"spec §5.20.7 · common/convolve.c, tip.c · TIP_FRAME_MODE@av2_common_int.h" },

  { id:"b9", title:"[Spec투어] Coding Tools — 행렬 인트라(DIP)·CfL 확장 / 그리고 ML의 진실",
    tldr:"AV2 인트라 도구는 디코더측 파생을 늘렸다: 행렬 인트라(DIP, 고정 행렬), 암시적 CfL(최소제곱), MHCCP. 그리고 'AV2의 NN'이 어디 있는지 정확히 짚는다.",
    body:[
      "<b>spec §5.20.8 · 코드 <code>av2/common/intra_dip.cc/intra_matrix.c</code>(행렬 인트라), <code>av2/common/cfl.c</code>(CfL).</b>",
      "<b>행렬 인트라 (DIP):</b> 복원된 경계를 한 변당 4개로 다운샘플해 <b>11개 특징 벡터</b>를 만들고, <b>6개의 고정 정수 행렬</b> 중 하나(±transpose)와 곱해 8×8 예측을 만든 뒤 TX 크기로 리샘플(<code>av2_dip_matrix_multiplication_c</code>). <b>완전 결정론적·정수 연산</b>(학습/추론 아님). 모드 인덱스(6-way)만 엔트로피 코딩, luma 한정.",
      "<b>CfL 확장:</b> 여전히 chroma = chroma_DC + α·(복원 luma의 AC). AV2는 (a) <b>암시적 α</b>(<code>CFL_DERIVED_ALPHA</code>) — 이웃 luma·chroma 쌍의 <b>최소제곱 회귀</b>로 α를 디코더가 유도(신호 비트 0), (b) <b>MHCCP</b>(<code>CFL_MULTI_PARAM</code>) — 블록별 다파라미터 선형 교차성분 모델(가우스 소거로 풂)을 추가.",
      "<b>⭐ 'AV2의 ML'의 정확한 위치(실측):</b> AVM 빌드가 TensorFlow Lite를 링크하지만, <code>grep tflite av2/</code> 결과는 <b>전부 인코더 파일</b>(<code>partition_ml.c</code>, <code>part_split_prune_tflite</code>, <code>intra_dip_mode_prune_tflite</code>, <code>intra_mode_search.c</code>) — <b>인코더 탐색/모드 가지치기 가속(비규범)</b>이다. 디코더 규범 경로엔 <b>부동소수 NN 추론이 없다</b>.",
      "<b>단, 미묘한 진실:</b> 디코더에도 '학습으로 얻은 가중치'를 쓰는 도구가 있다 — 다음 챕터의 <b>GDF</b>는 trained weight/bias 테이블을 쓰는 정수 필터다. 즉 AV2 디코더는 <b>NN을 닮은 정수 연산(고정 가중치, bit-exact)</b>을 품되, 런타임 부동소수 추론기는 두지 않는 설계다."
    ],
    terms:[
      {t:"DIP (행렬 인트라)", d:"경계 11특징 × 고정 정수 행렬 6종 → 8×8 예측. 결정론적, luma."},
      {t:"암시적 CfL / MHCCP", d:"이웃 회귀로 α 유도 / 다파라미터 교차성분 선형 모델."},
      {t:"AV2 ML 경계", d:"TFLite NN=인코더 탐색(비규범). 디코더 규범엔 부동소수 추론 없음."}
    ],
    src:"spec §5.20.8 · intra_dip.cc, intra_matrix.c, cfl.c · (TFLite=encoder-only)" },

  { id:"b10", title:"[Spec투어] ⭐ In-loop Filters — 체인은 deblock→CDEF→CCSO→LR→GDF",
    tldr:"AV2는 CDEF·loop-restoration에 CCSO와 GDF를 추가한다. CCSO는 luma-guided 오프셋 LUT, GDF는 'Guided Detail Filter' = 학습 가중치 정수 필터(디코더 규범).",
    body:[
      "<b>spec §5.20.10/§5.18.5 · 호출부 <code>decodeframe.c</code>(~9915–10060).</b> 확정된 적용 순서: <b>Deblock → CDEF → CCSO → Loop Restoration → GDF</b>. (deblock=<code>av2_loopfilter.c</code>, CDEF=<code>cdef.c</code>, LR=<code>restoration.c</code> — AV1 계보.)",
      "<b>⭐ CCSO (Cross-Component Sample Offset, <code>ccso.c</code>):</b> <b>복원 luma로 분류해 대상 평면(주로 chroma) 샘플에 오프셋을 더한다.</b> 각 샘플마다 (1) 중심 luma 대비 두 방향 이웃 luma의 차를 양자화한 <b>edge class</b>, (2) 중심 luma 레벨의 <b>band</b>를 만들어 <code>(band<<4)+(cls0<<2)+cls1</code>로 LUT 인덱스를 만들고, <b>부호 오프셋을 더해 클램프</b>. edge-offset과 band-offset을 결합한 구조(인코더가 프레임 단위로 오프셋 LUT를 시그널).",
      "<b>⭐ GDF (Guided Detail Filter, <code>gdf.c</code>/<code>gdf_block.c</code>):</b> 코드 주석이 'Guided Detail Filter'로 확인. <b>luma 전용, 학습된 가중치 기반의 퍼셉트론형 정수 필터.</b> 3단계: ① 방향성 Laplacian으로 픽셀을 class 분류 → ② 18개 복원-샘플 차분 + 4개 gradient를 입력으로 per-class <code>alpha</code>로 클립·<code>weight</code> 곱·누적·<code>bias</code> 후 <b>예측 코딩오차를 error LUT에서 조회</b> → ③ 그 오차를 스케일해 복원에 가산. 테이블은 QP·intra/inter·참조거리로 선택.",
      "<b>왜 중요한가:</b> GDF는 '학습으로 얻은' 필터지만 <b>고정 정수 테이블 + 정수 연산이라 bit-exact</b>하다. 즉 AV2 디코더 규범 경로에 NN을 닮은 <b>MAC 집약 필터</b>가 실재한다(런타임 부동소수 추론은 아님). 인루프라 필터링된 프레임이 다음 프레임의 참조가 되므로 모든 디코더가 동일하게 수행해야 한다.",
      "<b>체인 디테일:</b> CCSO는 post-CDEF luma의 패딩 복사본(<code>ext_rec_y</code>)을 입력으로 받고, GDF는 loop-restoration 이전 프레임을 스냅샷하되 적용은 restoration <b>이후</b>에 마지막으로 한다. lossless면 전 체인이 0."
    ],
    terms:[
      {t:"CCSO", d:"복원 luma로 분류(edge class+band)해 오프셋 LUT를 더하는 AV2 신규 필터."},
      {t:"GDF", d:"Guided Detail Filter. 학습 가중치 정수 퍼셉트론형 luma 필터(디코더 규범, bit-exact)."},
      {t:"필터 체인", d:"deblock→CDEF→CCSO→loop restoration→GDF 순."}
    ],
    src:"spec §5.20.10, §5.18.5 · decodeframe.c:9915-10060 · ccso.c, gdf.c/gdf_block.c" },

  { id:"b11", title:"[Spec투어] AV2 신규 시스템 OBU — Atlas·LCR·OPS·CI",
    tldr:"AV2가 추가한 전달/시스템 레벨 OBU들. 다중 프로그램(분할화면), 스케일러빌리티, AR/VR을 겨냥. 각 OBU가 코드 파일로 분리돼 있다.",
    body:[
      "<b>코드: OBU별 파일</b> <code>av2/decoder/obu_atlas.c, obu_lcr.c, obu_ops.c, obu_ci.c</code> — spec 章과 1:1.",
      "<b>Atlas (§5.9, <code>obu_atlas.c</code>):</b> 한 디코드 픽처를 여러 <b>region/segment</b>로 나눠 다중 sub-image를 한 프레임에 패킹·합성(분할 화면, 멀티스트림). 모드 5종(ENHANCED/BASIC/SINGLE/MULTISTREAM/MULTISTREAM_ALPHA), region 격자·segment 위치/크기·스트림 id·alpha 합성 정보를 담는다.",
      "<b>LCR (Layer Configuration Record, §5.8, <code>obu_lcr.c</code>):</b> 스케일러빌리티/멀티레이어 구성 기록 — 존재하는 xlayer/mlayer/tlayer, profile/tier/level, 색·atlas 연관, 의존성 맵, 해상도. Global(전 스트림)/Local(per-xlayer) 두 종. <b>Global LCR에 xlayer가 2개 이상이면 MSDO OBU 없이도 멀티스트림 모드로 전환</b>. 같은 id의 LCR 재전송은 bit-identical이어야 함(memcmp).",
      "<b>OPS (Operating Point Set, §5.10-11, <code>obu_ops.c</code>):</b> 추출 가능한 부분 비트스트림(어느 레이어 집합 + PTL/색/디코더모델/지연) 정의. AV1은 이게 시퀀스 헤더 안의 고정 리스트였지만, <b>AV2는 갱신 가능한 독립 OBU</b>(global/local, reset/update 4-케이스, embedded-OP 상속, 엄격한 byte 회계).",
      "<b>CI (Content Interpretation, §5.15, <code>obu_ci.c</code>):</b> AV1이 시퀀스 헤더에 두던 색 description·chroma 위치·SAR(종횡비)·scan type·timing을 <b>per-mlayer 독립 OBU</b>로 분리. key OBU와 함께 와야 하고, 아니면 저장값과 동일해야 함.",
      "<b>관통 패턴:</b> 모든 신규 OBU가 <code>extension_present_flag</code>+확장비트 skip+trailing bits로 끝나는 전방호환 idiom, 3축 레이어 비트마스크, 재전송 bit-identical 보존을 공유한다 — AV2의 '시스템 레벨' 설계 의도가 드러난다."
    ],
    terms:[
      {t:"Atlas", d:"다중 sub-image를 한 프레임에 패킹/합성(분할화면·멀티스트림)."},
      {t:"LCR / OPS", d:"레이어 구성 기록 / 추출 가능한 operating point 집합. 독립 OBU."},
      {t:"CI", d:"색·SAR·scan·timing을 per-mlayer 독립 OBU로 분리."}
    ],
    src:"spec §5.6/5.8/5.9/5.10-11/5.15 · obu_atlas/lcr/ops/ci.c" }
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
    { type:"ox", q:"AV2는 OBU '종류'뿐 아니라 OBU '헤더 비트 구조' 자체도 AV1과 다르다.", answer:true,
      why:"AV2 첫 바이트=ext(1)|type(5)|tlayer(2), size(ULEB)가 헤더 앞에 선행. forbidden/reserved 비트 없음." },
    { type:"mc", q:"AV2 신규 인루프 필터 CCSO의 분류 입력은?",
      choices:["chroma 잔차","복원 luma","MV","QP만"], answer:1,
      why:"CCSO는 복원 luma의 edge class+band로 분류해 대상 평면에 오프셋을 더한다." },
    { type:"mc", q:"AV2 디코더의 슈퍼블록 분할 트리 구조체는?",
      choices:["MB_MODE_INFO","PARTITION_TREE","TileInfo","SequenceHeader"], answer:1,
      why:"PARTITION_TREE(blockd.h)가 재귀 분할 노드. decode_partition이 다룬다." }
  ],
  inter:[
    { type:"ox", q:"AVM 인코더는 일반적으로 매우 느리다(레퍼런스 연구용).", answer:true,
      why:"속도보다 정확성·실험성이 목적이라 초당 1프레임 미만도 흔하다. 테스트는 짧게." },
    { type:"mc", q:"AV2 partition에서 decode_partition이 ptree와 ptree_luma 두 트리를 받는 이유는?",
      choices:["멀티스레드","luma/chroma 분리 파티셔닝(SDP)","압축률 측정","에러 복구"], answer:1,
      why:"SDP에서 chroma가 luma 트리를 참조하되 독립 분할할 수 있어 두 트리가 필요하다." },
    { type:"mc", q:"AV2 인루프 필터 체인의 올바른 순서는?",
      choices:["deblock→CCSO→CDEF→LR→GDF","deblock→CDEF→CCSO→LR→GDF","CDEF→deblock→GDF→CCSO→LR","deblock→CDEF→LR→GDF→CCSO"], answer:1,
      why:"실측 호출부 기준 deblock→CDEF→CCSO→loop restoration→GDF 순." },
    { type:"ox", q:"AVM이 TensorFlow Lite를 링크하므로 AV2 디코더 규범 경로에서 부동소수 NN 추론이 일어난다.", answer:false,
      why:"TFLite 사용처는 전부 인코더(탐색/가지치기). 디코더 규범엔 부동소수 추론 없음. 단 GDF는 학습 가중치를 쓰는 '정수' 필터." },
    { type:"mc", q:"GDF(Guided Detail Filter)에 대한 설명으로 옳은 것은?",
      choices:["인코더 전용 도구","부동소수 NN 추론을 디코더에서 실행","학습 가중치를 쓰지만 정수·bit-exact인 디코더 인루프 필터","손실 압축용 양자화기"], answer:2,
      why:"GDF는 trained weight/bias LUT를 쓰는 luma 정수 필터로 디코더 규범 경로에서 bit-exact하게 동작." },
    { type:"mc", q:"TIP(Temporal Interpolated Prediction)가 하는 일은?",
      choices:["공간 인트라 예측","두 참조 사이를 모션 보간해 프레임을 합성","엔트로피 코딩","색공간 변환"], answer:1,
      why:"디코더가 전/후 참조 사이를 모션 보간해 프레임을 합성(AS_REF 또는 AS_OUTPUT)." },
    { type:"mc", q:"AV2가 TX_TYPE 한 값의 상위 비트에 패킹한 것은?",
      choices:["MV","2차 변환(IST) 커널·세트","QP","tile id"], answer:1,
      why:"primary=&0xF, secondary(IST)=(>>4)&0x3 식으로 2차 변환 정보가 같은 값에 패킹된다." },
    { type:"mc", q:"AV2가 다중 프로그램(분할 화면) 전달을 위해 추가한 OBU는?",
      choices:["Atlas","Film grain","Temporal delimiter","Padding"], answer:0,
      why:"Atlas(obu_atlas.c, §5.9)가 다중 sub-image 배치/합성 정보를 담는다." }
  ]
};

const THINK = [
  { q:"스펙(문서)과 C 모델(코드)이 어긋난다면 무엇이 '정답'일까? 왜 둘 다 배포할까?",
    hint:"표준의 정의 주체와, bit-exact 검증의 기준이 무엇인지 생각." },
  { q:"디코더만 공부해도 코덱을 이해할 수 있을까? 인코더를 봐야만 알 수 있는 건 무엇일까?",
    hint:"비트스트림은 디코더가 '읽는' 대상. 인코더의 선택(RDO·탐색)은 스트림에 결과로만 남는다." },
  { q:"AV2가 partition을 비대칭(HORZ_3/4A/4B)으로 늘리고 luma/chroma를 분리(SDP)한 건 무엇을 노린 걸까?",
    hint:"콘텐츠 적응적 분할의 표현력 ↔ 시그널링/복잡도 비용의 트레이드오프." },
  { q:"AV2는 TIP·DIP·암시적 CfL·DMVR·GDF처럼 '디코더측 파생/계산'을 크게 늘렸다. 무엇을 얻고 무엇을 치르나?",
    hint:"신호 비트 절감 ↔ 디코더 연산량 증가. bit-exact 결정론 유지가 전제." },
  { q:"AV2의 NN은 인코더 탐색(부동소수)과 디코더 GDF(정수 고정가중치)로 갈린다. 이 경계가 의미하는 설계 원칙은?",
    hint:"모든 기기에서 동일 출력(결정론)이어야 하는 디코더 vs 자유로운 인코더." },
  { q:"OBU 종류만 봐도 코덱이 노린 응용을 읽을 수 있다 — AV2의 Atlas·LCR·OPS·Multi-Stream은 어떤 미래를 겨냥할까?",
    hint:"분할 화면 다중 프로그램, AR/VR, 스케일러블 전달." }
];

const RELATED = [
  { t:"AV1 → AV2 코딩 툴 변화", d:"파티션·변환·예측·인루프 필터 등에서 무엇이 새로 추가됐나.", kw:"AV2 AVM new coding tools vs AV1" },
  { t:"엔트로피 코딩 (MSAC 계열)", d:"비트스트림을 심볼로 푸는 산술 디코더.", kw:"AV1 AV2 entropy coding multi-symbol arithmetic decoder" },
  { t:"OBU 구조", d:"AV1/AV2 비트스트림의 패킷(OBU) 종류와 역할.", kw:"AV1 OBU open bitstream unit types" },
  { t:"dav1d (고속 디코더)", d:"레퍼런스가 아닌 production AV1 디코더와의 차이.", kw:"dav1d AV1 decoder vs libaom" },
  { t:"CCSO (Cross-Component Sample Offset)", d:"AV2 신규 인루프 필터 — luma로 분류해 오프셋.", kw:"AV2 CCSO cross component sample offset in-loop filter" },
  { t:"GDF (Guided Detail Filter)", d:"학습 가중치 정수 인루프 필터(디코더 규범).", kw:"AV2 guided detail filter neural in-loop" },
  { t:"TIP (Temporal Interpolated Prediction)", d:"두 참조 사이 모션 보간으로 프레임 합성.", kw:"AV2 temporal interpolated prediction TIP" },
  { t:"IST / CCTX / TCQ", d:"2차 변환·교차 크로마 변환·트렐리스 양자화.", kw:"AV2 secondary transform cross chroma trellis quantization" },
  { t:"SDP / 확장 partition", d:"AV2의 luma/chroma 분리 및 비대칭 분할.", kw:"AV2 semantically decoupled partitioning luma chroma" },
  { t:"인코더 ML 가속 (비규범)", d:"파티션/모드 가지치기에 쓰인 TFLite 모델.", kw:"AV2 AVM machine learning partition pruning encoder tflite" }
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
