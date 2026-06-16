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
    src:"실습 — 스펙↔코드 (예정)" }
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
      why:"AOM_TARGET_CPU=generic으로 C 레퍼런스 경로만 타면 gdb·매핑이 깨끗해진다." }
  ],
  inter:[
    { type:"mc", q:"AVM 디코더의 프레임 디코드 진입 함수는?",
      choices:["main","av2_receive_compressed_data","decode_block","avmdec_main"], answer:1,
      why:"av2/decoder/decoder.c의 av2_receive_compressed_data()가 프레임 진입점." },
    { type:"mc", q:"블록까지 내려가는 호출 순서로 맞는 것은?",
      choices:["decode_block → decode_tile → decode_partition","decode_tiles → decode_tile → decode_partition_sb → decode_partition","decode_partition → decode_tiles → decode_block","main → decode_block"], answer:1,
      why:"tile→SB→재귀 partition 순으로 내려간다." },
    { type:"ox", q:"AVM 인코더는 일반적으로 매우 느리다(레퍼런스 연구용).", answer:true,
      why:"속도보다 정확성·실험성이 목적이라 초당 1프레임 미만도 흔하다. 테스트는 짧게." }
  ]
};

const THINK = [
  { q:"스펙(문서)과 C 모델(코드)이 어긋난다면, 무엇이 '정답'일까? 왜 둘 다 배포할까?",
    hint:"표준의 정의 주체와, bit-exact 검증의 기준이 무엇인지 생각." },
  { q:"디코더만 공부해도 코덱을 이해할 수 있을까? 인코더를 봐야만 알 수 있는 건 무엇일까?",
    hint:"비트스트림은 디코더가 '읽는' 대상. 인코더의 선택(RDO 등)은 스트림에 결과로만 남는다." },
  { q:"AVM이 libaom 포크라는 사실은 학습 순서를 어떻게 바꿔줄까?",
    hint:"공통 골격을 먼저 잡고 '델타(차이)'만 깊게 보는 전략." }
];

const RELATED = [
  { t:"AV1 → AV2 코딩 툴 변화", d:"파티션·변환·예측·인루프 필터 등에서 무엇이 새로 추가됐나.", kw:"AV2 AVM new coding tools vs AV1" },
  { t:"엔트로피 코딩 (MSAC 계열)", d:"비트스트림을 심볼로 푸는 산술 디코더.", kw:"AV1 AV2 entropy coding multi-symbol arithmetic decoder" },
  { t:"OBU 구조", d:"AV1/AV2 비트스트림의 패킷(OBU) 종류와 역할.", kw:"AV1 OBU open bitstream unit types" },
  { t:"dav1d (고속 디코더)", d:"레퍼런스가 아닌 production AV1 디코더와의 차이.", kw:"dav1d AV1 decoder vs libaom" }
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
