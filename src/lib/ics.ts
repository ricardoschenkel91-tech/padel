import type { Booking, GroupState } from "../core";

function dt(date: string, hour: number): string {
  const [y, m, d] = date.split("-");
  const H = String(Math.floor(hour)).padStart(2, "0");
  const M = String(Math.round((hour - Math.floor(hour)) * 60)).padStart(2, "0");
  return `${y}${m}${d}T${H}${M}00`;
}

function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/** Bouw een iCalendar (.ics) tekst voor één reservering (Apple/Google/Nextcloud). */
export function bookingToICS(b: Booking, state: GroupState): string {
  const loc = state.locations[b.locationId];
  const players = b.playerIds.map((id) => state.players[id]?.displayName ?? id).join(", ");
  const locStr = loc ? `${loc.name}, ${loc.address}, ${loc.postcode} ${loc.city}` : "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PadelMatch//NL",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${b.id}@padelmatch`,
    `DTSTAMP:${dt(b.date, b.start)}`,
    `DTSTART:${dt(b.date, b.start)}`,
    `DTEND:${dt(b.date, b.end)}`,
    `SUMMARY:🎾 Padel${loc ? ` — ${loc.name}` : ""}`,
    locStr ? `LOCATION:${esc(locStr)}` : "",
    `DESCRIPTION:${esc(`Spelers: ${players}${b.court ? ` · Baan ${b.court}` : ""}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** Download de .ics als bestand (werkt op GitHub Pages, niet in de preview-sandbox). */
export function downloadICS(b: Booking, state: GroupState): void {
  const blob = new Blob([bookingToICS(b, state)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `padel-${b.date}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
