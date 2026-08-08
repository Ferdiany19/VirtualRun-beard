"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type ActionMenuContextValue = {
  openRegistrationId: string | null;
  setOpenRegistrationId: Dispatch<SetStateAction<string | null>>;
};

type GlobalParticipantActionMenuProviderProps = {
  children: ReactNode;
};

type GlobalParticipantActionMenuProps = {
  eventId: string;
  registrationId: string;
};

const ActionMenuContext = createContext<ActionMenuContextValue | null>(null);

export function GlobalParticipantActionMenuProvider({
  children,
}: GlobalParticipantActionMenuProviderProps) {
  const [openRegistrationId, setOpenRegistrationId] = useState<string | null>(null);

  return (
    <ActionMenuContext.Provider value={{ openRegistrationId, setOpenRegistrationId }}>
      {children}
    </ActionMenuContext.Provider>
  );
}

function useActionMenu() {
  const context = useContext(ActionMenuContext);

  if (!context) {
    throw new Error("GlobalParticipantActionMenu must be rendered inside its provider.");
  }

  return context;
}

export function GlobalParticipantActionMenu({
  eventId,
  registrationId,
}: GlobalParticipantActionMenuProps) {
  const { openRegistrationId, setOpenRegistrationId } = useActionMenu();
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpen = openRegistrationId === registrationId;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpenRegistrationId(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenRegistrationId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setOpenRegistrationId]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Buka aksi peserta"
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-app border border-border text-navy hover:border-primary hover:text-primary"
        onClick={() => {
          setOpenRegistrationId((current) => (current === registrationId ? null : registrationId));
        }}
        type="button"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ...
        </span>
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 z-30 mt-2 w-40 rounded-app border border-border bg-surface p-1 text-left shadow-floating"
          role="menu"
        >
          <Link
            className="block rounded-md px-3 py-2 text-sm font-bold text-navy hover:bg-surface-muted"
            href={`/admin/events/${eventId}/participants/${registrationId}`}
            role="menuitem"
          >
            Detail
          </Link>
          <Link
            className="block rounded-md px-3 py-2 text-sm font-bold text-navy hover:bg-surface-muted"
            href={`/admin/events/${eventId}/submissions`}
            role="menuitem"
          >
            Hasil
          </Link>
        </div>
      ) : null}
    </div>
  );
}
