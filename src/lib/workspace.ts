import type { Task, TaskList, UserCalendar, UserEvent } from "../types";
import { requireSupabase } from "./supabase";

type Workspace = {
  tasks: Task[];
  lists: TaskList[];
  calendars: UserCalendar[];
  events: UserEvent[];
};

let saveQueue = Promise.resolve();

function throwOnError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function loadWorkspace(): Promise<Workspace> {
  const client = requireSupabase();
  const [tasks, lists, calendars, events] = await Promise.all([
    client.from("tasks").select("*").order("created_at", { ascending: true }),
    client
      .from("task_lists")
      .select("*")
      .order("created_at", { ascending: true }),
    client
      .from("calendars")
      .select("*")
      .order("created_at", { ascending: true }),
    client.from("events").select("*").order("start_date", { ascending: true }),
  ]);

  throwOnError(tasks.error);
  throwOnError(lists.error);
  throwOnError(calendars.error);
  throwOnError(events.error);

  return {
    tasks: (tasks.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      completed: row.completed,
      dueDate: row.due_date,
      endDate: row.end_date,
      description: row.description ?? undefined,
      priority: row.priority ?? undefined,
      recurrence: row.recurrence,
      recurrenceRule: row.recurrence_unit
        ? {
            interval: row.recurrence_interval ?? 1,
            unit: row.recurrence_unit,
            weekdays: row.recurrence_weekdays ?? [],
            stop: row.recurrence_stop ?? "never",
            endDate: row.recurrence_end_date,
            occurrences: row.recurrence_occurrences,
          }
        : undefined,
      listId: row.list_id,
      createdAt: row.created_at,
    })),
    lists: (lists.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    calendars: (calendars.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    })),
    events: (events.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      startDate: row.start_date,
      endDate: row.end_date,
      allDay: row.all_day,
      description: row.description ?? undefined,
      location: row.location ?? undefined,
      calendarId: row.calendar_id,
    })),
  };
}

async function persistWorkspace(workspace: Workspace) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  throwOnError(userError);
  if (!userData.user)
    throw new Error("You must be signed in to save workspace data.");

  const userId = userData.user.id;
  const parents = await Promise.all([
    client.from("task_lists").upsert(
      workspace.lists.map((list) => ({
        id: list.id,
        user_id: userId,
        name: list.name,
      })),
      { onConflict: "id" },
    ),
    client.from("calendars").upsert(
      workspace.calendars.map((calendar) => ({
        id: calendar.id,
        user_id: userId,
        name: calendar.name,
        color: calendar.color,
      })),
      { onConflict: "id" },
    ),
  ]);
  parents.forEach((result) => throwOnError(result.error));

  const children = await Promise.all([
    client.from("tasks").upsert(
      workspace.tasks.map((task) => ({
        id: task.id,
        user_id: userId,
        title: task.title,
        completed: task.completed,
        due_date: task.dueDate,
        end_date: task.endDate,
        description: task.description ?? null,
        priority: task.priority ?? null,
        recurrence: task.recurrence,
        recurrence_interval: task.recurrenceRule?.interval ?? 1,
        recurrence_unit: task.recurrenceRule?.unit ?? null,
        recurrence_weekdays: task.recurrenceRule?.weekdays ?? [],
        recurrence_stop: task.recurrenceRule?.stop ?? "never",
        recurrence_end_date: task.recurrenceRule?.endDate ?? null,
        recurrence_occurrences: task.recurrenceRule?.occurrences ?? null,
        list_id: task.listId,
        created_at: task.createdAt,
      })),
      { onConflict: "id" },
    ),
    client.from("events").upsert(
      workspace.events.map((event) => ({
        id: event.id,
        user_id: userId,
        title: event.title,
        start_date: event.startDate,
        end_date: event.endDate,
        all_day: event.allDay,
        description: event.description ?? null,
        location: event.location ?? null,
        calendar_id: event.calendarId,
      })),
      { onConflict: "id" },
    ),
  ]);
  children.forEach((result) => throwOnError(result.error));

  const deletes = await Promise.all([
    deleteMissing(
      client,
      "tasks",
      workspace.tasks.map((task) => task.id),
      userId,
    ),
    deleteMissing(
      client,
      "events",
      workspace.events.map((event) => event.id),
      userId,
    ),
    deleteMissing(
      client,
      "task_lists",
      workspace.lists.map((list) => list.id),
      userId,
    ),
    deleteMissing(
      client,
      "calendars",
      workspace.calendars.map((calendar) => calendar.id),
      userId,
    ),
  ]);
  deletes.forEach((result) => throwOnError(result.error));
}

function deleteMissing(
  client: ReturnType<typeof requireSupabase>,
  table: string,
  ids: string[],
  userId: string,
) {
  const query = client.from(table).delete().eq("user_id", userId);
  return ids.length ? query.not("id", "in", `(${ids.join(",")})`) : query;
}

export function saveWorkspace(workspace: Workspace) {
  const nextSave = saveQueue.then(() => persistWorkspace(workspace));
  saveQueue = nextSave.then(
    () => undefined,
    () => undefined,
  );
  return nextSave;
}
