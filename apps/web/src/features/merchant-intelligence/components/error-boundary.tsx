import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProductErrorBoundaryProps {
  children: ReactNode;
}

interface ProductErrorBoundaryState {
  failed: boolean;
}

export class ProductErrorBoundary extends Component<
  ProductErrorBoundaryProps,
  ProductErrorBoundaryState
> {
  state: ProductErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ProductErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV)
      console.error("Dashboard render failed", error, info);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        className="mx-auto grid min-h-dvh max-w-2xl place-items-center px-5"
        dir="rtl"
      >
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold">
            نمایش این صفحه با مشکل روبه‌رو شد
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            هیچ داده جایگزین یا ادعای تحلیلی نمایش داده نشده است. صفحه را دوباره
            بارگذاری کنید.
          </p>
          <Button
            className="mx-auto mt-6"
            onClick={() => window.location.reload()}
          >
            بارگذاری دوباره
          </Button>
        </Card>
      </main>
    );
  }
}
