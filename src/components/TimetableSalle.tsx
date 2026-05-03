import React from "react";

const timeShots = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];

interface Session {
  timeshot: string;
  module: string;
  salle: string;
  group: string;
  formateur: string;
  color: string;
}

interface Day {
  [day: string]: Session[];
}

interface TimetableSalleData {
  salle: string;
  timetable: Day[];
  valid_form: string;
  year?: number | string;
  academic_year?: string;
  nbr_hours_in_week: number;
}

interface Props {
  timetableSalle: TimetableSalleData;
  timetableRef: React.RefObject<HTMLDivElement> | null;
}

export default function TimetableSalle({
  timetableSalle,
  timetableRef,
}: Props) {
  return (
    <div className="p-5" ref={timetableRef} style={{ background: '#fff' }} data-timetable-print>
      <h1 className="text-center text-2xl font-bold" style={{ color: '#111827' }}>EMPLOI DU TEMPS</h1>
      <div className="flex justify-between my-5">
        <div>
          <p style={{ color: '#374151' }}>
            EFP :
            <span className="uppercase font-bold" style={{ color: '#2563eb' }}>
              ista cité de l'air
            </span>
          </p>
        </div>
        <div>
          <p style={{ color: '#374151' }}>
            Année de formation :
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableSalle?.academic_year || '2024-2025'}
            </span>
          </p>
          <br />
          <p style={{ color: '#374151' }}>
            Salle :
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableSalle.salle}
            </span>
          </p>
        </div>
      </div>
      <div>
        <table className="w-full ">
          <thead>
            <tr>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[12%]"></th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">08:30-11:00</th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">11:00-13:30</th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">13:30-16:00</th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">16:00-18:30</th>
            </tr>
          </thead>
          <tbody>
            {timetableSalle.timetable &&
              timetableSalle.timetable.map((day, index) => {
                const dayLabel = Object.keys(day)[0];
                const sessions = Object.values(day)[0];
                return (() => {
                  const renderCells = [];
                  let skipNext = false;
                  for (let i = 0; i < timeShots.length; i++) {
                    if (skipNext) { skipNext = false; continue; }
                    const timeshot = timeShots[i];
                    const currentSession = sessions?.find((s) => s.timeshot === timeshot);
                    const nextSession = sessions?.find((s) => s.timeshot === timeShots[i + 1]);
                    let merge = false;
                    if (currentSession && nextSession && currentSession.module === nextSession.module && currentSession.salle === nextSession.salle) {
                      merge = true;
                      skipNext = true;
                    }
                    renderCells.push(
                      <RenderTimeShot key={i} session={currentSession} mergeSession={merge} />
                    );
                  }
                  return (
                    <tr key={index}>
                      <td style={{ background: '#6b7280', color: '#fff' }} className="lg:px-5 lg:py-7 py-5 px-3 font-bold text-center border w-[12%]">{dayLabel}</td>
                      {renderCells}
                    </tr>
                  );
                })();
              })}
          </tbody>
        </table>
        <div className="flex justify-between">
          <p style={{ color: '#374151' }}>
            Cet emploi du temps est valable _ partir du{" "}
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableSalle?.valid_form}
            </span>
          </p>
          <p style={{ color: '#374151' }}>
            {" "}
            Nombre d'heures:
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableSalle?.nbr_hours_in_week}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const RenderTimeShot = ({
  session,
  mergeSession,
}: {
  session: Session | undefined;
  mergeSession: boolean;
}) => {
  if (!session) {
    return <td style={{ background: '#f9fafb' }} className="lg:px-5 py-2 px-3 text-center border w-[12%]"></td>;
  }

  return (
    <td
      colSpan={mergeSession ? 2 : 1}
      className="lg:px-5 py-2 px-3 text-center border w-[12%]"
      style={{ background: session.color }}
    >
      <span style={{ color: '#111827', fontWeight: 600 }}>{session.module}</span> <br />
      <span style={{ color: '#111827', fontWeight: 600 }}>{session.formateur.slice(session.formateur.indexOf(" "))}</span> <br />
      <span style={{ color: '#111827', fontWeight: 600 }}>{session.salle}</span> <br />
    </td>
  );
};
