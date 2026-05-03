import { ReactNode } from "react";

type props = {
  label?: string;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
};

export default function Button({
  label = "",
  className = "",
  onClick = () => {},
  children,
}: props) {
  return (
    <button
      className={`text-center mx-2 text-white shadow-xl font-bold hover:cursor-pointer bg-blue-500 hover:bg-blue-600 p-2 rounded-md transition-colors ${className}`}
      onClick={onClick}
    >
      {children ?? label}
    </button>
  );
}
