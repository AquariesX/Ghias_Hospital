"use client";

import { useState } from "react";
import {
  BedDouble,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Building2,
  Power,
  Info,
} from "lucide-react";

export type BedStatus = "FREE" | "SCHEDULED" | "OCCUPIED";

export interface BedItem {
  id: string;
  bedNumber: string;
  roomId: string;
  status: BedStatus;
  isActive: boolean;
  notes: string | null;
  currentPatient?: {
    admissionId: string;
    admissionNumber: string;
    patientName: string;
    mrNumber: string | null;
  } | null;
}

export interface RoomItem {
  id: string;
  roomNumber: string;
  name: string | null;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  beds: BedItem[];
}

interface RoomsBedsClientProps {
  initialRooms: RoomItem[];
}

export default function RoomsBedsClient({ initialRooms }: RoomsBedsClientProps) {
  const [rooms, setRooms] = useState<RoomItem[]>(initialRooms);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Feedback alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [isAddBedOpen, setIsAddBedOpen] = useState(false);
  const [targetRoomForBed, setTargetRoomForBed] = useState<RoomItem | null>(null);
  const [editingBed, setEditingBed] = useState<{ room: RoomItem; bed: BedItem } | null>(null);

  // Form states - Room
  const [roomNumberInput, setRoomNumberInput] = useState("");
  const [roomNameInput, setRoomNameInput] = useState("");
  const [roomDeptInput, setRoomDeptInput] = useState("INPATIENT");
  const [roomIsActiveInput, setRoomIsActiveInput] = useState(true);

  // Form states - Bed
  const [bedNumberInput, setBedNumberInput] = useState("");
  const [bedNotesInput, setBedNotesInput] = useState("");
  const [bedStatusInput, setBedStatusInput] = useState<BedStatus>("FREE");
  const [bedIsActiveInput, setBedIsActiveInput] = useState(true);
  const [bedTargetRoomId, setBedTargetRoomId] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const showNotification = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 6000);
    }
  };

  // Metrics
  const totalRooms = rooms.length;
  const allBeds = rooms.flatMap((r) => r.beds);
  const totalBeds = allBeds.length;
  const freeBeds = allBeds.filter((b) => b.status === "FREE" && b.isActive).length;
  const scheduledBeds = allBeds.filter((b) => b.status === "SCHEDULED" && b.isActive).length;
  const occupiedBeds = allBeds.filter((b) => b.status === "OCCUPIED" && b.isActive).length;
  const deactivatedBeds = allBeds.filter((b) => !b.isActive).length;

  // Department options derived from rooms
  const departments = Array.from(
    new Set(rooms.map((r) => r.department).filter(Boolean))
  ) as string[];

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(search.toLowerCase())) ||
      r.beds.some((b) => b.bedNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesDept =
      selectedDept === "ALL" || (r.department && r.department.toUpperCase() === selectedDept.toUpperCase());

    const matchesStatus =
      selectedStatus === "ALL"
        ? true
        : r.beds.some((b) => b.status === selectedStatus && b.isActive);

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Reload rooms from API
  const refreshRooms = async () => {
    try {
      const res = await fetch("/api/admin/rooms");
      const json = await res.json();
      if (res.ok && Array.isArray(json.rooms)) {
        setRooms(json.rooms);
      }
    } catch (err) {
      console.error("Failed to refresh rooms:", err);
    }
  };

  // --- Handlers: Room ---
  const handleOpenAddRoom = () => {
    setRoomNumberInput("");
    setRoomNameInput("");
    setRoomDeptInput("INPATIENT");
    setRoomIsActiveInput(true);
    setIsAddRoomOpen(true);
  };

  const handleOpenEditRoom = (r: RoomItem) => {
    setEditingRoom(r);
    setRoomNumberInput(r.roomNumber);
    setRoomNameInput(r.name || "");
    setRoomDeptInput(r.department || "INPATIENT");
    setRoomIsActiveInput(r.isActive);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumberInput.trim()) {
      showNotification("error", "Room Number is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingRoom) {
        // Update Room
        const res = await fetch(`/api/admin/rooms/${editingRoom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomNumber: roomNumberInput.trim(),
            name: roomNameInput.trim() || null,
            department: roomDeptInput.trim() || null,
            isActive: roomIsActiveInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update room");
        showNotification("success", `Room ${roomNumberInput} updated successfully.`);
        setEditingRoom(null);
      } else {
        // Create Room
        const res = await fetch("/api/admin/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomNumber: roomNumberInput.trim(),
            name: roomNameInput.trim() || null,
            department: roomDeptInput.trim() || null,
            isActive: roomIsActiveInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create room");
        showNotification("success", `Room ${roomNumberInput} created successfully.`);
        setIsAddRoomOpen(false);
      }
      await refreshRooms();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Room operation failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoom = async (r: RoomItem) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Room "${r.roomNumber}" and all its beds? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/rooms/${r.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete room");
      showNotification("success", `Room ${r.roomNumber} deleted successfully.`);
      await refreshRooms();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Failed to delete room.");
    }
  };

  // --- Handlers: Bed ---
  const handleOpenAddBed = (targetRoom?: RoomItem) => {
    const r = targetRoom || rooms[0];
    setTargetRoomForBed(r || null);
    setBedTargetRoomId(r ? r.id : "");
    // Default next bed number guess
    const existingCount = r ? r.beds.length : 0;
    setBedNumberInput(`Bed ${existingCount + 1}`);
    setBedNotesInput("");
    setBedStatusInput("FREE");
    setBedIsActiveInput(true);
    setIsAddBedOpen(true);
  };

  const handleOpenEditBed = (room: RoomItem, bed: BedItem) => {
    setEditingBed({ room, bed });
    setBedNumberInput(bed.bedNumber);
    setBedNotesInput(bed.notes || "");
    setBedStatusInput(bed.status);
    setBedIsActiveInput(bed.isActive);
  };

  const handleSaveBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedNumberInput.trim()) {
      showNotification("error", "Bed Number is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingBed) {
        // Update Bed
        const res = await fetch(`/api/admin/beds/${editingBed.bed.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bedNumber: bedNumberInput.trim(),
            notes: bedNotesInput.trim() || null,
            status: bedStatusInput,
            isActive: bedIsActiveInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update bed");
        showNotification("success", `Bed ${bedNumberInput} updated successfully.`);
        setEditingBed(null);
      } else {
        // Create Bed
        const roomId = bedTargetRoomId || (targetRoomForBed ? targetRoomForBed.id : "");
        if (!roomId) throw new Error("Please select a target room.");

        const res = await fetch("/api/admin/beds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            bedNumber: bedNumberInput.trim(),
            notes: bedNotesInput.trim() || null,
            status: bedStatusInput,
            isActive: bedIsActiveInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create bed");
        showNotification("success", `Bed ${bedNumberInput} added successfully.`);
        setIsAddBedOpen(false);
      }
      await refreshRooms();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Bed operation failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBedActive = async (bed: BedItem) => {
    try {
      const newStatus = !bed.isActive;
      const res = await fetch(`/api/admin/beds/${bed.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedNumber: bed.bedNumber,
          notes: bed.notes,
          status: bed.status,
          isActive: newStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle bed status");
      showNotification(
        "success",
        `Bed ${bed.bedNumber} is now ${newStatus ? "ACTIVE" : "DEACTIVATED"}.`
      );
      await refreshRooms();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Update failed.");
    }
  };

  const handleDeleteBed = async (bed: BedItem, roomNumber: string) => {
    const confirmDelete = window.confirm(
      `Delete "${bed.bedNumber}" in Room ${roomNumber}? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/beds/${bed.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete bed");
      showNotification("success", `Bed ${bed.bedNumber} deleted.`);
      await refreshRooms();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            <Building2 className="w-4 h-4" />
            <span>Hospital Administration • Facilities Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Rooms & Beds Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure hospital rooms, add and manage individual beds, control activation, and track real-time occupancy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddRoom}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room</span>
          </button>
          <button
            onClick={() => handleOpenAddBed()}
            disabled={rooms.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
          >
            <BedDouble className="w-4 h-4" />
            <span>Add Bed</span>
          </button>
        </div>
      </div>

      {/* Notification Banners */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Rooms
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalRooms}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Configured wards</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Beds
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalBeds}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Across all rooms</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>FREE Beds</span>
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{freeBeds}</p>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Ready for admission</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>SCHEDULED</span>
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">{scheduledBeds}</p>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Admitted / Reserved</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>OCCUPIED</span>
          </span>
          <p className="text-2xl font-black text-blue-700 mt-1">{occupiedBeds}</p>
          <span className="text-[10px] text-blue-600 mt-0.5 block">Patient in bed</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Power className="w-3.5 h-3.5 text-slate-400" />
            <span>Deactivated</span>
          </span>
          <p className="text-2xl font-black text-slate-600 mt-1">{deactivatedBeds}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Under maintenance</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search room no, room name, bed no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">Dept:</span>
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-2.5 py-2 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
          >
            <option value="ALL">All Departments</option>
            <option value="INPATIENT">Inpatient Ward</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="OPD">OPD</option>
            {departments
              .filter((d) => !["INPATIENT", "EMERGENCY", "OPD"].includes(d.toUpperCase()))
              .map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-2">
            <span className="font-semibold">Bed Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-2.5 py-2 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
          >
            <option value="ALL">All Bed Statuses</option>
            <option value="FREE">Rooms with FREE beds</option>
            <option value="SCHEDULED">Rooms with SCHEDULED beds</option>
            <option value="OCCUPIED">Rooms with OCCUPIED beds</option>
          </select>

          {(search || selectedDept !== "ALL" || selectedStatus !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedDept("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No rooms found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {rooms.length === 0
              ? "Start by adding the first room to the hospital directory. You will then be able to allocate beds into that room."
              : "No rooms match your filter criteria. Try resetting the filters or modifying your search."}
          </p>
          {rooms.length === 0 && (
            <button
              onClick={handleOpenAddRoom}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Room</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRooms.map((room) => {
            const roomFreeBeds = room.beds.filter((b) => b.status === "FREE" && b.isActive).length;
            const roomTotalBeds = room.beds.length;

            return (
              <div
                key={room.id}
                className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition-all flex flex-col justify-between ${
                  room.isActive ? "border-slate-200" : "border-slate-300 opacity-75 bg-slate-50/50"
                }`}
              >
                {/* Room Header Card */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 font-mono tracking-tight">
                        Room {room.roomNumber}
                      </span>
                      {room.name && (
                        <span className="text-xs font-medium text-slate-600 truncate max-w-[180px]">
                          • {room.name}
                        </span>
                      )}
                      {!room.isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {room.department && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                          {room.department}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {roomTotalBeds} Bed{roomTotalBeds !== 1 ? "s" : ""} (
                        <span className="font-bold text-emerald-700">{roomFreeBeds} Free</span>)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenAddBed(room)}
                      title="Add Bed to this Room"
                      className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditRoom(room)}
                      title="Edit Room"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      title="Delete Room"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Beds in Room */}
                <div className="p-5 flex-1 space-y-3">
                  {room.beds.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                      <BedDouble className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400">No beds configured in this room yet.</p>
                      <button
                        onClick={() => handleOpenAddBed(room)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add First Bed</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {room.beds.map((bed) => {
                        return (
                          <div
                            key={bed.id}
                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                              !bed.isActive
                                ? "bg-slate-50 border-slate-200 opacity-60"
                                : bed.status === "FREE"
                                ? "bg-emerald-50/40 border-emerald-200"
                                : bed.status === "SCHEDULED"
                                ? "bg-amber-50/50 border-amber-200"
                                : "bg-blue-50/40 border-blue-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <BedDouble
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      !bed.isActive
                                        ? "text-slate-400"
                                        : bed.status === "FREE"
                                        ? "text-emerald-700"
                                        : bed.status === "SCHEDULED"
                                        ? "text-amber-700"
                                        : "text-blue-700"
                                    }`}
                                  />
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {bed.bedNumber}
                                  </span>
                                </div>

                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  {/* Status badge */}
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                      !bed.isActive
                                        ? "bg-slate-200 text-slate-600"
                                        : bed.status === "FREE"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : bed.status === "SCHEDULED"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {!bed.isActive ? "INACTIVE" : bed.status}
                                  </span>

                                  {bed.notes && (
                                    <span
                                      className="text-[10px] text-slate-500 truncate max-w-[120px]"
                                      title={bed.notes}
                                    >
                                      {bed.notes}
                                    </span>
                                  )}
                                </div>

                                {bed.currentPatient && bed.isActive && (
                                  <div className="mt-2 text-[10px] text-slate-600 bg-white/80 p-1.5 rounded-md border border-slate-200">
                                    <span className="font-semibold block truncate">
                                      Patient: {bed.currentPatient.patientName}
                                    </span>
                                    <span className="text-slate-400 font-mono">
                                      {bed.currentPatient.mrNumber ||
                                        `Adm #${bed.currentPatient.admissionNumber}`}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => handleToggleBedActive(bed)}
                                  title={bed.isActive ? "Deactivate Bed" : "Activate Bed"}
                                  className={`p-1 rounded-md transition ${
                                    bed.isActive
                                      ? "text-emerald-700 hover:bg-emerald-100/60"
                                      : "text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditBed(room, bed)}
                                  title="Edit Bed"
                                  className="p-1 text-slate-500 hover:bg-slate-100 rounded-md transition"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBed(bed, room.roomNumber)}
                                  title="Delete Bed"
                                  className="p-1 text-rose-500 hover:bg-rose-100 rounded-md transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Room ID: {room.roomNumber}</span>
                  <button
                    onClick={() => handleOpenAddBed(room)}
                    className="font-bold text-teal-700 hover:text-teal-900 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Bed</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL: Add / Edit Room --- */}
      {(isAddRoomOpen || editingRoom) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-700" />
                <span>{editingRoom ? "Edit Room Information" : "Add New Room"}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddRoomOpen(false);
                  setEditingRoom(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Room Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, Ward-A, ICU-01"
                  value={roomNumberInput}
                  onChange={(e) => setRoomNumberInput(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Room Name / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. General Ward A, Private Deluxe, Neonatal ICU"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={roomDeptInput}
                  onChange={(e) => setRoomDeptInput(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                >
                  <option value="INPATIENT">Inpatient Ward</option>
                  <option value="EMERGENCY">Emergency Department</option>
                  <option value="OPD">OPD Clinic</option>
                  <option value="ICU">Intensive Care Unit (ICU)</option>
                  <option value="SURGICAL">Surgical Ward</option>
                  <option value="PEDIATRIC">Pediatric Ward</option>
                  <option value="GYNECOLOGY">Gynecology & Obstetrics</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="roomIsActive"
                  checked={roomIsActiveInput}
                  onChange={(e) => setRoomIsActiveInput(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                />
                <label htmlFor="roomIsActive" className="text-xs font-semibold text-slate-700">
                  Room is Active & Available for Bed Allocation
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddRoomOpen(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingRoom ? "Save Changes" : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add / Edit Bed --- */}
      {(isAddBedOpen || editingBed) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-teal-700" />
                <span>
                  {editingBed
                    ? `Edit Bed ${editingBed.bed.bedNumber} (Room ${editingBed.room.roomNumber})`
                    : targetRoomForBed
                    ? `Add Bed to Room ${targetRoomForBed.roomNumber}`
                    : "Add Bed"}
                </span>
              </h3>
              <button
                onClick={() => {
                  setIsAddBedOpen(false);
                  setEditingBed(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBed} className="space-y-3.5">
              {!editingBed && !targetRoomForBed && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Target Room *
                  </label>
                  <select
                    required
                    value={bedTargetRoomId}
                    onChange={(e) => setBedTargetRoomId(e.target.value)}
                    className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                  >
                    <option value="">-- Choose Room --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} {r.name ? `(${r.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bed Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bed 1, Bed 2, Bed A, B-01"
                  value={bedNumberInput}
                  onChange={(e) => setBedNumberInput(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bed Status *
                </label>
                <select
                  value={bedStatusInput}
                  onChange={(e) => setBedStatusInput(e.target.value as BedStatus)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                >
                  <option value="FREE">FREE (Available for Admission)</option>
                  <option value="SCHEDULED">SCHEDULED (Reserved for Admission)</option>
                  <option value="OCCUPIED">OCCUPIED (Patient currently in bed)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Bed status updates automatically when receptionist admits or discharges patients.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Specification (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oxygen port available, Electric adjustable bed"
                  value={bedNotesInput}
                  onChange={(e) => setBedNotesInput(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bedIsActive"
                  checked={bedIsActiveInput}
                  onChange={(e) => setBedIsActiveInput(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                />
                <label htmlFor="bedIsActive" className="text-xs font-semibold text-slate-700">
                  Bed is Active & Eligible for Allocation
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBedOpen(false);
                    setEditingBed(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingBed ? "Save Bed Changes" : "Create Bed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
