import { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

interface SectionCardProps {
  icon: IconProp;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({
  icon,
  title,
  description,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-lg border-l-4 border-blue-400 relative overflow-hidden mb-8 ${className}`}
      aria-label={title}
    >
      <div className="flex items-center mb-2">
        <FontAwesomeIcon icon={icon} className="mr-4 text-blue-500 text-3xl animate-pulse" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
      </div>
      <p className="text-gray-700 text-lg mb-6 ml-1">{description}</p>
      <div>{children}</div>
    </section>
  );
} 