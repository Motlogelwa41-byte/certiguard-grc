import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Star } from "lucide-react";

export default function TaskFeedbackModal({ taskId, taskTitle, open, onOpenChange }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [difficulty, setDifficulty] = useState("moderate");
  const [clarity, setClarity] = useState("clear");
  const [hours, setHours] = useState("");
  const [comments, setComments] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setRating(0); setHover(0); setDifficulty("moderate"); setClarity("clear");
    setHours(""); setComments(""); setSuggestions("");
  };

  const submit = async () => {
    if (!rating) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.TaskFeedback.create({
        task_id: taskId,
        task_title: taskTitle,
        rating,
        difficulty,
        clarity,
        time_to_complete_hours: hours ? Number(hours) : undefined,
        comments,
        suggestions,
      });
      toast({ title: "Thank you — feedback submitted" });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Task Feedback</DialogTitle>
          <p className="text-sm text-muted-foreground">{taskTitle}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Overall experience</Label>
            <div className="flex gap-1 mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-7 h-7 cursor-pointer transition-colors ${(hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clarity</Label>
              <Select value={clarity} onValueChange={setClarity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clear">Clear</SelectItem>
                  <SelectItem value="somewhat_clear">Somewhat clear</SelectItem>
                  <SelectItem value="unclear">Unclear</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Time to complete (hours)</Label>
            <Input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 2.5" />
          </div>
          <div>
            <Label>Comments</Label>
            <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="What worked well?" />
          </div>
          <div>
            <Label>Suggestions to improve</Label>
            <Textarea rows={2} value={suggestions} onChange={(e) => setSuggestions(e.target.value)} placeholder="How can we refine our compliance process?" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !rating}>
            {saving ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}