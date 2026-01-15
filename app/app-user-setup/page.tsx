"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { User, Phone, Shield, Loader2, CheckCircle2, Mic, Edit3, Film } from "lucide-react"
import authClient from "@/lib/auth-client"

type UserRole = "REPORTER" | "EDITOR" | "PRODUCER"

export default function AppUserSetupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<UserRole>("REPORTER")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(true)
  const [userEmail, setUserEmail] = useState("")

  // Check if user is authenticated and not already set up
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        
        if (!session?.data?.user) {
          router.push("/")
          return
        }

        setUserEmail(session.data.user.email)
        
        // Check if app user is already set up
        const response = await fetch("/api/app-user/check")
        const data = await response.json()

        if (data.isSetup) {
          router.push("/enps")
        }
      } catch (err) {
        console.error("Auth check error:", err)
        router.push("/login")
      } finally {
        setIsVerifying(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/app-user/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          phone: phone.trim() || null,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to set up profile")
        setIsLoading(false)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      router.push("/enps")
      router.refresh()
    } catch (err) {
      setError("Something went wrong. Please try again.")
      console.error("Setup error:", err)
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <Loader2 size={48} style={styles.spinner} />
          <p style={styles.loadingText}>Verifying your account...</p>
        </div>
      </div>
    )
  }

  const roles: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: "REPORTER",
      label: "Reporter",
      description: "Create and edit your own stories",
      icon: <Mic size={22} />,
    },
    {
      value: "EDITOR",
      label: "Editor",
      description: "Edit all stories and approve content",
      icon: <Edit3 size={22} />,
    },
    {
      value: "PRODUCER",
      label: "Producer",
      description: "Manage bulletins and assign reporters",
      icon: <Film size={22} />,
    },
  ]

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.cardWrapper}
      >
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.cardHeader}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              style={styles.logoContainer}
            >
              <div style={styles.badge}>
                <CheckCircle2 size={32} color="#22c55e" />
              </div>
            </motion.div>
            <div style={styles.headerText}>
              <h1 style={styles.title}>Complete Your Profile</h1>
              <p style={styles.subtitle}>Set up your newsroom account</p>
            </div>
          </div>

          {/* Content */}
          <div style={styles.cardContent}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.errorBox}
              >
                <p style={styles.errorText}>{error}</p>
              </motion.div>
            )}

            <div style={styles.form}>
              {/* Email Display */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                style={styles.formGroup}
              >
                <label style={styles.label}>Email Address</label>
                <div style={styles.emailBox}>
                  <p style={styles.emailText}>{userEmail}</p>
                </div>
              </motion.div>

              {/* Display Name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                style={styles.formGroup}
              >
                <label style={styles.label}>Display Name</label>
                <div style={styles.inputWrapper}>
                  <User style={styles.icon} size={20} />
                  <input
                    type="text"
                    placeholder="e.g., John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={styles.input}
                    disabled={isLoading}
                  />
                </div>
                <p style={styles.helpText}>Your name as it appears in the newsroom</p>
              </motion.div>

              {/* Phone */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                style={styles.formGroup}
              >
                <label style={styles.label}>Phone Number (Optional)</label>
                <div style={styles.inputWrapper}>
                  <Phone style={styles.icon} size={20} />
                  <input
                    type="tel"
                    placeholder="+880 1234 567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={styles.input}
                    disabled={isLoading}
                  />
                </div>
              </motion.div>

              {/* Role Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55, duration: 0.3 }}
                style={styles.formGroup}
              >
                <label style={styles.label}>
                  <Shield size={16} style={{ marginRight: "6px" }} />
                  Select Your Role
                </label>
                <div style={styles.rolesGrid}>
                  {roles.map((roleOption) => {
                    const isSelected = role === roleOption.value
                    return (
                      <motion.div
                        key={roleOption.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <label
                          style={{
                            ...styles.roleCard,
                            borderColor: isSelected ? "#dc2626" : "#e2e8f0",
                            background: isSelected ? "#fef2f2" : "#f8fafc",
                            boxShadow: isSelected ? "0 4px 12px rgba(220, 38, 38, 0.15)" : "none",
                          }}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={roleOption.value}
                            checked={isSelected}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            style={{ display: "none" }}
                            disabled={isLoading}
                          />
                          <div style={styles.roleContent}>
                            {/* Icon Circle */}
                            <div
                              style={{
                                ...styles.roleIconCircle,
                                background: isSelected ? "#dc2626" : "#e2e8f0",
                                color: isSelected ? "#ffffff" : "#64748b",
                              }}
                            >
                              {roleOption.icon}
                            </div>
                            
                            {/* Label */}
                            <span
                              style={{
                                ...styles.roleLabel,
                                color: isSelected ? "#b91c1c" : "#1e293b",
                              }}
                            >
                              {roleOption.label}
                            </span>
                            
                            {/* Description */}
                            <p
                              style={{
                                ...styles.roleDescription,
                                color: isSelected ? "#dc2626" : "#64748b",
                              }}
                            >
                              {roleOption.description}
                            </p>

                            {/* Selected Checkmark */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                style={styles.selectedBadge}
                              >
                                <CheckCircle2 size={14} color="#ffffff" />
                              </motion.div>
                            )}
                          </div>
                        </label>
                      </motion.div>
                    )
                  })}
                </div>
                <p style={styles.roleHelpText}>
                  Admin roles are assigned by system administrators only
                </p>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    ...styles.submitButton,
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div style={styles.loadingContent}>
                      <Loader2 size={20} style={styles.spinner} />
                      <span>Setting up your account...</span>
                    </div>
                  ) : (
                    "Continue to Newsroom"
                  )}
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          style={styles.footer}
        >
          <p style={styles.footerText}>
            You can change your profile settings later in your account preferences.
          </p>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    fontFamily: "'Inter', 'Geist', 'Segoe UI', system-ui, sans-serif",
  } as React.CSSProperties,

  cardWrapper: {
    width: "100%",
    maxWidth: "640px",
  } as React.CSSProperties,

  card: {
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    overflow: "hidden",
  } as React.CSSProperties,

  cardHeader: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    padding: "40px 24px",
    textAlign: "center" as const,
    borderBottom: "1px solid #e2e8f0",
  } as React.CSSProperties,

  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  } as React.CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "64px",
    height: "64px",
    background: "#f0fdf4",
    borderRadius: "50%",
  } as React.CSSProperties,

  headerText: {
    marginTop: "12px",
  } as React.CSSProperties,

  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 6px 0",
  } as React.CSSProperties,

  subtitle: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  } as React.CSSProperties,

  cardContent: {
    padding: "32px 24px",
  } as React.CSSProperties,

  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "20px",
  } as React.CSSProperties,

  errorText: {
    color: "#991b1b",
    fontSize: "13px",
    margin: 0,
    fontWeight: "500",
  } as React.CSSProperties,

  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  } as React.CSSProperties,

  formGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  } as React.CSSProperties,

  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#475569",
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,

  inputWrapper: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,

  icon: {
    position: "absolute" as const,
    left: "12px",
    color: "#94a3b8",
    pointerEvents: "none" as const,
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "12px 12px 12px 44px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    transition: "all 0.2s",
    background: "#f8fafc",
    outline: "none",
  } as React.CSSProperties,

  helpText: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0,
  } as React.CSSProperties,

  emailBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "12px 16px",
  } as React.CSSProperties,

  emailText: {
    fontSize: "14px",
    color: "#475569",
    margin: 0,
    fontWeight: "500",
  } as React.CSSProperties,

  rolesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  } as React.CSSProperties,

  roleCard: {
    position: "relative" as const,
    padding: "20px 16px",
    border: "2px solid",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "block",
  } as React.CSSProperties,

  roleContent: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
    gap: "10px",
  } as React.CSSProperties,

  roleIconCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  } as React.CSSProperties,

  roleLabel: {
    fontSize: "14px",
    fontWeight: "600",
    transition: "color 0.2s",
  } as React.CSSProperties,

  roleDescription: {
    fontSize: "11px",
    margin: 0,
    lineHeight: "1.4",
    transition: "color 0.2s",
  } as React.CSSProperties,

  selectedBadge: {
    position: "absolute" as const,
    top: "-6px",
    right: "-6px",
    width: "22px",
    height: "22px",
    background: "#dc2626",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(220, 38, 38, 0.4)",
  } as React.CSSProperties,

  roleHelpText: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: "4px 0 0 0",
    textAlign: "center" as const,
  } as React.CSSProperties,

  submitButton: {
    width: "100%",
    padding: "14px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
  } as React.CSSProperties,

  loadingContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  } as React.CSSProperties,

  spinner: {
    animation: "spin 1s linear infinite",
  } as React.CSSProperties,

  loadingBox: {
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
  } as React.CSSProperties,

  loadingText: {
    fontSize: "16px",
    color: "#475569",
    margin: 0,
  } as React.CSSProperties,

  footer: {
    textAlign: "center" as const,
    marginTop: "24px",
  } as React.CSSProperties,

  footerText: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
  } as React.CSSProperties,
}
