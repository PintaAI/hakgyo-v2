"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
  BookOpenIcon,
  LightbulbIcon,
  PaletteIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import {
  grammarBlockDefaults,
  grammarBlockExamples,
  grammarBlockRuleRows,
  grammarBlockThemes,
  grammarBlockType,
} from "~/lib/blocknote/block-catalog";

import { EditableBlockText } from "./editable-block-text";

type RuleRow = {
  condition: string;
  form: string;
  example: string;
};

type GrammarExample = {
  before: string;
  emphasis: string;
  after: string;
};

const grammarThemeStyles = {
  amber: { label: "Amber", accent: "#d97706" },
  blue: { label: "Blue", accent: "#2563eb" },
  green: { label: "Green", accent: "#16803c" },
  rose: { label: "Rose", accent: "#d14b70" },
} as const;

const grammarBlockProps = {
  theme: { default: "amber", values: [...grammarBlockThemes] },
  showTip: { default: true },
  number: { default: grammarBlockDefaults.number },
  eyebrow: { default: grammarBlockDefaults.eyebrow },
  title: { default: grammarBlockDefaults.title },
  descriptionKo: { default: grammarBlockDefaults.descriptionKo },
  descriptionTranslation: {
    default: grammarBlockDefaults.descriptionTranslation,
  },
  ruleColumnOne: { default: grammarBlockDefaults.ruleColumnOne },
  ruleColumnTwo: { default: grammarBlockDefaults.ruleColumnTwo },
  ruleColumnThree: { default: grammarBlockDefaults.ruleColumnThree },
  ruleRows: { default: grammarBlockDefaults.ruleRows },
  examplesLabel: { default: grammarBlockDefaults.examplesLabel },
  examples: { default: grammarBlockDefaults.examples },
  tipTitle: { default: grammarBlockDefaults.tipTitle },
  tipKo: { default: grammarBlockDefaults.tipKo },
  tipTranslation: { default: grammarBlockDefaults.tipTranslation },
};

function defaultRuleRows(): RuleRow[] {
  return grammarBlockRuleRows.map((row) => ({ ...row }));
}

function defaultExamples(): GrammarExample[] {
  return grammarBlockExamples.map((example) => ({ ...example }));
}

function parseRuleRows(value: string): RuleRow[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultRuleRows();
    return parsed
      .filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null,
      )
      .map((row) => ({
        condition: typeof row.condition === "string" ? row.condition : "",
        form: typeof row.form === "string" ? row.form : "",
        example: typeof row.example === "string" ? row.example : "",
      }))
      .slice(0, 12);
  } catch {
    return defaultRuleRows();
  }
}

function parseExamples(value: string): GrammarExample[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultExamples();
    return parsed
      .filter(
        (example): example is Record<string, unknown> =>
          typeof example === "object" && example !== null,
      )
      .map((example) => ({
        before: typeof example.before === "string" ? example.before : "",
        emphasis: typeof example.emphasis === "string" ? example.emphasis : "",
        after: typeof example.after === "string" ? example.after : "",
      }))
      .slice(0, 12);
  } catch {
    return defaultExamples();
  }
}

function RuleCell({
  editable,
  label,
  onChange,
  value,
}: {
  editable: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="border-border min-w-0 border-t px-3 py-2.5 first:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0">
      <p className="text-muted-foreground mb-1 text-[0.65rem] font-semibold tracking-wide uppercase sm:hidden">
        {label}
      </p>
      <EditableBlockText
        ariaLabel={label}
        className="text-foreground w-full text-sm leading-relaxed"
        editable={editable}
        onChange={onChange}
        value={value}
      />
    </div>
  );
}

