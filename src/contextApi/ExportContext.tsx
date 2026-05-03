import React, { createContext, useState, useCallback } from "react";

export interface ExportProgress {
  current: number;
  total: number;
  running: boolean;
}

interface ExportContextType {
  group: ExportProgress;
  formateur: ExportProgress;
  salle: ExportProgress;
  formateurEnAnnee: ExportProgress;
  startExport: (
    type: "group" | "formateur" | "salle" | "formateurEnAnnee",
    total: number
  ) => void;
  updateExport: (
    type: "group" | "formateur" | "salle" | "formateurEnAnnee",
    current: number,
    total: number
  ) => void;
  finishExport: (type: "group" | "formateur" | "salle" | "formateurEnAnnee") => void;
}

export const ExportContext = createContext<ExportContextType>({
  group: { current: 0, total: 0, running: false },
  formateur: { current: 0, total: 0, running: false },
  salle: { current: 0, total: 0, running: false },
  formateurEnAnnee: { current: 0, total: 0, running: false },
  startExport: () => {},
  updateExport: () => {},
  finishExport: () => {},
});

export const ExportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('ExportProvider mounted');
  const [group, setGroup] = useState<ExportProgress>({ current: 0, total: 0, running: false });
  const [formateur, setFormateur] = useState<ExportProgress>({ current: 0, total: 0, running: false });
  const [salle, setSalle] = useState<ExportProgress>({ current: 0, total: 0, running: false });
  const [formateurEnAnnee, setFormateurEnAnnee] = useState<ExportProgress>({ current: 0, total: 0, running: false });

  const startExport = useCallback((type: "group" | "formateur" | "salle" | "formateurEnAnnee", total: number) => {
    const state = { current: 0, total, running: true };
    if (type === "group") setGroup(state);
    if (type === "formateur") setFormateur(state);
    if (type === "salle") setSalle(state);
    if (type === "formateurEnAnnee") setFormateurEnAnnee(state);
  }, []);

  const updateExport = useCallback((type: "group" | "formateur" | "salle" |"formateurEnAnnee", current: number, total: number) => {
    const state = { current, total, running: true };
    if (type === "group") setGroup(state);
    if (type === "formateur") setFormateur(state);
    if (type === "salle") setSalle(state);
    if (type === "formateurEnAnnee") setFormateurEnAnnee(state);
  }, []);

  const finishExport = useCallback((type: "group" | "formateur" | "salle" | "formateurEnAnnee") => {
    const state = { current: 0, total: 0, running: false };
    if (type === "group") setGroup(state);
    if (type === "formateur") setFormateur(state);
    if (type === "salle") setSalle(state);
    if (type === "formateurEnAnnee") setFormateurEnAnnee(state);
  }, []);

  return (
    <ExportContext.Provider value={{ group, formateur, salle, formateurEnAnnee ,  startExport, updateExport, finishExport }}>
      {children}
    </ExportContext.Provider>
  );
}; 