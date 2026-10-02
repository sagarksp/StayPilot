import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantClasses =
    variant === "primary"
      ? "bg-[#176e61] text-white hover:bg-[#10564c]"
      : "border border-[#dce4e0] bg-white text-[#182b29] hover:bg-[#f5f7f5]";

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176e61] disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
