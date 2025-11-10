import { useLoaderData } from "react-router";
import { useState } from "react";
import { getDB } from "~/db/getDB";
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import {
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import 'temporal-polyfill/global'
import '@schedule-x/theme-default/dist/index.css'

export async function loader() {
  const db = await getDB();
  const timesheetsAndEmployees = await db.all(
    `SELECT 
      timesheets.*, 
      employees.first_name,
      employees.last_name,
      employees.id AS employee_id 
    FROM timesheets 
    JOIN employees ON timesheets.employee_id = employees.id
    ORDER BY timesheets.start_time DESC`
  );

  return { timesheetsAndEmployees };
}

export default function TimesheetsPage() {
  const { timesheetsAndEmployees } = useLoaderData();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Convert timesheets to ScheduleX events using work_date as Temporal.PlainDate
  const events = timesheetsAndEmployees.map((ts: any) => ({
    id: String(ts.id),
    title: `${ts.first_name} ${ts.last_name} (${ts.hours_worked || ''}h)`,
    start: ts.work_date ? Temporal.PlainDate.from(ts.work_date) : undefined,
    end: ts.work_date ? Temporal.PlainDate.from(ts.work_date) : undefined,
    meta: ts,
  }))

  const eventsService = createEventsServicePlugin();
  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
    events,
    plugins: [eventsService],
  })

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString()
    };
  };

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-light text-black mb-2 tracking-tight">
            Timesheets
          </h1>
          <p className="text-gray-500 font-light">View employee timesheet records</p>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-8 bg-white border border-gray-300 rounded-sm p-6">
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('table')}
              className={`px-6 py-3 font-light rounded-sm transition-all duration-200 border uppercase tracking-wider text-sm ${viewMode === 'table' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-50'}`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-6 py-3 font-light rounded-sm transition-all duration-200 border uppercase tracking-wider text-sm ${viewMode === 'calendar' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-50'}`}
            >
              Calendar View
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <>
            {timesheetsAndEmployees.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-sm p-12 text-center">
                <p className="text-gray-400 text-lg font-light">No timesheets found. Add your first timesheet!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {timesheetsAndEmployees.map((timesheet: any) => {
                  const isExpanded = expandedId === timesheet.id;
                  const fullName = `${timesheet.first_name || ''} ${timesheet.last_name || ''}`.trim() || 'N/A';
                  const startFormatted = formatDateTime(timesheet.start_time);
                  const endFormatted = formatDateTime(timesheet.end_time);
                  const duration = calculateDuration(timesheet.start_time, timesheet.end_time);

                  return (
                    <div
                      key={timesheet.id}
                      className="bg-white border border-gray-300 rounded-sm overflow-hidden transition-all duration-300 ease-in-out cursor-pointer hover:border-black hover:shadow-lg"
                      onClick={() => toggleExpand(timesheet.id)}
                      style={{
                        transform: isExpanded ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      <div className="p-6">
                        {/* Header - Always visible */}
                        <div className="mb-4">
                          <h2 className="text-xl font-medium text-black mb-2 tracking-tight">
                            Timesheet #{timesheet.id}
                          </h2>
                          <p className="text-sm text-gray-700 font-normal mb-1">
                            {fullName}
                          </p>
                          <p className="text-xs text-gray-500 font-light uppercase tracking-wide">
                            Employee ID: {timesheet.employee_id}
                          </p>
                          <a
                            href={`/timesheets/${timesheet.id}`}
                            className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition"
                            onClick={e => e.stopPropagation()}
                          >
                            Edit
                          </a>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex items-start">
                            <span className="text-gray-600 font-light w-24">Date:</span>
                            <span className="text-black font-normal">{startFormatted.date}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-600 font-light w-24">Start:</span>
                            <span className="text-black font-normal">{startFormatted.time}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-600 font-light w-24">End:</span>
                            <span className="text-black font-normal">{endFormatted.time}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-600 font-light w-24">Duration:</span>
                            <span className="text-black font-normal">
                              {duration.hours}h {duration.minutes}m
                            </span>
                          </div>
                        </div>

                        {/* Expandable content */}
                        <div
                          className="overflow-hidden transition-all duration-300 ease-in-out"
                          style={{
                            maxHeight: isExpanded ? '1000px' : '0px',
                            opacity: isExpanded ? 1 : 0,
                          }}
                        >
                          <div className="pt-4 border-t border-gray-200 space-y-3">
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Detailed Information</p>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start">
                                  <span className="text-gray-600 font-light w-24">Timesheet ID:</span>
                                  <span className="text-black font-normal">#{timesheet.id}</span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-gray-600 font-light w-24">Start Time:</span>
                                  <span className="text-black font-normal">{startFormatted.full}</span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-gray-600 font-light w-24">End Time:</span>
                                  <span className="text-black font-normal">{endFormatted.full}</span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-gray-600 font-light w-24">Total Hours:</span>
                                  <span className="text-black font-normal">
                                    {duration.hours} hours {duration.minutes} minutes
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expand indicator */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 uppercase tracking-wider">
                              {isExpanded ? 'Click to collapse' : 'Click to expand'}
                            </span>
                            <div
                              className="transition-transform duration-300 ease-in-out"
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            >
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-gray-300 rounded-sm p-6">
            <ScheduleXCalendar calendarApp={calendar} />
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white border border-gray-300 rounded-sm p-6">
          <div className="flex flex-wrap gap-4">
            <a
              href="/timesheets/new"
              className="px-6 py-3 bg-black text-white font-light rounded-sm hover:bg-gray-800 transition-all duration-200 border border-black uppercase tracking-wider text-sm"
            >
              New Timesheet
            </a>
            <a
              href="/employees"
              className="px-6 py-3 bg-white text-black font-light rounded-sm hover:bg-gray-50 transition-all duration-200 border border-gray-300 uppercase tracking-wider text-sm"
            >
              View Employees
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
