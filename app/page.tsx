"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAuthToken, setAuthToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.replace("/dashboard");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const freshToken = await user.getIdToken();
        setAuthToken(freshToken);
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return null;
}
