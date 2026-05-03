import { useContext } from "react";
import { ExportContext } from "../contextApi/ExportContext";

export default function ExportProgressBar() {
  const { group, formateur, salle, formateurEnAnnee } = useContext(ExportContext);

  const bars = [
    {
      key: "group",
      label: "Groupes",
      color: "bg-blue-600",
      progress: group,
    },
    {
      key: "formateur",
      label: "Formateurs",
      color: "bg-green-600",
      progress: formateur,
    },
    {
      key: "salle",
      label: "Salles",
      color: "bg-purple-600",
      progress: salle,
    },
    {
      key: "formateurEnAnnee",
      label: "Formateurs (année)",
      color: "bg-orange-600",
      progress: formateurEnAnnee,
    },
  ];

  // Only show if any export is running
  if (!bars.some((b) => b.progress.running)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[320px] space-y-3">
      {bars.map(
        (b) =>
          b.progress.running && (
            <div
              key={b.key}
              className="shadow-lg rounded-lg bg-white border border-gray-200 p-4"
            >
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Export {b.label} : {b.progress.current} / {b.progress.total}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${b.color} h-3 rounded-full transition-all`}
                  style={{
                    width: `${(b.progress.current / b.progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )
      )}
    </div>
  );
} 