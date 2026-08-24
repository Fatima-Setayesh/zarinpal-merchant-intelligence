import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { isApiClientError } from "../api/errors";

const messageForError = (error: unknown): string => {
  if (!isApiClientError(error)) return "خطای پیش‌بینی‌نشده‌ای رخ داد.";
  switch (error.kind) {
    case "configuration":
      return "نشانی API معتبر نیست. تنظیم VITE_API_BASE_URL را بررسی کنید.";
    case "validation":
      return "دامنه انتخاب‌شده معتبر نیست. فیلترها را بازبینی کنید.";
    case "unauthorized":
      return "مرز دسترسی API درست پیکربندی نشده یا اجازه این درخواست وجود ندارد.";
    case "not_found":
      return "پذیرنده یا منبع درخواستی در دیتاست فعلی پیدا نشد.";
    case "payload_too_large":
      return "درخواست از حد مجاز API بزرگ‌تر است. دامنه را محدودتر کنید.";
    case "unavailable":
      return "دیتاست پرداخت اکنون در دسترس نیست.";
    case "invalid_response":
      return "پاسخ API با قرارداد مورد انتظار سازگار نبود و به‌عنوان شواهد نمایش داده نشد.";
    case "network":
      return "ارتباط با API برقرار نشد. اتصال و نشانی سرویس را بررسی کنید.";
    case "server":
      return "API هنگام پردازش درخواست با خطا روبه‌رو شد.";
    default:
      return "درخواست API کامل نشد.";
  }
};

export function SectionError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  const requestId = isApiClientError(error) ? error.requestId : undefined;
  return (
    <Card className="rounded-2xl p-6" role="status">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        {messageForError(error)}
      </p>
      {requestId ? (
        <p className="mt-2 text-xs text-muted-foreground">
          شناسه پیگیری: <bdi dir="ltr">{requestId}</bdi>
        </p>
      ) : null}
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        تلاش دوباره
      </Button>
    </Card>
  );
}

export function SectionLoading({ label }: { label: string }) {
  return (
    <div
      className="grid min-h-44 place-items-center"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <span className="preview-loader mx-auto block" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-2xl p-6 text-sm leading-7 text-muted-foreground">
      {children}
    </Card>
  );
}
