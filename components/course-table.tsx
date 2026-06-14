import { Clock, MapPin, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCourseTime, getWeekTypeLabel, getWeekdayLabel } from "@/lib/courses/course-format";
import type { Course } from "@/lib/types";

type CourseTableProps = {
  courses: Course[];
  compact?: boolean;
};

export function CourseTable({ courses, compact = false }: CourseTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>本周课表</CardTitle>
          <Badge variant="outline">课程时间不可移动</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
          {courses.map((course) => (
            <article className="rounded-lg border bg-background p-3" key={course.id}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {course.weekdayLabel ?? getWeekdayLabel(course.weekday)}
                  </p>
                  <h3 className="mt-1 text-base font-semibold">{course.name}</h3>
                </div>
                <Badge>{getWeekTypeLabel(course.weekType)}</Badge>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatCourseTime(course)}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {course.location || "未填写教室"}
                </p>
                <p className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  {course.teacher || "未填写老师"}
                </p>
                <p>
                  第 {course.startWeek}-{course.endWeek} 周
                </p>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

