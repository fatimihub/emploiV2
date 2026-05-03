import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState, useEffect } from "react";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { useParams } from "react-router-dom";
import api from "../../../api/apiConfig.tsx";
import PopupError from '../../../components/PopupError';
import PopupSuccess from '../../../components/PopupSuccess';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import Modal from '../../../components/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faBook, faChalkboardTeacher, faDoorOpen, faLayerGroup, faTimesCircle, faInfoCircle, faPlus, faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface Session {
  id: string | number;
  timeshot: string;
  module: string;
  formateur: string;
  formateurId: number;
  salle: string;
  color: string;
  type: string;
  day: string;
}

interface Day {
  [key: string]: Session[];
}

interface TimetableGroup {
  code_branch: string;
  niveau: string;
  groupe: string;
  timetable: Day[];
  valid_form: string;
  year_of_formation: number | string;
  academic_year?: string;
  nbr_hours_in_week: number;
  id: number | string;
  groupId: string; // Added groupId to the interface
}

// Draggable session card component
function DraggableSession({ id, children }: { id: string, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        cursor: 'grab',
        zIndex: isDragging ? 100 : 'auto',
      }}
    >
      {children}
    </div>
  );
}

// Droppable timetable cell
function DroppableCell({ id, children, isPossibleDrop }: { id: string, children: React.ReactNode, isPossibleDrop: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  // Highlight cell if it's a valid drop target
  const getBackground = () => {
    if (isOver) return '#e0e7ff'; // Indigo-100 when hovering
    if (isPossibleDrop) return '#e5e7eb'; // Gray-200 for better visibility
    return '#ffffff'; // Default white
  };

  return (
    <td
      ref={setNodeRef}
      style={{ 
        background: getBackground(), 
        transition: 'background 0.2s ease',
        boxShadow: isPossibleDrop && !isOver ? 'inset 0 0 0 2px #d1d5db' : 'none'
      }}
      className={`lg:px-2 py-2 px-1 text-center border w-[22%] relative ${isPossibleDrop ? 'cursor-pointer' : ''}`}
    >
      {children}
    </td>
  );
}

// Helper to check if a session can be added to a specific cell based on constraints
function canAddSessionToCell(
  day: string, 
  timeshot: string, 
  timetableGroup: TimetableGroup | null
): boolean {
  if (!timetableGroup) return false;
  
  // Check if the group already has a session at this time
  const dayData = timetableGroup.timetable.find(d => Object.keys(d)[0] === day);
  if (!dayData) return true; // Day not found, assume it's available
  
  const sessions = Object.values(dayData)[0] as Session[];
  const hasExistingSession = sessions.some(s => s.timeshot === timeshot);
  if (hasExistingSession) return false; // Group already has a session at this time
  
  // Check Saturday afternoon constraint (no sessions after 13:30 on Saturday)
  if (day === 'Samedi' && (timeshot === '13:30-16:00' || timeshot === '16:00-18:30')) {
    return false;
  }
  
  // Check 2.5 hour gap rule with remote sessions
  const remoteSessions = sessions.filter(s => s.type === 'à distance');
  if (remoteSessions.length > 0) {
    // Time slot definitions in minutes from start of day
    const timeSlotMinutes = {
      "08:30-11:00": { start: 8 * 60 + 30, end: 11 * 60 },
      "11:00-13:30": { start: 11 * 60, end: 13 * 60 + 30 },
      "13:30-16:00": { start: 13 * 60 + 30, end: 16 * 60 },
      "16:00-18:30": { start: 16 * 60, end: 18 * 60 + 30 }
    };
    
    const targetSlot = timeSlotMinutes[timeshot as keyof typeof timeSlotMinutes];
    if (!targetSlot) return false;
    
    // Check gap with each remote session
    for (const remoteSession of remoteSessions) {
      const remoteSlot = timeSlotMinutes[remoteSession.timeshot as keyof typeof timeSlotMinutes];
      if (!remoteSlot) continue;
      
      // Calculate gap between slots
      let gap = 0;
      if (targetSlot.start > remoteSlot.end) {
        gap = targetSlot.start - remoteSlot.end;
      } else if (remoteSlot.start > targetSlot.end) {
        gap = remoteSlot.start - targetSlot.end;
      }
      
      // Require at least 150 minutes (2.5 hours) gap
      if (gap < 150) {
        return false;
      }
    }
  }
  
  return true; // Cell is available for adding a session
}

// Check if a session can be DROPPED into a cell during drag and drop
function canDropSessionToCell(
  day: string,
  timeshot: string,
  timetableGroup: TimetableGroup | null,
  draggedSession: Session | null,
  availabilityData: any
): boolean {
  if (!timetableGroup || !draggedSession) return false;

  // 1. Same cell is always valid (original position)
  if (draggedSession.day === day && draggedSession.timeshot === timeshot) return true;

  // 2. Check if the group already has A DIFFERENT session at this time
  const dayData = timetableGroup.timetable.find(d => Object.keys(d)[0] === day);
  const daySessions = dayData ? (Object.values(dayData)[0] as Session[]) : [];
  
  if (daySessions.some(s => s.timeshot === timeshot)) {
    return false; // Cell occupied by another module for this group
  }

  // 3. Saturday afternoon constraint
  if (day === 'Samedi' && (timeshot === '13:30-16:00' || timeshot === '16:00-18:30')) {
    return false;
  }

  // 4. Formateur busy elsewhere check (across all groups) and Profile availability
  if (!availabilityData || !availabilityData.weeklyData) {
    return false; // Wait for teacher availability data before showing any highlights
  }

  const availabilityForDay = availabilityData.weeklyData[day] || { availableSlots: [], busySlots: [] };
  const { availableSlots = [], busySlots = [] } = availabilityForDay;
  
  // Must be in teacher's profile availability
  if (!availableSlots.includes(timeshot)) {
    return false;
  }

  // Must not be busy in another group
  if (busySlots.some((s: any) => s.timeshot === timeshot && String(s.timetableId) !== String(timetableGroup.id))) {
    return false;
  }

  // 5. Mode switching gap requirement (2.5h between remote and presential)
  const oppositeTypeSessions = daySessions.filter(s => s.type !== draggedSession.type);
  if (oppositeTypeSessions.length > 0) {
    const timeSlotMinutes = {
      "08:30-11:00": { start: 8 * 60 + 30, end: 11 * 60 },
      "11:00-13:30": { start: 11 * 60, end: 13 * 60 + 30 },
      "13:30-16:00": { start: 13 * 60 + 30, end: 16 * 60 },
      "16:00-18:30": { start: 16 * 60, end: 18 * 60 + 30 }
    };
    const targetSlot = timeSlotMinutes[timeshot as keyof typeof timeSlotMinutes];
    if (!targetSlot) return false;

    for (const other of oppositeTypeSessions) {
      const otherSlot = timeSlotMinutes[other.timeshot as keyof typeof timeSlotMinutes];
      if (!otherSlot) continue;

      let gap = 0;
      if (targetSlot.start >= otherSlot.end) {
        gap = targetSlot.start - otherSlot.end;
      } else if (otherSlot.start >= targetSlot.end) {
        gap = otherSlot.start - targetSlot.end;
      }
      
      if (gap < 150) return false;
    }
  }

  return true;
}


export default function PresonaliserEmploiDuTemps() {
  const { timetableId } = useParams();

  const timeShots = [
    "08:30-11:00",
    "11:00-13:30",
    "13:30-16:00",
    "16:00-18:30",
  ];
  const [timetableGroup, setTimetableGroup] = useState<TimetableGroup | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [formateurs, setFormateurs] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeDragSession, setActiveDragSession] = useState<Session | null>(null);
  const [formateurAvailability, setFormateurAvailability] = useState<any>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [afficherPopupError, setAfficherPopupError] = useState(false);
  const [errors, setErrors] = useState('');
  const [afficherPopupSuccess, setAfficherPopupSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddSession, setShowAddSession] = useState(false);
  const [addSessionForm, setAddSessionForm] = useState({
    day: '',
    timeSlot: '',
    moduleId: '',
    formateurId: '',
    classroomId: '',
    type: 'présentiel',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [noSlotAvailable] = useState(false);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [selectedCell] = useState<{ day: string, timeshot: string } | null>(null);

  useEffect(() => {
    if (!showAddSession) return;
    if (!timetableGroup?.groupId) return;
    if (!addSessionForm.day || !addSessionForm.timeSlot) {
      setAvailableModules([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(
          `/available-modules/${timetableGroup.groupId}?day=${addSessionForm.day}&timeSlot=${addSessionForm.timeSlot}`
        );
        if (!cancelled) {
          setAvailableModules(res.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setAvailableModules([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showAddSession, addSessionForm.day, addSessionForm.timeSlot, timetableGroup?.groupId]);

  // Fetch modules, formateurs, classrooms for dropdowns
  useEffect(() => {
    if (!timetableGroup || !timetableGroup.groupId) return;
    // Fetch modules logic replaced by direct available modules fetch in modal effect
    api.get(`/all-modules/by-group/${timetableGroup.groupId}`);
    // Fetch all formateurs
    api.get('/formateurs').then(res => setFormateurs(res.data || []));
    // Fetch all classrooms
    api.get('/classrooms').then(res => setClassrooms(res.data || []));
  }, [timetableGroup]);

  // When module changes, provide smart defaults for formateur and classroom
  useEffect(() => {
    if (!addSessionForm.moduleId || availableModules.length === 0) return;
    
    const selectedAvailableModule = availableModules.find(m => String(m.id) === String(addSessionForm.moduleId));
    if (!selectedAvailableModule) {
      // If selected module is not in available modules, clear formateur
      setAddSessionForm(prev => ({ ...prev, formateurId: '', classroomId: '' }));
      return;
    }

    // Only set defaults if formateur and classroom are not already selected
    setAddSessionForm(prev => {
      const updates: any = {};
      
      // Set formateur default if not already selected
      if (!prev.formateurId) {
        updates.formateurId = String(selectedAvailableModule.formateurId);
      }
      
      // Set classroom default if not already selected
      if (!prev.classroomId && selectedAvailableModule.classroomId) {
        updates.classroomId = String(selectedAvailableModule.classroomId);
      }
      
      return { ...prev, ...updates };
    });
  }, [addSessionForm.moduleId, availableModules]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetableGroup || !timetableGroup.groupId) {
      setAfficherPopupError(true);
      setErrors("Impossible d'ajouter la séance : le groupe n'est pas chargé.");
      return;
    }
    setIsAdding(true);
    try {
      // First validate with backend
      const validationRes = await api.post(`/group/${timetableGroup.groupId}/validate-add-session`, addSessionForm);
      if (!validationRes.data.valid) {
        setAfficherPopupError(true);
        setErrors(validationRes.data.errors.join(' '));
        return;
      }
      
      // If validation passes, add the session
      const res = await api.post(`/group/${timetableGroup.groupId}/add-session`, addSessionForm);
      if (res.data.success) {
        setShowAddSession(false);
        setAddSessionForm({ day: '', timeSlot: '', moduleId: '', formateurId: '', classroomId: '', type: 'présentiel' });
        
        // Update the timetable group with the returned data
        if (res.data.updatedTimetable) {
          setTimetableGroup(res.data.updatedTimetable);
        }
        
        setAfficherPopupSuccess(true);
        setSuccessMessage('Séance ajoutée avec succès !');
      }
    } catch (err: any) {
      let message = 'Erreur lors de l\'ajout de la séance.';
      if (err.response?.status === 404) {
        message = "Impossible d'ajouter la séance : le groupe n'existe pas ou n'est pas valide.";
      } else if (err.response?.data?.errors) {
        message = Array.isArray(err.response.data.errors) 
          ? err.response.data.errors.join(' ') 
          : err.response.data.errors;
      }
      setAfficherPopupError(true);
      setErrors(message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete || !timetableGroup) return;

    setIsDeleting(true);
    try {
      const res = await api.delete(`/timetables/sessions/${sessionToDelete.id}`);
      if (res.data.success) {
        setShowDeleteConfirm(false);
        setTimetableGroup(res.data.updatedTimetable);
        setAfficherPopupSuccess(true);
        setSuccessMessage('Séance supprimée avec succès !');
        setSessionToDelete(null);
      }
    } catch (err: any) {
      setAfficherPopupError(true);
      setErrors(err.response?.data?.message || 'Erreur lors de la suppression de la séance.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlusClick = async (day: string, timeshot: string) => {
    // Only allow click if the cell is actually available for adding sessions
    if (!canAddSessionToCell(day, timeshot, timetableGroup)) {
      setAfficherPopupError(true);
      setErrors("Ce créneau n'est pas disponible pour ajouter une séance. Contraintes possibles : groupe déjà occupé, horaire non autorisé (samedi après-midi), ou règle d'espacement de 2.5h avec les séances à distance.");
      return;
    }
    
    try {
      // Fetch available modules for this specific time slot and day
      console.log(`🔍 Fetching available modules for ${day} ${timeshot}`);
      const availableModulesRes = await api.get(`/available-modules/${timetableGroup?.groupId}?day=${day}&timeSlot=${timeshot}`);
      console.log(`📊 Available modules received:`, availableModulesRes.data);
      setAvailableModules(availableModulesRes.data);
      
      // Show the add session form with pre-filled values
      setAddSessionForm(prev => ({
        ...prev,
        day: day,
        timeSlot: timeshot,
        moduleId: '', // Reset module selection
        formateurId: '', // Reset formateur selection
        classroomId: '' // Reset classroom selection
      }));
      setShowAddSession(true);
    } catch (err: any) {
      console.error('❌ Error fetching available modules:', err);
      setAfficherPopupError(true);
      setErrors('Erreur lors du chargement des modules disponibles: ' + (err.response?.data?.error || err.message));
    }
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // dnd-kit drag end handler
  const handleDragStart = async (event: DragStartEvent) => {
    const { active } = event;
    const [day, timeshot] = active.id.toString().split('---');
    if (!timetableGroup) return;

    const dayObj = timetableGroup.timetable.find(d => Object.keys(d)[0] === day);
    if (!dayObj) return;

    const session = (Object.values(dayObj)[0] as Session[]).find(s => s.timeshot === timeshot);
    if (session) {
      setActiveDragSession(session);
      
      // Fetch teacher's availability and busy slots from backend for THE WHOLE WEEK
      try {
        const res = await api.get(`/formateur/${session.formateurId}/busy-slots`);
        if (res.data.success) {
          setFormateurAvailability(res.data);
        }
      } catch (err) {
        console.error("Error fetching formateur availability:", err);
        setFormateurAvailability(null);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragSession(null);
    setFormateurAvailability(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragSession(null);
    setFormateurAvailability(null);
    if (!over || !active) return;
    if (!timetableGroup) return;

    // Parse ids
    const [fromDay, fromTimeshot] = active.id.toString().split('---');
    const [toDay, toTimeshot] = over.id.toString().split('---');

    // Prevent dropping outside timetable
    if (!fromDay || !fromTimeshot || !toDay || !toTimeshot) {
      setAfficherPopupError(true);
      setErrors('Déplacement en dehors du tableau non autorisé.');
      return;
    }
    // Prevent dropping on Samedi in forbidden timeslots
    if (toDay === 'Samedi' && (toTimeshot === '13:30-16:00' || toTimeshot === '16:00-18:30')) {
      setAfficherPopupError(true);
      setErrors('Impossible d’ajouter une session à Samedi après 13:30.');
      return;
    }

    // Prepare move data for backend
    const moveData = {
      timetableId,
      from: { day: fromDay, timeshot: fromTimeshot },
      to: { day: toDay, timeshot: toTimeshot }
    };
    try {
      const res = await api.post(`/timetables/update-session-position`, moveData);
      // Use the backend's grouped/ordered timetable directly
      setTimetableGroup(res.data.updatedTimetable);
      setAfficherPopupSuccess(true);
      setSuccessMessage('Session déplacée avec succès !');
      setAfficherPopupError(false);
      setErrors('');
    } catch (err: any) {
      setAfficherPopupError(true);
      setErrors(err.response?.data?.message || 'Erreur lors du déplacement');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/timetables/${timetableId}`);

      if (res && res.data) {
        setTimetableGroup(res.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'emploi du temps');
      console.error('Error fetching timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timetableId]);

  
  // Show loading state
  if (loading) {
    return (
      <div className="lg:w-[93%] mx-auto h-fit lg:px-10 lg:py-5 p-5 flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="text-center flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-4 border-blue-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Chargement de l'emploi du temps...</h2>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="lg:w-[93%] mx-auto h-fit lg:px-10 lg:py-5 p-5 flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">
            <FontAwesomeIcon icon={faTimesCircle} />
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:w-[93%] mx-auto  h-fit lg:px-10 lg:py-5  p-5" style={{ overflowX: 'hidden' }}>
      <div className="flex mb-10">
        <ButtonNavigateBack />
      </div>
      {/* Add Session Modal */}
      <Modal isOpen={showAddSession} onClose={() => setShowAddSession(false)}>
        <div className="text-2xl font-bold mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-green-600" />
          Ajouter une séance
        </div>
        {noSlotAvailable && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
            <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 text-xl" />
            Aucun créneau disponible pour ajouter une séance à ce module.
          </div>
        )}
        <form onSubmit={handleAddSession} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500" /> Jour
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.day} onChange={e => setAddSessionForm(f => ({ ...f, day: e.target.value }))} required>
                <option value="">Sélectionnez un jour</option>
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="text-blue-500" /> Créneau
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.timeSlot} onChange={e => setAddSessionForm(f => ({ ...f, timeSlot: e.target.value }))} required>
                <option value="">Sélectionnez un créneau</option>
                {timeShots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faBook} className="text-blue-500" /> Module
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.moduleId} onChange={e => setAddSessionForm(f => ({ ...f, moduleId: e.target.value }))} required>
                <option value="">Sélectionnez un module</option>
                {availableModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              {availableModules.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                  Aucun module disponible pour ce créneau horaire
                </p>
              )}
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faLayerGroup} className="text-blue-500" /> Type
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.type} onChange={e => setAddSessionForm(f => ({ ...f, type: e.target.value }))} required>
                <option value="présentiel">Présentiel</option>
                <option value="à distance">À distance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faChalkboardTeacher} className="text-blue-500" /> Formateur
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.formateurId} onChange={e => setAddSessionForm(f => ({ ...f, formateurId: e.target.value }))} required>
                <option value="">Sélectionnez un formateur</option>
                {formateurs.map(f => {
                  // Check if this formateur is available at the selected time slot
                  const isAvailableAtTimeSlot = availableModules.some(m => m.formateurId === f.id);
                  return (
                    <option key={f.id} value={f.id} disabled={!isAvailableAtTimeSlot}>
                      {f.name} {!isAvailableAtTimeSlot && ' (Occupé à ce créneau)'}
                    </option>
                  );
                })}
              </select>
              {formateurs.filter(f => availableModules.some(m => m.formateurId === f.id)).length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                  Aucun formateur disponible pour ce créneau horaire
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faDoorOpen} className="text-blue-500" /> Salle
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.classroomId} onChange={e => setAddSessionForm(f => ({ ...f, classroomId: e.target.value }))} required>
                <option value="">Sélectionnez une salle</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-2 text-sm text-gray-700">
            <div className="flex items-center gap-2 font-semibold text-blue-800 mb-1">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" />
              Résumé de la séance
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><span className="text-gray-500">Module:</span> <span className="font-medium text-gray-900">{addSessionForm.moduleId && availableModules.find(m => m.id === addSessionForm.moduleId)?.label || '-'}</span></div>
              <div><span className="text-gray-500">Formateur:</span> <span className="font-medium text-gray-900">{addSessionForm.formateurId && formateurs.find(f => f.id === addSessionForm.formateurId)?.name || '-'}</span></div>
              <div><span className="text-gray-500">Salle:</span> <span className="font-medium text-gray-900">{addSessionForm.type === 'à distance' ? 'Teams' : (addSessionForm.classroomId && classrooms.find(c => c.id === addSessionForm.classroomId)?.label || '-')}</span></div>
              <div><span className="text-gray-500">Horaire:</span> <span className="font-medium text-gray-900">{addSessionForm.day || '-'} {addSessionForm.timeSlot ? `(${addSessionForm.timeSlot})` : ''}</span></div>
              <div><span className="text-gray-500">Type:</span> <span className="font-medium text-gray-900">{addSessionForm.type || '-'}</span></div>
            </div>
          </div>

          <div className="flex justify-end mt-6 gap-3">
            <button type="button" className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-colors flex items-center gap-2 shadow-sm" onClick={() => setShowAddSession(false)}>
              <FontAwesomeIcon icon={faTimesCircle} />
              Annuler
            </button>
            <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={isAdding || noSlotAvailable}>
              {isAdding ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-2 border-white"></div>
              ) : (
                <FontAwesomeIcon icon={faPlus} />
              )}
              {isAdding ? 'Ajout en cours...' : 'Ajouter la séance'}
            </button>
          </div>
        </form>
      </Modal>

      <div>
        <h1 className="text-center text-2xl font-bold">EMPLOI DU TEMPS</h1>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className=" font-semibold">
              EFP :{" "}
              <span className=" font-bold " style={{ color: "blue" }}>
                ISTA CITE DE L'AIR
              </span>
            </h2>
            <h2 className=" font-semibold">
              Filiére :{" "}
              <span className=" font-semibold " style={{ color: "blue" }}>
                {timetableGroup?.code_branch}
              </span>
            </h2>
            <h2 className=" font-semibold">
              Niveau :{" "}
              <span className=" font-semibold " style={{ color: "blue" }}>
                {timetableGroup?.niveau}
              </span>
            </h2>
          </div>
          <div>
            <h2 className=" font-semibold mb-5">
              Année de formation : {timetableGroup?.academic_year || '2024-2025'}
            </h2>
            <h2 className=" font-semibold">
              Groupe :{" "}
              <span className=" font-semibold " style={{ color: "blue" }}>
                {timetableGroup?.groupe}
              </span>{" "}
            </h2>
          </div>
        </div>
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <table className="w-full " key={timetableGroup?.id || 'timetable-loading'}>
            <thead>
              <tr>
                <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[12%]"> </th>
                {timeShots.map((timeshot) => (
                  <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]" key={timeshot}>
                    {timeshot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timetableGroup && timetableGroup.timetable.map((day) => {
                const dayLabel = Object.keys(day)[0];
                const sessions = Array.isArray(Object.values(day)[0]) ? Object.values(day)[0] : [];
                return (
                  <tr key={dayLabel}>
                    <td style={{ background: '#6b7280', color: '#fff' }} className="lg:px-5 lg:py-7 py-5 px-3 font-bold text-center border w-[12%]">
                      {dayLabel}
                    </td>
                    {timeShots.map((timeshot) => {
                      const session = sessions.find((s: Session) => s.timeshot === timeshot);
                      const isPossibleDrop = activeDragSession ? canDropSessionToCell(dayLabel, timeshot, timetableGroup, activeDragSession, formateurAvailability) : false;
                      const cellId = dayLabel + '---' + timeshot;
                      return (
                        <DroppableCell
                          key={cellId}
                          id={cellId}
                          isPossibleDrop={isPossibleDrop}
                        >
                          {session ? (
                            <DraggableSession id={cellId}>
                              <div
                                style={{ background: session.color, borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '0.5rem 1rem', border: '1px solid #e5e7eb', display: 'block', minWidth: 'unset', width: '100%', zIndex: 999 }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="text-left">
                                    <span style={{ color: '#111827', fontWeight: 600 }}>{session.module}</span> <br />
                                    <span style={{ color: '#111827', fontWeight: 600 }}>{session.formateur}</span> <br />
                                    <span style={{ color: '#111827', fontWeight: 600 }}>{session.type === 'à distance' ? 'Teams' : session.salle}</span> <br />
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSessionToDelete(session);
                                      setShowDeleteConfirm(true);
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100/50 transition-colors"
                                    title="Supprimer la séance"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </div>
                              </div>
                            </DraggableSession>
                          ) : canAddSessionToCell(dayLabel, timeshot, timetableGroup) ? (
                            // Show plus icon only in cells where sessions can be added (respecting constraints)
                            <div 
                              className="flex justify-center items-center h-full min-h-[80px] cursor-pointer group"
                              onClick={() => handlePlusClick(dayLabel, timeshot)}
                            >
                              <div className="text-blue-500 group-hover:text-blue-700 bg-transparent group-hover:bg-blue-50 p-2 rounded-full transition-all duration-200 transform group-hover:scale-110" title="Ajouter une séance">
                                <FontAwesomeIcon icon={faPlus} className="text-lg" />
                              </div>
                            </div>
                          ) : (
                            // Empty cell but not available for adding sessions (due to constraints)
                            <div className="flex justify-center items-center h-full min-h-[80px] opacity-30">
                              <div className="text-gray-400 text-xs text-center">
                                Non disponible
                              </div>
                            </div>
                          )}
                        </DroppableCell>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DndContext>
        <div className="flex justify-between">
          <p>
            Cet emploi du temps est valable _ partir du{" "}
            <span className=" font-semibold " style={{ color: "blue" }}>
              {timetableGroup?.valid_form}
            </span>
          </p>
          <p>
            Nombre d'heures: {" "}
            <span className=" font-semibold " style={{ color: "blue" }}>
              {(() => {
                let totalSessions = 0;
                timetableGroup?.timetable.forEach((dayObj) => {
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
        {afficherPopupError && (
          <PopupError
            afficherPopupError={afficherPopupError}
            errors={errors}
            setAfficherPopupError={setAfficherPopupError}
          />
        )}
        {afficherPopupSuccess && (
          <PopupSuccess
            afficherPopupSuccess={afficherPopupSuccess}
            messageSuccess={successMessage}
            setAfficherPopupSuccess={setAfficherPopupSuccess}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4 text-red-600">
            <div className="bg-red-100 p-3 rounded-full">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl" />
            </div>
            <h2 className="text-xl font-bold">Confirmer la suppression</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible.
          </p>

          {sessionToDelete && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Module:</span>
                <span className="font-semibold">{sessionToDelete.module}</span>
                <span className="text-gray-500">Formateur:</span>
                <span className="font-semibold">{sessionToDelete.formateur}</span>
                <span className="text-gray-500">Salle:</span>
                <span className="font-semibold">{sessionToDelete.salle}</span>
                <span className="text-gray-500">Créneau:</span>
                <span className="font-semibold">{sessionToDelete.timeshot}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isDeleting}
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteSession}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Suppression...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrash} />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Session Info Modal */}
      <Modal isOpen={showSessionInfo} onClose={() => setShowSessionInfo(false)}>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 text-blue-600">
            <div className="bg-blue-100 p-3 rounded-full">
              <FontAwesomeIcon icon={faInfoCircle} className="text-2xl" />
            </div>
            <h2 className="text-xl font-bold">Informations du créneau</h2>
          </div>
          
          {selectedCell && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <span className="text-gray-500 font-medium">Jour:</span>
                <span className="font-semibold text-gray-900">{selectedCell.day}</span>
                <span className="text-gray-500 font-medium">Créneau:</span>
                <span className="font-semibold text-gray-900">{selectedCell.timeshot}</span>
                <span className="text-gray-500 font-medium">Groupe:</span>
                <span className="font-semibold text-gray-900">{timetableGroup?.groupe}</span>
                <span className="text-gray-500 font-medium">Filière:</span>
                <span className="font-semibold text-gray-900">{timetableGroup?.code_branch}</span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Ce créneau est disponible pour ajouter une nouvelle séance. Cliquez sur le bouton "Ajouter une séance" ci-dessous pour commencer.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowSessionInfo(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                setShowSessionInfo(false);
                setShowAddSession(true);
                // Pre-fill the add session form with selected cell info
                if (selectedCell) {
                  setAddSessionForm(prev => ({
                    ...prev,
                    day: selectedCell.day,
                    timeSlot: selectedCell.timeshot
                  }));
                }
              }}
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Ajouter une séance
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
