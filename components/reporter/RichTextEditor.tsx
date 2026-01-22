// ============================================================================
// File: components/reporter/RichTextEditor.tsx
// Description: TipTap rich text editor component
// ============================================================================

"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from "lucide-react"
import { useEffect } from "react"

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: string
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Enter description...",
  disabled = false,
  minHeight = "120px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !disabled,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  return (
    <div style={{ ...styles.container, opacity: disabled ? 0.6 : 1 }}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive("bold") ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive("italic") ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive("underline") ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={14} />
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive("bulletList") ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Bullet List"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive("orderedList") ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive({ textAlign: "left" }) ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive({ textAlign: "center" }) ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            style={{
              ...styles.toolbarBtn,
              ...(editor.isActive({ textAlign: "right" }) ? styles.toolbarBtnActive : {}),
            }}
            disabled={disabled}
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            style={styles.toolbarBtn}
            disabled={disabled || !editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            style={styles.toolbarBtn}
            disabled={disabled || !editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={14} />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div style={{ ...styles.editorWrapper, minHeight }}>
        <EditorContent editor={editor} style={styles.editor} />
      </div>

      {/* Editor Styles */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: ${minHeight};
          padding: 12px;
          color: #2c3e50;
          font-size: 13px;
          line-height: 1.6;
          background-color: #ffffff;
        }
        .ProseMirror p {
          margin: 0 0 8px 0;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          margin: 0 0 8px 0;
          padding-left: 24px;
        }
        .ProseMirror li {
          margin-bottom: 4px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #999999;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror strong {
          font-weight: 700;
          color: #2c3e50;
        }
        .ProseMirror em {
          font-style: italic;
        }
        .ProseMirror u {
          text-decoration: underline;
        }
        .ProseMirror ::selection {
          background: rgba(52, 152, 219, 0.3);
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d0d0d0",
    borderRadius: "4px",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 8px",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#d0d0d0",
    flexWrap: "wrap",
  },
  toolbarGroup: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
  toolbarBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: "4px",
    color: "#555555",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  toolbarBtnActive: {
    backgroundColor: "#3498db",
    color: "#ffffff",
  },
  divider: {
    width: "1px",
    height: "20px",
    backgroundColor: "#d0d0d0",
    margin: "0 4px",
  },
  editorWrapper: {
    overflow: "auto",
    backgroundColor: "#ffffff",
  },
  editor: {
    height: "100%",
  },
}