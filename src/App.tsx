import { Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
// Import all your components
import Login from "./Auth/Login";
import Layout from "./layouts/Layout";
import Salles from "./Dashboard/pages/Salle/Salles";
import Dashboard from "./Dashboard/dashboard";
import Register from "./Auth/Register";
import Profile from "./Dashboard/pages/profile/Profile";
import AjouterSalle from "./Dashboard/pages/Salle/AjouterSalle";
import HistoriqueEmploisDuTempsDesGroups from "./Dashboard/pages/HistoriqueEmploisDuTemps/HistoriqueEmploisDuTempsDesGroups";
import HistoriqueEmploisDuTempsDesFormateurs from "./Dashboard/pages/HistoriqueEmploisDuTemps/HistoriqueEmploisDuTempsDesFormateurs";
import HistoriqueEmploisDuTempsDesSalles from "./Dashboard/pages/HistoriqueEmploisDuTemps/HistoriqueEmploisDuTempsDesSalles";
import Parameter from "./Dashboard/pages/Parameter/Parameter";
import GroupesEnStage from "./Dashboard/pages/Parameter/GroupesEnStage";
import FormateursNoDisponbile from "./Dashboard/pages/Parameter/FormateursNoDisponbile";
import SallesNoDisponbile from "./Dashboard/pages/Parameter/SallesNoDisponbile";
import PersenaliserLesNombresHeuresParSemaineDeGroupe from "./Dashboard/pages/Parameter/PersenaliserLesNombresHeuresParSemaineDeGroupe";

import AfficherEmploiDuTempsDeGroupe from "./Dashboard/pages/AfficherEmploiDuTemps/AfficherEmploiDuTempsDeGroupe";
import AfficherEmploiDuTempsDeFormateur from "./Dashboard/pages/AfficherEmploiDuTemps/AfficherEmploiDuTempsDeFormateur";
import AfficherEmploiDuTempsDeSalle from "./Dashboard/pages/AfficherEmploiDuTemps/AfficherEmploiDuTempsDeSalle";
import GenererEmploisDuTemps from "./Dashboard/pages/GenererEmploisDuTemps/GenererEmploisDuTemps";
import PresonaliserEmploiDuTemps from "./Dashboard/pages/GenererEmploisDuTemps/PresonaliserEmlpoiDuTemps";
import ListeDesEmploisDuTemps from "./Dashboard/pages/GenererEmploisDuTemps/ListeDesEmploisDuTemps";
import ListeEmploisDuTempsEnAnnee from "./Dashboard/pages/Parameter/ListeEmploisDuTempsEnAnnee";
import ListeDesEmploisDuTempsActifDesGroupes from "./Dashboard/pages/EmploisDesTempsActif/ListeDesEmploisDuTempsActifDesGroupes";
import ListeDesEmploisDuTempsActifDesFormateur from "./Dashboard/pages/EmploisDesTempsActif/ListeDesEmploisDuTempsActifDesFormateur";
import ListeDesEmploisDuTempsActifDesSalles from "./Dashboard/pages/EmploisDesTempsActif/ListeDesEmploisDuTempsActifDesSalles";
import AfficherEmploiDuTempsDeFormateurEnAnnee from "./Dashboard/pages/Parameter/AfficherEmploiDuTempsDeFormateurEnAnnee";
import ListeDesGroupesPourPersenaliserLesNombresHeuresParSemaine from "./Dashboard/pages/Parameter/ListeDesGroupesPourPersenaliserLesNombresHeuresParSemaine";
import ListeDesFuision from "./Dashboard/pages/Parameter/ListeDesFuision";
import PersenaliserLesNombresHeuresParSemaineDeFuision from "./Dashboard/pages/Parameter/PersenaliserLesNombresHeuresParSemaineDeFuision";
import { useState, createContext, useContext } from "react";
import AfficherEmploiDuTempsHistoriqueDeGroupe from "./Dashboard/pages/HistoriqueEmploisDuTemps/AfficherEmploiDuTempsHistoriqueDeGroupe";



// --- Auth Context Setup ---

interface AuthContextType {
  isAuth: boolean;
  setIsAuth: (value: boolean) => void;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// --- Protected Route Component ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuth } = useAuth();

  if (!isAuth) {
    console.log(`ProtectedRoute: Not authenticated at hash "${window.location.hash}", redirecting to /login`);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// --- App Component ---

function App() {
  const [isAuth, setIsAuth] = useState<boolean>(() => {
    const token = localStorage.getItem('token');
    return !!token && token.length > 0;
  });

  const login = (token: string) => {
    console.log('Login called, saving token and setting isAuth=true');
    localStorage.setItem('token', token);
    setIsAuth(true);
  };

  const logout = () => {
    console.log('Logout called, removing token and setting isAuth=false');
    localStorage.removeItem('token');
    setIsAuth(false);
  };


  console.log('App Rendering Routes with auth state:', { isAuth });

  return (
    <AuthContext.Provider value={{ isAuth, setIsAuth, login, logout }}>
      <Routes>

        {/* Public routes */}
        <Route path="/login" element={isAuth ? <Navigate to="/administrateur/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuth ? <Navigate to="/administrateur/dashboard" replace /> : <Register />} />

        {/* Protected routes: Wrapped by ProtectedRoute */}
        <Route path="/administrateur" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard">
             <Route index element={<Dashboard />} />
             <Route path="emplois-du-temps-actif">
                <Route path="groupes" element={<ListeDesEmploisDuTempsActifDesGroupes />} />
                <Route path="formateurs" element={<ListeDesEmploisDuTempsActifDesFormateur />} />
                <Route path="salles" element={<ListeDesEmploisDuTempsActifDesSalles />} />
             </Route>
          </Route>
          <Route path="salles" element={<Salles />} />
          <Route path="ajouter-salle" element={<AjouterSalle />} />

          {/* Afficher (Display) routes */}
          <Route path="afficher">
             <Route path="afficher-emploi-du-temps-de-groupe/:timetableId" element={<AfficherEmploiDuTempsDeGroupe />} />
             <Route path="afficher-emploi-du-temps-de-formateur/:mleFormateur" element={<AfficherEmploiDuTempsDeFormateur />} />
             <Route path="afficher-emploi-du-temps-de-salle/:salleId" element={<AfficherEmploiDuTempsDeSalle />} />
          </Route>

          {/* Generer (Generate) routes */}
          <Route path="generer-emplois-du-temps">
            <Route index element={<GenererEmploisDuTemps />} />
            <Route path="presonaliser-emploi-du-temps/:timetableId" element={<PresonaliserEmploiDuTemps />} />
            <Route path="liste-des-emplois-du-temps" element={<ListeDesEmploisDuTemps />} />
          </Route>

          {/* Historique (History) routes */}
          <Route path="historique-emplois-du-temps-des-groups" element={<HistoriqueEmploisDuTempsDesGroups />} />
          <Route path="historique-emplois-du-temps-des-groups/:timetableId" element={<AfficherEmploiDuTempsHistoriqueDeGroupe />} />
          <Route path="historique-emplois-du-temps-des-formateurs" element={<HistoriqueEmploisDuTempsDesFormateurs />} />
          <Route path="historique-emplois-du-temps-des-salles" element={<HistoriqueEmploisDuTempsDesSalles />} />

          {/* Parameters routes */}
          <Route path="parameters">
             <Route index element={<Parameter />} />
             <Route path="groupes-en-stage" element={<GroupesEnStage />} />
             <Route path="formateurs-no-disponible" element={<FormateursNoDisponbile />} />
             <Route path="salles-no-disponible" element={<SallesNoDisponbile />} />
             <Route path="persenaliser-les-nomber-d-heures/:groupeId" element={<PersenaliserLesNombresHeuresParSemaineDeGroupe />} />
             <Route path="liste-emplois-du-temps-en-annee" element={<ListeEmploisDuTempsEnAnnee />} />
             <Route path="afficher-emploi-du-temps-de-formateur-en-annee/:mleFormateur" element={<AfficherEmploiDuTempsDeFormateurEnAnnee />} />
             <Route path="liste-groupes-perso-heures" element={<ListeDesGroupesPourPersenaliserLesNombresHeuresParSemaine />} />
             <Route path="liste-fusions" element={<ListeDesFuision />} />
             <Route path="persenaliser-heures-fusion/:fusionId" element={<PersenaliserLesNombresHeuresParSemaineDeFuision />} />
          </Route>

          {/* Profile route */}
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Redirect for root path - handle based on auth state to avoid loops */}
        <Route path="/" element={<Navigate to={isAuth ? "/administrateur/dashboard" : "/login"} replace />} />
        
        {/* Catch-all route for 404s or other unmatched paths */}
        <Route
          path="*"
          element={<Navigate to={isAuth ? "/administrateur/dashboard" : "/login"} replace />}
        />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;