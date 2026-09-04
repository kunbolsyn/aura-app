import type { UserEvent } from "../types";

type IcsProperty = {
  name: string;
  params: Record<string, string>;
  value: string;
};

function unfoldIcs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .reduce<string[]>((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function parseProperty(line: string): IcsProperty | null {
  const separator = line.indexOf(":");
  if (separator < 0) return null;

  const [nameWithParams, ...valueParts] = [
    line.slice(0, separator),
    line.slice(separator + 1),
  ];
  const [rawName, ...rawParams] = nameWithParams.split(";");
  const params: Record<string, string> = {};
  rawParams.forEach((param) => {
    const equals = param.indexOf("=");
    if (equals > 0) {
      params[param.slice(0, equals).toUpperCase()] = param
        .slice(equals + 1)
        .replace(/^"|"$/g, "");
    }
  });

  return {
    name: rawName.toUpperCase(),
    params,
    value: valueParts.join(":"),
  };
}

function unescapeIcs(value: string): string {
  return value.replace(/\\([\\;,])/g, "$1").replace(/\\n/gi, "\n");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDate(
  value: string,
  params: Record<string, string>,
): string | null {
  const dateValue = value.trim();
  const dateOnly = params.VALUE === "DATE" || /^\d{8}$/.test(dateValue);
  const match = dateValue.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/,
  );
  if (!match) return null;

  const [, year, month, day, hours = "00", minutes = "00", , isUtc] = match;
  if (dateOnly) return `${year}-${month}-${day}T00:00`;

  const wallClock = `${year}-${month}-${day}T${hours}:${minutes}`;
  if (isUtc) {
    return formatLocalDateTime(
      new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hours),
          Number(minutes),
        ),
      ),
    );
  }

  const timeZone = params.TZID;
  if (!timeZone) return wallClock;

  try {
    const wallClockEpoch = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
    );
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(wallClockEpoch));
    const values = Object.fromEntries(
      parts
        .filter(({ type }) => type !== "literal")
        .map(({ type, value: partValue }) => [type, Number(partValue)]),
    );
    const sourceClockEpoch = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
    );
    return formatLocalDateTime(
      new Date(wallClockEpoch - (sourceClockEpoch - wallClockEpoch)),
    );
  } catch {
    return wallClock;
  }
}

function addHours(dateTime: string, hours: number): string {
  const date = new Date(`${dateTime}:00`);
  date.setHours(date.getHours() + hours);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseIcsEvents(text: string, calendarId: string): UserEvent[] {
  const events: UserEvent[] = [];
  let current: Record<string, IcsProperty> | null = null;

  for (const line of unfoldIcs(text)) {
    if (line.toUpperCase() === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line.toUpperCase() === "END:VEVENT") {
      if (current) {
        const startProperty = current.DTSTART;
        const title = current.SUMMARY?.value
          ? unescapeIcs(current.SUMMARY.value).trim()
          : "Imported event";
        const startDate = startProperty
          ? parseDate(startProperty.value, startProperty.params)
          : null;
        const endDate = current.DTEND
          ? parseDate(current.DTEND.value, current.DTEND.params)
          : startDate && startProperty?.params.VALUE === "DATE"
            ? addHours(startDate, 24)
            : startDate
              ? addHours(startDate, 1)
              : null;

        if (
          startDate &&
          endDate &&
          current.STATUS?.value.toUpperCase() !== "CANCELLED"
        ) {
          events.push({
            id: crypto.randomUUID(),
            title,
            startDate,
            endDate,
            allDay:
              startProperty?.params.VALUE === "DATE" ||
              /^\d{8}$/.test(startProperty.value),
            description: current.DESCRIPTION?.value
              ? unescapeIcs(current.DESCRIPTION.value)
              : undefined,
            location: current.LOCATION?.value
              ? unescapeIcs(current.LOCATION.value)
              : undefined,
            calendarId,
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const property = parseProperty(line);
    if (property && !current[property.name]) current[property.name] = property;
  }

  return events;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(value: string, allDay: boolean): string {
  const [date, time = "00:00"] = value.split("T");
  const [year, month, day] = date.split("-");
  if (allDay) return `${year}${month}${day}`;
  const [hours, minutes] = time.split(":");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

export function createIcsCalendar(
  calendarName: string,
  events: UserEvent[],
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aura//Calendar//EN",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];

  events.forEach((event) => {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@aura`);
    lines.push(
      `DTSTAMP:${formatIcsDate(new Date().toISOString().slice(0, 16), false)}`,
    );
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.startDate, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(event.endDate, true)}`);
    } else {
      lines.push(`DTSTART:${formatIcsDate(event.startDate, false)}`);
      lines.push(`DTEND:${formatIcsDate(event.endDate, false)}`);
    }
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
    if (event.description)
      lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
