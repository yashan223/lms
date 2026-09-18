"use client";

import React, { Suspense } from "react";
import AdminEditCourseWorkspacePage from "../[courseId]/edit/page";
import { Loader2 } from "lucide-react";

export default function AdminNewCoursePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <h2 className="text-base font-bold text-slate-800">Initializing Individual Class Workspace...</h2>
          <p className="text-xs text-slate-400 mt-1">Preparing syllabus creator and modular unit editor...</p>
        </div>
      }
    >
      <AdminEditCourseWorkspacePage isNewCourseProp={true} />
    </Suspense>
  );
}
