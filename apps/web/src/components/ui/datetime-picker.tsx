"use client";

import { useEffect, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarDaysIcon } from "lucide-react";

import { Calendar } from "~/components/ui/calendar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_TIME = "09:00";

function splitDateTime(value: string) {
  const [datePart = "", timePart = ""] = value.split("T");
  return { datePart, timePart: timePart.slice(0, 5) };
}

type DateTimePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
};

function DateTimePicker({
  id,
  value,
  onChange,
  min,
  placeholder = "Pilih tanggal & jam",
  "aria-label": ariaLabel,
  className,
  required,
  disabled,
}: DateTimePickerProps) {
  const { datePart, timePart } = splitDateTime(value);
  const { datePart: minDatePart, timePart: minTimePart } = splitDateTime(
    min ?? "",
  );

  const selected = datePart ? parseISO(datePart) : undefined;
  const minimum = minDatePart ? parseISO(minDatePart) : undefined;
  const parsedValue = value ? parseISO(value) : undefined;
  const showValue =
    parsedValue && isValid(parsedValue) && datePart && TIME_PATTERN.test(timePart)
      ? format(parsedValue, "dd MMM yyyy, HH:mm")
      : null;

  const [timeDraft, setTimeDraft] = useState(timePart);

  useEffect(() => {
    setTimeDraft(timePart);
  }, [timePart]);

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      onChange("");
      return;
    }
    const nextDate = format(date, "yyyy-MM-dd");
    const nextTime =
      timePart && TIME_PATTERN.test(timePart) ? timePart : DEFAULT_TIME;
    setTimeDraft(nextTime);
    onChange(`${nextDate}T${nextTime}`);
  }

  function handleTimeChange(next: string) {
    const cleaned = next.replace(/[^0-9:]/g, "").slice(0, 5);
    setTimeDraft(cleaned);
    if (!datePart || !TIME_PATTERN.test(cleaned)) return;
    onChange(`${datePart}T${cleaned}`);
  }

  const timeInvalid =
    timeDraft.length > 0 && !TIME_PATTERN.test(timeDraft);
  const belowMin =
    min &&
    datePart &&
    TIME_PATTERN.test(timeDraft) &&
    `${datePart}T${timeDraft}` < min.slice(0, 16);

  return (
    <Popover>
      <PopoverTrigger
        render={<Button id={id} variant="outline" type="button" />}
        className={cn(
          "w-full justify-between font-normal",
          !showValue && "text-muted-foreground",
          className,
        )}
        aria-label={ariaLabel}
        aria-required={required}
        disabled={disabled}
      >
        {showValue ?? placeholder}
        <CalendarDaysIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected && isValid(selected) ? selected : undefined}
          onSelect={handleDateSelect}
          disabled={minimum && isValid(minimum) ? { before: minimum } : undefined}
        />
        <div className="space-y-2 border-t p-3">
          <Label htmlFor={`${id}-time`}>Jam (24 jam)</Label>
          <Input
            id={`${id}-time`}
            type="text"
            inputMode="numeric"
            placeholder="HH:mm"
            autoComplete="off"
            value={timeDraft}
            disabled={!datePart || disabled}
            aria-invalid={timeInvalid || Boolean(belowMin)}
            onChange={(event) => handleTimeChange(event.target.value)}
          />
          {!datePart ? (
            <p className="text-muted-foreground text-xs">
              Pilih tanggal dulu, jam default {DEFAULT_TIME}.
            </p>
          ) : timeInvalid ? (
            <p className="text-destructive text-xs">
              Format jam HH:mm, contoh 09:00 atau 14:30.
            </p>
          ) : belowMin ? (
            <p className="text-destructive text-xs">
              Minimal {minDatePart} pukul {minTimePart || DEFAULT_TIME}.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Contoh 09:00 untuk pagi, 14:30 untuk siang.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DateTimePicker };
