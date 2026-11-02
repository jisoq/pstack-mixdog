# pstack-mixdog 관리

이 저장소를 고치는 사람을 위한 문서입니다. 설치와 사용법은 [README.md](README.md)에 있습니다.

## 동작 방식

업스트림 원문(스킬, 플레이북, 원칙)은 고정된 커밋에서 복사하고, Cursor 전용 이름은 Mixdog 어댑터 한 장(`harness/adapter.md`)으로 옮깁니다. 복사본이 원문과 다른 곳은 세 가지입니다. Cursor 이름을 쓰는 스킬의 제목 아래에 어댑터 안내 한 줄이 들어가고, 복사하지 않은 업스트림 파일을 가리키는 링크는 고정된 커밋의 GitHub 주소로 바뀌고, `harness/patches/`의 패치가 적용됩니다. 지금 패치는 `statechart-windows.patch` 하나로, statechart 스크립트가 bash나 WSL 없이 Windows에서 돌게 합니다. 업스트림이 Claude Code를 지원할 때 쓰는 방식(`docs/harness/claude-code.md`와 생성 스크립트)과 같은 구조입니다.

이 저장소의 최상위 폴더가 그대로 Mixdog 플러그인입니다. Mixdog은 최상위 `plugin.json`과 `skills/` 아래만 읽으므로, 같은 저장소에 있는 관리 도구(`scripts/`, `harness/`)는 동작에 끼어들지 않습니다. Mixdog 플러그인에는 스킬만 담을 수 있어서, Poteto mode 워크플로우와 에이전트 다섯 개는 설치할 때 `harness/INSTALL.md`가 만들고, 이후에는 pstack이 대화마다 처음 실행될 때 어댑터의 Agent sync가 새 버전에 맞춥니다.

## 복사 범위

복사하는 것은 업스트림 `pstack/`의 `skills/`, `agents/`, `docs/guide/`와 `README.md`, `LICENSE`, `plugin.json`뿐이고, `skills/` 중 `harness/excluded-skills.json`에 적은 스킬(지금은 `make-bot-ui`)은 빠집니다. Cursor 플러그인 패키징(`.cursor-plugin/`), 로고(`assets/`), Claude Code 어댑터(`docs/harness/claude-code.md`), 자동화 묶음(`automations/`) 같은 나머지는 빠지고, 복사한 문서에서 이 파일들을 가리키는 링크는 고정된 커밋의 GitHub 주소로 바뀝니다.

이 저장소가 더한 것은 `harness/`, `scripts/`, 바로 호출용 스킬 `skills/pstack-<이름>/SKILL.md`, `harness/adapter.md`를 옮겨 둔 `upstream/docs/harness/mixdog.md`, `harness/ENTRY.md`로 만든 진입 파일 `upstream/docs/harness/mixdog-entry.md`, Cursor 이름을 쓰는 스킬의 제목 아래에 넣은 Mixdog 어댑터 안내 한 줄, 그리고 `harness/patches/`의 패치가 바꾼 줄입니다.

## 구조

| 경로 | 역할 | 수정 |
| --- | --- | --- |
| `harness/adapter.md` | Cursor 이름을 Mixdog 도구로 옮기는 매핑과 우선순위 규칙 | 직접 수정 |
| `harness/ENTRY.md` | 진입 파일 `upstream/docs/harness/mixdog-entry.md`의 템플릿. Poteto mode 워크플로우와 `pstack-<이름>` 스킬이 모두 이 파일을 읽음 | 직접 수정 |
| `harness/direct-skills.json` | `$pstack-<이름>`으로 바로 고를 수 있는 업스트림 스킬과 그 한 줄 설명(100자 이내) | 직접 수정 |
| `harness/excluded-skills.json` | 플러그인에 넣지 않을 업스트림 스킬 이름. 빌드는 이 스킬을 복사하지 않고 진입 파일의 스킬 목록에서도 빼며, 다른 문서의 링크는 고정된 커밋의 GitHub 주소로 바꿉니다 | 직접 수정 |
| `harness/DIRECT-SKILL.md` | `skills/pstack-<이름>/SKILL.md` 템플릿. 진입 파일을 그 이름으로 따르라고만 적음 | 직접 수정 |
| `harness/WORKFLOW.md` | Poteto mode 워크플로우 원본. `{{PLUGIN_ROOT}}`는 만들 때 플러그인 폴더로 바꿈 | 직접 수정 |
| `harness/INSTALL.md` | 설치를 맡은 에이전트가 따르는 절차. 프로그램 확인, 워크플로우와 에이전트 생성 | 직접 수정 |
| `harness/agents.md` | pstack 전용 에이전트 다섯 개의 정의와 추천 모델 | 직접 수정 |
| `harness/patches/*.patch` | 빌드가 복사한 업스트림 파일에 적용하는 `git diff`. 경로는 cursor/plugins 루트 기준(`pstack/...`) | 업스트림 캐시에서 다시 만듦 (동기화 절차 3) |
| `scripts/sync.mjs` | 업스트림을 받아 커밋을 고정하고 변경점을 보여준 뒤 빌드 | 실행 |
| `scripts/build.mjs` | 고정된 업스트림과 `harness/`로 플러그인 생성물을 만들고 검사 | 실행 |
| `upstream.lock.json` | 통합 중인 업스트림 커밋 | sync가 기록 |
| `plugin.json`, `skills/`, `upstream/` | Mixdog이 읽는 플러그인 생성물. 빌드는 이 세 경로만 쓰고 지움 | 생성물, 직접 수정 금지 |
| `.cache/cursor-plugins/` | 업스트림 클론 캐시 (커밋하지 않음) | 생성물 |

