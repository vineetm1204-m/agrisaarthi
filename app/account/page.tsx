"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { User, Phone, MapPin, Globe, Bell, FileDown, Trash2, ShieldAlert, CheckCircle2, ChevronRight, Sprout, Smartphone, Settings, Info } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export default function AccountPage() {
  const { farmer, setFarmer, setLanguage, fields } = useAppStore();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [notifs, setNotifs] = useState<any>({
    weatherAlerts: true,
    mandiAlerts: true,
    irrigationReminders: true,
    diseaseAlerts: true,
    schemeAlerts: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Create debounced save functions
  const saveProfileRef = useRef(
    debounce(async (updates: any, farmerId: string) => {
      try {
        const res = await fetch(`/api/farmer/${farmerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          const data = await res.json();
          setFarmer(data); // Update global store
          toast.success("Profile saved!", { icon: <CheckCircle2 className="text-green-500" /> });
        }
      } catch (e) {
        toast.error("Failed to save profile");
      }
    }, 500)
  ).current;

  const saveNotifsRef = useRef(
    debounce(async (updates: any, farmerId: string) => {
      try {
        await fetch(`/api/farmer/${farmerId}/notifications`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        toast.success("Settings saved");
      } catch (e) {
        toast.error("Failed to save settings");
      }
    }, 500)
  ).current;

  useEffect(() => {
    if (farmer) {
      // Fetch fresh data
      fetch(`/api/farmer/${farmer.id}`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) setProfile(data);
        });
        
      fetch(`/api/farmer/${farmer.id}/notifications`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) setNotifs(data);
        });
    }
  }, [farmer?.id]);

  if (!farmer || !profile) {
    return <div className="dash-page flex justify-center items-center h-[60vh]"><div className="loading-spinner"></div></div>;
  }

  const handleProfileChange = (field: string, value: any) => {
    const newProfile = { ...profile, [field]: value };
    setProfile(newProfile);
    
    if (field === 'language') {
      setLanguage(value);
    }
    
    saveProfileRef({ [field]: value }, farmer.id);
  };

  const handleNotifChange = (field: string, value: boolean) => {
    const newNotifs = { ...notifs, [field]: value };
    setNotifs(newNotifs);
    saveNotifsRef({ [field]: value }, farmer.id);
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch(`/api/farmer/${farmer.id}`, { method: "DELETE" });
      toast.success("Account deleted successfully");
      router.push("/login");
    } catch (e) {
      toast.error("Failed to delete account");
    }
  };

  const totalAcreage = fields.reduce((sum, f) => sum + (f.areaSqFt / 43560), 0).toFixed(1);
  const uniqueCrops = Array.from(new Set(fields.map(f => f.crop))).join(", ");

  return (
    <div className="dash-page animate-fade-in-up pb-20 max-w-4xl mx-auto">
      <div className="page-header mb-6">
        <h1>Account & Settings</h1>
        <p className="text-muted">Manage your profile, preferences, and data</p>
      </div>

      <div className="space-y-6">
        
        {/* 1. PROFILE CARD */}
        <div className="dash-card">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800"><User className="text-indigo-600" /> Personal Profile</h2>
            <button 
              className="text-sm font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Done Editing" : "Edit Profile"}
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl font-extrabold shadow-sm shrink-0 border-4 border-white outline outline-1 outline-gray-200">
              {profile.name?.substring(0, 2).toUpperCase() || "FR"}
            </div>
            
            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                  {isEditing ? (
                    <input className="form-input mt-1" value={profile.name} onChange={e => handleProfileChange('name', e.target.value)} />
                  ) : (
                    <div className="text-lg font-bold text-gray-900">{profile.name}</div>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Phone Number</label>
                  <div className="text-md font-medium text-gray-700 mt-1 flex items-center gap-2"><Phone size={16} className="text-gray-400"/> {profile.phone}</div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">District</label>
                  {isEditing ? (
                    <input className="form-input mt-1" value={profile.district} onChange={e => handleProfileChange('district', e.target.value)} />
                  ) : (
                    <div className="text-md font-medium text-gray-700 mt-1 flex items-center gap-2"><MapPin size={16} className="text-gray-400"/> {profile.district}</div>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">State</label>
                  {isEditing ? (
                    <input className="form-input mt-1" value={profile.state} onChange={e => handleProfileChange('state', e.target.value)} />
                  ) : (
                    <div className="text-md font-medium text-gray-700 mt-1">{profile.state}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MY FIELDS SUMMARY */}
        <div className="dash-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800"><Sprout className="text-green-600" /> My Fields</h2>
            <Link href="/my-fields" className="text-sm font-semibold text-indigo-600 hover:underline flex items-center">
              Manage Fields <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-gray-900">{fields.length}</div>
              <div className="text-xs font-medium text-gray-500 uppercase mt-1">Total Fields</div>
            </div>
            <div className="text-center border-l border-r border-gray-200">
              <div className="text-2xl font-extrabold text-gray-900">{totalAcreage}</div>
              <div className="text-xs font-medium text-gray-500 uppercase mt-1">Total Acres</div>
            </div>
            <div className="text-center flex flex-col justify-center items-center">
              <div className="text-sm font-bold text-gray-900 line-clamp-1">{uniqueCrops || "None"}</div>
              <div className="text-xs font-medium text-gray-500 uppercase mt-1">Active Crops</div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN GRID FOR SETTINGS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 3. NOTIFICATION SETTINGS */}
          <div className="dash-card">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-6"><Bell className="text-amber-500" /> Notifications</h2>
            <div className="space-y-4">
              {[
                { id: 'weatherAlerts', label: 'Severe Weather Alerts' },
                { id: 'mandiAlerts', label: 'Mandi Price Spikes' },
                { id: 'irrigationReminders', label: 'Smart Irrigation Reminders' },
                { id: 'diseaseAlerts', label: 'Disease Outbreak Warnings' },
                { id: 'schemeAlerts', label: 'Govt Scheme Deadlines' },
              ].map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={notifs[item.id]} onChange={e => handleNotifChange(item.id, e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 4 & 5. APP PREFS & IVR */}
          <div className="space-y-6">
            
            {/* LANGUAGE */}
            <div className="dash-card">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-4"><Globe className="text-blue-500" /> App Language</h2>
              <div className="flex gap-4">
                {[
                  { val: 'en', label: 'English' },
                  { val: 'hi', label: 'हिंदी (Hindi)' },
                  { val: 'mr', label: 'मराठी (Marathi)' }
                ].map(lang => (
                  <label key={lang.val} className={`flex-1 border rounded-lg p-3 text-center cursor-pointer transition-all ${profile.language === lang.val ? 'border-indigo-500 bg-indigo-50 font-bold text-indigo-700 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="language" className="hidden" checked={profile.language === lang.val} onChange={() => handleProfileChange('language', lang.val)} />
                    {lang.label}
                  </label>
                ))}
              </div>
            </div>

            {/* IVR SETTINGS */}
            <div className="dash-card">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-4"><Smartphone className="text-purple-500" /> Voice Assistant (IVR)</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Enable Call-In Assistant</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={profile.ivrEnabled} onChange={e => handleProfileChange('ivrEnabled', e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
                {profile.ivrEnabled && (
                  <>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm">
                      <span className="text-purple-600 font-bold block mb-1">Your Dedicated Number:</span>
                      <span className="font-mono text-lg text-gray-900">{profile.ivrNumber || "+1 9387863936"}</span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">IVR Spoken Language</label>
                      <select className="form-input" value={profile.ivrLanguage} onChange={e => handleProfileChange('ivrLanguage', e.target.value)}>
                        <option value="hi">Hindi</option>
                        <option value="en">English</option>
                        <option value="mr">Marathi</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 6. DATA & PRIVACY */}
        <div className="dash-card">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-4"><Settings className="text-gray-500" /> Data & Privacy</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <a 
              href={`/api/farmer/${farmer.id}/export`} 
              target="_blank"
              download
              className="flex-1 flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold transition-colors"
            >
              <FileDown size={20} /> Download My Data
            </a>
            <button 
              className="flex-1 flex items-center justify-center gap-2 p-4 border border-red-200 rounded-xl hover:bg-red-50 text-red-600 font-semibold transition-colors"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={20} /> Delete Account
            </button>
          </div>
        </div>

        {/* 7. APP INFO */}
        <div className="text-center text-sm text-gray-400 mt-8 mb-4 space-y-1">
          <div>AgriSaarthi App Version 1.0.4 (Turbopack)</div>
          <div>Last synced: {new Date().toLocaleString()}</div>
          <a href="#" className="text-indigo-400 hover:underline flex items-center justify-center gap-1 mt-2">
            <Info size={14} /> Report a Bug / Feedback
          </a>
        </div>

      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm text-center">
            <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h2>
            <p className="text-gray-600 text-sm mb-6">
              This action is permanent and cannot be undone. All your fields, alert settings, and IVR logs will be erased.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold" onClick={handleDeleteAccount}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
