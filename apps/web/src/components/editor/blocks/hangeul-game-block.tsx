"use client";

import { useSyncExternalStore } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { Gamepad2Icon, SmartphoneIcon } from "lucide-react";
import {
  getHangeulGameStage,
  HANGEUL_GAME_KEYS,
  HANGEUL_GAME_STAGES,
  HANGEUL_GAME_TITLES,
  hangeulGameDeepLink,
  type HangeulGameKey,
} from "@hakgyo/shared/hangeul";

import { StoreBadges } from "~/components/store-badges";
import { buttonVariants } from "~/components/ui/button";
import {
  hangeulGameBlockDefaults,
  hangeulGameBlockType,
} from "~/lib/blocknote/block-catalog";
import { detectHandoffPlatform, type HandoffPlatform } from "~/lib/mobile-app";
import { cn } from "~/lib/utils";

import { HangeulEditorBar, HangeulText } from "./hangeul-block-parts";

/** What each game asks the learner to do, in the guide's plain Indonesian. */
const gameSummaries = {
  "stroke-master": "Kenali vokal dan konsonan Hangeul.",
  "syllable-forge": "Ketik huruf dan susun menjadi blok suku kata Hangeul.",
  "word-builder": "Susun kata Korea dari blok suku kata Hangeul.",
} as const satisfies Record<(typeof HANGEUL_GAME_KEYS)[number], string>;

const subscribeToNothing = () => () => undefined;

/**
 * The way into the game: on a phone a deep link into the app (it does nothing
 * on a computer), on a computer a hint to continue on the phone. The platform
 * is read after hydration (the server snapshot is null and renders the
 * computer variant), as in `AppHandoff`.
 */
function HangeulGameAppLinks({
  gameKey,
  stageId,
}: {
  gameKey: HangeulGameKey;
  stageId: string | undefined;
}) {
  const platform = useSyncExternalStore<HandoffPlatform | null>(
    subscribeToNothing,
    () => detectHandoffPlatform(navigator.userAgent, navigator.maxTouchPoints),
    () => null,
  );
  const onPhone = platform === "ios" || platform === "android";

  return (
    <>
      <div className="text-foreground text-sm leading-relaxed">
        {onPhone
          ? "Permainan ini ada di aplikasi Hakgyo. Buka di aplikasi untuk bermain, lalu kembali ke materi ini setelah selesai."
          : "Permainan ini ada di aplikasi Hakgyo. Buka materi ini di aplikasi Hakgyo di HP kamu untuk bermain."}
      </div>

      {onPhone ? (
        <a
          className={cn(
            buttonVariants({ size: "lg" }),
            // BlockNote's unlayered `.bn-editor a` styles beat utilities.
            "text-primary-foreground! h-11 w-full px-4 no-underline! sm:w-auto",
          )}
          href={hangeulGameDeepLink({ gameKey, stage: stageId })}
        >
          <SmartphoneIcon data-icon="inline-start" />
          Buka di aplikasi
        </a>
      ) : null}

      <div className="space-y-1">
        <div className="text-muted-foreground text-xs">
          {onPhone ? "Belum punya aplikasinya?" : "Pasang aplikasinya di HP:"}
        </div>
        <StoreBadges className="max-w-xs" />
      </div>
    </>
  );
}

export const hangeulGameBlock = createReactBlockSpec(
  {
    type: hangeulGameBlockType,
    propSchema: {
      gameKey: {
        default: hangeulGameBlockDefaults.gameKey,
        values: [...HANGEUL_GAME_KEYS],
      },
      stage: { default: hangeulGameBlockDefaults.stage },
      title: { default: hangeulGameBlockDefaults.title },
      description: { default: hangeulGameBlockDefaults.description },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const { gameKey } = block.props;
      const stage = getHangeulGameStage(block.props.stage);
      const gameTitle = HANGEUL_GAME_TITLES[gameKey];

      return (
        <article
          className="text-foreground my-4 w-full min-w-0 bg-transparent"
          contentEditable={false}
          data-custom-block
        >
          {editable ? (
            <HangeulEditorBar
              block={block}
              icon={Gamepad2Icon}
              label="Permainan Hangeul"
              onClear={() =>
                editor.updateBlock(block, { props: hangeulGameBlockDefaults })
              }
            />
          ) : null}

          {editable ? (
            <div className="border-border grid min-w-0 gap-3 border-b px-1 py-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:px-6">
              <div className="grid min-w-0 gap-1">
                <span className="text-muted-foreground text-xs font-medium">
                  Permainan
                </span>
                <div className="border-border flex min-w-0 flex-wrap gap-1 rounded-md border p-0.5">
                  {HANGEUL_GAME_KEYS.map((key) => (
                    <button
                      aria-pressed={key === gameKey}
                      className={cn(
                        "flex-1 rounded px-2 py-1.5 text-xs font-medium whitespace-nowrap transition",
                        key === gameKey
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      key={key}
                      onClick={() =>
                        editor.updateBlock(block, { props: { gameKey: key } })
                      }
                      type="button"
                    >
                      {HANGEUL_GAME_TITLES[key]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="grid min-w-0 gap-1">
                <span className="text-muted-foreground text-xs font-medium">
                  Tahap
                </span>
                <select
                  className="border-input bg-background focus:border-ring focus:ring-ring/30 h-9 min-w-0 rounded-md border px-2 text-sm outline-none focus:ring-2"
                  onChange={(event) =>
                    editor.updateBlock(block, {
                      props: { stage: event.target.value },
                    })
                  }
                  value={stage?.id ?? ""}
                >
                  <option value="">Semua huruf</option>
                  {HANGEUL_GAME_STAGES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="sm:bg-card sm:ring-foreground/10 flex min-w-0 flex-col gap-4 px-1 py-4 sm:my-4 sm:flex-row sm:rounded-xl sm:p-6 sm:ring-1">
            <span className="bg-primary text-primary-foreground grid size-12 shrink-0 place-items-center rounded-2xl">
              <Gamepad2Icon className="size-6" />
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                  Permainan · {gameTitle}
                </div>
                {editable ? (
                  <HangeulText
                    ariaLabel="Judul permainan"
                    className="text-foreground w-full text-xl leading-tight font-semibold tracking-tight"
                    editable
                    onChange={(title) =>
                      editor.updateBlock(block, { props: { title } })
                    }
                    placeholder={gameTitle}
                    value={block.props.title}
                  />
                ) : (
                  <div className="text-foreground text-xl leading-tight font-semibold tracking-tight">
                    {block.props.title.trim() || gameTitle}
                  </div>
                )}
                <HangeulText
                  ariaLabel="Deskripsi permainan"
                  className="text-muted-foreground w-full text-sm leading-relaxed"
                  editable={editable}
                  onChange={(description) =>
                    editor.updateBlock(block, { props: { description } })
                  }
                  placeholder={gameSummaries[gameKey]}
                  value={block.props.description}
                />
                {!editable && !block.props.description.trim() ? (
                  <div className="text-muted-foreground text-sm leading-relaxed">
                    {gameSummaries[gameKey]}
                  </div>
                ) : null}
              </div>

              <div className="bg-primary/10 text-primary inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                {stage ? `Tahap: ${stage.title}` : "Semua huruf"}
              </div>

              <HangeulGameAppLinks gameKey={gameKey} stageId={stage?.id} />
            </div>
          </div>
        </article>
      );
    },
  },
)();
