import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useEffect } from "react";

interface BlockEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

async function uploadFile(file: File): Promise<string> {
  // Create a unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  
  // For now, use a data URL (base64) to embed images
  // In production, you'd upload to Supabase Storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BlockEditor({ initialContent, onChange, placeholder }: BlockEditorProps) {
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent 
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    uploadFile,
  });

  useEffect(() => {
    if (!onChange) return;

    const handleChange = () => {
      const blocks = editor.document;
      onChange(JSON.stringify(blocks));
    };

    editor.onChange(handleChange);
  }, [editor, onChange]);

  return (
    <BlockNoteView 
      editor={editor} 
      theme="light"
      className="min-h-[600px]"
    />
  );
}
