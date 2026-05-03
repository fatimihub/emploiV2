interface Session {
  timeshot: string;
  module: string;
  salle: string;
  formateur: string;
  color: string;
  type?: string;
}

interface Day {
  [day: string]: Session[];
}

interface TimetableGroupData {
  code_branch: string;
  niveau: string;
  groupe: string;
  timetable: Day[];
  valid_form: string;
  year_of_formation?: number | string;
  academic_year?: string;
  nbr_hours_in_week: number;
}

interface Props {
  timetableRef: React.RefObject<HTMLDivElement> | null;
  timetableGroup: TimetableGroupData;
}

export default function TimetableGroup({
  timetableRef,
  timetableGroup,
}: Props) {
  const timeShots = [
    "08:30-11:00",
    "11:00-13:30",
    "13:30-16:00",
    "16:00-18:30",
  ];

  if (!timetableGroup) {
    return null;
  }
  return (
    <div ref={timetableRef} className="p-5 rounded-lg shadow-md" style={{ background: '#fff' }} data-timetable-print>
      <h1 className="text-center text-2xl font-bold" style={{ color: '#111827' }}>EMPLOI DU TEMPS</h1>
      <div className="flex justify-between my-5">
        <div>
          <p style={{ color: '#374151' }}>
            EFP :{" "}
            <span className="uppercase font-bold" style={{ color: '#2563eb' }}>
              ista cité de l'air
            </span>
          </p>
          <p style={{ color: '#374151' }}>
            Filière :{" "}
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableGroup?.code_branch}
            </span>
          </p>
          <p style={{ color: '#374151' }}>
            Niveau :{" "}
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableGroup?.niveau}
            </span>
          </p>
        </div>
        <div>
          <p style={{ color: '#374151' }}>
            Année de formation :
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableGroup?.academic_year || '2024-2025'}
            </span>
          </p>
          <br />
          <p style={{ color: '#374151' }}>
            Groupe :{" "}
            <span className="font-bold" style={{ color: '#2563eb' }}>
              {timetableGroup?.groupe}{" "}
            </span>
          </p>
        </div>
      </div>
      <div>
        <table className="w-full ">
          <thead>
            <tr>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[12%]"> </th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">08:30-11:00</th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">11:00-13:30</th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">13:30-16:00</th>
              <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">16:00-18:30</th>
            </tr>
          </thead>
          <tbody>
            {timetableGroup.timetable &&
              timetableGroup.timetable.map((day, index) => {
                const dayLabel = Object.keys(day)[0];
                const sessions = Object.values(day)[0];

                return (() => {
                  const renderCells = [];
                  let skipNext = false;

                  for (let i = 0; i < timeShots.length; i++) {
                    if (skipNext) {
                      skipNext = false;
                      continue;
                    }

                    const timeshot = timeShots[i];
                    const currentSession = sessions?.find(
                      (s) => s.timeshot === timeshot
                    );
                    const nextSession = sessions?.find(
                      (s) => s.timeshot === timeShots[i + 1]
                    );

                    let merge = false;
                    if (
                      currentSession &&
                      nextSession &&
                      currentSession.module === nextSession.module &&
                      currentSession.salle === nextSession.salle
                    ) {
                      merge = true;
                      skipNext = true;
                    }

                    renderCells.push(
                      <RenderTimeShot
                        key={i}
                        session={currentSession}
                        mergeSession={merge}
                      />
                    );
                  }

                  return (
                    <tr key={index}>
                      <td
                        style={{ background: '#6b7280', color: '#fff' }}
                        className="lg:px-5 lg:py-7 py-5 px-3 font-bold text-center border w-[12%]"
                      >
                        {dayLabel}
                      </td>
                      {renderCells}
                    </tr>
                  );
                })();
              })}
          </tbody>
        </table>
        <div className="flex justify-between mt-5">
          <p style={{ color: '#374151' }}>
            Cet emploi du temps est valable à partir du{" "}
            <span style={{ color: '#2563eb', fontWeight: 700 }}>
              {timetableGroup.valid_form}
            </span>
          </p>
          <p style={{ color: '#374151' }}>
            Nombre d'heures:{" "}
            <span style={{ color: '#2563eb', fontWeight: 700 }}>
              {(() => {
                let totalSessions = 0;
                timetableGroup.timetable.forEach((dayObj) => {
                  const sessions = Object.values(dayObj)[0];
                  if (Array.isArray(sessions)) {
                    totalSessions += sessions.length;
                  }
                });
                return totalSessions * 2.5;
              })()}
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
      <span style={{ color: '#111827', fontWeight: 600 }}>
        {session.formateur.includes(" ") ? session.formateur.slice(session.formateur.indexOf(" ")) : session.formateur}
      </span>{" "}
      <br />
      <span style={{ color: '#111827', fontWeight: 600 }}>{session.type === 'à distance' ? 'Teams' : session.salle}</span> <br />
    </td>
  );
};
