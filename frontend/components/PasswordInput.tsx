"use client";

// Password field with a show/hide toggle, so people can check what they typed.
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn, fieldBorder, inputClass } from "./ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: "current-password" | "new-password";
};

export default function PasswordInput({ value, onChange, error, autoComplete }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, fieldBorder(error), "pr-11")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-white/40 transition hover:text-white"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
