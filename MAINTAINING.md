# pstack-mixdog 관리

이 저장소를 고치는 사람을 위한 문서입니다. 설치와 사용법은 [README.md](README.md)에 있습니다.

## 동작 방식

`upstream/`은 업스트림 pstack을 Mixdog에서 그대로 돌도록 고쳐 쓴 원본이고, 어댑터는 없습니다. 에이전트가 따르는 파일(`upstream/skills/`, `upstream/agents/`)은 처음부터 Mixdog 도구 이름으로 적혀 있으며, 무엇을 어떻게 고치는지는 [`harness/PORTING.md`](harness/PORTING.md)가 정합니다. 업스트림이 바뀌면 `scripts/sync.mjs`가 3-way merge로 가져옵니다. 기준(base)은 이전에 고정한 커밋, 상대(theirs)는 새 커밋, 우리 쪽(ours)은 `upstream/`의 지금 파일입니다. 업스트림이 건드리지 않은 줄의 이식 수정은 그대로 남고, 양쪽이 같은 곳을 바꾼 경우만 충돌로 남습니다.

`scripts/build.mjs`는 `upstream/`을 복사하거나 고치지 않습니다. `upstream/`, `upstream.lock.json`, `harness/`만 읽어 `plugin.json`과 `skills/pstack-<이름>/`을 만들고, 그 전에 `upstream/`을 검사합니다. 충돌 표시가 남은 줄, `upstream/skills/`와 `upstream/agents/`의 Markdown에 남은 Cursor 전용 용어(`harness/cursor-terms.json`, `scripts/` 폴더는 제외), 없는 경로를 가리키는 상대 링크, 스킬 폴더 이름과 `name`, `upstream/skills/`에 남은 제외 스킬, `direct-skills.json`의 이름과 설명을 봅니다. 하나라도 걸리면 모든 문제를 한 번에 출력하고 아무것도 쓰지 않습니다.

이 저장소의 최상위 폴더가 그대로 Mixdog 플러그인입니다. Mixdog은 최상위 `plugin.json`과 `skills/`만 스킬로 등록하고, Poteto mode 워크플로우와 `$pstack-<이름>` 스킬은 `upstream/`과 `harness/`의 파일을 경로로 읽습니다. 두 진입점 모두 작업마다 규칙 파일 `harness/WORKFLOW.md`를 끝까지 읽고 그 `## Rules`를 따릅니다. Mixdog 플러그인에는 스킬만 담을 수 있어서, 워크플로우와 에이전트 다섯 개는 `harness/INSTALL.md`가 설치할 때 만들고 필요할 때 다시 맞춥니다. 저장되는 워크플로우는 `harness/SAVED-WORKFLOW.md`의 짧은 안내로, 플러그인 폴더의 절대 경로와 설치 스탬프만 담고 작업마다 WORKFLOW.md를 읽으라고 적습니다. 플러그인 업데이트는 같은 폴더에 다시 풀리므로 저장된 경로는 그대로 유효하고, WORKFLOW.md의 변경은 워크플로우를 다시 저장하지 않아도 다음 작업부터 적용됩니다.

`plugin.json`의 `version`은 `<업스트림 버전>+mixdog.<고정 커밋 앞 7자리>.<스탬프>`입니다. 설치 스탬프는 `harness/SAVED-WORKFLOW.md`, `harness/agents.md`, `harness/INSTALL.md`를 이어 붙인 내용의 SHA-256 앞 8자리입니다. WORKFLOW.md는 작업마다 새로 읽히므로 스탬프에 들어가지 않고, 대신 ``The current setup stamp is `<스탬프>`.`` 줄로 현재 스탬프를 담습니다. 이 줄이 없거나 값이 다르면 빌드는 넣어야 할 줄을 그대로 출력하며 실패하고, 손으로 쓰는 파일은 고치지 않습니다. 저장된 워크플로우에는 저장할 때의 스탬프가 적혀 있으므로, 세 파일 중 하나가 바뀌면 다음 Poteto mode 대화의 첫 작업이 WORKFLOW.md를 따라 INSTALL.md를 다시 따릅니다.

