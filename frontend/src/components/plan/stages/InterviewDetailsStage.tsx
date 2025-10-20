"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";

const InterviewDetailsStage = ({ isActive }: { isActive: boolean }) => {
  const { data, updateData, nextStage } = usePrepPlan();
  const [role, setRole] = useState(data.role || "");
  const [company, setCompany] = useState(data.company || "");
  const [date, setDate] = useState(data.date || "");
  const [focusAreas, setFocusAreas] = useState((data.focusAreas || []).join(", "));

  // Validation state
  const [errors, setErrors] = useState<{ role?: string; date?: string; focusAreas?: string }>({});

  useEffect(() => {
    updateData({
      role,
      company,
      date,
      focusAreas: focusAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, company, date, focusAreas]);

  const validate = () => {
    const newErrors: { role?: string; date?: string; focusAreas?: string } = {};

    if (!role.trim()) {
      newErrors.role = "Role / Position is required.";
    }

    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = "Interview date cannot be in the past.";
      }
    } else {
      newErrors.date = "Please select a date.";
    }

    if (!focusAreas.trim()) {
      newErrors.focusAreas = "Please enter at least one focus area.";
    } else {
      const areas = focusAreas.split(",").map((s) => s.trim());
      if (areas.length > 1 && !focusAreas.includes(",")) {
        newErrors.focusAreas = "Separate multiple focus areas with commas.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      nextStage();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Role / Position *</Label>
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Software Engineer"
          disabled={!isActive}
        />
        {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
      </div>

      <div>
        <Label>Company (optional)</Label>
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Google"
          disabled={!isActive}
        />
      </div>

      <div>
        <Label>Interview Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={!isActive}
        />
        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
      </div>

      <div>
        <Label>Focus Areas (comma separated)</Label>
        <Input
          value={focusAreas}
          onChange={(e) => setFocusAreas(e.target.value)}
          placeholder="e.g. Algorithms, system design, behavior"
          disabled={!isActive}
        />
        {errors.focusAreas && (
          <p className="text-red-500 text-sm mt-1">{errors.focusAreas}</p>
        )}
      </div>

      <div className="flex gap-3 pt-3">
        <Button
          variant="ghost"
          onClick={() => {
            setRole("");
            setCompany("");
            setDate("");
            setFocusAreas("");
            setErrors({});
          }}
          disabled={!isActive}
        >
          Clear
        </Button>
        <Button onClick={handleNext} disabled={!isActive}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default InterviewDetailsStage;
