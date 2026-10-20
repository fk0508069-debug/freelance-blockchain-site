"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

interface IUserProfile {
  name: string;
  email: string;
  role: string;
  createdAt: string;
  profilePicture: string;
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Main Profile Data
  const [profile, setProfile] = useState<IUserProfile>({
    name: "",
    email: "",
    role: "",
    createdAt: "",
    profilePicture: "",
    title: "",
    bio: "",
    skills: [],
    hourlyRate: 0,
  });

  // Form State (For the Modal)
  const [formData, setFormData] = useState({
    title: "",
    bio: "",
    hourlyRate: 0,
    profilePicture: "",
    skills: "",
  });

  // Fetch Data
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      
      if (res.ok && data.profile) {
        setProfile({
          name: data.profile.name || "User",
          email: data.profile.email || "",
          role: data.profile.role || "buyer",
          createdAt: data.profile.createdAt 
            ? new Date(data.profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "Unknown",
          profilePicture: data.profile.profilePicture || "",
          title: data.profile.title || "",
          bio: data.profile.bio || "",
          skills: data.profile.skills || [],
          hourlyRate: data.profile.hourlyRate || 0,
        });

        // Populate form
        setFormData({
          title: data.profile.title || "",
          bio: data.profile.bio || "",
          hourlyRate: data.profile.hourlyRate || 0,
          profilePicture: data.profile.profilePicture || "",
          skills: data.profile.skills ? data.profile.skills.join(", ") : "",
        });
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchProfile();
  }, [session]);

  // Handle Update (CRUD)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      await fetchProfile(); // Refresh data
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditModalOpen(false);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset (Delete)
  const handleReset = async () => {
    if (!confirm("Are you sure you want to clear your professional profile data? Your account will remain active.")) return;
    setIsDeleting(true);
    
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        await fetchProfile();
        setIsEditModalOpen(false);
        setMessage({ type: "success", text: "Profile data cleared." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate Profile Completion (Fake logic for UI)
  const calculateCompletion = () => {
    let score = 20; // Base score for having an account
    if (profile.profilePicture) score += 20;
    if (profile.title) score += 20;
    if (profile.bio) score += 20;
    if (profile.skills.length > 0) score += 20;
    return score;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <Link href="/login" className="bg-gray-900 text-white px-6 py-2 rounded-md">Log In</Link>
      </div>
    );
  }

  const username = profile.email ? profile.email.split("@")[0] : "user";
  const completionScore = calculateCompletion();

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:underline hover:text-gray-900">Home</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Profile</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Info */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your client profile</h1>
              <p className="text-gray-600 text-sm">
                Are you a freelancer? Visit your <Link href="/dashboard/seller" className="underline text-gray-900 hover:text-blue-600">freelancer profile</Link> to view and update it.
              </p>
            </div>

            {/* Main Profile Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 flex items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden relative shrink-0 border border-gray-300">
                {profile.profilePicture ? (
                  <Image src={profile.profilePicture} alt={profile.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400 bg-gray-100">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                    <p className="text-gray-500 text-sm mt-1">@{username}</p>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded-md text-sm transition"
                  >
                    Edit
                  </button>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Location not set
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Joined in {profile.createdAt}
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Info (Title, Rate, Skills) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Professional Overview</h3>
                <button onClick={() => setIsEditModalOpen(true)} className="text-sm font-medium text-gray-600 hover:text-gray-900">Edit</button>
              </div>
              
              {profile.title ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">{profile.title}</h4>
                    {profile.hourlyRate > 0 && <p className="text-green-600 font-medium mt-1">${profile.hourlyRate} / hr</p>}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.skills.map((skill, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium border border-gray-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                  <p className="text-gray-500 text-sm">Share details about yourself, your title, and your skills.</p>
                  <button onClick={() => setIsEditModalOpen(true)} className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded-md text-sm transition">Add</button>
                </div>
              )}
            </div>

            {/* Bio Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">About Me</h3>
                <button onClick={() => setIsEditModalOpen(true)} className="text-sm font-medium text-gray-600 hover:text-gray-900">Edit</button>
              </div>
              
              {profile.bio ? (
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                  {profile.bio}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                  <p className="text-gray-500 text-sm">Share details about yourself, your business, and what services you're looking to order.</p>
                  <button onClick={() => setIsEditModalOpen(true)} className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded-md text-sm transition">Add</button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (Sidebar) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Completion */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-900">{completionScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-gray-900 h-2 rounded-full transition-all duration-500" style={{ width: `${completionScore}%` }}></div>
              </div>
              <p className="text-sm text-gray-600">
                {completionScore === 100 ? "Your profile is complete!" : "You're nearly there, add a few more details to complete your profile."}
              </p>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick links</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/dashboard/buyer" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 font-medium text-sm">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/seller" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 font-medium text-sm">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Seller Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/seller" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 font-medium text-sm">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Messages
                  </Link>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* ================= EDIT MODAL (CRUD) ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              {message.text && (
                <div className={`p-4 mb-6 rounded-md flex justify-between items-center ${
                  message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  <span>{message.text}</span>
                  <button onClick={() => setMessage({ type: "", text: "" })} className="font-bold hover:opacity-75">✕</button>
                </div>
              )}

              <form id="edit-profile-form" onSubmit={handleSave} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Professional Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Full Stack Developer"
                      className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-gray-900 outline-none"
                      value={formData.title} 
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    />
                  </div>
                  
                 
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/my-photo.jpg"
                    className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-gray-900 outline-none"
                    value={formData.profilePicture} 
                    onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio / About Me</label>
                  <textarea 
                    rows={4} 
                    placeholder="Describe your experience and what you can do..."
                    className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-gray-900 outline-none"
                    value={formData.bio} 
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills (Comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="e.g., React, Node.js, Smart Contracts"
                    className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-gray-900 outline-none"
                    value={formData.skills} 
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })} 
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate each skill with a comma.</p>
                </div>

              </form>
            </div>

            {/* Modal Footer (Actions) */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <button 
                type="button" 
                onClick={handleReset}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-800 font-medium text-sm transition disabled:opacity-50"
              >
                {isDeleting ? "Clearing..." : "Clear Profile Data"}
              </button>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-md transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  form="edit-profile-form"
                  disabled={isSaving}
                  className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-md font-bold transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}