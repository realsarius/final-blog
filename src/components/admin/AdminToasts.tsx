"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function AdminToasts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const message = success || error;

    if (!message || lastMessageRef.current === message) {
      return;
    }

    lastMessageRef.current = message;

    if (success) {
      toast.success(success);
    } else {
      toast.error(message);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("success");
    nextParams.delete("error");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [pathname, router, searchParams]);

  return null;
}
