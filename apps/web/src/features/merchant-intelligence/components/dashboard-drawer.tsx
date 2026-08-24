import { useEffect, useId, useRef, type ReactNode } from "react";

export function DashboardDrawer({
  open,
  side,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  side: "right" | "left";
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => closeRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      data-side={side}
      className="preview-drawer"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-6 text-muted-foreground"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="preview-icon-button"
            onClick={onClose}
            aria-label="بستن"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer ? (
          <footer className="border-t border-border bg-card p-4 sm:p-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