예전 버전이 저장한 워크플로우도 새 안내로 넘어갑니다. 4e3f290 시절 워크플로우는 `plugin.json`의 `version`을 비교하는데, 스탬프가 바뀌어 버전이 달라지므로 INSTALL.md를 따릅니다. 그보다 앞선 어댑터 시절 워크플로우는 `upstream/docs/harness/mixdog-entry.md`를 거쳐 INSTALL.md를 따릅니다. 둘 다 INSTALL.md가 새 안내를 저장한 뒤 그 작업을 WORKFLOW.md대로 이어 갑니다.

## 가져오는 범위

sync가 가져오는 것은 업스트림 `pstack/`의 `skills/`, `agents/`, `docs/guide/`와 `README.md`, `LICENSE`, `plugin.json`뿐입니다. `skills/` 중 `harness/excluded-skills.json`에 적은 스킬(지금은 `make-bot-ui`, `setup-pstack`)은 빠집니다. 가져온 Markdown에서 이 범위 밖의 pstack 파일(제외한 스킬 포함)을 가리키는 상대 링크는 고정된 커밋의 GitHub 주소(`<repository>/blob|tree/<커밋>/pstack/<경로>`)로 바뀝니다. 주소에 커밋이 들어가므로 이런 링크가 있는 줄은 sync할 때마다 새 커밋으로 바뀝니다. `docs/guide/`, `README.md`, `LICENSE`, `plugin.json`은 사람이 읽는 문서라 업스트림 그대로 둡니다.

이 저장소가 더한 것은 `harness/`, `scripts/`, 생성물(`plugin.json`, `skills/`), 그리고 예전 버전이 저장한 Poteto mode 워크플로우를 새 절차로 넘기는 `upstream/docs/harness/mixdog-entry.md`입니다. 이 파일은 가져오는 범위 밖이라 sync가 건드리지 않습니다.

## 구조

| 경로 | 역할 | 수정 |
| --- | --- | --- |
| `upstream/` | Mixdog용으로 고쳐 쓴 pstack. sync가 업스트림 변경을 병합해 넣음 | `harness/PORTING.md`대로 직접 수정 |
| `harness/PORTING.md` | `upstream/`을 Mixdog용으로 고치는 규칙. 처음 이식할 때와 충돌을 풀 때 씀 | 직접 수정 |
| `harness/cursor-terms.json` | 빌드가 `upstream/skills/`와 `upstream/agents/`에서 막는 Cursor 전용 용어. `key`는 출력용 이름, `re`는 정규식 | 직접 수정 (sync의 TERMS 알림을 보고) |
| `harness/WORKFLOW.md` | pstack 규칙 파일. Poteto mode와 `$pstack-<이름>`이 작업마다 끝까지 읽음. `## Rules`가 pstack의 진입 규칙. 현재 설치 스탬프 줄, 스탬프가 다른 Poteto mode 워크플로우를 INSTALL.md로 보내는 규칙, 첫 메시지 첫 줄을 `pstack verified`로 쓰라는 끝 줄을 담음 | 직접 수정 (스탬프 줄은 빌드가 알려 준 값으로) |
| `harness/SAVED-WORKFLOW.md` | Poteto mode 워크플로우로 저장되는 안내. 작업마다 WORKFLOW.md를 읽으라고만 적음. `{{PLUGIN_ROOT}}`와 `{{SETUP_STAMP}}`는 저장할 때 플러그인 폴더와 현재 설치 스탬프로 바꿈. `pstack verified`라는 말을 넣지 않음 | 직접 수정 |
| `harness/DIRECT-SKILL.md` | `skills/pstack-<이름>/SKILL.md` 템플릿. WORKFLOW.md를 끝까지 읽고 따른 뒤 그 `## Rules`대로 그 스킬을 실행하라고만 적음. `pstack verified`라는 말을 넣지 않음 | 직접 수정 |
| `harness/direct-skills.json` | `$pstack-<이름>`으로 바로 고를 수 있는 스킬과 그 한 줄 설명(100자 이내) | 직접 수정 |
| `harness/excluded-skills.json` | 플러그인에 넣지 않을 업스트림 스킬. sync는 가져오지 않고, 빌드는 `upstream/skills/`에 남아 있으면 실패 | 직접 수정 |
| `harness/INSTALL.md` | 설치와 업데이트 뒤 동기화를 함께 맡는 절차. 없는 프로그램 확인, 워크플로우와 에이전트 생성과 갱신 | 직접 수정 |
| `harness/agents.md` | pstack 전용 에이전트 다섯 개의 정의와 추천 모델 | 직접 수정 |
| `scripts/sync.mjs` | 업스트림을 받아 `upstream/`에 병합하고 커밋을 고정한 뒤 빌드 | 실행 |
| `scripts/build.mjs` | `upstream/`을 검사하고 `plugin.json`과 `skills/`를 생성 | 실행 |
| `upstream.lock.json` | 병합한 업스트림 커밋. 다음 sync의 병합 기준 | sync가 기록 |
| `plugin.json`, `skills/` | Mixdog이 읽는 생성물. 빌드는 이 두 경로만 쓰고 지움 | 생성물, 직접 수정 금지 |
| `.cache/cursor-plugins/` | 업스트림 클론 캐시(blob:none partial clone, 커밋하지 않음). sync는 체크아웃이 아니라 git 객체에서 읽음 | 생성물 |

