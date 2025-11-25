import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/ui/block-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, Sparkles, ChevronDown, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { exportBlockNoteToPDF } from "@/lib/pdf-export-blocknote";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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

interface CoachingResponse {
  questions: string[];
  thesisPattern: string;
  evidenceChecklist: string[];
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
  const [planNotes, setPlanNotes] = useState<CoachingResponse | null>(null);

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

      // Load plan notes (coaching response from planning phase)
      const { data: planData } = await supabase
        .from("plans")
        .select("coaching_response")
        .eq("assignment_id", id)
        .maybeSingle();

      if (planData?.coaching_response) {
        setPlanNotes(planData.coaching_response);
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

  const handleExportWord = async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    try {
      let textContent = "";
      const blocks = JSON.parse(content);
      blocks.forEach((block: any) => {
        if (block.content) {
          block.content.forEach((item: any) => {
            if (item.text) {
              textContent += item.text;
            }
          });
          textContent += "\n\n";
        }
      });

      const blob = new Blob([textContent], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${assignment?.title || "draft"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Word document downloaded!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export Word document");
    }
  };

  const handleExportText = async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    try {
      let textContent = "";
      const blocks = JSON.parse(content);
      blocks.forEach((block: any) => {
        if (block.content) {
          block.content.forEach((item: any) => {
            if (item.text) {
              textContent += item.text;
            }
          });
          textContent += "\n\n";
        }
      });

      const blob = new Blob([textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${assignment?.title || "draft"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Text file downloaded!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export text file");
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="border-b bg-background">
        <div className="container max-w-full mx-auto px-6 py-3 flex items-center justify-between">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Download
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  Download as PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportWord}>
                  Download as Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportText}>
                  Download as Text (.txt)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          </div>
        </div>
      </div>

      {/* Resizable three-column layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Planning Notes */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <div className="h-full overflow-y-auto bg-muted/30 border-r">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Planning Notes</h2>
                </div>
                {!planNotes ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">
                      No planning notes available for this assignment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Clarifying Questions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {planNotes.questions.map((question, i) => (
                            <li key={i} className="text-sm p-2 rounded bg-accent/10 border border-accent/20">
                              {question}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Thesis Pattern</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm p-2 rounded bg-primary/10 border border-primary/20 italic">
                          {planNotes.thesisPattern}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Evidence Checklist</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {planNotes.evidenceChecklist.map((item, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-success mt-0.5">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Panel - Editor */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full overflow-y-auto">
              <div className="container max-w-4xl mx-auto px-6 py-8">
                <BlockEditor
                  initialContent={content}
                  onChange={setContent}
                  placeholder="Start writing your draft here..."
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Evaluation */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
            <div className="h-full overflow-y-auto bg-muted/30 border-l">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">AI Feedback</h2>
                </div>
                {!evaluation ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      Click "Evaluate" to receive feedback on your writing
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center pb-4 border-b">
                          <div className="text-4xl font-bold text-primary">{evaluation.overallScore}/7</div>
                          <p className="text-sm text-muted-foreground mt-1">IBDP Level</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {evaluation.strengths.map((strength, i) => (
                            <li key={i} className="text-sm p-2 rounded bg-success/10 border border-success/20">
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Areas for Improvement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {evaluation.improvements.map((item, i) => (
                            <li key={i} className="text-sm p-2 rounded bg-accent/10 border border-accent/20">
                              <div className="font-medium mb-1">{item.criterion}</div>
                              <p className="text-muted-foreground mb-2 text-xs">{item.issue}</p>
                              <p className="text-xs italic">{item.suggestion}</p>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {evaluation.nextSteps.map((step, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-0.5">{i + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
