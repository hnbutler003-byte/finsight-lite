import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { GraduationCap, Loader2, Trash2, KeyRound, AlertCircle, Mail, BookOpen, ArrowRightLeft, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

type OrgTeacher = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  schoolName: string;
  isVerified: boolean;
  classCount: number;
  createdAt: string;
};

type OrgClass = {
  id: number;
  name: string;
  subject: string;
  teacherId: number;
  teacherName: string;
  enrollmentCount: number;
  code: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrgTeachers() {
  const { admin, isLoading: authLoading } = useOrgAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [resetDialog, setResetDialog] = useState<OrgTeacher | null>(null);

  // Reassign dialog state
  const [reassignDialog, setReassignDialog] = useState<{
    classId: number;
    className: string;
    currentTeacherId: number;
    currentTeacherName: string;
  } | null>(null);
  const [selectedNewTeacherId, setSelectedNewTeacherId] = useState<string>("");

  const { data: teachers = [], isLoading } = useQuery<OrgTeacher[]>({
    queryKey: ["/api/org-admin/teachers"],
    queryFn: () => fetch("/api/org-admin/teachers", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery<OrgClass[]>({
    queryKey: ["/api/org-admin/classes"],
    queryFn: () => fetch("/api/org-admin/classes", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const removeTeacher = useMutation({
    mutationFn: (teacherId: number) =>
      apiRequest("DELETE", `/api/org-admin/teachers/${teacherId}`).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/org-admin/teachers"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/classes"] });
      setConfirmRemoveId(null);
      toast({ title: "Teacher removed", description: "The teacher has been removed from your organisation." });
    },
    onError: (e: any) => {
      setConfirmRemoveId(null);
      toast({ title: "Could not remove teacher", description: e.message, variant: "destructive" });
    },
  });

  const resetPassword = useMutation({
    mutationFn: (teacherId: number) =>
      apiRequest("POST", `/api/org-admin/teachers/${teacherId}/password-reset`).then(r => r.json()),
    onSuccess: (data: { ok: boolean; emailSent: boolean }) => {
      setResetDialog(null);
      toast({
        title: "Password reset",
        description: data.emailSent
          ? "A temporary password has been emailed to the teacher."
          : "Password reset: the teacher has no email address on file so no notification was sent.",
      });
    },
    onError: (e: any) => {
      setResetDialog(null);
      toast({ title: "Could not reset password", description: e.message, variant: "destructive" });
    },
  });

  const reassignTeacher = useMutation({
    mutationFn: ({ classId, newTeacherId }: { classId: number; newTeacherId: number }) =>
      apiRequest("PATCH", `/api/org-admin/classes/${classId}/teacher`, { newTeacherId }).then(r => r.json()),
    onSuccess: (data: { ok: boolean; newTeacherName: string }) => {
      qc.invalidateQueries({ queryKey: ["/api/org-admin/classes"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/teachers"] });
      setReassignDialog(null);
      setSelectedNewTeacherId("");
      toast({
        title: "Class reassigned",
        description: `Class is now assigned to ${data.newTeacherName}. All students, lessons, and data remain unchanged.`,
      });
    },
    onError: (e: any) => {
      toast({ title: "Could not reassign class", description: e.message, variant: "destructive" });
    },
  });

  function openReassignDialog(cls: OrgClass) {
    setReassignDialog({
      classId: cls.id,
      className: cls.name,
      currentTeacherId: cls.teacherId,
      currentTeacherName: cls.teacherName,
    });
    setSelectedNewTeacherId("");
  }

  function handleReassign() {
    if (!reassignDialog || !selectedNewTeacherId) return;
    reassignTeacher.mutate({ classId: reassignDialog.classId, newTeacherId: Number(selectedNewTeacherId) });
  }

  const otherTeachers = reassignDialog
    ? teachers.filter(t => t.id !== reassignDialog.currentTeacherId)
    : [];

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!admin) {
    setLocation("/org/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OrgSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Teachers section */}
          <div>
            <div className="mb-4">
              <h1 className="font-display font-bold text-3xl flex items-center gap-2">
                <GraduationCap className="w-7 h-7 text-indigo-500" />
                Teachers
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-teacher-count">
                {isLoading
                  ? "Loading..."
                  : `${teachers.length} teacher${teachers.length !== 1 ? "s" : ""} in your organisation`}
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : teachers.length === 0 ? (
              <Card className="glass-card rounded-glass">
                <CardContent className="p-12 text-center">
                  <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-muted-foreground">No teachers linked to this organisation yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Teachers register and are linked to your org by the system administrator.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card rounded-glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground">Teacher</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground hidden sm:table-cell">Email</th>
                        <th className="text-center px-5 py-3.5 font-semibold text-muted-foreground hidden md:table-cell">Classes</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground hidden lg:table-cell">Member since</th>
                        <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher) => (
                        <tr
                          key={teacher.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          data-testid={`row-teacher-${teacher.id}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                                <span className="font-bold text-indigo-600 dark:text-indigo-300 text-sm">
                                  {teacher.firstName.charAt(0)}{teacher.lastName?.charAt(0) ?? ""}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {teacher.firstName} {teacher.lastName ?? ""}
                                </p>
                                <p className="text-xs text-muted-foreground sm:hidden">{teacher.email}</p>
                                <p className="text-xs text-muted-foreground">{teacher.schoolName}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              {teacher.email}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center hidden md:table-cell">
                            <Badge variant="secondary" data-testid={`badge-class-count-${teacher.id}`}>
                              {teacher.classCount}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 hidden lg:table-cell text-muted-foreground text-xs">
                            {formatDate(teacher.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {confirmRemoveId === teacher.id ? (
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                    Confirm remove?
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs px-2 rounded-xl"
                                    disabled={removeTeacher.isPending}
                                    onClick={() => removeTeacher.mutate(teacher.id)}
                                    data-testid={`button-confirm-remove-teacher-${teacher.id}`}
                                  >
                                    {removeTeacher.isPending
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : "Remove"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs px-2 rounded-xl"
                                    onClick={() => setConfirmRemoveId(null)}
                                    data-testid={`button-cancel-remove-teacher-${teacher.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setResetDialog(teacher)}
                                    className="p-2 rounded-xl text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 transition-all"
                                    data-testid={`button-reset-password-${teacher.id}`}
                                    title="Send password reset email"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmRemoveId(teacher.id)}
                                    className="p-2 rounded-xl text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all"
                                    data-testid={`button-remove-teacher-${teacher.id}`}
                                    title="Remove from organisation"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* Classes section */}
          <div>
            <div className="mb-4">
              <h2 className="font-display font-bold text-2xl flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-teal-500" />
                Classes
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Each class has exactly one assigned teacher at any time. Use "Reassign" to hand a class to a different teacher - all students and data stay intact.
              </p>
            </div>

            {classesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : classes.length === 0 ? (
              <Card className="glass-card rounded-glass">
                <CardContent className="p-10 text-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-muted-foreground">No classes yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Classes appear here once teachers in your organisation create them.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card rounded-glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground">Class</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground hidden sm:table-cell">Current Teacher</th>
                        <th className="text-center px-5 py-3.5 font-semibold text-muted-foreground hidden md:table-cell">Students</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground hidden lg:table-cell">Code</th>
                        <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls) => (
                        <tr
                          key={cls.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          data-testid={`row-class-${cls.id}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-300" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground" data-testid={`text-class-name-${cls.id}`}>
                                  {cls.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{cls.subject}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                                <GraduationCap className="w-3 h-3 text-indigo-600 dark:text-indigo-300" />
                              </div>
                              <span className="text-sm text-foreground" data-testid={`text-class-teacher-${cls.id}`}>
                                {cls.teacherName}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center hidden md:table-cell">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground" data-testid={`text-class-students-${cls.id}`}>
                                {cls.enrollmentCount}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                              {cls.code}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => openReassignDialog(cls)}
                                disabled={teachers.length < 2}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                data-testid={`button-reassign-class-${cls.id}`}
                                title={teachers.length < 2 ? "At least 2 teachers needed to reassign" : "Reassign to a different teacher"}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                Reassign
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* Notes card */}
          <Card className="glass-card rounded-glass">
            <CardContent className="p-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">Removing a teacher</span> revokes their access to this organisation's classes and data but does not delete their account; they can be linked to other organisations.{" "}
                <span className="font-semibold text-foreground">Password reset</span> generates a temporary password and emails it to the teacher's registered address.
              </p>
              <p>
                <span className="font-semibold text-foreground">Reassigning a class</span> only changes the assigned teacher - one teacher per class at a time. The previous teacher immediately loses access to that class and the new teacher gains full access to all existing students, lessons, and history.
              </p>
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Password reset dialog */}
      <Dialog open={!!resetDialog} onOpenChange={(open) => { if (!open) setResetDialog(null); }}>
        <DialogContent className="rounded-glass max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password for {resetDialog?.firstName}?</DialogTitle>
            <DialogDescription>
              A temporary password will be generated and emailed to{" "}
              <strong>{resetDialog?.email}</strong>. The teacher should sign in and update it straight away.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setResetDialog(null)}
              data-testid="button-cancel-reset-dialog"
            >
              Cancel
            </Button>
            <Button
              onClick={() => resetDialog && resetPassword.mutate(resetDialog.id)}
              disabled={resetPassword.isPending}
              data-testid="button-confirm-reset-password"
            >
              {resetPassword.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send reset email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign teacher dialog */}
      <Dialog open={!!reassignDialog} onOpenChange={(open) => { if (!open) { setReassignDialog(null); setSelectedNewTeacherId(""); } }}>
        <DialogContent className="rounded-glass max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
              Reassign Teacher
            </DialogTitle>
            <DialogDescription>
              Reassigning <strong>{reassignDialog?.className}</strong> from{" "}
              <strong>{reassignDialog?.currentTeacherName}</strong> to another teacher. Only the assigned teacher changes - all students, lessons, content, and history stay exactly as they are.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-foreground">
              New teacher <span className="text-muted-foreground">(one teacher per class at a time)</span>
            </label>
            {otherTeachers.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                No other teachers available in this organisation.
              </p>
            ) : (
              <Select value={selectedNewTeacherId} onValueChange={setSelectedNewTeacherId}>
                <SelectTrigger className="w-full" data-testid="select-new-teacher">
                  <SelectValue placeholder="Select a teacher..." />
                </SelectTrigger>
                <SelectContent>
                  {otherTeachers.map(t => (
                    <SelectItem key={t.id} value={String(t.id)} data-testid={`option-teacher-${t.id}`}>
                      {t.firstName} {t.lastName ?? ""} - {t.classCount} class{t.classCount !== 1 ? "es" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => { setReassignDialog(null); setSelectedNewTeacherId(""); }}
              data-testid="button-cancel-reassign"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!selectedNewTeacherId || reassignTeacher.isPending || otherTeachers.length === 0}
              data-testid="button-confirm-reassign"
            >
              {reassignTeacher.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Reassign Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
