const dateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function partsInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatZonedDateTimeInput(value: Date, timeZone: string) {
  const parts = partsInTimeZone(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseZonedDateTimeInput(value: string, timeZone: string) {
  const match = dateTimePattern.exec(value);
  if (!match) throw new Error("Invalid meeting date and time");

  const [, year, month, day, hour, minute, second = "00"] = match;
  const desiredTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  let result = new Date(desiredTime);

  // Resolve the zone offset at the candidate instant, including DST changes.
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = partsInTimeZone(result, timeZone);
    const representedTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    result = new Date(result.getTime() + desiredTime - representedTime);
  }

  if (formatZonedDateTimeInput(result, timeZone) !== value.slice(0, 16)) {
    throw new Error("The selected time does not exist in this timezone");
  }
  return result;
}
