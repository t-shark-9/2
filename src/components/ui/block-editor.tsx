import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView, getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useEffect, useState, useMemo } from "react";
import { EquationEditor } from "@/components/ui/equation-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Subscript, PencilLine } from "lucide-react";

interface BlockEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  onOpenEquation?: () => void;
  onOpenDrawing?: () => void;
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

export function BlockEditor({ initialContent, onChange, placeholder, onOpenEquation, onOpenDrawing }: BlockEditorProps) {
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isEquationOpen, setIsEquationOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<BlockNoteEditor | null>(null);
  
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent 
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    uploadFile,
  });

  // Custom slash menu items that will be added to the default menu
  const customSlashMenuItems = useMemo(() => (editor: BlockNoteEditor) => [
    ...getDefaultReactSlashMenuItems(editor),
    {
      title: "Equation",
      onItemClick: () => {
        setIsEquationOpen(true);
      },
      aliases: ["math", "latex", "formula", "equation"],
      group: "Advanced",
      icon: <Subscript size={18} />,
      subtext: "Insert a mathematical equation",
    },
    {
      title: "Drawing",
      onItemClick: () => {
        setIsDrawingOpen(true);
      },
      aliases: ["draw", "illustration", "sketch", "diagram"],
      group: "Media",
      icon: <PencilLine size={18} />,
      subtext: "Create an illustration or diagram",
    },
  ], []);

  useEffect(() => {
    setEditorInstance(editor);
  }, [editor]);

  useEffect(() => {
    if (!onChange) return;

    const handleChange = () => {
      const blocks = editor.document;
      onChange(JSON.stringify(blocks));
    };

    editor.onChange(handleChange);
  }, [editor, onChange]);

  // Listen for drawing insertion from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'drawing-saved' && event.data.imageData) {
        // Insert the drawing as an image block
        if (editorInstance) {
          try {
            const currentBlock = editorInstance.getTextCursorPosition().block;
            editorInstance.insertBlocks(
              [
                {
                  type: "image",
                  props: {
                    url: event.data.imageData,
                    caption: "Drawing",
                  },
                },
              ],
              currentBlock,
              "after"
            );
          } catch (error) {
            console.error('Error inserting drawing:', error);
          }
        }
        setIsDrawingOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [editorInstance]);

  const handleEquationInsert = (latex: string, isInline: boolean) => {
    if (!editorInstance) return;
    
    try {
      if (isInline) {
        // Insert inline equation as text with special marker
        editorInstance.insertInlineContent([
          {
            type: "text",
            text: `$${latex}$`,
            styles: { code: true },
          },
        ]);
      } else {
        // Insert block equation as a paragraph with code styling
        const currentBlock = editorInstance.getTextCursorPosition().block;
        editorInstance.insertBlocks(
          [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `$$${latex}$$`,
                  styles: { code: true },
                },
              ],
            },
          ],
          currentBlock,
          "after"
        );
      }
      setIsEquationOpen(false);
    } catch (error) {
      console.error('Error inserting equation:', error);
      setIsEquationOpen(false);
    }
  };

  return (
    <>
      <BlockNoteView 
        editor={editor} 
        theme="light"
        className="min-h-[600px]"
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={async (query) =>
            customSlashMenuItems(editor).filter((item) =>
              item.title.toLowerCase().startsWith(query.toLowerCase()) ||
              item.aliases?.some((alias) => alias.toLowerCase().startsWith(query.toLowerCase()))
            )
          }
        />
      </BlockNoteView>

      {/* Equation Editor Dialog */}
      <EquationEditor
        isOpen={isEquationOpen}
        onClose={() => setIsEquationOpen(false)}
        onInsert={handleEquationInsert}
      />

      {/* Drawing Dialog */}
      <Dialog open={isDrawingOpen} onOpenChange={setIsDrawingOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Illustration Editor</DialogTitle>
            <DialogDescription>
              Create drawings and diagrams. Save your illustration to insert it into your draft.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[calc(95vh-100px)] overflow-hidden">
            <iframe 
              src="/drawings/index.html" 
              className="w-full h-full border-0"
              title="Illustration Editor"
              sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
