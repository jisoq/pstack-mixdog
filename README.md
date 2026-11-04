# pstack-mixdog

[cursor/plugins의 pstack](https://github.com/cursor/plugins/tree/main/pstack)을 Mixdog에서 쓰게 해 주는 플러그인입니다. 업스트림 원문에서 Cursor 전용 부분만 Mixdog 도구에 맞게 고쳐 쓴 사본을 실행하고, 업스트림의 새 변경은 이 사본에 병합해 받습니다.

## 설치

Mixdog 대화창에서 한 번만 요청하면 됩니다.

> `jisoq/pstack-mixdog`을 플러그인으로 등록하고, 설치된 플러그인 폴더의 `harness/INSTALL.md`를 읽고 그대로 따라줘

필요한 프로그램(git, GitHub CLI, Node, Bun, bash, jq, mise) 중 없는 것은 어디에 쓰는지 설명하고 설치할지 묻습니다. 이어서 Poteto mode 워크플로우와 pstack 전용 에이전트 다섯 개를 만듭니다. 에이전트는 꺼진 상태로 만들어지니, 설치 뒤 아래 [모델](#모델)대로 모델을 고르고 켜 주세요. 건너뛴 프로그램은 같은 요청을 다시 하면 설치할 수 있습니다.

업데이트는 "pstack 플러그인 업데이트해줘"라고 요청하면 됩니다. 따로 할 일 없이 다음 작업부터 새 버전이 적용됩니다. 에이전트나 설치 절차가 바뀐 업데이트라면 다음 Poteto mode 대화가 알아서 맞춥니다. Poteto mode 없이 `$pstack-<이름>` 스킬만 쓴다면, 에이전트가 바뀐 업데이트 뒤 "설치된 플러그인 폴더의 `harness/INSTALL.md`를 다시 따라줘"라고 요청해 주세요.

pstack이 맡은 작업은 첫 메시지의 첫 줄이 `pstack activated`입니다. pstack의 규칙 파일을 끝까지 읽었다는 표시이니, 이 줄이 없으면 그 작업은 규칙을 읽지 않고 진행된 것입니다.

## 사용법

| 하고 싶은 일 | 방법 |
| --- | --- |
| 대화 전체를 pstack으로 처리 | 워크플로우 선택기에서 **Poteto mode** 선택 |
| 특정 스킬 실행 | Poteto mode 대화에서 `/how <질문>`, `/arena <과제>`처럼 입력 |
| 아무 대화에서 바로 실행 | `$pstack-<이름> <작업>` |

pstack은 대화 전체를 Poteto mode로 시작하거나, 아무 대화에서 `$pstack-<이름>` 스킬로 시작합니다. `$pstack-<이름>`으로 바로 실행할 수 있는 스킬은 `automate-me`, `blast-radius`, `bro`, `correct`, `create-formal-verification-skill`, `create-verification-skill`, `in-your-own-words`, `ketchup-video`, `maintain-formal-verification-skill`, `maintain-verification-skill`, `poteto-help`, `recall`, `sharpen`, `statechart`, `teach`, `typescript-best-practices`, `unslop` 17개입니다. 나머지 스킬은 Poteto mode 대화에서 `/<이름>`으로 입력합니다.

pstack은 Poteto mode 대화와 `$pstack-<이름>`을 고른 작업에만 개입합니다. 전역 워크플로우와 다른 에이전트 설정은 바꾸지 않습니다.

## 모델

설치하면 에이전트 다섯 개가 꺼진 상태로, 모델 없이 만들어집니다. Mixdog의 에이전트 설정에서 에이전트마다 모델을 고르고 켜야 pstack이 쓸 수 있습니다. 나중에 모델을 바꿀 때도 같은 곳에서, 아래 표의 역할을 맡은 에이전트의 모델을 바꿉니다.

저는 ChatGPT Pro(월 $200)와 Claude Max를 구독해 Mixdog에 `openai-oauth`와 `anthropic-oauth`로 로그인해 두고, 아래처럼 씁니다.

| 에이전트 | 맡는 역할 | 모델 |
| --- | --- | --- |
| `pstack-hard` | 가장 어려운 위임 (설계 전반, 동시성, 미묘한 알고리즘) | Claude Opus 5.5, effort max |
| `pstack-judge` | 판단, 글, how 설명, why 종합, reflect 판단 | GPT-6 Astra, effort xhigh, fast |
| `pstack-code` | feature, refactoring, bug-fix, perf, hillclimb의 코드 위임, 패널 첫째 자리 | Claude Opus 5.5, effort Auto |
| `pstack-scout` | how 탐색, why 조사, reflect 도구 검토 | GPT-6.1 Terra, effort medium, fast |
| `pstack-verify` | swarm 워커와 검증, 패널 둘째 자리 | GPT-6.1 Sol, effort Auto, fast |

패널(arena, architect, interrogate)은 `pstack-code`와 `pstack-verify`를 하나씩 띄워 교차 검증하므로, 둘은 서로 다른 계열 모델(GPT와 Claude 등)로 두는 것이 좋습니다.

## 알려진 제약

- 필요한 프로그램이 없으면 그 단계만 건너뜁니다. Bun은 PR 감시(`watch-pr`), bash는 worktree 정리와 결정 기록, jq는 worktree 정리, Node와 mise는 statechart에 씁니다.
- Cursor Automations, Bugbot 설정, Cursor 클라우드 에이전트가 필요한 단계도 건너뜁니다. 클라우드 워커는 이 PC의 worktree로 대신합니다.
- 업스트림 스킬에 적힌 모델과 effort 조절은 쓰지 않고, 각 에이전트의 Mixdog 모델 설정을 따릅니다.
- 커밋, 푸시, PR, 머지 직전에는 한 번 묻습니다. 요청에 이미 그 단계가 있으면 묻지 않습니다.
- statechart 작업을 Mixdog에서 취소하면 임시 폴더(`--out` 옆의 `.<out>.statechart-*`, `TEMP`의 `statechart-*`)가 남습니다.

## 끄기와 제거

- 잠시 끄기: Mixdog 확장 화면에서 pstack 플러그인을 비활성화합니다.
- 제거: 플러그인을 제거하고 Poteto mode 워크플로우를 삭제합니다.

## 관리

업스트림 동기화, 빌드, 저장소 구조는 [MAINTAINING.md](MAINTAINING.md)에 있습니다.

## 출처와 라이선스

`upstream/` 아래는 [cursor/plugins](https://github.com/cursor/plugins)의 pstack(Lauren Tan, MIT)을 고정된 커밋에서 가져와 Mixdog용으로 고친 것이며, 원본 라이선스는 `upstream/LICENSE`에 있습니다. 이 저장소가 더한 부분은 최상위 `LICENSE`(MIT)를 따릅니다. 이 저장소는 Cursor나 pstack 원저자의 공식 배포물이 아닙니다.
