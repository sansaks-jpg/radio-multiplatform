"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isChat = pathname === "/chat";

  return (
    <ToastProvider>
      <div className="relative z-10 flex h-screen h-[100dvh] overflow-hidden bg-background text-foreground">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main
            className={
              isChat
                ? "flex-1 overflow-hidden p-0 sm:p-3 md:p-4 lg:p-6 flex flex-col min-h-0"
                : "flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
