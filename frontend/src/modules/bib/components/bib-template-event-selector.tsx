"use client";

import type { ChangeEvent } from "react";

type BibTemplateEventSelectorProps = {
  currentEventId: string;
  events: Array<{ id: string; name: string }>;
};

export function BibTemplateEventSelector({
  currentEventId,
  events,
}: BibTemplateEventSelectorProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    document.querySelectorAll<HTMLInputElement>("[data-bib-template-event-id]").forEach((input) => {
      input.value = event.target.value;
    });
  }

  return (
    <select
      className="min-h-11 rounded-app border border-border bg-background px-3 text-sm font-bold text-navy"
      defaultValue={currentEventId}
      name="eventId"
      onChange={handleChange}
    >
      {events.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}