export const grammarBlock = createReactBlockSpec(
  {
    type: grammarBlockType,
    propSchema: grammarBlockProps,
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const scheme = grammarThemeStyles[block.props.theme];
      const ruleRows = parseRuleRows(block.props.ruleRows);
      const examples = parseExamples(block.props.examples);

      const updateRuleRows = (rows: RuleRow[]) =>
        editor.updateBlock(block, {
          props: { ruleRows: JSON.stringify(rows) },
        });
      const updateExamples = (nextExamples: GrammarExample[]) =>
        editor.updateBlock(block, {
          props: { examples: JSON.stringify(nextExamples) },
        });

      return (
        <article
          className="bg-card text-card-foreground ring-foreground/10 my-4 w-full min-w-0 overflow-hidden rounded-xl ring-1"
          contentEditable={false}
        >
          {editable ? (
            <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <PaletteIcon className="size-3.5" /> Grammar block
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {grammarBlockThemes.map((theme) => {
                    const option = grammarThemeStyles[theme];
                    const selected = block.props.theme === theme;
                    return (
                      <button
                        aria-label={`Gunakan palet ${option.label}`}
                        aria-pressed={selected}
                        className={`ring-foreground/10 focus-visible:ring-ring grid size-7 place-items-center rounded-md ring-1 transition focus-visible:ring-2 focus-visible:outline-none ${selected ? "bg-background shadow-xs" : "hover:bg-background/70"}`}
                        key={theme}
                        onClick={() =>
                          editor.updateBlock(block, { props: { theme } })
                        }
                        title={option.label}
                        type="button"
                      >
                        <span
                          className="size-3.5 rounded-full"
                          style={{ backgroundColor: option.accent }}
                        />
                      </button>
                    );
                  })}
                </div>
                <button
                  aria-pressed={block.props.showTip}
                  className="border-border hover:bg-background text-muted-foreground hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition"
                  onClick={() =>
                    editor.updateBlock(block, {
                      props: { showTip: !block.props.showTip },
                    })
                  }
                  type="button"
                >
                  <LightbulbIcon className="size-3.5" />
                  {block.props.showTip ? "Sembunyikan tip" : "Tampilkan tip"}
                </button>
              </div>
            </div>
          ) : null}

          <header className="border-border relative min-w-0 border-b p-4 sm:p-6">
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 left-0 h-1"
              style={{ backgroundColor: scheme.accent }}
            />
            <div className="flex min-w-0 items-start gap-4">
              <span
                className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: scheme.accent }}
              >
                <BookOpenIcon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <EditableBlockText
                    ariaLabel="Label grammar"
                    className="text-muted-foreground min-w-32 flex-1 text-xs font-semibold tracking-[0.14em] uppercase"
                    editable={editable}
                    onChange={(eyebrow) =>
                      editor.updateBlock(block, { props: { eyebrow } })
                    }
                    value={block.props.eyebrow}
                  />
                  <EditableBlockText
                    ariaLabel="Nomor grammar"
                    className="w-12 text-right text-2xl leading-none font-medium tabular-nums"
                    editable={editable}
                    onChange={(number) =>
                      editor.updateBlock(block, { props: { number } })
                    }
                    value={block.props.number}
                  />
                </div>
                <EditableBlockText
                  ariaLabel="Judul grammar"
                  className="text-foreground mt-3 w-full text-2xl leading-tight font-medium tracking-tight sm:text-3xl"
                  editable={editable}
                  onChange={(title) =>
                    editor.updateBlock(block, { props: { title } })
                  }
                  value={block.props.title}
                />
              </div>
            </div>
          </header>

          <div
            className={`grid min-w-0 gap-6 p-4 sm:p-6 ${block.props.showTip ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}
          >
            <div className="min-w-0 space-y-6">
              <section className="min-w-0 space-y-2">
                <EditableBlockText
                  ariaLabel="Penjelasan grammar bahasa Korea"
                  className="text-foreground w-full text-sm leading-relaxed"
                  editable={editable}
                  onChange={(descriptionKo) =>
                    editor.updateBlock(block, { props: { descriptionKo } })
                  }
                  value={block.props.descriptionKo}
                />
                <EditableBlockText
                  ariaLabel="Terjemahan penjelasan grammar"
                  className="w-full text-sm leading-relaxed"
                  editable={editable}
                  onChange={(descriptionTranslation) =>
                    editor.updateBlock(block, {
                      props: { descriptionTranslation },
                    })
                  }
                  value={block.props.descriptionTranslation}
                />
              </section>

              <section className="ring-foreground/10 min-w-0 overflow-hidden rounded-lg ring-1">
                <div
                  className={`bg-muted/50 border-border hidden border-b sm:grid ${editable ? "grid-cols-[minmax(0,1fr)_minmax(0,.75fr)_minmax(0,1.2fr)_2.5rem]" : "grid-cols-[minmax(0,1fr)_minmax(0,.75fr)_minmax(0,1.2fr)]"}`}
                >
                  <EditableBlockText
                    ariaLabel="Judul kolom aturan pertama"
                    className="w-full px-3 py-2 text-xs font-semibold tracking-wide uppercase"
                    editable={editable}
                    onChange={(ruleColumnOne) =>
                      editor.updateBlock(block, { props: { ruleColumnOne } })
                    }
                    value={block.props.ruleColumnOne}
                  />
                  <EditableBlockText
                    ariaLabel="Judul kolom aturan kedua"
                    className="border-border w-full border-l px-3 py-2 text-xs font-semibold tracking-wide uppercase"
                    editable={editable}
                    onChange={(ruleColumnTwo) =>
                      editor.updateBlock(block, { props: { ruleColumnTwo } })
                    }
                    value={block.props.ruleColumnTwo}
                  />
                  <EditableBlockText
                    ariaLabel="Judul kolom aturan ketiga"
                    className="border-border w-full border-l px-3 py-2 text-xs font-semibold tracking-wide uppercase"
                    editable={editable}
                    onChange={(ruleColumnThree) =>
                      editor.updateBlock(block, { props: { ruleColumnThree } })
                    }
                    value={block.props.ruleColumnThree}
                  />
                  {editable ? (
                    <span className="border-border border-l" />
                  ) : null}
                </div>

                <div className="divide-border divide-y">
                  {ruleRows.map((row, index) => (
                    <div
                      className={`grid min-w-0 ${editable ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,.75fr)_minmax(0,1.2fr)_2.5rem]" : "sm:grid-cols-[minmax(0,1fr)_minmax(0,.75fr)_minmax(0,1.2fr)]"}`}
                      key={index}
                    >
                      <RuleCell
                        editable={editable}
                        label={block.props.ruleColumnOne}
                        onChange={(condition) => {
                          const next = [...ruleRows];
                          next[index] = { ...row, condition };
                          updateRuleRows(next);
                        }}
                        value={row.condition}
                      />
                      <RuleCell
                        editable={editable}
                        label={block.props.ruleColumnTwo}
                        onChange={(form) => {
                          const next = [...ruleRows];
                          next[index] = { ...row, form };
                          updateRuleRows(next);
                        }}
                        value={row.form}
                      />
                      <RuleCell
                        editable={editable}
                        label={block.props.ruleColumnThree}
                        onChange={(example) => {
                          const next = [...ruleRows];
                          next[index] = { ...row, example };
                          updateRuleRows(next);
                        }}
                        value={row.example}
                      />
                      {editable ? (
                        <div className="border-border flex items-center justify-end border-t px-2 py-2 sm:justify-center sm:border-t-0 sm:border-l">
                          <button
                            aria-label={`Hapus aturan ${index + 1}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md transition disabled:opacity-30"
                            disabled={ruleRows.length === 1}
                            onClick={() =>
                              updateRuleRows(
                                ruleRows.filter(
                                  (_, rowIndex) => rowIndex !== index,
                                ),
                              )
                            }
                            type="button"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                {editable ? (
                  <button
                    className="border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center justify-center gap-1.5 border-t px-3 py-2 text-xs font-medium transition disabled:opacity-40"
                    disabled={ruleRows.length >= 12}
                    onClick={() =>
                      updateRuleRows([
                        ...ruleRows,
                        { condition: "", form: "", example: "" },
                      ])
                    }
                    type="button"
                  >
                    <PlusIcon className="size-3.5" /> Tambah aturan
                  </button>
                ) : null}
              </section>

              <section className="min-w-0">
                <EditableBlockText
                  ariaLabel="Label contoh grammar"
                  className="text-muted-foreground mb-3 w-full text-xs font-semibold tracking-[0.14em] uppercase"
                  editable={editable}
                  onChange={(examplesLabel) =>
                    editor.updateBlock(block, { props: { examplesLabel } })
                  }
                  value={block.props.examplesLabel}
                />
                <div className="ring-foreground/10 divide-border min-w-0 divide-y overflow-hidden rounded-lg ring-1">
                  {examples.map((example, index) => (
                    <div
                      className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-2 px-3 py-3"
                      key={index}
                    >
                      <span
                        className="pt-1 text-xs font-semibold tabular-nums"
                        style={{ color: scheme.accent }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {editable ? (
                        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,.7fr)_minmax(3rem,.35fr)]">
                          <EditableBlockText
                            ariaLabel={`Awal contoh ${index + 1}`}
                            className="text-foreground w-full text-sm leading-relaxed"
                            editable
                            onChange={(before) => {
                              const next = [...examples];
                              next[index] = { ...example, before };
                              updateExamples(next);
                            }}
                            placeholder="Teks sebelum"
                            value={example.before}
                          />
                          <EditableBlockText
                            ariaLabel={`Bagian penting contoh ${index + 1}`}
                            className="w-full text-sm leading-relaxed font-semibold"
                            editable
                            onChange={(emphasis) => {
                              const next = [...examples];
                              next[index] = { ...example, emphasis };
                              updateExamples(next);
                            }}
                            placeholder="Bagian penting"
                            value={example.emphasis}
                          />
                          <EditableBlockText
                            ariaLabel={`Akhir contoh ${index + 1}`}
                            className="text-foreground w-full text-sm leading-relaxed"
                            editable
                            onChange={(after) => {
                              const next = [...examples];
                              next[index] = { ...example, after };
                              updateExamples(next);
                            }}
                            placeholder="Akhir"
                            value={example.after}
                          />
                        </div>
                      ) : (
                        <p className="text-foreground min-w-0 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                          {example.before}
                          <strong style={{ color: scheme.accent }}>
                            {example.emphasis}
                          </strong>
                          {example.after}
                        </p>
                      )}
                      {editable ? (
                        <button
                          aria-label={`Hapus contoh ${index + 1}`}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md transition disabled:opacity-30"
                          disabled={examples.length === 1}
                          onClick={() =>
                            updateExamples(
                              examples.filter(
                                (_, exampleIndex) => exampleIndex !== index,
                              ),
                            )
                          }
                          type="button"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {editable ? (
                    <button
                      className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition disabled:opacity-40"
                      disabled={examples.length >= 12}
                      onClick={() =>
                        updateExamples([
                          ...examples,
                          { before: "", emphasis: "", after: "" },
                        ])
                      }
                      type="button"
                    >
                      <PlusIcon className="size-3.5" /> Tambah contoh
                    </button>
                  ) : null}
                </div>
              </section>
            </div>

            {block.props.showTip ? (
              <aside className="bg-muted/40 ring-foreground/10 h-fit min-w-0 rounded-xl p-4 ring-1 lg:sticky lg:top-4">
                <div className="mb-4 flex min-w-0 items-start gap-3">
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: scheme.accent }}
                  >
                    <LightbulbIcon className="size-4" />
                  </span>
                  <EditableBlockText
                    ariaLabel="Judul tip grammar"
                    className="text-foreground w-full text-sm font-semibold tracking-wide"
                    editable={editable}
                    onChange={(tipTitle) =>
                      editor.updateBlock(block, { props: { tipTitle } })
                    }
                    value={block.props.tipTitle}
                  />
                </div>
                <div className="space-y-3">
                  <EditableBlockText
                    ariaLabel="Tip grammar bahasa Korea"
                    className="text-foreground w-full text-sm leading-relaxed"
                    editable={editable}
                    onChange={(tipKo) =>
                      editor.updateBlock(block, { props: { tipKo } })
                    }
                    value={block.props.tipKo}
                  />
                  <EditableBlockText
                    ariaLabel="Terjemahan tip grammar"
                    className="text-muted-foreground w-full text-sm leading-relaxed"
                    editable={editable}
                    onChange={(tipTranslation) =>
                      editor.updateBlock(block, { props: { tipTranslation } })
                    }
                    value={block.props.tipTranslation}
                  />
                </div>
              </aside>
            ) : null}
          </div>
        </article>
      );
    },
  },
)();