## 업스트림 동기화 절차

Node 22와 git이 필요합니다. 동기화는 자동으로 돌지 않으며, 관리자가 원할 때 이 저장소를 클론한 폴더에서 아래 순서를 따릅니다.

먼저 `node scripts/sync.mjs --check`로 업스트림이 고정된 커밋 이후 바뀌었는지만 확인할 수 있습니다. 바뀌었으면 새 커밋 목록과 diff 통계를 출력하고, 그대로면 "Already current"를 출력합니다. 업스트림 캐시(`.cache/cursor-plugins/`) 말고는 아무것도 바꾸지 않습니다.

1. `upstream/`에 커밋하지 않은 수정이 없게 합니다. sync는 `upstream/`의 파일을 바로 고치므로, 깨끗한 상태에서 시작해야 병합 결과를 `git diff`로 그대로 검토할 수 있습니다.
2. `node scripts/sync.mjs`를 실행합니다(특정 브랜치나 태그는 `--ref <ref>`). 업스트림을 받아 이전 커밋과의 변경 로그와 diff 통계를 출력하고, `upstream/`에 병합한 뒤, 새 커밋을 `upstream.lock.json`에 고정하고 빌드합니다. 파일마다 이렇게 처리합니다.
   - 업스트림이 바꾸지 않은 파일은 건너뜁니다.
   - 업스트림이 추가한 파일은 업스트림 것을 씁니다.
   - 업스트림이 지운 파일은 이전 업스트림과 같으면 지우고, 이 저장소에서 고쳤으면 충돌입니다.
   - 이 저장소에서 지운 파일을 업스트림이 바꿨으면 충돌입니다.
   - 나머지 텍스트 파일은 `git merge-file --diff3`로 병합하고, 겹치는 곳에는 충돌 표시를 넣습니다. 바이너리 파일은 이 저장소에서 고치지 않았을 때만 업스트림 것을 쓰고, 고쳤으면 충돌입니다.
   - 실행 권한은 업스트림을 따릅니다.

   `upstream.lock.json`이 없으면(첫 sync) 기준이 비어 있으므로 가져오는 범위 전체를 그대로 씁니다. 캐시에 이전 고정 커밋이 없으면 받아 옵니다.
