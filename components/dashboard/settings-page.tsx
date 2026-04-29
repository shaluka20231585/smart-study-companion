"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import styles from "./profile.module.css"
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Trash2,
  Save,
  Edit2,
} from "lucide-react"

interface UserProfile {
  id: string
  email: string
  name: string
  created_at: string
}

interface FormErrors {
  [key: string]: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Edit Profile Form State
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editingProfile, setEditingProfile] = useState(false)

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // Preferences State
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    studyReminders: true,
    publicProfile: false,
  })

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()

        if (error) throw error

        const userData: UserProfile = {
          id: data.id,
          email: user.email || "",
          name: data.name || "",
          created_at: data.created_at || "",
        }

        setProfile(userData)
        setEditName(userData.name)
        setEditEmail(userData.email)

        // Fetch preferences
        const { data: prefData } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (prefData) {
          setPreferences({
            emailNotifications: prefData.email_notifications ?? true,
            studyReminders: prefData.study_reminders ?? true,
            publicProfile: prefData.public_profile ?? false,
          })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setMessage({ type: "error", text: "Failed to load profile data" })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleProfileSave = async () => {
    const newErrors: FormErrors = {}

    if (!editName.trim()) {
      newErrors.name = "Name is required"
    }

    if (!editEmail.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(editEmail)) {
      newErrors.email = "Invalid email format"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setMessage({ type: "error", text: "Please fix the errors below" })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from("users")
        .update({ name: editName })
        .eq("id", user?.id)

      if (profileError) throw profileError

      // Update email if changed
      if (editEmail !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editEmail,
        })

        if (emailError) throw emailError
      }

      setProfile({
        ...profile!,
        name: editName,
        email: editEmail,
      })

      setMessage({ type: "success", text: "Profile updated successfully!" })
      setEditingProfile(false)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    const newErrors: FormErrors = {}

    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required"
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = "New password is required"
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters"
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = "New password must be different from current password"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setMessage({ type: "error", text: "Please fix the errors below" })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setMessage({ type: "success", text: "Password changed successfully!" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setChangingPassword(false)
      setErrors({})
    } catch (error: any) {
      console.error("Error changing password:", error)
      setMessage({
        type: "error",
        text: error.message || "Failed to change password. Please ensure your current password is correct.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePreferencesSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: user?.id,
        email_notifications: preferences.emailNotifications,
        study_reminders: preferences.studyReminders,
        public_profile: preferences.publicProfile,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setMessage({ type: "success", text: "Preferences updated successfully!" })
    } catch (error: any) {
      console.error("Error updating preferences:", error)
      setMessage({
        type: "error",
        text: error.message || "Failed to update preferences",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return
    }

    if (!window.confirm("All your data will be permanently deleted. Type YES in the next prompt to confirm.")) {
      return
    }

    setSaving(true)

    try {
      // Delete user profile and all related data
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", user?.id)

      if (deleteError) throw deleteError

      // Delete Auth account
      const { error: authError } = await supabase.auth.admin.deleteUser(user?.id || "")

      if (authError) throw authError

      setMessage({ type: "success", text: "Account deleted. Redirecting..." })
      setTimeout(() => {
        router.push("/login")
      }, 1500)
    } catch (error: any) {
      console.error("Error deleting account:", error)
      setMessage({
        type: "error",
        text: error.message || "Failed to delete account. Please try again.",
      })
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="pb-20 lg:pb-0 px-4 sm:px-6 lg:px-8 py-8">
        <div className={styles.sectionTitle}>⚙️ Account Settings</div>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="pb-20 lg:pb-0 px-4 sm:px-6 lg:px-8 py-8">
      {/* Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-none border-2 flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 border-green-500 text-green-800"
              : "bg-red-50 border-red-500 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Edit Profile Section */}
      <div className="mb-8">
        <h2 className={styles.sectionTitle}>👤 Edit Profile</h2>

        {!editingProfile ? (
          <div className={`${styles.card} p-6`}>
            <div className="mb-4">
              <p className="font-bold text-gray-700">Name</p>
              <p className="text-gray-600">{editName}</p>
            </div>
            <div className="mb-6">
              <p className="font-bold text-gray-700">Email</p>
              <p className="text-gray-600">{editEmail}</p>
            </div>
            <button
              onClick={() => setEditingProfile(true)}
              className={`${styles.cardButton} w-full text-center`}
            >
              <Edit2 size={16} className="inline mr-2" />
              Edit Profile
            </button>
          </div>
        ) : (
          <div className={`${styles.card} p-6`}>
            <div className="mb-4">
              <label className={styles.formLabel}>Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value)
                  setErrors({ ...errors, name: "" })
                }}
                className={styles.formInput}
              />
              {errors.name && <p className={styles.errorMessage}>{errors.name}</p>}
            </div>

            <div className="mb-6">
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => {
                  setEditEmail(e.target.value)
                  setErrors({ ...errors, email: "" })
                }}
                className={styles.formInput}
              />
              {errors.email && <p className={styles.errorMessage}>{errors.email}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleProfileSave}
                disabled={saving}
                className={`${styles.cardButton} flex-1 text-center`}
              >
                <Save size={16} className="inline mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setEditingProfile(false)
                  setEditName(profile?.name || "")
                  setEditEmail(profile?.email || "")
                  setErrors({})
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="mb-8">
        <h2 className={styles.sectionTitle}>🔐 Security</h2>

        {!changingPassword ? (
          <div className={`${styles.card} p-6`}>
            <p className="text-gray-600 mb-6">Keep your account secure by updating your password regularly</p>
            <button
              onClick={() => setChangingPassword(true)}
              className={`${styles.cardButton} w-full text-center`}
            >
              <Lock size={16} className="inline mr-2" />
              Change Password
            </button>
          </div>
        ) : (
          <div className={`${styles.card} p-6`}>
          <div className="mb-4">
            <label className={styles.formLabel}>Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setErrors({ ...errors, currentPassword: "" })
                }}
                className={styles.formInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className={styles.errorMessage}>{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div className="mb-4">
            <label className={styles.formLabel}>New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setErrors({ ...errors, newPassword: "" })
                }}
                className={styles.formInput}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Must be at least 8 characters</p>
            {errors.newPassword && <p className={styles.errorMessage}>{errors.newPassword}</p>}
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className={styles.formLabel}>Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setErrors({ ...errors, confirmPassword: "" })
                }}
                className={styles.formInput}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className={styles.errorMessage}>{errors.confirmPassword}</p>
            )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePasswordChange}
                disabled={saving}
                className={`${styles.cardButton} flex-1 text-center`}
              >
                {saving ? "Updating..." : "Update Password"}
              </button>
              <button
                onClick={() => {
                  setChangingPassword(false)
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                  setErrors({})
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="mb-8">
        <h2 className={styles.sectionTitle}>📧 Preferences</h2>

        <div className={`${styles.card} p-6`}>
        <div className="mb-6 pb-6 border-b-2 border-gray-200">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) =>
                  setPreferences({ ...preferences, emailNotifications: e.target.checked })
                }
                className={styles.formCheckbox}
              />
              <span className="font-bold ml-3">Email Notifications</span>
            </label>
            <p className="text-sm text-gray-600 ml-8 mt-1">Receive important updates about your account</p>
          </div>

          <div className="mb-6 pb-6 border-b-2 border-gray-200">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.studyReminders}
                onChange={(e) =>
                  setPreferences({ ...preferences, studyReminders: e.target.checked })
                }
                className={styles.formCheckbox}
              />
              <span className="font-bold ml-3">Study Reminders</span>
            </label>
            <p className="text-sm text-gray-600 ml-8 mt-1">Get daily reminders to keep up with your studies</p>
          </div>

          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.publicProfile}
                onChange={(e) =>
                  setPreferences({ ...preferences, publicProfile: e.target.checked })
                }
                className={styles.formCheckbox}
              />
              <span className="font-bold ml-3">Public Profile</span>
            </label>
            <p className="text-sm text-gray-600 ml-8 mt-1">Allow others to view your profile and achievements</p>
          </div>

          <button
            onClick={handlePreferencesSave}
            disabled={saving}
            className={`${styles.cardButton} w-full text-center`}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className={styles.sectionTitle}>⚠️ Danger Zone</h2>

        <div className={`${styles.card} p-6`} style={{ background: "linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)" }}>
          <p className="font-bold text-red-900 mb-4">Delete Account</p>
          <p className="text-red-800 text-sm mb-6">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={saving}
            className="w-full px-4 py-2 border-2 border-red-900 bg-red-900 text-white font-bold uppercase hover:opacity-80 transition disabled:opacity-50"
          >
            <Trash2 size={16} className="inline mr-2" />
            {saving ? "Deleting..." : "Delete My Account"}
          </button>
        </div>
      </div>
    </div>
  )
}
