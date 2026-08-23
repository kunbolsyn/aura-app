import type { Task, TaskList, UserCalendar, UserEvent } from "../types"
import { requireSupabase } from "./supabase"

type Workspace = {
  tasks: Task[]
  lists: TaskList[]
  calendars: UserCalendar[]
  events: UserEvent[]
}

function throwOnError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function loadWorkspace(): Promise<Workspace> {
  const client = requireSupabase()
  const [tasks, lists, calendars, events] = await Promise.all([
    client.from("tasks").select("*").order("created_at", { ascending: true }),
    client.from("task_lists").select("*").order("created_at", { ascending: true }),
    client.from("calendars").select("*").order("created_at", { ascending: true }),
    client.from("events").select("*").order("start_date", { ascending: true }),
  ])

  throwOnError(tasks.error)
  throwOnError(lists.error)
  throwOnError(calendars.error)
  throwOnError(events.error)

  return {
    tasks: (tasks.data ?? []).map(row => ({
      id: row.id,
      title: row.title,
      completed: row.completed,
      dueDate: row.due_date,
      endDate: row.end_date,
      description: row.description ?? undefined,
      priority: row.priority ?? undefined,
      recurrence: row.recurrence,
      listId: row.list_id,
      createdAt: row.created_at,
    })),
    lists: (lists.data ?? []).map(row => ({ id: row.id, name: row.name })),
    calendars: (calendars.data ?? []).map(row => ({ id: row.id, name: row.name, color: row.color })),
    events: (events.data ?? []).map(row => ({
      id: row.id,
      title: row.title,
      startDate: row.start_date,
      endDate: row.end_date,
      allDay: row.all_day,
      description: row.description ?? undefined,
      location: row.location ?? undefined,
      calendarId: row.calendar_id,
    })),
  }
}

export async function saveWorkspace(workspace: Workspace) {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  throwOnError(userError)
  if (!userData.user) throw new Error("You must be signed in to save workspace data.")

  const userId = userData.user.id
  const deletes = await Promise.all([
    client.from("tasks").delete().eq("user_id", userId),
    client.from("task_lists").delete().eq("user_id", userId),
    client.from("calendars").delete().eq("user_id", userId),
    client.from("events").delete().eq("user_id", userId),
  ])
  deletes.forEach(result => throwOnError(result.error))

  const parents = await Promise.all([
    client.from("task_lists").insert(workspace.lists.map(list => ({ id: list.id, user_id: userId, name: list.name }))),
    client.from("calendars").insert(workspace.calendars.map(calendar => ({ id: calendar.id, user_id: userId, name: calendar.name, color: calendar.color }))),
  ])
  parents.forEach(result => throwOnError(result.error))

  const children = await Promise.all([
    client.from("tasks").insert(workspace.tasks.map(task => ({
      id: task.id,
      user_id: userId,
      title: task.title,
      completed: task.completed,
      due_date: task.dueDate,
      end_date: task.endDate,
      description: task.description ?? null,
      priority: task.priority ?? null,
      recurrence: task.recurrence,
      list_id: task.listId,
      created_at: task.createdAt,
    }))),
    client.from("events").insert(workspace.events.map(event => ({
      id: event.id,
      user_id: userId,
      title: event.title,
      start_date: event.startDate,
      end_date: event.endDate,
      all_day: event.allDay,
      description: event.description ?? null,
      location: event.location ?? null,
      calendar_id: event.calendarId,
    }))),
  ])
  children.forEach(result => throwOnError(result.error))
}