3. 충돌이 있으면 sync는 빌드 출력 뒤에 경로마다 `CONFLICT <경로>: <이유>`를 출력하고 종료 코드 2로 끝납니다. 고정 커밋은 이미 새 커밋이므로 다시 실행하면 "Already current"가 나오고, 충돌 표시가 남은 동안 빌드는 계속 실패합니다. 경로마다 `harness/PORTING.md`를 기준으로 풉니다. 충돌 표시에서 `<<<<<<< ours`부터 `|||||||`까지는 이 저장소의 이식본, `||||||| base`부터 `=======`까지는 이전 업스트림, `=======`부터 `>>>>>>> theirs`까지는 새 업스트림입니다. 새 업스트림의 변경을 받아들이고, 그 줄에 PORTING.md의 규칙을 다시 적용한 뒤 표시를 지웁니다. 지우기 충돌은 업스트림이 왜 지웠는지 보고 파일을 지우거나 남깁니다. 다 풀었으면 `node scripts/build.mjs`를 실행합니다.
4. `NOTICE` 표시가 나오면 업스트림 생성 스크립트(`scripts/generate-pstack-harness-trees.mjs`)의 `TERMS`, 즉 업스트림이 관리하는 Cursor 전용 이름 목록이 바뀐 것입니다. 출력된 diff를 보고 `harness/cursor-terms.json`과 `harness/PORTING.md`에도 같은 변경이 필요한지 판단합니다. sync를 막지는 않습니다.
5. 빌드가 `FAIL`로 끝나면 메시지대로 고칩니다. `<파일>:<줄> has the Cursor-only term <용어>`는 업스트림이 그 줄에 Cursor 전용 이름을 새로 썼다는 뜻이니 PORTING.md대로 옮깁니다. `links to <경로>, which does not exist`는 링크 대상이 플러그인에 없다는 뜻입니다. 빌드가 실패하면 생성물은 바뀌지 않으니, 고친 뒤 `node scripts/build.mjs`를 다시 실행합니다.
6. `harness/DIRECT-SKILL.md`나 `harness/direct-skills.json`을 고쳤다면 `skills/pstack-<이름>` 폴더마다 생성된 스킬을 Mixdog 스킬 검사기로 확인합니다.
   `node "$env:LOCALAPPDATA\Programs\mixdog-desktop\resources\runtime.asar.unpacked\node_modules\mixdog\src\defaults\skills\skill-creator\scripts\validate-skill.mjs" skills/pstack-<이름>`
7. `node scripts/build.mjs --check`가 "up to date"를 출력하는지, `node --test scripts/*.test.mjs`가 통과하는지 확인합니다.
8. `upstream/`, `upstream.lock.json`, 생성물, 바뀐 `harness/`를 함께 커밋하고 푸시합니다. Windows git은 실행 권한을 기록하지 않습니다. sync가 "Upstream changed the executable bit" 아래에 `+x upstream/<경로>`나 `-x upstream/<경로>`를 출력했다면, 그 파일을 `git add`한 뒤 경로마다 `git update-index --chmod=+x upstream/<경로>`(`-x`면 `--chmod=-x`)를 실행하고 커밋합니다. 사용자는 `update_plugin`으로 새 버전을 받습니다. 이미 열린 대화에 로드된 스킬 본문은 그대로입니다.
9. 하네스를 고쳐도 각 PC에서 따로 할 일은 없습니다. `harness/WORKFLOW.md`만 고치면 스탬프는 그대로이고, 업데이트 뒤 다음 작업부터 적용됩니다. `harness/SAVED-WORKFLOW.md`, `harness/agents.md`, `harness/INSTALL.md`를 고치면 빌드가 새 스탬프 줄을 출력하며 실패하니, WORKFLOW.md의 스탬프 줄을 그 줄로 바꾸고 다시 빌드합니다. 업데이트 뒤 첫 Poteto mode 대화가 INSTALL.md를 따라 워크플로우와 에이전트를 맞춥니다. `$pstack-<이름>` 스킬만 쓰는 사용자는 에이전트가 바뀌었을 때 INSTALL.md를 다시 따라 달라고 요청하면 됩니다.
