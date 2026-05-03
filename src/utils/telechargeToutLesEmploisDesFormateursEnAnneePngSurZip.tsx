import ReactDOM from "react-dom/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import api from "../api/apiConfig";
import TimetableFormateur from "../components/TimetableFormateur";
import { handleNotification } from "./notification";

interface TimetableActive {
  mle_formateur: string;
}

interface Session {
  timeshot: string;
  module: string;
  salle: string;
  group: string;
  color: string;
}

interface Day {
  [day: string]: Session[];
}

interface TimetableFormateurData {
  formateur: string;
  timetable: Day[];
  valid_form: string;
  nbr_hours_in_week: number;
}

export const telechargeToutLesEmploisActifDesFormateursPngSurZip = async (
  timetablesActiveForFormateurs: TimetableActive[],
  onProgress?: (current: number, total: number) => void
) => {
  const zip = new JSZip();

  // Create a hidden container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.width = "210mm";
  container.style.background = "white";
  document.body.appendChild(container);

  const randStr = Math.random().toString(36).substr(2, 9);
  for (let i = 0; i < timetablesActiveForFormateurs.length; i++) {
    const formateur = timetablesActiveForFormateurs[i];
    // Get full data
    const { data: timetableFormateur }: { data: TimetableFormateurData } =
      await api.get(`/timetable-formateurs/${formateur.mle_formateur}`);

    // Create a wrapper div for each timetable
    const wrapper = document.createElement("div");
    container.appendChild(wrapper);
    container.style.width = "100vw";
    wrapper.style.width = "100%";

    const root = ReactDOM.createRoot(wrapper);

    // Render the React component
    await new Promise<void>((resolve) => {
      root.render(
        <TimetableFormateur
          formateurTimetable={timetableFormateur}
          timetableRef={null}
        />
      );
      setTimeout(resolve, 1000); // Wait for layout
    });

    // Screenshot the rendered timetable
    const canvas = await html2canvas(wrapper, {
      useCORS: true,
      scale: 2,
      backgroundColor: "#fff",
    });

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (blob) {
      zip.file(
        `les-emplois-des-temps-des-formateurs-en-annee-${randStr}/${timetableFormateur.formateur}.png`,
        blob
      );
    }

    // Clean up
    root.unmount();
    container.removeChild(wrapper);

    // Progress callback
    if (onProgress) onProgress(i + 1, timetablesActiveForFormateurs.length);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  document.body.removeChild(container); // remove the main container

  // Download ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" });

  saveAs(
    zipBlob,
    `les-emplois-des-temps-des-formateurs-en-annee${
      new Date().toISOString().split("T")[0]
    }--${Math.random().toString(36).substr(2, 9)}.zip`
  );

  handleNotification(
    "Téléchargement",
    "seccès téléchargement des emlpois du temps des formateurs!"
  );
};
