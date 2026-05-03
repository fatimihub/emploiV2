import { createContext, useEffect, useState } from "react";
import api from "../api/apiConfig";

interface Filiere {
  id: number;
  label: string;
  code_branch: string;
}

interface FiliereContext {
  filiers: Filiere[];
}

const filieresContext = createContext<FiliereContext>({} as FiliereContext);

export default function FilieresProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filiers, setFiliers] = useState<Filiere[]>([]);

  const fetchData = async () => {
    try {
      const res = await api.get("/branches");

      if (res && res.data) {
        setFiliers(res.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  return (
    <filieresContext.Provider value={{ filiers: filiers }}>
      {children}
    </filieresContext.Provider>
  );
}

export { filieresContext };
