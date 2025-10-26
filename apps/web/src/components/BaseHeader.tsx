import * as React from "react";

type Props = {
  left?: React.ReactNode;
  nav?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

/**
 * BaseHeader NÃO define estilos novos.
 * Ele apenas reusa as MESMAS classes/containers do Header atual,
 * servindo de "molde" para público/interno.
 */
export function BaseHeader({ left, nav, right, className }: Props) {
  return (
    <header className={className || "fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Left section */}
          {left}

          {/* Navigation section */}
          {nav}

          {/* Right section */}
          {right}
        </div>
      </div>
    </header>
  );
}