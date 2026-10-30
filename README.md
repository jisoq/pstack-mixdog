# pstack-mixdog

[cursor/plugins의 pstack](https://github.com/cursor/plugins/tree/main/pstack)을 Mixdog에서 쓰기 위한 플러그인과 그 관리 도구입니다. 업스트림 원문(스킬, 플레이북, 원칙)은 고치지 않고 그대로 복사하고, Cursor 전용 이름은 Mixdog 어댑터 한 장(`harness/adapter.md`)으로 옮깁니다. 업스트림이 Claude Code를 지원할 때 쓰는 방식(`docs/harness/claude-code.md`와 생성 스크립트)과 같은 구조입니다.

이 저장소의 최상위 폴더가 그대로 Mixdog 플러그인입니다. Mixdog은 최상위 `plugin.json`과 `skills/` 아래만 읽으므로, 같은 저장소에 있는 관리 도구(`scripts/`, `harness/`)는 동작에 끼어들지 않습니다.

## 설치

Mixdog 대화창에서 두 가지를 요청합니다. PC마다 한 번이면 됩니다.

1. "`jisoq/pstack-mixdog`을 플러그인으로 등록해줘" (`setup` `add_plugin`)
2. "pstack-mixdog 저장소의 `harness/WORKFLOW.md` 내용으로 Poteto mode 워크플로우 만들어줘" (`setup` `create_definition`, 종류 workflow). 워크플로우는 플러그인에 담아 배포할 수 없어 따로 만듭니다. 전역 활성 워크플로우는 바뀌지 않습니다.

3. `$pstack /setup-pstack` 실행. pstack 전용 에이전트 다섯 개를 만들고 모델을 배정합니다. 건너뛰어도 첫 `$pstack` 실행 때 에이전트가 없으면 이 단계가 먼저 진행됩니다.

업데이트는 "pstack 플러그인 업데이트해줘"(`setup` `update_plugin`)로 받습니다.

### 기본 모델 배정

pstack의 17개 역할은 다섯 에이전트로 묶입니다. 기본 모델은 아래와 같고, `setup-pstack`이나 Mixdog 설정 화면에서 바꿀 수 있습니다. 정의 원본은 `harness/agents.md`입니다.

| 에이전트 | 맡는 역할 | 기본 모델 |
| --- | --- | --- |
| `pstack-hard` | 가장 어려운 위임 (설계 전반, 동시성, 미묘한 알고리즘) | Claude Opus 5.5, effort max |
| `pstack-judge` | 판단, 글, how 설명, why 종합, reflect 판단, 패널 첫째 자리 | GPT-6 Astra, effort xhigh, fast |
| `pstack-code` | feature, refactoring, bug-fix, perf, hillclimb의 코드 위임, 패널 둘째 자리 | Claude Opus 5.5, effort Auto |
| `pstack-scout` | how 탐색, why 조사, reflect 도구 검토 | GPT-6.1 Terra, effort medium, fast |
| `pstack-verify` | swarm 워커와 검증 | GPT-6.1 Sol, effort Auto, fast |

패널(arena, architect, interrogate)은 `pstack-judge`와 `pstack-code`를 하나씩 띄워 교차 검증하므로, 두 에이전트는 서로 다른 계열 모델(예: GPT와 Claude)이어야 합니다. 기본값은 `anthropic-oauth`와 `openai-oauth` 로그인을 전제로 합니다. 다른 로그인을 쓰는 PC에서는 `setup-pstack`이 해당 에이전트의 모델을 새로 고르게 합니다.

## 사용법

| 하고 싶은 일 | 입력 |
| --- | --- |
| 한 작업을 poteto-mode로 처리 | `$pstack <작업>` (또는 `/skills`에서 `pstack` 선택) |
| pstack의 개별 스킬 실행 | `$pstack /how <질문>`, `$pstack /arena <과제>`처럼 스킬 이름을 붙임 |
| 대화 전체를 poteto-mode로 유지 | 컴포저의 워크플로우 선택기에서 **Poteto mode** 선택 (그 대화에만 적용) |
| 역할별 모델 설정 | `$pstack /setup-pstack`, 또는 Mixdog 설정 화면에서 `pstack-*` 에이전트의 모델을 직접 변경 |

`$pstack` 없이 들어온 요청에는 pstack이 개입하지 않습니다. 대화 중간에 관련 없는 새 요청을 하면 그 요청도 기본 동작으로 처리되고, 다시 `$pstack`을 붙이거나 Poteto mode 워크플로우를 켠 대화에서만 pstack이 동작합니다.

## 요청하지 않은 작업에 미치는 영향

| 항목 | 상태 |
| --- | --- |
| 스킬 목록 | `pstack` 한 줄만 추가됩니다. 업스트림의 60여 개 스킬은 플러그인의 `upstream/` 아래에 있어 Mixdog 스킬로 등록되지 않습니다. 트리거 문구가 "명시적으로 지목했을 때만"이라 작업 내용만 보고 자동 선택되지 않습니다. |
| 에이전트 목록 | pstack 전용 에이전트 다섯 개(`pstack-hard`, `pstack-judge`, `pstack-code`, `pstack-scout`, `pstack-verify`)가 추가됩니다. Mixdog의 에이전트 목록은 전역이라 모든 대화의 목록에 보이지만, 설명에 "pstack 실행에서만 사용"이라고 적혀 있어 다른 작업에는 선택되지 않습니다. 기존 에이전트(`worker` 등)의 지침과 모델은 건드리지 않습니다. |
| 워크플로우 | 전역 기본값은 Default 그대로입니다. Poteto mode는 직접 고른 대화에만 적용됩니다. |
| 모델 설정 | 각 `pstack-*` 에이전트의 Mixdog 모델 설정이 그 역할의 모델입니다. 다른 에이전트의 설정이나 AGENTS.md는 건드리지 않습니다. |
| 끄기 | 플러그인을 비활성화하면 한 번에 사라집니다. |

## 구조

| 경로 | 역할 | 수정 |
| --- | --- | --- |
| `harness/adapter.md` | Cursor 이름을 Mixdog 도구로 옮기는 매핑과 우선순위 규칙 | 직접 수정 |
| `harness/SKILL.md` | Mixdog에 등록되는 유일한 스킬 `pstack`의 템플릿 | 직접 수정 |
| `harness/WORKFLOW.md` | Poteto mode 워크플로우 원본 | 직접 수정 |
| `harness/agents.md` | pstack 전용 에이전트 다섯 개의 정의와 기본 모델 | 직접 수정 |
| `scripts/sync.mjs` | 업스트림을 받아 커밋을 고정하고 변경점을 보여준 뒤 빌드 | 실행 |
| `scripts/build.mjs` | 고정된 업스트림과 `harness/`로 플러그인 생성물을 만들고 검사 | 실행 |
| `upstream.lock.json` | 통합 중인 업스트림 커밋 | sync가 기록 |
| `plugin.json`, `skills/`, `upstream/` | Mixdog이 읽는 플러그인 생성물. 빌드는 이 세 경로만 쓰고 지움 | 생성물, 직접 수정 금지 |
| `.cache/cursor-plugins/` | 업스트림 클론 캐시 (커밋하지 않음) | 생성물 |

## 업스트림 동기화 절차

pstack은 업스트림에서 계속 바뀌므로 관리자는 이 저장소를 클론한 폴더에서 아래 순서를 그대로 따릅니다. Node 22와 git이 필요합니다.

1. `node scripts/sync.mjs`를 실행합니다(특정 브랜치나 태그는 `--ref <ref>`). 업스트림을 받아 새 커밋을 `upstream.lock.json`에 고정하고, 이전 커밋과의 변경 로그와 diff 통계를 출력한 뒤 빌드합니다.
2. `REVIEW` 표시가 나오면 업스트림의 Claude Code 어댑터나 생성 스크립트가 바뀐 것입니다. 출력된 diff를 읽고 같은 변경이 `harness/adapter.md`에도 필요한지 판단해 반영합니다.
3. 빌드가 `FAIL`로 끝나면 메시지대로 고칩니다. 가장 흔한 경우는 "adapter에 `<용어>` 행이 없음"입니다. 업스트림이 새 Cursor 전용 이름을 쓰기 시작했다는 뜻이므로 `harness/adapter.md`에 그 용어의 Mixdog 대응을 추가하고 `node scripts/build.mjs`를 다시 실행합니다. 빌드가 실패하면 생성물은 바뀌지 않습니다.
4. `harness/SKILL.md`를 고쳤다면 생성된 스킬을 Mixdog 스킬 검사기로 확인합니다.
   `node "$env:LOCALAPPDATA\Programs\mixdog-desktop\resources\runtime.asar.unpacked\node_modules\mixdog\src\defaults\skills\skill-creator\scripts\validate-skill.mjs" skills/pstack`
5. `node scripts/build.mjs --check`가 "up to date"를 출력하는지, `node --test scripts/*.test.mjs`가 통과하는지 확인합니다.
6. `upstream.lock.json`, 생성물, 바뀐 `harness/`를 함께 커밋하고 푸시합니다. Windows git은 실행 권한을 기록하지 않으므로, 업스트림에서 실행 파일(`git -C .cache/cursor-plugins ls-files -s`의 `100755`)이 새로 생겼다면 `git update-index --chmod=+x upstream/<경로>`로 같은 권한을 붙여 커밋합니다. 사용자는 `update_plugin`으로 새 버전을 받습니다. 이미 열린 대화에 로드된 스킬 본문은 그대로입니다.
7. `harness/WORKFLOW.md`를 고쳤다면 각 PC의 Poteto mode 워크플로우도 같은 내용으로 갱신해야 합니다(`setup` `save_definition`). 릴리스 설명에 이 사실을 적습니다.

## 알려진 제약

- 업스트림의 Bun 스크립트(`watch-pr`, `statechart`, `*.ts`)와 bash 스크립트(`*.sh`)는 해당 런타임이 있어야 실행됩니다. 없으면 그런 단계는 `Skipped in Mixdog: ...` 한 줄을 남기고 넘어갑니다. Bun을 설치하면 그대로 동작합니다.
- Cursor Automations, Bugbot 설정, Cursor 클라우드 에이전트 자체가 필요한 단계도 같은 방식으로 건너뜁니다. 클라우드 워커는 이 PC의 관리형 worktree로 바뀌고, 빌드나 테스트를 하는 워커는 동시에 두 개까지만 돌립니다.
- 업스트림 스킬에 적힌 모델(`grok-4.7-xhigh-fast` 등)은 쓰지 않습니다. 역할마다 정해진 `pstack-*` 에이전트의 Mixdog 모델 설정을 씁니다. 업스트림의 "작업 난이도에 따라 effort를 한 단계 올리거나 내리기"도 적용되지 않으며, 대신 Auto effort 에이전트가 매 턴 effort를 고릅니다.
- 커밋, 푸시, PR, 머지는 요청이 그 단계를 포함할 때만 진행합니다(직접 요청, Babysit이나 Shipping 같은 해당 플레이북 선택, "자는 동안 머지까지" 같은 전권 위임). 그렇지 않으면 그 직전 단계에서 멈추고 남은 단계를 알려줍니다.

## 끄기와 제거

- 잠시 끄기: Mixdog 확장 화면에서 pstack 플러그인을 비활성화합니다(`setup` `set_plugin_enabled`).
- 제거: 플러그인 등록을 해제하고(`remove_plugin`) Poteto mode 워크플로우를 삭제합니다.

## 출처와 라이선스

`upstream/` 아래의 스킬, 플레이북, 가이드는 [cursor/plugins](https://github.com/cursor/plugins)의 pstack(Lauren Tan, MIT)을 고정된 커밋 그대로 복사한 것이며, 원본 라이선스는 `upstream/LICENSE`에 있습니다. 이 저장소가 더한 것은 `harness/`, `scripts/`, 진입 스킬 `skills/pstack/SKILL.md`, 그리고 각 스킬에 넣은 Mixdog 어댑터 안내 한 줄입니다. 이 추가분은 최상위 `LICENSE`(MIT)를 따릅니다. 이 저장소는 Cursor나 pstack 원저자의 공식 배포물이 아닙니다.
