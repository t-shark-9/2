import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/ui/block-editor";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, Sparkles, Menu, ImagePlus, Download } from "lucide-react";
import { toast } from "sonner";
import { exportBlockNoteToPDF } from "@/lib/pdf-export-blocknote";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Evaluation {
  overallScore: number;
  strengths: string[];
  improvements: Array<{
    criterion: string;
    issue: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  nextSteps: string[];
}

export default function Draft() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { flags } = useFeatureFlags();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    loadData();
  }, [user, authLoading, id, navigate]);

  const loadData = async () => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", id)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Load existing draft
      const { data: draftData } = await supabase
        .from("drafts")
        .select("*")
        .eq("assignment_id", id)
        .maybeSingle();

      if (draftData) {
        setContent(draftData.content || "");
      }
    } catch (error: any) {
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calculate word count from BlockNote blocks
      let wordCount = 0;
      try {
        const blocks = JSON.parse(content);
        blocks.forEach((block: any) => {
          if (block.content) {
            block.content.forEach((item: any) => {
              if (item.text) {
                wordCount += item.text.trim().split(/\s+/).filter((w: string) => w).length;
              }
            });
          }
        });
      } catch {
        wordCount = 0;
      }

      const { data: existingDraft } = await supabase
        .from("drafts")
        .select("id")
        .eq("assignment_id", id)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from("drafts")
          .update({
            content,
            word_count: wordCount,
          })
          .eq("id", existingDraft.id);
      } else {
        await supabase.from("drafts").insert([{
          assignment_id: id,
          content,
          word_count: wordCount,
        }]);
      }

      // Update assignment status
      await supabase
        .from("assignments")
        .update({ status: "writing" as any })
        .eq("id", id);

      toast.success("Draft saved!");
    } catch (error: any) {
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    try {
      const blocks = JSON.parse(content);
      await exportBlockNoteToPDF({
        title: assignment?.title || "Draft",
        blocks,
        subject: assignment?.subject,
        author: user?.user_metadata?.full_name || "IBDP Student"
      });
      toast.success("PDF downloaded successfully!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handleEvaluate = async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    setIsEvaluating(true);

    try {
      // Extract text content from BlockNote blocks for evaluation
      let textContent = "";
      try {
        const blocks = JSON.parse(content);
        blocks.forEach((block: any) => {
          if (block.content) {
            block.content.forEach((item: any) => {
              if (item.text) {
                textContent += item.text + " ";
              }
            });
          }
        });
      } catch {
        textContent = content;
      }

      const { data, error } = await supabase.functions.invoke("evaluate-draft", {
        body: {
          content: textContent.trim(),
          subject: assignment.subject,
          taskType: assignment.task_type,
          rubric: [],
        },
      });

      if (error) throw error;
      setEvaluation(data);
      setIsSidebarOpen(true);
      toast.success("Evaluation complete!");
    } catch (error: any) {
      console.error("Evaluation error:", error);
      toast.error(error.message || "Failed to evaluate draft");
    } finally {
      setIsEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/assignment/${id}/outline`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-semibold truncate max-w-md">
              {assignment?.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex">
              Writing
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEvaluate}
              disabled={isEvaluating}
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Evaluate
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>AI Evaluation</SheetTitle>
                  <SheetDescription>
                    IBDP standards feedback
                  </SheetDescription>
                </SheetHeader>
                {!evaluation ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      Click "Evaluate" to receive feedback on your writing
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 mt-6">
                    <div className="text-center pb-4 border-b">
                      <div className="text-4xl font-bold text-primary">{evaluation.overallScore}/7</div>
                      <p className="text-sm text-muted-foreground mt-1">IBDP Level</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 text-sm">Strengths</h3>
                      <ul className="space-y-2">
                        {evaluation.strengths.map((strength, i) => (
                          <li key={i} className="text-sm p-3 rounded-lg bg-success/10 border border-success/20">
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 text-sm">Areas for Improvement</h3>
                      <ul className="space-y-3">
                        {evaluation.improvements.map((item, i) => (
                          <li key={i} className="text-sm p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <div className="font-medium mb-1">{item.criterion}</div>
                            <p className="text-muted-foreground mb-2 text-xs">{item.issue}</p>
                            <p className="text-xs italic">{item.suggestion}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 text-sm">Next Steps</h3>
                      <ul className="space-y-2">
                        {evaluation.nextSteps.map((step, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-0.5">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="container max-w-4xl mx-auto px-6 py-8">
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border flex items-start gap-3">
          <ImagePlus className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Image Support Enabled</p>
            <p>You can add images to your draft by clicking the <strong>"+"</strong> button in the editor and selecting <strong>"Image"</strong>, or simply drag and drop image files into the editor.</p>
          </div>
        </div>
        <BlockEditor
          initialContent={content}
          onChange={setContent}
          placeholder="Start writing your draft here..."
        />
      </div>
    </div>
  );
}