## 업스트림 동기화 절차

pstack은 업스트림에서 계속 바뀌므로 관리자는 이 저장소를 클론한 폴더에서 아래 순서를 그대로 따릅니다. Node 22와 git이 필요합니다.

1. `node scripts/sync.mjs`를 실행합니다(특정 브랜치나 태그는 `--ref <ref>`). 업스트림을 받아 이전 커밋과의 변경 로그와 diff 통계를 출력한 뒤, 새 커밋을 `upstream.lock.json`에 고정하고 빌드합니다.
2. `REVIEW` 표시가 나오면 업스트림의 Claude Code 어댑터나 생성 스크립트가 바뀐 것입니다. 이때 sync는 `upstream.lock.json`을 그대로 두고 빌드하지 않은 채 종료 코드 2로 멈추며, 다시 실행해도 확인하기 전까지 매번 멈춥니다. 출력된 diff를 읽고 같은 변경이 `harness/adapter.md`(필요하면 `harness/ENTRY.md`)에도 필요한지 판단해 반영한 뒤 `node scripts/sync.mjs --reviewed`를 실행합니다(`--ref`를 썼다면 같은 값을 함께). 이 실행은 업스트림을 다시 받아 그 시점의 로그와 diff를 출력하고, 그 커밋을 고정한 뒤 빌드합니다. 그사이 업스트림이 또 바뀌었다면 검토하지 않은 변경까지 함께 승인되므로, 출력된 커밋이 검토한 커밋과 같은지 확인합니다.
3. 빌드가 `FAIL`로 끝나면 메시지대로 고칩니다. 가장 흔한 경우는 "adapter에 `<용어>` 행이 없음"입니다. 업스트림이 새 Cursor 전용 이름을 쓰기 시작했다는 뜻이므로 `harness/adapter.md`에 그 용어의 Mixdog 대응을 추가하고 `node scripts/build.mjs`를 다시 실행합니다. "`<패치>` no longer applies"는 업스트림이 패치가 고치는 줄을 바꿨다는 뜻입니다. 빌드는 각 hunk의 원래 줄이 고정된 업스트림에 정확히 한 곳 있을 때만 적용하므로, 비슷한 자리에 대충 붙지 않고 멈춥니다. `git -C .cache/cursor-plugins apply --3way ../../harness/patches/<패치>`로 캐시에 적용해 충돌을 풀고, `git -C .cache/cursor-plugins diff HEAD --output=../../harness/patches/<패치>`로 패치를 다시 쓴 뒤, `git -C .cache/cursor-plugins reset --hard`로 캐시를 고정 커밋 상태로 되돌리고 빌드합니다. `--3way`는 패치를 index에도 올리므로 `HEAD`와 비교해야 패치 전체가 담기고, `reset --hard`라야 index까지 되돌아갑니다. 업스트림이 같은 문제를 고쳤다면 패치를 지웁니다. 빌드가 실패하면 생성물은 바뀌지 않습니다.
4. `harness/DIRECT-SKILL.md`나 `harness/direct-skills.json`을 고쳤다면 `skills/pstack-<이름>` 폴더마다 생성된 스킬을 Mixdog 스킬 검사기로 확인합니다.
   `node "$env:LOCALAPPDATA\Programs\mixdog-desktop\resources\runtime.asar.unpacked\node_modules\mixdog\src\defaults\skills\skill-creator\scripts\validate-skill.mjs" skills/pstack-<이름>`
5. `node scripts/build.mjs --check`가 "up to date"를 출력하는지, `node --test scripts/*.test.mjs`가 통과하는지 확인합니다.
6. `upstream.lock.json`, 생성물, 바뀐 `harness/`를 함께 커밋하고 푸시합니다. Windows git은 실행 권한을 기록하지 않으므로, 업스트림에서 실행 파일(`git -C .cache/cursor-plugins ls-files -s`의 `100755`)이 새로 생겼다면 `git update-index --chmod=+x upstream/<경로>`로 같은 권한을 붙여 커밋합니다. 사용자는 `update_plugin`으로 새 버전을 받습니다. 이미 열린 대화에 로드된 스킬 본문은 그대로입니다.
7. `harness/WORKFLOW.md`나 `harness/agents.md`를 고쳐도 각 PC에서 따로 할 일은 없습니다. 업데이트 뒤 첫 pstack 실행이 워크플로우와 에이전트 정의를 맞춥니다.
