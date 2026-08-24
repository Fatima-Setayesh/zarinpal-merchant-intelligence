import { MerchantIntelligenceDashboard } from "@/features/merchant-intelligence/merchant-intelligence-dashboard";
import { ProductErrorBoundary } from "@/features/merchant-intelligence/components/error-boundary";

export function App() {
  return (
    <ProductErrorBoundary>
      <MerchantIntelligenceDashboard />
    </ProductErrorBoundary>
  );
}
