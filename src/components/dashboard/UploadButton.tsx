"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import UploadModal from "./UploadModal";

type UploadButtonProps = {
  label: string;
};

export default function UploadButton({ label }: UploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="btn-primary flex items-center gap-3" onClick={() => setIsOpen(true)}>
        <UploadCloud size={20} />
        <span>{label}</span>
      </button>

      {isOpen && <UploadModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
