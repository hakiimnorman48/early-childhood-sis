"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors print:hidden"
    >
      <Printer size={16} />
      Print / Save as PDF
    </button>
  );
}
