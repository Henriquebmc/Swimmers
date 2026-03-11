"use client";

import type { ReactNode } from "react";

type FloatingTopBarProps = {
  children: ReactNode;
};

export default function FloatingTopBar({ children }: FloatingTopBarProps) {
  return (
    <div className="pointer-events-none absolute right-0 top-0 z-50 flex justify-end px-4 pt-4 sm:px-6">
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}
