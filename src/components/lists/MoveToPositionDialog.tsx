"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

// "Mover a la posición…" de un ítem del detalle propio (openspec: redesign-me-lists-views, D6): un número entre 1 y N.
// Llevar un ítem del puesto 12 al 2 era diez toques en ↑.
export function MoveToPositionDialog({
  title,
  current,
  total,
  onMove,
  onCancel,
}: {
  title: string;
  /** Posición actual (1 a N). */
  current: number;
  total: number;
  onMove: (position: number) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("lists");
  const id = useId();
  const [value, setValue] = useState(String(current));
  const position = Number(value);
  const valid = Number.isInteger(position) && position >= 1 && position <= total && position !== current;

  return (
    <Dialog open title={t("moveToPositionTitle", { title })} onClose={onCancel}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onMove(position);
        }}
      >
        <label htmlFor={id} className="flex flex-col gap-1.5 font-data text-sm text-paper">
          {t("positionLabel", { count: total })}
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={1}
            max={total}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-28 rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper [@media(pointer:coarse)]:min-h-11"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={!valid}>
            {t("move")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
