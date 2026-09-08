"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function RescheduleRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/trials/reschedule${params ? `?${params}` : ""}`);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <RescheduleRedirect />
    </Suspense>
  );
}
