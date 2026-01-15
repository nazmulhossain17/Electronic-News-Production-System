"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import authClient from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Login successful
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push("/enps");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Login error:", err);
      setIsLoading(false);
    }
  };

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
              <h1 style={styles.title}>Welcome Back</h1>
              <p style={styles.subtitle}>Sign in to access the Desh TV Portal</p>
            </div>
          </div>

          {/* Content */}
          <div style={styles.cardContent}>
            {/* Error Message */}
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
              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
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

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                style={styles.formGroup}
              >
                <div style={styles.labelWrapper}>
                  <label style={styles.label}>Password</label>
                  <a href="/forgot-password" style={styles.forgotLink}>
                    Forgot password?
                  </a>
                </div>
                <div style={styles.inputWrapper}>
                  <Lock style={styles.icon} size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    ...styles.submitButton,
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? (
                    <div style={styles.loadingContent}>
                      <Loader2 size={20} style={styles.spinner} />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </motion.div>
            </div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              style={styles.dividerContainer}
            >
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>New to Desh TV?</span>
              <div style={styles.dividerLine} />
            </motion.div>

            {/* Create Account Button */}
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.3 }}
              href="/register"
              style={styles.createAccountLink}
            >
              Create an Account
            </motion.a>
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
        
        a[style*="createAccountLink"]:hover {
          background: #f8b4d4;
          border-color: #f472b6;
        }
      `}</style>
    </div>
  );
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
    padding: "40px 24px",
    textAlign: "center" as const,
    borderBottom: "1px solid #e2e8f0",
  } as React.CSSProperties,

  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  } as React.CSSProperties,

  logo: {
    width: "120px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  headerText: {
    marginTop: "16px",
  } as React.CSSProperties,

  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 8px 0",
  } as React.CSSProperties,

  subtitle: {
    fontSize: "14px",
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
    gap: "20px",
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
  } as React.CSSProperties,

  labelWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,

  forgotLink: {
    fontSize: "12px",
    color: "#dc2626",
    textDecoration: "none",
    fontWeight: "600",
    transition: "color 0.2s",
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

  submitButton: {
    width: "100%",
    padding: "12px",
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

  dividerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "24px 0",
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

  createAccountLink: {
    width: "100%",
    padding: "12px",
    background: "#fce7f3",
    color: "#dc2626",
    border: "1px solid #fbcfe8",
    borderRadius: "8px",
    fontSize: "14px",
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
    marginTop: "24px",
  } as React.CSSProperties,

  footerText: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
  } as React.CSSProperties,
};