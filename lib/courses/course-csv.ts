import type { CourseWeekType, EditableCourse } from "@/lib/types";

export type ParsedCourseInput = Omit<EditableCourse, "id" | "userId" | "semesterId">;

export type CourseCsvParseResult = {
  courses: ParsedCourseInput[];
  errors: string[];
};

const requiredHeaders = [
  "课程名",
  "星期",
  "开始时间",
  "结束时间",
  "开始周",
  "结束周",
  "单双周",
  "教室",
  "老师"
];

const weekdayMap = new Map<string, number>([
  ["周一", 1],
  ["星期一", 1],
  ["一", 1],
  ["1", 1],
  ["周二", 2],
  ["星期二", 2],
  ["二", 2],
  ["2", 2],
  ["周三", 3],
  ["星期三", 3],
  ["三", 3],
  ["3", 3],
  ["周四", 4],
  ["星期四", 4],
  ["四", 4],
  ["4", 4],
  ["周五", 5],
  ["星期五", 5],
  ["五", 5],
  ["5", 5],
  ["周六", 6],
  ["星期六", 6],
  ["六", 6],
  ["6", 6],
  ["周日", 7],
  ["星期日", 7],
  ["周天", 7],
  ["星期天", 7],
  ["日", 7],
  ["天", 7],
  ["7", 7]
]);

const weekTypeMap = new Map<string, CourseWeekType>([
  ["每周", "all"],
  ["全周", "all"],
  ["所有周", "all"],
  ["all", "all"],
  ["单周", "odd"],
  ["odd", "odd"],
  ["双周", "even"],
  ["even", "even"]
]);

export function normalizeWeekday(value: string): number {
  const normalized = value.trim();
  const weekday = weekdayMap.get(normalized);

  if (!weekday) {
    throw new Error("星期格式错误");
  }

  return weekday;
}

export function normalizeWeekType(value: string): CourseWeekType {
  const normalized = value.trim().toLowerCase();
  const weekType = weekTypeMap.get(normalized);

  if (!weekType) {
    throw new Error("单双周格式错误");
  }

  return weekType;
}

export function parseCourseCsv(csvText: string): CourseCsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { courses: [], errors: ["CSV 内容为空，请粘贴课表数据。"] };
  }

  const headers = splitCsvLine(lines[0]);
  const missingHeader = requiredHeaders.find((header) => !headers.includes(header));

  if (missingHeader) {
    return {
      courses: [],
      errors: [`CSV 表头缺少「${missingHeader}」，请检查格式。`]
    };
  }

  const courses: ParsedCourseInput[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const columns = splitCsvLine(line);

    if (columns.length !== headers.length) {
      errors.push(`第 ${lineNumber} 行列数不正确，请检查逗号分隔格式。`);
      return;
    }

    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, columns[columnIndex]?.trim() ?? ""]));

    try {
      const name = requireText(row["课程名"], "课程名");
      const weekday = normalizeWeekday(row["星期"]);
      const startTime = normalizeTime(row["开始时间"]);
      const endTime = normalizeTime(row["结束时间"]);
      const startWeek = normalizeWeekNumber(row["开始周"], "开始周");
      const endWeek = normalizeWeekNumber(row["结束周"], "结束周");

      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        throw new Error("结束时间必须晚于开始时间");
      }

      if (endWeek < startWeek) {
        throw new Error("结束周不能早于开始周");
      }

      courses.push({
        name,
        teacher: row["老师"]?.trim() ?? "",
        location: row["教室"]?.trim() ?? "",
        weekday,
        startTime,
        endTime,
        startWeek,
        endWeek,
        weekType: normalizeWeekType(row["单双周"]),
        color: defaultCourseColor(courses.length)
      });
    } catch (error) {
      errors.push(`第 ${lineNumber} 行：${error instanceof Error ? error.message : "数据格式错误"}`);
    }
  });

  return {
    courses: errors.length > 0 ? [] : courses,
    errors
  };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function requireText(value: string | undefined, label: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label}不能为空`);
  }

  return normalized;
}

function normalizeTime(value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(normalized);

  if (!match) {
    throw new Error("时间格式错误，请使用 HH:mm");
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeWeekNumber(value: string | undefined, label: string): number {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 30) {
    throw new Error(`${label}必须是 1-30 的整数`);
  }

  return numberValue;
}

function defaultCourseColor(index: number): string {
  const colors = ["#13795b", "#2f6fbb", "#b7791f", "#8b5cf6", "#dc2626", "#0f766e"];
  return colors[index % colors.length];
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

