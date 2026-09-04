"use client";

import { format, parseISO } from "date-fns";
import { CalendarDaysIcon } from "lucide-react";

import { Calendar } from "~/components/ui/calendar";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

type DatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
};

function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = "Pilih tanggal",
  "aria-label": ariaLabel,
  className,
}: DatePickerProps) {
  const selected = value ? parseISO(value) : undefined;
  const minimum = min ? parseISO(min) : undefined;

  return (
    <Popover>
      <PopoverTrigger
        render={<Button id={id} variant="outline" type="button" />}
        className={cn(
          "w-full justify-between font-normal",
          !selected && "text-muted-foreground",
          className,
        )}
        aria-label={ariaLabel}
      >
        {selected ? format(selected, "dd MMM yyyy") : placeholder}
        <CalendarDaysIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          disabled={minimum ? { before: minimum } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
