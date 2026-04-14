"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={styles.dialog} role="dialog" aria-modal>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.close} onClick={onClose}><X size={14} /></button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
