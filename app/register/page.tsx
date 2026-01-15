// ============================================================================
// File: app/register/page.tsx (UPDATED)
// Description: Register page - redirect to app-user setup on success
// ============================================================================

"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Lock, Mail, User, Loader2, CheckCircle2 } from "lucide-react"
import authClient from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const passwordStrength = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    }
    const score = Object.values(checks).filter(Boolean).length
    return { checks, score }
  }, [password])

  const getStrengthColor = () => {
    if (passwordStrength.score <= 1) return "#ef4444"
    if (passwordStrength.score === 2) return "#f97316"
    if (passwordStrength.score === 3) return "#eab308"
    return "#22c55e"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (passwordStrength.score < 3) {
        setError("Password is not strong enough. Please meet at least 3 requirements.")
        setIsLoading(false)
        return
      }

      const result = await authClient.signUp.email({
        email,
        password,
        name: name.trim(),
      })

      if (result.error) {
        setError(result.error.message || "Registration failed")
        setIsLoading(false)
        return
      }

      // Registration successful - redirect to app user setup page
      console.log("✅ Account created, redirecting to profile setup...")
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push("/app-user-setup")
      router.refresh()
    } catch (err) {
      setError("Something went wrong. Please try again.")
      console.error("Registration error:", err)
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.cardWrapper}
      >
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              style={styles.logoContainer}
            >
              <div style={styles.logo}>
                <Image
                 src="https://upload.wikimedia.org/wikipedia/commons/2/25/Desh_tv_logo.jpg"
                 alt="Desh TV Logo"
                 width={120}
                 height={60}
                 className="object-contain w-full h-full"
                 priority
              />
              </div>
            </motion.div>
            <div style={styles.headerText}>
              <h1 style={styles.title}>Create Account</h1>
              <p style={styles.subtitle}>Join the Desh TV Newsroom Portal</p>
            </div>
          </div>

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
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                style={styles.formGroup}
              >
                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrapper}>
                  <User style={styles.icon} size={20} />
                  <input
                    type="text"
                    placeholder="Md. Abdullah"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.input}
                    required
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                style={styles.formGroup}
              >
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <Mail style={styles.icon} size={20} />
                  <input
                    type="email"
                    placeholder="you@deshtv.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                style={styles.formGroup}
              >
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <Lock style={styles.icon} size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...styles.input, paddingRight: "44px" }}
                    required
                    minLength={8}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    style={styles.strengthContainer}
                  >
                    <div style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          style={{
                            ...styles.strengthBar,
                            backgroundColor:
                              passwordStrength.score >= level
                                ? getStrengthColor()
                                : "#e2e8f0",
                          }}
                        />
                      ))}
                    </div>
                    <div style={styles.strengthChecks}>
                      <div
                        style={{
                          ...styles.strengthCheck,
                          color: passwordStrength.checks.length ? "#16a34a" : "#94a3b8",
                        }}
                      >
                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                        <span>8+ characters</span>
                      </div>
                      <div
                        style={{
                          ...styles.strengthCheck,
                          color: passwordStrength.checks.uppercase ? "#16a34a" : "#94a3b8",
                        }}
                      >
                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                        <span>Uppercase</span>
                      </div>
                      <div
                        style={{
                          ...styles.strengthCheck,
                          color: passwordStrength.checks.lowercase ? "#16a34a" : "#94a3b8",
                        }}
                      >
                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                        <span>Lowercase</span>
                      </div>
                      <div
                        style={{
                          ...styles.strengthCheck,
                          color: passwordStrength.checks.number ? "#16a34a" : "#94a3b8",
                        }}
                      >
                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                        <span>Number</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    ...styles.submitButton,
                    opacity: isLoading || passwordStrength.score < 3 ? 0.7 : 1,
                    cursor:
                      isLoading || passwordStrength.score < 3
                        ? "not-allowed"
                        : "pointer",
                  }}
                  disabled={isLoading || passwordStrength.score < 3 || !name || !email}
                >
                  {isLoading ? (
                    <div style={styles.loadingContent}>
                      <Loader2 size={20} style={styles.spinner} />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                style={styles.termsText}
              >
                By creating an account, you agree to our{" "}
                <a href="/terms" style={styles.termsLink}>
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" style={styles.termsLink}>
                  Privacy Policy
                </a>
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.3 }}
              style={styles.dividerContainer}
            >
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>Already have an account?</span>
              <div style={styles.dividerLine} />
            </motion.div>

            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
              href="/"
              style={styles.signInLink}
            >
              Sign In Instead
            </motion.a>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.3 }}
          style={styles.footer}
        >
          <p style={styles.footerText}>
            © {new Date().getFullYear()} Desh TV. All rights reserved.
          </p>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        input:hover {
          border-color: #cbd5e1;
        }

        input:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        button:hover:not(:disabled) {
          background: #b91c1c;
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
          transform: translateY(-2px);
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
    maxWidth: "450px",
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
    padding: "40px 24px 32px",
    textAlign: "center" as const,
    borderBottom: "1px solid #e2e8f0",
  } as React.CSSProperties,

  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  } as React.CSSProperties,

  logo: {
    width: "120px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    padding: "28px 24px",
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
    gap: "18px",
  } as React.CSSProperties,

  formGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  } as React.CSSProperties,

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
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
    padding: "10px 12px 10px 44px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "inherit",
    transition: "all 0.2s",
    background: "#f8fafc",
  } as React.CSSProperties,

  eyeButton: {
    position: "absolute" as const,
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s",
  } as React.CSSProperties,

  strengthContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    paddingTop: "8px",
  } as React.CSSProperties,

  strengthBars: {
    display: "flex",
    gap: "4px",
  } as React.CSSProperties,

  strengthBar: {
    flex: 1,
    height: "4px",
    borderRadius: "2px",
    transition: "background-color 0.3s",
  } as React.CSSProperties,

  strengthChecks: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 16px",
  } as React.CSSProperties,

  strengthCheck: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    transition: "color 0.2s",
  } as React.CSSProperties,

  submitButton: {
    width: "100%",
    padding: "11px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
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

  termsText: {
    fontSize: "11px",
    textAlign: "center" as const,
    color: "#64748b",
    margin: 0,
  } as React.CSSProperties,

  termsLink: {
    color: "#dc2626",
    textDecoration: "none",
    fontWeight: "600",
  } as React.CSSProperties,

  dividerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0",
  } as React.CSSProperties,

  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e2e8f0",
  } as React.CSSProperties,

  dividerText: {
    fontSize: "12px",
    color: "#64748b",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  signInLink: {
    width: "100%",
    padding: "11px",
    background: "#fce7f3",
    color: "#dc2626",
    border: "1px solid #fbcfe8",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    cursor: "pointer",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,

  footer: {
    textAlign: "center" as const,
    marginTop: "20px",
  } as React.CSSProperties,

  footerText: {
    fontSize: "11px",
    color: "#64748b",
    margin: 0,
  } as React.CSSProperties,
}