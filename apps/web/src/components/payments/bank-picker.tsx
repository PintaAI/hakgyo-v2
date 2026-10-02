"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";

import { BankBadge } from "~/components/payments/bank-badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { indonesianBanks, OTHER_BANK_CODE } from "~/lib/payments/banks";
import { cn } from "~/lib/utils";

const options = [
  ...indonesianBanks.map(({ code, name }) => ({ code, name })),
  { code: OTHER_BANK_CODE, name: "Bank lainnya" },
];

/** Searchable list of Indonesian banks, with "Bank lainnya" last. */
export function BankPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter(
        ({ code, name }) =>
          name.toLowerCase().includes(normalized) || code.includes(normalized),
      )
    : options;
  const selected = options.find(({ code }) => code === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={<Button id={id} variant="outline" type="button" />}
        className={cn(
          "w-full justify-between font-normal",
          !selected && "text-muted-foreground",
        )}
        disabled={disabled}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected && selected.code !== OTHER_BANK_CODE ? (
            <BankBadge
              bankCode={selected.code}
              bankName={selected.name}
              size="sm"
            />
          ) : null}
          <span className="truncate">{selected?.name ?? "Pilih bank"}</span>
        </span>
        <ChevronsUpDownIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-72 gap-0 p-0"
      >
        <div className="relative border-b p-2">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            aria-label="Cari bank"
            placeholder="Cari nama atau kode bank"
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div role="listbox" className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Bank tidak ditemukan. Pilih &ldquo;Bank lainnya&rdquo;.
            </p>
          ) : (
            filtered.map(({ code, name }) => (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={code === value}
                onClick={() => {
                  onChange(code);
                  setOpen(false);
                  setQuery("");
                }}
                className="hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none"
              >
                <CheckIcon
                  className={cn(
                    "size-4 shrink-0",
                    code === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {code !== OTHER_BANK_CODE ? (
                  <BankBadge bankCode={code} bankName={name} size="sm" />
                ) : null}
                <span className="flex-1 truncate">{name}</span>
                {code !== OTHER_BANK_CODE ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {code}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
